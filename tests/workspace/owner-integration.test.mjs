import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,command,ids,reviewable} from './database.mjs';
import {artifactManifest} from '../../worker/workspace/website/cloudflare.mjs';
const ownerCommand=async(db,name,input)=>(await db.query('select public.wm_owner_command($1,$2,$3,$4) r',[ids.org,name,input,crypto.randomUUID()])).rows[0].r;
async function cover(db,capabilities,duration=86400000){
 await admin(db);await db.query("insert into wm.staff(user_id,capabilities,active_until) values($1,array['coverage'],now()+interval '10 days'),($2,array['intake'],now()+interval '10 days')",[ids.operator,ids.outsider]);
 await actor(db,ids.operator,{aal:'aal2'});return ownerCommand(db,'owner.cover.assign',{recipient_id:ids.outsider,capabilities,starts_at:new Date().toISOString(),ends_at:new Date(Date.now()+duration).toISOString(),reason:'Explicit synthetic temporary duties'});
}
test('temporary reporting cover is recognized consistently without customer, financial or delivery authority',async()=>{
 const db=await database();try{
  const c=await cover(db,['read','reports']);await actor(db,ids.outsider,{aal:'aal2'});
  const businesses=(await db.query('select public.wm_businesses() r')).rows[0].r;assert.ok(businesses.some(b=>b.id===ids.org&&b.operator));
  const w=(await db.query('select public.wm_workspace($1) r',[ids.org])).rows[0].r;assert.deepEqual(w.viewer.capabilities.sort(),['read','reports']);assert.equal(w.viewer.role,null);assert.equal(w.can_manage_reports,true);assert.deepEqual(w.operator_data.operations,[]);
  await assert.rejects(command(db,'request_create',{engagement_id:ids.engagement,outcome:'Unlisted delivery duty'}),e=>e.code==='42501');
  await assert.rejects(db.query('select public.wm_people_command($1,$2,$3,$4)',[ids.org,'invitation.create',{email:'synthetic@example.invalid',role:'viewer'},crypto.randomUUID()]),e=>e.code==='42501');
  await admin(db);assert.equal((await db.query("select wm.analytics_operator($1,$2) ok,wm.operator_for($1,$2,'finance') finance,wm.operator_for($1,$2,'ads') ads",[ids.org,ids.outsider])).rows[0].ok,true);
  const raw=(await db.query('select count(*)::int n from wm.operator_assignments where organization_id=$1 and user_id=$2',[ids.org,ids.outsider])).rows[0].n;assert.equal(raw,0);
  await actor(db,ids.operator,{aal:'aal2'});await ownerCommand(db,'owner.cover.revoke',{cover_id:c.id,expected_version:1,reason:'Cover ended'});
  await actor(db,ids.outsider,{aal:'aal2'});await assert.rejects(db.query('select public.wm_workspace($1)',[ids.org]),e=>e.code==='42501');
  await admin(db);assert.equal((await db.query('select wm.analytics_operator($1,$2) ok',[ids.org,ids.outsider])).rows[0].ok,false);
 }finally{await db.close();}
});
async function publication(db,{duration=86400000,performer=ids.outsider}={}){
 const x=await reviewable(db),c=await cover(db,['read','delivery'],duration);
 await actor(db,performer,{aal:'aal2'});const website=async(name,input)=>(await db.query('select public.wm_website_command($1,$2,$3,$4) r',[ids.org,'website.'+name,input,crypto.randomUUID()])).rows[0].r;
 const t=await website('target',{engagement_id:ids.engagement,account_id:'a'.repeat(32),worker_name:'synthetic-cover',environment:'staging',origin:'https://cover.synthetic.example',dependency_revision:'cover-deps-1'});
 const version=crypto.randomUUID(),a=await artifactManifest([{name:'worker.mjs',type:'application/javascript+module',bytes:new TextEncoder().encode('export default {}')}],{main_module:'worker.mjs',bindings:[{type:'plain_text',name:'WM_RELEASE_MARKER',text:crypto.randomUUID()},{type:'version_metadata',name:'CF_VERSION_METADATA'}]});
 const identity={organization_id:ids.org,target_id:t.id,account_id:'a'.repeat(32),worker_name:'synthetic-cover',dependency_revision:'cover-deps-1',repository:'synthetic',commit_sha:'a'.repeat(40),ci_reference:'synthetic-ci'};
 await actor(db,ids.operator,{role:'service_role'});const uploaded=(await db.query('select public.wm_website_artifact_register($1,$2) r',[ids.org,{target_id:t.id,version_id:version,...a,repository:identity.repository,commit_sha:identity.commit_sha,ci_reference:identity.ci_reference,dependency_revision:identity.dependency_revision,upload_receipt:{state:'uploaded',version_id:version,artifact_digest:a.artifact_digest,account_id:identity.account_id,worker_name:identity.worker_name,build_identity:identity}}])).rows[0].r;
 await actor(db,performer,{aal:'aal2'});const rev=await website('preview',{request_id:x.r.id,expected_version:x.rev.version,artifact_id:uploaded.id,baseline_deployment_id:crypto.randomUUID(),summary:'Exact synthetic covered release',cost_effect:'Included',date_effect:'Tomorrow'});
 await actor(db,ids.client);const decision=await command(db,'decision_record',{request_id:x.r.id,expected_version:rev.version,revision_id:rev.id,digest:rev.digest,decision:'approve',shown_scope:'Exact artifact for the covered release'});
 await admin(db);await db.query("update wm.critical_receipts set durability_status='durable' where organization_id=$1",[ids.org]);await db.query('update wm.tenant_guards set positive_effects_allowed=true where organization_id=$1',[ids.org]);
 await actor(db,performer,{aal:'aal2'});const op=await command(db,'operation_prepare',{engagement_id:ids.engagement,request_id:x.r.id,revision_id:rev.id,digest:rev.digest,kind:'website_publish',expected_version:decision.version});return {op,c};
}
test('machine dispatch accepts an original delivery-cover actor, then revocation fences its pre-POST context',async()=>{
 const db=await database();try{
  const {op,c}=await publication(db);await actor(db,ids.operator,{role:'service_role'});
  const job=(await db.query('select public.wm_jobs_claim(25) r')).rows[0].r.find(j=>j.operation_id===op.id);
  const permit=(await db.query('select public.wm_attempt_begin($1,$2,$3,$4) r',[ids.org,job.id,job.lease_generation,'fixture-generation-1'])).rows[0].r;
  assert.equal(permit.operation.actor_id,ids.outsider);assert.ok(permit.context.artifact_id);
  await actor(db,ids.operator,{aal:'aal2'});await ownerCommand(db,'owner.cover.revoke',{cover_id:c.id,expected_version:1,reason:'Revoke before provider POST'});
  await actor(db,ids.operator,{role:'service_role'});await assert.rejects(db.query('select public.wm_website_effect_context($1,$2,$3)',[ids.org,permit.attempt.id,permit.attempt.dispatch_nonce]),e=>e.code==='42501');
  await admin(db);assert.equal((await db.query('select state from wm.operations where id=$1',[op.id])).rows[0].state,'in_flight');
 }finally{await db.close();}
});
test('staff revocation cancels queued effects and removes both direct and covered reads without a sweeper',async()=>{
 const db=await database();try{
  const {op}=await publication(db);await admin(db);await db.query('update wm.staff set revoked_at=clock_timestamp() where user_id=$1',[ids.operator]);
  assert.equal((await db.query('select state from wm.operations where id=$1',[op.id])).rows[0].state,'cancelled');
  await actor(db,ids.outsider,{aal:'aal2'});await assert.rejects(db.query('select public.wm_workspace($1)',[ids.org]),e=>e.code==='42501');
  await actor(db,ids.operator,{aal:'aal2'});assert.equal((await db.query('select public.wm_businesses() r')).rows[0].r.length,0);
 }finally{await db.close();}
});
test('loss of issuer verification fences cover and restoring old grant values cannot revive it',async()=>{
 const db=await database();try{
  await cover(db,['read','reports']);await admin(db);await db.query('update auth.users set email_confirmed_at=null where id=$1',[ids.operator]);
  assert.equal((await db.query("select wm.operator_for($1,$2,'reports') ok",[ids.org,ids.outsider])).rows[0].ok,false);
  await actor(db,ids.outsider,{aal:'aal2'});await assert.rejects(db.query('select public.wm_workspace($1)',[ids.org]),e=>e.code==='42501');
  await admin(db);await db.query('update auth.users set email_confirmed_at=now() where id=$1',[ids.operator]);
  const original=(await db.query('select capabilities from wm.staff where user_id=$1',[ids.operator])).rows[0].capabilities;
  await db.query("update wm.staff set capabilities=array['intake'] where user_id=$1",[ids.operator]);await db.query('update wm.staff set capabilities=$2 where user_id=$1',[ids.operator,original]);
  assert.equal((await db.query("select wm.operator_for($1,$2,'reports') ok",[ids.org,ids.outsider])).rows[0].ok,false);
 }finally{await db.close();}
});
test('an expired-only historical cover does not cancel unrelated current work or add a tenant receipt',async()=>{
 const db=await database();try{
  const {op}=await publication(db,{duration:200,performer:ids.operator});await new Promise(resolve=>setTimeout(resolve,250));await admin(db);
  const before=(await db.query('select authority_version,(select count(*)::int from wm.critical_receipts where organization_id=$1) receipts from wm.tenant_guards where organization_id=$1',[ids.org])).rows[0];
  await db.query("update wm.staff set capabilities=array['intake','coverage'] where user_id=$1",[ids.outsider]);
  const after=(await db.query('select authority_version,(select count(*)::int from wm.critical_receipts where organization_id=$1) receipts from wm.tenant_guards where organization_id=$1',[ids.org])).rows[0];assert.deepEqual(after,before);
  assert.equal((await db.query('select state from wm.operations where id=$1',[op.id])).rows[0].state,'pending');
 }finally{await db.close();}
});
test('a former issuer cannot affect a recipient through a different issuer current cover',async()=>{
 const db=await database();try{
  await cover(db,['read','reports'],200);await new Promise(resolve=>setTimeout(resolve,250));await admin(db);
  await db.query('update wm.operator_assignments set revoked_at=now() where organization_id=$1 and user_id=$2',[ids.org,ids.operator]);
  await db.query("insert into wm.staff(user_id,capabilities,active_until) values($1,array['coverage'],now()+interval '2 days')",[ids.viewer]);
  await db.query("insert into wm.operator_assignments(organization_id,user_id,capabilities,active_until) values($1,$2,array['read','people','reports'],now()+interval '2 days')",[ids.org,ids.viewer]);
  await actor(db,ids.viewer,{aal:'aal2'});await ownerCommand(db,'owner.cover.assign',{recipient_id:ids.outsider,capabilities:['read','reports'],starts_at:new Date().toISOString(),ends_at:new Date(Date.now()+86400000).toISOString(),reason:'New independent issuer'});
  await admin(db);const snapshot=async()=>(await db.query('select authority_version,(select count(*)::int from wm.critical_receipts where organization_id=$1) receipts from wm.tenant_guards where organization_id=$1',[ids.org])).rows[0];const before=await snapshot();
  await db.query("update wm.staff set capabilities=array['intake'] where user_id=$1",[ids.operator]);assert.deepEqual(await snapshot(),before);
  assert.equal((await db.query("select wm.operator_for($1,$2,'reports') ok",[ids.org,ids.outsider])).rows[0].ok,true);
 }finally{await db.close();}
});
