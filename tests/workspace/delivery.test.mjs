import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,command,ids,reviewable} from './database.mjs';
import {CATALOG} from '../../worker/workspace/commercial/catalog.mjs';
import {DELIVERY_TEMPLATES} from '../../worker/workspace/services/templates.mjs';
const call=async(db,name,input,key=crypto.randomUUID())=>(await db.query('select public.wm_delivery_command($1,$2,$3,$4) as r',[ids.org,'delivery.'+name,input,key])).rows[0].r;
const commercial=async(db,name,input)=>(await db.query('select public.wm_commercial_command($1,$2,$3,$4) as r',[ids.org,name,input,crypto.randomUUID()])).rows[0].r;
const workspace=async db=>(await db.query('select public.wm_workspace($1) as r',[ids.org])).rows[0].r;
async function setup(db){
 await actor(db,ids.operator,{aal:'aal2'});
 const p=await commercial(db,'proposal.create',{engagement_id:ids.engagement,catalog_id:'launch_site',variant:'standard',catalog_version:CATALOG[0].catalog_version,expected_version:1,starts_at:new Date(Date.now()+86400000).toISOString(),site_host:'synthetic.example',scope_note:'Synthetic website delivery fixture'});
 const sent=await commercial(db,'proposal.send',{id:p.id,expected_version:p.version});await actor(db,ids.client);let w=await workspace(db);const a=w.agreements.find(a=>a.id===p.id);
 await commercial(db,'agreement.accept',{id:p.id,expected_version:sent.version,consent:true,digest:a.digest,signer_name:'Synthetic owner'});
 const {r,rev}=await reviewable(db);await actor(db,ids.operator,{aal:'aal2'});const run=await call(db,'start',{request_id:r.id,agreement_id:a.id,period_key:'Website launch'});return {r,rev,run};
}
async function approve(db,{r,rev}){await actor(db,ids.client);await command(db,'decision_record',{request_id:r.id,expected_version:rev.version,revision_id:rev.id,digest:rev.digest,decision:'approve',shown_scope:'Synthetic approved website and exact artifact'});await actor(db,ids.operator,{aal:'aal2'});}
async function observe(db,run,rev,step_key,extra={}){const w=await workspace(db),version=w.delivery_runs.find(r=>r.id===run.id).version;return call(db,'observe',{id:run.id,expected_version:version,step_key,outcome:'passed',evidence:'Synthetic evidence fixture, not live verification',observed_at:new Date().toISOString(),revision_id:rev.id,...extra});}
test('every sold variant maps to the exact seeded delivery template including commerce, recurring work and handoff',async()=>{
 assert.equal(DELIVERY_TEMPLATES.length,CATALOG.length);for(const t of DELIVERY_TEMPLATES){assert.ok(t.steps.some(s=>s.key==='handoff'));assert.equal(new Set(t.steps.map(s=>s.key)).size,t.steps.length);}
 assert.ok(DELIVERY_TEMPLATES.find(t=>t.catalog_id==='storefront').steps.some(s=>s.key==='commerce'));
 assert.ok(DELIVERY_TEMPLATES.find(t=>t.catalog_id==='keep_running'&&t.variant==='commerce').steps.some(s=>s.key==='commerce'));
 const db=await database();try{const rows=(await db.query('select template from wm.delivery_templates')).rows;for(const t of DELIVERY_TEMPLATES)assert.deepEqual(rows.find(r=>r.template.catalog_id===t.catalog_id&&r.template.variant===t.variant).template,t);}finally{await db.close();}
});
test('delivery enforces approval, exact publication, destination receipt, handoff and all checks before completion',async()=>{
 const db=await database();try{
 const x=await setup(db);await assert.rejects(observe(db,x.run,x.rev,'approval'),/approved revision/);
 await actor(db,ids.client);await assert.rejects(call(db,'observe',{id:x.run.id,expected_version:1}),/unavailable/);
 await approve(db,x);await observe(db,x.run,x.rev,'inventory');await observe(db,x.run,x.rev,'production',{outcome:'failed'});await observe(db,x.run,x.rev,'approval');
 await assert.rejects(observe(db,x.run,x.rev,'publication'),/Verified provider publication/);
 await assert.rejects(observe(db,x.run,x.rev,'journey',{details:{submission_receipt:'accepted'}}),/test_authorization/);
 const op=crypto.randomUUID();await admin(db);await db.query(`insert into wm.operations(organization_id,id,engagement_id,request_id,revision_id,operation_key,kind,state,desired_digest,payload,positive_effect,authority_version,recovery_generation,external_generation,actor_id) values($1,$2,$3,$4,$5,$2::uuid::text,'website_publish','verified',$6,'{}',true,1,1,'fixture-generation-1',auth.uid())`,[ids.org,op,ids.engagement,x.r.id,x.rev.id,x.rev.digest]);await actor(db,ids.operator,{aal:'aal2'});
 await observe(db,x.run,x.rev,'publication',{operation_id:op});await observe(db,x.run,x.rev,'journey',{details:{test_authorization:'Fixture test authorized',submission_receipt:'Fixture submission 1',destination_receipt:'Fixture inbox receipt 1'}});
 await assert.rejects(observe(db,x.run,x.rev,'handoff'),/editable_source/);
 await observe(db,x.run,x.rev,'handoff',{details:{editable_source:'Fixture Git source',owner_access:'Fixture owner demonstrated edit access',licenses:'Original supplied work',recovery:'Fixture isolated restore proved',correction_period:'Accepted agreement correction period, exact dates supplied'}});
 let w=await workspace(db);await assert.rejects(call(db,'complete',{id:x.run.id,expected_version:w.delivery_runs[0].version,revision_id:x.rev.id}),/required delivery check/);
 await observe(db,x.run,x.rev,'production');w=await workspace(db);const input={id:x.run.id,expected_version:w.delivery_runs[0].version,revision_id:x.rev.id},key=crypto.randomUUID();const done=await call(db,'complete',input,key);assert.deepEqual(await call(db,'complete',input,key),done);
 w=await workspace(db);assert.equal(w.delivery_runs[0].status,'complete');assert.equal(w.requests.find(r=>r.id===x.r.id).state,'complete');assert.equal(w.delivery_observations.filter(o=>o.step_key==='production').length,2);
 await admin(db);await assert.rejects(db.query("update wm.delivery_observations set outcome='passed'"),/immutable/);
 await actor(db,ids.client);await assert.rejects(db.query('select * from wm.delivery_observations'),/permission denied/);
 }finally{await db.close();}
});
test('linked changed facts invalidate current approvals, cancel pending effects and retain historical impact evidence',async()=>{
 const db=await database();try{
 const x=await setup(db);const fact=(await db.query('select public.wm_service_command($1,$2,$3,$4) as r',[ids.org,'fact.confirm',{key:'opening_hours',value:'9–5',source:'Fixture owner'},crypto.randomUUID()])).rows[0].r;
 await call(db,'facts',{revision_id:x.rev.id,fact_ids:[fact.id]});await approve(db,x);await observe(db,x.run,x.rev,'approval');
 await assert.rejects(call(db,'facts',{revision_id:x.rev.id,fact_ids:[fact.id]}),/before the first decision/);
 const pending=await command(db,'operation_prepare',{engagement_id:ids.engagement,request_id:x.r.id,revision_id:x.rev.id,digest:x.rev.digest,kind:'website_publish',expected_version:x.rev.version+1});
 const reaffirmed=(await db.query('select public.wm_service_command($1,$2,$3,$4) as r',[ids.org,'fact.confirm',{key:'opening_hours',value:'9–5',source:'Owner reconfirmed same information',expected_version:fact.version},crypto.randomUUID()])).rows[0].r;
 assert.equal((await workspace(db)).fact_impacts.length,0);
 await db.query('select public.wm_service_command($1,$2,$3,$4)',[ids.org,'fact.confirm',{key:'opening_hours',value:'10–6',source:'Owner changed confirmed hours',expected_version:reaffirmed.version},crypto.randomUUID()]);
 const w=await workspace(db);assert.equal(w.fact_impacts.length,1);assert.equal(w.requests.find(r=>r.id===x.r.id).state,'changes_requested');assert.equal(w.operator_data.operations.find(o=>o.id===pending.id).state,'cancelled');
 await assert.rejects(observe(db,x.run,x.rev,'handoff'),/approved revision/);
 await actor(db,ids.client);const customer=await workspace(db);assert.equal(customer.fact_impacts.length,1);assert.equal(customer.delivery_observations.find(o=>o.step_key==='approval').outcome,'passed');
 await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(db.query('select public.wm_service_command($1,$2,$3,$4)',[ids.org,'request.progress',{request_id:x.r.id,state:'complete'},crypto.randomUUID()]),/delivery plan/);
 }finally{await db.close();}
});
test('expired linked facts fence approval, preparation and machine dispatch, and revoked decision-makers cannot complete delivery',async()=>{
 const db=await database();try{
 const x=await setup(db);const fact=(await db.query('select public.wm_service_command($1,$2,$3,$4) as r',[ids.org,'fact.confirm',{key:'current_offer',value:'Valid offer',source:'Fixture owner'},crypto.randomUUID()])).rows[0].r;
 await call(db,'facts',{revision_id:x.rev.id,fact_ids:[fact.id]});await approve(db,x);
 const op=await command(db,'operation_prepare',{engagement_id:ids.engagement,request_id:x.r.id,revision_id:x.rev.id,digest:x.rev.digest,kind:'website_publish',expected_version:x.rev.version+1});
 await admin(db);await db.exec('begin');await db.query("update wm.business_facts set valid_until=clock_timestamp()+interval '100 milliseconds' where id=$1",[fact.id]);await new Promise(resolve=>setTimeout(resolve,150));assert.equal((await db.query('select wm.revision_sources_current($1,$2) ok',[ids.org,x.rev.id])).rows[0].ok,false);await db.exec('commit');
 await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(command(db,'operation_prepare',{engagement_id:ids.engagement,request_id:x.r.id,revision_id:x.rev.id,digest:x.rev.digest,kind:'website_publish',expected_version:x.rev.version+1}),/facts changed or expired/);
 await actor(db,ids.client);await assert.rejects(command(db,'decision_record',{request_id:x.r.id,expected_version:x.rev.version+1,revision_id:x.rev.id,digest:x.rev.digest,decision:'approve',shown_scope:'Attempted stale reapproval'}),/facts changed or expired/);
 await actor(db,ids.operator,{role:'service_role',aal:'aal2'});const jobs=(await db.query('select public.wm_jobs_claim(25) as r')).rows[0].r,job=jobs.find(j=>j.operation_id===op.id);
 await assert.rejects(db.query('select public.wm_attempt_begin($1,$2,$3,$4)',[ids.org,job.id,job.lease_generation,'fixture-generation-1']),/facts changed or expired/);
 await admin(db);await db.query('update wm.business_facts set valid_until=null where id=$1',[fact.id]);await db.query("update wm.engagement_authorities set revoked_at=now() where organization_id=$1 and domain='content'",[ids.org]);await actor(db,ids.operator,{aal:'aal2'});
 await assert.rejects(observe(db,x.run,x.rev,'approval'),/approved revision/);
 }finally{await db.close();}
});
test('report evidence must match delivery work and period, and corrected source evidence blocks completion',async()=>{
 const db=await database();try{
 const x=await setup(db);await approve(db,x);await admin(db);
 await db.query(`update wm.delivery_runs set period_key='2026-10',template=jsonb_build_object('steps',jsonb_build_array(jsonb_build_object('key','results','title','Review results','gate','report','required',true))) where id=$1`,[x.run.id]);
 await actor(db,ids.operator,{aal:'aal2'});const report=async(name,input)=>(await db.query('select public.wm_reporting_command($1,$2,$3,$4) as r',[ids.org,'reporting.'+name,input,crypto.randomUUID()])).rows[0].r;
 const source={engagement_id:ids.engagement,source:'manual',account_reference:'synthetic',currency:'USD',timezone:'America/New_York',period_start:'2026-10-01T04:00:00Z',period_end:'2026-10-29T04:00:00Z',rows:[{metric:'clicks',value:'3',unit:'count',definition_version:'fixture-v1',observed_at:'2026-10-29T14:00:00Z',provisional:false}]};
 const imp=await report('stage',source);await report('promote',{id:imp.id,expected_version:1});let w=await workspace(db);
 const drafted=await report('draft',{engagement_id:ids.engagement,request_id:x.r.id,period_key:'2026-09',snapshot_ids:w.metrics.map(s=>s.id),summary:'Fixture only',limitations:'Synthetic fixture'});w=await workspace(db);const rep=w.reports.find(r=>r.id===drafted.id);
 await report('review',{id:rep.id,expected_version:1,digest:rep.digest});await report('publish',{id:rep.id,expected_version:2,digest:rep.digest});
 await assert.rejects(observe(db,x.run,x.rev,'results',{report_id:rep.id}),/this work and period/);
 await admin(db);await db.query("update wm.delivery_runs set period_key='2026-09' where id=$1",[x.run.id]);await actor(db,ids.operator,{aal:'aal2'});
 await observe(db,x.run,x.rev,'results',{report_id:rep.id});const correction=await report('stage',{...source,supersedes_id:imp.id,rows:source.rows.map(s=>({...s,value:'4'}))});await report('promote',{id:correction.id,expected_version:1});
 await assert.rejects(observe(db,x.run,x.rev,'results',{report_id:rep.id}),/current source evidence/);w=await workspace(db);
 await assert.rejects(call(db,'complete',{id:x.run.id,expected_version:w.delivery_runs[0].version,revision_id:x.rev.id}),/Report evidence has been superseded/);
 }finally{await db.close();}
});
