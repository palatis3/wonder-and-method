import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,ids} from './database.mjs';
import {digest,canonical} from '../../src/workspace/domain/contracts.mjs';
import {fetchAnalyticsProfile,verifyAnalyticsBinding,verifyAnalyticsProfileAccess,inspectAnalyticsUrl,exactDecimal,searchFreshness,zonedDayBoundary,calendarShift,reportingRead} from '../../worker/workspace/analytics/read.mjs';
import {analyticsSummary,runAnalytics} from '../../worker/workspace/analytics/service.mjs';
import {displayExactMetric} from '../../src/workspace/domain/reporting.mjs';
const binding={provider:'analytics',account_id:'properties/123',currency:'USD',timezone:'America/New_York',stream_ids:['456'],hostnames:['synthetic.example'],event_names:['generate_lead']};
const token='synthetic-access-token';
const fixtureDay=calendarShift(new Date().toISOString().slice(0,10),-2);
function gaFixture({metric='sessions',blocked=false,pages,changeConfig=false}={}){
 let reports=0,properties=0;const requests=[];
 const fetcher=async(url,options)=>{requests.push({url,body:options.body?JSON.parse(options.body):null});
  if(url==='https://analyticsadmin.googleapis.com/v1beta/properties/123'){properties++;return Response.json({name:'properties/123',currencyCode:'USD',timeZone:changeConfig&&properties>1?'UTC':'America/New_York'});}
  if(url.includes('/dataStreams?'))return Response.json({dataStreams:[{name:'properties/123/dataStreams/456',type:'WEB_DATA_STREAM'}]});if(url.includes('/keyEvents?'))return Response.json({keyEvents:[]});
  const names=metric==='totalRevenue'?['totalRevenue']:['sessions','engagedSessions','keyEvents'],dims=metric==='totalRevenue'?['date']:['date','sessionDefaultChannelGroup'];
  const type=name=>name==='totalRevenue'?'TYPE_CURRENCY':name==='keyEvents'?'TYPE_FLOAT':'TYPE_INTEGER';
  if(url.endsWith('/metadata'))return Response.json({dimensions:dims.map(apiName=>({apiName})),metrics:names.map(apiName=>({apiName,type:type(apiName),...(blocked?{blockedReasons:['NO_REVENUE_METRICS']}:{})}))});
  if(url.endsWith(':checkCompatibility'))return Response.json({metricCompatibilities:names.map(apiName=>({metricMetadata:{apiName},compatibility:'COMPATIBLE'})),dimensionCompatibilities:dims.map(apiName=>({dimensionMetadata:{apiName},compatibility:'COMPATIBLE'}))});
  if(url.endsWith(':runReport')){const entry=pages?.[reports++];return Response.json({dimensionHeaders:dims.map(name=>({name})),metricHeaders:names.map(name=>({name,type:type(name)})),metadata:{currencyCode:'USD',timeZone:'America/New_York',subjectToThresholding:true},...entry});}throw Error('Unexpected fixture endpoint');
 };return {fetcher,requests};
}
test('GA imports preserve huge exact metrics, fixed scope, all pages and quality; restricted zero remains unavailable',async()=>{
 const row=channel=>({dimensionValues:[{value:'20261028'},{value:channel}],metricValues:[{value:'900719925474099312345'},{value:'2'},{value:'0.125'}]});
 const f=gaFixture({pages:[{rowCount:2,rows:[row('Direct')]},{rowCount:2,rows:[row('Search')]}]}),normalized=[];
 const result=await fetchAnalyticsProfile(binding,token,{profile:'ga_acquisition_daily_v1',start:'2026-10-28',fetcher:f.fetcher,normalizedPage:async p=>normalized.push(p)});
 assert.equal(result.row_count,2);assert.equal(result.preview_rows[0].values.sessions.value,'900719925474099312345');assert.equal(result.preview_rows[0].values.keyEvents.value,'0.125');assert.deepEqual(result.quality,['non_atomic_observation','thresholded']);assert.equal(normalized.length,2);
 const requests=f.requests.filter(x=>x.url.endsWith(':runReport'));assert.deepEqual(requests.map(x=>x.body.offset),['0','1']);assert.deepEqual(requests[0].body.dimensionFilter.andGroup.expressions.map(x=>x.filter.fieldName),['streamId','hostName']);
 const b=gaFixture({metric:'totalRevenue',blocked:true,pages:[{rowCount:1,rows:[{dimensionValues:[{value:'20261028'}],metricValues:[{value:'0'}]}]}]});const restricted=await fetchAnalyticsProfile(binding,token,{profile:'ga_revenue_daily_v1',start:'2026-10-28',fetcher:b.fetcher});assert.equal(restricted.preview_rows[0].values.totalRevenue.value,null);assert.equal(analyticsSummary(restricted)[0].value,null);assert.equal(restricted.quality.includes('restricted'),true);
});
test('unsteady GA pages and changed configuration fail safely; empty results remain no reported data',async()=>{
 const row=channel=>({dimensionValues:[{value:'20261028'},{value:channel}],metricValues:[{value:'1'},{value:'1'},{value:'1'}]});
 const f=gaFixture({pages:[{rowCount:2,rows:[row('Direct')]},{rowCount:3,rows:[row('Search')]}]});await assert.rejects(fetchAnalyticsProfile(binding,token,{profile:'ga_acquisition_daily_v1',start:'2026-10-28',fetcher:f.fetcher}),e=>e.code==='analytics_unsteady_pages');
 const c=gaFixture({changeConfig:true,pages:[{rowCount:0,rows:[]}]});await assert.rejects(fetchAnalyticsProfile(binding,token,{profile:'ga_acquisition_daily_v1',start:'2026-10-28',fetcher:c.fetcher}),e=>e.code==='analytics_configuration_changed');
 const empty=gaFixture({pages:[{rowCount:0,rows:[]}]});const r=await fetchAnalyticsProfile(binding,token,{profile:'ga_acquisition_daily_v1',start:'2026-10-28',fetcher:empty.fetcher});assert.equal(r.value_state,'no_reported_row');assert.equal(r.row_count,0);
});
test('Search Console enumerates exposed rows to an empty page without claiming exhaustive data; freshness spellings and URL scope are checked',async()=>{
 const sc={provider:'search_console',account_id:'sc-domain:synthetic.example',timezone:'America/Los_Angeles',currency:null};let pages=0;const fetcher=async(url,options)=>url.endsWith('/searchAnalytics/query')?Response.json(pages++?{}:{rows:[{keys:['2026-10-28','a query'],clicks:2,impressions:5,ctr:0.4,position:3.125}],responseAggregationType:'byProperty',metadata:{firstIncompleteDate:'2026-10-28'}}):Response.json({siteUrl:sc.account_id,permissionLevel:'siteRestrictedUser'});
 const result=await fetchAnalyticsProfile(sc,token,{profile:'sc_daily_queries_v1',start:'2026-10-28',fetcher});assert.equal(pages,2);assert.equal(result.collection,'complete_exposed_result');assert.equal(result.freshness,'provisional');assert.equal(result.preview_rows[0].values.ctr.value,'0.4');assert.equal(result.quality.includes('top_rows'),true);assert.equal(result.quality.includes('privacy_omissions'),true);
 assert.equal(searchFreshness({first_incomplete_date:'2026-10-28'}).first_incomplete_date,'2026-10-28');assert.throws(()=>searchFreshness({firstIncompleteDate:'2026-10-28',first_incomplete_date:'2026-10-29'}),e=>e.code==='analytics_freshness_conflict');
 let calls=0;await assert.rejects(inspectAnalyticsUrl(sc,token,'https://synthetic.example.evil.invalid/page',{fetcher:async()=>{calls++;}}),e=>e.code==='analytics_scope');assert.equal(calls,0);
});
test('reporting calendar uses zoned 23/25-hour days and preserves decimal precision and error classifications',async()=>{
 const hours=day=>(Date.parse(zonedDayBoundary(calendarShift(day,1),'America/New_York'))-Date.parse(zonedDayBoundary(day,'America/New_York')))/3600000;
 assert.equal(hours('2026-03-08'),23);assert.equal(hours('2026-11-01'),25);assert.equal(exactDecimal('900719925474099312345'),'900719925474099312345');assert.equal(exactDecimal('1.23456789e-2'),'0.0123456789');assert.throws(()=>exactDecimal('NaN'));
 assert.equal(displayExactMetric('0.4','fraction'),'40%');assert.equal(displayExactMetric('0.00000003','fraction'),'0.000003%');assert.equal(displayExactMetric('-12.3456789','currency','USD'),'USD -12.3456789');
 const observed=[];await assert.rejects(reportingRead('https://analyticsdata.googleapis.com/v1beta/properties/123:runReport',token,{fetcher:async()=>Response.json({error:{status:'RESOURCE_EXHAUSTED'}},{status:429}),record:async x=>observed.push(x)}),e=>e.code==='analytics_quota_deferred');assert.equal(observed[0].outcome,'analytics_quota_deferred');assert.equal(JSON.stringify(observed).includes(token),false);
});
test('publication probes current Data API access and detects restriction-only drift even when all Admin resources remain readable',async()=>{
 const row={dimensionValues:[{value:'20261028'}],metricValues:[{value:'0'}]};
 const old=gaFixture({metric:'totalRevenue',pages:[{rowCount:1,rows:[row]}]}),staged=await fetchAnalyticsProfile(binding,token,{profile:'ga_revenue_daily_v1',start:'2026-10-28',fetcher:old.fetcher});
 const current=gaFixture({metric:'totalRevenue',blocked:true,pages:[{rowCount:1,rows:[row]}]}),fresh=await verifyAnalyticsProfileAccess(binding,token,{profile:'ga_revenue_daily_v1',start:'2026-10-28',fetcher:current.fetcher});assert.notEqual(fresh.configuration_hash,staged.configuration_hash);
 let dataReads=0,claimed=false;const outcomes=[],job={organization_id:ids.org,id:'40000000-0000-4000-8000-000000000061',lease_generation:2,ticket_nonce:'40000000-0000-4000-8000-000000000062',kind:'report',status:'publishing',profile:'ga_revenue_daily_v1',day:'2026-10-28'};
 const context={binding,job:{...job,external_generation:'fixture-generation-1'},connection:{organization_id:ids.org,id:'40000000-0000-4000-8000-000000000063',engagement_id:ids.engagement,provider:'analytics',environment:'production',ciphertext:'fixture',version:1}};
 const rpc=async(_e,name,args)=>{if(name==='wm_analytics_schedule')return 0;if(name==='wm_analytics_claim'){if(claimed)return null;claimed=true;return job;}if(name==='wm_analytics_context')return context;if(name==='wm_analytics_page')return {};if(name==='wm_analytics_finish'){outcomes.push(args.p_result);return {state:args.p_result.error?'failed':'published'};}throw Error('Unexpected RPC '+name);};
 const adminReads=gaFixture({metric:'totalRevenue'});const result=await runAnalytics({ANALYTICS_ENABLED:'true'},{rpc,open:async()=>({access_token:token,config_fingerprint:'fixture'}),fingerprint:async()=>'fixture',readControl:async()=>({access_state:'open',external_generation:'fixture-generation-1'}),fetcher:async(url,options)=>{if(String(url).startsWith('https://analyticsdata.googleapis.com/')){dataReads++;return Response.json({error:{status:'PERMISSION_DENIED'}},{status:403});}return adminReads.fetcher(url,options);}});
 assert.equal(result.published,0);assert.equal(result.attention,1);assert.equal(dataReads,1);assert.deepEqual(outcomes,[{error:'analytics_permission_denied'}]);
});
async function seeded(db){
 await admin(db);const credential='40000000-0000-4000-8000-000000000051';
 await db.query("insert into wm.oauth_sessions(organization_id,id,engagement_id,provider,environment,actor_id,actor_kind,session_id,state_hash,browser_hash,verifier_ciphertext,authority_version,recovery_generation,external_generation,state) select $1,$2,$3,'analytics','production',$4,'customer_admin',$4,repeat('a',64),repeat('b',64),repeat('x',24),authority_version,recovery_generation,external_generation,'connected' from wm.tenant_guards where organization_id=$1",[ids.org,credential,ids.engagement,ids.client]);
 await db.query("insert into wm.integration_credentials(organization_id,id,engagement_id,provider,environment,authorized_by,actor_kind,oauth_session_id,recovery_generation,external_generation,ciphertext,key_version) select $1,$2,$3,'analytics','production',$4,'customer_admin',$2,recovery_generation,external_generation,repeat('x',24),'fixture' from wm.tenant_guards where organization_id=$1",[ids.org,credential,ids.engagement,ids.client]);
 const scope=(await db.query("insert into wm.provider_scopes(organization_id,engagement_id,provider,environment,account_id,currency,timezone,permissions,access_status,credential_id) values($1,$2,'analytics','production','properties/123','USD','America/New_York',array['read'],'read_verified',$3) returning id",[ids.org,ids.engagement,credential])).rows[0].id;
 await actor(db,ids.operator,{aal:'aal2'});const b=await cmd(db,'analytics.bind',{scope_id:scope,profiles:['ga_daily_v1'],stream_ids:['456'],hostnames:['synthetic.example'],event_names:[],auto_collect:false,consent_evidence:'Synthetic exact client-owned stream/domain scope.'});await admin(db);b.scope_key=(await db.query('select scope_key from wm.analytics_bindings where id=$1',[b.id])).rows[0].scope_key;return {binding:b,credential,scope};
}
const cmd=async(db,name,input,key=crypto.randomUUID())=>(await db.query('select public.wm_analytics_command($1,$2,$3,$4) r',[ids.org,name,input,key])).rows[0].r;
const jobArgs=j=>[j.organization_id,j.id,j.lease_generation,j.ticket_nonce];
const claim=async db=>(await db.query('select public.wm_analytics_claim() r')).rows[0].r;
async function stage(db,b,value='100',suffix='a',extra=true){
 await actor(db,ids.operator,{aal:'aal2'});const j=await cmd(db,'analytics.run',{binding_id:b.id,profile:'ga_daily_v1',day:fixtureDay});await actor(db,ids.operator,{role:'service_role'});const job=await claim(db);
 const rows=[{dimensions:['20261028'],values:{sessions:{value,state:'observed_number'}}}],hash=await digest(rows);await db.query('select public.wm_analytics_normalized($1,$2,$3,$4,$5,$6,$7)',[...jobArgs(job),0,canonical(rows),hash]);
 const result={digest:suffix.repeat(64),configuration_hash:'c'.repeat(64),scope_key:b.scope_key,profile:'ga_daily_v1',account_id:'properties/123',start:fixtureDay,row_count:1,page_manifest:[{page:0,rows:1,normalized_hash:hash}],summary_rows:[{metric:'sessions',unit:'count',value},...(extra?[{metric:'engaged_sessions',unit:'count',value:'70'}]:[])],observed_at:new Date().toISOString(),freshness:'provisional'};
 await db.query('select public.wm_analytics_finish($1,$2,$3,$4,$5)',[...jobArgs(job),result]);await admin(db);return (await db.query('select * from wm.analytics_imports where id=$1',[j.id])).rows[0];
}
async function publish(db,j){await actor(db,ids.operator,{aal:'aal2'});await cmd(db,'analytics.promote',{id:j.id,expected_version:j.version,digest:j.result_digest});await actor(db,ids.operator,{role:'service_role'});const job=await claim(db);await db.query('select public.wm_analytics_finish($1,$2,$3,$4,$5)',[...jobArgs(job),{configuration_hash:'c'.repeat(64)}]);return job;}
test('analytics stages privately, publishes whole corrected partitions and never adds removed/old rows to current metrics',async()=>{
 const db=await database();try{
  const {binding:b}=await seeded(db),first=await stage(db,b);await actor(db,ids.client);assert.equal((await db.query('select public.wm_analytics_list($1) r',[ids.org])).rows[0].r.imports.length,0);await assert.rejects(cmd(db,'analytics.run',{binding_id:b.id,profile:'ga_daily_v1',day:'2026-10-28'}),/unavailable/);
  await publish(db,first);const correction=await stage(db,b,'95','b',false);await publish(db,correction);await admin(db);
  const current=(await db.query("select metric,value::text from wm.metric_snapshots m join wm.import_runs i on i.organization_id=m.organization_id and i.id=m.import_run_id where i.status='promoted' order by metric")).rows;assert.deepEqual(current,[{metric:'sessions',value:'95'}]);
  assert.equal((await db.query("select count(*)::int n from wm.metric_snapshots")).rows[0].n,3);assert.equal((await db.query("select count(*)::int n from wm.analytics_partitions")).rows[0].n,1);
  await actor(db,ids.client);assert.equal((await db.query('select public.wm_analytics_list($1) r',[ids.org])).rows[0].r.imports.length,1);await assert.rejects(db.query('select * from wm.analytics_pages'),/permission denied/);
 }finally{await db.close();}
});
test('a late old import, current authority revocation and expired lease cannot overwrite newer analytics publication; automatic scheduling deduplicates',async()=>{
 const db=await database();try{
  const {binding:b,credential}=await seeded(db),old=await stage(db,b,'100','d'),newer=await stage(db,b,'95','e');await publish(db,newer);
  await actor(db,ids.operator,{aal:'aal2'});await cmd(db,'analytics.promote',{id:old.id,expected_version:old.version,digest:old.result_digest});await actor(db,ids.operator,{role:'service_role'});const pending=await claim(db);await assert.rejects(db.query('select public.wm_analytics_finish($1,$2,$3,$4,$5)',[...jobArgs(pending),{configuration_hash:'c'.repeat(64)}]),/newer import/);
  await admin(db);await db.query("update wm.analytics_imports set status='failed' where id=$1",[old.id]);await db.query('update wm.analytics_bindings set auto_collect=true,next_refresh_at=now() where id=$1',[b.id]);await actor(db,ids.operator,{role:'service_role'});assert.equal((await db.query('select public.wm_analytics_schedule(3) n')).rows[0].n,13);assert.equal((await db.query('select public.wm_analytics_schedule(3) n')).rows[0].n,0);
  const job=await claim(db);await admin(db);await db.query("update wm.analytics_imports set lease_until=clock_timestamp()-interval '1 second' where id=$1",[job.id]);await actor(db,ids.operator,{role:'service_role'});await assert.rejects(db.query('select public.wm_analytics_context($1,$2,$3,$4)',jobArgs(job)),/lease changed/);
  await admin(db);await db.query("update wm.analytics_imports set lease_until=clock_timestamp()+interval '1 minute' where id=$1",[job.id]);await db.query('update wm.memberships set revoked_at=now() where organization_id=$1 and user_id=$2',[ids.org,ids.client]);await actor(db,ids.operator,{role:'service_role'});await assert.rejects(db.query('select public.wm_analytics_context($1,$2,$3,$4)',jobArgs(job)),/binding or authority changed/);
 }finally{await db.close();}
});
test('same-scope reauthorization replaces its period across binding IDs, while a different stream gets a separate explicit series',async()=>{
 const db=await database();try{
  const {binding:first,scope}=await seeded(db);await publish(db,await stage(db,first,'100','a'));
  const rebind=async(old,streams)=>{await actor(db,ids.operator,{aal:'aal2'});await cmd(db,'analytics.disable',{id:old.id,expected_version:old.version});const next=await cmd(db,'analytics.bind',{scope_id:scope,profiles:['ga_daily_v1'],stream_ids:streams,hostnames:['synthetic.example'],event_names:[],auto_collect:false,consent_evidence:'Synthetic exact scope reviewed again.'});await admin(db);next.scope_key=(await db.query('select scope_key from wm.analytics_bindings where id=$1',[next.id])).rows[0].scope_key;return next;};
  const sameScope=await rebind(first,['456']);assert.equal(sameScope.scope_key,first.scope_key);await publish(db,await stage(db,sameScope,'95','b'));await admin(db);assert.equal((await db.query('select count(*)::int n from wm.analytics_partitions')).rows[0].n,1);
  const different=await rebind(sameScope,['789']);assert.notEqual(different.scope_key,sameScope.scope_key);await publish(db,await stage(db,different,'80','d'));await admin(db);assert.equal((await db.query('select count(*)::int n from wm.analytics_partitions')).rows[0].n,2);assert.equal((await db.query("select count(*)::int n from wm.import_runs where status='promoted'")).rows[0].n,2);
 }finally{await db.close();}
});
