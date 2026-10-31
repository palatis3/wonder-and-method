import {canonical,uuid} from '../../../src/workspace/domain/contracts.mjs';
import {backupKeys,sealBytes,openBytes,byteDigest} from '../continuity/envelope.mjs';
import {externalControl} from '../continuity/receipts.mjs';
import {encode,decode,namespace,objectBytes,putEncrypted,getEncrypted,fail} from './objects.mjs';
const MAX_EVENT=65536,MAX_CHAIN=256;
const headContext=(org,generation)=>({type:'tenant_latest_witness_head',organization_id:org,external_generation:generation});
function validateEvent(event){
 if(!event||Object.keys(event).some(k=>!['id','kind','retention_kind','source_id','source_digest','attempt_id','nonce','phase','snapshot_digest','manifest_key','source_pointer'].includes(k)))fail('witness_input');
 uuid(event.id);if(!event.source_pointer||encode(event.source_pointer).length>4096)fail('witness_source_required');if(!['receipt','retention','attempt_intent','attempt_outcome','backup_seal'].includes(event.kind)||! /^[a-f0-9]{64}$/.test(event.source_digest||''))fail('witness_input');uuid(event.source_id);
 if(event.kind==='retention'&&!['delete_intent','dispatch','hold','release','cancel','absent'].includes(event.retention_kind))fail('witness_input');
 if(event.kind.startsWith('attempt_')){uuid(event.attempt_id);uuid(event.nonce);if(event.phase!==(event.kind==='attempt_intent'?'intent':'outcome'))fail('witness_input');}
 if(encode(event).length>MAX_EVENT-8192)fail('witness_input');return event;
}
async function verifySource(env,event,org,generation,keys){
 const p=event.source_pointer;if(!env.RECOVERY_BYTES||p.context?.organization_id!==org||p.context.external_generation!==generation)fail('witness_source_binding');
 const source=decode(await getEncrypted(env.RECOVERY_BYTES,p,keys,event.kind==='backup_seal'?2097152+8212:1048576));
 if(event.kind==='receipt'){
  if(p.context.type!=='critical_receipt'||p.context.id!==event.source_id||source.receipt?.id!==event.source_id||source.receipt?.digest!==event.source_digest||source.receipt?.organization_id!==org||source.receipt?.external_generation!==generation)fail('witness_source_binding');
 }else if(event.kind==='retention'){
  if(p.context.type!=='retention_event'||p.context.id!==event.source_id||source.receipt?.id!==event.source_id||source.receipt?.digest!==event.source_digest||source.receipt?.organization_id!==org||source.receipt?.external_generation!==generation||source.receipt?.sequence!==p.context.sequence||source.event?.id!==event.source_id||source.event?.organization_id!==org||source.event?.generation!==generation||source.event?.kind!==event.retention_kind||p.key!==`retention/${org}/${source.epoch}/${event.source_id}.bin`||await byteDigest(encode({event:source.event,previous:source.previous,epoch:source.epoch,claim:source.claim}))!==event.source_digest)fail('witness_source_binding');
  if(BigInt(source.receipt.sequence)!==BigInt(source.previous?.context.sequence||'0')+1n)fail('witness_source_binding');
 }else if(event.kind==='backup_seal'){
  if(p.context.type!=='tenant_backup_manifest'||p.context.backup_id!==event.source_id||source.backup_id!==event.source_id||p.plaintext_digest!==event.source_digest||p.key!==event.manifest_key||source.snapshot_digest!==event.snapshot_digest)fail('witness_source_binding');
 }else{
  const a=event.kind==='attempt_intent'?source.attempt:{id:source.attempt_id,dispatch_nonce:source.dispatch_nonce};
  if(p.context.type!=='provider_attempt'||p.context.id!==event.attempt_id||p.context.nonce!==event.nonce||p.plaintext_digest!==event.source_digest||a?.id!==event.attempt_id||a?.dispatch_nonce!==event.nonce||p.context.phase!==event.phase)fail('witness_source_binding');
 }
 return {retention_kind:event.kind==='retention'?source.event.kind:null};
}
async function rawHead(bucket,org,generation,keys){
 const key=`witness/${namespace(org,generation)}/head.bin`,obj=await bucket.get(key);if(!obj)return {key,etag:null,pointer:null};
 const bytes=await objectBytes(obj,16384),head=decode(await openBytes(bytes,headContext(org,generation),keys));
 if(head.format!==1||!head.pointer||! /^[1-9][0-9]*$/.test(head.pointer.context?.sequence||''))fail('witness_head_invalid');return {key,etag:obj.etag,pointer:head.pointer};
}
async function eventAt(env,bucket,p,org,generation,keys){
 if(p.context?.organization_id!==org||p.context.external_generation!==generation||p.context.type!=='tenant_witness_event'||! /^[1-9][0-9]*$/.test(p.context.sequence||''))fail('witness_fork');
 const record=decode(await getEncrypted(bucket,p,keys,MAX_EVENT+8212));validateEvent(record.event);
 if(p.key!==`witness/${namespace(org,generation)}/events/${record.event.id}.bin`||record.event.id!==p.context.event_id||record.sequence!==p.context.sequence||BigInt(record.sequence)!==BigInt(record.predecessor?.context.sequence||'0')+1n)fail('witness_gap');
 await verifySource(env,record.event,org,generation,keys);return record;
}
export async function checkWitness(env,org,generation,{expected=null,keys=backupKeys(env),max=MAX_CHAIN}={}){
 if(!env.RECOVERY_WITNESS||!Number.isInteger(max)||max<1||max>MAX_CHAIN)fail('witness_configuration');
 const head=await rawHead(env.RECOVERY_WITNESS,org,generation,keys);if(!head.pointer){if(expected)fail('witness_rollback');return {head:null,events:[],anchored:false,complete_to_genesis:true};}
 let cursor=head.pointer;const events=[];let matched=!expected;
 for(let i=0;i<max&&cursor;i++){
  const record=await eventAt(env,env.RECOVERY_WITNESS,cursor,org,generation,keys);events.push(record.event);
  if(expected&&canonical(cursor)===canonical(expected)){matched=true;return {head:head.pointer,events,anchored:true,complete_to_genesis:record.predecessor===null};}
  if(expected&&BigInt(cursor.context.sequence)<=BigInt(expected.context.sequence))fail('witness_rollback');
  cursor=record.predecessor;
 }
 if(!matched)fail(cursor?'witness_scan_limit':'witness_rollback');
 return {head:head.pointer,events,anchored:Boolean(expected)&&matched,complete_to_genesis:cursor===null};
}
export async function appendWitness(env,org,generation,event,{expected,control=externalControl,keyId=env.BACKUP_KEY_ID}={}){
 validateEvent(event);namespace(org,generation);const keys=backupKeys(env),bucket=env.RECOVERY_WITNESS;if(!bucket||!Object.hasOwn(keys,keyId))fail('witness_configuration');
 // Historic outcomes can be retained in their original stream; new intents and
 // backup seals require the current open external generation.
 const source=await verifySource(env,event,org,generation,keys);
 const checkControl=async()=>{
  if(event.kind==='attempt_outcome')return;
  const c=await control(env,org),defensive=event.kind==='retention'&&['hold','release','cancel','absent'].includes(source.retention_kind);
  if(!(defensive?['open','restricted'].includes(c.access_state):c.access_state==='open')||(source.retention_kind!=='absent'&&c.external_generation!==generation))fail('witness_generation');
 };
 await checkControl();
 let head=await rawHead(bucket,org,generation,keys);const key=`witness/${org}/${generation}/events/${event.id}.bin`;
 const obj=await bucket.get(key);let pointer;
 if(obj){
  const bytes=await objectBytes(obj,MAX_EVENT+8212);const headerLength=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(0);if(headerLength>8192)fail();const context=decode(bytes.subarray(4,4+headerLength)).context;
  const plain=await openBytes(bytes,context,keys),record=decode(plain);if(canonical(record.event)!==canonical(event)||context.organization_id!==org||context.external_generation!==generation||context.event_id!==event.id)fail('witness_event_conflict');
  pointer={key,context,plaintext_digest:await byteDigest(plain),ciphertext_digest:await byteDigest(bytes),bytes:plain.length,key_id:decode(bytes.subarray(4,4+headerLength)).key_id};
  const current=await checkWitness(env,org,generation,{keys});if(current.events.some(e=>e.id===event.id)){await checkWitness(env,org,generation,{expected:pointer,keys});return pointer;}
  if(expected===undefined||canonical(expected)!==canonical(head.pointer))fail('witness_cas_conflict');
  if(canonical(record.predecessor)!==canonical(head.pointer))fail('witness_fork');
 }else{
  if(expected===undefined||canonical(expected)!==canonical(head.pointer))fail('witness_cas_conflict');
  const sequence=(BigInt(head.pointer?.context.sequence||'0')+1n).toString(),context={type:'tenant_witness_event',organization_id:org,external_generation:generation,event_id:event.id,sequence};
  pointer=await putEncrypted(bucket,key,encode({event,sequence,predecessor:head.pointer}),context,keys,keyId,{max:MAX_EVENT});
 }
 // Never replace a newer head. A lost acknowledgement is resolved by a verified
 // ancestor walk, including a concurrent later append, not by listing objects.
 const bytes=await sealBytes(encode({format:1,pointer}),headContext(org,generation),keys,keyId);
 let outcome;try{outcome=await bucket.put(head.key,bytes,{onlyIf:head.etag?{etagMatches:head.etag}:new Headers({'If-None-Match':'*'}),httpMetadata:{contentType:'application/octet-stream'}});}catch{outcome='unknown';}
 try{await checkWitness(env,org,generation,{expected:pointer,keys});}catch(error){if(outcome==='unknown')fail('witness_write_unknown');if(outcome===null)fail('witness_cas_conflict');throw error;}
 await checkControl();
 return pointer;
}
// Compare only documented source identities. A complete historical chain does
// not establish hooks were installed for every external effect.
export function assessWitnessTail(check,tail){
 const issues=[];
 for(const e of check.events){
  if(e.kind==='receipt'&&tail.receipts?.[e.source_id]!==e.source_digest)issues.push({kind:tail.receipts?.[e.source_id]?'receipt_diverged':'receipt_missing',event_id:e.id});
  if(e.kind==='retention'){const r=tail.retention_receipts?.[e.source_id];if(!r||r.digest!==e.source_digest||r.key!==e.source_pointer.key||r.generation!==e.source_pointer.context.external_generation||r.kind!==e.retention_kind)issues.push({kind:r?'retention_diverged':'retention_missing',event_id:e.id});}
  if(e.kind.startsWith('attempt_')){const a=tail.attempts?.[e.attempt_id];if(!a||a.nonce!==e.nonce)issues.push({kind:'attempt_missing_or_changed',event_id:e.id});else if(e.kind==='attempt_outcome'&&a.state!=='resolved')issues.push({kind:'outcome_requires_reconciliation',event_id:e.id});}
 }
 return {state:issues.length?'reconciliation_required':'no_gap_in_checked_witness',issues,complete_to_genesis:check.complete_to_genesis,coverage:'Only wired witnessed events; not proof of complete provider history'};
}
