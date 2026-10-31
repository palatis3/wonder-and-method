import test from 'node:test';
import assert from 'node:assert/strict';
import {database,actor,admin,ids} from './database.mjs';
import {CATALOG} from '../../worker/workspace/commercial/catalog.mjs';
import {invoiceEffect,readInvoiceEffect,STRIPE_VERSION} from '../../worker/workspace/billing/stripe.mjs';
import {verifyStripeWebhook,handleStripeWebhook} from '../../worker/workspace/billing/webhooks.mjs';
const commercial=async(db,command,input)=>(await db.query('select public.wm_commercial_command($1,$2,$3,$4) r',[ids.org,command,input,crypto.randomUUID()])).rows[0].r;
const billing=async(db,input,key=crypto.randomUUID())=>(await db.query('select public.wm_billing_command($1,$2,$3,$4) r',[ids.org,'billing.prepare',input,key])).rows[0].r;
async function due(db){
 await actor(db,ids.operator,{aal:'aal2'});
 const p=await commercial(db,'proposal.create',{engagement_id:ids.engagement,catalog_id:'launch_site',variant:'standard',catalog_version:CATALOG[0].catalog_version,expected_version:1,starts_at:new Date(Date.now()+86400000).toISOString(),site_host:'synthetic.example',scope_note:'Synthetic agreed site.'});
 const sent=await commercial(db,'proposal.send',{id:p.id,expected_version:p.version});await actor(db,ids.client);
 const view=(await db.query('select public.wm_workspace($1) r',[ids.org])).rows[0].r;const a=view.agreements[0];
 await commercial(db,'agreement.accept',{id:p.id,expected_version:sent.version,digest:a.digest,consent:true,signer_name:'Avery'});
 await actor(db,ids.operator,{aal:'aal2'});const current=(await db.query('select public.wm_workspace($1) r',[ids.org])).rows[0].r;
 const m=current.milestones.find(x=>x.proof_kind==='booking');await commercial(db,'milestone.due',{id:m.id,expected_version:m.version,evidence:'Booked start confirmed.'});
 await admin(db);const schedule=(await db.query('select * from wm.billing_schedules where organization_id=$1',[ids.org])).rows[0];
 await db.query("insert into wm.billing_accounts(organization_id,environment,account_id,customer_id,automatic_tax,tax_qualification,verified_at) values($1,'test','acct_fixture','cus_fixture',false,'Synthetic tax qualification only',now())",[ids.org]);
 await db.query('update wm.tenant_guards set positive_effects_allowed=true where organization_id=$1',[ids.org]);await actor(db,ids.operator,{aal:'aal2'});return {schedule,m};
}
test('billing uses agreed due amounts, finance access and immutable allocation; payment does not earn work',async()=>{
 const db=await database();try{
  const {schedule,m}=await due(db);const input={schedule_id:schedule.id,expected_version:schedule.version},key=crypto.randomUUID();
  await actor(db,ids.client);await assert.rejects(billing(db,input),/unavailable/);await actor(db,ids.operator,{aal:'aal2'});
  await assert.rejects(billing(db,{...input,amount_minor:1}),/Unsupported field/);
  const o=await billing(db,input,key);assert.deepEqual(await billing(db,input,key),o);await assert.rejects(billing(db,input),/unique/i);
  await admin(db);const ledger=(await db.query('select * from wm.billing_obligations where id=$1',[o.id])).rows[0];assert.equal(Number(ledger.amount_minor),Number(m.amount_minor));
  await db.query("update wm.billing_obligations set invoice_id='in_fixture' where id=$1",[o.id]);
  await actor(db,ids.operator,{role:'service_role'});
  const event={id:'evt_fixture',type:'invoice.paid',livemode:false,data:{object:{id:'in_fixture',object:'invoice',status:'draft'}}};
  const receive=()=>db.query('select public.wm_stripe_event_receive($1,$2,$3,$4)',['test','acct_fixture',event,'a'.repeat(64)]);
  await receive();await receive();const q=(await db.query("select public.wm_stripe_readback_claim('test','acct_fixture') r")).rows[0].r;
  const invoice={id:'in_fixture',object:'invoice',customer:'cus_fixture',currency:'usd',livemode:false,status:'paid',amount_paid:m.amount_minor,metadata:{wm_obligation:o.id},hosted_invoice_url:'https://invoice.stripe.com/i/fixture'};
  await db.query('select public.wm_stripe_invoice_observe($1,$2,$3,$4)',['test','acct_fixture',q.lease_generation,invoice]);
  await actor(db,ids.client);const view=(await db.query('select public.wm_workspace($1) r',[ids.org])).rows[0].r;
  assert.equal(view.payments[0].observed_state,'paid');assert.equal(Number(view.milestones.find(x=>x.id===m.id).earned_minor),0);assert.equal(view.engagements[0].service_state,'setup');
  await actor(db,ids.viewer);assert.equal((await db.query('select public.wm_workspace($1) r',[ids.org])).rows[0].r.invoices.length,0);
  await admin(db);assert.equal((await db.query('select count(*)::int n from wm.stripe_event_inbox')).rows[0].n,1);
 }finally{await db.close();}
});
test('billing attempt is fenced by independent receipts, operator revocation and cancellation, while readback remains possible',async()=>{
 const db=await database();try{
  const {schedule}=await due(db);const o=await billing(db,{schedule_id:schedule.id,expected_version:schedule.version});
  await actor(db,ids.operator,{role:'service_role'});const jobs=(await db.query('select public.wm_jobs_claim(10) r')).rows[0].r;const job=jobs.find(x=>x.kind==='stripe_invoice_create');
  const begin=()=>db.query('select public.wm_attempt_begin($1,$2,$3,$4) r',[ids.org,job.id,job.lease_generation,'fixture-generation-1']);
  await assert.rejects(begin(),/Independent financial evidence/);
  await admin(db);await db.query("update wm.critical_receipts set durability_status='durable' where organization_id=$1",[ids.org]);await actor(db,ids.operator,{role:'service_role'});
  const permit=(await begin()).rows[0].r;assert.equal(permit.context.id,o.id);
  await admin(db);await db.query("update wm.operator_assignments set revoked_at=now() where organization_id=$1",[ids.org]);await actor(db,ids.operator,{role:'service_role'});
  await assert.rejects(db.query('select public.wm_billing_effect_context($1,$2,$3)',[ids.org,permit.attempt.id,permit.attempt.dispatch_nonce]),/Finance operator/);
  const proof={settled:true,readback_matches:true,evidence_reference:'stripe:in_real',provider_reference:'in_real',observed_at:new Date().toISOString(),invoice_id:'in_real',obligation_id:o.id,customer_id:'cus_fixture',environment:'test',account_id:'acct_fixture',currency:'USD',amount_minor:87800};
  const resolved=(await db.query('select public.wm_attempt_resolve($1,$2,$3,$4) r',[ids.org,permit.attempt.id,permit.attempt.dispatch_nonce,proof])).rows[0].r;assert.equal(resolved.state,'verified');
  await admin(db);assert.equal((await db.query('select invoice_id from wm.billing_obligations where id=$1',[o.id])).rows[0].invoice_id,'in_real');
 }finally{await db.close();}
});
test('webhook raw signature, timestamp, mode and durable receipt precede successful acknowledgement',async()=>{
 const secret='synthetic_webhook_secret';const event={id:'evt_one',type:'invoice.paid',livemode:false,data:{object:{id:'in_one',object:'invoice'}}};const bytes=new TextEncoder().encode(JSON.stringify(event));const now=Date.now();const t=Math.floor(now/1000);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const signature=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(t+'.'+new TextDecoder().decode(bytes)))).toString('hex');const header=`t=${t},v1=${'0'.repeat(64)},v1=${signature}`;
 assert.deepEqual(await verifyStripeWebhook(bytes,header,secret,{now}),event);
 await assert.rejects(verifyStripeWebhook(bytes,header,'wrong',{now}));await assert.rejects(verifyStripeWebhook(bytes,header,secret,{now:now+301000}));await assert.rejects(verifyStripeWebhook(new TextEncoder().encode(JSON.stringify({...event,type:'invoice.voided'})),header,secret,{now}));
 const request=()=>new Request('https://app.synthetic.example/api/webhooks/stripe',{method:'POST',headers:{'stripe-signature':header},body:bytes});const env={STRIPE_WEBHOOKS_ENABLED:'true',STRIPE_WEBHOOK_SECRET:secret,STRIPE_MODE:'test',STRIPE_ACCOUNT_ID:'acct_test'};
 let persisted=false;const response=await handleStripeWebhook(request(),env,{rpc:async()=>{persisted=true;}});assert.equal(response.status,200);assert.equal(persisted,true);
 await assert.rejects(handleStripeWebhook(request(),env,{rpc:async()=>{throw Error('database offline');}}),/database offline/);await assert.rejects(handleStripeWebhook(request(),{...env,STRIPE_MODE:'live'},{rpc:async()=>assert.fail('wrong mode persisted')}));
});
test('a webhook arriving during readback remains pending and unsupported event types cannot starve invoices',async()=>{
 const db=await database();try{
  await actor(db,ids.operator,{role:'service_role'});
  const receive=async(event)=>db.query('select public.wm_stripe_event_receive($1,$2,$3,$4)',['test','acct_fixture',event,'b'.repeat(64)]);
  for(let i=0;i<12;i++)await receive({id:'evt_refund'+i,type:'refund.updated',livemode:false,data:{object:{id:'re_'+i,object:'refund'}}});
  await receive({id:'evt_first',type:'invoice.updated',livemode:false,data:{object:{id:'in_queue',object:'invoice'}}});
  const claim=async()=>(await db.query("select public.wm_stripe_readback_claim('test','acct_fixture') r")).rows[0].r;
  const first=await claim();assert.equal(first.object_id,'in_queue');
  await receive({id:'evt_later',type:'invoice.paid',livemode:false,data:{object:{id:'in_queue',object:'invoice'}}});
  await db.query('select public.wm_stripe_invoice_observe($1,$2,$3,$4)',['test','acct_fixture',first.lease_generation,{id:'in_queue',object:'invoice',livemode:false,status:'open'}]);
  const next=await claim();assert.equal(next.object_id,'in_queue');assert.equal(Number(next.lease_generation),Number(first.lease_generation)+1);
  await assert.rejects(db.query('select public.wm_stripe_invoice_observe($1,$2,$3,$4)',['test','acct_fixture',first.lease_generation,{id:'in_queue',object:'invoice',livemode:false,status:'open'}]),/lease/);
  await admin(db);assert.equal((await db.query("select processed_at from wm.stripe_event_inbox where event_id='evt_later'")).rows[0].processed_at,null);
 }finally{await db.close();}
});
test('invoice writes exclude pending items, use exact invoice IDs and do not replay unknown creates',async()=>{
 const env={STRIPE_MODE:'test',STRIPE_ACCOUNT_ID:'acct_test',STRIPE_SECRET_KEY:'sk_test_synthetic',STRIPE_API_VERSION:STRIPE_VERSION};
 const c={id:crypto.randomUUID(),organization_id:ids.org,environment:'test',account_id:'acct_test',customer_id:'cus_test',currency:'USD',amount_minor:10000,description:'Agreed stage',automatic_tax:false};
 const permit={operation:{id:crypto.randomUUID(),organization_id:ids.org,kind:'stripe_invoice_create'},attempt:{id:crypto.randomUUID(),dispatch_nonce:crypto.randomUUID()},context:c};let writes=0,checkpointed=false;
 const invoice={id:'in_test',object:'invoice',customer:'cus_test',currency:'usd',status:'draft',livemode:false,auto_advance:false,lines:{data:[],has_more:false},metadata:{wm_obligation:c.id,wm_business:ids.org}};
 const fetcher=async(url,options)=>{if(url.endsWith('/account'))return Response.json({id:'acct_test'});if(options.method==='POST'){writes++;const form=new URLSearchParams(options.body);assert.equal(form.get('pending_invoice_item_behavior'),'exclude');assert.equal(form.get('auto_advance'),'false');assert.equal(options.headers['Idempotency-Key'],'wm:'+permit.operation.id);}return Response.json(invoice);};
 const proof=await invoiceEffect(env,permit,{fetcher,rpc:async(_e,name)=>{if(name==='wm_billing_effect_context')return c;if(name==='wm_attempt_checkpoint')checkpointed=true;}});assert.equal(writes,1);assert.equal(checkpointed,true);assert.equal(proof.readback_matches,true);
 await assert.rejects(readInvoiceEffect(env,permit,{fetcher}));assert.equal(writes,1);
 const recovered=await readInvoiceEffect(env,{...permit,operation:{...permit.operation,provider_reference:'in_test'}},{fetcher});assert.equal(recovered.provider_reference,'in_test');assert.equal(writes,1);
 const send={...permit,operation:{...permit.operation,kind:'stripe_invoice_send'},attempt:{...permit.attempt,provider_request_id:'in_test'}};
 await assert.rejects(readInvoiceEffect(env,send,{fetcher:async url=>Response.json(url.endsWith('/account')?{id:'acct_test'}:{...invoice,status:'open',status_transitions:{finalized_at:1}})}));
 const finalized={...permit,operation:{...permit.operation,kind:'stripe_invoice_finalize',provider_reference:'in_test'}};
 await assert.rejects(readInvoiceEffect(env,finalized,{fetcher:async url=>Response.json(url.endsWith('/account')?{id:'acct_test'}:{...invoice,status:'open',subtotal:20000,lines:{has_more:false,data:[{amount:20000,metadata:{wm_obligation:c.id}}]},starting_balance:0,automatic_tax:{enabled:false}})}));
});
