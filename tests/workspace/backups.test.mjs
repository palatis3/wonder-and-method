import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,ids,command} from './database.mjs';
import {byteDigest,openBytes} from '../../worker/workspace/continuity/envelope.mjs';
import {backupStep,sourceRange,validateBackupCommand,processTenantBackups} from '../../worker/workspace/backups/service.mjs';
import {appendWitness,checkWitness,assessWitnessTail} from '../../worker/workspace/backups/witness.mjs';
import {putEncrypted,getEncrypted,readEvidencePointer,encode,CHUNK_BYTES} from '../../worker/workspace/backups/objects.mjs';
import {verifyOfflineBackup} from '../../worker/workspace/backups/offline.mjs';
import {backupViews} from '../../src/workspace/backup-ui.mjs';
const q={bytes_identity:'synthetic-bytes-account/bucket',witness_identity:'synthetic-separate-account/bucket',custody_reference:'synthetic-offline-custodian',witness_hooks_version:'tenant-witness-v1'};
const syntheticKey=btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
class Bucket{
 objects=new Map();serial=0;puts=0;lost=false;lostHead=false;
 async get(key,{range}={}){const x=this.objects.get(key);if(!x)return null;const bytes=range?x.bytes.slice(range.offset,range.offset+range.length):x.bytes;return {size:x.bytes.length,etag:x.etag,body:new Response(bytes).body,arrayBuffer:async()=>bytes.slice().buffer,json:async()=>JSON.parse(new TextDecoder().decode(bytes))};}
 async put(key,body,options={}){this.puts++;const old=this.objects.get(key),condition=options.onlyIf;if(condition instanceof Headers&&condition.get('If-None-Match')==='*'&&old)return null;if(condition?.etagMatches&&old?.etag!==condition.etagMatches)return null;const bytes=typeof body==='string'?new TextEncoder().encode(body):new Uint8Array(body);this.objects.set(key,{bytes:bytes.slice(),etag:'v'+(++this.serial)});if(this.lost||(this.lostHead&&key.endsWith('/head.bin'))){this.lost=false;this.lostHead=false;throw Error('accepted then disconnected');}return {etag:'v'+this.serial};}
}
const environment=()=>({BACKUP_ENABLED:'true',RECOVERY_WITNESS_ENABLED:'true',BACKUP_KEYS:JSON.stringify({synthetic:syntheticKey}),BACKUP_KEY_ID:'synthetic',BACKUP_QUALIFICATION:JSON.stringify(q),RECOVERY_BYTES:new Bucket(),RECOVERY_WITNESS:new Bucket()});
const control=async(_env,org)=>({access_state:'open',external_generation:org===ids.org?'fixture-generation-1':'fixture-generation-2'});
const sql=async(db,name,args={})=>(await db.query(`select public.${name}(${Object.keys(args).map((_,i)=>'$'+(i+1)).join(',')}) r`,Object.values(args).map(v=>v&&typeof v==='object'?JSON.stringify(v):v))).rows[0].r;
const request=async(db,key=crypto.randomUUID())=>sql(db,'wm_backup_command',{org:ids.org,command:'backup.request',input:{qualification:q,key_id:'synthetic'},key});
const machine=async(db,name,args)=>{await actor(db,ids.operator,{role:'service_role'});return sql(db,name,args);};
const claim=async db=>(await machine(db,'wm_backup_claim',{limit:2}))[0];
const args=j=>({p_org:j.organization_id,p_id:j.id,p_lease:j.lease_token});
const row=async(db,id)=>{await admin(db);return (await db.query('select * from wm.tenant_backup_jobs where id=$1',[id])).rows[0];};
async function sourceFile(db,bytes=new Uint8Array(300000).fill(23)){
 await admin(db);const id=crypto.randomUUID(),hash=await byteDigest(bytes),key=`${ids.org}/${id}/${hash}`;
 await db.query(`insert into wm.attachments(organization_id,id,engagement_id,uploader_id,visibility,upload_object_key,sealed_object_key,original_name,declared_media_type,declared_bytes,actual_media_type,actual_bytes,checksum,scan_state,scan_policy_version,expires_at) values($1,$2,$3,$4,'internal',$5,$6,'private.txt','text/plain',$7,'text/plain',$7,$8,'ready','synthetic',now()+interval '1 day')`,[ids.org,id,ids.engagement,ids.operator,key+'.upload',key,bytes.length,hash]);return {id,bytes,hash,key};
}
async function finish(db,env,load){let result;for(let i=0;i<50;i++){const job=await claim(db);if(!job)throw Error('No claim');result=await backupStep(env,job,{call:(_e,n,a)=>machine(db,n,a),control,load,maxParts:4});if(result.state==='sealed'||result.state==='attention')return {...result,job};}throw Error('Bounded test did not finish');}

test('backup request/status need current recovery operator and recent MFA; private tables deny raw access',async()=>{
 const db=await database();try{
 await actor(db,ids.client);await assert.rejects(request(db),/unavailable|operator/);
 await actor(db,ids.operator);await assert.rejects(request(db),/unavailable|operator/);
 await actor(db,ids.operator,{aal:'aal2',age:1800});await assert.rejects(request(db),/Confirm/);
 await actor(db,ids.operator,{aal:'aal2'});const key=crypto.randomUUID(),a=await request(db,key);assert.deepEqual(await request(db,key),a);await assert.rejects(request(db),/active backup/);
 await assert.rejects(db.query('select * from wm.tenant_backup_jobs'),/permission denied/);await assert.rejects(sql(db,'wm_backup_claim',{limit:2}),/permission denied/);
 const status=await sql(db,'wm_backup_status',{org:ids.org});assert.equal(status.items[0].id,a.id);assert.doesNotMatch(JSON.stringify(status),/snapshot_text|grant_digest|session_id/);
 }finally{await db.close();}
});

test('actual stable capture covers tenant history and strips global authority and live credential material',async()=>{
 const db=await database();try{
 await actor(db,ids.client);await command(db,'message_send',{engagement_id:ids.engagement,body:'tenant current snapshot',visibility:'shared'});
 await actor(db,ids.operator,{aal:'aal2'});await request(db);const j=await claim(db),captured=await machine(db,'wm_backup_capture',args(j));assert.equal(captured.state,'captured');
 const stored=await row(db,j.id),snapshot=JSON.parse(stored.snapshot_text);assert.ok(snapshot.tables.memberships.length);assert.ok(snapshot.tables.command_receipts.length);assert.equal(snapshot.tables.staff,undefined);assert.equal(snapshot.tables.intake_creation_grants,undefined);assert.equal(snapshot.tables.organizations.length,1);assert.equal(JSON.parse(snapshot.tables.organizations[0]).id,ids.org);
 const old=stored.snapshot_digest;await db.query("update wm.messages set body='changed later' where organization_id=$1",[ids.org]);assert.equal((await row(db,j.id)).snapshot_digest,old);assert.match((await row(db,j.id)).snapshot_text,/tenant current snapshot/);
 await assert.rejects(db.query("update wm.tenant_backup_jobs set snapshot_text='bad' where id=$1",[j.id]),/immutable/);
 assert.ok(stored.coverage.find(x=>x.table==='integration_credentials').redacted.includes('ciphertext'));
 }finally{await db.close();}
});

test('unclassified tables or changed columns fail closed instead of calling an incomplete snapshot complete',async()=>{
 const db=await database();try{
 await actor(db,ids.operator,{aal:'aal2'});await request(db);const j=await claim(db);await admin(db);await db.exec('create table wm.unreviewed_tenant_rows(organization_id uuid, secret text)');
 const result=await machine(db,'wm_backup_capture',args(j));assert.equal(result.state,'attention');const stored=await row(db,j.id);assert.equal(stored.reason,'backup_coverage_unclassified');assert.equal(stored.snapshot_text,null);
 await db.exec('drop table wm.unreviewed_tenant_rows');await db.exec('alter table wm.messages add column future_column text');
 await actor(db,ids.operator,{aal:'aal2'});await request(db);const next=await claim(db);assert.equal((await machine(db,'wm_backup_capture',args(next))).state,'attention');assert.equal((await row(db,next.id)).reason,'backup_schema_changed');
 }finally{await db.close();}
});

test('SQL refuses missing chunk/whole-source proofs and stale or wrong-tenant leases',async()=>{
 const db=await database();try{
 await actor(db,ids.operator,{aal:'aal2'});await request(db);const j=await claim(db),c=await machine(db,'wm_backup_capture',args(j));
 await assert.rejects(machine(db,'wm_backup_context',{...args(j),p_lease:crypto.randomUUID()}),/lease/);await assert.rejects(machine(db,'wm_backup_context',{...args(j),p_org:ids.other}),/lease/);
 await assert.rejects(machine(db,'wm_backup_manifest',{...args(j),p_manifest:{backup_id:j.id,organization_id:ids.org,external_generation:c.external_generation,snapshot_digest:c.snapshot_digest,files:c.files,coverage:c.coverage,parts:[]}}),/incomplete/);
 await assert.rejects(machine(db,'wm_backup_finish',{...args(j),p_pointer:{},p_witness:{}}),/required/);
 }finally{await db.close();}
});

test('generation changes and revoked operator/session authority fence capture and future chunks',async()=>{
 const db=await database();try{
 await actor(db,ids.operator,{aal:'aal2'});await request(db);const j=await claim(db);await machine(db,'wm_backup_capture',args(j));await admin(db);
 await db.query('update wm.tenant_guards set recovery_generation=recovery_generation+1 where organization_id=$1',[ids.org]);await assert.rejects(machine(db,'wm_backup_context',args(j)),/generation changed/);
 await admin(db);await db.query("update wm.operator_assignments set revoked_at=now() where organization_id=$1 and user_id=$2",[ids.org,ids.operator]);await assert.rejects(machine(db,'wm_backup_page',{...args(j),p_offset:0}),/authority|generation/);
 }finally{await db.close();}
});

test('encrypted snapshot and private file bytes resume across steps and verify offline with a separately witnessed seal',async()=>{
 const db=await database(),env=environment();try{
 const file=await sourceFile(db);await actor(db,ids.operator,{aal:'aal2'});await request(db);env.RECOVERY_BYTES.lost=true;
 const result=await finish(db,env,async(_e,_j,f,off,len)=>{assert.equal(f.key,file.key);return file.bytes.slice(off,off+len);});assert.equal(result.state,'sealed');
 const saved=await row(db,result.id);assert.ok(saved.manifest_pointer);assert.ok(saved.witness_pointer);assert.equal(saved.manifest.files[0].state,'ready');assert.ok(env.RECOVERY_WITNESS.objects.size>=2);
 let restored=0;const offline=await verifyOfflineBackup({load:key=>env.RECOVERY_BYTES.get(key),manifestPointer:saved.manifest_pointer,keyring:{synthetic:syntheticKey},onVerifiedChunk:async s=>{if(s.source===0){assert.deepEqual(s.bytes,file.bytes);restored++;}}});assert.equal(restored,1);assert.equal(offline.restore_authority,'none');assert.match(offline.freshness,/independently/);
 const check=await checkWitness(env,ids.org,'fixture-generation-1',{expected:saved.witness_pointer});assert.equal(check.anchored,true);
 const pointer=saved.manifest.parts[0].pointer,obj=env.RECOVERY_BYTES.objects.get(pointer.key);assert.equal(new TextDecoder().decode(obj.bytes).includes('tenant current snapshot'),false);obj.bytes[obj.bytes.length-1]^=1;
 await assert.rejects(verifyOfflineBackup({load:key=>env.RECOVERY_BYTES.get(key),manifestPointer:saved.manifest_pointer,keyring:{synthetic:syntheticKey}}),/verified|verification/);
 }finally{await db.close();}
});

test('inbound triage with a real tenant route reference is copied privately; unassigned global triage is excluded',async()=>{
 const db=await database();try{
 await admin(db);const route=crypto.randomUUID(),email=crypto.randomUUID(),other=crypto.randomUUID(),att=crypto.randomUUID(),hash=await byteDigest(new Uint8Array([1,2]));
 await db.query('insert into wm.inbound_routes(id,organization_id,engagement_id,token_hash,created_by) values($1,$2,$3,$4,$5)',[route,ids.org,ids.engagement,'a'.repeat(64),ids.operator]);
 const attachments=[{id:att,state:'stored_unscanned',name:'private.bin',bytes:2,checksum:hash,object_key:`inbound/${email}/${att}/${hash}`}];
 await db.query("insert into wm.inbound_emails(id,connection,environment,provider_id,state,routing,route_id,attachments) values($1,'synthetic','test',$1,'captured','triage',$2,$3::jsonb),($4,'synthetic','test',$4,'captured','triage',null,'[]')",[email,route,JSON.stringify(attachments),other]);
 await actor(db,ids.operator,{aal:'aal2'});await request(db);const j=await claim(db),c=await machine(db,'wm_backup_capture',args(j));assert.equal(c.files.length,1);assert.equal(c.files[0].state,'triage');const snapshot=JSON.parse((await row(db,j.id)).snapshot_text);assert.equal(snapshot.tables.inbound_emails.length,1);assert.equal(JSON.parse(snapshot.tables.inbound_routes[0]).token_hash,undefined);
 }finally{await db.close();}
});

test('file corruption is detected after authenticated chunks and cannot seal a complete backup',async()=>{
 const db=await database(),env=environment();try{
 const file=await sourceFile(db,new Uint8Array(30).fill(2));await actor(db,ids.operator,{aal:'aal2'});await request(db);
 await assert.rejects(finish(db,env,async()=>new Uint8Array(30).fill(3)),/verification/);const states=await admin(db).then(()=>db.query('select state from wm.tenant_backup_jobs'));assert.notEqual(states.rows[0].state,'sealed');
 }finally{await db.close();}
});

const event=async(env)=>{const source_id=crypto.randomUUID(),source_digest='a'.repeat(64),context={type:'critical_receipt',organization_id:ids.org,external_generation:'fixture-generation-1',id:source_id};const source_pointer=await putEncrypted(env.RECOVERY_BYTES,`synthetic-receipts/${source_id}`,encode({receipt:{id:source_id,digest:source_digest,organization_id:ids.org,external_generation:'fixture-generation-1'}}),context,{synthetic:syntheticKey},'synthetic');return {id:crypto.randomUUID(),kind:'receipt',source_id,source_digest,source_pointer};};
test('witness append resolves lost acknowledgments, deduplicates immutable IDs and detects an externally anchored rollback',async()=>{
 const env=environment(),e=await event(env);env.RECOVERY_WITNESS.lostHead=true;const first=await appendWitness(env,ids.org,'fixture-generation-1',e,{expected:null,control});const beforeHead=structuredClone(env.RECOVERY_WITNESS.objects.get(`witness/${ids.org}/fixture-generation-1/head.bin`));
 assert.deepEqual(await appendWitness(env,ids.org,'fixture-generation-1',e,{expected:null,control}),first);
 const second=await appendWitness(env,ids.org,'fixture-generation-1',await event(env),{expected:first,control});assert.equal((await checkWitness(env,ids.org,'fixture-generation-1',{expected:first})).events.length,2);
 await assert.rejects(appendWitness(env,ids.org,'fixture-generation-1',{...e,source_digest:'b'.repeat(64)},{expected:second,control}),/verification/);
 env.RECOVERY_WITNESS.objects.set(`witness/${ids.org}/fixture-generation-1/head.bin`,beforeHead);await assert.rejects(checkWitness(env,ids.org,'fixture-generation-1',{expected:second}),/verification/);
});

test('concurrent witness writers cannot both advance one predecessor or acknowledge a fork',async()=>{
 const env=environment(),a=await event(env),b=await event(env);const results=await Promise.allSettled([appendWitness(env,ids.org,'fixture-generation-1',a,{expected:null,control}),appendWitness(env,ids.org,'fixture-generation-1',b,{expected:null,control})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);
 const chain=await checkWitness(env,ids.org,'fixture-generation-1');assert.equal(chain.events.length,1);assert.equal(chain.head.context.sequence,'1');
 const issues=assessWitnessTail(chain,{receipts:{},attempts:{}});assert.equal(issues.state,'reconciliation_required');assert.equal(issues.issues[0].kind,'receipt_missing');
});

test('retained keys, bounded streams and context bindings fail closed on loss or substitution',async()=>{
 const env=environment(),keys={synthetic:syntheticKey},context={type:'synthetic',id:crypto.randomUUID()},bytes=new Uint8Array(100).fill(8);const p=await putEncrypted(env.RECOVERY_BYTES,'synthetic/part',bytes,context,keys,'synthetic');assert.deepEqual(await getEncrypted(env.RECOVERY_BYTES,p,keys),bytes);assert.deepEqual(await readEvidencePointer(env.RECOVERY_BYTES,p.key,p.context,keys,p.ciphertext_digest),p);
 await assert.rejects(getEncrypted(env.RECOVERY_BYTES,p,{}),/verified/);await assert.rejects(getEncrypted(env.RECOVERY_BYTES,{...p,context:{...context,id:crypto.randomUUID()}},keys),/verified/);
 await assert.rejects(putEncrypted(env.RECOVERY_BYTES,'synthetic/part',new Uint8Array(100).fill(9),context,keys,'synthetic'),/verification/);
 const tooLarge={get:async()=>({size:9999999,body:new Response(new Uint8Array(1)).body})};await assert.rejects(getEncrypted(tooLarge,p,keys),/verification/);
});

test('real source adapter validates exact range length and tenant keys; UI never exposes plaintext/key material',async()=>{
 const env={SUPABASE_URL:'https://synthetic.supabase.co',APP_ORIGIN:'https://app.synthetic.example',SUPABASE_PUBLISHABLE_KEY:'synthetic',SUPABASE_SECRET_KEY:'synthetic'},id=crypto.randomUUID(),hash='a'.repeat(64),f={backend:'supabase',bucket:'workspace-sealed',key:`${ids.org}/${id}/${hash}`,bytes:'10',sha256:hash};
 const bytes=await sourceRange(env,{organization_id:ids.org},f,2,3,{fetcher:async(_url,opt)=>{assert.equal(opt.headers.Range,'bytes=2-4');return new Response(new Uint8Array([1,2,3]),{status:206,headers:{'Content-Range':'bytes 2-4/10'}});}});assert.equal(bytes.length,3);
 await assert.rejects(sourceRange(env,{organization_id:ids.other},f,2,3,{fetcher:async()=>{throw Error('must not fetch');}}),/verification/);
 assert.throws(()=>validateBackupCommand('backup.request',{key_id:'synthetic',qualification:q,restore:true}),/verification/);
 const esc=s=>String(s).replaceAll('<','&lt;').replaceAll('"','&quot;');const html=backupViews({esc}).panel({items:[{id,version:1,state:'attention',reason:'<bad>',key_id:'synthetic',snapshot_text:'NEVER_PLAINTEXT',ciphertext:'NEVER_KEY'}]},{org:ids.org,qualification:q,keyId:'synthetic'});assert.match(html,/&lt;bad>/);assert.doesNotMatch(html,/NEVER_PLAINTEXT|NEVER_KEY/);assert.match(html,/recent MFA/);
});


test('a lost SQL chunk checkpoint resumes the same authenticated bytes without rewriting them',async()=>{
 const db=await database(),env=environment();try{
 await actor(db,ids.operator,{aal:'aal2'});await request(db);let j=await claim(db),failed=false;
 const interrupted=async(_e,n,a)=>{if(n==='wm_backup_part'&&a.p_key.startsWith('snapshot/')&&!failed){failed=true;throw Error('checkpoint response lost before commit');}return machine(db,n,a);};
 await assert.rejects(backupStep(env,j,{call:interrupted,control,maxParts:1}),/checkpoint/);const written=env.RECOVERY_BYTES.puts;assert.equal(written,1);
 await machine(db,'wm_backup_release',{...args(j),p_reason:null});j=await claim(db);await backupStep(env,j,{call:(_e,n,a)=>machine(db,n,a),control,maxParts:1});assert.equal(env.RECOVERY_BYTES.puts,written);
 }finally{await db.close();}
});

test('witness check requires retained underlying evidence and detects a missing chain predecessor',async()=>{
 const env=environment(),a=await event(env),first=await appendWitness(env,ids.org,'fixture-generation-1',a,{expected:null,control}),b=await event(env);await appendWitness(env,ids.org,'fixture-generation-1',b,{expected:first,control});
 const source=env.RECOVERY_BYTES.objects.get(a.source_pointer.key);env.RECOVERY_BYTES.objects.delete(a.source_pointer.key);await assert.rejects(checkWitness(env,ids.org,'fixture-generation-1',{expected:first}),/verification/);env.RECOVERY_BYTES.objects.set(a.source_pointer.key,source);
 env.RECOVERY_WITNESS.objects.delete(first.key);await assert.rejects(checkWitness(env,ids.org,'fixture-generation-1',{expected:first}),/verification/);
});


test('declared file-byte over-limit capture stays explicit attention with no truncated snapshot',async()=>{
 const db=await database();try{
 await admin(db);await db.query(`insert into wm.attachments(organization_id,id,engagement_id,uploader_id,visibility,upload_object_key,sealed_object_key,original_name,declared_media_type,declared_bytes,actual_media_type,actual_bytes,checksum,scan_state,scan_policy_version,expires_at)
 select $1,gen_random_uuid(),$2,$3,'internal','synthetic-upload-'||n,'synthetic-seal-'||n,'large.bin','application/octet-stream',20971520,'application/octet-stream',20971520,repeat('a',64),'ready','synthetic',now()+interval '1 day' from generate_series(1,13) n`,[ids.org,ids.engagement,ids.operator]);
 await actor(db,ids.operator,{aal:'aal2'});await request(db);const j=await claim(db);assert.equal((await machine(db,'wm_backup_capture',args(j))).state,'attention');const saved=await row(db,j.id);assert.equal(saved.reason,'backup_file_limit');assert.equal(saved.snapshot_text,null);
 }finally{await db.close();}
});


test('attempt witnesses bind actual encrypted nonce/phase bytes and retain historical outcomes without authorizing new effects',async()=>{
 const env=environment(),attempt=crypto.randomUUID(),nonce=crypto.randomUUID(),operation=crypto.randomUUID();
 const payload={operation_id:operation,attempt_id:attempt,dispatch_nonce:nonce,proof:{state:'unknown'}},plain=encode(payload),digest=await byteDigest(plain),context={type:'provider_attempt',organization_id:ids.org,external_generation:'fixture-generation-1',id:attempt,nonce,phase:'outcome',digest};
 const source_pointer=await putEncrypted(env.RECOVERY_BYTES,`synthetic-attempt/${attempt}`,plain,context,{synthetic:syntheticKey},'synthetic');
 const e={id:crypto.randomUUID(),kind:'attempt_outcome',source_id:attempt,source_digest:digest,attempt_id:attempt,nonce,phase:'outcome',source_pointer};
 const pointer=await appendWitness(env,ids.org,'fixture-generation-1',e,{expected:null,control:async()=>({access_state:'closed',external_generation:'new-generation'})});
 const check=await checkWitness(env,ids.org,'fixture-generation-1',{expected:pointer});assert.equal(assessWitnessTail(check,{attempts:{[attempt]:{nonce,state:'unknown'}}}).state,'reconciliation_required');assert.equal(assessWitnessTail(check,{attempts:{[attempt]:{nonce,state:'resolved'}}}).issues.length,0);
 await assert.rejects(appendWitness(env,ids.org,'fixture-generation-1',{...e,id:crypto.randomUUID(),nonce:crypto.randomUUID()},{expected:pointer,control}),/verification/);
});


test('uncertain late head write remains unknown then reconciles the same event without duplicate head writes',async()=>{
 const env=environment(),e=await event(env),bucket=env.RECOVERY_WITNESS,original=bucket.put.bind(bucket);let pending,headCalls=0;
 bucket.put=async(key,bytes,options)=>{if(key.endsWith('/head.bin')){headCalls++;pending=[key,bytes,options];throw Error('head still in flight');}return original(key,bytes,options);};
 await assert.rejects(appendWitness(env,ids.org,'fixture-generation-1',e,{expected:null,control}),error=>error.code==='witness_write_unknown');
 await assert.rejects(appendWitness(env,ids.org,'fixture-generation-1',e,{expected:{context:{sequence:'99'}},control}),error=>error.code==='witness_cas_conflict');assert.equal(headCalls,1);
 await original(...pending);const confirmed=await appendWitness(env,ids.org,'fixture-generation-1',e,{expected:null,control});assert.equal(confirmed.context.event_id,e.id);assert.equal(headCalls,1);
});
