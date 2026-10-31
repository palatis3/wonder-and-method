import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,command,ids,reviewable} from './database.mjs';
import {validateOwnerCommand} from '../../worker/workspace/owner/service.mjs';
import {ownerViews} from '../../src/workspace/owner-ui.mjs';
const week='2026-11-02';
const cmd=async(db,name,input,{org=ids.org,key=crypto.randomUUID()}={})=>(await db.query('select public.wm_owner_command($1,$2,$3::jsonb,$4) r',[org,name,JSON.stringify(input),key])).rows[0].r;
const queue=async(db,query='')=>(await db.query('select public.wm_owner_queue($1,$2,$3,null) r',[query,week,'UTC'])).rows[0].r;
const date=days=>new Date(Date.now()+days*86400000).toISOString();
async function staff(db){
 await admin(db);await db.query("insert into wm.staff(user_id,capabilities,active_until) values($1,array['coverage'],now()+interval '30 days'),($2,array['intake'],now()+interval '30 days')",[ids.operator,ids.outsider]);
 await actor(db,ids.operator,{aal:'aal2'});
}
const cover=()=>({recipient_id:ids.outsider,capabilities:['read','delivery'],starts_at:new Date().toISOString(),ends_at:date(2),reason:'Named holiday cover'});

test('global owner queue filters tenants and rechecks role, MFA, guard and current session',async()=>{
 const db=await database();try{
  await actor(db,ids.client,{aal:'aal2'});assert.equal((await queue(db)).businesses.length,0);
  await actor(db,ids.operator);await assert.rejects(queue(db),/MFA/);
  await actor(db,ids.operator,{aal:'aal2'});assert.deepEqual((await queue(db)).businesses.map(x=>x.id),[ids.org]);
  await admin(db);await db.query("insert into wm.operator_assignments(organization_id,user_id,capabilities,active_until,revoked_at,created_at) values($1,$2,array['read'],now()+interval '1 day',null,now())",[ids.other,ids.operator]);
  await actor(db,ids.operator,{aal:'aal2'});assert.equal((await queue(db)).businesses.length,2);
  await admin(db);await db.query("update wm.tenant_guards set access_state='restricted' where organization_id=$1",[ids.other]);
  await actor(db,ids.operator,{aal:'aal2'});assert.equal((await queue(db)).businesses.length,1);
  await admin(db);await db.query('delete from auth.sessions where user_id=$1',[ids.operator]);
  await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(queue(db),/Session ended/);
 }finally{await db.close();}
});
test('cover is bounded, immutable, current-issuer dependent and immediately revoked',async()=>{
 const db=await database();try{
  await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(cmd(db,'owner.cover.assign',cover()),/coverage staff/);
  await staff(db);await assert.rejects(cmd(db,'owner.cover.assign',{...cover(),capabilities:['read','admin']}),/bounded subset/);
  await assert.rejects(cmd(db,'owner.cover.assign',{...cover(),ends_at:date(40)}),/expiry/);
  const input=cover(),key=crypto.randomUUID();const grant=await cmd(db,'owner.cover.assign',input,{key});assert.deepEqual(await cmd(db,'owner.cover.assign',input,{key}),grant);
  await assert.rejects(cmd(db,'owner.cover.assign',{...input,reason:'changed'},{key}),/different input/);
  await actor(db,ids.outsider,{aal:'aal2'});assert.deepEqual((await queue(db)).businesses.map(x=>x.id),[ids.org]);
  await assert.rejects(cmd(db,'owner.cover.assign',{...cover(),recipient_id:ids.client}),/operator capability/);
  await admin(db);await assert.rejects(db.query('update wm.owner_covers set reason=$1 where id=$2',['edited',grant.id]),/immutable/);
  await db.query('update wm.staff set revoked_at=now() where user_id=$1',[ids.operator]);
  await actor(db,ids.outsider,{aal:'aal2'});assert.equal((await queue(db)).businesses.length,0);
  await admin(db);await db.query('update wm.staff set revoked_at=null where user_id=$1',[ids.operator]);
  await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(cmd(db,'owner.cover.revoke',{cover_id:grant.id,expected_version:99,reason:'Done'}),/changed/);
  await cmd(db,'owner.cover.revoke',{cover_id:grant.id,expected_version:1,reason:'Done'});
  await actor(db,ids.outsider,{aal:'aal2'});assert.equal((await queue(db)).businesses.length,0);
  await admin(db);await assert.rejects(db.query('delete from wm.owner_cover_revocations where cover_id=$1',[grant.id]),/immutable/);
 }finally{await db.close();}
});
test('cover expiry, narrowed assignment and recovery generation remove access without a sweeper',async()=>{
 const db=await database();try{
  await staff(db);await cmd(db,'owner.cover.assign',cover());
  await admin(db);await db.query("update wm.operator_assignments set capabilities=array['read','people'] where user_id=$1",[ids.operator]);
  await actor(db,ids.outsider,{aal:'aal2'});assert.equal((await queue(db)).businesses.length,0);
  await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(cmd(db,'owner.cover.assign',cover()),/bounded subset/);
  await admin(db);await db.query("update wm.operator_assignments set capabilities=array['read','delivery','people'] where user_id=$1",[ids.operator]);
  await actor(db,ids.operator,{aal:'aal2'});await cmd(db,'owner.cover.assign',cover());
  await admin(db);await db.query('update wm.tenant_guards set recovery_generation=recovery_generation+1 where organization_id=$1',[ids.org]);
  await actor(db,ids.outsider,{aal:'aal2'});assert.equal((await queue(db)).businesses.length,0);
  await actor(db,ids.operator,{aal:'aal2'});await cmd(db,'owner.cover.assign',cover());
  await admin(db);await db.query("update wm.staff set active_until=now()-interval '1 second' where user_id=$1",[ids.outsider]);
  await actor(db,ids.outsider,{aal:'aal2'});assert.equal((await queue(db)).businesses.length,0);
 }finally{await db.close();}
});
test('cover own expiry and issuer assignment revocation remove access without altering base grants',async()=>{
 const db=await database();try{
  await staff(db);await cmd(db,'owner.cover.assign',{...cover(),ends_at:new Date(Date.now()+500).toISOString()});
  await actor(db,ids.outsider,{aal:'aal2'});assert.equal((await queue(db)).businesses.length,1);
  await new Promise(resolve=>setTimeout(resolve,550));assert.equal((await queue(db)).businesses.length,0);
  await actor(db,ids.operator,{aal:'aal2'});await cmd(db,'owner.cover.assign',cover());
  await admin(db);assert.equal(Number((await db.query('select count(*) n from wm.operator_assignments where user_id=$1',[ids.outsider])).rows[0].n),0);
  await db.query('update wm.operator_assignments set revoked_at=now() where user_id=$1',[ids.operator]);
  await actor(db,ids.outsider,{aal:'aal2'});assert.equal((await queue(db)).businesses.length,0);
 }finally{await db.close();}
});
test('date proposals preserve agreed dates until named customer acceptance and reject stale snapshots',async()=>{
 const db=await database();try{
  const {r}=await reviewable(db);
  const blocker=await command(db,'request_create',{engagement_id:ids.engagement,outcome:'Provide approved source content'});
  await admin(db);
  await db.query('insert into wm.dependencies(organization_id,request_id,blocking_request_id,reason,owner_user_id) values($1,$2,$3,$4,$5)',[ids.org,r.id,blocker.id,'Approved content arrives later',ids.operator]);
  const before=(await db.query('select * from wm.requests where id=$1',[r.id])).rows[0];
  await db.query('insert into wm.commitments(organization_id,engagement_id,request_id,deliverable,owner_user_id,due_at,next_update_at) values($1,$2,$3,$4,$5,$6,$7)',[ids.org,ids.engagement,r.id,'Confirmed delivery',ids.operator,before.due_at,before.next_contact_at]);
  await actor(db,ids.operator,{aal:'aal2'});
  const input={request_id:r.id,expected_version:before.version,blocking_request_id:blocker.id,due_at:date(3),next_contact_at:date(1),reason:'Dependency needs another day'};
  await assert.rejects(cmd(db,'owner.date.propose',{...input,due_at:'2026-12-01 12:00'}),/timezone/);
  await assert.rejects(cmd(db,'owner.date.propose',{...input,blocking_request_id:ids.otherEngagement}),/dependency/);
  const proposal=await cmd(db,'owner.date.propose',input);
  const shown=(await db.query('select public.wm_owner_dates($1) r',[ids.org])).rows[0].r.find(p=>p.id===proposal.id);
  assert.equal(shown.request_outcome,'Update the opening hours.');assert.equal(shown.engagement_title,'Synthetic website');assert.equal(shown.request_id,r.id);
  await admin(db);assert.equal(String((await db.query('select due_at from wm.requests where id=$1',[r.id])).rows[0].due_at),String(before.due_at));
  await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(cmd(db,'owner.date.decide',{proposal_id:proposal.id,expected_version:1,decision:'accept',reason:'Self approval'}),/customer decision/);
  await actor(db,ids.client);const key=crypto.randomUUID(),decision={proposal_id:proposal.id,expected_version:1,decision:'accept',reason:'Agreed revised date'};
  const accepted=await cmd(db,'owner.date.decide',decision,{key});assert.deepEqual(await cmd(db,'owner.date.decide',decision,{key}),accepted);
  await admin(db);assert.equal(new Date((await db.query('select due_at from wm.requests where id=$1',[r.id])).rows[0].due_at).toISOString(),input.due_at);
  assert.equal(new Date((await db.query('select due_at from wm.commitments where request_id=$1',[r.id])).rows[0].due_at).toISOString(),input.due_at);
  await assert.rejects(db.query('delete from wm.owner_date_proposals where id=$1',[proposal.id]),/immutable/);
  const current=(await db.query('select version from wm.requests where id=$1',[r.id])).rows[0];
  await actor(db,ids.operator,{aal:'aal2'});const stale=await cmd(db,'owner.date.propose',{...input,expected_version:current.version});
  await admin(db);await db.query("update wm.commitments set version=version+1 where request_id=$1",[r.id]);
  await actor(db,ids.client);await assert.rejects(cmd(db,'owner.date.decide',{...decision,proposal_id:stale.id}),/commitments changed/);
  await actor(db,ids.operator,{aal:'aal2'});await cmd(db,'owner.date.decide',{...decision,decision:'withdraw',proposal_id:stale.id});
  await actor(db,ids.client);await assert.rejects(cmd(db,'owner.date.decide',{...decision,proposal_id:stale.id}),/changed/);
  await actor(db,ids.outsider);await assert.rejects(db.query('select public.wm_owner_dates($1)',[ids.org]),/unavailable/);
 }finally{await db.close();}
});
test('capacity and estimates use actual SQL versions, idempotency, scoped logged time and deny raw grants',async()=>{
 const db=await database();try{
  const {r}=await reviewable(db);await actor(db,ids.operator,{aal:'aal2'});
  const input={week_start:week,timezone:'UTC',expected_version:0,available_minutes:600,other_minutes:60,contingency_minutes:60},key=crypto.randomUUID();
  const c=await cmd(db,'owner.capacity',input,{key});assert.deepEqual(await cmd(db,'owner.capacity',input,{key}),c);
  await assert.rejects(cmd(db,'owner.capacity',input),/changed/);
  await assert.rejects(cmd(db,'owner.capacity',{...input,expected_version:1,available_minutes:1}),/check constraint/);
  await assert.rejects(cmd(db,'owner.capacity',{...input,timezone:'Not/AZone'}),/timezone/);
  await cmd(db,'owner.estimate',{request_id:r.id,expected_version:0,minutes:120});
  await assert.rejects(cmd(db,'owner.estimate',{request_id:r.id,expected_version:1,minutes:1.2}),/Whole minutes/);
  await admin(db);await db.query("update wm.requests set due_at='2026-11-04T12:00:00Z' where id=$1",[r.id]);
  await db.query("insert into wm.time_entries(organization_id,engagement_id,operator_user_id,category,minutes,occurred_at) values($1,$2,$3,'direct',30,'2026-11-04T12:00:00Z')",[ids.org,ids.engagement,ids.operator]);
  await actor(db,ids.operator,{aal:'aal2'});const b=(await queue(db)).businesses[0];assert.equal(Number(b.estimated_remaining_minutes),120);assert.equal(Number(b.logged_minutes),30);
  const otherZone=(await db.query('select public.wm_owner_queue($1,$2,$3,null) r',['',week,'America/New_York'])).rows[0].r;assert.equal(otherZone.businesses[0].capacity_timezone_matches,false);
  const mismatchHtml=ownerViews({esc:x=>String(x??'')}).queue(otherZone);assert.match(mismatchHtml,/Allocation is stored in UTC/);assert.match(mismatchHtml,/name="expected_version" value="1"/);
  const changedZone=await cmd(db,'owner.capacity',{...input,timezone:'America/New_York',expected_version:1});assert.equal(changedZone.version,2);
  assert.equal((await queue(db,'unmatched')).businesses[0].requests.length,0);
  await assert.rejects(db.query('select * from wm.owner_covers'),/permission denied/);
  await actor(db,ids.viewer);await assert.rejects(cmd(db,'owner.estimate',{request_id:r.id,expected_version:1,minutes:30}),/operator capability/);
 }finally{await db.close();}
});
test('module adapter rejects unknown fields and UI escapes all record content',()=>{
 assert.throws(()=>validateOwnerCommand('owner.estimate',{request_id:ids.engagement,expected_version:0,minutes:1,admin:true}),/required fields/);
 assert.throws(()=>validateOwnerCommand('owner.cover.assign',{...cover(),ends_at:'tomorrow'}),/timezone/);
 const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 const html=ownerViews({esc}).queue({scope:'<script>',week_start:week,timezone:'UTC',businesses:[]});assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
});
