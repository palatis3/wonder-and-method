import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,ids} from './database.mjs';
import {billingFixture} from './billing-fixture.mjs';
const view=async db=>(await db.query('select public.wm_workspace($1) r',[ids.org])).rows[0].r;
const record=async(db,i,key=crypto.randomUUID())=>(await db.query('select public.wm_closure_command($1,$2,$3,$4) r',[ids.org,'closure.statement',i,key])).rows[0].r;
test('settlement uses actual local calendar days, freezes evidence, rejects stale amounts, and never claims closure or refund completion',async()=>{
 const db=await database();try{
  const o=await billingFixture(db);await admin(db);
  await db.query("update wm.billing_schedules set interval='month',billing_timezone='America/New_York',cancellation_policy=jsonb_build_object('earning_policy','actual_days') where id=$1",[o.schedule_id]);
  await db.query("update wm.billing_obligations set period_start='2028-02-01 14:00Z',period_end='2028-03-01 14:00Z',amount_minor=2900,gross_minor=2900,amount_paid_minor=2900,provider_state='paid',observed_at=now() where id=$1",[o.id]);
  const c=(await db.query("insert into wm.closures(organization_id,engagement_id,timing,exit_mode,reason,effective_at,requested_by) values($1,$2,'immediate','stop','Synthetic exit','2028-02-15 14:00Z',$3) returning *",[ids.org,ids.engagement,ids.client])).rows[0];
  await actor(db,ids.operator,{aal:'aal2'});let w=await view(db);let calc=w.closure_calculations[0];assert.equal(Number(calc.basis.lines[0].period_days),29);assert.equal(calc.basis.lines[0].earned_minor,1400);
  let input={closure_id:c.id,expected_version:1,basis_digest:calc.basis_digest,lines:[{id:o.id,earned_minor:1400,service_paid_minor:2900,tax_paid_minor:0,other_paid_minor:0,tax_credit_minor:0,evidence:'Fourteen elapsed calendar days in a twenty-nine-day month.'}],tax_evidence:'Synthetic no-tax invoice checked.',summary:'Refund entitlement is $15 before any separately verified refund.'};
  await actor(db,ids.client);await assert.rejects(record(db,input),/unavailable/);await actor(db,ids.operator,{aal:'aal2'});
  await assert.rejects(record(db,{...input,lines:[{...input.lines[0],earned_minor:1500}]}),/actual-day/);
  const key=crypto.randomUUID();const s=await record(db,input,key);assert.deepEqual(await record(db,input,key),s);
  w=await view(db);assert.equal(w.statements[0].snapshot.lines[0].return_due_minor,1500);assert.equal(w.statements[0].current,true);assert.equal(w.closures[0].refund_state,'review');assert.equal(w.closures[0].service_state,'requested');
  await admin(db);await assert.rejects(db.query("update wm.closure_statements set snapshot='{}' where id=$1",[s.id]),/Append-only/);
  await db.query('update wm.billing_obligations set observed_at=now(),version=version+1 where id=$1',[o.id]);await actor(db,ids.operator,{aal:'aal2'});assert.equal((await view(db)).statements[0].current,true);
  await admin(db);await db.query('update wm.billing_obligations set amount_paid_minor=2000,version=version+1 where id=$1',[o.id]);await actor(db,ids.operator,{aal:'aal2'});assert.equal((await view(db)).statements[0].current,false);
  await assert.rejects(record(db,{...input,expected_version:2}),/Billing changed/);
  await admin(db);const unused=(await db.query("select id,version from wm.milestones where organization_id=$1 and status='planned' limit 1",[ids.org])).rows[0];await db.query("update wm.engagements set service_state='ending' where id=$1",[ids.engagement]);await actor(db,ids.operator,{aal:'aal2'});
  await assert.rejects(db.query('select public.wm_commercial_command($1,$2,$3,$4)',[ids.org,'milestone.due',{id:unused.id,expected_version:unused.version,evidence:'Cannot restart ended service.'},crypto.randomUUID()]),/closure prevents/);
  await actor(db,ids.viewer);w=await view(db);assert.equal(w.statements.length,0);assert.equal(w.closure_calculations.length,0);
 }finally{await db.close();}
});
test('DST does not shorten a calendar-day settlement period and fractional minor units are rejected',async()=>{
 const db=await database();try{
  const o=await billingFixture(db);await admin(db);
  await db.query("update wm.billing_schedules set interval='month',billing_timezone='America/New_York',cancellation_policy=jsonb_build_object('earning_policy','actual_days') where id=$1",[o.schedule_id]);
  await db.query("update wm.billing_obligations set period_start='2028-03-01 14:00Z',period_end='2028-04-01 13:00Z',amount_minor=3100,gross_minor=3100,amount_paid_minor=3100,provider_state='paid',observed_at=now() where id=$1",[o.id]);
  await db.query("insert into wm.closures(organization_id,engagement_id,timing,exit_mode,reason,effective_at,requested_by) values($1,$2,'immediate','stop','Synthetic exit','2028-03-16 13:00Z',$3)",[ids.org,ids.engagement,ids.client]);await actor(db,ids.operator,{aal:'aal2'});
  const w=await view(db),calc=w.closure_calculations[0],c=w.closures[0];assert.equal(Number(calc.basis.lines[0].period_days),31);assert.equal(calc.basis.lines[0].earned_minor,1500);
  await assert.rejects(record(db,{closure_id:c.id,expected_version:1,basis_digest:calc.basis_digest,lines:[{id:o.id,earned_minor:1500.1,service_paid_minor:3100,tax_paid_minor:0,other_paid_minor:0,tax_credit_minor:0,evidence:'Synthetic'}],tax_evidence:'Synthetic',summary:'Synthetic'}),/whole minor units/);
  await assert.rejects(db.query('select public.wm_billing_command($1,$2,$3,$4)',[ids.org,'billing.refund',{amount_minor:1.5},crypto.randomUUID()]),/whole minor units/);
 }finally{await db.close();}
});
test('deliverable plans use reviewed earnings, uninvoiced earned work remains owed, and partial tax receipts are allocated explicitly',async()=>{
 const db=await database();try{
  const o=await billingFixture(db);await admin(db);
  await db.query("update wm.billing_schedules set interval='month',cancellation_policy=jsonb_build_object('earning_policy','completed_work') where id=$1",[o.schedule_id]);
  await db.query("update wm.billing_obligations set amount_paid_minor=5500,provider_state='open',observed_at=now() where id=$1",[o.id]);
  const m=(await db.query("update wm.milestones set earned_minor=2500,status='accepted' where organization_id=$1 and id::text<>(select replace(component,'milestone:','') from wm.billing_schedules where id=$2) returning id",[ids.org,o.schedule_id])).rows[0];
  const c=(await db.query("insert into wm.closures(organization_id,engagement_id,timing,exit_mode,reason,effective_at,requested_by) values($1,$2,'immediate','stop','Synthetic exit',now(),$3) returning id",[ids.org,ids.engagement,ids.client])).rows[0];
  await actor(db,ids.operator,{aal:'aal2'});const calc=(await view(db)).closure_calculations[0];
  // The synthetic component retains its earlier milestone identifier; replace
  // that identifier to model a delivery-based monthly component independently.
  await admin(db);await db.query("update wm.billing_schedules set component='management' where id=$1",[o.schedule_id]);await actor(db,ids.operator,{aal:'aal2'});
  const current=(await view(db)).closure_calculations[0];assert.equal(current.basis.lines.find(l=>l.id===o.id).earned_minor,null);
  assert.equal(current.basis.lines.find(l=>l.id===m.id).earned_minor,2500);
  const lines=current.basis.lines.map(l=>({id:l.id,earned_minor:l.id===o.id?5000:l.earned_minor,service_paid_minor:l.id===o.id?5000:0,tax_paid_minor:l.id===o.id?500:0,other_paid_minor:0,tax_credit_minor:l.id===o.id?500:0,evidence:'Synthetic completed deliverables and invoice payment allocation checked.'}));
  const input={closure_id:c.id,expected_version:1,basis_digest:current.basis_digest,lines,tax_evidence:'Partial $55 receipt allocated to $50 service and $5 tax; $5 tax reversal reviewed.',summary:'Completed work and partial tax allocation, including earned work not invoiced.'};
  await assert.rejects(record(db,{...input,lines:lines.map(l=>l.id===o.id?{...l,tax_paid_minor:501}:l)}),/Check earned amount/);
  await record(db,input);const saved=(await view(db)).statements[0].snapshot.lines;assert.equal(saved.find(l=>l.id===o.id).return_due_minor,500);assert.equal(saved.find(l=>l.id===m.id).unpaid_earned_minor,2500);
 }finally{await db.close();}
});
