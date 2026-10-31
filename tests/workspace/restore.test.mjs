import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,ids,command} from './database.mjs';
import {canonical} from '../../src/workspace/domain/contracts.mjs';
import {byteDigest} from '../../worker/workspace/continuity/envelope.mjs';
import {putEncrypted,encode,CHUNK_BYTES} from '../../worker/workspace/backups/objects.mjs';
import {appendWitness} from '../../worker/workspace/backups/witness.mjs';
import {restoreCommand,rehearseRestore,completePromotion,restoreView,validateRestore} from '../../worker/workspace/restore/service.mjs';
import {latestProof,freezeControl} from '../../worker/workspace/restore/control.mjs';
import {verifyCandidate} from '../../worker/workspace/restore/verify.mjs';
import {restoreViews} from '../../src/workspace/restore-ui.mjs';
const synthetic=btoa(String.fromCharCode(...new Uint8Array(32).fill(19))),oldGeneration='fixture-generation-1';
test('human recovery permission is checked before any privileged context or independent storage read',async()=>{
 let privileged=0;const human=async()=>{throw Error('Synthetic recovery access denied');},machine=async()=>{privileged++;throw Error('Must not inspect private recovery evidence');},opts={human,machine},session={access_token:'synthetic'},id=crypto.randomUUID();
 await assert.rejects(restoreCommand({},session,ids.org,'restore.promote',{id,plan_hash:'a'.repeat(64),expected_version:1},crypto.randomUUID(),opts),/recovery access denied/);
 await assert.rejects(restoreView({},session,ids.org,id,opts),/recovery access denied/);assert.equal(privileged,0);
});
test('restoring a revoked staff grant cannot resume an old recovery request',async()=>{
 const db=await database();try{
  await admin(db);await db.query("insert into wm.staff(user_id,capabilities,active_until) values($1,array['recovery'],now()+interval '1 year')",[ids.operator]);
  const f=await make(db),j=await request(db,f);await context(db,j.id);
  await admin(db);await db.query('update wm.staff set revoked_at=now() where user_id=$1',[ids.operator]);await db.query('update wm.staff set revoked_at=null where user_id=$1',[ids.operator]);
  await assert.rejects(context(db,j.id),/current authority or generation changed/);
 }finally{await db.close();}
});
class Bucket{
 data=new Map();n=0;lost=false;writes=0;
 async get(key){const v=this.data.get(key);return v?{size:v.bytes.length,etag:v.etag,body:new Response(v.bytes).body}:null;}
 async put(key,body,{onlyIf}={}){this.writes++;const prev=this.data.get(key);if(onlyIf instanceof Headers&&prev)return null;if(onlyIf?.etagMatches&&prev?.etag!==onlyIf.etagMatches)return null;const bytes=typeof body==='string'?new TextEncoder().encode(body):new Uint8Array(body);this.data.set(key,{bytes:bytes.slice(),etag:'e'+(++this.n)});if(this.lost){this.lost=false;throw Error('accepted timeout');}return {etag:'e'+this.n};}
}
const env=()=>({RECOVERY_BYTES:new Bucket(),RECOVERY_WITNESS:new Bucket(),RECOVERY_CONTROL:new Bucket(),BACKUP_KEYS:JSON.stringify({fixture:synthetic}),BACKUP_KEY_ID:'fixture'});
const sql=async(db,name,args)=>(await db.query('select public.'+name+'('+Object.keys(args).map((_,i)=>'$'+(i+1)).join(',')+') r',Object.values(args).map(x=>x&&typeof x==='object'?JSON.stringify(x):x))).rows[0].r;
const adapters=db=>({
 human:async(_e,_t,n,a)=>{await actor(db,ids.operator,{aal:'aal2'});return sql(db,n,a);},
 machine:async(_e,n,a)=>{await actor(db,ids.operator,{role:'service_role'});return sql(db,n,a);}
});
async function make(db,{mutate,files=[]}={}){
 const e=env();await admin(db);
 for(const f of files){const id=f.id.slice(10),key=ids.org+'/'+id+'/'+f.hash;
 await db.query("insert into wm.attachments(organization_id,id,engagement_id,uploader_id,visibility,upload_object_key,sealed_object_key,original_name,declared_media_type,declared_bytes,actual_media_type,actual_bytes,checksum,scan_state,scan_policy_version,expires_at) values($1,$2,$3,$4,'internal',$5,$6,'synthetic.bin','application/octet-stream',$7,'application/octet-stream',$7,$8,'ready','fixture',now()+interval '1 day')",[ids.org,id,ids.engagement,ids.operator,key+'.upload',key,f.bytes.length,f.hash]);}
 let cap=(await db.query('select wm.backup_snapshot($1) r',[ids.org])).rows[0].r;
 if(mutate)cap=await mutate(cap);
 const snapshot=new TextEncoder().encode(cap.snapshot),digest=await byteDigest(snapshot),backupId=crypto.randomUUID(),parts=[];
 const sources=[snapshot,...files.map(f=>f.bytes)];
 const descriptors=cap.files;
 for(let n=0;n<sources.length;n++){const data=sources[n],source=n===0?'snapshot':n-1,whole=await byteDigest(data);
 for(let offset=0;offset<data.length;offset+=CHUNK_BYTES){const length=Math.min(CHUNK_BYTES,data.length-offset),part=source==='snapshot'?'snapshot/'+offset:'file/'+source+'/'+offset,context={type:'tenant_backup_chunk',organization_id:ids.org,external_generation:oldGeneration,backup_id:backupId,source,offset,bytes:length,whole_digest:whole};
 parts.push({part,source,offset,length,whole,pointer:await putEncrypted(e.RECOVERY_BYTES,'fixture/'+backupId+'/'+part,data.slice(offset,offset+length),context,{fixture:synthetic},'fixture')});}}
 const manifest={format:'wm-tenant-backup/1',restore_authority:'none',organization_id:ids.org,backup_id:backupId,external_generation:oldGeneration,snapshot_bytes:snapshot.length,snapshot_digest:digest,coverage:cap.coverage,files:descriptors,parts};
 const pointer=await putEncrypted(e.RECOVERY_BYTES,'fixture/'+backupId+'/manifest',encode(manifest),{type:'tenant_backup_manifest',organization_id:ids.org,external_generation:oldGeneration,backup_id:backupId},{fixture:synthetic},'fixture',{max:2097152});
 const head=await appendWitness(e,ids.org,oldGeneration,{id:crypto.randomUUID(),kind:'backup_seal',source_id:backupId,source_digest:pointer.plaintext_digest,snapshot_digest:digest,manifest_key:pointer.key,source_pointer:pointer},{expected:null,control:async()=>({access_state:'open',external_generation:oldGeneration})});
 const checkpoint={format:'wm-recovery-checkpoint/1',organization_id:ids.org,control_generation:oldGeneration,source_generation:oldGeneration,complete:true,observed_at:new Date().toISOString(),valid_until:new Date(Date.now()+840000).toISOString(),head,tombstones:[],holds:[],revoked_users:[],withdrawn_approvals:[],authority_mode:'all_historical_authority_inactive',provider_reconciliation:'required'};
 async function installProof(changes={}){Object.assign(checkpoint,changes);const p=await putEncrypted(e.RECOVERY_BYTES,'checkpoint/'+crypto.randomUUID(),encode(checkpoint),{type:'tenant_recovery_checkpoint',organization_id:ids.org},{fixture:synthetic},'fixture',{max:1048576});await e.RECOVERY_CONTROL.put('control/'+ids.org+'.json',JSON.stringify({schema_version:1,organization_id:ids.org,external_generation:oldGeneration,access_state:'open',positive_effects_allowed:true,recovery_checkpoint:p}));}
 await installProof();return {e,pointer,manifest,checkpoint,installProof,cap};
}
async function request(db,f){return restoreCommand(f.e,{access_token:'synthetic'},ids.org,'restore.request',{manifest_pointer:f.pointer,expected_generation:oldGeneration},crypto.randomUUID(),adapters(db));}
async function context(db,id){return adapters(db).machine(null,'wm_restore_context',{p_org:ids.org,p_id:id});}
async function stage(db,f){const j=await request(db,f);const result=await rehearseRestore(f.e,ids.org,j.id,adapters(db));return {j,result};}
async function authorize(db,j){await actor(db,ids.operator,{aal:'aal2'});return sql(db,'wm_restore_promote',{p_org:ids.org,p_id:j.id,p_hash:j.plan_hash,p_version:Number(j.version),p_proof_digest:j.proof_digest});}

test('current MFA/direct recovery authority required; raw recovery tables and machine promotion deny customer access',async()=>{
 const db=await database();try{const f=await make(db),input={manifest_pointer:f.pointer,expected_generation:oldGeneration};
 await actor(db,ids.client);await assert.rejects(sql(db,'wm_restore_request',{p_org:ids.org,p_input:input,p_key:crypto.randomUUID()}),/recovery operator/);
 await actor(db,ids.operator,{aal:'aal2',age:1800});await assert.rejects(sql(db,'wm_restore_request',{p_org:ids.org,p_input:input,p_key:crypto.randomUUID()}),/Confirm/);
 await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(db.query('select * from wm_restore.runs'),/permission denied/);
 await assert.rejects(sql(db,'wm_restore_commit',{p_org:ids.org,p_id:crypto.randomUUID(),p_hash:'a'.repeat(64),p_proof_digest:'b'.repeat(64)}),/permission denied/);
 }finally{await db.close();}
});

test('restricted recovery has a separate current-operator entry point without exposing ordinary customer records',async()=>{
 const db=await database();try{
  await actor(db,ids.client,{age:1800});assert.equal((await sql(db,'wm_businesses',{})).length,1);assert.deepEqual(await sql(db,'wm_recovery_businesses',{}),[]);
  await actor(db,ids.operator,{aal:'aal2'});assert.equal((await sql(db,'wm_recovery_businesses',{})).length,1);
  const f=await make(db),j=await request(db,f);await actor(db,ids.operator,{aal:'aal2'});
  assert.deepEqual(await sql(db,'wm_businesses',{}),[]);const access=await sql(db,'wm_recovery_workspace',{p_org:ids.org});
  assert.equal(access.recovery_only,true);assert.equal(access.access_state,'restricted');assert.deepEqual(access.viewer.capabilities,['recovery']);assert.equal(access.restore.items[0].id,j.id);assert.deepEqual(access.backups,[]);assert.equal(access.requests,undefined);assert.equal(access.payments,undefined);
  await assert.rejects(sql(db,'wm_workspace',{p_org:ids.org}),/unavailable/);
  await actor(db,ids.client,{aal:'aal2'});assert.deepEqual(await sql(db,'wm_recovery_businesses',{}),[]);await assert.rejects(sql(db,'wm_recovery_workspace',{p_org:ids.org}),/recovery operator/);
  await actor(db,ids.operator,{aal:'aal2',age:1800});await assert.rejects(sql(db,'wm_recovery_businesses',{}),/Confirm/);
  await actor(db,ids.outsider,{aal:'aal2'});await assert.rejects(sql(db,'wm_recovery_workspace',{p_org:ids.org}),/recovery operator/);
 }finally{await db.close();}
});

test('partial unique constraints remain active during typed recovery import',async()=>{
 const db=await database();try{
  const f=await make(db,{mutate:cap=>{const s=JSON.parse(cap.snapshot),row=JSON.parse(s.tables.engagement_authorities[0]);row.id=crypto.randomUUID();s.tables.engagement_authorities.push(JSON.stringify(row));cap.snapshot=JSON.stringify(s);cap.coverage.find(x=>x.table==='engagement_authorities').rows++;return cap;}});
  const {result}=await stage(db,f);assert.equal(result.state,'attention');assert.match(result.reason,/duplicate key|unique constraint/);
  await admin(db);assert.equal((await db.query('select count(*)::integer n from wm_restore.engagement_authorities')).rows[0].n,0);
 }finally{await db.close();}
});
test('valid typed isolated rehearsal and exact promotion preserve live globals, suppress jobs, and expose only a restricted generation',async()=>{
 const db=await database();try{
 await actor(db,ids.client);await command(db,'message_send',{engagement_id:ids.engagement,body:'Retained customer message',visibility:'shared'});
 await admin(db);const jobsBefore=(await db.query('select count(*) n from wm.outbox_jobs')).rows[0].n;
 const liveBefore=(await db.query('select wm.hash_json(jsonb_agg(to_jsonb(x))) h from wm.memberships x')).rows[0].h;
 const f=await make(db),{j,result}=await stage(db,f);assert.equal(result.state,'ready',result.reason);
 await admin(db);assert.equal((await db.query('select count(*) n from wm_restore.messages where recovery_run=$1',[j.id])).rows[0].n,1);
 assert.equal((await db.query("select count(*) n from wm_restore.memberships where recovery_run=$1 and status<>'revoked'",[j.id])).rows[0].n,0);
 assert.equal((await db.query('select wm.hash_json(jsonb_agg(to_jsonb(x))) h from wm.memberships x')).rows[0].h,liveBefore);
 const ctx=await context(db,j.id);await authorize(db,ctx);const done=await completePromotion(f.e,ctx,adapters(db));assert.equal(done.state,'promoted_read_only');
 const view=await restoreView(f.e,{access_token:'synthetic'},ids.org,j.id,adapters(db));assert.equal(view.messages[0].body,'Retained customer message');assert.equal(view.mode,'restricted_read_only');
 await admin(db);assert.equal((await db.query('select count(*) n from wm.outbox_jobs')).rows[0].n,jobsBefore);
 const guard=(await db.query('select * from wm.tenant_guards where organization_id=$1',[ids.org])).rows[0];assert.equal(guard.access_state,'restricted');assert.equal(guard.positive_effects_allowed,false);assert.equal(Number(guard.recovery_generation),2);
 await assert.rejects(db.query("update wm_restore.messages set body='changed' where recovery_run=$1",[j.id]),/immutable/);
 await actor(db,ids.client);await assert.rejects(sql(db,'wm_restore_view',{p_org:ids.org,p_id:j.id}),/permission denied/);
 }finally{await db.close();}
});
test('cross-tenant rows roll back the complete isolated import and leave explicit attention',async()=>{
 const db=await database();try{const f=await make(db,{mutate:c=>{const s=JSON.parse(c.snapshot),m=JSON.parse(s.tables.memberships[0]);m.organization_id=ids.other;s.tables.memberships[0]=JSON.stringify(m);c.snapshot=JSON.stringify(s);return c;}});
 const {j,result}=await stage(db,f);assert.equal(result.state,'attention');assert.match(result.reason,/cross tenant/);
 await admin(db);assert.equal((await db.query('select count(*) n from wm_restore.organizations where recovery_run=$1',[j.id])).rows[0].n,0);
 }finally{await db.close();}
});
test('changed schema and omitted coverage fail closed without disabling constraints',async()=>{
 const db=await database();try{const f=await make(db);await admin(db);await db.exec('alter table wm.messages add column unreviewed text');const {result}=await stage(db,f);assert.equal(result.state,'attention');assert.match(result.reason,/schema/);}finally{await db.close();}
});
test('real composite foreign keys reject a request pointing outside its tenant engagement',async()=>{
 const db=await database();try{
 await actor(db,ids.client);await command(db,'request_create',{engagement_id:ids.engagement,outcome:'Recovered work'});
 const f=await make(db,{mutate:c=>{const s=JSON.parse(c.snapshot),r=JSON.parse(s.tables.requests[0]);r.engagement_id=ids.otherEngagement;s.tables.requests[0]=JSON.stringify(r);c.snapshot=JSON.stringify(s);return c;}});
 const {result}=await stage(db,f);assert.equal(result.state,'attention');assert.match(result.reason,/foreign key/);
 }finally{await db.close();}
});
test('corrupted authenticated backup bytes never reach SQL rehearsal',async()=>{
 const db=await database();try{const f=await make(db);const obj=f.e.RECOVERY_BYTES.data.get(f.manifest.parts[0].pointer.key);obj.bytes[obj.bytes.length-1]^=1;const j=await request(db,f);await assert.rejects(rehearseRestore(f.e,ids.org,j.id,adapters(db)));assert.equal((await context(db,j.id)).state,'requested');}finally{await db.close();}
});
test('newer independent file tombstones skip missing bytes; revoked historical grants stay inactive',async()=>{
 const db=await database();try{const bytes=new Uint8Array([4,5,6]),file={id:'workspace:'+crypto.randomUUID(),bytes,hash:await byteDigest(bytes)},f=await make(db,{files:[file]});
 await f.installProof({tombstones:[file.id],revoked_users:[ids.client]});f.e.RECOVERY_BYTES.data.delete(f.manifest.parts.find(p=>p.source===0).pointer.key);
 const {j,result}=await stage(db,f);assert.equal(result.state,'ready',result.reason);
 await admin(db);assert.equal((await db.query('select disposition from wm_restore.file_proofs where run_id=$1',[j.id])).rows[0].disposition,'purged');
 assert.equal([...f.e.RECOVERY_BYTES.data.keys()].some(k=>k.startsWith('tenant-restores/')&&k.includes('/file/')),false);
 }finally{await db.close();}
});
test('verified private bytes are copied to immutable recovery keys, and interrupted rehearsal reuses them',async()=>{
 const db=await database();try{const bytes=new Uint8Array(300000).fill(7),file={id:'workspace:'+crypto.randomUUID(),bytes,hash:await byteDigest(bytes)},f=await make(db,{files:[file]});const j=await request(db,f),ctx=await context(db,j.id),proof=await latestProof(f.e,ctx);
 f.e.RECOVERY_BYTES.lost=true;const a=await verifyCandidate(f.e,ctx,proof);const writes=f.e.RECOVERY_BYTES.writes;const b=await verifyCandidate(f.e,ctx,proof);assert.deepEqual(a.files,b.files);assert.equal(f.e.RECOVERY_BYTES.writes,writes);assert.equal(a.files[0].pointers.length,2);
 }finally{await db.close();}
});
test('stale plan hash/version/live baseline prevents promotion; newer live revocation is retained',async()=>{
 const db=await database();try{const f=await make(db),{j,result}=await stage(db,f);assert.equal(result.state,'ready',result.reason);const ctx=await context(db,j.id);
 await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(sql(db,'wm_restore_promote',{p_org:ids.org,p_id:j.id,p_hash:'a'.repeat(64),p_version:Number(ctx.version),p_proof_digest:ctx.proof_digest}),/exact plan/);
 await assert.rejects(authorize(db,{...ctx,version:Number(ctx.version)+1}),/stale/);
 await admin(db);await db.query("update wm.memberships set status='revoked',revoked_at=now() where organization_id=$1 and user_id=$2",[ids.org,ids.client]);
 await assert.rejects(authorize(db,ctx),/stale/);
 }finally{await db.close();}
});
test('authorization intent alone cannot switch datasets, and actor revocation fences machine commit',async()=>{
 const db=await database();try{const f=await make(db),{j,result}=await stage(db,f);assert.equal(result.state,'ready',result.reason);const ctx=await context(db,j.id);assert.equal((await authorize(db,ctx)).state,'promotion_authorized');
 await admin(db);assert.equal((await db.query('select count(*) n from wm_restore.active')).rows[0].n,0);
 await db.query('update wm.operator_assignments set revoked_at=now() where organization_id=$1 and user_id=$2',[ids.org,ids.operator]);
 await assert.rejects(completePromotion(f.e,ctx,adapters(db)),/authority|generation/);
 }finally{await db.close();}
});
test('lost promotion acknowledgment remains frozen and reconciles exact immutable receipt without duplicate effects',async()=>{
 const db=await database();try{const f=await make(db),{j,result}=await stage(db,f);assert.equal(result.state,'ready',result.reason);const ctx=await context(db,j.id);await authorize(db,ctx);const base=adapters(db);let lost=true;
 const machine=async(e,n,a)=>{const value=await base.machine(e,n,a);if(n==='wm_restore_commit'&&lost){lost=false;throw Error('SQL accepted; acknowledgment lost');}return value;};
 await assert.rejects(completePromotion(f.e,ctx,{machine}),/acknowledgment lost/);assert.equal((await context(db,j.id)).state,'promoted_pending_receipt');
 f.e.RECOVERY_BYTES.lost=true;f.e.RECOVERY_CONTROL.lost=true;assert.equal((await completePromotion(f.e,ctx,base)).state,'promoted_read_only');
 const writes=f.e.RECOVERY_BYTES.writes;assert.equal((await completePromotion(f.e,ctx,base)).state,'promoted_read_only');assert.equal(f.e.RECOVERY_BYTES.writes,writes);
 }finally{await db.close();}
});
test('missing/stale checkpoint or changed independent generation blocks rehearsal and promotion',async()=>{
 const db=await database();try{const f=await make(db);await f.installProof({valid_until:new Date(Date.now()-1).toISOString()});const j=await request(db,f);await assert.rejects(latestProof(f.e,await context(db,j.id)),e=>e.code==='restore_checkpoint_stale');
 const object=f.e.RECOVERY_CONTROL.data.get('control/'+ids.org+'.json'),c=JSON.parse(new TextDecoder().decode(object.bytes));c.external_generation='another-generation';await f.e.RECOVERY_CONTROL.put('control/'+ids.org+'.json',JSON.stringify(c));
 await assert.rejects(freezeControl(f.e,await context(db,j.id)),e=>e.code==='restore_control_changed');
 }finally{await db.close();}
});
test('strict adapter/UI binds the visible exact plan and escapes hostile descriptions',()=>{
 assert.throws(()=>validateRestore('restore.promote',{id:crypto.randomUUID(),plan_hash:'a'.repeat(64),expected_version:1,sql:'delete'}));
 const esc=s=>String(s).replaceAll('<','&lt;').replaceAll('"','&quot;');
 const html=restoreViews({esc}).panel({items:[{id:crypto.randomUUID(),state:'ready',version:2,plan_hash:'b'.repeat(64),plan:{coverage:[{family:'<script>',rows:1,action:'isolated'}]}}]},{org:ids.org});
 assert.match(html,/&lt;script>/);assert.doesNotMatch(html,/<script>/);assert.match(html,/data-restore-action="restore.promote"/);assert.match(html,/name="plan_hash"/);assert.match(html,/role="alert"/);
});



test('exact classification and redaction registry drift blocks restore despite unchanged schema_profile label',async()=>{
 const db=await database();try{const f=await make(db);await admin(db);await db.query("update wm.tenant_backup_registry set reason='changed reviewed policy' where name='messages'");const {result}=await stage(db,f);assert.equal(result.state,'attention');assert.match(result.reason,/registry classification changed/);}finally{await db.close();}
});
test('new unclassified family and omitted coverage cannot be certified by a profile label',async()=>{
 const db=await database();try{const f=await make(db);await admin(db);await db.exec('create table wm.future_ads_family(organization_id uuid)');const {result}=await stage(db,f);assert.equal(result.state,'attention');assert.match(result.reason,/Unsupported restore schema family/);}finally{await db.close();}
 const other=await database();try{const f=await make(other,{mutate:c=>({...c,coverage:c.coverage.slice(1)})}),{result}=await stage(other,f);assert.equal(result.state,'attention');assert.match(result.reason,/coverage incomplete/);}finally{await other.close();}
});
test('a newer witnessed event invalidates the checkpoint instead of accepting a valid old prefix',async()=>{
 const db=await database();try{const f=await make(db),j=await request(db,f),ctx=await context(db,j.id);await appendWitness(f.e,ids.org,oldGeneration,{id:crypto.randomUUID(),kind:'backup_seal',source_id:f.manifest.backup_id,source_digest:f.pointer.plaintext_digest,snapshot_digest:f.manifest.snapshot_digest,manifest_key:f.pointer.key,source_pointer:f.pointer},{expected:f.checkpoint.head,control:async()=>({access_state:'open',external_generation:oldGeneration})});await assert.rejects(latestProof(f.e,ctx),e=>e.code==='restore_latest_tail_changed');}finally{await db.close();}
});
test('conflicting legal hold/purge and unsupported deletion families fail closed',async()=>{
 const db=await database();try{const f=await make(db);await f.installProof({tombstones:['workspace:'+ids.engagement],holds:['workspace:'+ids.engagement]});const j=await request(db,f);await assert.rejects(latestProof(f.e,await context(db,j.id)),e=>e.code==='restore_retention_conflict');}finally{await db.close();}
 const other=await database();try{const f=await make(other);await f.installProof({tombstones:['unsupported:'+ids.engagement]});const {result}=await stage(other,f);assert.equal(result.state,'attention');assert.match(result.reason,/Unsupported retention overlay/);}finally{await other.close();}
});
test('null expected version and post-rehearsal local generation change cannot promote',async()=>{
 const db=await database();try{const f=await make(db),{j,result}=await stage(db,f);assert.equal(result.state,'ready',result.reason);const ctx=await context(db,j.id);await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(sql(db,'wm_restore_promote',{p_org:ids.org,p_id:j.id,p_hash:ctx.plan_hash,p_version:null,p_proof_digest:ctx.proof_digest}),/exact plan/);await admin(db);await db.query('update wm.tenant_guards set recovery_generation=recovery_generation+1 where organization_id=$1',[ids.org]);await assert.rejects(authorize(db,ctx),/generation/);}finally{await db.close();}
});


test('private file loss after rehearsal blocks promotion and exact typed preview exposes only the requested run',async()=>{
 const db=await database();try{const bytes=new Uint8Array([7,8,9]),file={id:'workspace:'+crypto.randomUUID(),bytes,hash:await byteDigest(bytes)},f=await make(db,{files:[file]}),{j,result}=await stage(db,f);assert.equal(result.state,'ready',result.reason);
 const ctx=await context(db,j.id);const preview=await adapters(db).machine(null,'wm_restore_records',{p_org:ids.org,p_id:j.id,p_family:'attachments',p_offset:0});assert.equal(Number(preview.total),1);assert.equal(JSON.parse(preview.rows[0]).id,file.id.slice(10));assert.equal(preview.plan_hash,ctx.plan_hash);
 await assert.rejects(adapters(db).machine(null,'wm_restore_records',{p_org:ids.other,p_id:j.id,p_family:'attachments',p_offset:0}),/unavailable/);
 await authorize(db,ctx);f.e.RECOVERY_BYTES.data.delete(ctx.plan.files[0].pointers[0].key);await assert.rejects(completePromotion(f.e,ctx,adapters(db)));
 await admin(db);assert.equal((await db.query('select count(*) n from wm_restore.active')).rows[0].n,0);
 }finally{await db.close();}
});
test('request replay binds exact input and abandonment never reopens access or enables effects',async()=>{
 const db=await database();try{const f=await make(db),key=crypto.randomUUID(),input={manifest_pointer:f.pointer,expected_generation:oldGeneration},opts=adapters(db);
 const first=await restoreCommand(f.e,{access_token:'synthetic'},ids.org,'restore.request',input,key,opts);
 assert.equal((await restoreCommand(f.e,{access_token:'synthetic'},ids.org,'restore.request',input,key,opts)).id,first.id);
 await assert.rejects(restoreCommand(f.e,{access_token:'synthetic'},ids.org,'restore.request',{...input,expected_generation:'other-generation'},key,opts),/key conflict/);
 const ctx=await context(db,first.id);assert.equal((await restoreCommand(f.e,{access_token:'synthetic'},ids.org,'restore.abandon',{id:first.id,expected_version:Number(ctx.version)},crypto.randomUUID(),opts)).state,'attention');
 assert.equal((await rehearseRestore(f.e,ids.org,first.id,opts)).state,'attention');
 assert.equal((await context(db,first.id)).state,'attention');
 await admin(db);const g=(await db.query('select access_state,positive_effects_allowed from wm.tenant_guards where organization_id=$1',[ids.org])).rows[0];assert.equal(g.access_state,'restricted');assert.equal(g.positive_effects_allowed,false);
 }finally{await db.close();}
});
