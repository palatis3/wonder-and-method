import {WorkspaceError} from '../../../src/workspace/domain/contracts.mjs';
import {providerFetch} from '../http.mjs';
import {machineRpc} from '../database.mjs';

export const STRIPE_VERSION='2026-10-28.endive';
const invalid=()=>{throw new WorkspaceError('billing_unconfirmed','Billing needs verification before continuing.',503);};
const id=(value,prefix)=>typeof value==='string'&&new RegExp('^'+prefix+'_[A-Za-z0-9]+$').test(value)?value:invalid();
function configuration(env){
 if(!['test','live'].includes(env.STRIPE_MODE)||!env.STRIPE_ACCOUNT_ID||!env.STRIPE_SECRET_KEY||env.STRIPE_API_VERSION!==STRIPE_VERSION)invalid();
 id(env.STRIPE_ACCOUNT_ID,'acct');
 if(!new RegExp('^(sk|rk)_'+env.STRIPE_MODE+'_').test(env.STRIPE_SECRET_KEY))invalid();
}
export async function stripeRequest(env,path,{method='GET',fields,key,fetcher=fetch}={}){
 configuration(env);
 if(!/^\/v1\/[a-z_]+(?:\/[A-Za-z0-9_]+){0,2}(?:\?[A-Za-z0-9_=&%.-]+)?$/.test(path))invalid();
 if(method!=='GET'&&(!key||key.length>200))invalid();
 const headers={Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`,'Stripe-Version':STRIPE_VERSION};
 if(method!=='GET'){headers['Idempotency-Key']=key;headers['Content-Type']='application/x-www-form-urlencoded';}
 const response=await providerFetch('https://api.stripe.com'+path,{method,headers,...(fields?{body:new URLSearchParams(Object.entries(fields).map(([k,v])=>[k,String(v)]))}:{})},fetcher);
 const value=await response.json().catch(()=>null);
 if(!response.ok||!value)invalid();
 if(typeof value.livemode==='boolean'&&value.livemode!==(env.STRIPE_MODE==='live'))invalid();
 return value;
}
export async function verifyStripeAccount(env,fetcher=fetch){const account=await stripeRequest(env,'/v1/account',{fetcher});if(account.id!==env.STRIPE_ACCOUNT_ID)invalid();return account;}
function matchesContext(env,c){if(!c||c.environment!==env.STRIPE_MODE||c.account_id!==env.STRIPE_ACCOUNT_ID)invalid();id(c.customer_id,'cus');}
function matchesInvoice(invoice,c){
 if(invoice.object!=='invoice'||invoice.customer!==c.customer_id||invoice.currency!==c.currency.toLowerCase()||invoice.metadata?.wm_obligation!==c.id||invoice.metadata?.wm_business!==c.organization_id)invalid();
}
async function checkpoint(env,permit,value,rpc){await rpc(env,'wm_attempt_checkpoint',{p_org:permit.operation.organization_id,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce,p_reference:value});}
export async function invoiceEffect(env,permit,{fetcher=fetch,rpc=machineRpc}={}){
 const c=await rpc(env,'wm_billing_effect_context',{p_org:permit.operation.organization_id,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce});
 matchesContext(env,c);await verifyStripeAccount(env,fetcher);
 const kind=permit.operation.kind,key='wm:'+permit.operation.id;let result;
 if(kind==='stripe_invoice_create'){
  result=await stripeRequest(env,'/v1/invoices',{method:'POST',key,fetcher,fields:{customer:c.customer_id,currency:c.currency.toLowerCase(),auto_advance:false,collection_method:'send_invoice',days_until_due:14,pending_invoice_item_behavior:'exclude','automatic_tax[enabled]':c.automatic_tax,'metadata[wm_obligation]':c.id,'metadata[wm_business]':c.organization_id}});
 }else{
  id(c.invoice_id,'in');const invoice=await stripeRequest(env,'/v1/invoices/'+c.invoice_id,{fetcher});matchesInvoice(invoice,c);
  if(kind==='stripe_invoice_item'){
   if(invoice.status!=='draft'||invoice.auto_advance||invoice.lines?.has_more||invoice.lines?.data?.length!==0)invalid();
   result=await stripeRequest(env,'/v1/invoiceitems',{method:'POST',key,fetcher,fields:{customer:c.customer_id,invoice:c.invoice_id,currency:c.currency.toLowerCase(),amount:c.amount_minor,description:c.description,discountable:false,'metadata[wm_obligation]':c.id,'metadata[wm_business]':c.organization_id}});
  }else if(kind==='stripe_invoice_finalize'){
   validateReadyInvoice(invoice,c);
   result=await stripeRequest(env,'/v1/invoices/'+c.invoice_id+'/finalize',{method:'POST',key,fetcher,fields:{auto_advance:false}});
  }else if(kind==='stripe_invoice_send'){
   if(invoice.status!=='open')invalid();
   result=await stripeRequest(env,'/v1/invoices/'+c.invoice_id+'/send',{method:'POST',key,fetcher,fields:{}});
  }else invalid();
 }
 await checkpoint(env,permit,result.id,rpc);
 return readInvoiceEffect(env,{...permit,context:c,sendAccepted:kind==='stripe_invoice_send',attempt:{...permit.attempt,provider_request_id:result.id}},{fetcher});
}
function validateReadyInvoice(invoice,c){
 if(invoice.status!=='draft'||invoice.auto_advance)invalid();validateInvoiceAmounts(invoice,c);
}
function validateInvoiceAmounts(invoice,c){
 const line=invoice.lines?.data?.[0];
 if(invoice.lines?.has_more||invoice.lines?.data?.length!==1||Number(invoice.subtotal)!==Number(c.amount_minor)||Number(line.amount)!==Number(c.amount_minor)||line.metadata?.wm_obligation!==c.id||invoice.automatic_tax?.enabled!==c.automatic_tax||(c.automatic_tax&&invoice.automatic_tax?.status!=='complete')||invoice.total_discount_amounts?.some(x=>x.amount!==0)||invoice.shipping_cost||invoice.starting_balance!==0)invalid();
}
export async function readInvoiceEffect(env,permit,{fetcher=fetch}={}){
 const c=permit.context;matchesContext(env,c);await verifyStripeAccount(env,fetcher);
 const kind=permit.operation.kind,ref=permit.operation.provider_reference||permit.attempt.provider_request_id;let object;
 if(permit.operation.provider_reference&&permit.attempt.provider_request_id&&permit.operation.provider_reference!==permit.attempt.provider_request_id)invalid();
 // No uncertain create is replayed. Missing references require explicit correlation review.
 if(kind==='stripe_invoice_item'){
  id(ref,'ii');object=await stripeRequest(env,'/v1/invoiceitems/'+ref,{fetcher});
  if(object.invoice!==c.invoice_id||object.customer!==c.customer_id||Number(object.amount)!==Number(c.amount_minor)||object.currency!==c.currency.toLowerCase()||object.metadata?.wm_obligation!==c.id)invalid();
 }else{
  id(ref,'in');object=await stripeRequest(env,'/v1/invoices/'+ref,{fetcher});matchesInvoice(object,c);
  if(kind==='stripe_invoice_create'&&(object.status!=='draft'||object.auto_advance||object.lines?.has_more||object.lines?.data?.length))invalid();
  if(['stripe_invoice_finalize','stripe_invoice_send'].includes(kind)){if(!['open','paid'].includes(object.status))invalid();validateInvoiceAmounts(object,c);}
  // Invoice status does not prove an email was sent. A lost send acknowledgement stays unknown.
  if(kind==='stripe_invoice_send'&&(!permit.sendAccepted||!['open','paid'].includes(object.status)||!object.status_transitions?.finalized_at))invalid();
 }
 return {settled:true,readback_matches:true,evidence_reference:'stripe:'+object.id,provider_reference:object.id,observed_at:new Date().toISOString(),invoice_id:kind==='stripe_invoice_item'?object.invoice:object.id,state:object.status||'attached',amount_minor:c.amount_minor,currency:c.currency,customer_id:c.customer_id,environment:c.environment,account_id:c.account_id,obligation_id:c.id};
}
