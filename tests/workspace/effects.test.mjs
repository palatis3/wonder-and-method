import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,command,ids} from './database.mjs';

async function fixture(db,{durable=true}={}) {
  await actor(db,ids.client);const r=await command(db,'request_create',{engagement_id:ids.engagement,outcome:'Launch the approved Search campaign.'});
  await actor(db,ids.operator,{aal:'aal2'});
  const accepted=await command(db,'request_accept',{request_id:r.id,expected_version:r.version,scope:'One managed Search campaign',coverage:'Accepted ads agreement',owner_id:ids.operator,due_at:new Date(Date.now()+86400000).toISOString(),next_contact_at:new Date(Date.now()+3600000).toISOString(),approver_id:ids.client});
  const rev=await command(db,'revision_create',{request_id:r.id,expected_version:accepted.version,kind:'campaign_package',manifest:{account_id:'1234567890',managed_resources:['customers/1234567890/campaigns/123'],currency:'USD',budget_minor:150000},summary:'Reviewed Search campaign',cost_effect:'$1,500 authorized media',date_effect:'Ready tomorrow'});
  await actor(db,ids.client);const decision=await command(db,'decision_record',{request_id:r.id,expected_version:rev.version,revision_id:rev.id,digest:rev.digest,decision:'approve',shown_scope:'Exact campaign, account and budget.'});
  await admin(db);const scope=crypto.randomUUID();
  await db.query(`insert into wm.provider_scopes(organization_id,id,engagement_id,provider,environment,account_id,currency,timezone,access_status) values($1,$2,$3,'google_ads','test','1234567890','USD','America/New_York','verified')`,[ids.org,scope,ids.engagement]);
  await db.query(`insert into wm.campaign_bindings(organization_id,provider_scope_id,resource_name,approved_revision_id) values($1,$2,'customers/1234567890/campaigns/123',$3)`,[ids.org,scope,rev.id]);
  await db.query(`insert into wm.budget_authorizations(organization_id,engagement_id,revision_id,authority_id,currency,total_minor,reserve_minor,period_key,valid_from,valid_until,allocation,routine_limits) select $1,$2,$3,id,'USD',150000,10000,'synthetic',now()-interval '1 day',now()+interval '1 month','{}','{}' from wm.engagement_authorities where organization_id=$1 and engagement_id=$2 and domain='spending'`,[ids.org,ids.engagement,rev.id]);
  await db.query(`update wm.tenant_guards set positive_effects_allowed=true where organization_id=$1`,[ids.org]);
  if(durable)await db.query(`update wm.critical_receipts set durability_status='durable',persisted_at=now(),external_key='synthetic-external-receipt' where organization_id=$1`,[ids.org]);
  await actor(db,ids.operator,{aal:'aal2'});
  const op=await command(db,'operation_prepare',{engagement_id:ids.engagement,request_id:r.id,revision_id:rev.id,digest:rev.digest,kind:'google_enable',expected_version:decision.version});
  return {op,rev,scope,decision};
}
async function machine(db){await actor(db,ids.operator,{role:'service_role',aal:'aal2'});}
async function claim(db){await machine(db);return (await db.query(`select public.wm_jobs_claim(10) as result`)).rows[0].result;}
async function begin(db,j){await machine(db);return (await db.query(`select public.wm_attempt_begin($1,$2,$3,$4) as result`,[ids.org,j.id,j.lease_generation,'fixture-generation-1'])).rows[0].result;}
async function resolve(db,a,{pause=false,...overrides}={}){await machine(db);return (await db.query(`select public.wm_attempt_resolve($1,$2,$3,$4::jsonb) as result`,[ids.org,a.id,a.dispatch_nonce,JSON.stringify({settled:true,readback_matches:true,evidence_reference:'synthetic-provider-readback',observed_at:new Date().toISOString(),...(pause?{observed_state:'PAUSED',complete_managed_set:true}:{}),...overrides})])).rows[0].result;}

test('late observations preserve terminal truth and provisional STOP converges after pre-dispatch cancellation',async()=>{
 const db=await database();try{
  await fixture(db);const positive=(await begin(db,(await claim(db))[0])).attempt;
  await actor(db,ids.client);await command(db,'ads_stop',{engagement_id:ids.engagement});
  const pause=(await begin(db,(await claim(db))[0])).attempt;
  assert.equal((await resolve(db,pause,{pause:true})).state,'observed_pending');
  await machine(db);await db.query(`select public.wm_attempt_observe($1,$2,$3,'cancelled_before_dispatch','{}',now())`,[ids.org,positive.id,positive.dispatch_nonce]);
  const final=(await begin(db,(await claim(db))[0])).attempt;
  assert.equal((await resolve(db,final,{pause:true})).state,'verified');
  await machine(db);await db.query(`select public.wm_attempt_observe($1,$2,$3,'timeout','{}',now())`,[ids.org,final.id,final.dispatch_nonce]);
  await admin(db);
  assert.equal((await db.query(`select state from wm.operation_attempts where id=$1`,[final.id])).rows[0].state,'resolved');
  assert.equal((await db.query(`select state from wm.stop_intents`)).rows[0].state,'verified');
  assert.equal((await db.query(`select count(*)::int as n from wm.critical_receipts where event_type='execution.verified'`)).rows[0].n,1);
 }finally{await db.close();}
});

test('an approval for Google cannot authorize a Meta operation; STOP covers every connected ad platform',async()=>{
 const db=await database();try{
  const {rev,decision}=await fixture(db);
  await assert.rejects(command(db,'operation_prepare',{engagement_id:ids.engagement,request_id:rev.request_id,revision_id:rev.id,digest:rev.digest,kind:'meta_enable',expected_version:decision.version}),/different advertising platform/);
  await admin(db);
  for(const provider of ['meta_ads','microsoft_ads','tiktok_ads','linkedin_ads'])await db.query(`insert into wm.provider_scopes(organization_id,engagement_id,provider,environment,account_id) values($1,$2,$3,'test','987654321')`,[ids.org,ids.engagement,provider]);
  await actor(db,ids.client);const stopped=await command(db,'ads_stop',{engagement_id:ids.engagement});assert.equal(stopped.stops.length,5);
  const jobs=await claim(db);assert.deepEqual(jobs.map(x=>x.kind).sort(),['google_pause','linkedin_pause','meta_pause','microsoft_pause','tiktok_pause']);
 }finally{await db.close();}
});
test('STOP cancels claimed-but-undispatched positive work and retains current managed resource identity',async()=>{
 const db=await database();try{
  const {op}=await fixture(db),jobs=await claim(db);assert.equal(jobs.length,1);
  await actor(db,ids.client);const stop=await command(db,'ads_stop',{engagement_id:ids.engagement});assert.equal(stop.state,'requested');
  await assert.rejects(begin(db,jobs[0]),/lease is no longer current/);
  await admin(db);assert.equal((await db.query(`select state from wm.operations where id=$1`,[op.id])).rows[0].state,'cancelled');
  assert.deepEqual((await db.query(`select managed_resources from wm.stop_intents`)).rows[0].managed_resources,['customers/1234567890/campaigns/123']);
 }finally{await db.close();}
});
test('pause remains provisional during a delayed enable, then re-pauses after the old enable resolves',async()=>{
 const db=await database();try{
  await fixture(db);const positive=await begin(db,(await claim(db))[0]);
  await actor(db,ids.client);const stopped=await command(db,'ads_stop',{engagement_id:ids.engagement});
  const pauseJob=(await claim(db)).find(j=>j.kind==='google_pause'),pause=await begin(db,pauseJob);
  assert.equal((await resolve(db,pause.attempt,{pause:true})).state,'observed_pending');
  const late=await resolve(db,positive.attempt);assert.ok(late.followup_pause);
  const again=await begin(db,(await claim(db)).find(j=>j.kind==='google_pause'));
  assert.equal((await resolve(db,again.attempt,{pause:true})).state,'verified');
  await admin(db);const state=(await db.query(`select state from wm.stop_intents where id=$1`,[stopped.stops[0].stop_id])).rows[0].state;assert.equal(state,'verified');
 }finally{await db.close();}
});
test('lease expiry after dispatch becomes attention, never a second provider attempt',async()=>{
 const db=await database();try{
  const {op}=await fixture(db);const j=(await claim(db))[0];await begin(db,j);
  await admin(db);await db.query(`update wm.outbox_jobs set lease_until=now()-interval '1 minute' where id=$1`,[j.id]);
  assert.equal((await claim(db)).length,0);
  await assert.rejects(begin(db,j),/lease is no longer current/);
  await admin(db);assert.equal((await db.query(`select count(*)::int as n from wm.operation_attempts where operation_id=$1`,[op.id])).rows[0].n,1);
 }finally{await db.close();}
});
test('pending independent evidence and restored generations prohibit positive dispatch',async()=>{
 const db=await database();try{
  await fixture(db,{durable:false});const j=(await claim(db))[0];await assert.rejects(begin(db,j),/evidence is pending/);
  await admin(db);await db.query(`update wm.critical_receipts set durability_status='durable'`);await db.query(`update wm.tenant_guards set external_generation='different-recovery-generation' where organization_id=$1`,[ids.org]);
  await assert.rejects(begin(db,j),/recovery verification/);
 }finally{await db.close();}
});
test('customer cannot invoke machine RPCs; HTTP response and timeout never mark an operation verified',async()=>{
 const db=await database();try{
  await actor(db,ids.client);await assert.rejects(db.query(`select public.wm_jobs_claim(10)`),/permission denied/);
  const {op}=await fixture(db),a=(await begin(db,(await claim(db))[0])).attempt;
  await machine(db);await db.query(`select public.wm_attempt_observe($1,$2,$3,'provider_response','{"status":200}'::jsonb,now())`,[ids.org,a.id,a.dispatch_nonce]);
  await admin(db);assert.equal((await db.query(`select state from wm.operations where id=$1`,[op.id])).rows[0].state,'in_flight');
  await machine(db);await db.query(`select public.wm_attempt_observe($1,$2,$3,'timeout','{}'::jsonb,now())`,[ids.org,a.id,a.dispatch_nonce]);
  await admin(db);assert.equal((await db.query(`select state from wm.operations where id=$1`,[op.id])).rows[0].state,'unknown');
  await assert.rejects(resolve(db,a,{settled:false}),/Settled provider/);
 }finally{await db.close();}
});
