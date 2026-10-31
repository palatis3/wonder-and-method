import {websiteEffect} from '../website/cloudflare.mjs';
import {sendCadencedNotification,prepareNotificationDigests,pollNotificationDelivery,notificationChannel} from '../notifications/service.mjs';
import {notificationChannels} from '../notifications/config.mjs';
import {processCustomerExports} from '../exports/service.mjs';
import {processTenantBackups} from '../backups/service.mjs';
import {completeMonitoring} from '../monitoring/service.mjs';
import {runAnalytics} from '../analytics/service.mjs';
import {captureInbound,inventoryInbound} from '../inbound/service.mjs';
import {invoiceEffect} from '../billing/stripe.mjs';
import {financialEffect,pollRefunds} from '../billing/refunds.mjs';
import {reconcileStripe} from '../billing/webhooks.mjs';
import {machineRpc} from '../database.mjs';
import {externalControl,flushReceipts} from '../continuity/receipts.mjs';
import {scanFile,filePolicy} from '../files/service.mjs';
import {provisionIdentity} from '../providers/notifications.mjs';
import {reconcileAttempts} from './reconciliation.mjs';
import {journalAttempt} from '../continuity/attempt-journal.mjs';
const adapters={website_publish:websiteEffect,stripe_charge_read:financialEffect,stripe_refund_create:financialEffect,stripe_invoice_create:invoiceEffect,stripe_invoice_item:invoiceEffect,stripe_invoice_finalize:invoiceEffect,stripe_invoice_send:invoiceEffect,identity_provision:provisionIdentity,invitation_notify:sendCadencedNotification,message_notify:sendCadencedNotification,notice_notify:sendCadencedNotification,file_scan:(env,permit,{fetcher})=>scanFile(env,permit.operation,fetcher)};
function configured(env,kind){
  if(kind==='website_publish')return env.WEBSITE_PUBLICATION_ENABLED==='true'&&Boolean(env.CLOUDFLARE_WEBSITE_TOKEN&&env.WEBSITE_TARGETS);
  if(kind.startsWith('stripe_'))return env.STRIPE_ENABLED==='true'&&Boolean(env.STRIPE_SECRET_KEY);
  if(kind==='identity_provision')return env.IDENTITY_PROVISIONING_ENABLED==='true'&&Boolean(env.SUPABASE_SECRET_KEY);
  if(['invitation_notify','message_notify','notice_notify'].includes(kind))return env.NOTIFICATIONS_ENABLED==='true'&&Object.values(notificationChannels(env)).some(c=>Boolean(c.api_key));
  if(kind==='file_scan')return filePolicy(env)==='invite_only_unscanned'||env.SCANNING_ENABLED==='true'&&Boolean(env.CLOUDMERSIVE_API_KEY);
  return false;
}
export async function dispatchJobs(env,{rpc=machineRpc,fetcher=fetch,readControl=externalControl,implementations=adapters,journal=journalAttempt}={}){
  if(env.EFFECTS_ENABLED!=='true')return {disabled:true};
  const jobs=await rpc(env,'wm_jobs_claim',{p_limit:10});let verified=0,attention=0,recordingFailures=0;
  for(const job of jobs){
    let permit,dispatchStarted=false,recording=false;
    const record=async(name,args)=>{recording=true;const saved=await rpc(env,name,args);recording=false;return saved;};
    const attentionArgs={p_org:job.organization_id,p_job:job.id,p_lease_generation:job.lease_generation};
    try{
      if(!configured(env,job.kind)||!implementations[job.kind]){await record('wm_job_attention',{...attentionArgs,p_reason:'provider_not_qualified'});attention++;continue;}
      const control=await readControl(env,job.organization_id);
      if(control.access_state!=='open'){await record('wm_job_attention',{...attentionArgs,p_reason:'recovery_restricted'});attention++;continue;}
      if(['invitation_notify','message_notify','notice_notify'].includes(job.kind))notificationChannel(env,await rpc(env,'wm_notification_preflight',{...attentionArgs,p_external_generation:control.external_generation}));
      permit=await rpc(env,'wm_attempt_begin',{...attentionArgs,p_external_generation:control.external_generation});
      await journal(env,permit,'intent');
      const current=await readControl(env,job.organization_id);
      if(current.external_generation!==control.external_generation||current.access_state!=='open'||((permit.operation.positive_effect||job.kind.startsWith('stripe_'))&&!current.positive_effects_allowed)){
        await record('wm_attempt_observe',{p_org:job.organization_id,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce,p_kind:'cancelled_before_dispatch',p_evidence:{reason:'independent_control_changed'},p_observed_at:new Date().toISOString()});attention++;continue;
      }
      dispatchStarted=true;
      const evidence=await implementations[job.kind](env,permit,{fetcher,rpc,readControl});
      await journal(env,permit,'outcome',evidence);
      const result=await rpc(env,'wm_attempt_resolve',{p_org:job.organization_id,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce,p_proof:evidence});
      if(result.state==='verified')verified++;else attention++;
    }catch(error){
      attention++;
      if(recording){recordingFailures++;continue;}
      if(permit?.context?.channel_id&&['invitation_notify','message_notify','notice_notify'].includes(job.kind)){
        try{const recovered=await rpc(env,'wm_notification_no_post',{p_org:job.organization_id,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce,p_external_generation:permit.attempt.external_generation});if(recovered.no_post)continue;}catch{/* Existing attempt state stays conservative until recovery is durable. */}
      }
      try{
        if(permit)await record('wm_attempt_observe',{p_org:job.organization_id,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce,p_kind:dispatchStarted&&error.effect_dispatched!==false?'timeout':'cancelled_before_dispatch',p_evidence:{code:error.code||'effect_unknown'},p_observed_at:new Date().toISOString()});
        else await record('wm_job_attention',{...attentionArgs,p_reason:error.code||'permission_or_provider_unavailable'});
      }catch{recordingFailures++;}
    }
  }
  if(recordingFailures)throw new Error('Effect status recording needs attention for '+recordingFailures+' jobs.');return {verified,attention};
}
export async function scheduledWork(env,overrides={}){
 const {monitoring:monitor=completeMonitoring,...stageOverrides}=overrides;
 const tasks={inbound_inventory:inventoryInbound,inbound:captureInbound,periods:e=>e.STRIPE_ENABLED==='true'?machineRpc(e,'wm_billing_generate',{p_limit:10}):{disabled:true},receipts:flushReceipts,notification_digests:prepareNotificationDigests,reconciliation:reconcileAttempts,effects:dispatchJobs,notification_delivery:pollNotificationDelivery,customer_exports:e=>e.CUSTOMER_EXPORTS_ENABLED==='true'?processCustomerExports(e):{disabled:true},backup_schedules:e=>e.TENANT_BACKUPS_ENABLED==='true'?machineRpc(e,'wm_backup_generate',{p_limit:10}):{disabled:true},tenant_backups:e=>e.TENANT_BACKUPS_ENABLED==='true'?processTenantBackups(e):{disabled:true},billing:reconcileStripe,refunds:pollRefunds,analytics:runAnalytics,...stageOverrides},results={},failed=[];
 // Receipt persistence precedes effect dispatch, but one failing class must not
 // starve unrelated STOP, payment readback, or correspondence work this tick.
 for(const [name,run]of Object.entries(tasks)){try{results[name]=await run(env);}catch{results[name]={attention:true};failed.push(name);}}
 try{results.monitoring=await monitor(env,{results,failed});}catch{results.monitoring={attention:true};failed.push('monitoring');}
 if(failed.length)throw new Error('Scheduled workspace stages need attention: '+failed.join(', '));return results;
}
