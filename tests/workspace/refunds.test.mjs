import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,ids} from './database.mjs';
import {CATALOG} from '../../worker/workspace/commercial/catalog.mjs';
import {financialEffect,readFinancialEffect,pollRefunds} from '../../worker/workspace/billing/refunds.mjs';
import {STRIPE_VERSION} from '../../worker/workspace/billing/stripe.mjs';
const billing=async(db,c,i,key=crypto.randomUUID())=>(await db.query('select public.wm_billing_command($1,$2,$3,$4) r',[ids.org,c,i,key])).rows[0].r;
async function setup(db){
 await actor(db,ids.operator,{aal:'aal2'});
 const commercial=async(c,i)=>(await db.query('select public.wm_commercial_command($1,$2,$3,$4) r',[ids.org,c,i,crypto.randomUUID()])).rows[0].r;
 const p=await commercial('proposal.create',{engagement_id:ids.engagement,catalog_id:'launch_site',variant:'standard',catalog_version:CATALOG[0].catalog_version,expected_version:1,starts_at:new Date().toISOString(),site_host:'synthetic.example',scope_note:'Synthetic website scope.'});
 const sent=await commercial('proposal.send',{id:p.id,expected_version:p.version});await actor(db,ids.client);
 const a=(await db.query('select public.wm_workspace($1) r',[ids.org])).rows[0].r.agreements[0];await commercial('agreement.accept',{id:p.id,expected_version:sent.version,digest:a.digest,consent:true,signer_name:'Avery'});
 await actor(db,ids.operator,{aal:'aal2'});const m=(await db.query('select public.wm_workspace($1) r',[ids.org])).rows[0].r.milestones.find(m=>m.proof_kind==='booking');await commercial('milestone.due',{id:m.id,expected_version:m.version,evidence:'Synthetic booking verified.'});
 await admin(db);const schedule=(await db.query('select * from wm.billing_schedules where organization_id=$1 limit 1',[ids.org])).rows[0];
 await db.query("insert into wm.billing_accounts(organization_id,environment,account_id,customer_id,automatic_tax,tax_qualification,verified_at) values($1,'test','acct_fixture','cus_fixture',false,'Synthetic qualification',now())",[ids.org]);
 await db.query('update wm.tenant_guards set positive_effects_allowed=true where organization_id=$1',[ids.org]);
 const o=(await db.query("insert into wm.billing_obligations(organization_id,schedule_id,engagement_id,period_start,period_end,gross_minor,amount_minor,currency,description,environment,account_id,customer_id,automatic_tax,account_generation,authorized_by,invoice_id) values($1,$2,$3,now(),now()+interval '1 day',10000,10000,'USD','Synthetic invoice','test','acct_fixture','cus_fixture',false,1,$4,'in_fixture') returning *",[ids.org,schedule.id,ids.engagement,ids.operator])).rows[0];
 await actor(db,ids.operator,{aal:'aal2'});return o;
}
async function begin(db,kind){
 await admin(db);await db.query("update wm.critical_receipts set durability_status='durable' where organization_id=$1",[ids.org]);await actor(db,ids.operator,{role:'service_role'});
 const job=(await db.query('select public.wm_jobs_claim(10) r')).rows[0].r.find(x=>x.kind===kind);assert.ok(job,kind);
 return (await db.query('select public.wm_attempt_begin($1,$2,$3,$4) r',[ids.org,job.id,job.lease_generation,'fixture-generation-1'])).rows[0].r;
}
const proof=(permit,extra)=>({settled:true,readback_matches:true,evidence_reference:'stripe:synthetic',observed_at:new Date().toISOString(),binding_id:permit.context.binding_id,charge_id:'ch_fixture',customer_id:'cus_fixture',environment:'test',account_id:'acct_fixture',currency:'USD',...extra});
const resolve=(db,permit,p)=>db.query('select public.wm_attempt_resolve($1,$2,$3,$4) r',[ids.org,permit.attempt.id,permit.attempt.dispatch_nonce,p]);
test('refund intent binds verified charges, reserves money, fences revoked authority, and reconciles an actual result after revocation',async()=>{
 const db=await database();try{
  const o=await setup(db);
  await actor(db,ids.client);await assert.rejects(billing(db,'billing.check_charge',{obligation_id:o.id,expected_version:1,charge_reference:'ch_fixture'}),/unavailable/);
  await actor(db,ids.operator,{aal:'aal2'});const b=await billing(db,'billing.check_charge',{obligation_id:o.id,expected_version:1,charge_reference:'ch_fixture'});
  const chargePermit=await begin(db,'stripe_charge_read');const cp=proof(chargePermit,{provider_reference:'ch_fixture',captured_minor:10000,refunded_minor:1000,disputed:false});
  await assert.rejects(resolve(db,chargePermit,{...cp,customer_id:'cus_wrong'}),/binding/);await resolve(db,chargePermit,cp);
  await actor(db,ids.operator,{aal:'aal2'});const input={charge_binding_id:b.id,expected_version:2,amount_minor:6000,reason:'Unearned work refunded under accepted terms.',tax_evidence:'Synthetic no-tax invoice; credit treatment checked.'};
  const key=crypto.randomUUID();const f=await billing(db,'billing.refund',input,key);assert.deepEqual(await billing(db,'billing.refund',input,key),f);
  await assert.rejects(billing(db,'billing.refund',{...input,expected_version:3,amount_minor:4000}),/unreserved/);
  const permit=await begin(db,'stripe_refund_create');await admin(db);await db.query("update wm.operator_assignments set revoked_at=now() where organization_id=$1",[ids.org]);await actor(db,ids.operator,{role:'service_role'});
  await assert.rejects(db.query('select public.wm_billing_effect_context($1,$2,$3)',[ids.org,permit.attempt.id,permit.attempt.dispatch_nonce]),/Finance operator/);
  await resolve(db,permit,proof(permit,{provider_reference:'re_fixture',adjustment_id:f.id,amount_minor:6000,state:'pending'}));
  const refund={id:'re_fixture',object:'refund',charge:'ch_fixture',currency:'usd',amount:6000,livemode:false,status:'succeeded',metadata:{wm_adjustment:f.id}};
  const polled=(await db.query("select public.wm_refunds_poll('test','acct_fixture',10) r")).rows[0].r;const lease=polled[0].readback_lease;
  await db.query('select public.wm_refund_observe($1,$2,$3,$4)',[ids.org,f.id,lease,refund]);await assert.rejects(db.query('select public.wm_refund_observe($1,$2,$3,$4)',[ids.org,f.id,lease,{...refund,status:'pending'}]),/mismatch/);
  await admin(db);assert.equal((await db.query('select state from wm.charge_bindings where id=$1',[b.id])).rows[0].state,'needs_refresh');
  await actor(db,ids.client);assert.equal((await db.query('select public.wm_workspace($1) r',[ids.org])).rows[0].r.adjustments[0].state,'succeeded');
  await actor(db,ids.viewer);const view=(await db.query('select public.wm_workspace($1) r',[ids.org])).rows[0].r;assert.equal(view.adjustments.length,0);assert.equal(view.charges.length,0);
 }finally{await db.close();}
});
const control=async()=>({access_state:'open',positive_effects_allowed:true,external_generation:'fixture-generation-1'});
test('a delayed charge read cannot erase a newer refund outcome; current refund GET can report later bank failure',async()=>{
 const db=await database();try{
  const o=await setup(db);const b=await billing(db,'billing.check_charge',{obligation_id:o.id,expected_version:1,charge_reference:'ch_fixture'});const initial=await begin(db,'stripe_charge_read');
  await resolve(db,initial,proof(initial,{provider_reference:'ch_fixture',captured_minor:10000,refunded_minor:5000,disputed:false}));
  await actor(db,ids.operator,{aal:'aal2'});const f=await billing(db,'billing.refund',{charge_binding_id:b.id,expected_version:2,amount_minor:5000,reason:'Remaining refundable work.',tax_evidence:'Synthetic tax treatment checked.'});
  const refund=await begin(db,'stripe_refund_create');await actor(db,ids.operator,{aal:'aal2'});await billing(db,'billing.check_charge',{obligation_id:o.id,expected_version:1,charge_reference:'ch_fixture'});const oldRead=await begin(db,'stripe_charge_read');
  const oldProof=proof(oldRead,{provider_reference:'ch_fixture',captured_minor:10000,refunded_minor:5000,disputed:false});
  await resolve(db,refund,proof(refund,{provider_reference:'re_fixture',adjustment_id:f.id,amount_minor:5000,state:'succeeded'}));
  assert.equal((await resolve(db,oldRead,oldProof)).rows[0].r.state,'superseded');
  await actor(db,ids.operator,{aal:'aal2'});await assert.rejects(billing(db,'billing.refund',{charge_binding_id:b.id,expected_version:4,amount_minor:5000,reason:'Should fail.',tax_evidence:'Synthetic checked.'}),/Verify the undisputed/);
  await actor(db,ids.operator,{role:'service_role'});const queue=(await db.query("select public.wm_refunds_poll('test','acct_fixture',1) r")).rows[0].r;assert.equal(queue.length,1);
  assert.equal((await db.query("select public.wm_refunds_poll('test','acct_fixture',1) r")).rows[0].r.length,0);
  const current={id:'re_fixture',object:'refund',charge:'ch_fixture',amount:5000,currency:'usd',livemode:false,status:'failed',metadata:{wm_adjustment:f.id}};
  await db.query('select public.wm_refund_observe($1,$2,$3,$4)',[ids.org,f.id,queue[0].readback_lease,current]);
  await actor(db,ids.client);assert.equal((await db.query('select public.wm_workspace($1) r',[ids.org])).rows[0].r.adjustments[0].state,'failed');
 }finally{await db.close();}
});
test('an unverified wrong-invoice lookup does not prevent the corrected lookup',async()=>{
 const db=await database();try{
  const o=await setup(db);await admin(db);
  const other=(await db.query("insert into wm.billing_obligations(organization_id,schedule_id,engagement_id,period_start,period_end,gross_minor,amount_minor,currency,description,environment,account_id,customer_id,automatic_tax,account_generation,authorized_by,invoice_id) select organization_id,schedule_id,engagement_id,period_start+interval '2 days',period_end+interval '2 days',gross_minor,amount_minor,currency,'Other synthetic invoice',environment,account_id,customer_id,automatic_tax,account_generation,authorized_by,'in_other' from wm.billing_obligations where id=$1 returning id",[o.id])).rows[0];
  await actor(db,ids.operator,{aal:'aal2'});const wrong=await billing(db,'billing.check_charge',{obligation_id:other.id,expected_version:1,charge_reference:'ch_fixture'});const correct=await billing(db,'billing.check_charge',{obligation_id:o.id,expected_version:1,charge_reference:'ch_fixture'});assert.notEqual(wrong.id,correct.id);
 }finally{await db.close();}
});
const env={STRIPE_ENABLED:'true',STRIPE_MODE:'test',STRIPE_ACCOUNT_ID:'acct_fixture',STRIPE_SECRET_KEY:'sk_test_synthetic',STRIPE_API_VERSION:STRIPE_VERSION};
const c={id:'obligation',binding_id:'binding',adjustment_id:'adjustment',invoice_id:'in_fixture',charge_id:'ch_fixture',customer_id:'cus_fixture',currency:'USD',environment:'test',account_id:'acct_fixture',refund_minor:1000};
function provider({allocated=5000,disputed=false,lost=false}={}){
 const calls=[];let refundStatus='pending';return {calls,fetcher:async(url,options={})=>{
  calls.push({url,method:options.method||'GET',body:options.body});let value;
  if(url.endsWith('/account'))value={id:'acct_fixture'};
  else if(url.endsWith('/charges/ch_fixture'))value={id:'ch_fixture',object:'charge',customer:'cus_fixture',currency:'usd',livemode:false,paid:true,captured:true,status:'succeeded',amount_captured:5000,amount_refunded:0,disputed,payment_intent:'pi_fixture'};
  else if(url.endsWith('/invoices/in_fixture'))value={id:'in_fixture',customer:'cus_fixture',currency:'usd',livemode:false,metadata:{wm_obligation:'obligation'}};
  else if(url.includes('/invoice_payments?'))value={object:'list',has_more:false,data:[{id:'inpay_fixture',invoice:'in_fixture',status:'paid',currency:'usd',livemode:false,amount_paid:allocated,payment:{type:'payment_intent',payment_intent:'pi_fixture'}}]};
  else if(url.endsWith('/refunds')){if(lost)throw Error('Lost acknowledgement');value={id:'re_fixture'};}
  else if(url.endsWith('/refunds/re_fixture'))value={id:'re_fixture',object:'refund',charge:'ch_fixture',amount:1000,currency:'usd',livemode:false,status:refundStatus,metadata:{wm_adjustment:'adjustment'}};
  else throw Error('Unexpected URL');return Response.json(value);
 }};
}
test('refund adapter checks allocation/dispute before one keyed POST and GET; missing-reference recovery never retries a POST',async()=>{
 const permit={operation:{id:'operation',organization_id:ids.org,kind:'stripe_refund_create'},attempt:{id:'attempt',dispatch_nonce:'nonce',external_generation:'fixture-generation-1'},context:c};
 const p=provider();let saved;const rpc=async(_e,name,args)=>name==='wm_billing_effect_context'?c:(saved=args.p_reference);
 const result=await financialEffect(env,permit,{rpc,fetcher:p.fetcher,readControl:control});assert.equal(result.state,'pending');assert.equal(saved,'re_fixture');assert.equal(p.calls.filter(x=>x.method==='POST').length,1);
 for(const options of [{allocated:2500},{disputed:true}]){const blocked=provider(options);await assert.rejects(financialEffect(env,permit,{rpc,fetcher:blocked.fetcher,readControl:control}));assert.equal(blocked.calls.filter(x=>x.method==='POST').length,0);}
 const lost=provider({lost:true});await assert.rejects(financialEffect(env,permit,{rpc,fetcher:lost.fetcher,readControl:control}));await assert.rejects(readFinancialEffect(env,permit,{fetcher:lost.fetcher}));assert.equal(lost.calls.filter(x=>x.method==='POST').length,1);
 let authorityReads=0;const revoked=provider();await assert.rejects(financialEffect(env,permit,{fetcher:revoked.fetcher,readControl:control,rpc:async()=>{if(++authorityReads>1)throw Error('Authority revoked');return c;}}),/revoked/);assert.equal(revoked.calls.filter(x=>x.method==='POST').length,0);
 const fenced=provider();await assert.rejects(financialEffect(env,permit,{fetcher:fenced.fetcher,rpc,readControl:async()=>({...await control(),external_generation:'new-generation'})}));assert.equal(fenced.calls.filter(x=>x.method==='POST').length,0);
 let observed=false;await pollRefunds(env,{fetcher:p.fetcher,rpc:async(_e,name)=>name==='wm_refunds_poll'?[{...c,provider_id:'re_fixture',organization_id:ids.org,amount_minor:1000}]:(observed=true)});assert.equal(observed,true);
});
