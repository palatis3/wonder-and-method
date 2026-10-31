import {machineRpc} from '../database.mjs';
import {externalControl,flushReceipts} from '../continuity/receipts.mjs';
import {scanFile} from '../files/service.mjs';
import {provisionIdentity,sendNotification} from '../providers/notifications.mjs';
import {reconcileAttempts} from './reconciliation.mjs';
const adapters={identity_provision:provisionIdentity,invitation_notify:sendNotification,message_notify:sendNotification,file_scan:(env,permit,{fetcher})=>scanFile(env,permit.operation,fetcher)};
function configured(env,kind){
  if(kind==='identity_provision')return env.IDENTITY_PROVISIONING_ENABLED==='true'&&Boolean(env.SUPABASE_SECRET_KEY);
  if(['invitation_notify','message_notify'].includes(kind))return env.NOTIFICATIONS_ENABLED==='true'&&Boolean(env.RESEND_API_KEY&&env.NOTIFICATION_FROM);
  if(kind==='file_scan')return env.SCANNING_ENABLED==='true'&&Boolean(env.CLOUDMERSIVE_API_KEY);
  return false;
}
export async function dispatchJobs(env,{rpc=machineRpc,fetcher=fetch,readControl=externalControl,implementations=adapters}={}){
  if(env.EFFECTS_ENABLED!=='true')return {disabled:true};
  const jobs=await rpc(env,'wm_jobs_claim',{p_limit:10});let verified=0,attention=0;
  for(const job of jobs){
    let permit;
    const attentionArgs={p_org:job.organization_id,p_job:job.id,p_lease_generation:job.lease_generation};
    try{
      if(!configured(env,job.kind)||!implementations[job.kind]){await rpc(env,'wm_job_attention',{...attentionArgs,p_reason:'provider_not_qualified'});attention++;continue;}
      const control=await readControl(env,job.organization_id);
      if(control.access_state!=='open'){await rpc(env,'wm_job_attention',{...attentionArgs,p_reason:'recovery_restricted'});attention++;continue;}
      permit=await rpc(env,'wm_attempt_begin',{...attentionArgs,p_external_generation:control.external_generation});
      const current=await readControl(env,job.organization_id);
      if(current.external_generation!==control.external_generation||current.access_state!=='open'||(permit.operation.positive_effect&&!current.positive_effects_allowed)){
        await rpc(env,'wm_attempt_observe',{p_org:job.organization_id,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce,p_kind:'cancelled_before_dispatch',p_evidence:{reason:'independent_control_changed'},p_observed_at:new Date().toISOString()});attention++;continue;
      }
      const evidence=await implementations[job.kind](env,permit,{fetcher,rpc});
      const result=await rpc(env,'wm_attempt_resolve',{p_org:job.organization_id,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce,p_proof:evidence});
      if(result.state==='verified')verified++;else attention++;
    }catch(error){
      attention++;
      if(permit)await rpc(env,'wm_attempt_observe',{p_org:job.organization_id,p_attempt:permit.attempt.id,p_nonce:permit.attempt.dispatch_nonce,p_kind:'timeout',p_evidence:{code:error.code||'effect_unknown'},p_observed_at:new Date().toISOString()});
      else await rpc(env,'wm_job_attention',{...attentionArgs,p_reason:error.code||'permission_or_provider_unavailable'});
    }
  }
  return {verified,attention};
}
export async function scheduledWork(env){const receipts=await flushReceipts(env);const reconciliation=await reconcileAttempts(env);const effects=await dispatchJobs(env);return {receipts,reconciliation,effects};}
