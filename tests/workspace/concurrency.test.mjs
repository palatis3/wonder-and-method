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
