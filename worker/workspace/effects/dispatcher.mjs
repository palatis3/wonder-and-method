import {websiteEffect} from '../website/cloudflare.mjs';
import {captureInbound,inventoryInbound} from '../inbound/service.mjs';
import {invoiceEffect} from '../billing/stripe.mjs';
import {financialEffect,pollRefunds} from '../billing/refunds.mjs';
import {reconcileStripe} from '../billing/webhooks.mjs';
import {machineRpc} from '../database.mjs';
import {externalControl,flushReceipts} from '../continuity/receipts.mjs';
import {scanFile,filePolicy} from '../files/service.mjs';
import {provisionIdentity,sendNotification} from '../providers/notifications.mjs';
import {reconcileAttempts} from './reconciliation.mjs';
import {journalAttempt} from '../continuity/attempt-journal.mjs';
const adapters={website_publish:websiteEffect,stripe_charge_read:financialEffect,stripe_refund_create:financialEffect,stripe_invoice_create:invoiceEffect,stripe_invoice_item:invoiceEffect,stripe_invoice_finalize:invoiceEffect,stripe_invoice_send:invoiceEffect,identity_provision:provisionIdentity,invitation_notify:sendNotification,message_notify:sendNotification,file_scan:(env,permit,{fetcher})=>scanFile(env,permit.operation,fetcher)};
function configured(env,kind){
  if(kind==='website_publish')return env.WEBSITE_PUBLICATION_ENABLED==='true'&&Boolean(env.CLOUDFLARE_WEBSITE_TOKEN&&env.WEBSITE_TARGETS);
  if(kind.startsWith('stripe_'))return env.STRIPE_ENABLED==='true'&&Boolean(env.STRIPE_SECRET_KEY);
  if(kind==='identity_provision')return env.IDENTITY_PROVISIONING_ENABLED==='true'&&Boolean(env.SUPABASE_SECRET_KEY);
  if(['invitation_notify','message_notify'].includes(kind))return env.NOTIFICATIONS_ENABLED==='true'&&Boolean(env.RESEND_API_KEY&&env.NOTIFICATION_FROM);
  if(kind==='file_scan')return filePolicy(env)==='invite_only_unscanned'||env.SCANNING_ENABLED==='true'&&Boolean(env.CLOUDMERSIVE_API_KEY);
  return false;
}
export async function dispatchJobs(env,{rpc=machineRpc,fetcher=fetch,readControl=externalControl,implementations=adapters,journal=journalAttempt}={}){
  if(env.EFFECTS_ENABLED!=='true')return {disabled:true};
  const jobs=await rpc(env,'wm_jobs_claim',{p_limit:10});let verified=0,attention=0;
  for(const job of jobs){
    let permit,dispatchStarted=false;
    const attentionArgs={p_org:job.organization_id,p_job:job.id,p_lease_generation:job.lease_generation};
    try{
      if(!configured(env,job.kind)||!implementations[job.kind]){await rpc(env,'wm_job_attention',{...attentionArgs,p_reason:'provider_not_qualified'});attention++;continue;}
      const control=await readControl(env,job.organization_id);
      if(control.access_state!=='open'){await rpc(env,'wm_job_attention',{...attentionArgs,p_reason:'recovery_restricted'});attention++;continue;}
      permit=await rpc(env,'wm_attempt_begin',{...attentionArgs,p_external_generation:control.external_generation});
      await journal(env,permit,'intent');
      const current=await readControl(env,job.organization_id);
      if(current.external_generation!==control.external_generation||current.access_state!=='open'||((permit.operation.positive_effect||job.kind.startsWith('stripe_'))&&!current.positive_effects_allowed)){
        await rpc(env,'wm_attempt_observe',{p_org:job.organization_id,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce,p_kind:'cancelled_before_dispatch',p_evidence:{reason:'independent_control_changed'},p_observed_at:new Date().toISOString()});attention++;continue;
      }
      dispatchStarted=true;
      const evidence=await implementations[job.kind](env,permit,{fetcher,rpc,readControl});
      await journal(env,permit,'outcome',evidence);
      const result=await rpc(env,'wm_attempt_resolve',{p_org:job.organization_id,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce,p_proof:evidence});
      if(result.state==='verified')verified++;else attention++;
    }catch(error){
      attention++;
      if(permit)await rpc(env,'wm_attempt_observe',{p_org:job.organization_id,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce,p_kind:dispatchStarted&&error.effect_dispatched!==false?'timeout':'cancelled_before_dispatch',p_evidence:{code:error.code||'effect_unknown'},p_observed_at:new Date().toISOString()});
      else await rpc(env,'wm_job_attention',{...attentionArgs,p_reason:error.code||'permission_or_provider_unavailable'});
    }
  }
  return {verified,attention};
}
export async function scheduledWork(env){
 const inbound_inventory=await inventoryInbound(env).catch(()=>({attention:true}));
 const inbound=await captureInbound(env).catch(()=>({attention:true}));
 const periods=env.STRIPE_ENABLED==='true'?await machineRpc(env,'wm_billing_generate',{p_limit:10}):{disabled:true};
 const receipts=await flushReceipts(env);
 const reconciliation=await reconcileAttempts(env);
 const effects=await dispatchJobs(env);
 const billing=await reconcileStripe(env);
 const refunds=await pollRefunds(env);
 return {receipts,reconciliation,effects,billing,periods,refunds,inbound,inbound_inventory};
}
