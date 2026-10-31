import {canonical,uuid} from '../../../src/workspace/domain/contracts.mjs';
import {backupKeys,byteDigest} from '../continuity/envelope.mjs';
import {getEncrypted,putEncrypted,objectBytes,decode,encode} from '../backups/objects.mjs';
import {checkWitness,appendWitness} from '../backups/witness.mjs';
import {fail} from './storage.mjs';
async function control(env,org){
 if(!env.RECOVERY_CONTROL||!env.RECOVERY_BYTES||!env.RECOVERY_WITNESS||env.RECOVERY_WITNESS_ENABLED!=='true')fail('unsupported_configuration');
 const key='control/'+uuid(org)+'.json',o=await env.RECOVERY_CONTROL.get(key),v=decode(await objectBytes(o,16384));
 if(v.organization_id!==org||v.schema_version!==1||!/^[A-Za-z0-9_-]{8,100}$/.test(v.retention_epoch||'')||!Object.hasOwn(v,'retention_head'))fail('independent_pending');
 return {key,value:v,etag:o.etag};
}
async function item(env,org,p,keys){
 const record=decode(await getEncrypted(env.RECOVERY_BYTES,p,keys,65536));
 if(p.context.type!=='retention_event'||p.context.organization_id!==org||record.receipt.id!==p.context.id||record.receipt.digest!==p.context.digest||record.receipt.external_generation!==p.context.external_generation||record.receipt.sequence!==p.context.sequence||record.event.organization_id!==org||record.event.generation!==p.context.external_generation||record.event.id!==p.context.id||p.key!==`retention/${org}/${record.epoch}/${record.event.id}.bin`||record.receipt.digest!==await byteDigest(encode({event:record.event,previous:record.previous,epoch:record.epoch,claim:record.claim})))fail();
 if(BigInt(record.receipt.sequence)!==BigInt(record.previous?.context.sequence||'0')+1n)fail('retention_tail_gap');
 return record;
}
function derive(records){
 const holds=new Map(),pending=new Map(),dispatched=new Set(),cancelled=new Set(),purged=new Set(),intents=new Map(),dispatches=new Map(),claims=new Set();
 const same=(a,b)=>a.job_id===b.job_id&&a.source_id===b.source_id&&a.payload?.attempt_nonce===b.payload?.attempt_nonce&&canonical(a.payload?.inventory)===canonical(b.payload?.inventory);
 for(const {event:e,claim} of records){
  if(e.kind==='hold'||e.kind==='release'){const v=Number(e.payload.version);if(!Number.isSafeInteger(v)||v<1||v<=(holds.get(e.source_id)?.version||0))fail('retention_hold_fork');holds.set(e.source_id,{held:e.kind==='hold',version:v});}
  if(['delete_intent','dispatch','absent'].includes(e.kind)){
   uuid(e.job_id);uuid(e.payload?.attempt_nonce);if(!e.payload.inventory||e.payload.inventory.source_id!==e.source_id)fail('retention_causal_binding');
  }
  if(e.kind==='delete_intent'){
   if(intents.has(e.job_id)||cancelled.has(e.job_id))fail('retention_causal_binding');intents.set(e.job_id,e);pending.set(e.job_id,e.source_id);
  }
  if(e.kind==='dispatch'){
   const intent=intents.get(e.job_id);uuid(claim);
   if(!intent||!same(intent,e)||intent.generation!==e.generation||pending.get(e.job_id)!==e.source_id||dispatched.has(e.job_id)||cancelled.has(e.job_id)||claims.has(claim))fail('retention_causal_binding');
   dispatched.add(e.job_id);dispatches.set(e.job_id,e);claims.add(claim);
  }
  if(e.kind==='cancel'){
   if(!e.job_id||!intents.has(e.job_id)&&e.payload.never_attempted!==true)fail('retention_causal_binding');
   const prior=intents.get(e.job_id);if(prior&&prior.source_id!==e.source_id||e.payload.never_attempted===true&&dispatched.has(e.job_id))fail('retention_causal_binding');
   cancelled.add(e.job_id);if(e.payload.never_attempted===true&&!dispatched.has(e.job_id))pending.delete(e.job_id);
  }
  if(e.kind==='absent'){
   const dispatch=dispatches.get(e.job_id);if(!dispatch||!same(dispatch,e)||pending.get(e.job_id)!==e.source_id||e.payload.absence_reads!==2)fail('retention_causal_binding');
   purged.add(e.source_id);pending.delete(e.job_id);
  }
 }
 return {holds:Object.fromEntries(holds),pending:Object.fromEntries(pending),dispatched:[...dispatched],cancelled:[...cancelled],purged:[...purged]};
}
export async function readRetentionOverlay(env,org,{expected}={}){
 const c=await control(env,org),keys=backupKeys(env),events=[],records=[],receipts={};let p=c.value.retention_head,matched=expected===undefined||expected===null;
 for(let n=0;p&&n<256;n++){const r=await item(env,org,p,keys);if(r.epoch!==c.value.retention_epoch)fail('retention_epoch_changed');if(expected&&canonical(p)===canonical(expected))matched=true;events.push(r.event);records.push({event:r.event,claim:r.claim});receipts[r.event.id]=p.context.digest;p=r.previous;}
 if(p)fail('retention_tail_limit');if(!matched)fail('retention_tail_rollback');
 return {head:c.value.retention_head,epoch:c.value.retention_epoch,generation:c.value.external_generation,access_state:c.value.access_state,events,receipts,
 ...derive(records.toReversed()),records,anchored:expected!==undefined,complete_to_genesis:true};
}
export async function publishRetentionEvent(env,event){
 uuid(event.id);uuid(event.organization_id);if(!['delete_intent','dispatch','hold','release','cancel','absent'].includes(event.kind))fail();
 let c=await control(env,event.organization_id),view=await readRetentionOverlay(env,event.organization_id);
 if(!(['hold','release','cancel','absent'].includes(event.kind)?['open','restricted'].includes(c.value.access_state):c.value.access_state==='open'))fail('retention_generation');
 if(c.value.external_generation!==event.generation&&!(event.kind==='absent'&&view.dispatched.includes(event.job_id)&&(view.pending[event.job_id]===event.source_id||view.events.some(e=>e.id===event.id))))fail('retention_generation');
 const keys=backupKeys(env),key='retention/'+event.organization_id+'/'+c.value.retention_epoch+'/'+event.id+'.bin',existing=await env.RECOVERY_BYTES.get(key);let pointer,created=false;
 if(existing){
  // Locate only in the authenticated current chain; orphan events cannot reparent.
  let p=view.head,record;for(let i=0;p&&i<256;i++){record=await item(env,event.organization_id,p,keys);if(record.event.id===event.id){pointer=p;break;}p=record.previous;}
  if(!pointer||canonical(record.event)!==canonical(event))fail('retention_event_conflict');
 }else{
  if((event.kind==='hold'||event.kind==='release')&&Number(event.payload.version)<=(view.holds[event.source_id]?.version||0))fail('retention_hold_fork');
  const previous=view.head,claim=event.kind==='dispatch'?crypto.randomUUID():null;
  // Validate before writing immutable bytes or moving the independent head.
  const projection=derive([...view.records.toReversed(),{event,claim}]);
  const reserved=Object.keys(projection.pending).reduce((n,id)=>n+(projection.dispatched.includes(id)?1:2),0);
  if(view.records.length+1+reserved>256)fail('retention_tail_limit');
  const digest=await byteDigest(encode({event,previous,epoch:view.epoch,claim})),sequence=(BigInt(previous?.context.sequence||'0')+1n).toString();
  const receipt={id:event.id,organization_id:event.organization_id,external_generation:event.generation,sequence,digest};
  pointer=await putEncrypted(env.RECOVERY_BYTES,key,encode({receipt,event,previous,epoch:view.epoch,claim}),{type:'retention_event',...receipt},keys,env.BACKUP_KEY_ID,{max:57344});
  const next={...c.value,retention_head:pointer};let status;
  try{status=await env.RECOVERY_CONTROL.put(c.key,JSON.stringify(next),{onlyIf:{etagMatches:c.etag},httpMetadata:{contentType:'application/json'}});}catch{status='unknown';}
  view=await readRetentionOverlay(env,event.organization_id,{expected:pointer});
  if(!view.events.some(e=>e.id===event.id))fail(status==='unknown'?'retention_head_unknown':'retention_head_conflict');created=true;
 }
 // Independent ledger survives primary rollback; shared latest witness is also
 // mandatory before physical dispatch or positive local completion.
 const latest=await checkWitness(env,event.organization_id,event.generation,{keys});
 const witness=await appendWitness(env,event.organization_id,event.generation,{id:event.id,kind:'retention',retention_kind:event.kind,source_id:event.id,source_digest:pointer.context.digest,source_pointer:pointer},{expected:latest.head});
 return {overlay:pointer,witness,created};
}
export async function retentionCheckpointOverlay(env,org,{expected}={}){
 if(!expected)fail('retention_anchor_required');
 const v=await readRetentionOverlay(env,org,{expected});
 for(const generation of new Set(v.events.map(e=>e.generation))){const witnessed=await checkWitness(env,org,generation);for(const e of v.events.filter(e=>e.generation===generation)){if(!witnessed.events.some(w=>w.kind==='retention'&&w.source_id===e.id&&w.source_digest===v.receipts[e.id]))fail('retention_witness_gap');}}
 return {head:v.head,epoch:v.epoch,tombstone_targets:v.events.filter(e=>e.kind==='absent').map(e=>e.payload.inventory),tombstones:v.purged,holds:Object.entries(v.holds).filter(([,x])=>x.held).map(([id])=>id),
 unresolved:Object.values(v.pending),complete:Object.keys(v.pending).length===0,authority_completeness:'not supplied; combine independent authority/withdrawal proof',anchored:true};
}
