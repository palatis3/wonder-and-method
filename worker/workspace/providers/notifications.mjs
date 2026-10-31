import {WorkspaceError,UUID} from '../../../src/workspace/domain/contracts.mjs';
import {config,providerFetch} from '../http.mjs';
import {machineRpc} from '../database.mjs';
const unknown=()=>{throw new WorkspaceError('effect_unknown','The provider outcome needs reconciliation.',503);};
const proof=(reference,extra={})=>({settled:true,readback_matches:true,evidence_reference:reference,provider_reference:reference,observed_at:new Date().toISOString(),...extra});
const attemptArgs=p=>({p_org:p.operation.organization_id,p_attempt:p.attempt.id,p_nonce:p.attempt.dispatch_nonce});
export async function provisionIdentity(env,permit,{fetcher=fetch,rpc=machineRpc}={}){
  const args=attemptArgs(permit);let context=await rpc(env,'wm_service_effect_context',args);
  if(!context.identity_id){
    try{await providerFetch(`${config(env).supabase}/auth/v1/admin/users`,{method:'POST',headers:{apikey:env.SUPABASE_SECRET_KEY,Authorization:`Bearer ${env.SUPABASE_SECRET_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({email:context.email,email_confirm:false})},fetcher);}catch{/* A response loss is reconciled by exact identity, never another create. */}
    context=await rpc(env,'wm_service_effect_context',args);
  }
  if(!UUID.test(context.identity_id||''))unknown();
  await rpc(env,'wm_attempt_checkpoint',{...args,p_reference:context.identity_id});
  return proof(context.identity_id,{identity_created_or_existing:true,email_verified:false});
}
export function notificationMessage(env,permit,context){
  const origin=config(env).origin;
  if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(context.email||'')||!/^Wonder and Method <[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>$/.test(env.NOTIFICATION_FROM||''))throw new WorkspaceError('notification_config','Notification delivery is being configured.',503);
  const invitation=permit.operation.kind==='invitation_notify';
  return {from:env.NOTIFICATION_FROM,to:[context.email],subject:invitation?'Your Wonder and Method workspace invitation':'An update is ready in your Wonder and Method workspace',
    text:invitation?`You have been invited to a Wonder and Method workspace. Sign in at ${origin}/workspace/ using this email address, then review and accept the business invitation. If you did not expect this invitation, you can ignore this email. No business access is granted by this message.`:`There is an update in your private workspace. Sign in at ${origin}/workspace/ to read it. Your permissions are checked when you open the workspace.`,
    tags:[{name:'workspace_operation',value:permit.operation.id}]};
}
export async function sendNotification(env,permit,{fetcher=fetch,rpc=machineRpc}={}){
  const args=attemptArgs(permit),context=await rpc(env,'wm_service_effect_context',args),message=notificationMessage(env,permit,context);
  const response=await providerFetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`workspace/${permit.operation.id}`},body:JSON.stringify(message)},fetcher);
  const sent=await response.json().catch(()=>null);if(!response.ok||!UUID.test(sent?.id||''))unknown();
  // Save the returned binding before any further remote work.
  await rpc(env,'wm_attempt_checkpoint',{...args,p_reference:sent.id});
  return readNotification(env,{...permit,operation:{...permit.operation,provider_reference:sent.id},context},{fetcher});
}
export async function readNotification(env,permit,{fetcher=fetch}={}){
  const reference=permit.operation.provider_reference;if(!UUID.test(reference||''))unknown();
  const context=permit.context,message=notificationMessage(env,permit,context);
  const readback=await providerFetch(`https://api.resend.com/emails/${reference}`,{headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`}},fetcher);
  const actual=await readback.json().catch(()=>null);
  if(!readback.ok||actual?.id!==reference||actual.from!==message.from||actual.subject!==message.subject||!Array.isArray(actual.to)||actual.to.length!==1||actual.to[0].toLowerCase()!==context.email.toLowerCase()||actual.text!==message.text)unknown();
  return proof(reference,{delivery:'accepted_by_provider',provider_event:actual.last_event||'unknown'});
}
