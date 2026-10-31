import test from 'node:test';
import assert from 'node:assert/strict';
import {sealBytes,openBytes} from '../../worker/workspace/continuity/envelope.mjs';
import {persistReceipt,flushReceipts} from '../../worker/workspace/continuity/receipts.mjs';
import {database,actor,admin,ids,command} from './database.mjs';
const encoder=new TextEncoder();
const key=()=>Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');
class MemoryBucket{
 objects=new Map(); writes=[]; loseAck=null; rejectHead=false;
 async get(key){const o=this.objects.get(key);return o?{size:o.bytes.length,etag:o.etag,arrayBuffer:async()=>o.bytes.slice().buffer,json:async()=>JSON.parse(new TextDecoder().decode(o.bytes))}:null;}
 async put(key,body,options={}){
  const old=this.objects.get(key),condition=options.onlyIf;
  if((condition instanceof Headers&&condition.get('If-None-Match')==='*'&&old)||(condition?.etagMatches&&condition.etagMatches!==old?.etag))return null;
  if(this.rejectHead&&key.endsWith('head.json'))return null;
  const bytes=typeof body==='string'?encoder.encode(body):new Uint8Array(body);const etag=crypto.randomUUID();this.objects.set(key,{bytes:bytes.slice(),etag});this.writes.push(key);
  if(this.loseAck?.(key)){this.loseAck=null;throw Error('Synthetic response lost after committed write');}
  return {etag};
 }
}
async function fixture(){const bytes=new MemoryBucket(),control=new MemoryBucket(),keys={one:key()};await control.put(`control/${ids.org}.json`,JSON.stringify({schema_version:1,organization_id:ids.org,external_generation:'fixture-generation-1',access_state:'open',positive_effects_allowed:false}));return {RECOVERY_BYTES:bytes,RECOVERY_CONTROL:control,BACKUP_KEY_ID:'one',BACKUP_KEYS:JSON.stringify(keys),BACKUP_ENABLED:'true'};}
function receipt(sequence,predecessor=null){return {organization_id:ids.org,id:crypto.randomUUID(),sequence:String(sequence),predecessor_id:predecessor?.id||null,event_type:'decision.approve',target_id:crypto.randomUUID(),payload:{text:'Synthetic approval'},digest:'a'.repeat(64),external_generation:'fixture-generation-1',created_at:'2026-10-30T00:00:00Z'};}

test('backup envelopes bind tenant, purpose, exact bytes and retained key versions',async()=>{
 const keys={one:key(),two:key()},context={org:ids.org,type:'receipt'},plain=encoder.encode('Synthetic private bytes');const packet=await sealBytes(plain,context,keys,'one');
 assert.deepEqual(await openBytes(packet,context,keys),plain);
 await assert.rejects(openBytes(packet,{org:ids.other,type:'receipt'},keys),/verified/);
 await assert.rejects(openBytes(packet,{...context,type:'file'},keys),/verified/);
 await assert.rejects(openBytes(packet,context,{two:keys.two}),/verified/);
 const modified=packet.slice();modified[modified.length-1]^=1;await assert.rejects(openBytes(modified,context,keys),/verified/);
});

test('independent receipt writer preserves chain, handles lost writes and rejects conflicting old data',async()=>{
 const env=await fixture(),first=receipt(1),second=receipt(10,first);
 env.RECOVERY_BYTES.loseAck=k=>k.endsWith('.bin');await assert.rejects(persistReceipt(env,first),/response lost/);
 const a=await persistReceipt(env,first);assert.ok(a.p_key.endsWith(first.id+'.bin'));
 env.RECOVERY_BYTES.loseAck=k=>k.endsWith('head.json');await assert.rejects(persistReceipt(env,second),/response lost/);
 const b=await persistReceipt(env,second);assert.ok(b.p_key.includes('/10-'));
 assert.deepEqual(await persistReceipt(env,first),a);
 assert.equal(env.RECOVERY_BYTES.writes.filter(x=>x.endsWith('.bin')).length,2);
 await assert.rejects(persistReceipt(env,{...first,payload:{text:'Changed after restore'}}),/reconciliation/);
 await assert.rejects(persistReceipt(env,receipt(11)),/reconciliation/);
});

test('failed head and changed independent generation never produce durable acknowledgment',async()=>{
 const env=await fixture(),r=receipt(1);env.RECOVERY_BYTES.rejectHead=true;
 await assert.rejects(persistReceipt(env,r),/confirmation is pending/);
 let committed=false;const outcome=await flushReceipts(env,{rpc:async(_env,name)=>{if(name==='wm_receipts_pending')return [r];if(name==='wm_receipt_persisted')committed=true;}});
 assert.equal(committed,false);assert.equal(outcome.failed,1);
 await env.RECOVERY_CONTROL.put(`control/${ids.org}.json`,JSON.stringify({schema_version:1,organization_id:ids.org,external_generation:'replacement-generation',access_state:'restricted'}));
 await assert.rejects(persistReceipt(env,r),/reconciliation/);
});

test('a missing or corrupted current predecessor cannot be extended as a durable chain',async()=>{
 for(const corrupt of [false,true]){
  const env=await fixture(),a=receipt(1),b=receipt(2,a);const prior=await persistReceipt(env,a);
  if(corrupt)env.RECOVERY_BYTES.objects.get(prior.p_key).bytes[12]^=1;else env.RECOVERY_BYTES.objects.delete(prior.p_key);
  await assert.rejects(persistReceipt(env,b),/reconciliation|verified/);
 }
});

test('receipt database acknowledgment is machine-only, ordered and bound to current generation',async()=>{
 const db=await database();try{
  await actor(db,ids.client);const r=await command(db,'request_create',{engagement_id:ids.engagement,outcome:'Synthetic receipt test'});
  await assert.rejects(db.query('select public.wm_receipts_pending()'),/permission denied/);
  await admin(db);await db.query("select wm.critical($1,'test.first',$2,'{}'),wm.critical($1,'test.second',$2,'{}')",[ids.org,r.id]);
  await admin(db);const list=(await db.query('select * from wm.critical_receipts order by sequence')).rows;
  await actor(db,ids.operator,{role:'service_role'});assert.equal((await db.query('select public.wm_receipts_pending() as r')).rows[0].r.length,1);
  const ack=async(x,generation=x.external_generation)=>(await db.query('select public.wm_receipt_persisted($1,$2,$3,$4,$5,$6) as r',[ids.org,x.id,x.digest,generation,`receipts/${ids.org}/${generation}/items/${x.sequence}-${x.id}.bin`,'b'.repeat(64)])).rows[0].r;
  await assert.rejects(ack(list[1]),/preceding/);await assert.rejects(ack(list[0],'wrong-generation'),/generation/);
  assert.equal((await ack(list[0])).durability,'durable');assert.equal((await db.query('select public.wm_receipts_pending() as r')).rows[0].r[0].id,list[1].id);assert.equal((await ack(list[1])).durability,'durable');
 }finally{await db.close();}
});

test('failed receipt batches rotate between tenants and never skip a conflicted predecessor',async()=>{
 const db=await database();try{
  await admin(db);await db.query("select wm.critical($1,'test',$2,'{}'),wm.critical($3,'test',$2,'{}')",[ids.org,crypto.randomUUID(),ids.other]);
  await actor(db,ids.operator,{role:'service_role'});const first=(await db.query('select public.wm_receipts_pending(1) as r')).rows[0].r[0];
  const second=(await db.query('select public.wm_receipts_pending(1) as r')).rows[0].r[0];assert.notEqual(first.organization_id,second.organization_id);
  await db.query('select public.wm_receipt_conflict($1,$2)',[first.organization_id,first.id]);
  await admin(db);await db.query("select wm.critical($1,'later',$2,'{}')",[first.organization_id,crypto.randomUUID()]);
  await actor(db,ids.operator,{role:'service_role'});const pending=(await db.query('select public.wm_receipts_pending(25) as r')).rows[0].r;assert.equal(pending.some(r=>r.organization_id===first.organization_id),false);
 }finally{await db.close();}
});
