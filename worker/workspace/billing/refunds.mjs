import {WorkspaceError} from '../../../src/workspace/domain/contracts.mjs';
import {stripeRequest,verifyStripeAccount} from './stripe.mjs';
import {machineRpc} from '../database.mjs';
import {externalControl} from '../continuity/receipts.mjs';
const invalid=()=>{throw new WorkspaceError('refund_unconfirmed','The payment or refund needs verification.',503);};
const ref=(value,prefix)=>{if(typeof value!=='string'||!new RegExp('^'+prefix+'_[A-Za-z0-9]+$').test(value))invalid();return value;};
const minor=value=>{if(!Number.isSafeInteger(value)||value<0)invalid();return value;};
function context(env,c){if(!c||c.environment!==env.STRIPE_MODE||c.account_id!==env.STRIPE_ACCOUNT_ID)invalid();ref(c.customer_id,'cus');ref(c.charge_id,'ch');}
async function charge(env,c,fetcher){
 context(env,c);ref(c.invoice_id,'in');
 const value=await stripeRequest(env,'/v1/charges/'+c.charge_id,{fetcher});
 if(value.object!=='charge'||value.id!==c.charge_id||value.customer!==c.customer_id||value.currency!==c.currency.toLowerCase()||value.paid!==true||value.captured!==true||value.status!=='succeeded'||typeof value.disputed!=='boolean')invalid();
 minor(value.amount_captured);minor(value.amount_refunded);if(value.amount_refunded>value.amount_captured)invalid();
 const invoice=await stripeRequest(env,'/v1/invoices/'+c.invoice_id,{fetcher});
 if(invoice.customer!==c.customer_id||invoice.currency!==c.currency.toLowerCase()||invoice.metadata?.wm_obligation!==c.id)invalid();
 // Follow Stripe's invoice-payment relation, never a charge id typed by staff
 // or metadata alone. A PaymentIntent may be split between several invoices.
 let cursor='',matched=false,allocated=0;
 for(let page=0;page<20;page++){
  const payments=await stripeRequest(env,'/v1/invoice_payments?invoice='+c.invoice_id+'&limit=100'+cursor,{fetcher});
  if(payments.object!=='list'||!Array.isArray(payments.data))invalid();
  for(const p of payments.data){
   if(p.invoice!==c.invoice_id||p.status!=='paid'||p.currency!==c.currency.toLowerCase()||p.livemode!==(env.STRIPE_MODE==='live'))continue;
   const direct=p.payment?.type==='charge'&&p.payment.charge===c.charge_id;
   const intent=p.payment?.type==='payment_intent'&&value.payment_intent&&p.payment.payment_intent===value.payment_intent;
   if(direct||intent){allocated+=minor(p.amount_paid);matched=true;}
  }
  if(!payments.has_more)break;
  if(page===19||!payments.data.length)invalid();cursor='&starting_after='+ref(payments.data.at(-1).id,'inpay');
 }
 // Multi-invoice charges need a separately reviewed allocation. This path can
 // never refund funds belonging to another invoice through a partial match.
 if(!matched||allocated!==value.amount_captured)invalid();
 return value;
}
function common(env,c,object){return {settled:true,readback_matches:true,evidence_reference:'stripe:'+object.id,provider_reference:object.id,observed_at:new Date().toISOString(),binding_id:c.binding_id,charge_id:c.charge_id,currency:c.currency,customer_id:c.customer_id,environment:c.environment,account_id:c.account_id};}
export async function readFinancialEffect(env,permit,{fetcher=fetch}={}){
 const c=permit.context;context(env,c);await verifyStripeAccount(env,fetcher);
 if(permit.operation.kind==='stripe_charge_read'){
  const value=await charge(env,c,fetcher);return {...common(env,c,value),captured_minor:value.amount_captured,refunded_minor:value.amount_refunded,disputed:value.disputed};
 }
 if(permit.operation.kind!=='stripe_refund_create')invalid();
 const providerId=permit.operation.provider_reference||permit.attempt.provider_request_id;
 if(permit.operation.provider_reference&&permit.attempt.provider_request_id&&permit.operation.provider_reference!==permit.attempt.provider_request_id)invalid();
 const value=await stripeRequest(env,'/v1/refunds/'+ref(providerId,'re'),{fetcher});
 validateRefund(value,c);
 return {...common(env,c,value),adjustment_id:c.adjustment_id,amount_minor:c.refund_minor,state:value.status};
}
function validateRefund(value,c){
 if(value.object!=='refund'||value.charge!==c.charge_id||value.currency!==c.currency.toLowerCase()||minor(value.amount)!==Number(c.refund_minor??c.amount_minor)||value.metadata?.wm_adjustment!==c.adjustment_id||!['pending','requires_action','succeeded','failed','canceled'].includes(value.status))invalid();
}
export async function financialEffect(env,permit,{rpc=machineRpc,fetcher=fetch,readControl=externalControl}={}){
 const c=await rpc(env,'wm_billing_effect_context',{p_org:permit.operation.organization_id,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce});
 context(env,c);await verifyStripeAccount(env,fetcher);
 if(permit.operation.kind==='stripe_charge_read')return readFinancialEffect(env,{...permit,context:c},{fetcher});
 if(permit.operation.kind!=='stripe_refund_create')invalid();
 const current=await charge(env,c,fetcher);
 if(current.disputed||!Number.isSafeInteger(Number(c.refund_minor))||Number(c.refund_minor)<=0||Number(c.refund_minor)>current.amount_captured-current.amount_refunded)invalid();
 // Provider pagination can take time. Revalidate authority and recovery state
 // at the last local boundary before the irreversible provider write.
 const latest=await rpc(env,'wm_billing_effect_context',{p_org:permit.operation.organization_id,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce});
 for(const key of ['id','binding_id','charge_id','adjustment_id','refund_minor','customer_id','environment','account_id','currency'])if(latest[key]!==c[key])invalid();
 const control=await readControl(env,permit.operation.organization_id);
 if(control.access_state!=='open'||!control.positive_effects_allowed||control.external_generation!==permit.attempt.external_generation)invalid();
 const result=await stripeRequest(env,'/v1/refunds',{method:'POST',key:'wm:'+permit.operation.id,fetcher,fields:{charge:c.charge_id,amount:c.refund_minor,reason:'requested_by_customer','metadata[wm_adjustment]':c.adjustment_id,'metadata[wm_business]':permit.operation.organization_id}});
 ref(result.id,'re');await rpc(env,'wm_attempt_checkpoint',{p_org:permit.operation.organization_id,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce,p_reference:result.id});
 return readFinancialEffect(env,{...permit,context:c,attempt:{...permit.attempt,provider_request_id:result.id}},{fetcher});
}
export async function pollRefunds(env,{rpc=machineRpc,fetcher=fetch}={}){
 if(env.STRIPE_ENABLED!=='true')return {disabled:true};await verifyStripeAccount(env,fetcher);
 const items=await rpc(env,'wm_refunds_poll',{p_environment:env.STRIPE_MODE,p_account:env.STRIPE_ACCOUNT_ID,p_limit:10});let observed=0,attention=0;
 for(const c of items){try{
  context(env,c);const value=await stripeRequest(env,'/v1/refunds/'+ref(c.provider_id,'re'),{fetcher});validateRefund(value,c);
  await rpc(env,'wm_refund_observe',{p_org:c.organization_id,p_adjustment:c.adjustment_id,p_lease:c.readback_lease,p_refund:value});observed++;
 }catch{attention++;}}
 return {observed,attention};
}
