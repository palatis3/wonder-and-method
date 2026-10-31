import test from 'node:test';import assert from 'node:assert/strict';
import {database,actor,admin,ids} from './database.mjs';
const record=async(db,input,key=crypto.randomUUID())=>(await db.query('select public.wm_outcome_command($1,$2,$3,$4) as r',[ids.org,'outcome.record',JSON.stringify(input),key])).rows[0].r;
const workspace=async db=>(await db.query('select public.wm_workspace($1) as r',[ids.org])).rows[0].r;
const initial=()=>({engagement_id:ids.engagement,source:'crm',source_key:'anonymous-042',received_at:'2026-09-01T13:00:00Z',event_key:'event-one',event_at:'2026-09-01T14:00:00Z',outcome:'unknown',definition_version:'crm-v1',consent_ref:'customer-approved-CRM-export',retention_until:new Date(Date.now()+86400000*180).toISOString()});
test('outcomes preserve unknown, booked, attended and won events; duplicate/conflicting events and cross-tenant changes are fenced',async()=>{
 const db=await database();try{
  await actor(db,ids.viewer);await assert.rejects(record(db,initial()),/unavailable/);await actor(db,ids.client);await assert.rejects(record(db,{...initial(),engagement_id:ids.otherEngagement}),/unavailable/);
  const data=initial(),a=await record(db,data);assert.equal((await record(db,data)).id,a.id);await assert.rejects(record(db,{...data,outcome:'won'}),/Conflicting duplicate/);
  let w=await workspace(db);assert.equal(w.leads.length,1);assert.equal(w.leads[0].outcome,'unknown');assert.equal(w.outcome_events.length,1);
  const event={engagement_id:ids.engagement,id:a.id,expected_version:a.version,event_key:'booked',event_at:'2026-09-02T14:00:00Z',outcome:'booked',definition_version:'crm-v1',consent_ref:'customer-approved-CRM-export'};
  const b=await record(db,event);const c=await record(db,{...event,expected_version:b.version,event_key:'attended',event_at:'2026-09-04T14:00:00Z',outcome:'attended'});
  await record(db,{...event,expected_version:c.version,event_key:'won',event_at:'2026-10-01T14:00:00Z',outcome:'won',value_minor:34950,currency:'USD'});w=await workspace(db);assert.equal(w.leads[0].outcome,'won');assert.equal(w.leads[0].value_minor,34950);assert.equal(w.outcome_events.length,4);assert.equal(w.leads[0].occurred_at,'2026-09-01T13:00:00+00:00');
  await assert.rejects(record(db,{...event,event_key:'too-old-version'}),/changed/);await assert.rejects(record(db,{...event,event_key:'personal',email:'not-collected@example.test'}),/Unsupported field/);
  await admin(db);await assert.rejects(db.query("update wm.outcome_events set outcome='lost' where id=$1",[a.event_id]),/immutable|history/i);await actor(db,ids.client);
  await actor(db,ids.outsider);await assert.rejects(record(db,event),/unavailable/);
 }finally{await db.close();}
});
test('late event and explicit correction preserve both event time and recording time without overwriting newer outcome',async()=>{
 const db=await database();try{
  await actor(db,ids.client);const data=initial(),a=await record(db,data),base={engagement_id:ids.engagement,id:a.id,expected_version:a.version,event_key:'won',event_at:'2026-10-01T14:00:00Z',outcome:'won',value_minor:12000,currency:'USD',definition_version:'crm-v1',consent_ref:'CRM-source'};
  const b=await record(db,base),c=await record(db,{...base,expected_version:b.version,event_key:'late-booking',event_at:'2026-09-02T14:00:00Z',outcome:'booked',value_minor:null});let w=await workspace(db);assert.equal(w.leads[0].outcome,'won');
  const d=await record(db,{...base,expected_version:c.version,event_key:'correct-win',supersedes_id:b.event_id,value_minor:15000});w=await workspace(db);assert.equal(w.leads[0].value_minor,15000);assert.equal(w.outcome_events.length,4);assert.ok(w.outcome_events.some(e=>e.id===b.event_id&&e.value_minor===12000));
  await assert.rejects(record(db,{...base,expected_version:d.version,event_key:'second-correction',supersedes_id:b.event_id}),/current event/);
  await assert.rejects(record(db,{...base,expected_version:d.version,event_key:'click-is-not-sale',outcome:'booked'}),/confirmed win/);
  await admin(db);await db.query("update wm.lead_outcomes set retention_until=now()-interval '1 second' where id=$1",[a.id]);await actor(db,ids.client);w=await workspace(db);assert.equal(w.leads.length,0);assert.equal(w.outcome_events.length,0);await assert.rejects(record(db,{...base,expected_version:d.version,event_key:'expired'}),/retention deadline/);
 }finally{await db.close();}
});

test('legacy confirmed sale survives a late booking until an explicit correction, without claiming an occurrence date',async()=>{
 const db=await database();try{
  await admin(db);const id=crypto.randomUUID();await db.query("insert into wm.lead_outcomes(organization_id,id,engagement_id,source_key,source,occurred_at,outcome,value_minor,currency,last_confirmed_at,version) values($1,$2,$3,'legacy','crm','2026-09-01T13:00:00Z','won',25000,'USD','2026-10-01T14:00:00Z',5)",[ids.org,id,ids.engagement]);await actor(db,ids.client);
  await record(db,{engagement_id:ids.engagement,id,expected_version:5,event_key:'older-booking',event_at:'2026-09-02T14:00:00Z',outcome:'booked',definition_version:'crm-v1',consent_ref:'Current CRM permission'});
  const w=await workspace(db);assert.equal(w.leads[0].outcome,'won');assert.equal(w.leads[0].value_minor,25000);assert.equal(w.outcome_events.length,2);const baseline=w.outcome_events.find(e=>e.time_basis==='legacy_confirmation');assert.ok(baseline);assert.equal(baseline.recorded_by,null);
 }finally{await db.close();}
});
