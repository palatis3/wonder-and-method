import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,command,ids,reviewable} from './database.mjs';
import {artifactManifest,websiteEffect,readWebsiteEffect,publicationLabel} from '../../worker/workspace/website/cloudflare.mjs';
import {dispatchJobs} from '../../worker/workspace/effects/dispatcher.mjs';
const target='40000000-0000-4000-8000-000000000001',artifact='40000000-0000-4000-8000-000000000002',version='40000000-0000-4000-8000-000000000003',baseline='40000000-0000-4000-8000-000000000004',deployment='40000000-0000-4000-8000-000000000005',marker='40000000-0000-4000-8000-000000000006';
const c={target_id:target,artifact_id:artifact,account_id:'a'.repeat(32),worker_name:'synthetic-client',environment:'staging',origin:'https://synthetic.example',version_id:version,baseline_deployment_id:baseline,artifact_digest:'b'.repeat(64),config_digest:'c'.repeat(64),release_marker:marker};
const env={ENVIRONMENT:'staging',CLOUDFLARE_WEBSITE_TOKEN:'synthetic-only',WEBSITE_TARGETS:JSON.stringify([c])};
const permit={context:c,operation:{id:'50000000-0000-4000-8000-000000000001',organization_id:ids.org,kind:'website_publish'},attempt:{id:'60000000-0000-4000-8000-000000000001',dispatch_nonce:'70000000-0000-4000-8000-000000000001',external_generation:'fixture-generation-1'}};
const deployed=(id=deployment)=>({id,strategy:'percentage',versions:[{version_id:version,percentage:100}],annotations:{'workers/message':publicationLabel(permit)}});
const reply=v=>Response.json({success:true,result:v});
function provider({timeout=false,superseded=false,drift=false}={}){
 let published=false,posts=0;const fetcher=async(url,o={})=>{url=new URL(url);
  if(url.origin===c.origin)return Response.json({version_id:version,release_marker:marker,nonce:url.searchParams.get('nonce')},{headers:{'Cache-Control':'no-store'}});
  assert.equal(url.origin,'https://api.cloudflare.com');assert.equal(o.headers.Authorization,'Bearer synthetic-only');
  if(url.pathname.endsWith('/versions/'+version))return reply({id:version});
  if(url.pathname.endsWith('/deployments')&&o.method==='POST'){posts++;published=true;assert.deepEqual(JSON.parse(o.body).versions,[{version_id:version,percentage:100}]);assert.equal(JSON.parse(o.body).force,undefined);if(timeout)throw Error('Synthetic lost response');return reply(deployed());}
  if(url.pathname.endsWith('/deployments/'+deployment))return reply(deployed());
  if(url.pathname.endsWith('/deployments'))return reply({deployments:published?(superseded?[{...deployed(baseline),annotations:{}},deployed()]:[deployed()]):[{id:drift?deployment:baseline}]});
  throw Error('Unexpected provider request');
 };return {fetcher,posts:()=>posts,publish:()=>{published=true;}};
}
const control=async()=>({access_state:'open',positive_effects_allowed:true,external_generation:'fixture-generation-1'});
test('website promotes exactly one uploaded version and separately checks current deployment and uncached runtime',async()=>{
 const p=provider(),calls=[];const rpc=async(_env,name,args)=>{calls.push(name);return name==='wm_website_effect_context'?c:{saved:true};};
 const result=await websiteEffect(env,permit,{rpc,fetcher:p.fetcher,readControl:control});assert.equal(p.posts(),1);assert.equal(result.version_id,version);assert.equal(result.runtime.release_marker,marker);assert.ok(calls.includes('wm_attempt_checkpoint'));
 const drift=provider({drift:true});await assert.rejects(websiteEffect(env,permit,{rpc,fetcher:drift.fetcher,readControl:control}),e=>e.code==='website_baseline_changed');assert.equal(drift.posts(),0);
 await assert.rejects(websiteEffect({...env,WEBSITE_TARGETS:'[]'},permit,{rpc,fetcher:p.fetcher,readControl:control}),e=>e.code==='website_not_qualified');
});
test('accepted deployment with a lost response is reconciled through exact history without another POST; superseded remains unresolved',async()=>{
 const p=provider({timeout:true}),rpc=async()=>c;await assert.rejects(websiteEffect(env,permit,{rpc,fetcher:p.fetcher,readControl:control}));assert.equal(p.posts(),1);
 const proof=await readWebsiteEffect(env,permit,{fetcher:p.fetcher});assert.equal(proof.deployment_id,deployment);assert.equal(p.posts(),1);
 const next=provider({superseded:true});next.publish();await assert.rejects(readWebsiteEffect(env,permit,{fetcher:next.fetcher}),e=>e.code==='website_applied_then_superseded');assert.equal(next.posts(),0);
});
test('trusted artifact hash covers final bytes/config, while the release marker avoids a self-referential build hash',async()=>{
 const metadata={main_module:'worker.mjs',bindings:[{type:'plain_text',name:'WM_RELEASE_MARKER',text:marker},{type:'version_metadata',name:'CF_VERSION_METADATA'}]},modules=[{name:'worker.mjs',type:'application/javascript+module',bytes:new TextEncoder().encode('export default {}')}];
 const a=await artifactManifest(modules,metadata),b=await artifactManifest([{...modules[0],bytes:new TextEncoder().encode('export default {fetch(){}}')}],metadata);assert.notEqual(a.artifact_digest,b.artifact_digest);assert.equal(a.manifest.release_marker,marker);assert.equal(JSON.parse(a.manifest_json).config_digest,a.config_digest);
 await assert.rejects(artifactManifest([{...modules[0],name:'../outside'}],metadata));
});
test('definitive pre-publication drift cancels the attempt without inventing an unknown remote write',async()=>{
 const p=provider({drift:true}),observed=[];
 const rpc=async(_env,name,args)=>{if(name==='wm_jobs_claim')return [{id:'job',organization_id:ids.org,kind:'website_publish',lease_generation:1}];if(name==='wm_attempt_begin')return permit;if(name==='wm_website_effect_context')return c;if(name==='wm_attempt_observe'){observed.push(args);return {};}throw Error('Unexpected RPC '+name);};
 await dispatchJobs({...env,EFFECTS_ENABLED:'true',WEBSITE_PUBLICATION_ENABLED:'true'},{rpc,fetcher:p.fetcher,readControl:control,journal:async()=>{}});
 assert.equal(p.posts(),0);assert.equal(observed[0].p_kind,'cancelled_before_dispatch');assert.equal(observed[0].p_evidence.code,'website_baseline_changed');
});
test('only a trusted upload can bind an artifact; publication freezes the approved target and rejects cross-work or mismatched proof',async()=>{
 const db=await database();try{
 const x=await reviewable(db);await actor(db,ids.operator,{aal:'aal2'});const website=async(name,input)=>(await db.query('select public.wm_website_command($1,$2,$3,$4) r',[ids.org,'website.'+name,input,crypto.randomUUID()])).rows[0].r;
 const t=await website('target',{engagement_id:ids.engagement,account_id:c.account_id,worker_name:c.worker_name,environment:'staging',origin:c.origin,dependency_revision:'fixture-dependencies-v1'});
 const metadata={main_module:'worker.mjs',bindings:[{type:'plain_text',name:'WM_RELEASE_MARKER',text:marker},{type:'version_metadata',name:'CF_VERSION_METADATA'}]};const a=await artifactManifest([{name:'worker.mjs',type:'application/javascript+module',bytes:new TextEncoder().encode('export default {}')}],metadata);
 const data={target_id:t.id,version_id:version,...a,repository:'synthetic-repository',commit_sha:'a'.repeat(40),ci_reference:'synthetic-build-1',dependency_revision:'fixture-dependencies-v1',upload_receipt:{state:'uploaded',version_id:version,artifact_digest:a.artifact_digest,account_id:c.account_id,worker_name:c.worker_name,build_identity:{organization_id:ids.org,target_id:t.id,account_id:c.account_id,worker_name:c.worker_name,dependency_revision:'fixture-dependencies-v1',repository:'synthetic-repository',commit_sha:'a'.repeat(40),ci_reference:'synthetic-build-1'}}};
 await assert.rejects(db.query('select public.wm_website_artifact_register($1,$2)',[ids.org,data]),/permission denied/);
 await actor(db,ids.operator,{role:'service_role'});const uploaded=(await db.query('select public.wm_website_artifact_register($1,$2) r',[ids.org,data])).rows[0].r;
 await actor(db,ids.operator,{aal:'aal2'});const rev=await website('preview',{request_id:x.r.id,expected_version:x.rev.version,artifact_id:uploaded.id,baseline_deployment_id:baseline,summary:'Immutable synthetic website',cost_effect:'Included',date_effect:'Tomorrow'});
 await actor(db,ids.client);const d=await command(db,'decision_record',{request_id:x.r.id,expected_version:rev.version,revision_id:rev.id,digest:rev.digest,decision:'approve',shown_scope:'Exact synthetic uploaded artifact'});
 await admin(db);await db.query("update wm.tenant_guards set positive_effects_allowed=true where organization_id=$1",[ids.org]);await db.query("update wm.critical_receipts set durability_status='durable',persisted_at=now(),external_key='synthetic-external-evidence' where organization_id=$1",[ids.org]);
 await actor(db,ids.operator,{aal:'aal2'});const op=await command(db,'operation_prepare',{engagement_id:ids.engagement,request_id:x.r.id,revision_id:rev.id,digest:rev.digest,kind:'website_publish',expected_version:d.version});
 await actor(db,ids.operator,{role:'service_role'});const jobs=(await db.query('select public.wm_jobs_claim(25) r')).rows[0].r,job=jobs.find(j=>j.operation_id===op.id);const p=(await db.query('select public.wm_attempt_begin($1,$2,$3,$4) r',[ids.org,job.id,job.lease_generation,'fixture-generation-1'])).rows[0].r;
 assert.equal(p.context.artifact_id,uploaded.id);assert.equal(p.context.version_id,version);assert.equal(p.context.release_marker,marker);
 await admin(db);await db.query("update wm.operator_assignments set active_until=clock_timestamp()-interval '1 second' where organization_id=$1 and user_id=$2",[ids.org,ids.operator]);await actor(db,ids.operator,{role:'service_role'});
 await assert.rejects(db.query('select public.wm_website_effect_context($1,$2,$3)',[ids.org,p.attempt.id,p.attempt.dispatch_nonce]),/operator is no longer authorized/);
 await admin(db);await db.query("update wm.operator_assignments set active_until=clock_timestamp()+interval '1 year' where organization_id=$1 and user_id=$2",[ids.org,ids.operator]);await actor(db,ids.operator,{role:'service_role'});
 await assert.rejects(db.query('select public.wm_attempt_resolve($1,$2,$3,$4)',[ids.org,p.attempt.id,p.attempt.dispatch_nonce,{settled:true,readback_matches:true,evidence_reference:'bad fixture',artifact_id:uploaded.id,artifact_digest:'f'.repeat(64)}]),/readback does not match/);
 await actor(db,ids.client);await command(db,'decision_record',{request_id:x.r.id,revision_id:rev.id,digest:rev.digest,decision:'withdraw',shown_scope:'Withdrawing exact fixture approval'});
 await actor(db,ids.operator,{role:'service_role'});await assert.rejects(db.query('select public.wm_website_effect_context($1,$2,$3)',[ids.org,p.attempt.id,p.attempt.dispatch_nonce]),/authority changed|approval/);
 await actor(db,ids.operator,{aal:'aal2'});const w=(await db.query('select public.wm_workspace($1) r',[ids.org])).rows[0].r,current=w.requests.find(r=>r.id===x.r.id),manifest=w.revisions.find(v=>v.id===rev.id).manifest;
 const falsePreview=await command(db,'revision_create',{request_id:x.r.id,expected_version:current.version,kind:'web_preview',manifest:{...manifest,target:'https://wrong-displayed-origin.example',target_id:crypto.randomUUID(),config_digest:'f'.repeat(64)},summary:'Misleading website destination fixture',cost_effect:'Included',date_effect:'Tomorrow'});
 await actor(db,ids.client);const falseDecision=await command(db,'decision_record',{request_id:x.r.id,expected_version:falsePreview.version,revision_id:falsePreview.id,digest:falsePreview.digest,decision:'approve',shown_scope:'Displayed wrong target fixture'});await actor(db,ids.operator,{aal:'aal2'});
 const bad=await command(db,'operation_prepare',{engagement_id:ids.engagement,request_id:x.r.id,revision_id:falsePreview.id,digest:falsePreview.digest,kind:'website_publish',expected_version:falseDecision.version});await actor(db,ids.operator,{role:'service_role'});const badJobs=(await db.query('select public.wm_jobs_claim(25) r')).rows[0].r,badJob=badJobs.find(j=>j.operation_id===bad.id);
 await assert.rejects(db.query('select public.wm_attempt_begin($1,$2,$3,$4)',[ids.org,badJob.id,badJob.lease_generation,'fixture-generation-1']),/artifact bindings changed/);
 }finally{await db.close();}
});
