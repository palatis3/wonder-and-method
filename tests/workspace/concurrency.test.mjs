import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {database,actor,admin,command,ids} from './database.mjs';
import {exportEnvelope} from '../../worker/workspace/intake/service.mjs';
const onlyPostgres={skip:!process.env.WORKSPACE_TEST_DATABASE_URL};
async function waitForBlocked(observer,pid){
  const deadline=Date.now()+5000;
  while(Date.now()<deadline){
    const {rows}=await observer.query('select cardinality(pg_blocking_pids($1))>0 as blocked',[pid]);
    if(rows[0].blocked)return;
    await delay(10);
  }
  throw new Error('Expected the second connection to wait on the transaction lock');
}

test('concurrent daily backup producers create one job after the tenant guard commits',onlyPostgres,async()=>{
 const db=await database(),second=await db.connect();try{
  const input={enabled:true,expected_version:0,key_id:'synthetic',qualification:{bytes_identity:'Synthetic account A',witness_identity:'Synthetic account B',custody_reference:'Synthetic offline custodian',witness_hooks_version:'tenant-witness-v1'}};
  await actor(db,ids.operator,{aal:'aal2'});await db.query('select public.wm_backup_command($1,$2,$3,$4)',[ids.org,'backup.schedule',input,crypto.randomUUID()]);
  await actor(db,ids.operator,{role:'service_role'});await db.exec('begin');const first=(await db.query('select public.wm_backup_generate(10) r')).rows[0].r;assert.equal(first.length,1);
  await actor(second,ids.operator,{role:'service_role'});const pid=(await second.query('select pg_backend_pid() id')).rows[0].id;
  const pending=second.query('select public.wm_backup_generate(10) r').then(value=>({value}),error=>({error}));
  await waitForBlocked(db,pid);await db.exec('commit');const replay=await pending;assert.ifError(replay.error);assert.deepEqual(replay.value.rows[0].r,[]);
  await admin(db);assert.equal((await db.query('select count(*)::int n from wm.tenant_backup_jobs')).rows[0].n,1);
 }finally{await db.exec('rollback').catch(()=>{});await second.close();await db.close();}
});

test('two-tenant backup generation follows UUID lock order while staff revocation is pending',onlyPostgres,async()=>{
 const db=await database(),second=await db.connect();let pending;
 try{
  await db.query("insert into wm.staff(user_id,capabilities,active_until) values($1,array['recovery'],now()+interval '2 days')",[ids.operator]);
  await db.query("insert into wm.operator_assignments(organization_id,user_id,capabilities,active_until) values($1,$2,array['recovery'],now()+interval '2 days')",[ids.other,ids.operator]);
  const input={enabled:true,expected_version:0,key_id:'synthetic',qualification:{bytes_identity:'Synthetic A',witness_identity:'Synthetic B',custody_reference:'Synthetic offline custodian',witness_hooks_version:'tenant-witness-v1'}};
  await actor(db,ids.operator,{aal:'aal2'});for(const org of [ids.org,ids.other])await db.query('select public.wm_backup_command($1,$2,$3,$4)',[org,'backup.schedule',input,crypto.randomUUID()]);
  await admin(db);await db.query("update wm.tenant_backup_schedules set next_at=now()-case when organization_id=$1 then interval '1 minute' else interval '10 minutes' end",[ids.org]);
  await db.exec('begin');await db.query('select 1 from wm.tenant_guards where organization_id=$1 for update',[ids.org]);
  await actor(second,ids.operator,{role:'service_role'});const pid=(await second.query('select pg_backend_pid() id')).rows[0].id;
  pending=second.query('select public.wm_backup_generate(2) r').then(value=>({value}),error=>({error}));await waitForBlocked(db,pid);
  // The older due row is B. A correct generator waits for A without holding B.
  // NOWAIT gives a deterministic diagnosis instead of waiting for a deadlock.
  await db.query('select 1 from wm.tenant_guards where organization_id=$1 for update nowait',[ids.other]);
  await db.query('update wm.staff set revoked_at=clock_timestamp() where user_id=$1',[ids.operator]);await db.exec('commit');
  const finished=await pending;assert.ifError(finished.error);assert.deepEqual(finished.value.rows[0].r,[]);pending=null;
  assert.equal((await db.query('select count(*)::int n from wm.tenant_backup_jobs')).rows[0].n,0);
 }finally{await db.exec('rollback').catch(()=>{});if(pending)await pending;await second.close();await db.close();}
});
test('concurrent retries commit one command result',onlyPostgres,async()=>{
  const db=await database(),second=await db.connect();
  try{
    const pid=(await second.query('select pg_backend_pid() as id')).rows[0].id;
    const key=crypto.randomUUID(),input={engagement_id:ids.engagement,outcome:'One concurrent request'};
    await actor(db,ids.client);await db.exec('begin');const first=await command(db,'request_create',input,{key});
    await actor(second,ids.client);const pending=command(second,'request_create',input,{key});
    await waitForBlocked(db,pid);await db.exec('commit');assert.deepEqual(await pending,first);
    await admin(db);assert.equal((await db.query('select count(*)::int as n from wm.requests')).rows[0].n,1);
  }finally{await db.exec('rollback').catch(()=>{});await second.close();await db.close();}
});

test('two businesses cannot reserve the last introductory Care waiver concurrently',onlyPostgres,async()=>{
 const db=await database(),second=await db.connect();
 try{
  await db.query("update wm.intro_care_slots set consumed_at=now() where slot<3");
  await db.query("insert into wm.operator_assignments(organization_id,user_id,capabilities,active_until) values($1,$2,array['read','finance'],now()+interval '1 year')",[ids.other,ids.operator]);
  const version=(await db.query("select catalog_version from wm.catalog_registry where catalog_id='improve' and variant='brochure' and catalog_version=(select catalog_version from wm.catalog_active)")).rows[0].catalog_version;
  const invoke=async(conn,org,action,input)=>(await conn.query('select public.wm_commercial_command($1,$2,$3,$4) as r',[org,action,input,crypto.randomUUID()])).rows[0].r;
  await actor(db,ids.operator,{aal:'aal2'});const a=await invoke(db,ids.org,'service.create',{catalog_id:'improve',variant:'brochure',catalog_version:version,title:'First synthetic production service'});const b=await invoke(db,ids.other,'service.create',{catalog_id:'improve',variant:'brochure',catalog_version:version,title:'Second synthetic production service'});
  const input=e=>({engagement_id:e.id,expected_version:1,catalog_id:'improve',variant:'brochure',catalog_version:version,starts_at:new Date(Date.now()+86400000).toISOString(),site_host:'synthetic.example',scope_note:'Synthetic production with Brochure Care',waiver_kind:'intro_production',waiver_evidence:'Approved introductory client; checks still apply.'});
  await db.exec('begin');await invoke(db,ids.org,'proposal.create',input(a));
  await actor(second,ids.operator,{aal:'aal2'});const pid=(await second.query('select pg_backend_pid() as id')).rows[0].id;const pending=invoke(second,ids.other,'proposal.create',input(b)).then(value=>({value}),error=>({error}));
  await waitForBlocked(db,pid);await db.exec('commit');assert.match((await pending).error?.message||'',/All three introductory Care places/);
  await admin(db);assert.equal((await db.query('select count(*)::int n from wm.agreements')).rows[0].n,1);
 }finally{await db.exec('rollback').catch(()=>{});await second.close();await db.close();}
});
test('revocation that wins the tenant lock prevents a waiting write',onlyPostgres,async()=>{
  const db=await database(),second=await db.connect();
  try{
    const pid=(await second.query('select pg_backend_pid() as id')).rows[0].id;
    await db.exec('begin');await db.query('select 1 from wm.tenant_guards where organization_id=$1 for update',[ids.org]);
    await db.query("update wm.memberships set status='revoked',revoked_at=now() where organization_id=$1 and user_id=$2",[ids.org,ids.client]);
    await actor(second,ids.client);
    const pending=command(second,'request_create',{engagement_id:ids.engagement,outcome:'Must be rejected'}).then(value=>({value}),error=>({error}));
    await waitForBlocked(db,pid);await db.exec('commit');assert.match((await pending).error?.message||'',/unavailable/);
    assert.equal((await db.query('select count(*)::int as n from wm.requests')).rows[0].n,0);
  }finally{await db.exec('rollback').catch(()=>{});await second.close();await db.close();}
});
test('session removal is checked again after a waiting command acquires the lock',onlyPostgres,async()=>{
  const db=await database(),second=await db.connect();
  try{
    const pid=(await second.query('select pg_backend_pid() as id')).rows[0].id;
    await db.exec('begin');await db.query('select 1 from wm.tenant_guards where organization_id=$1 for update',[ids.org]);
    await actor(second,ids.client);
    const pending=command(second,'request_create',{engagement_id:ids.engagement,outcome:'Must be rejected'}).then(value=>({value}),error=>({error}));
    await waitForBlocked(db,pid);await db.query('delete from auth.sessions where id=$1',[ids.client]);await db.exec('commit');
    assert.match((await pending).error?.message||'',/Session ended/);
    assert.equal((await db.query('select count(*)::int as n from wm.requests')).rows[0].n,0);
  }finally{await db.exec('rollback').catch(()=>{});await second.close();await db.close();}
});

test('staff revocation that wins the shared tenant lock prevents a waiting cover read',onlyPostgres,async()=>{
 const db=await database(),second=await db.connect();try{
  await db.query("insert into wm.staff(user_id,capabilities,active_until) values($1,array['coverage'],now()+interval '2 days'),($2,array['intake'],now()+interval '2 days')",[ids.operator,ids.outsider]);
  await actor(db,ids.operator,{aal:'aal2'});await db.query('select public.wm_owner_command($1,$2,$3,$4)',[ids.org,'owner.cover.assign',{recipient_id:ids.outsider,capabilities:['read','reports'],starts_at:new Date().toISOString(),ends_at:new Date(Date.now()+86400000).toISOString(),reason:'Synthetic concurrency cover'},crypto.randomUUID()]);
  await admin(db);await db.exec('begin');await db.query('update wm.staff set revoked_at=clock_timestamp() where user_id=$1',[ids.operator]);
  await actor(second,ids.outsider,{aal:'aal2'});const pid=(await second.query('select pg_backend_pid() id')).rows[0].id;
  const pending=second.query('select public.wm_workspace($1)',[ids.org]).then(value=>({value}),error=>({error}));
  await waitForBlocked(db,pid);await db.exec('commit');assert.equal((await pending).error?.code,'42501');
 }finally{await db.exec('rollback').catch(()=>{});await second.close();await db.close();}
});

test('concurrent first-business creation replays a read/reporting-only grant receipt once',onlyPostgres,async()=>{
 const db=await database(),second=await db.connect();try{
  const source={id:'race-source',origin:'https://synthetic.example',environment:'staging'};
  await db.query("insert into wm.staff(user_id,capabilities,active_until) values($1,array['intake','create_business'],now()+interval '2 days')",[ids.operator]);
  await db.query("insert into wm.intake_sources values($1,$2,$3,true,'Synthetic concurrency fixture')",[source.id,source.origin,source.environment]);
  const page={records:[{id:'40000000-0000-4000-8000-000000000009',created_at:1793400000000,synthetic:1,payload:'{"business":"Synthetic concurrent intake"}'}],next_cursor:null};
  await actor(db,ids.operator,{role:'service_role'});await db.query('select public.wm_intake_receive($1,$2)',[source.id,await exportEnvelope(page,JSON.stringify(page),source)]);
  await actor(db,ids.operator,{aal:'aal2'});let item=(await db.query("select public.wm_intake_queue('','',null) r")).rows[0].r.items[0];
  const act=async(connection,name,input,key=crypto.randomUUID())=>(await connection.query('select public.wm_intake_command($1,$2,$3) r',[name,input,key])).rows[0].r;
  item={...item,...await act(db,'intake.assign',{id:item.id,expected_version:item.version,assignee_id:ids.operator,reason:'Assigned for concurrency test'})};
  item={...item,...await act(db,'intake.progress',{id:item.id,expected_version:item.version,stage:'qualified',next_action:'Review approved creation grant',next_contact_at:new Date(Date.now()+86400000).toISOString(),reason:'Qualified synthetic inquiry'})};
  const grant=crypto.randomUUID();await admin(db);await db.query("insert into wm.intake_creation_grants(id,staff_id,intake_id,business_name,timezone,capabilities,operator_expires_at,expires_at,approved_by,approval_evidence,staff_digest) select $1,$2,$3,'Synthetic concurrent approved business','UTC',array['read','reports'],now()+interval '1 day',now()+interval '1 hour',$4,'Explicit synthetic approval',wm.hash_json(to_jsonb(s)) from wm.staff s where s.user_id=$2",[grant,ids.operator,item.id,ids.client]);
  const key=crypto.randomUUID(),input={id:item.id,expected_version:item.version,grant_id:grant,accepted_summary:'Explicitly accepted synthetic summary',requested_services:['web_design'],reason:'Consume the exact approved grant'};
  await actor(db,ids.operator,{aal:'aal2'});await db.exec('begin');const first=await act(db,'intake.create_business',input,key);
  await actor(second,ids.operator,{aal:'aal2'});const pid=(await second.query('select pg_backend_pid() id')).rows[0].id,pending=act(second,'intake.create_business',input,key).then(value=>({value}),error=>({error}));
  await waitForBlocked(db,pid);await db.exec('commit');const replay=await pending;assert.ifError(replay.error);assert.deepEqual(replay.value,first);
  await admin(db);assert.equal((await db.query('select count(*)::int n from wm.intake_grant_uses')).rows[0].n,1);
  assert.equal((await db.query("select count(*)::int n from wm.organizations where name='Synthetic concurrent approved business'")).rows[0].n,1);
 }finally{await db.exec('rollback').catch(()=>{});await second.close();await db.close();}
});
