import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {database,actor,admin,command,ids} from './database.mjs';
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
