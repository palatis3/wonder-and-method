import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,command,ids} from './database.mjs';
const service=async(db,name,input)=> (await db.query(`select public.wm_service_command($1,$2,$3::jsonb,$4) as result`,[ids.org,name,JSON.stringify(input),crypto.randomUUID()])).rows[0].result;
const workspace=async db=>(await db.query(`select public.wm_workspace($1) as result`,[ids.org])).rows[0].result;

test('customer projection omits internal messages, finance is restricted, and read operators cannot mutate',async()=>{
 const db=await database();try{
  await actor(db,ids.operator,{aal:'aal2'});await command(db,'message_send',{engagement_id:ids.engagement,body:'Internal diagnosis',visibility:'internal'});
  await command(db,'message_send',{engagement_id:ids.engagement,body:'Customer update',visibility:'shared'});
  await admin(db);await db.query(`insert into wm.payment_references(organization_id,engagement_id,environment,account_id,object_type,external_id,observed_state,observed_at) values($1,$2,'test','fake','invoice','fake-invoice','paid',now())`,[ids.org,ids.engagement]);
  await actor(db,ids.client);let w=await workspace(db);assert.equal(w.messages.length,1);assert.equal(w.payments.length,1);assert.equal(w.operator_data,null);
  await actor(db,ids.viewer);w=await workspace(db);assert.equal(w.payments.length,0);assert.equal(w.messages.length,1);
  await admin(db);await db.query(`update wm.operator_assignments set capabilities=array['read'] where user_id=$1`,[ids.operator]);
  await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(command(db,'message_send',{engagement_id:ids.engagement,body:'No permission'}),/unavailable/);
  await assert.rejects(command(db,'request_create',{engagement_id:ids.engagement,outcome:'No permission'}),/unavailable/);
  await actor(db,ids.outsider);await assert.rejects(workspace(db),/unavailable/);
 }finally{await db.close();}
});

test('confirmed facts are versioned and service cancellation requires the current contract authority',async()=>{
 const db=await database();try{
  await actor(db,ids.client);let fact=await service(db,'fact.confirm',{key:'hours',value:'9–5',source:'Owner confirmation'});
  await assert.rejects(service(db,'fact.confirm',{key:'hours',value:'10–5',source:'Correction',expected_version:99}),/changed/);
  await service(db,'fact.confirm',{key:'hours',value:'10–5',source:'Correction',expected_version:fact.version});
  const w=await workspace(db);assert.equal(w.facts.length,1);assert.equal(w.facts[0].value,'10–5');
  await assert.rejects(service(db,'engagement.cancel',{engagement_id:ids.engagement,expected_version:1,timing:'period_end',exit_mode:'stop',reason:'Stop service'}),/paid service period/);
  const result=await service(db,'engagement.cancel',{engagement_id:ids.engagement,expected_version:1,timing:'immediate',exit_mode:'stop',reason:'Stop service'});assert.ok(result.id);
  const ended=await workspace(db);assert.equal(ended.engagements[0].service_state,'ending');assert.equal(ended.closures[0].billing_state,'unconfirmed');assert.equal(ended.closures[0].refund_state,'review');
 }finally{await db.close();}
});
