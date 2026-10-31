import {Webhook} from 'svix';
import {WorkspaceError,uuid,UUID} from '../../../src/workspace/domain/contracts.mjs';
import {machineRpc,rpc} from '../database.mjs';
import {providerFetch,json} from '../http.mjs';
import {readBounded,sha256} from '../files/content.mjs';
import {notificationChannels} from './config.mjs';

export const NOTIFICATION_COMMANDS=Object.freeze(['notification.preference','notification.exception.note','notification.batch.retry']);
const unknown=()=>{throw new WorkspaceError('notification_unknown','Notification outcome needs read-only reconciliation. Do not resend.',503);};
const invalid=()=>{throw new WorkspaceError('notification_input','Check your notification settings.',400);};
export function validateNotificationCommand(command,input){
 const keys=command==='notification.preference'?['digest','email_enabled','timezone','expected_version']:command==='notification.exception.note'?['operation_id','note']:command==='notification.batch.retry'?['batch_id','expected_generation']:null;
 if(!keys||!input||Array.isArray(input)||Object.getPrototypeOf(input)!==Object.prototype||Object.keys(input).some(k=>!keys.includes(k))||keys.some(k=>!(k in input)))invalid();
 if(command==='notification.preference'){
  if(!['daily','weekly','none'].includes(input.digest)||typeof input.email_enabled!=='boolean'||typeof input.timezone!=='string'||input.timezone.length>100||!Number.isSafeInteger(input.expected_version)||input.expected_version<0)invalid();
 }else if(command==='notification.batch.retry'){uuid(input.batch_id);if(!Number.isSafeInteger(input.expected_generation)||input.expected_generation<1)invalid();}
 else {uuid(input.operation_id);if(typeof input.note!=='string'||!input.note.trim()||input.note.length>2000)invalid();}
 return input;
}
export async function notificationCommand(env,session,org,command,input,key,{call=rpc}={}){
 uuid(org);validateNotificationCommand(command,input);if(!/^[A-Za-z0-9_-]{16,200}$/.test(key||''))invalid();
 return call(env,session.access_token,'wm_notification_command',{p_org:org,p_command:command,p_input:input,p_key:key});
}
export async function notificationStatus(env,session,org,{call=rpc}={}){uuid(org);return call(env,session.access_token,'wm_notification_status',{p_org:org});}
export function notificationChannel(env,binding){
 if(!binding)throw new WorkspaceError('notification_channel','Notification account binding needs review.',503);
 const c=notificationChannels(env)[binding.channel_id];
 if(!c||c.account_id!==binding.account_id||c.environment!==binding.environment||!c.api_key)throw new WorkspaceError('notification_channel','Notification account binding needs review.',503);
 return c;
}
const args=p=>({p_org:p.operation.organization_id,p_attempt:p.attempt.id,p_nonce:p.attempt.dispatch_nonce});
export async function sendCadencedNotification(env,permit,{rpc:call=machineRpc,fetcher=fetch}={}){
 // Validate the exact registered runtime binding before consuming a reservation.
 try{notificationChannel(env,permit.context);}catch(error){error.effect_dispatched=false;throw error;}
 // The immutable reservation is committed before POST. A repeated reservation is
 // blocked, including within Resend's 24-hour idempotency retention window.
 const reserved=await call(env,'wm_notification_reserve',args(permit));const c=notificationChannel(env,reserved);
 let sent;try{
  const response=await providerFetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${c.api_key}`,'Content-Type':'application/json','Idempotency-Key':reserved.idempotency_key},body:JSON.stringify(reserved.message)},fetcher);
  sent=await response.json().catch(()=>null);if(!response.ok||!UUID.test(sent?.id||''))unknown();
 }catch{unknown();}
 await call(env,'wm_notification_bind',{...args(permit),p_provider:sent.id});
 return readCadencedNotification(env,permit,{rpc:call,fetcher});
}
function tags(value){return Array.isArray(value)?Object.fromEntries(value.map(x=>[x.name,x.value])):value;}
export function matchingReadback(actual,registered){
 const m=registered.message;
 return actual?.id===registered.provider_id&&actual.from===m.from&&actual.subject===m.subject&&actual.text===m.text&&Array.isArray(actual.to)&&actual.to.length===1&&actual.to[0].toLowerCase()===m.to[0].toLowerCase()
  &&['workspace_operation','workspace_attempt'].every(k=>tags(actual.tags)?.[k]===tags(m.tags)[k]);
}
async function readRegistered(env,org,operation,{call,fetcher}){
 const registered=await call(env,'wm_notification_read_context',{p_org:org,p_operation:operation});
 if(!UUID.test(registered.provider_id||'')||registered.conflicted)unknown();const c=notificationChannel(env,registered);
 const response=await providerFetch('https://api.resend.com/emails/'+registered.provider_id,{headers:{Authorization:`Bearer ${c.api_key}`}},fetcher);
 if(!response.ok){await response.body?.cancel();unknown();}
 const bytes=await readBounded(response.body,262144);let actual;try{actual=JSON.parse(new TextDecoder().decode(bytes));}catch{unknown();}
 if(!matchingReadback(actual,registered))unknown();
 const observed_at=new Date().toISOString(),event=['sent','delivered','bounced','complained','suppressed','failed','delivery_delayed'].includes(actual.last_event)?actual.last_event:'unknown';
 await call(env,'wm_notification_observe',{p_org:org,p_operation:operation,p_provider:registered.provider_id,p_event:event,p_observed:observed_at,p_hash:await sha256(bytes)});
 return {settled:true,readback_matches:true,evidence_reference:registered.provider_id,provider_reference:registered.provider_id,observed_at,delivery:'accepted_by_provider',provider_event:event};
}
export async function readCadencedNotification(env,permit,{rpc:call=machineRpc,fetcher=fetch}={}){
 return readRegistered(env,permit.operation.organization_id,permit.operation.id,{call,fetcher});
}
export async function prepareNotificationDigests(env,{rpc:call=machineRpc}={}){
 if(env.NOTIFICATIONS_ENABLED!=='true')return {disabled:true};
 const jobs=await call(env,'wm_notification_claim',{p_limit:10});let prepared=0,attention=0;
 for(const j of jobs){try{await call(env,'wm_notification_prepare',{p_org:j.organization_id,p_batch:j.id,p_lease:j.lease_generation});prepared++;}
 catch{attention++;try{await call(env,'wm_notification_attention',{p_org:j.organization_id,p_batch:j.id,p_lease:j.lease_generation});}catch{/* Expiring lease remains recoverable; continue later tenants. */}}}
 return {prepared,attention};
}
export async function pollNotificationDelivery(env,{rpc:call=machineRpc,fetcher=fetch}={}){
 if(env.NOTIFICATIONS_ENABLED!=='true')return {disabled:true};
 const jobs=await call(env,'wm_notification_reads_claim',{p_limit:10});let observed=0,attention=0;
 for(const j of jobs){try{await readRegistered(env,j.organization_id,j.operation_id,{call,fetcher});observed++;}catch{attention++;}}
 return {observed,attention};
}
export async function verifyOutboundWebhook(bytes,headers,secrets,{now=Date.now()}={}){
 const id=headers.get('svix-id'),timestamp=headers.get('svix-timestamp');
 if(!id||id.length>200||!/^\d{1,12}$/.test(timestamp||'')||Math.abs(now/1000-Number(timestamp))>300)throw new WorkspaceError('invalid_webhook','Webhook verification failed.',400);
 let raw;try{raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new WorkspaceError('invalid_webhook','Webhook verification failed.',400);}
 for(const secret of secrets){try{new Webhook(secret.value).verify(raw,{'svix-id':id,'svix-timestamp':timestamp,'svix-signature':headers.get('svix-signature')||''});return {raw,key_version:secret.version};}catch{}}
 throw new WorkspaceError('invalid_webhook','Webhook verification failed.',400);
}
export async function handleOutboundWebhook(request,env,channelId,{rpc:call=machineRpc}={}){
 if(request.method!=='POST')return json({error:{message:'Method unavailable.'}},405);
 // Route key is a configured selector, never an account ID claimed by payload.
 const c=notificationChannels(env)[channelId];
 if(!c||!c.outbound_webhook_secret||!['production','staging'].includes(c.environment)||!c.account_id)throw new WorkspaceError('webhook_configuration','Outbound webhook is not configured.',503);
 const secrets=[{value:c.outbound_webhook_secret,version:c.key_version||'current'}];
 if(c.previous_secret&&Date.parse(c.previous_until)>Date.now()&&Date.parse(c.previous_until)<=Date.now()+86400000)secrets.push({value:c.previous_secret,version:'previous'});
 const bytes=await readBounded(request.body,1000000),verified=await verifyOutboundWebhook(bytes,request.headers,secrets);
 const result=await call(env,'wm_notification_webhook',{p_channel:channelId,p_account:c.account_id,p_environment:c.environment,p_event_id:request.headers.get('svix-id'),p_raw:verified.raw,p_hash:await sha256(bytes),p_key_version:verified.key_version});
 return json({received:true,...(result.attention?{attention:true}:{})});
}
