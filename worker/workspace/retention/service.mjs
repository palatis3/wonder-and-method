import {uuid} from '../../../src/workspace/domain/contracts.mjs';
import {rpc,machineRpc} from '../database.mjs';
import {retentionStorage,qualified,fail} from './storage.mjs';
import {publishRetentionEvent,readRetentionOverlay} from './overlay.mjs';
import {markObjectNoRecreate} from './fences.mjs';
export const RETENTION_COMMANDS=new Set(['retention.plan','retention.hold','retention.execute','retention.reconcile','retention.cancel']);
export function validateRetention(command,input){
 const fields=command==='retention.plan'?['source_id','expected_version','policy_version','cutoff']:command==='retention.hold'?['source_id','expected_version','held','reason']:['id','expected_version'];
 if(!RETENTION_COMMANDS.has(command)||!input||Array.isArray(input)||Object.keys(input).sort().join()!==fields.sort().join()||!Number.isSafeInteger(input.expected_version)||input.expected_version<0)fail('retention_input');
 if(input.id)uuid(input.id);if(input.source_id&&!/^(workspace|export|inbound):[a-f0-9-]{36}(:[a-f0-9-]{36})?$/.test(input.source_id))fail('retention_input');
 if(command==='retention.hold'&&(typeof input.held!=='boolean'||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>500))fail('retention_input');
 if(command==='retention.plan'&&(typeof input.policy_version!=='string'||!input.policy_version.trim()||input.policy_version.length>120||typeof input.cutoff!=='string'||!/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(input.cutoff)||!Number.isFinite(Date.parse(input.cutoff))))fail('retention_input');
 return input;
}
async function publish(env,ev,machine){
 const p=await publishRetentionEvent(env,ev);await machine(env,'wm_retention_durable',{p_org:ev.organization_id,p_id:ev.id,p_overlay:p.overlay,p_witness:p.witness});return p;
}
export async function retentionCommand(env,session,org,command,input,key,{human=rpc,machine=machineRpc,fetcher=fetch,store}={}){
 uuid(org);validateRetention(command,input);if(typeof key!=='string'||!/^[A-Za-z0-9_-]{16,200}$/.test(key))fail('retention_input');
 const r=await human(env,session.access_token,'wm_retention_command',{p_org:org,p_command:command,p_input:input,p_key:key});
 if(r.event_id){const event=await machine(env,'wm_retention_event',{p_org:org,p_id:r.event_id});try{await publish(env,event,machine);return {...r,durability:'independently_witnessed'};}catch{return {...r,durability:'pending',attention:'Local hold/cancellation recorded; independent durability unconfirmed'};}}
 if(['retention.execute','retention.reconcile'].includes(command))return processRetention(env,org,r.id,r.lease,{machine,fetcher,store});
 return r;
}
export async function processRetention(env,org,id,lease,{machine=machineRpc,fetcher=fetch,store}={}){
 const args={p_org:uuid(org),p_id:uuid(id),p_lease:uuid(lease)};
 let j=await machine(env,'wm_retention_context',{...args,p_dispatch:false}),response='read_only';
 qualified(env,org,j.inventory);const bytes=store||retentionStorage(env,org,j.inventory,{fetcher});
 const check=async(dispatch=false)=>{
  j=await machine(env,'wm_retention_context',{...args,p_dispatch:dispatch});
  const v=await readRetentionOverlay(env,org);if(v.generation!==j.generation||!(dispatch?v.access_state==='open':['open','restricted'].includes(v.access_state)))fail('retention_generation');
  if(dispatch&&(v.holds[j.source_id]?.held||v.purged.includes(j.source_id)||v.dispatched.includes(j.id)||v.cancelled.includes(j.id)))fail('retention_fenced');
  return v;
 };
 try{
  await check(false);
  if(!j.attempted_at){
   await check(true);
   if(await bytes.read()===null)fail('missing_bytes');
   const ev=await machine(env,'wm_retention_intent',args);await publish(env,ev,machine);
   await check(true);
   j=await machine(env,'wm_retention_begin',args);
   const dispatch=await machine(env,'wm_retention_event',{p_org:org,p_id:j.dispatch_id}),p=await publish(env,dispatch,machine);
   if(!p.created)fail('independent_pending'); // possible prior dispatch: only observe on reconciliation
   await markObjectNoRecreate(env,org,j.inventory,j);
   if(await bytes.read()===null)fail('missing_bytes');
   await machine(env,'wm_retention_predelete',args);
   const v=await readRetentionOverlay(env,org);if(v.generation!==j.generation||v.access_state!=='open'||v.holds[j.source_id]?.held||v.purged.includes(j.source_id)||v.cancelled.includes(j.id))fail('retention_fenced');
   response='unknown';try{response=await bytes.remove();}catch{response='unknown';}
  }
  // Once an attempt was registered, no path retries DELETE, even if bytes remain.
  await check(false);const first=await bytes.read();await check(false);const second=first===null?await bytes.read():first;
  const ev=await machine(env,'wm_retention_observe',{...args,p_absent:first===null&&second===null,p_reads:first===null?2:1,p_response:response});
  if(['unknown','attention'].includes(ev.state))return ev;
  await publish(env,ev,machine);
  await check(false);if(await bytes.read()!==null)fail('changed_bytes');
  return machine(env,'wm_retention_finish',args);
 }catch(error){
  const reason=['missing_bytes','changed_bytes','unsupported_configuration','provider_unavailable'].includes(error.code)?error.code:'independent_pending';
  try{await machine(env,'wm_retention_attention',{...args,p_reason:reason});}catch{}
  throw error;
 }
}
export async function retentionStatus(env,session,org,{human=rpc}={}){
 uuid(org);const local=await human(env,session.access_token,'wm_retention_status',{p_org:org});
 let independent;
 try{const value=await readRetentionOverlay(env,org);independent={head:value.head,holds:value.holds,purged:value.purged,unresolved:Object.values(value.pending)};}catch{independent={state:'unavailable; deletion blocked'};}
 // A failed permission recheck must not fall back to a stale authorized result.
 await human(env,session.access_token,'wm_retention_status',{p_org:org});return {...local,independent};
}
