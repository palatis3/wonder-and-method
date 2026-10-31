import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,ids} from './database.mjs';
import {exportEnvelope,sha256,syncIntakePage,validateIntakeCommand} from '../../worker/workspace/intake/service.mjs';
import {intakeViews} from '../../src/workspace/intake-ui.mjs';
const source={id:'public-test',origin:'https://synthetic.example',environment:'staging'};
const record=(overrides={})=>({id:'40000000-0000-4000-8000-000000000001',created_at:1793400000000,synthetic:1,payload:JSON.stringify({name:'Unverified contact',email:'unknown@synthetic.example',business:'Unverified business',message:'Please prepare a website.',service:'new_website'}),delivery_status:'pending',...overrides});
const envelope=async(r=record())=>{const page={records:[r],next_cursor:null};return exportEnvelope(page,JSON.stringify(page),source);};
const cmd=async(db,name,input,key=crypto.randomUUID())=>(await db.query('select public.wm_intake_command($1,$2::jsonb,$3) r',[name,JSON.stringify(input),key])).rows[0].r;
const queue=async(db,query='',stage='')=>(await db.query('select public.wm_intake_queue($1,$2,null) r',[query,stage])).rows[0].r;
async function receive(db,e){await actor(db,ids.operator,{role:'service_role'});return (await db.query('select public.wm_intake_receive($1,$2::jsonb) r',[source.id,JSON.stringify(e)])).rows[0].r;}
async function setup(db){
 await db.query("insert into wm.intake_sources values($1,$2,$3,true,'Synthetic reviewed fixture')",[source.id,source.origin,source.environment]);
 await db.query("insert into wm.staff(user_id,capabilities,active_until) values($1,array['intake','create_business'],now()+interval '30 days'),($2,array['intake'],now()+interval '30 days')",[ids.operator,ids.outsider]);
 await receive(db,await envelope());await actor(db,ids.operator,{aal:'aal2'});return (await queue(db)).items[0];
}
async function qualify(db,r){
 let x=await cmd(db,'intake.assign',{id:r.id,expected_version:r.version,assignee_id:ids.operator,reason:'Named intake owner'});
 x=await cmd(db,'intake.progress',{id:r.id,expected_version:x.version,stage:'qualified',next_action:'Private qualification note',next_contact_at:new Date(Date.now()+86400000).toISOString(),reason:'Reviewed scope'});
 return {...r,...x};
}
const linking=(r,organization_id=ids.org)=>({id:r.id,expected_version:r.version,organization_id,accepted_summary:'Reviewed website opportunity; confirm scope separately.',requested_services:['web_design'],reason:'Explicitly verified target business'});
async function creationGrant(db,r,options={}){
 await admin(db);const id=crypto.randomUUID();
 await db.query(`insert into wm.intake_creation_grants(id,staff_id,intake_id,business_name,timezone,capabilities,operator_expires_at,expires_at,approved_by,approval_evidence,staff_digest)
 select $1,$2,$3,'Explicit Approved Business','UTC',$6::text[],now()+interval '7 days',now()+$4::interval,$5,'Independent synthetic preapproval',wm.hash_json(to_jsonb(s)) from wm.staff s where s.user_id=$2`,[id,options.staff||ids.operator,r.id,options.expires||'1 day',ids.client,options.capabilities||['read','delivery','people']]);
 await actor(db,ids.operator,{aal:'aal2'});return id;
}

test('first arrival and exact duplicate receipts stay private; mutable delivery fields do not conflict',async()=>{
 const db=await database();try{
  const r=await setup(db);assert.equal(r.stage,'new');assert.equal(r.assigned_to,null);assert.equal(r.payload.email,'unknown@synthetic.example');
  const exact=await envelope();assert.deepEqual(await receive(db,exact),{new:1,duplicate:0,conflict:0,next_cursor:null,durable_local_receipt:true});
  const changedStatus=await envelope(record({delivery_status:'accepted',provider_id:'synthetic-message'}));assert.equal(changedStatus.records[0].source_hash,exact.records[0].source_hash);
  assert.equal((await receive(db,changedStatus)).duplicate,1);
  await actor(db,ids.client,{aal:'aal2'});await assert.rejects(queue(db),/staff capability/);await assert.rejects(db.query('select * from wm.intake_arrivals'),/permission denied/);
  await assert.rejects(db.query('select public.wm_intake_receive($1,$2::jsonb)',[source.id,JSON.stringify(exact)]),/permission denied/);
  await admin(db);assert.equal((await db.query('select count(*)::int n from wm.intake_arrivals')).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from wm.opportunities')).rows[0].n,0);
 }finally{await db.close();}
});
test('conflicting immutable source quarantines without overwrite and requires versioned rejection',async()=>{
 const db=await database();try{
  const r=await setup(db);const e=await envelope(record({payload:JSON.stringify({email:'forged@synthetic.example',message:'Claimed new contents'})}));
  assert.equal((await receive(db,e)).conflict,1);await actor(db,ids.operator,{aal:'aal2'});
  let x=(await queue(db)).items[0];assert.equal(x.quarantined,true);assert.equal(x.payload.email,r.payload.email);assert.equal(x.version,2);
  await assert.rejects(cmd(db,'intake.assign',{id:x.id,expected_version:x.version,assignee_id:ids.operator,reason:'Try to bypass conflict'}),/conflict needs review/);
  await assert.rejects(cmd(db,'intake.conflict.reject',{id:x.id,expected_version:1,source_hash:e.records[0].source_hash,reason:'Reject changed copy'}),/changed/);
  await cmd(db,'intake.conflict.reject',{id:x.id,expected_version:x.version,source_hash:e.records[0].source_hash,reason:'Compared with original; reject conflicting copy'});
  await receive(db,{...e,response_hash:'a'.repeat(64)});await actor(db,ids.operator,{aal:'aal2'});x=(await queue(db)).items[0];assert.equal(x.quarantined,false);assert.equal(x.conflicts.length,0);
  await admin(db);await assert.rejects(db.query("update wm.intake_arrivals set payload='{}'"),/immutable/);
 }finally{await db.close();}
});
test('current staff MFA, recent auth, verified identity, source binding and session revocation are enforced',async()=>{
 const db=await database();try{
  await setup(db);await actor(db,ids.operator);await assert.rejects(queue(db),/MFA/);
  await actor(db,ids.operator,{aal:'aal2',age:1000});await assert.rejects(queue(db),/Confirm your sign-in/);
  await admin(db);await db.query('update auth.users set email_confirmed_at=null where id=$1',[ids.operator]);
  await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(queue(db),/staff capability/);
  await assert.rejects(receive(db,{...await envelope(),origin:'https://wrong.example'}),/source binding/);
  const badHash=await envelope();badHash.records[0].source_hash='b'.repeat(64);badHash.response_hash='b'.repeat(64);await assert.rejects(receive(db,badHash),/identity or hash/);
  await admin(db);await db.query('update auth.users set email_confirmed_at=now() where id=$1',[ids.operator]);await db.query('delete from auth.sessions where user_id=$1',[ids.operator]);
  await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(queue(db),/Session ended/);
 }finally{await db.close();}
});
test('assignments and progression reject stale keys, stale versions and unauthorized current assignees',async()=>{
 const db=await database();try{
  const r=await setup(db),key=crypto.randomUUID(),input={id:r.id,expected_version:1,assignee_id:ids.operator,reason:'Assigned'};
  const result=await cmd(db,'intake.assign',input,key);assert.deepEqual(await cmd(db,'intake.assign',input,key),result);
  await assert.rejects(cmd(db,'intake.assign',{...input,reason:'Changed'},key),/different input/);
  await assert.rejects(cmd(db,'intake.assign',input),/changed/);
  await cmd(db,'intake.assign',{...input,expected_version:result.version,assignee_id:ids.outsider});
  await assert.rejects(cmd(db,'intake.progress',{id:r.id,expected_version:3,stage:'qualified',next_action:'Review',next_contact_at:new Date(Date.now()+86400000).toISOString(),reason:'Review'}),/assigned intake/);
  await admin(db);await db.query('update wm.staff set revoked_at=now() where user_id=$1',[ids.outsider]);await actor(db,ids.operator,{aal:'aal2'});
  await assert.rejects(cmd(db,'intake.assign',{...input,expected_version:3,assignee_id:ids.outsider}),/assignee/);
 }finally{await db.close();}
});
test('explicit tenant linking preserves current facts, keeps contacts private and rejects wrong tenants',async()=>{
 const db=await database();try{
  const r=await qualify(db,await setup(db));
  await admin(db);await db.query("insert into wm.business_facts(organization_id,key,value,source,confirmed_by) values($1,'business_name','\"Current confirmed name\"','confirmed',$2)",[ids.org,ids.client]);
  await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(cmd(db,'intake.link',linking(r,ids.other)),/unavailable|authority/i);
  const key=crypto.randomUUID(),result=await cmd(db,'intake.link',linking(r),key);assert.equal(result.organization_id,ids.org);assert.deepEqual(await cmd(db,'intake.link',linking(r),key),result);
  await admin(db);assert.equal((await db.query('select value from wm.business_facts where organization_id=$1',[ids.org])).rows[0].value,'Current confirmed name');
  const tenant=(await db.query('select * from wm.opportunities where organization_id=$1',[ids.org])).rows[0];assert.equal(tenant.next_action,linking(r).accepted_summary);assert.ok(!JSON.stringify(tenant).includes('unknown@'));assert.ok(!JSON.stringify(tenant).includes('Private qualification'));
  assert.equal((await db.query('select count(*)::int n from wm.invitations')).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int n from wm.memberships')).rows[0].n,3);
  await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(cmd(db,'intake.link',{...linking(r,ids.other),expected_version:result.version}),/already linked/);
 }finally{await db.close();}
});
test('first business consumes exact preapproved actor grant once, without memberships, invitations or spending',async()=>{
 const db=await database();try{
  const r=await qualify(db,await setup(db));const grant=await creationGrant(db,r),key=crypto.randomUUID();
  const {organization_id,...base}=linking(r);const input={...base,grant_id:grant};
  const result=await cmd(db,'intake.create_business',input,key);assert.deepEqual(await cmd(db,'intake.create_business',input,key),result);
  await assert.rejects(cmd(db,'intake.create_business',{...input,expected_version:result.version}),/unlinked/);
  await admin(db);const org=result.organization_id;
  assert.equal((await db.query('select name from wm.organizations where id=$1',[org])).rows[0].name,'Explicit Approved Business');
  assert.deepEqual((await db.query('select capabilities from wm.operator_assignments where organization_id=$1',[org])).rows[0].capabilities,['read','delivery','people']);
  assert.equal((await db.query('select positive_effects_allowed from wm.tenant_guards where organization_id=$1',[org])).rows[0].positive_effects_allowed,false);
  for(const table of ['memberships','invitations','engagement_authorities','operations'])assert.equal((await db.query(`select count(*)::int n from wm.${table} where organization_id=$1`,[org])).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int n from wm.intake_grant_uses')).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from wm.critical_receipts where organization_id=$1',[org])).rows[0].n,1);
 }finally{await db.close();}
});
test('creation rejects missing, wrong-actor, expired, revoked and narrowed-staff grants atomically',async()=>{
 const db=await database();try{
  const r=await qualify(db,await setup(db));const {organization_id,...base}=linking(r);
  await assert.rejects(cmd(db,'intake.create_business',{...base,grant_id:crypto.randomUUID()}),/preapproved/);
  const expired=await creationGrant(db,r,{expires:'-1 second'});await assert.rejects(cmd(db,'intake.create_business',{...base,grant_id:expired}),/preapproved/);
  const wrong=await creationGrant(db,r,{staff:ids.outsider});await assert.rejects(cmd(db,'intake.create_business',{...base,grant_id:wrong}),/preapproved/);
  const revoked=await creationGrant(db,r);await admin(db);await db.query("insert into wm.intake_grant_revocations(grant_id,revoked_by,reason) values($1,$2,'withdrawn')",[revoked,ids.client]);await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(cmd(db,'intake.create_business',{...base,grant_id:revoked}),/preapproved/);
  const narrowed=await creationGrant(db,r);await admin(db);await db.query("update wm.staff set capabilities=array['intake'] where user_id=$1",[ids.operator]);await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(cmd(db,'intake.create_business',{...base,grant_id:narrowed}),/staff capability/);
  await admin(db);await db.query("update wm.staff set capabilities=array['intake','create_business'],active_until=active_until-interval '1 day' where user_id=$1",[ids.operator]);await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(cmd(db,'intake.create_business',{...base,grant_id:narrowed}),/preapproved/);
  await admin(db);assert.equal((await db.query('select count(*)::int n from wm.organizations')).rows[0].n,2);assert.equal((await db.query('select count(*)::int n from wm.intake_grant_uses')).rows[0].n,0);
 }finally{await db.close();}
});
test('a read/reporting-only creation grant can replay its receipt while current read access remains',async()=>{
 const db=await database();try{
  const r=await qualify(db,await setup(db)),grant=await creationGrant(db,r,{capabilities:['read','reports']}),key=crypto.randomUUID();
  const {organization_id,...base}=linking(r),input={...base,grant_id:grant};const result=await cmd(db,'intake.create_business',input,key);
  assert.deepEqual(await cmd(db,'intake.create_business',input,key),result);
  await admin(db);await db.query('update wm.operator_assignments set revoked_at=now() where organization_id=$1',[result.organization_id]);
  await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(cmd(db,'intake.create_business',input,key),/unavailable/);
 }finally{await db.close();}
});
test('tenant linking rejects direct assignment expiry even inside an older transaction',async()=>{
 const db=await database();try{
  const r=await qualify(db,await setup(db));await admin(db);
  await db.query("update wm.operator_assignments set active_until=clock_timestamp()+interval '150 milliseconds' where organization_id=$1 and user_id=$2",[ids.org,ids.operator]);
  await actor(db,ids.operator,{aal:'aal2'});await db.exec('begin');await new Promise(resolve=>setTimeout(resolve,200));
  await assert.rejects(cmd(db,'intake.link',linking(r)),error=>error.code==='42501'&&/unavailable|target-business/.test(error.message));await db.exec('rollback');
 }finally{await db.close();}
});
test('export adapter pins protected source, bounds pages, hashes exact payload and never advances before receipt',async()=>{
 const page={records:[record()],next_cursor:null},calls=[];let saved;
 const env={INTAKE_EXPORT_SOURCES:{[source.id]:{...source,token:'synthetic-export-token',stagingAuthorization:'Basic synthetic'}}};
 const deps={call:async()=>{calls.push('staff');return {allowed:true};},machine:async(_env,name,args)=>{calls.push(name);if(name==='wm_intake_source')return source;saved=args;return {next_cursor:null,durable_local_receipt:true};},fetcher:async(url,init)=>{calls.push('fetch');assert.equal(url,source.origin+'/api/operator/inquiries');assert.equal(init.redirect,'error');assert.equal(init.method,'GET');return Response.json(page);}};
 await syncIntakePage(env,{access_token:'synthetic-session'},source.id,{},deps);
 assert.deepEqual(calls,['staff','wm_intake_source','fetch','staff','wm_intake_receive']);assert.equal(saved.p_envelope.records[0].source_hash,await sha256(JSON.stringify([record().id,record().created_at,1,record().payload])));
 calls.length=0;await syncIntakePage({...env,INTAKE_EXPORT_SOURCES:JSON.stringify(env.INTAKE_EXPORT_SOURCES)},{access_token:'synthetic-session'},source.id,{},deps);assert.deepEqual(calls,['staff','wm_intake_source','fetch','staff','wm_intake_receive']);
 await assert.rejects(syncIntakePage({...env,INTAKE_EXPORT_SOURCES:'malformed protected JSON'},{access_token:'x'},source.id,{},deps),/connection is unavailable/);
 await assert.rejects(syncIntakePage({...env,INTAKE_EXPORT_SOURCES:{[source.id]:{...env.INTAKE_EXPORT_SOURCES[source.id],origin:'https://wrong.example'}}},{access_token:'x'},source.id,{},deps),/connection is unavailable/);
 await assert.rejects(exportEnvelope({...page,next_cursor:record().id},'raw',source),/intake fields/);
 await assert.rejects(exportEnvelope({records:[record(),record()],next_cursor:null},'raw',source),/intake fields/);
 await assert.rejects(syncIntakePage(env,{access_token:'x'},source.id,{}, {...deps,fetcher:async()=>new Response('x'.repeat(4_000_001),{headers:{'Content-Type':'application/json'}})}),/intake fields/);
 await assert.rejects(syncIntakePage(env,{access_token:'x'},source.id,{}, {...deps,machine:async(_e,n)=>{if(n==='wm_intake_source')return source;throw Error('uncertain local receipt');}}),/uncertain local receipt/);
});
test('typed intake adapter and accessible HTML reject unknown fields and escape untrusted content',()=>{
 assert.throws(()=>validateIntakeCommand('intake.assign',{id:ids.org,expected_version:1,assignee_id:ids.operator,reason:'ok',admin:true}),/intake fields/);
 const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const html=intakeViews({esc}).queue({items:[{id:ids.org,version:1,stage:'new',source_key:'test',source_id:ids.other,payload:{name:'<script>x</script>',email:'<img src=x>',message:'<script>y</script>'},conflicts:[],assigned_to:null}],staff:[],sources:[],creation_grants:[],has_more:false});
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('aria-labelledby="intake-title"'));assert.ok(html.includes('data-intake-search'));
 for(const stage of ['won','lost']){const terminal=intakeViews({esc}).queue({items:[{id:ids.org,version:1,stage,source_key:'test',source_id:ids.other,payload:{},conflicts:[],assigned_to:ids.operator}],staff:[],sources:[],creation_grants:[],has_more:false},{actorId:ids.operator});assert.ok(!terminal.includes('data-intake-action="intake.progress"'));}
});
