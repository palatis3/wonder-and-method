import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,command,ids,reviewable} from './database.mjs';
import {parseMetricCsv,displayExactMetric} from '../../src/workspace/domain/reporting.mjs';
import {csvExport} from '../../src/workspace/domain/contracts.mjs';
const report=async(db,name,input,key=crypto.randomUUID())=>(await db.query('select public.wm_reporting_command($1,$2,$3,$4) as r',[ids.org,'reporting.'+name,JSON.stringify(input),key])).rows[0].r;
const metrics=()=>[{metric:'clicks',value:'25',unit:'count',definition_version:'source-v1',observed_at:'2026-10-29T14:00:00Z',provisional:false},{metric:'won',value:null,unit:'count',definition_version:'feedback-v1',observed_at:'2026-10-29T14:00:00Z',provisional:true},{metric:'cost',value:'1234567',unit:'micros',definition_version:'source-v1',observed_at:'2026-10-29T14:00:00Z',provisional:false}];
const input=()=>({engagement_id:ids.engagement,source:'manual',account_reference:'synthetic-account',currency:'USD',timezone:'America/New_York',period_start:'2026-10-01T04:00:00Z',period_end:'2026-10-29T04:00:00Z',rows:metrics()});
const workspace=async db=>(await db.query('select public.wm_workspace($1) as r',[ids.org])).rows[0].r;
async function promoted(db,change={}){await actor(db,ids.operator,{aal:'aal2'});const staged=await report(db,'stage',{...input(),...change});return report(db,'promote',{id:staged.id,expected_version:staged.version});}
test('CSV parser bounds hostile input and exact units preserve missing and micro costs',()=>{
 const head='metric,value,unit,definition_version,observed_at,provisional\r\n';
 assert.equal(parseMetricCsv(head+'won,,count,unknown,2026-10-29T14:00:00Z,true')[0].value,null);
 assert.equal(parseMetricCsv(head+'clicks,2,count,"quoted, definition",2026-10-29T14:00:00Z,false')[0].definition_version,'quoted, definition');
 for(const text of [head+'clicks,=1+1,count,v1,2026-10-29T14:00:00Z,false',head+'clicks,2,count,"unclosed',head+'clicks,2,count,"ok"x,2026-10-29T14:00:00Z,false',head+'x'.repeat(140000),head+'clicks,2,count,v1,2026-10-29T14:00:00Z,maybe'])assert.throws(()=>parseMetricCsv(text));
 assert.equal(displayExactMetric('1234567','micros','USD'),'USD 1.234567');assert.equal(displayExactMetric('900719925474099999','micros','JPY'),'JPY 900719925474.099999');assert.equal(displayExactMetric(null,'count'),'Not available');
 assert.match(csvExport([{x:'=HYPERLINK("bad")'}],['x']),/'=HYPERLINK/);
});
test('imports reject malformed rows, retain a preview, enforce operator/tenant access and promote complete batches exactly once',async()=>{
 const db=await database();try{
  await actor(db,ids.client);await assert.rejects(report(db,'stage',input()),/unavailable/);
  await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(report(db,'stage',{...input(),engagement_id:ids.otherEngagement}),/unavailable/);
  const bad=await report(db,'stage',{...input(),rows:[...metrics(),{...metrics()[0],value:'=1+1'}]});let w=await workspace(db);assert.equal(w.imports[0].status,'rejected');assert.equal(w.imports[0].rejected_count,1);await assert.rejects(report(db,'promote',{id:bad.id,expected_version:1}),/complete valid/);
  const a=await report(db,'stage',input());assert.equal((await report(db,'stage',input())).id,a.id);w=await workspace(db);assert.equal(w.imports.find(i=>i.id===a.id).preview_rows.length,3);assert.equal(w.metrics.length,0);
  await report(db,'promote',{id:a.id,expected_version:1});await assert.rejects(report(db,'promote',{id:a.id,expected_version:1}),/changed|version/i);w=await workspace(db);assert.equal(w.metrics.length,3);assert.equal(w.metrics.find(m=>m.metric==='won').value,null);assert.equal(w.metrics.find(m=>m.metric==='cost').value,'1234567');
  await actor(db,ids.client);w=await workspace(db);assert.equal(w.imports.length,0);assert.equal(w.metrics.length,0);await assert.rejects(db.query('select * from wm.metric_snapshots'),/permission denied/);
 }finally{await db.close();}
});
test('conflicting imports, overlapping periods and changed currencies need explicit matching corrections',async()=>{
 const db=await database();try{
  const a=await promoted(db),changed={...input(),rows:metrics().map(m=>({...m,value:m.metric==='clicks'?'30':m.value}))};
  const b=await report(db,'stage',changed);await assert.rejects(report(db,'promote',{id:b.id,expected_version:1}),/overlaps/);
  await assert.rejects(report(db,'stage',{...changed,currency:'EUR',supersedes_id:a.id}),/matching/);
  const c=await report(db,'stage',{...changed,supersedes_id:a.id});await report(db,'promote',{id:c.id,expected_version:1});let w=await workspace(db);assert.equal(w.imports.find(i=>i.id===a.id).status,'superseded');assert.equal(w.metrics.filter(m=>m.import_status==='promoted').length,3);assert.ok(w.metrics.filter(m=>m.import_status==='promoted').every(m=>m.supersedes_id));
  await assert.rejects(report(db,'stage',{...input(),period_start:'2026-02-30T00:00:00Z'}),/date|range/i);
  const next=await report(db,'stage',{...input(),period_start:'2026-10-29T04:00:00Z',period_end:'2026-10-30T04:00:00Z'});await report(db,'promote',{id:next.id,expected_version:1});w=await workspace(db);assert.equal(w.imports.filter(i=>i.status==='promoted').length,2);
 }finally{await db.close();}
});
test('publication needs an exact reviewed narrative; source correction preserves prior published evidence',async()=>{
 const db=await database();try{
  const {r}=await reviewable(db),a=await promoted(db);let w=await workspace(db);const data={engagement_id:ids.engagement,request_id:r.id,period_key:'October 2026',snapshot_ids:w.metrics.map(m=>m.id),summary:'Clicks are observed; business outcomes remain unknown.',limitations:'Manual source export. No causal conclusion and no missing-as-zero values.'};
  const draft=await report(db,'draft',data);w=await workspace(db);const d=w.reports.find(r=>r.id===draft.id);
  await assert.rejects(report(db,'publish',{id:d.id,expected_version:1,digest:d.digest}),/Reviewed narrative/);
  await assert.rejects(report(db,'review',{id:d.id,expected_version:1,digest:'f'.repeat(64)}),/exact report/);
  await actor(db,ids.client);w=await workspace(db);assert.equal(w.reports.length,0);assert.equal(w.metrics.length,0);assert.ok(!JSON.stringify(w).includes(data.summary));
  await actor(db,ids.operator,{aal:'aal2'});await report(db,'review',{id:d.id,expected_version:1,digest:d.digest});await report(db,'publish',{id:d.id,expected_version:2,digest:d.digest});
  await actor(db,ids.client);w=await workspace(db);assert.equal(w.reports.length,1);assert.equal(w.metrics.length,3);assert.equal(w.reports[0].narrative.narrative,data.summary);
  await promoted(db,{supersedes_id:a.id,rows:metrics().map(m=>({...m,value:m.metric==='clicks'?'30':m.value}))});w=await workspace(db);assert.equal(w.reports[0].evidence_corrected,true);
  const newDraft=await report(db,'draft',{...data,snapshot_ids:w.metrics.filter(m=>m.import_status==='promoted').map(m=>m.id),supersedes_id:d.id,summary:'Corrected source export; outcomes still unknown.'});w=await workspace(db);const nd=w.reports.find(r=>r.id===newDraft.id);await report(db,'review',{id:nd.id,expected_version:1,digest:nd.digest});await report(db,'publish',{id:nd.id,expected_version:2,digest:nd.digest});
  await actor(db,ids.client);w=await workspace(db);assert.equal(w.reports.length,2);assert.equal(w.reports.find(r=>r.id===d.id).status,'superseded');assert.equal(w.metrics.length,6);
 }finally{await db.close();}
});
