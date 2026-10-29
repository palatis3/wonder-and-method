import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {draftScope} from '../scripts/create-job.mjs';
import {paymentAccounts,paymentCatalog,prepareInvoice,assertInvoiceMatches,paymentSummary} from '../src/payments.mjs';
import {stripeClient} from '../deployment/stripe-client.mjs';
import {createDraft,finalizeInvoice,reconcileInvoice} from '../deployment/stripe-billing.mjs';
import {savePreparation} from '../deployment/payment-records.mjs';
const legacy=JSON.parse(await readFile(new URL('../operations/historical/offers-2026-10-24-pre-v3.json',import.meta.url)));
const offers=JSON.parse(await readFile(new URL('../config/offers.json',import.meta.url)));
const now=new Date('2026-10-16T12:00:00Z');
async function accepted(id='launch_site',annual=false,catalog=annual?legacy:offers){
 const scope=await draftScope(id,'synthetic-billing',{billing:annual?'annual':'monthly',catalog});scope.named_approver='Synthetic approver';scope.schedule.booked_start='2026-11-01';scope.milestones[0].approval_reference='synthetic written booking approval';
 scope.buyer_confirmation={page_copy_limits:true,self_editing_understood:true,source_folder_zip_and_build_notes_understood:true,initial_launch_ready_service_limits_and_exclusions_understood:true,optional_handoff_call_and_separate_growth_work_understood:true,required_optional_bills:true,approvals:true,ownership_and_exit:true,questions_resolved:true,written_acceptance_reference:'synthetic scope acceptance',accepted_version:1,accepted_at:'2026-10-15T12:00:00Z'};
 const billing={mode:'test',account_id:paymentAccounts.test,customer_id:'cus_synthetic',scope_version:1,due_at:'2026-10-30T12:00:00Z',fit_reference:'synthetic',capacity_reference:'synthetic',cash_reference:'synthetic',agreement_reference:'synthetic',tax:{treatment:'no_tax',review_reference:'synthetic tax decision',rate_ids:[]}};
 if(scope.service_period){scope.service_period={start:'2026-11-01T12:00:00Z',end:annual?'2027-11-01T12:00:00Z':'2026-12-01T12:00:00Z',timezone:'America/New_York',cycles:annual?12:1};Object.assign(billing,{cancellation_route:'support@example.invalid',coverage_reference:'synthetic',cycle_approval_reference:'synthetic',annual_reserve_reference:'synthetic',manual_annual_renewal:true});}
 if(annual)billing.annual_reserve={reviewed_at:'2026-10-15T12:00:00Z',funding_evidence_reference:'synthetic funded reserve',refund_rehearsal_reference:'synthetic rehearsal',gross_unearned_cents:Math.round(scope.fixed_price*100),independent_fee_buffer_cents:20000,accepted_undelivered_cents:5000,funded_total_cents:Math.round(scope.fixed_price*100)+25000};
 return {scope,billing};
}
function mockClient(plan){
 const invoices=[],calls=[];
 const client={mode:'test',account:async()=>({account_id:paymentAccounts.test}),list:async()=>structuredClone(invoices),request:async(path,options={})=>{
  calls.push({path,...options});
  if(path==='/customers/'+plan.customer)return {id:plan.customer,livemode:false,balance:0};
  if(path==='/invoices'&&options.method==='POST'){
   const data=options.data,invoice={...data,id:'in_synthetic',status:'draft',livemode:false,subtotal:0,total:0,amount_due:0,amount_paid:0,amount_remaining:0,starting_balance:0,lines:{data:[],has_more:false},discounts:[],default_tax_rates:[]};invoices.push(invoice);return structuredClone(invoice);
  }
  const invoice=invoices[0];
  if(path==='/invoiceitems'){invoice.lines.data.push({amount:options.data.amount});invoice.subtotal=invoice.total=invoice.amount_due=invoice.amount_remaining=options.data.amount;return {id:'ii_synthetic'};}
  if(path.endsWith('/finalize')){invoice.status='open';invoice.hosted_invoice_url='https://invoice.stripe.com/i/synthetic';return structuredClone(invoice);}
  if(path==='/invoices/in_synthetic')return structuredClone(invoice);
  throw Error('Unexpected mock request '+path);
 }};return {client,invoices,calls};
}
test('current catalog has fifteen offers and 31 exact milestones or monthly cycle prices',()=>{
 const catalog=paymentCatalog(offers);assert.equal(catalog.length,15);assert.equal(catalog.flatMap(p=>p.prices).length,31);assert.deepEqual(catalog.find(p=>p.id==='focused_site').prices.map(p=>p.amount),[180000,135000,135000]);assert.deepEqual(catalog.find(p=>p.id==='keep_running').prices.map(p=>p.amount),[27500]);assert.deepEqual(catalog.find(p=>p.id==='audit_fix_sprint').prices.map(p=>p.amount),[90000,90000]);assert.equal(new Set(catalog.flatMap(p=>p.prices.map(x=>x.lookup_key))).size,31);
});
test('unaccepted draft, silent approval, unresolved tax and altered amount all block billing',async()=>{
 const draft=await draftScope('launch_site','synthetic-billing');assert.throws(()=>prepareInvoice(draft,{},0,{now}));
 for(const mutation of [(s)=>s.milestones[0].approval_reference=null,(s)=>s.milestones[0].amount=1,(s,b)=>b.tax.review_reference=null,(s)=>s.buyer_confirmation.accepted_version=2,(s,b)=>b.account_id=paymentAccounts.live]){const {scope,billing}=await accepted();mutation(scope,billing);assert.throws(()=>prepareInvoice(scope,billing,0,{now}));}
});
test('historically accepted annual invoice requires all twelve cycles, reserves and manual renewal',async()=>{
 const {scope,billing}=await accepted('improve',true);assert.equal(prepareInvoice(scope,billing,0,{now}).amount,456000);billing.manual_annual_renewal=false;assert.throws(()=>prepareInvoice(scope,billing,0,{now}),/manual renewal/);billing.manual_annual_renewal=true;scope.service_period.cycles=1;assert.throws(()=>prepareInvoice(scope,billing,0,{now}),/cycle count/);
});

test('current builds require core buyer confirmations and historical source delivery retains its specific safeguards',async()=>{
 const core=['page_copy_limits','self_editing_understood','required_optional_bills','approvals','ownership_and_exit','questions_resolved'];
 for(const id of ['launch_site','focused_site','business_site','signature_site','storefront']){
  const acceptedBuild=await accepted(id);assert.ok(prepareInvoice(acceptedBuild.scope,acceptedBuild.billing,0,{now}).amount>0);
  for(const key of core)for(const missing of [false,null,undefined]){const {scope,billing}=await accepted(id);scope.buyer_confirmation[key]=missing;assert.throws(()=>prepareInvoice(scope,billing,0,{now}),new RegExp(key));}
 }
 const keys=['source_folder_zip_and_build_notes_understood','initial_launch_ready_service_limits_and_exclusions_understood','optional_handoff_call_and_separate_growth_work_understood'];
 for(const id of ['launch_site','focused_site','signature_site']){
  for(const key of keys)for(const missing of [false,null,undefined]){const {scope,billing}=await accepted(id,false,legacy);scope.buyer_confirmation[key]=missing;assert.throws(()=>prepareInvoice(scope,billing,0,{now}),new RegExp(key));}
 }
 const historical=await accepted('launch_site',false,legacy);delete historical.scope.commercial_snapshot.offer.editing_mode;for(const key of keys)delete historical.scope.buyer_confirmation[key];assert.equal(prepareInvoice(historical.scope,historical.billing,0,{now}).amount,70000);
 for(const id of ['website_baseline','audit_fix_sprint','keep_running']){const {scope,billing}=await accepted(id);for(const key of keys)scope.buyer_confirmation[key]=false;assert.ok(prepareInvoice(scope,billing,0,{now}).amount>0);}
});

test('repeated draft creation reuses the invoice and never adds a second line or emails',async()=>{
 const {scope,billing}=await accepted(),plan=prepareInvoice(scope,billing,0,{now}),mock=mockClient(plan);await createDraft(mock.client,plan);await createDraft(mock.client,plan);assert.equal(mock.invoices.length,1);assert.equal(mock.invoices[0].lines.data.length,1);assert.equal(mock.calls.filter(c=>c.method==='POST').length,2);assert.equal(mock.invoices[0].auto_advance,false);assert.equal(mock.invoices[0].collection_method,'send_invoice');assert.ok(!mock.calls.some(c=>/\/send|\/pay/.test(c.path)));
});
test('changed terms cannot create another invoice for the same obligation',async()=>{
 const {scope,billing}=await accepted(),plan=prepareInvoice(scope,billing,0,{now}),mock=mockClient(plan);await createDraft(mock.client,plan);billing.due_at='2026-10-29T12:00:00Z';const changed=prepareInvoice(scope,billing,0,{now});assert.equal(plan.obligation,changed.obligation);await assert.rejects(createDraft(mock.client,changed),/different terms/);assert.equal(mock.invoices.length,1);
});
test('later milestone cannot be billed before the prior Stripe invoice is paid',async()=>{
 const {scope,billing}=await accepted();scope.milestones[1].approval_reference='synthetic design approval';const plan=prepareInvoice(scope,billing,1,{now}),mock=mockClient(plan);await assert.rejects(createDraft(mock.client,plan),/verified paid/);assert.ok(!mock.calls.some(c=>c.method==='POST'));
});
test('finalization checks exact total, returns a hosted payment page, and sends no email',async()=>{
 const {scope,billing}=await accepted(),plan=prepareInvoice(scope,billing,0,{now}),mock=mockClient(plan);await createDraft(mock.client,plan);await assert.rejects(finalizeInvoice(mock.client,plan,{invoiceId:'in_synthetic',total:1}),/exact reviewed/);const result=await finalizeInvoice(mock.client,plan,{invoiceId:'in_synthetic',total:118000});assert.equal(result.status,'open');assert.equal(result.payment_confirmed,false);assert.match(result.hosted_invoice_url,/invoice.stripe.com/);assert.ok(!mock.calls.some(c=>/\/send|\/pay/.test(c.path)));
});
test('foreign customers, tax changes, discounts, partial payment and auto-charge settings fail closed',async()=>{
 const {scope,billing}=await accepted(),plan=prepareInvoice(scope,billing,0,{now}),mock=mockClient(plan);await createDraft(mock.client,plan);const invoice=mock.invoices[0];for(const patch of [{customer:'cus_other'},{livemode:true},{auto_advance:true},{default_tax_rates:[{id:'txr_unapproved'}]},{discounts:['di_x']},{starting_balance:-100}])assert.throws(()=>assertInvoiceMatches({...invoice,...patch},plan,{finalizing:true}));assert.equal(paymentSummary({...invoice,status:'open',amount_paid:1}).payment_confirmed,false);assert.equal(paymentSummary({...invoice,status:'paid',amount_remaining:0,amount_paid:0}).payment_confirmed,false);
});
test('reconciliation is read-only and requires the original invoice association',async()=>{
 const {scope,billing}=await accepted(),plan=prepareInvoice(scope,billing,0,{now}),mock=mockClient(plan);await createDraft(mock.client,plan);mock.invoices[0].status='paid';mock.invoices[0].amount_paid=118000;mock.invoices[0].amount_remaining=0;const before=mock.calls.filter(c=>c.method==='POST').length;assert.equal((await reconcileInvoice(mock.client,plan,'in_synthetic')).payment_confirmed,true);assert.equal(mock.calls.filter(c=>c.method==='POST').length,before);mock.invoices[0].metadata.wm_scope_hash='tampered';await assert.rejects(reconcileInvoice(mock.client,plan,'in_synthetic'),/accepted request/);
});
test('wrong account, mode or unavailable live charging blocks access; API errors omit private body',async()=>{
 assert.throws(()=>stripeClient({key:'sk_test_fake',mode:'live'}));
 const wrong=stripeClient({key:'sk_test_fake',mode:'test',fetchImpl:async()=>Response.json({id:'acct_other'})});await assert.rejects(wrong.account(),/Wrong Stripe account/);
 const pending=stripeClient({key:'sk_live_fake',mode:'live',fetchImpl:async()=>Response.json({id:paymentAccounts.live,charges_enabled:false,payouts_enabled:false})});await assert.rejects(pending.account(),/both be enabled/);
 const failed=stripeClient({key:'sk_test_fake',mode:'test',fetchImpl:async()=>new Response('secret customer content',{status:400})});await assert.rejects(failed.request('/account'),error=>!error.message.includes('secret customer'));
});
test('automatic or line-level taxes cannot override a reviewed no-tax obligation',async()=>{
 const {scope,billing}=await accepted(),plan=prepareInvoice(scope,billing,0,{now}),mock=mockClient(plan);await createDraft(mock.client,plan);const invoice=mock.invoices[0];
 assert.throws(()=>assertInvoiceMatches({...invoice,automatic_tax:{enabled:true}},plan,{finalizing:true}),/Automatic tax/);
 const tax={type:'tax_rate_details',tax_rate_details:{tax_rate:'txr_unapproved'},amount:11800,tax_behavior:'exclusive'};
 assert.throws(()=>assertInvoiceMatches({...invoice,total:129800,amount_due:129800,total_taxes:[tax],lines:{data:[{amount:118000,taxes:[tax]}]}},plan,{finalizing:true}),/Unapproved effective/);
 assert.throws(()=>assertInvoiceMatches({...invoice,total:129800,amount_due:129800},plan,{finalizing:true}),/total differs/);
});
test('a partial payment plus credit cannot unlock the next milestone',async()=>{
 const {scope,billing}=await accepted(),first=prepareInvoice(scope,billing,0,{now}),mock=mockClient(first);await createDraft(mock.client,first);Object.assign(mock.invoices[0],{status:'paid',amount_paid:100,amount_remaining:0,pre_payment_credit_notes_amount:117900});assert.equal(paymentSummary(mock.invoices[0]).payment_confirmed,false);scope.milestones[1].approval_reference='synthetic accepted design';const second=prepareInvoice(scope,billing,1,{now}),before=mock.calls.filter(c=>c.method==='POST').length;await assert.rejects(createDraft(mock.client,second),/Credits or amended/);assert.equal(mock.calls.filter(c=>c.method==='POST').length,before);
});
test('a discounted prior invoice cannot unlock a full-price accepted milestone',async()=>{
 const {scope,billing}=await accepted(),first=prepareInvoice(scope,billing,0,{now}),mock=mockClient(first);await createDraft(mock.client,first);Object.assign(mock.invoices[0],{status:'paid',total:100,amount_paid:100,amount_remaining:0,discounts:['di_example'],total_discount_amounts:[{amount:117900}]});scope.milestones[1].approval_reference='synthetic accepted design';await assert.rejects(createDraft(mock.client,prepareInvoice(scope,billing,1,{now})),/accepted amount/);assert.equal(mock.calls.filter(c=>c.path==='/invoices'&&c.method==='POST').length,1);
});
test('preparation preserves issued invoice associations and the original overdue request',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'wm-payment-record-'));try{const {scope,billing}=await accepted(),plan=prepareInvoice(scope,billing,0,{now}),file=join(folder,plan.id+'.json');await savePreparation(file,plan);const issued={plan,invoice:{invoice_id:'in_synthetic',status:'open'}};await writeFile(file,JSON.stringify(issued));await savePreparation(file,plan);assert.deepEqual(JSON.parse(await readFile(file,'utf8')),issued);assert.ok(Date.parse('2026-11-01T00:00:00Z')>plan.due_date*1000);assert.equal(JSON.parse(await readFile(file,'utf8')).plan.id,plan.id);}finally{await rm(folder,{recursive:true,force:true});}
});
test('read-only reconciliation works after live charges and payouts become disabled',async()=>{
 const {scope,billing}=await accepted();billing.mode='live';billing.account_id=paymentAccounts.live;const plan=prepareInvoice(scope,billing,0,{now}),mock=mockClient(plan);mock.client.mode='live';
 const invoice={customer:plan.customer,livemode:true,currency:'usd',metadata:{wm_request:plan.id,wm_scope_hash:plan.scope_hash},collection_method:'send_invoice',auto_advance:false,automatic_tax:{enabled:false},subtotal:plan.amount,total:plan.amount,lines:{data:[{amount:plan.amount}],has_more:false},due_date:plan.due_date,default_tax_rates:[],id:'in_synthetic',status:'open',amount_paid:0,amount_remaining:plan.amount,starting_balance:0};
 const calls=[],client=stripeClient({key:'sk_live_fake',mode:'live',fetchImpl:async(url,options)=>{calls.push({url,method:options.method});return Response.json(url.endsWith('/account')?{id:paymentAccounts.live,charges_enabled:false,payouts_enabled:false}:invoice);}});assert.equal((await reconcileInvoice(client,plan,'in_synthetic')).status,'open');assert.ok(calls.every(c=>c.method==='GET'));
});

test('historical annual invoice rejects unfunded, missing and future-dated reserve evidence',async()=>{
 for(const mutate of [b=>b.annual_reserve=null,b=>b.annual_reserve.funding_evidence_reference=null,b=>b.annual_reserve.refund_rehearsal_reference=null,b=>b.annual_reserve.reviewed_at='2027-01-01T00:00:00Z',b=>b.annual_reserve.gross_unearned_cents=1,b=>b.annual_reserve.independent_fee_buffer_cents=0,b=>b.annual_reserve.funded_total_cents-=1,b=>b.annual_reserve.accepted_undelivered_cents=null]){
  const {scope,billing}=await accepted('improve',true);mutate(billing);assert.throws(()=>prepareInvoice(scope,billing,0,{now}),/reserve|Fund the gross/);
 }
});

test('current V3 monthly plans cannot create new annual commitments',async()=>{for(const id of ['keep_running','improve','local_focus','grow'])await assert.rejects(()=>draftScope(id,'synthetic-current-annual',{billing:'annual'}),/annual enrollment is unavailable/i);});
