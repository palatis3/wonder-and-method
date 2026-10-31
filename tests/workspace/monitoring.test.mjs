import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,ids} from './database.mjs';
import {completeMonitoring,runtimeAssessment} from '../../worker/workspace/monitoring/service.mjs';
import {scheduledWork} from '../../worker/workspace/effects/dispatcher.mjs';
const healthy={queued_stale:0,unknown_stale:0,stops_stale:0,receipt_conflicts:0,receipts_stale:0,backup_schedules:1,backup_authority_attention:0,backup_overdue:0,backup_attention:0};
const results={receipts:{},reconciliation:{},effects:{},backup_schedules:{},tenant_backups:{}};
const config=Object.fromEntries(['workspace','dispatch','backups'].map((name,i)=>[name,{url:`https://hc-ping.com/10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,owner_reference:'Synthetic operator',cover_reference:'Synthetic cover'}]));
const env={MONITORING_ENABLED:'true',WORKSPACE_MONITORS:JSON.stringify(config)};
test('only the service identity can read bounded aggregate health, and conflicts are actionable without tenant disclosure',async()=>{
 const db=await database();try{
  await actor(db,ids.client);await assert.rejects(db.query('select public.wm_runtime_health()'),/permission denied/);
  await admin(db);await db.query("select wm.critical($1,'synthetic',$2,'{}')",[ids.org,crypto.randomUUID()]);const receipt=(await db.query('select id from wm.critical_receipts where organization_id=$1',[ids.org])).rows[0].id;
  await actor(db,ids.operator,{role:'service_role'});await db.query('select public.wm_receipt_conflict($1,$2)',[ids.org,receipt]);
  const m=(await db.query('select public.wm_runtime_health() r')).rows[0].r;assert.equal(m.receipt_conflicts,1);assert.equal(m.queued_stale,0);assert.equal(JSON.stringify(m).includes(ids.org),false);assert.equal(Object.keys(m).length,9);
 }finally{await db.close();}
});
test('class-specific failures and missed or disabled required stages never create a healthy overall heartbeat',()=>{
 const ordinary=runtimeAssessment(healthy,{results,failed:['inbound']});assert.equal(ordinary.workspace.healthy,false);assert.equal(ordinary.dispatch.healthy,true);assert.equal(ordinary.backups.healthy,true);
 const stale=runtimeAssessment({...healthy,unknown_stale:1,backup_overdue:1},{results});assert.equal(stale.dispatch.healthy,false);assert.equal(stale.backups.healthy,false);assert.equal(stale.workspace.healthy,false);
 assert.equal(runtimeAssessment(healthy,{results:{...results,effects:{disabled:true}}}).dispatch.healthy,false);
 assert.equal(runtimeAssessment({...healthy,backup_schedules:0},{results}).backups.healthy,false);assert.throws(()=>runtimeAssessment({...healthy,queued_stale:null},{results}));
 const failed=runtimeAssessment(healthy,{results:{...results,receipts:{saved:0,failed:1},tenant_backups:[{state:'attention',recorded:false}]}});assert.equal(failed.dispatch.healthy,false);assert.equal(failed.backups.healthy,false);assert.equal(failed.workspace.healthy,false);
 const {backup_schedules,tenant_backups,...absent}=results;assert.equal(runtimeAssessment(healthy,{results:absent}).backups.healthy,false);
});
test('independent pings carry only class/category codes, respect fixed secret endpoints and require actual acknowledgment',async()=>{
 const sent=[];const fetcher=async(url,options)=>{sent.push({url,options});return new Response('OK');};
 const status=await completeMonitoring(env,{results,failed:['inbound']},{call:async()=>healthy,fetcher});assert.equal(status.attention,true);assert.equal(sent.length,3);
 assert.ok(sent.some(x=>x.url===config.workspace.url+'/fail'));assert.ok(sent.some(x=>x.url===config.dispatch.url));assert.equal(sent.every(x=>x.options.redirect==='error'),true);
 for(const x of sent){const body=JSON.parse(x.options.body);assert.deepEqual(Object.keys(body).sort(),['categories','class','service','status']);assert.equal(JSON.stringify(body).includes(config.workspace.url),false);}
 await assert.rejects(completeMonitoring(env,{results},{call:async()=>healthy,fetcher:async()=>new Response('OK (not found)')}),/monitoring needs attention/);
 await assert.rejects(completeMonitoring({...env,WORKSPACE_MONITORS:JSON.stringify({...config,backups:{...config.backups,url:'https://unreviewed.example/secret'}})},{results},{call:async()=>{throw Error('must not run');},fetcher}),/monitoring needs attention/);
 assert.deepEqual(await completeMonitoring({},{}),{disabled:true});
});
test('database outage reports failure on every independent check and a failed ping does not suppress other classes',async()=>{
 const sent=[];await assert.rejects(completeMonitoring(env,{results},{call:async()=>{throw Error('Sensitive synthetic database detail');},fetcher:async(url,o)=>{sent.push({url,body:o.body});return new Response(url===config.dispatch.url+'/fail'?'rate limited':'OK');}}));
 assert.equal(sent.length,3);assert.equal(sent.every(x=>x.url.endsWith('/fail')),true);assert.equal(sent.some(x=>x.body.includes('Sensitive')),false);
});
test('scheduler monitoring receives completion and errors after every independent stage has run',async()=>{
 const stages=['inbound_inventory','inbound','periods','receipts','notification_digests','reconciliation','effects','notification_delivery','customer_exports','backup_schedules','tenant_backups','billing','refunds','analytics'],seen=[];
 const overrides=Object.fromEntries(stages.map(name=>[name,async()=>{seen.push(name);if(name==='inbound')throw Error('Synthetic stage failure');return {};} ]));
 overrides.monitoring=async(_env,run)=>{assert.deepEqual(seen,stages);assert.deepEqual(run.failed,['inbound']);assert.deepEqual(run.results.effects,{});return {attention:true};};
 await assert.rejects(scheduledWork({},overrides),/inbound/);
});
