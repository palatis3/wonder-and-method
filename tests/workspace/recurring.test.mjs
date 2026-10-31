import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,ids} from './database.mjs';
import {CATALOG} from '../../worker/workspace/commercial/catalog.mjs';
const commercial=async(db,c,i)=>(await db.query('select public.wm_commercial_command($1,$2,$3,$4) r',[ids.org,c,i,crypto.randomUUID()])).rows[0].r;
const billing=async(db,c,i)=>(await db.query('select public.wm_billing_command($1,$2,$3,$4) r',[ids.org,c,i,crypto.randomUUID()])).rows[0].r;
async function ready(db){
 await admin(db);await db.query("update wm.engagements set service_type='catalog_project',catalog_id='improve' where id=$1",[ids.engagement]);
 await actor(db,ids.operator,{aal:'aal2'});
 const p=await commercial(db,'proposal.create',{engagement_id:ids.engagement,catalog_id:'improve',variant:'brochure',catalog_version:CATALOG[0].catalog_version,expected_version:1,starts_at:new Date(Date.now()-1000).toISOString(),site_host:'synthetic.example',scope_note:'Synthetic monthly plan with Brochure Care.'});
 const sent=await commercial(db,'proposal.send',{id:p.id,expected_version:p.version});await actor(db,ids.client);
 let view=(await db.query('select public.wm_workspace($1) r',[ids.org])).rows[0].r;await commercial(db,'agreement.accept',{id:p.id,expected_version:sent.version,consent:true,digest:view.agreements[0].digest,signer_name:'Avery'});
 await admin(db);await db.query("insert into wm.billing_accounts(organization_id,environment,account_id,customer_id,automatic_tax,tax_qualification,verified_at) values($1,'test','acct_fixture','cus_fixture',false,'Synthetic net service price and hosting treatment qualification',now())",[ids.org]);
 await db.query('update wm.tenant_guards set positive_effects_allowed=true where organization_id=$1',[ids.org]);
 await actor(db,ids.operator,{aal:'aal2'});view=(await db.query('select public.wm_workspace($1) r',[ids.org])).rows[0].r;
 return {agreement:p,engagement:view.engagements[0]};
}
test('service commencement requires facts/access; hosting offsets attach once to the actual invoice without changing catalog fees',async()=>{
 const db=await database();try{
  const {agreement,engagement}=await ready(db);let input={engagement_id:ids.engagement,agreement_id:agreement.id,expected_version:engagement.version,started_at:new Date().toISOString(),evidence:'Synthetic actual service commencement confirmed.'};
  await assert.rejects(billing(db,'billing.start_service',input),/access/);
  await admin(db);await db.query("update wm.access_requirements set status='verified',evidence='Synthetic verified access',account_reference='synthetic.example' where organization_id=$1",[ids.org]);
  await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(billing(db,'billing.start_service',input),/business facts/);
  await admin(db);for(const key of ['business_identity','service_goals','approved_claims','primary_contact'])await db.query("insert into wm.business_facts(organization_id,key,value,source,confirmed_by) values($1,$2,'\"synthetic\"','Synthetic confirmed facts',$3)",[ids.org,key,ids.client]);
  await actor(db,ids.operator,{aal:'aal2'});await billing(db,'billing.start_service',input);
  await admin(db);const monthly=(await db.query("select * from wm.billing_schedules where organization_id=$1 and interval='month'",[ids.org])).rows[0];assert.equal(monthly.state,'active');
  assert.equal((await db.query('select count(*)::int n from wm.entitlements where organization_id=$1',[ids.org])).rows[0].n,1);
  await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(billing(db,'billing.prepare',{schedule_id:monthly.id,expected_version:monthly.version}),/hosting bill/);
  await admin(db);const file=crypto.randomUUID();await db.query("insert into wm.attachments(organization_id,id,engagement_id,uploader_id,visibility,upload_object_key,sealed_object_key,original_name,declared_media_type,declared_bytes,actual_bytes,actual_media_type,checksum,scan_state,scan_policy_version,expires_at) values($1,$2,$3,$4,'shared','synthetic/upload','synthetic/sealed','hosting.pdf','application/pdf',5,5,'application/pdf',$5,'unscanned','invite-only-unscanned-v1',now()+interval '1 day')",[ids.org,file,ids.engagement,ids.client,'c'.repeat(64)]);
  await actor(db,ids.operator,{aal:'aal2'});await billing(db,'billing.hosting',{schedule_id:monthly.id,expected_version:monthly.version,attachment_id:file,eligible_minor:5000,reason:'Synthetic supported hosting bill for this period excluding domains and taxes.'});
  await assert.rejects(billing(db,'billing.hosting',{schedule_id:monthly.id,expected_version:monthly.version,attachment_id:file,eligible_minor:5000,reason:'Duplicate allocation'}),/unique/);
  const o=await billing(db,'billing.prepare',{schedule_id:monthly.id,expected_version:monthly.version});
  await admin(db);const obligation=(await db.query('select * from wm.billing_obligations where id=$1',[o.id])).rows[0];assert.equal(Number(obligation.offset_minor),2500);assert.equal(Number(obligation.gross_minor),Number(monthly.amount_minor));assert.equal(Number(obligation.amount_minor),Number(monthly.amount_minor)-2500);
  assert.equal(Number((await db.query('select amount_minor from wm.billing_schedules where id=$1',[monthly.id])).rows[0].amount_minor),Number(monthly.amount_minor));
  await assert.rejects(db.query("update wm.hosting_allocations set offset_minor=0"),/Append-only/);
  // An older restricted business must not occupy the renewal batch indefinitely.
  const requestId=crypto.randomUUID(),revisionId=crypto.randomUUID(),agreementId=crypto.randomUUID(),scheduleId=crypto.randomUUID();
  const original=(await db.query('select * from wm.agreements where id=$1',[agreement.id])).rows[0];
  const clone=async(table,where,overrides)=>db.query(`insert into wm.${table} select (jsonb_populate_record(null::wm.${table},to_jsonb(source.*)||$2::jsonb)).* from wm.${table} source where ${where} limit 1`,[ids.org,overrides]);
  await clone('catalog_snapshots','source.organization_id=$1',{organization_id:ids.other});
  await clone('requests',"source.organization_id=$1 and source.id='"+original.request_id+"'",{organization_id:ids.other,id:requestId,engagement_id:ids.otherEngagement,current_revision_id:null});
  await clone('revisions',"source.organization_id=$1 and source.id='"+original.revision_id+"'",{organization_id:ids.other,id:revisionId,request_id:requestId});
  await clone('agreements',"source.organization_id=$1 and source.id='"+agreement.id+"'",{organization_id:ids.other,id:agreementId,engagement_id:ids.otherEngagement,request_id:requestId,revision_id:revisionId,accepted_decision_id:null});
  await clone('billing_schedules',"source.organization_id=$1 and source.interval='month'",{organization_id:ids.other,id:scheduleId,engagement_id:ids.otherEngagement,agreement_id:agreementId,allowance_checked_at:null});
  await db.query("update wm.engagements set service_state='active' where id=$1",[ids.otherEngagement]);await db.query("update wm.tenant_guards set access_state='restricted' where organization_id=$1",[ids.other]);
  await db.query("update wm.billing_schedules set allowance_checked_at=now()-interval '1 day' where id=$1",[monthly.id]);
  await actor(db,ids.operator,{role:'service_role'});await db.query('select public.wm_billing_generate(1)');await admin(db);
  assert.equal((await db.query("select allowance_checked_at>now()-interval '1 minute' ok from wm.billing_schedules where id=$1",[monthly.id])).rows[0].ok,true);
  assert.equal((await db.query('select count(*)::int n from wm.entitlements where organization_id=$1',[ids.org])).rows[0].n,1);
  await actor(db,ids.client);const view=(await db.query('select public.wm_workspace($1) r',[ids.org])).rows[0].r;const cancel={engagement_id:ids.engagement,expected_version:view.engagements[0].version,timing:'period_end',exit_mode:'stop',reason:'Synthetic closure'};
  await assert.rejects(db.query('select public.wm_service_command($1,$2,$3,$4)',[ids.org,'engagement.cancel',cancel,crypto.randomUUID()]),/paid service period/);
  await db.query('select public.wm_service_command($1,$2,$3,$4)',[ids.org,'engagement.cancel',{...cancel,timing:'immediate'},crypto.randomUUID()]);
  await admin(db);assert.equal((await db.query("select count(*)::int n from wm.operations where organization_id=$1 and kind like 'stripe_invoice_%' and state='pending'",[ids.org])).rows[0].n,0);assert.equal((await db.query('select count(*)::int n from wm.billing_obligations where id=$1',[o.id])).rows[0].n,1);
 }finally{await db.close();}
});
test('monthly anniversaries retain month-end and local wall clock through leap years and DST',async()=>{
 const db=await database();try{
  const boundary=async(a,z,c,f='month')=>new Date((await db.query('select wm.billing_boundary($1,$2,$3,$4) b',[a,z,c,f])).rows[0].b).toISOString();
  assert.equal(await boundary('2028-01-31T15:00:00Z','America/New_York',1),'2028-02-29T15:00:00.000Z');
  assert.equal(await boundary('2028-01-31T15:00:00Z','America/New_York',2),'2028-03-31T14:00:00.000Z');
  assert.equal(await boundary('2027-01-31T15:00:00Z','America/New_York',1),'2027-02-28T15:00:00.000Z');
  assert.equal(await boundary('2028-02-29T15:00:00Z','America/New_York',1,'year'),'2029-02-28T15:00:00.000Z');
 }finally{await db.close();}
});
