import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,unzipSync,strToU8} from 'fflate';
import {database,actor,admin,ids,command} from './database.mjs';
import {billingFixture} from './billing-fixture.mjs';
import {CATALOG} from '../../worker/workspace/commercial/catalog.mjs';
import {buildArchive,verifyArchive,csvCell,EXPORT_LIMITS} from '../../worker/workspace/exports/archive.mjs';
import {prepareCustomerExport,processCustomerExports,downloadCustomerExport,privateExportStore,loadExportSource,validateExportCommand,exportStatus} from '../../worker/workspace/exports/service.mjs';
import {exportViews} from '../../src/workspace/export-ui.mjs';
import {sha256} from '../../worker/workspace/files/content.mjs';
import {independentEnvironment} from './independent-bucket.mjs';
const sql=async(db,name,args={})=>(await db.query(`select public.${name}(${Object.keys(args).map((_,i)=>'$'+(i+1)).join(',')}) as result`,Object.values(args).map(x=>x&&typeof x==='object'?JSON.stringify(x):x))).rows[0].result;
const request=async(db,{org=ids.org,eng=ids.engagement,key=crypto.randomUUID(),version=1}={})=>sql(db,'wm_customer_export_command',{org,command:'customer_export.request',input:{engagement_id:eng,expected_version:version,acknowledge_unscanned:true},key});
const machine=async(db,name,args)=>{await actor(db,ids.operator,{role:'service_role'});return sql(db,name,args);};
const claim=async db=>(await machine(db,'wm_customer_export_claim',{limit:5}));
const ctx=(db,j)=>machine(db,'wm_customer_export_context',{org:j.organization_id,id:j.id,lease:j.lease_token});
const row=async(db,id)=>{await admin(db);return (await db.query('select * from wm.customer_exports where id=$1',[id])).rows[0];};
const args=j=>({p_org:j.organization_id,p_id:j.id,p_lease:j.lease_token});
const control=async(_env,org)=>({access_state:'open',external_generation:org===ids.org?'fixture-generation-1':'fixture-generation-2'});
const store=()=>{const objects=new Map();return {target:'r2:synthetic',objects,puts:0,async get(k){return objects.get(k)||null;},async put(k,b){this.puts++;assert.equal(objects.has(k),false);objects.set(k,b);}};};
async function file(db,{visibility='shared',uploader=ids.client,message=null,org=ids.org,eng=ids.engagement,name='brief.txt',state='ready',bytes=strToU8('Brief')}={}){
 await admin(db);const id=crypto.randomUUID(),hash=await sha256(bytes),key=`${org}/${id}/${hash}`;
 await db.query(`insert into wm.attachments(organization_id,id,engagement_id,message_id,uploader_id,visibility,upload_object_key,sealed_object_key,original_name,declared_media_type,declared_bytes,actual_media_type,actual_bytes,checksum,scan_state,scan_policy_version,expires_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,'text/plain',$10,'text/plain',$10,$11,$12,'synthetic',now()+interval '1 day')`,[org,id,eng,message,uploader,visibility,id+'.upload',state==='ready'?key:null,name,bytes.length,hash,state]);return {id,bytes,hash,key};
}
async function ready(db){await actor(db,ids.client);const r=await request(db);const j=(await claim(db)).find(x=>x.id===r.id),s=store();const result=await prepareCustomerExport(independentEnvironment(),j,{call:(_e,n,a)=>machine(db,n,a),store:s,control,loadSource:async()=>strToU8('Brief')});return {r,j,s,result};}

test('customer export requires a current named member, recent session, exact engagement and private RPC grants',async()=>{
 const db=await database();try{
 await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(request(db),/Named current customer/);
 await actor(db,ids.outsider);await assert.rejects(request(db),/unavailable/);
 await actor(db,ids.client,{age:1800});await assert.rejects(request(db),/Confirm/);
 await actor(db,ids.client);await assert.rejects(request(db,{eng:ids.otherEngagement}),/Engagement unavailable/);
 await assert.rejects(db.query('select * from wm.customer_exports'),/permission denied/);
 await assert.rejects(sql(db,'wm_customer_export_claim',{n:2}),/permission denied/);
 await assert.rejects(request(db,{version:9}),/changed/);assert.equal((await request(db)).state,'captured');
 }finally{await db.close();}
});

test('one frozen customer snapshot preserves exact decimals, duplicate keys and later edits without private notes',async()=>{
 const db=await database();try{
 await actor(db,ids.client);const msg=await command(db,'message_send',{engagement_id:ids.engagement,body:'Customer record',visibility:'shared'});
 await actor(db,ids.operator,{aal:'aal2'});await command(db,'message_send',{engagement_id:ids.engagement,body:'NEVER_EXPORT_PRIVATE',visibility:'internal'});
 await admin(db);await db.query(`insert into wm.lead_outcomes(organization_id,engagement_id,source_key,source,occurred_at,value_minor,currency) values($1,$2,'synthetic','workspace',now(),9007199254740993,'USD')`,[ids.org,ids.engagement]);
 await actor(db,ids.client);const key=crypto.randomUUID(),r=await request(db,{key});assert.deepEqual(await request(db,{key}),r);
 await assert.rejects(request(db,{key,version:2}),/different input/);
 const saved=await row(db,r.id);assert.equal(JSON.stringify(saved.snapshot).includes('NEVER_EXPORT_PRIVATE'),false);assert.equal(saved.snapshot.records.find(x=>x.section==='leads').data.value_minor,'9007199254740993');
 await db.query("update wm.messages set body='Later correction' where id=$1",[msg.id]);assert.equal((await row(db,r.id)).snapshot.records.find(x=>x.section==='messages').data.body,'Customer record');
 await assert.rejects(db.query("update wm.customer_exports set snapshot='{}' where id=$1",[r.id]),/immutable/);
 await assert.rejects(db.query("delete from wm.customer_export_receipts where export_id=$1",[r.id]),/Append-only/);
 }finally{await db.close();}
});

test('file selection excludes another tenant, internal parents and another member draft; accepted inbound stays scoped',async()=>{
 const db=await database();try{
 await actor(db,ids.operator,{aal:'aal2'});const privateMessage=await command(db,'message_send',{engagement_id:ids.engagement,body:'private',visibility:'internal'});
 const shared=await file(db),draft=await file(db,{visibility:'draft'});await file(db,{visibility:'internal',name:'INTERNAL.txt'});await file(db,{visibility:'draft',uploader:ids.viewer,name:'OTHER-DRAFT.txt'});await file(db,{message:privateMessage.id,name:'PARENT-PRIVATE.txt'});await file(db,{org:ids.other,eng:ids.otherEngagement,uploader:ids.outsider,name:'SOUTH.txt'});
 await actor(db,ids.client);const msg=await command(db,'message_send',{engagement_id:ids.engagement,body:'Accepted inbound',visibility:'shared'});
 await admin(db);const route=crypto.randomUUID(),email=crypto.randomUUID(),attachment=crypto.randomUUID(),hash=await sha256(strToU8('Brief'));
 await db.query('insert into wm.inbound_routes(id,organization_id,engagement_id,token_hash,created_by) values($1,$2,$3,$4,$5)',[route,ids.org,ids.engagement,'1'.repeat(64),ids.operator]);
 const attachments=[{id:attachment,name:'mail.txt',bytes:5,checksum:hash,state:'stored_unscanned',object_key:`inbound/${email}/${attachment}/${hash}`}];
 await db.query(`insert into wm.inbound_emails(id,connection,environment,provider_id,state,routing,route_id,message_id,attachments) values($1,'synthetic','test',$1,'captured','accepted',$2,$3,$4::jsonb)`,[email,route,msg.id,JSON.stringify(attachments)]);
 await actor(db,ids.client);const r=await request(db),saved=await row(db,r.id);assert.deepEqual(saved.snapshot.files.map(f=>f.id).sort(),[shared.id,draft.id,attachment].sort());assert.doesNotMatch(JSON.stringify(saved.snapshot),/INTERNAL|OTHER-DRAFT|PARENT-PRIVATE|SOUTH/);
 const j=(await claim(db))[0];await ctx(db,j);await admin(db);await db.query("update wm.inbound_emails set routing='dismissed' where id=$1",[email]);await assert.rejects(ctx(db,j),/inbound audience/);
 }finally{await db.close();}
});
test('commercial snapshots exclude unsent drafts and use the same current customer contract audience as the workspace',async()=>{
 const db=await database();try{
  await actor(db,ids.operator,{aal:'aal2'});const commercial=async(name,input)=>(await db.query('select public.wm_commercial_command($1,$2,$3,$4) r',[ids.org,name,input,crypto.randomUUID()])).rows[0].r;
  const proposal=await commercial('proposal.create',{engagement_id:ids.engagement,catalog_id:'launch_site',variant:'standard',catalog_version:CATALOG[0].catalog_version,expected_version:1,starts_at:new Date().toISOString(),site_host:'synthetic.example',scope_note:'PRIVATE UNSENT CONTRACT DRAFT'});
  await actor(db,ids.client);const current=(await db.query('select public.wm_workspace($1) r',[ids.org])).rows[0].r;assert.equal(current.agreements.length,0);
  const first=await request(db,{version:current.engagements[0].version});let saved=await row(db,first.id);assert.doesNotMatch(JSON.stringify(saved.snapshot),/PRIVATE UNSENT CONTRACT DRAFT/);assert.equal(saved.snapshot.records.filter(r=>r.section==='revisions'&&r.data.kind==='agreement').length,0);
  await actor(db,ids.operator,{aal:'aal2'});await commercial('proposal.send',{id:proposal.id,expected_version:proposal.version});
  await actor(db,ids.viewer);const view=(await db.query('select public.wm_workspace($1) r',[ids.org])).rows[0].r;assert.equal(view.agreements.length,0);
  const second=await request(db,{version:view.engagements[0].version});saved=await row(db,second.id);assert.equal(saved.snapshot.records.filter(r=>['agreements','catalog'].includes(r.section)||(r.section==='revisions'&&r.data.kind==='agreement')).length,0);
 }finally{await db.close();}
});
test('only pending inbound correspondence in the shared customer audience can block export completion',async()=>{
 const db=await database();try{
  await actor(db,ids.operator,{aal:'aal2'});const message=await command(db,'message_send',{engagement_id:ids.engagement,body:'Hidden operator correspondence',visibility:'internal'});
  await admin(db);const route=crypto.randomUUID(),email=crypto.randomUUID();await db.query('insert into wm.inbound_routes(id,organization_id,engagement_id,token_hash,created_by) values($1,$2,$3,$4,$5)',[route,ids.org,ids.engagement,'2'.repeat(64),ids.operator]);
  await db.query("insert into wm.inbound_emails(id,connection,environment,provider_id,state,routing,route_id,message_id) values($1,'synthetic','test',$1,'partial','accepted',$2,$3)",[email,route,message.id]);
  await actor(db,ids.client);const hidden=await request(db);assert.equal(hidden.state,'captured');assert.equal((await row(db,hidden.id)).snapshot.files.length,0);
  await db.query("update wm.messages set visibility='shared' where id=$1",[message.id]);await actor(db,ids.client);const shared=await request(db);assert.equal(shared.state,'attention');assert.equal((await row(db,shared.id)).reason,'files_not_ready');
 }finally{await db.close();}
});
test('loss of a named contract reading role invalidates the captured commercial archive before sealing',async()=>{
 const db=await database();try{
  await billingFixture(db);await admin(db);await db.query("update wm.memberships set role='contributor',version=version+1 where organization_id=$1 and user_id=$2",[ids.org,ids.viewer]);
  const authority=crypto.randomUUID();await db.query("insert into wm.engagement_authorities(organization_id,id,engagement_id,user_id,domain,kind,starts_at,ends_at,verified_by,evidence) values($1,$2,$3,$4,'contract','substitute',now()-interval '1 hour',now()+interval '1 day',$5,'Synthetic current contract reader')",[ids.org,authority,ids.engagement,ids.viewer,ids.operator]);
  await actor(db,ids.viewer);const w=(await db.query('select public.wm_workspace($1) r',[ids.org])).rows[0].r,r=await request(db,{version:w.engagements[0].version}),job=(await claim(db)).find(j=>j.id===r.id);let context=await ctx(db,job);assert.ok(context.snapshot.records.some(r=>r.section==='agreements'));
  await admin(db);await db.query('update wm.engagement_authorities set revoked_at=clock_timestamp() where id=$1',[authority]);await assert.rejects(ctx(db,job),/contract audience/);
 }finally{await db.close();}
});

test('explicit incomplete states replace over-limit or pending snapshots without a downloadable partial ZIP',async()=>{
 const db=await database();try{
 await file(db,{state:'received'});await actor(db,ids.client);let r=await request(db);assert.equal(r.state,'attention');let saved=await row(db,r.id);assert.equal(saved.reason,'files_not_ready');assert.equal(saved.snapshot.incomplete,true);
 await db.query("update wm.attachments set deleted_at=now() where organization_id=$1",[ids.org]);
 await db.query(`insert into wm.requests(organization_id,engagement_id,outcome,created_by) select $1,$2,'bounded row '||s,$3 from generate_series(1,2001) s`,[ids.org,ids.engagement,ids.client]);
 await actor(db,ids.client);r=await request(db);saved=await row(db,r.id);assert.equal(saved.reason,'record_limit');assert.equal(saved.snapshot.records.length,0);assert.deepEqual(await claim(db),[]);
 }finally{await db.close();}
});

test('actual SQL plus ZIP build seals exact private bytes and the named requester alone can download',async()=>{
 const db=await database();try{
 const f=await file(db);const {r,j,s,result}=await ready(db);assert.equal(result.state,'sealed');assert.equal(s.puts,1);
 await actor(db,ids.client);const info=await sql(db,'wm_customer_export_download',{org:ids.org,id:r.id});const zip=s.objects.get(info.key),entries=unzipSync(zip);assert.ok(entries['README.html']);assert.equal(new TextDecoder().decode(entries[`files/workspace/${f.id}/${f.hash}.bin`]),'Brief');assert.equal(await sha256(zip),info.sha256);
 await actor(db,ids.viewer);await assert.rejects(sql(db,'wm_customer_export_download',{org:ids.org,id:r.id}),/unavailable/);
 await actor(db,ids.client);const projection=await sql(db,'wm_customer_export_list',{org:ids.org,before:null});assert.doesNotMatch(JSON.stringify(projection),/object_key|storage_target|requested_by|snapshot|token/);
 await actor(db,ids.operator,{role:'service_role'});const receipts=await row(db,r.id);assert.ok(receipts.sealed_at);await assert.rejects(db.query("update wm.customer_exports set archive_digest=$1 where id=$2",['f'.repeat(64),r.id]),/immutable/);
 }finally{await db.close();}
});

test('revoked membership, changed membership version, session revocation and file audience each fence exports',async()=>{
 const db=await database();try{
 const f=await file(db),{r}=await ready(db);await admin(db);await db.query("update wm.memberships set status='revoked',revoked_at=now() where organization_id=$1 and user_id=$2",[ids.org,ids.client]);
 await actor(db,ids.client);await assert.rejects(sql(db,'wm_customer_export_download',{org:ids.org,id:r.id}),/unavailable|changed/);
 await admin(db);await db.query("update wm.memberships set status='active',revoked_at=null,version=version+1 where organization_id=$1 and user_id=$2",[ids.org,ids.client]);await actor(db,ids.client);await assert.rejects(sql(db,'wm_customer_export_download',{org:ids.org,id:r.id}),/changed/);
 const hidden=await sql(db,'wm_customer_export_list',{org:ids.org,before:null});assert.equal(hidden.items[0].archive_digest,null);assert.equal(hidden.items[0].archive_bytes,null);assert.equal(hidden.items[0].download_available,false);
 const second=await ready(db);await admin(db);await db.query("update wm.attachments set visibility='internal' where id=$1",[f.id]);await actor(db,ids.client);await assert.rejects(sql(db,'wm_customer_export_download',{org:ids.org,id:second.r.id}),/file audience/);
 await admin(db);await db.query('delete from auth.sessions where id=$1',[ids.client]);await actor(db,ids.client);await assert.rejects(sql(db,'wm_customer_export_download',{org:ids.org,id:second.r.id}),/Session ended/);
 }finally{await db.close();}
});

test('capture and sealing never adopt restored generations or changed closure states',async()=>{
 const db=await database();try{
 await actor(db,ids.client);await request(db);const j=(await claim(db))[0];await ctx(db,j);
 await admin(db);await db.query('update wm.tenant_guards set recovery_generation=recovery_generation+1 where organization_id=$1',[ids.org]);await assert.rejects(ctx(db,j),/changed/);
 await actor(db,ids.client);const r=await request(db);const next=(await claim(db)).find(x=>x.id===r.id);await ctx(db,next);
 await admin(db);await db.query(`insert into wm.closures(organization_id,engagement_id,timing,exit_mode,reason,effective_at,requested_by) values($1,$2,'immediate','stop','Synthetic closure',now(),$3)`,[ids.org,ids.engagement,ids.client]);await assert.rejects(ctx(db,next),/changed/);
 }finally{await db.close();}
});

test('leases, immutable reservations and single write registration survive unknown outcomes without a fresh write',async()=>{
 const db=await database();try{
 await actor(db,ids.client);await request(db);const j=(await claim(db))[0];await assert.rejects(ctx(db,{...j,lease_token:crypto.randomUUID()}),/lease/);
 const reserve={...args(j),p_target:'r2:synthetic',p_hash:'a'.repeat(64),p_bytes:100,p_manifest:'b'.repeat(64)};await machine(db,'wm_customer_export_reserve',reserve);await machine(db,'wm_customer_export_reserve',reserve);
 await assert.rejects(machine(db,'wm_customer_export_reserve',{...reserve,p_hash:'c'.repeat(64)}),/conflict/);
 assert.equal(await machine(db,'wm_customer_export_write_once',args(j)),true);assert.equal(await machine(db,'wm_customer_export_write_once',args(j)),false);
 await assert.rejects(machine(db,'wm_customer_export_seal',{...args(j),p_hash:'c'.repeat(64),p_bytes:100,p_manifest:'b'.repeat(64)}),/conflict/);
 await machine(db,'wm_customer_export_attention',{...args(j),p_reason:'archive_unknown'});const saved=await row(db,j.id);assert.equal(saved.state,'reserved');assert.ok(saved.write_started_at);
 await db.query("update wm.customer_exports set next_attempt_at=now()-interval '1 minute' where id=$1",[j.id]);const newer=(await claim(db))[0];await assert.rejects(ctx(db,j),/lease/);assert.equal((await ctx(db,newer)).archive_digest,'a'.repeat(64));
 }finally{await db.close();}
});

test('customer cancellation is versioned and idempotent; repeated requests are bounded',async()=>{
 const db=await database();try{
 await actor(db,ids.client);const r=await request(db),key=crypto.randomUUID();const cancel={org:ids.org,command:'customer_export.cancel',input:{id:r.id,expected_version:r.version},key};await assert.rejects(sql(db,'wm_customer_export_command',{...cancel,input:{id:r.id,expected_version:99}}),/changed/);
 const c=await sql(db,'wm_customer_export_command',cancel);assert.equal(c.state,'cancelled');assert.deepEqual(await sql(db,'wm_customer_export_command',cancel),c);assert.deepEqual(await claim(db),[]);
 await actor(db,ids.client);await request(db);await request(db);await assert.rejects(request(db),/request limit/);
 }finally{await db.close();}
});

const fixture=()=>({id:crypto.randomUUID(),captured_at:'2026-10-31T14:00:00Z',snapshot:{profile:'customer-engagement-v1',organization:{id:ids.org,name:'<script>not HTML</script>',timezone:'UTC'},engagement_id:ids.engagement,records:[{section:'requests',data:{id:crypto.randomUUID(),outcome:'=HYPERLINK("evil")',amount_minor:'9007199254740993'}}],files:[]}});

test('deterministic store-only ZIP verifies SHA256, neutralizes CSV and rejects corruption, traversal and expansion',async()=>{
 const f=fixture(),one=await buildArchive(f,async()=>null),two=await buildArchive(f,async()=>null);assert.deepEqual(one.bytes,two.bytes);const entries=unzipSync(one.bytes);assert.match(new TextDecoder().decode(entries['README.html']),/&lt;script&gt;/);assert.equal(csvCell(' \t=bad'), '"\' \t=bad"');assert.equal(csvCell('@SUM(A1)'), '"\'@SUM(A1)"');
 await verifyArchive(one.bytes,one.manifestHash);const corrupt=one.bytes.slice();corrupt[60]^=1;await assert.rejects(verifyArchive(corrupt,one.manifestHash),/verification/);
 await assert.rejects(verifyArchive(zipSync({'../bad':strToU8('bad')},{level:0}),one.manifestHash),/verification/);
 await assert.rejects(verifyArchive(zipSync({bomb:new Uint8Array(200000)},{level:9}),one.manifestHash),/verification/);
 await assert.rejects(buildArchive({...f,snapshot:{...f.snapshot,records:Array(2001).fill({})}},async()=>null),/verification/);
 const bytes=strToU8('Brief');f.snapshot.files=[{kind:'workspace',id:crypto.randomUUID(),name:'safe.txt',bytes:'5',checksum:await sha256(bytes),state:'unscanned'}];await assert.rejects(buildArchive(f,async()=>strToU8('WRONG')),/verification/);
});

test('lost accepted PUT reconciles exact bytes; registered unknown never repeats and one failure does not starve another tenant',async()=>{
 const db=await database();try{
 await actor(db,ids.client);await request(db);const j=(await claim(db))[0],s=store();const put=s.put;s.put=async function(k,b){await put.call(this,k,b);throw Error('lost acknowledgement');};
 assert.equal((await prepareCustomerExport(independentEnvironment(),j,{call:(_e,n,a)=>machine(db,n,a),store:s,control})).state,'sealed');assert.equal(s.puts,1);
 await actor(db,ids.client);await request(db);const unknown=(await claim(db))[0];s.put=async function(){this.puts++;throw Error('no acknowledgement');};await assert.rejects(prepareCustomerExport(independentEnvironment(),unknown,{call:(_e,n,a)=>machine(db,n,a),store:s,control}),/needs checking/);const count=s.puts;
 await assert.rejects(prepareCustomerExport(independentEnvironment(),unknown,{call:(_e,n,a)=>machine(db,n,a),store:s,control}),/needs checking/);assert.equal(s.puts,count);
 let visited=0;const jobs=[{...unknown,organization_id:ids.org},{...unknown,id:crypto.randomUUID(),organization_id:ids.other}];const call=async(_e,n)=>{if(n==='wm_customer_export_claim')return jobs;if(n==='wm_customer_export_context'){visited++;throw Error('synthetic unavailable');}if(n==='wm_customer_export_attention')throw Error('synthetic secondary failure');};
 const results=await processCustomerExports(independentEnvironment(), {call,store:s,control});assert.equal(visited,2);assert.equal(results.length,2);assert.equal(results[0].attention_recorded,false);
 }finally{await db.close();}
});

test('download buffers and verifies bytes then rechecks authority before any response',async()=>{
 const archive=await buildArchive(fixture(),async()=>null),id=crypto.randomUUID(),info={id,external_generation:'fixture-generation-1',target:'r2:synthetic',key:`customer-exports/${ids.org}/${id}/${archive.hash}.zip`,sha256:archive.hash,bytes:archive.bytes.length,manifest_sha256:archive.manifestHash};let checks=0;
 const req=new Request(`https://app.synthetic.example/api/customer-exports/${id}/download?business=${ids.org}&acknowledge_unscanned=true`),s={target:info.target,get:async()=>archive.bytes};
 await assert.rejects(downloadCustomerExport(req,{}, {access_token:'synthetic'},{store:s,control,call:async()=>{if(++checks===2)throw Error('revoked during retrieval');return info;}}),/revoked/);assert.equal(checks,2);
 checks=0;const response=await downloadCustomerExport(req,{}, {access_token:'synthetic'},{store:s,control,call:async()=>{checks++;return info;}});assert.equal(checks,2);assert.match(response.headers.get('cache-control'),/no-store/);assert.match(response.headers.get('content-disposition'),/attachment/);assert.match(response.headers.get('content-security-policy'),/sandbox/);
 await assert.rejects(downloadCustomerExport(req,{}, {},{store:{...s,get:async()=>strToU8('wrong')},control,call:async()=>info}),/needs checking/);
});

test('private Supabase and R2 adapters use immutable scoped keys, bounded reads and no public URL',async()=>{
 const bytes=strToU8('archive'),hash=await sha256(bytes),key=`customer-exports/${ids.org}/${crypto.randomUUID()}/${hash}.zip`,env={APP_ORIGIN:'https://app.synthetic.example',SUPABASE_URL:'https://synthetic.supabase.co',SUPABASE_PUBLISHABLE_KEY:'synthetic',SUPABASE_SECRET_KEY:'synthetic',CUSTOMER_EXPORT_BACKEND:'supabase',CUSTOMER_EXPORT_STORAGE_ID:'synthetic'};let writes=0;
 const s=privateExportStore(env,{fetcher:async(url,opt)=>{assert.ok(url.startsWith('https://synthetic.supabase.co/storage/v1/object/workspace-customer-exports/customer-exports/'));assert.doesNotMatch(url,/\/public\/|\/sign\//);if(opt.method==='POST'){writes++;assert.equal(opt.headers['x-upsert'],'false');return Response.json({});}return new Response(bytes);}});await s.put(key,bytes,hash);assert.deepEqual(await s.get(key,bytes.length),bytes);assert.equal(writes,1);await assert.rejects(s.get('../escape'),/needs checking/);
 const r2=privateExportStore({...env,CUSTOMER_EXPORT_BACKEND:'r2',CUSTOMER_EXPORTS_R2:{async get(k){assert.equal(k,key);return {body:new Response(bytes).body,size:bytes.length};},async put(k,b,opt){assert.equal(k,key);assert.equal(opt.onlyIf.get('If-None-Match'),'*');assert.equal(opt.sha256.byteLength,32);return {};}}});await r2.put(key,bytes,hash);assert.deepEqual(await r2.get(key,bytes.length),bytes);
 await assert.rejects(loadExportSource(env,{kind:'inbound',bucket:'workspace-inbound',id:crypto.randomUUID(),email_id:crypto.randomUUID(),bytes:'5',checksum:hash,object_key:'other-tenant'}, {fetcher:async()=>{throw Error('must not fetch');}}),/needs checking/);
});

test('strict commands and accessible UI keep storage identity and recipient data out of customer markup',()=>{
 assert.throws(()=>validateExportCommand('customer_export.request',{engagement_id:ids.engagement,expected_version:1,acknowledge_unscanned:true,requested_by:ids.outsider}),/needs checking/);
 const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 const html=exportViews({esc}).panel({items:[{id:crypto.randomUUID(),state:'attention',reason:'source_integrity',captured_at:'now',expires_at:'later',version:1,object_key:'NEVER_KEY',requested_by:'NEVER_RECIPIENT',snapshot:'NEVER_SNAPSHOT'}]}, {org:ids.org,engagements:[{id:ids.engagement,title:'<bad>',version:1}]});
 assert.match(html,/&lt;bad>/);assert.match(html,/role="alert"/);assert.doesNotMatch(html,/NEVER_KEY|NEVER_RECIPIENT|NEVER_SNAPSHOT/);assert.match(html,/not a recovery backup/);
});


test('financial rows and exact agreement content are customer-admin only where required; viewer remains a customer export',async()=>{
 const db=await database();try{
 await billingFixture(db);await admin(db);const version=Number((await db.query('select version from wm.engagements where id=$1',[ids.engagement])).rows[0].version);
 await actor(db,ids.client);const r=await request(db,{version}),a=await row(db,r.id);assert.equal(a.snapshot.records.filter(x=>x.section==='invoices').length,1);assert.ok(a.snapshot.records.find(x=>x.section==='catalog'));assert.ok(a.snapshot.records.find(x=>x.section==='revisions').data.customer_content.components);
 await actor(db,ids.viewer);const v=await request(db,{version}),safe=await row(db,v.id);assert.equal(safe.snapshot.records.filter(x=>['invoices','billing','payments','milestones','adjustments','hosting_offsets'].includes(x.section)).length,0);assert.doesNotMatch(JSON.stringify(safe.snapshot),/acct_fixture|cus_fixture/);
 }finally{await db.close();}
});

test('independent recovery control fences restored database state before archive reads or writes',async()=>{
 const db=await database();try{
 await actor(db,ids.client);await request(db);const j=(await claim(db))[0],s=store();let reads=0;s.get=async()=>{reads++;return null;};
 await assert.rejects(prepareCustomerExport(independentEnvironment(),j,{call:(_e,n,a)=>machine(db,n,a),store:s,control:async()=>({access_state:'open',external_generation:'new-independent-generation'})}),/restricted/);assert.equal(reads,0);assert.equal(s.puts,0);
 }finally{await db.close();}
});


test('expired snapshots cannot be claimed or read and exhausted crashed leases become actionable attention',async()=>{
 const db=await database();try{
 await actor(db,ids.client);const r=await request(db);await admin(db);const expired=crypto.randomUUID(),lease=crypto.randomUUID();
 await db.query(`insert into wm.customer_exports(organization_id,id,engagement_id,requested_by,membership_version,membership_role,recovery_generation,external_generation,organization_status,engagement_state,closure_digest,snapshot,snapshot_digest,state,lease_token,lease_until,expires_at)
 select organization_id,$1,engagement_id,requested_by,membership_version,membership_role,recovery_generation,external_generation,organization_status,engagement_state,closure_digest,snapshot,snapshot_digest,'building',$2,now()+interval '1 minute',now()-interval '1 minute' from wm.customer_exports where id=$3`,[expired,lease,r.id]);
 await assert.rejects(ctx(db,{organization_id:ids.org,id:expired,lease_token:lease}),/expired/);
 const jobs=await claim(db);assert.equal(jobs.length,1);assert.equal(jobs[0].id,r.id);
 await admin(db);await db.query("update wm.customer_exports set attempts=5,lease_until=now()-interval '1 second' where id=$1",[r.id]);assert.deepEqual(await claim(db),[]);assert.equal((await row(db,r.id)).state,'attention');
 await actor(db,ids.client);const list=await sql(db,'wm_customer_export_list',{org:ids.org,before:null});assert.equal(list.items.find(x=>x.id===expired).state,'expired');assert.equal(list.items.find(x=>x.id===expired).download_available,false);
 }finally{await db.close();}
});
