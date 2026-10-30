import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,command,reviewable,ids} from './database.mjs';

test('revoked, expired and mismatched sessions deny current JWT reads and commands',async()=>{
  const db=await database();try{
    await actor(db,ids.client);assert.equal((await db.query('select public.wm_session_check() as s')).rows[0].s.active,true);
    await admin(db);await db.query('delete from auth.sessions where id=$1',[ids.client]);
    await actor(db,ids.client);
    await assert.rejects(db.query('select public.wm_businesses()'),/Session ended/);
    await assert.rejects(command(db,'request_create',{engagement_id:ids.engagement,outcome:'Using revoked access'}),/Session ended/);
    await admin(db);await db.query("insert into auth.sessions(id,user_id,not_after) values($1,$1,now()-interval '1 minute')",[ids.client]);
    await actor(db,ids.client);await assert.rejects(db.query('select public.wm_session_check()'),/Session ended/);
    await admin(db);await db.query('update auth.sessions set not_after=null,user_id=$2 where id=$1',[ids.client,ids.outsider]);
    await actor(db,ids.client);await assert.rejects(db.query('select public.wm_session_check()'),/Session ended/);
  }finally{await db.close();}
});

test('real Postgres migrations deny direct table access and expose only authenticated commands',async()=>{
  const db=await database();try{
    await actor(db,ids.client);
    await assert.rejects(db.query('select * from wm.messages'),/permission denied/);
    await assert.rejects(db.query('update wm.memberships set role=\'customer_admin\''),/permission denied/);
    await actor(db,ids.client,{role:'anon'});
    await assert.rejects(command(db,'request_create',{engagement_id:ids.engagement,outcome:'Test request'}),/permission denied/);
    await admin(db);
    const tables=await db.query(`select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='wm' and c.relkind='r'`);
    assert.ok(tables.rows.length>=27);assert.ok(tables.rows.every(t=>t.relrowsecurity));
  }finally{await db.close();}
});
test('current membership, explicit tenant and operator MFA are enforced independently',async()=>{
  const db=await database();try{
    await actor(db,ids.client);
    await assert.rejects(command(db,'request_create',{engagement_id:ids.otherEngagement,outcome:'Cross tenant'}),/unavailable/);
    await assert.rejects(command(db,'request_create',{engagement_id:ids.otherEngagement,outcome:'Cross tenant'},{org:ids.other}),/unavailable/);
    await assert.rejects(command(db,'request_accept',{}),/unavailable/);
    await actor(db,ids.viewer);await assert.rejects(command(db,'request_create',{engagement_id:ids.engagement,outcome:'Viewer write'}),/unavailable/);
    await actor(db,ids.operator);await assert.rejects(command(db,'request_accept',{}),/unavailable/);
    await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(command(db,'request_accept',{}),/Missing field/);
    await admin(db);await db.query(`update wm.memberships set status='revoked',revoked_at=now() where organization_id=$1 and user_id=$2`,[ids.org,ids.client]);
    await actor(db,ids.client);await assert.rejects(command(db,'request_create',{engagement_id:ids.engagement,outcome:'Old valid JWT'}),/unavailable/);
  }finally{await db.close();}
});
test('action retries create one request, reject changed payload, and do not disclose after revocation',async()=>{
  const db=await database();try{
    await actor(db,ids.client);const key=crypto.randomUUID(),input={engagement_id:ids.engagement,outcome:'Please update hours.'};
    const a=await command(db,'request_create',input,{key}),b=await command(db,'request_create',input,{key});assert.deepEqual(a,b);
    await assert.rejects(command(db,'request_create',{...input,outcome:'Different work'},{key}),/different input/);
    await admin(db);assert.equal((await db.query(`select count(*)::int as n from wm.requests`)).rows[0].n,1);
    await db.query(`update wm.memberships set status='revoked' where organization_id=$1 and user_id=$2`,[ids.org,ids.client]);
    await actor(db,ids.client);await assert.rejects(command(db,'request_create',input,{key}),/unavailable/);
  }finally{await db.close();}
});
test('approval binds exact revision and named authority; refresh tokens do not count as recent authentication',async()=>{
  const db=await database();try{
    const {rev}=await reviewable(db),input={request_id:rev.request_id,expected_version:rev.version,revision_id:rev.id,digest:rev.digest,decision:'approve',shown_scope:'Opening hours; no extra charge; tomorrow.'};
    await actor(db,ids.client,{age:1800});await assert.rejects(command(db,'decision_record',input),/Confirm your sign-in/);
    await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(command(db,'decision_record',input),/customer decision-maker/);
    await actor(db,ids.client);await assert.rejects(command(db,'decision_record',{...input,digest:'a'.repeat(64)}),/version is unavailable/);
    const key=crypto.randomUUID(),decision=await command(db,'decision_record',input,{key});assert.equal(decision.decision,'approve');assert.equal(decision.durability,'pending');assert.deepEqual(await command(db,'decision_record',input,{key}),decision);
    await admin(db);await assert.rejects(db.query(`update wm.revisions set summary='Changed after approval' where id=$1`,[rev.id]),/Append-only/);
    await assert.rejects(db.query(`delete from wm.decisions`),/Append-only/);
  }finally{await db.close();}
});
test('stale feedback and withdrawal remain possible and cannot approve a later revision',async()=>{
  const db=await database();try{
    const {rev}=await reviewable(db);
    const decision=await command(db,'decision_record',{request_id:rev.request_id,expected_version:rev.version,revision_id:rev.id,digest:rev.digest,decision:'approve',shown_scope:'Exact reviewed website revision.'});
    await actor(db,ids.operator,{aal:'aal2'});
    const newer=await command(db,'revision_create',{request_id:rev.request_id,expected_version:decision.version,kind:'web_preview',manifest:{commit:'different-immutable-commit'},summary:'A new version',cost_effect:'No extra charge',date_effect:'Tomorrow'});
    await actor(db,ids.client);
    await assert.rejects(command(db,'decision_record',{request_id:rev.request_id,expected_version:newer.version,revision_id:rev.id,digest:rev.digest,decision:'approve',shown_scope:'Old version'}),/current version/);
    const withdrawn=await command(db,'decision_record',{request_id:rev.request_id,expected_version:rev.version,revision_id:rev.id,digest:rev.digest,decision:'withdraw',shown_scope:'Withdraw old version'});assert.equal(withdrawn.decision,'withdraw');
    await admin(db);const r=(await db.query(`select state,current_revision_id from wm.requests where id=$1`,[rev.request_id])).rows[0];assert.equal(r.state,'in_review');assert.equal(r.current_revision_id,newer.id);
  }finally{await db.close();}
});
test('same-business wrong engagement parent and customer internal messages are rejected',async()=>{
  const db=await database();try{
    await actor(db,ids.client);const r=await command(db,'request_create',{engagement_id:ids.engagement,outcome:'A request'});
    await assert.rejects(command(db,'message_send',{engagement_id:ids.engagement,body:'Secret note',visibility:'internal'}),/audience unavailable/);
    await admin(db);const other=crypto.randomUUID();await db.query(`insert into wm.engagements(organization_id,id,service_type,catalog_id,catalog_version,title,created_by) values($1,$2,'care','keep_running','fixture','Second service',$3)`,[ids.org,other,ids.operator]);
    await actor(db,ids.client);await assert.rejects(command(db,'message_send',{engagement_id:other,request_id:r.id,body:'Wrong service parent'}),/foreign key/);
    await admin(db);assert.equal((await db.query(`select count(*)::int as n from wm.messages`)).rows[0].n,0);
  }finally{await db.close();}
});
