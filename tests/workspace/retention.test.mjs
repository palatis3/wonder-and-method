import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,ids} from './database.mjs';
import {sha256} from '../../worker/workspace/files/content.mjs';
import {retentionCommand,processRetention,validateRetention,retentionStatus} from '../../worker/workspace/retention/service.mjs';
import {readRetentionOverlay,publishRetentionEvent,retentionCheckpointOverlay} from '../../worker/workspace/retention/overlay.mjs';
import {retentionStorage} from '../../worker/workspace/retention/storage.mjs';
import {retentionViews} from '../../src/workspace/retention-ui.mjs';
import {checkWitness,assessWitnessTail} from '../../worker/workspace/backups/witness.mjs';
import {putEncrypted,encode} from '../../worker/workspace/backups/objects.mjs';
class Bucket{
 data=new Map();seq=0;lost=false;deny=false;
 async get(key){const v=this.data.get(key);return v?{size:v.bytes.length,etag:v.etag,body:new Response(v.bytes).body,json:async()=>JSON.parse(new TextDecoder().decode(v.bytes))}:null;}
 async put(key,body,{onlyIf}={}){if(this.deny)throw Error('synthetic unavailable');const old=this.data.get(key);if(onlyIf instanceof Headers&&old)return null;if(onlyIf?.etagMatches&&old?.etag!==onlyIf.etagMatches)return null;const bytes=typeof body==='string'?new TextEncoder().encode(body):new Uint8Array(body);this.data.set(key,{bytes:bytes.slice(),etag:'v'+(++this.seq)});if(this.lost){this.lost=false;throw Error('accepted then lost');}return {};}
}
const keyring=btoa(String.fromCharCode(...new Uint8Array(32).fill(31)));
async function env(){const e={BACKUP_KEYS:JSON.stringify({fixture:keyring}),BACKUP_KEY_ID:'fixture',RECOVERY_BYTES:new Bucket(),RECOVERY_WITNESS:new Bucket(),RECOVERY_CONTROL:new Bucket(),RECOVERY_WITNESS_ENABLED:'true',RETENTION_FENCES_VERSION:'retention-v1',RETENTION_IMMUTABLE_STORAGE_QUALIFIED:'true',SUPABASE_SECRET_KEY:'synthetic-not-a-live-credential',SUPABASE_PUBLISHABLE_KEY:'synthetic',SUPABASE_URL:'https://synthetic.supabase.co',APP_ORIGIN:'https://synthetic.example'};
 await e.RECOVERY_CONTROL.put('control/'+ids.org+'.json',JSON.stringify({schema_version:1,organization_id:ids.org,external_generation:'fixture-generation-1',access_state:'open',retention_epoch:'fixture-retention-1',retention_head:null}));return e;
}
const sql=async(db,n,a)=>(await db.query('select public.'+n+'('+Object.keys(a).map((_,i)=>'$'+(i+1)).join(',')+') r',Object.values(a).map(x=>x&&typeof x==='object'?JSON.stringify(x):x))).rows[0].r;
const io=db=>({human:async(_e,_t,n,a)=>{await actor(db,ids.operator,{aal:'aal2'});return sql(db,n,a);},machine:async(_e,n,a)=>{await actor(db,ids.operator,{role:'service_role'});return sql(db,n,a);}});
async function file(db){await admin(db);const id=crypto.randomUUID(),bytes=new Uint8Array([9,8,7]),hash=await sha256(bytes),path=ids.org+'/'+id+'/'+hash;await db.query("insert into wm.attachments(organization_id,id,engagement_id,uploader_id,visibility,upload_object_key,sealed_object_key,original_name,declared_media_type,declared_bytes,actual_media_type,actual_bytes,checksum,scan_state,scan_policy_version,expires_at,created_at) values($1,$2,$3,$4,'internal',$5,$6,'synthetic.txt','text/plain',3,'text/plain',3,$7,'ready','fixture',now()+interval '1 day',now()-interval '2 days')",[ids.org,id,ids.engagement,ids.operator,path+'.upload',path,hash]);return {id,source:'workspace:'+id,path,hash,bytes};}
function store(){return {present:true,deletes:0,reads:0,async read(){this.reads++;return this.present?{bytes:3}:null;},async remove(){this.deletes++;this.present=false;return 'acknowledged';}};}
const human=async(db,e,command,input,extra={})=>retentionCommand(e,{access_token:'synthetic'},ids.org,command,input,crypto.randomUUID(),{...io(db),...extra});
const plan=async(db,e,f)=>human(db,e,'retention.plan',{source_id:f.source,expected_version:1,policy_version:'explicit-policy-v1',cutoff:new Date(Date.now()-86400000).toISOString()});
const getJob=async(db,id)=>{await admin(db);return (await db.query('select * from wm.retention_jobs where id=$1',[id])).rows[0];};
const execute=async(db,e,p,s)=>human(db,e,'retention.execute',{id:p.id,expected_version:Number(p.version)},{store:s});
const hold=async(db,e,f,held=true,version=0)=>human(db,e,'retention.hold',{source_id:f.source,expected_version:version,held,reason:'Explicit case hold'});
const lease=async(db,p)=>io(db).human(null,null,'wm_retention_command',{p_org:ids.org,p_command:'retention.execute',p_input:{id:p.id,expected_version:Number(p.version)},p_key:crypto.randomUUID()});

test('late recovery-role revocation cannot return a stale retention status',async()=>{
 let reads=0;await assert.rejects(retentionStatus({}, {access_token:'synthetic'},ids.org,{human:async()=>{if(++reads===1)return {items:[{id:'private historical target'}]};throw Error('Synthetic current recovery access denied');}}),/current recovery access denied/);assert.equal(reads,2);
 const input={source_id:'workspace:'+crypto.randomUUID(),expected_version:1,policy_version:'explicit',cutoff:'2026-01-01T12:00:00'};assert.throws(()=>validateRetention('retention.plan',input),e=>e.code==='retention_input');
});

test('restoring revoked staff does not revive an existing physical deletion lease',async()=>{
 const db=await database();try{
  await admin(db);await db.query("insert into wm.staff(user_id,capabilities,active_until) values($1,array['recovery'],now()+interval '1 year')",[ids.operator]);
  const e=await env(),f=await file(db),p=await plan(db,e,f),j=await lease(db,p),args={p_org:ids.org,p_id:j.id,p_lease:j.lease,p_dispatch:false};
  await io(db).machine(null,'wm_retention_context',args);
  await admin(db);await db.query('update wm.staff set revoked_at=now() where user_id=$1',[ids.operator]);await db.query('update wm.staff set revoked_at=null where user_id=$1',[ids.operator]);
  await assert.rejects(io(db).machine(null,'wm_retention_context',args),/authority lease or generation changed/);
 }finally{await db.close();}
});

test('current recovery MFA, tenant isolation, explicit cutoff and private RLS are enforced',async()=>{
 const db=await database();try{const e=await env(),f=await file(db),input={source_id:f.source,expected_version:1,policy_version:'explicit',cutoff:new Date().toISOString()};
 await actor(db,ids.client);await assert.rejects(sql(db,'wm_retention_command',{p_org:ids.org,p_command:'retention.plan',p_input:input,p_key:crypto.randomUUID()}),/recovery operator/);
 await actor(db,ids.operator,{aal:'aal2',age:1800});await assert.rejects(sql(db,'wm_retention_status',{p_org:ids.org}),/Confirm/);
 await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(db.query('select * from wm.retention_jobs'),/permission denied/);
 await assert.rejects(sql(db,'wm_retention_command',{p_org:ids.other,p_command:'retention.plan',p_input:input,p_key:crypto.randomUUID()}),/recovery operator/);
 await assert.rejects(human(db,e,'retention.plan',{...input,cutoff:new Date(Date.now()+86400000).toISOString()}),/cutoff/);
 }finally{await db.close();}
});
test('planned exact deletion requires independently witnessed intent and dispatch, then durable verified absence',async()=>{
 const db=await database();try{const e=await env(),f=await file(db),p=await plan(db,e,f),s=store();assert.equal(s.deletes,0);assert.equal((await execute(db,e,p,s)).state,'purged');assert.equal(s.deletes,1);
 const v=await readRetentionOverlay(e,ids.org);assert.deepEqual(v.purged,[f.source]);assert.deepEqual(v.events.map(x=>x.kind),['absent','dispatch','delete_intent']);
 const cp=await retentionCheckpointOverlay(e,ids.org,{expected:v.head});assert.equal(cp.complete,true);assert.deepEqual(cp.tombstones,[f.source]);assert.match(cp.authority_completeness,/not supplied/);
 await admin(db);assert.equal((await db.query('select state from wm.retention_actions where id=$1',[p.id])).rows[0].state,'purged');assert.ok((await db.query('select deleted_at from wm.attachments where id=$1',[f.id])).rows[0].deleted_at);
 }finally{await db.close();}
});
test('legal holds and versioned releases block dispatch until deliberate release',async()=>{
 const db=await database();try{const e=await env(),f=await file(db),p=await plan(db,e,f),s=store();const h=await hold(db,e,f);assert.equal(h.durability,'independently_witnessed');await assert.rejects(execute(db,e,p,s),/hold/);assert.equal(s.deletes,0);
 await assert.rejects(hold(db,e,f,false,0),/version/);await hold(db,e,f,false,1);assert.equal((await execute(db,e,p,s)).state,'purged');
 }finally{await db.close();}
});
test('backup source holds and active restore runs block deletion under the tenant guard',async()=>{
 const db=await database();try{const e=await env(),f=await file(db),p=await plan(db,e,f);await admin(db);
 await db.query("insert into wm.tenant_backup_jobs(organization_id,requested_by,session_id,grant_digest,recovery_generation,external_generation,qualification,key_id,state,files) values($1,$2,$2,'synthetic',1,'fixture-generation-1','{}','fixture','captured',$3::jsonb)",[ids.org,ids.operator,JSON.stringify([{bucket:'workspace-sealed',key:f.path}])]);
 await assert.rejects(execute(db,e,p,store()),/hold/);
 await admin(db);await db.query("update wm.tenant_backup_jobs set state='cancelled' where organization_id=$1",[ids.org]);
 await db.query("insert into wm_restore.runs(organization_id,requested_by,session_id,request_grant_digest,request_key,input_hash,manifest_pointer,old_generation,generation,recovery_generation) values($1,$2,$2,wm.backup_actor_digest($1,$2),'fixture-run-key','hash','{}','old-generation','fixture-generation-1',1)",[ids.org,ids.operator]);await assert.rejects(execute(db,e,p,store()),/hold/);
 }finally{await db.close();}
});
test('missing independent storage or witness acknowledgment prevents every physical delete',async()=>{
 const db=await database();try{const e=await env(),f=await file(db),p=await plan(db,e,f),s=store();e.RECOVERY_WITNESS.deny=true;await assert.rejects(execute(db,e,p,s));assert.equal(s.deletes,0);const j=await getJob(db,p.id);assert.equal(j.state,'attention');assert.equal(j.attempted_at,null);
 const v=await readRetentionOverlay(e,ids.org);assert.deepEqual(Object.values(v.pending),[f.source]);await assert.rejects(retentionCheckpointOverlay(e,ids.org,{expected:v.head}),err=>err.code==='retention_witness_gap');
 }finally{await db.close();}
});
test('lost DELETE response resolves by absence reads, without issuing another DELETE',async()=>{
 const db=await database();try{const e=await env(),f=await file(db),p=await plan(db,e,f),s=store();s.remove=async function(){this.deletes++;this.present=false;throw Error('response lost');};assert.equal((await execute(db,e,p,s)).state,'purged');assert.equal(s.deletes,1);assert.ok(s.reads>=4);}finally{await db.close();}
});
test('unknown outcome with bytes present permits only read reconciliation, not a fresh DELETE',async()=>{
 const db=await database();try{const e=await env(),f=await file(db),p=await plan(db,e,f),s=store();s.remove=async function(){this.deletes++;throw Error('request still uncertain');};
 assert.equal((await execute(db,e,p,s)).state,'unknown');let j=await getJob(db,p.id);
 assert.equal((await human(db,e,'retention.reconcile',{id:j.id,expected_version:Number(j.version)},{store:s})).state,'unknown');assert.equal(s.deletes,1);
 s.present=false;j=await getJob(db,p.id);assert.equal((await human(db,e,'retention.reconcile',{id:j.id,expected_version:Number(j.version)},{store:s})).state,'purged');assert.equal(s.deletes,1);
 }finally{await db.close();}
});
test('a hold racing an in-flight DELETE reports uncertainty and never promises preservation',async()=>{
 const db=await database();try{const e=await env(),f=await file(db),p=await plan(db,e,f),s=store();let h;
 s.remove=async function(){this.deletes++;h=await hold(db,e,f);this.present=false;return 'acknowledged';};
 const result=await execute(db,e,p,s);assert.equal(h.uncertain_inflight,true);assert.equal(result.hold_race,true);assert.equal(result.state,'purged');assert.equal((await readRetentionOverlay(e,ids.org)).holds[f.source].held,true);
 }finally{await db.close();}
});
test('changed or missing bytes before attempt are attention, never a successful purge',async()=>{
 const db=await database();try{const e=await env(),f=await file(db),p=await plan(db,e,f),s=store();s.present=false;await assert.rejects(execute(db,e,p,s),err=>err.code==='missing_bytes');assert.equal(s.deletes,0);assert.equal((await getJob(db,p.id)).state,'attention');assert.equal((await readRetentionOverlay(e,ids.org)).events.length,0);}finally{await db.close();}
});
test('revoked authorization after durable intent fences the later dispatch boundary',async()=>{
 const db=await database();try{const e=await env(),f=await file(db),p=await plan(db,e,f),l=await lease(db,p),base=io(db),s=store();let changed=false;
 const machine=async(en,n,a)=>{const v=await base.machine(en,n,a);if(n==='wm_retention_durable'&&!changed){changed=true;await admin(db);await db.query('update wm.operator_assignments set revoked_at=now() where organization_id=$1 and user_id=$2',[ids.org,ids.operator]);}return v;};
 await assert.rejects(processRetention(e,ids.org,p.id,l.lease,{machine,store:s}),/authority|generation/);assert.equal(s.deletes,0);
 }finally{await db.close();}
});
test('independent dispatch fact prevents a rolled-back local job from deleting again',async()=>{
 const db=await database();try{const e=await env(),f=await file(db),p=await plan(db,e,f),s=store();s.remove=async function(){this.deletes++;throw Error('uncertain');};await execute(db,e,p,s);const j=await getJob(db,p.id);
 const machine=async(en,n,a)=>{const v=await io(db).machine(en,n,n==='wm_retention_context'?{...a,p_dispatch:false}:a);if(n==='wm_retention_context')return {...v,attempted_at:null,state:'intent'};return v;};
 await assert.rejects(processRetention(e,ids.org,p.id,j.lease,{machine,store:s}),err=>err.code==='retention_fenced');assert.equal(s.deletes,1);
 }finally{await db.close();}
});
test('independent hold history survives a stale local projection and rollback is detected against a retained anchor',async()=>{
 const db=await database();try{const e=await env(),f=await file(db),p=await plan(db,e,f);const oldControl=e.RECOVERY_CONTROL.data.get('control/'+ids.org+'.json').bytes.slice();await hold(db,e,f);const v=await readRetentionOverlay(e,ids.org);
 await admin(db);await db.query('update wm.retention_holds set held=false where organization_id=$1',[ids.org]);const s=store();await assert.rejects(execute(db,e,p,s),err=>err.code==='retention_fenced');assert.equal(s.deletes,0);
 e.RECOVERY_CONTROL.data.set('control/'+ids.org+'.json',{bytes:oldControl,etag:'rolled-back'});await assert.rejects(readRetentionOverlay(e,ids.org,{expected:v.head}),err=>err.code==='retention_tail_rollback');
 }finally{await db.close();}
});
test('typed Supabase and R2 adapters use exact keys, bounded hashes, and conservative missing/denial semantics',async()=>{
 const e=await env(),bytes=new Uint8Array([9,8,7]),hash=await sha256(bytes),id=crypto.randomUUID(),t={source_id:'workspace:'+id,backend:'supabase',bucket:'workspace-sealed',key:ids.org+'/'+id+'/'+hash,sha256:hash,bytes:'3'},calls=[];
 const fetcher=async(url,opts)=>{calls.push({url,opts});return opts.method==='DELETE'?new Response('{}',{status:403}):new Response(bytes);};
 const s=retentionStorage(e,ids.org,t,{fetcher});assert.equal((await s.read()).sha256,hash);assert.equal(await s.remove(),'denied');assert.deepEqual(JSON.parse(calls[1].opts.body),{prefixes:[t.key]});assert.equal(calls[1].url,'https://synthetic.supabase.co/storage/v1/object/workspace-sealed');
 const missing=retentionStorage(e,ids.org,t,{fetcher:async()=>new Response('{"code":"NoSuchKey"}',{status:404})});assert.equal(await missing.read(),null);
 await assert.rejects(retentionStorage(e,ids.org,t,{fetcher:async()=>new Response('{"code":"NoSuchBucket"}',{status:404})}).read());
 await assert.rejects(retentionStorage(e,ids.org,t,{fetcher:async()=>new Response(new Uint8Array([1,2,3]))}).read(),err=>err.code==='changed_bytes');
 const exportId=crypto.randomUUID(),key='customer-exports/'+ids.org+'/'+exportId+'/'+hash+'.zip';let deleted;
 e.CUSTOMER_EXPORT_STORAGE_ID='fixture';e.CUSTOMER_EXPORTS_R2={get:async()=>({size:3,body:new Response(bytes).body}),delete:async k=>{deleted=k;}};
 const r2=retentionStorage(e,ids.org,{source_id:'export:'+exportId,backend:'r2',bucket:'workspace-customer-exports',key,sha256:hash,bytes:'3',storage_target:'r2:fixture'});await r2.read();await r2.remove();assert.equal(deleted,key);
});
test('strict inputs, immutable plan facts, and escaped operator inventory preserve boundaries',async()=>{
 assert.throws(()=>validateRetention('retention.plan',{source_id:'anything',expected_version:1,policy_version:'x',cutoff:'bad',sql:'delete'}));
 const esc=x=>String(x).replaceAll('<','&lt;').replaceAll('"','&quot;');const html=retentionViews({esc}).panel({items:[{id:crypto.randomUUID(),source_id:'<script>',state:'planned',version:1,inventory:{bucket:'private',key:'<img>',sha256:'a'.repeat(64),bytes:'3',version:'1'}}]},{org:ids.org});assert.doesNotMatch(html,/<script>|<img>/);assert.match(html,/role="alert"/);assert.match(html,/data-retention-action="retention.execute"/);
 const db=await database();try{const e=await env(),f=await file(db),p=await plan(db,e,f);await admin(db);await assert.rejects(db.query("update wm.retention_jobs set policy_version='different' where id=$1",[p.id]),/immutable/);assert.equal((await db.query("select count(*) n from wm.tenant_backup_registry where name like 'retention_%' and classification='tenant'")).rows[0].n,6);}finally{await db.close();}
});



test('tenant-routed inbound attachment purge preserves the message body and marks only exact attachment availability',async()=>{
 const db=await database();try{const e=await env(),email=crypto.randomUUID(),att=crypto.randomUUID(),route=crypto.randomUUID(),hash=await sha256(new Uint8Array([9,8,7]));
 await admin(db);await db.query('insert into wm.inbound_routes(id,organization_id,engagement_id,token_hash,created_by) values($1,$2,$3,$4,$5)',[route,ids.org,ids.engagement,'f'.repeat(64),ids.operator]);
 const attachments=[{id:att,state:'stored_unscanned',object_key:'inbound/'+email+'/'+att+'/'+hash,checksum:hash,bytes:3}];
 await db.query("insert into wm.inbound_emails(id,connection,environment,provider_id,route_id,attachments,body_text,first_seen_at,state) values($1,'fixture','staging',$1,$2,$3::jsonb,'Preserve correspondence',now()-interval '2 days','captured')",[email,route,JSON.stringify(attachments)]);
 const p=await plan(db,e,{source:'inbound:'+email+':'+att});assert.equal((await execute(db,e,p,store())).state,'purged');await admin(db);const row=(await db.query('select body_text,attachments from wm.inbound_emails where id=$1',[email])).rows[0];assert.equal(row.body_text,'Preserve correspondence');assert.equal(row.attachments[0].state,'purged');
 }finally{await db.close();}
});
test('sealed R2 customer export purge preserves immutable snapshot and disables only the exact archive',async()=>{
 const db=await database();try{const e=await env(),id=crypto.randomUUID(),hash=await sha256(new Uint8Array([9,8,7]));e.CUSTOMER_EXPORT_STORAGE_ID='fixture';e.CUSTOMER_EXPORTS_R2={};
 await admin(db);await db.query("insert into wm.customer_exports(organization_id,id,engagement_id,requested_by,membership_version,membership_role,recovery_generation,external_generation,organization_status,engagement_state,closure_digest,snapshot,snapshot_digest,state,storage_target,object_key,archive_digest,archive_bytes,sealed_at,captured_at) values($1,$2,$3,$4,1,'customer_admin',1,'fixture-generation-1','active','setup',$5,'{\"retained\":true}',$5,'sealed','r2:fixture',$6,$5,3,now()-interval '2 days',now()-interval '2 days')",[ids.org,id,ids.engagement,ids.client,hash,'customer-exports/'+ids.org+'/'+id+'/'+hash+'.zip']);
 const p=await plan(db,e,{source:'export:'+id});assert.equal((await execute(db,e,p,store())).state,'purged');await admin(db);const row=(await db.query('select state,snapshot from wm.customer_exports where id=$1',[id])).rows[0];assert.equal(row.state,'cancelled');assert.equal(row.snapshot.retained,true);
 }finally{await db.close();}
});
test('provider denial remains attention and a new legal hold after verified absence does not claim bytes are safe',async()=>{
 const db=await database();try{const e=await env(),f=await file(db),p=await plan(db,e,f),s=store();s.remove=async function(){this.deletes++;return 'denied';};assert.equal((await execute(db,e,p,s)).state,'attention');assert.equal(s.deletes,1);const j=await getJob(db,p.id);s.present=false;await human(db,e,'retention.reconcile',{id:j.id,expected_version:Number(j.version)},{store:s});const h=await hold(db,e,f);assert.equal(h.already_absent,true);assert.equal(h.held,true);}finally{await db.close();}
});
test('cancel before attempt is durable and leaves bytes intact; no deletion can use the old lease',async()=>{
 const db=await database();try{const e=await env(),f=await file(db),p=await plan(db,e,f),l=await lease(db,p);const cancelled=await human(db,e,'retention.cancel',{id:p.id,expected_version:Number(l.version)});assert.equal(cancelled.state,'cancelled');assert.equal(cancelled.uncertain_inflight,false);const s=store();await assert.rejects(processRetention(e,ids.org,p.id,l.lease,{...io(db),store:s}));assert.equal(s.deletes,0);assert.equal(s.present,true);}finally{await db.close();}
});



test('lost independent object/control acknowledgments reconcile exact receipts before one DELETE',async()=>{
 const db=await database();try{const e=await env(),f=await file(db),p=await plan(db,e,f),s=store();e.RECOVERY_BYTES.lost=true;e.RECOVERY_CONTROL.lost=true;e.RECOVERY_WITNESS.lost=true;assert.equal((await execute(db,e,p,s)).state,'purged');assert.equal(s.deletes,1);const v=await readRetentionOverlay(e,ids.org);assert.equal(v.events.length,3);assert.equal((await retentionCheckpointOverlay(e,ids.org,{expected:v.head})).complete,true);}finally{await db.close();}
});
test('concurrent independent head writers cannot reparent an orphan or erase another hold',async()=>{
 const e=await env(),make=()=>({organization_id:ids.org,id:crypto.randomUUID(),job_id:null,source_id:'workspace:'+crypto.randomUUID(),kind:'hold',payload:{version:1,held:true},generation:'fixture-generation-1',created_at:new Date().toISOString()}),a=make(),b=make();
 const results=await Promise.allSettled([publishRetentionEvent(e,a),publishRetentionEvent(e,b)]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
 const v=await readRetentionOverlay(e,ids.org);assert.equal(v.events.length,1);const loser=results[0].status==='rejected'?a:b;await assert.rejects(publishRetentionEvent(e,loser),err=>err.code==='retention_event_conflict');assert.equal((await readRetentionOverlay(e,ids.org)).events.length,1);
});


test('byte drift after intent registration is checked again before physical DELETE',async()=>{
 const db=await database();try{const e=await env(),f=await file(db),p=await plan(db,e,f),s=store();s.read=async function(){this.reads++;if(this.reads===2){const err=Error('changed bytes');err.code='changed_bytes';throw err;}return {bytes:3};};
 await assert.rejects(execute(db,e,p,s),err=>err.code==='changed_bytes');assert.equal(s.deletes,0);assert.ok((await getJob(db,p.id)).attempted_at);assert.equal((await getJob(db,p.id)).state,'unknown');
 }finally{await db.close();}
});

test('authorized retention fences downloads, export captures, legacy aliases and file release; unattempted cancellation releases it',async()=>{
 const db=await database();try{
  const e=await env(),f=await file(db);await admin(db);await db.query("update wm.attachments set visibility='shared' where id=$1",[f.id]);
  await actor(db,ids.client);assert.equal((await sql(db,'wm_file_access',{p_org:ids.org,p_id:f.id,p_action:'download'})).checksum,f.hash);
  const p=await plan(db,e,f),j=await lease(db,p);
  await actor(db,ids.client);await assert.rejects(sql(db,'wm_file_access',{p_org:ids.org,p_id:f.id,p_action:'download'}),/during or after retention/);
  await assert.rejects(sql(db,'wm_file_access_before_retention',{p_org:ids.org,p_id:f.id,p_action:'download'}),/permission denied/);
  await assert.rejects(sql(db,'wm_customer_export_command',{p_org:ids.org,p_command:'customer_export.request',p_input:{engagement_id:ids.engagement,expected_version:1,acknowledge_unscanned:true},p_key:crypto.randomUUID()}),/during or after retention/);
  await admin(db);await assert.rejects(db.query('select wm.backup_snapshot($1)',[ids.org]),/during or after retention/);
  await actor(db,ids.operator,{role:'service_role'});
  await assert.rejects(sql(db,'wm_file_release_unscanned',{p_org:ids.org,p_id:f.id,p_checksum:f.hash,p_sealed_key:f.path}),/during or after retention/);
  await assert.rejects(sql(db,'wm_file_scan_complete',{p_org:ids.org,p_id:f.id,p_checksum:f.hash,p_clean:true,p_policy:'fixture',p_evidence:{},p_sealed_key:f.path}),/during or after retention/);
  await human(db,e,'retention.cancel',{id:j.id,expected_version:Number(j.version)});
  await actor(db,ids.client);assert.equal((await sql(db,'wm_file_access',{p_org:ids.org,p_id:f.id,p_action:'download'})).checksum,f.hash);
 }finally{await db.close();}
});

test('attempted unknown deletion permanently fences the object even after cancellation, and missing guards never grant access',async()=>{
 const db=await database();try{
  const e=await env(),f=await file(db),p=await plan(db,e,f),s=store();s.remove=async()=>{throw Error('Synthetic unknown transport');};
  assert.equal((await execute(db,e,p,s)).state,'unknown');const j=await getJob(db,p.id);
  await human(db,e,'retention.cancel',{id:j.id,expected_version:Number(j.version)});
  await actor(db,ids.operator,{role:'service_role'});assert.equal(await sql(db,'wm_retention_object_fenced',{p_org:ids.org,p_bucket:'workspace-sealed',p_key:f.path}),true);
  await assert.rejects(sql(db,'wm_retention_object_fenced',{p_org:crypto.randomUUID(),p_bucket:'workspace-sealed',p_key:f.path}),/guard unavailable/);
  await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(sql(db,'wm_file_access',{p_org:ids.org,p_id:f.id,p_action:'download'}),/during or after retention/);
 }finally{await db.close();}
});

test('sealed Storage POST reservation is durable across retries and identity changes cannot authorize another write',async()=>{
 const db=await database();try{
  const f=await file(db);await admin(db);await db.query("update wm.attachments set sealed_object_key=null,scan_state='checking' where id=$1",[f.id]);
  await actor(db,ids.operator,{role:'service_role'});const a={p_org:ids.org,p_id:f.id,p_checksum:f.hash,p_key:f.path};
  assert.equal(await sql(db,'wm_file_seal_write_once',a),true);assert.equal(await sql(db,'wm_file_seal_write_once',a),false);
  await assert.rejects(sql(db,'wm_file_seal_write_once',{...a,p_key:f.path+'changed'}),/identity/);
  await actor(db,ids.client);await assert.rejects(sql(db,'wm_file_seal_write_once',a),/permission denied/);await assert.rejects(db.query('select * from wm.file_seal_writes'),/permission denied/);
 }finally{await db.close();}
});

test('retention witness receipts have a distinct verified namespace and backup tail never confuses them with critical receipts',async()=>{
 const db=await database();try{
  const e=await env(),f=await file(db);await hold(db,e,f);const chain=await checkWitness(e,ids.org,'fixture-generation-1');
  assert.equal(chain.events[0].kind,'retention');assert.equal(assessWitnessTail(chain,{receipts:{[chain.events[0].source_id]:chain.events[0].source_digest}}).issues[0].kind,'retention_missing');
  await admin(db);const s=(await db.query('select wm.backup_snapshot($1) s',[ids.org])).rows[0].s;
  assert.equal(assessWitnessTail(chain,s.tail).issues.length,0);const id=chain.events[0].source_id;s.tail.retention_receipts[id].key+='changed';assert.equal(assessWitnessTail(chain,s.tail).issues[0].kind,'retention_diverged');
 }finally{await db.close();}
});

test('inbound one-write reservation blocks replay and a retained purge cannot be recaptured by stale inbound work',async()=>{
 const db=await database();try{
  const e=await env(),mail=crypto.randomUUID(),att=crypto.randomUUID(),route=crypto.randomUUID(),hash='e'.repeat(64),key='inbound/'+mail+'/'+att+'/'+hash;
  await admin(db);await db.query('insert into wm.inbound_routes(id,organization_id,engagement_id,token_hash,created_by) values($1,$2,$3,$4,$5)',[route,ids.org,ids.engagement,'e'.repeat(64),ids.operator]);
  await db.query("insert into wm.inbound_emails(id,connection,environment,provider_id,route_id,state,lease_generation,lease_until,first_seen_at) values($1,'fixture','staging',$1,$2,'retrieving',1,now()+interval '1 hour',now()-interval '2 days')",[mail,route]);
  await actor(db,ids.operator,{role:'service_role'});const a={p_id:mail,p_generation:1,p_attachment:att,p_checksum:hash,p_key:key};
  assert.equal(await sql(db,'wm_inbound_attachment_write_once',a),true);assert.equal(await sql(db,'wm_inbound_attachment_write_once',a),false);
  const attachment={id:att,state:'stored_unscanned',object_key:key,checksum:hash,bytes:3};
  await admin(db);await db.query("update wm.inbound_emails set state='captured',routing='accepted',attachments=$2::jsonb where id=$1",[mail,JSON.stringify([attachment])]);
  const p=await plan(db,e,{source:'inbound:'+mail+':'+att});assert.equal((await execute(db,e,p,store())).state,'purged');
  await admin(db);await db.query("update wm.inbound_emails set state='retrieving',lease_generation=2,lease_until=now()+interval '1 hour' where id=$1",[mail]);
  await actor(db,ids.operator,{role:'service_role'});await assert.rejects(sql(db,'wm_inbound_attachment_write_once',{...a,p_generation:2}),/during or after retention/);
  await assert.rejects(sql(db,'wm_inbound_capture',{p_id:mail,p_generation:2,p_capture:{attachments:[attachment]}}),/during or after retention/);
  await admin(db);assert.equal((await db.query('select attachments from wm.inbound_emails where id=$1',[mail])).rows[0].attachments[0].state,'purged');
 }finally{await db.close();}
});

test('a new recovery generation permits only explicitly reauthorized read reconciliation and independently witnessed holds',async()=>{
 const db=await database();try{
  const e=await env(),f=await file(db),p=await plan(db,e,f),s=store();s.remove=async function(){this.deletes++;throw Error('Synthetic unknown DELETE');};
  assert.equal((await execute(db,e,p,s)).state,'unknown');const before=await getJob(db,p.id),generation='fixture-recovery-generation-2';
  await admin(db);await db.query("update wm.tenant_guards set access_state='restricted',positive_effects_allowed=false,external_generation=$2,recovery_generation=recovery_generation+1 where organization_id=$1",[ids.org,generation]);
  const controlKey='control/'+ids.org+'.json',old=await(await e.RECOVERY_CONTROL.get(controlKey)).json();await e.RECOVERY_CONTROL.put(controlKey,JSON.stringify({...old,access_state:'restricted',positive_effects_allowed:false,external_generation:generation}));
  await assert.rejects(io(db).machine(null,'wm_retention_context',{p_org:ids.org,p_id:p.id,p_lease:before.lease,p_dispatch:false}),/authority lease or generation changed/);
  assert.equal((await hold(db,e,f)).durability,'independently_witnessed');
  await assert.rejects(human(db,e,'retention.execute',{id:p.id,expected_version:Number(before.version)}),/action unavailable/);
  s.present=false;const result=await human(db,e,'retention.reconcile',{id:p.id,expected_version:Number((await getJob(db,p.id)).version)},{store:s});assert.equal(result.state,'purged');assert.equal(s.deletes,1);
  const after=await getJob(db,p.id);assert.equal(after.generation,'fixture-generation-1');assert.equal(after.observer_generation,generation);
  const events=await checkWitness(e,ids.org,generation);assert.deepEqual(events.events.map(x=>x.kind),['retention','retention']);
  await actor(db,ids.operator,{role:'service_role'});await assert.rejects(sql(db,'wm_retention_predelete',{p_org:ids.org,p_id:p.id,p_lease:after.lease}),/authority|changed|cannot/);
  await hold(db,e,f,false,1);await admin(db);assert.equal((await db.query('select legal_hold from wm.retention_actions where id=$1',[p.id])).rows[0].legal_hold,false);
 }finally{await db.close();}
});

test('orphan absence and wrong nonce or inventory cannot enter even a same-generation independent tail',async()=>{
 const db=await database();try{
  const e=await env(),f=await file(db),p=await plan(db,e,f),j=await getJob(db,p.id);
  const absence={organization_id:ids.org,id:crypto.randomUUID(),job_id:j.id,source_id:f.source,kind:'absent',payload:{inventory:j.inventory,attempt_nonce:j.attempt_nonce,absence_reads:2,response:'read_only'},generation:'fixture-generation-1',created_at:new Date().toISOString()};
  await assert.rejects(publishRetentionEvent(e,absence),err=>err.code==='retention_causal_binding');assert.equal((await readRetentionOverlay(e,ids.org)).head,null);
  const s=store();s.remove=async()=>{throw Error('Synthetic unknown DELETE');};await execute(db,e,p,s);const head=(await readRetentionOverlay(e,ids.org)).head;
  for(const payload of [{...absence.payload,attempt_nonce:crypto.randomUUID()},{...absence.payload,inventory:{...j.inventory,sha256:'0'.repeat(64)}}])await assert.rejects(publishRetentionEvent(e,{...absence,id:crypto.randomUUID(),payload}),err=>err.code==='retention_causal_binding');
  assert.deepEqual((await readRetentionOverlay(e,ids.org)).head,head);assert.equal((await readRetentionOverlay(e,ids.org)).purged.length,0);
 }finally{await db.close();}
});

test('retention capacity rejects before moving the readable head and reserves outstanding completion slots',async()=>{
 const e=await env(),source='workspace:'+crypto.randomUUID(),epoch='fixture-retention-1';let previous=null;
 for(let i=1;i<=256;i++){
  const event={id:crypto.randomUUID(),organization_id:ids.org,job_id:null,source_id:source,kind:i%2?'hold':'release',payload:{version:i,held:Boolean(i%2)},generation:'fixture-generation-1',created_at:new Date().toISOString()},claim=null,digest=await sha256(encode({event,previous,epoch,claim})),receipt={id:event.id,organization_id:ids.org,external_generation:event.generation,sequence:String(i),digest};
  previous=await putEncrypted(e.RECOVERY_BYTES,'retention/'+ids.org+'/'+epoch+'/'+event.id+'.bin',encode({receipt,event,previous,epoch,claim}),{type:'retention_event',...receipt},JSON.parse(e.BACKUP_KEYS),'fixture');
  if(i===254){await e.RECOVERY_CONTROL.put('control/'+ids.org+'.json',JSON.stringify({schema_version:1,organization_id:ids.org,external_generation:'fixture-generation-1',access_state:'open',retention_epoch:epoch,retention_head:previous}));const count=e.RECOVERY_BYTES.data.size;
   const intent={...event,id:crypto.randomUUID(),job_id:crypto.randomUUID(),kind:'delete_intent',payload:{attempt_nonce:crypto.randomUUID(),inventory:{source_id:source}}};await assert.rejects(publishRetentionEvent(e,intent),x=>x.code==='retention_tail_limit');assert.equal(e.RECOVERY_BYTES.data.size,count);
  }
 }
 await e.RECOVERY_CONTROL.put('control/'+ids.org+'.json',JSON.stringify({schema_version:1,organization_id:ids.org,external_generation:'fixture-generation-1',access_state:'open',retention_epoch:epoch,retention_head:previous}));
 assert.equal((await readRetentionOverlay(e,ids.org)).events.length,256);const count=e.RECOVERY_BYTES.data.size;
 await assert.rejects(publishRetentionEvent(e,{id:crypto.randomUUID(),organization_id:ids.org,job_id:null,source_id:source,kind:'hold',payload:{version:257,held:true},generation:'fixture-generation-1',created_at:new Date().toISOString()}),x=>x.code==='retention_tail_limit');
 assert.equal(e.RECOVERY_BYTES.data.size,count);assert.deepEqual((await readRetentionOverlay(e,ids.org)).head,previous);
});

test('PostgreSQL file download waits behind retention authorization and sees the committed fence',{skip:!process.env.WORKSPACE_TEST_DATABASE_URL},async()=>{
 const db=await database();let other;try{
  const e=await env(),f=await file(db),p=await plan(db,e,f);other=await db.connect();
  await actor(db,ids.operator,{aal:'aal2'});await db.exec('begin');
  await sql(db,'wm_retention_command',{p_org:ids.org,p_command:'retention.execute',p_input:{id:p.id,expected_version:Number(p.version)},p_key:crypto.randomUUID()});
  await actor(other,ids.operator,{aal:'aal2'});const waiter=(await other.query('select pg_backend_pid() id')).rows[0].id;
  const pending=sql(other,'wm_file_access',{p_org:ids.org,p_id:f.id,p_action:'download'}).then(value=>({value}),error=>({error}));
  await admin(db);let blocked=false;
  for(let n=0;n<100;n++){blocked=(await db.query('select cardinality(pg_blocking_pids($1))>0 blocked',[waiter])).rows[0].blocked;if(blocked)break;await new Promise(resolve=>setTimeout(resolve,15));}
  assert.equal(blocked,true);await db.exec('commit');const result=await pending;assert.match(result.error?.message||'',/during or after retention/);
 }finally{try{await db.exec('rollback');}catch{}if(other)await other.close();await db.close();}
});
