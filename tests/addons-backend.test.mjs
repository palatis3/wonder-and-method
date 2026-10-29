import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import offers from '../config/offers.json' with {type:'json'};
import historicalOffers from '../operations/historical/offers-2026-10-24-pre-v3.json' with {type:'json'};
import {normalizeAddonSelection,addonSelectionFromQuery,priceAddons} from '../src/addons.mjs';
import {validateInquiry} from '../src/inquiry.mjs';
import {quotedOffer,assertAddonCommercialSnapshot} from '../src/commercial.mjs';
import {commercialAcceptanceDigest,prepareInvoice,paymentAccounts,paymentCatalog} from '../src/payments.mjs';
import {draftScope} from '../scripts/create-job.mjs';
import {renderJobPacket} from '../scripts/job-packet.mjs';
import {createServer} from '../scripts/server.mjs';
import {inquiryResponseHtml} from '../src/inquiry-response.mjs';
import worker,{notifyInquiry} from '../deployment/worker.mjs';

const expectedPrices={reporting_dashboard:1500,logo_identity:1800,standard_page:350,three_page_bundle:900,practical_guide:800,campaign_landing_page:1200,booking_setup:850,guided_quote_form:1200,business_email_domain:650,profile_recovery:650,print_collateral:750,care_onboarding:375,single_fix:450};
const inquiry={name:'Synthetic Additions',email:'additions@example.test',business:'Synthetic Only',website:'',service:'launch_site',message:'Synthetic request for the selected website additions.'};
const now=new Date('2026-10-20T12:00:00Z');
async function accepted(id='launch_site',ids=['standard_page','booking_setup'],payment_schedule,catalog){
 const scope=await draftScope(id,'synthetic-additions',{add_ons:ids,payment_schedule,catalog});
 scope.named_approver='Synthetic approver';scope.schedule.booked_start='2026-11-01';
 for(const milestone of scope.milestones)milestone.approval_reference='synthetic written milestone approval';
 Object.assign(scope.buyer_confirmation,{page_copy_limits:true,self_editing_understood:true,source_folder_zip_and_build_notes_understood:true,initial_launch_ready_service_limits_and_exclusions_understood:true,optional_handoff_call_and_separate_growth_work_understood:true,required_optional_bills:true,approvals:true,ownership_and_exit:true,questions_resolved:true,written_acceptance_reference:'synthetic written acceptance',accepted_version:scope.version,accepted_at:'2026-10-19T12:00:00Z'});
 if(ids.length){scope.buyer_confirmation.add_ons_and_total_understood=true;scope.buyer_confirmation.accepted_commercial_digest=commercialAcceptanceDigest(scope);}
 const billing={mode:'test',account_id:paymentAccounts.test,customer_id:'cus_synthetic',scope_version:scope.version,due_at:'2026-10-30T12:00:00Z',fit_reference:'synthetic',capacity_reference:'synthetic',cash_reference:'synthetic',agreement_reference:'synthetic',tax:{treatment:'no_tax',review_reference:'synthetic tax review',rate_ids:[]}};
 return {scope,billing};
}
const migrationNames=['0001_inquiries.sql','0003_inquiry_followup.sql','0005_inquiry_operations.sql','0009_inquiry_delivery_resolutions.sql'];
const migrations=await Promise.all(migrationNames.map(name=>readFile(new URL('../deployment/migrations/'+name,import.meta.url),'utf8')));
function environment(t){
 const sqlite=new DatabaseSync(':memory:');for(const sql of migrations)sqlite.exec(sql);
 t.after(()=>sqlite.close());
 const DB={sqlite,prepare(sql){const build=values=>({bind:(...next)=>build(next),async first(){return sqlite.prepare(sql).get(...values)||null;},async all(){return {results:sqlite.prepare(sql).all(...values)};},async run(){return {success:true,meta:sqlite.prepare(sql).run(...values)};}});return build([]);}};
 return {DB,ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'synthetic',OPERATOR_TOKEN:'synthetic-operator-only',FINGERPRINT_SECRET:'synthetic-additions-secret-more-than-32-characters',ASSETS:{fetch:async()=>new Response('Synthetic asset')}};
}
function request(data,headers={}){
 return new Request('https://example.test/api/inquiries',{method:'POST',headers:{Origin:'https://example.test',Accept:'application/json','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.99',...headers},body:typeof data==='string'?data:JSON.stringify(data)});
}
const ctx={waitUntil(){throw Error('Synthetic inquiry must not queue a send.');}};

test('catalog prices, starter quantities and minimal calculator price rows share one total',()=>{
 assert.deepEqual(Object.fromEntries(offers.add_ons.map(item=>[item.id,item.public_price])),expectedPrices);
 const ids=Object.keys(expectedPrices),priced=priceAddons(ids);
 assert.deepEqual(priced.ids,[...ids].sort());assert.equal(priced.total,Object.values(expectedPrices).reduce((a,b)=>a+b,0));
 assert.ok(priced.lines.every(line=>line.quantity===1&&line.line_total===expectedPrices[line.id]));
 assert.equal(priceAddons(ids,offers.add_ons.map(({id,public_name,public_price})=>({id,public_name,public_price}))).total,priced.total);
 assert.deepEqual(priceAddons([],[]),{ids:[],lines:[],total:0});
 assert.equal(paymentCatalog(offers).length,15,'All fifteen V3 plans are public request options; standalone additions remain separate.');
});

test('native checkbox and canonical selections agree; absence preserves old payload bytes',()=>{
 const ids=['booking_setup','standard_page'];
 assert.deepEqual(normalizeAddonSelection({addon_standard_page:'1',addon_booking_setup:'1'}),ids);
 assert.deepEqual(normalizeAddonSelection({add_ons:[...ids].reverse()}),ids);
 assert.deepEqual(addonSelectionFromQuery('standard_page,booking_setup'),ids);
 for(const value of [null,undefined,''])assert.deepEqual(addonSelectionFromQuery(value),[]);
 const before=validateInquiry(inquiry).value;
 assert.deepEqual(Object.keys(before),['name','email','business','website','service','message']);
 assert.equal(JSON.stringify(validateInquiry({...inquiry,add_ons:[]}).value),JSON.stringify(before));
 assert.deepEqual(validateInquiry({...inquiry,addon_booking_setup:'1',addon_standard_page:'1'}).value.add_ons,ids);
});

test('unknown, repeated, mixed and count-bearing inputs fail closed without accepting partial selection',()=>{
 for(const invalid of [
  {add_ons:['unknown']},{add_ons:['__proto__']},{add_ons:['booking_setup','booking_setup']},{add_ons:['booking_setup',1]},
  {add_ons:'booking_setup'},{add_ons:null},{add_ons:{}},{add_ons:Array(14).fill('booking_setup')},
  {addon_booking_setup:1},{addon_booking_setup:true},{addon_booking_setup:'2'},{addon_booking_setup:'0'},{addon_booking_setup:''},
  {addon_unknown:'1'},{addon___proto__:'1'},{addon_booking_setup:'1',add_ons:[]},
  {add_ons:['booking_setup'],addons:'booking_setup'},{add_ons:['booking_setup'],addon_counts:{}},{add_on_quantities:{booking_setup:2}},{addons_counts:{booking_setup:2}}
 ]){
  assert.throws(()=>normalizeAddonSelection(invalid),undefined,JSON.stringify(invalid));
  const checked=validateInquiry({...inquiry,...invalid});assert.ok(checked.errors.add_ons);assert.equal(checked.value.add_ons,undefined);
 }
 for(const value of ['booking_setup,booking_setup','booking_setup,unknown','booking_setup,',' booking_setup','booking_setup,standard_page:2',42])assert.throws(()=>addonSelectionFromQuery(value));
});

test('forged public prices are never saved or used and all inquiry intents retain independent additions',()=>{
 for(const service of ['launch_site','focused_site','business_site','signature_site','unsure','keep_running','improve','local_focus','grow','website_baseline','audit_fix_sprint','brand_message','storefront','local_presence','workflow','systems']){
  const result=validateInquiry({...inquiry,service,add_ons:['booking_setup'],public_price:1,price:1,total:1,request_kind:'question'});
  assert.deepEqual(result.errors,{});assert.deepEqual(result.value.add_ons,['booking_setup']);
  for(const key of ['public_price','price','total'])assert.equal(result.value[key],undefined);
 }
 assert.equal(priceAddons(['booking_setup']).total,850);
});

test('edge native and JSON submissions canonicalize, dedupe and export the same selection',async t=>{
 const env=environment(t),raw={...inquiry,service:'improve',addon_standard_page:'1',addon_booking_setup:'1'};
 const first=await worker.fetch(request(new URLSearchParams(raw).toString(),{'Content-Type':'application/x-www-form-urlencoded'}),env,ctx);
 assert.equal(first.status,202);const saved=await first.json();assert.deepEqual(saved.add_ons,['booking_setup','standard_page']);
 const duplicate=await worker.fetch(request({...inquiry,service:'improve',add_ons:['standard_page','booking_setup']}),env,ctx);
 assert.equal((await duplicate.json()).reference,saved.reference);
 const different=await worker.fetch(request({...inquiry,service:'improve',add_ons:['booking_setup']}),env,ctx);
 assert.notEqual((await different.json()).reference,saved.reference);
 const response=await worker.fetch(new Request('https://example.test/api/operator/inquiries',{headers:{Authorization:'Bearer '+env.OPERATOR_TOKEN}}),env,ctx);
 assert.equal(response.status,200);const exported=await response.json();
 assert.equal(exported.records.length,2);assert.deepEqual(JSON.parse(exported.records.find(row=>row.id===saved.reference).payload).add_ons,['booking_setup','standard_page']);
});

test('edge rejects duplicate native checkbox keys and native correction retains valid selections',async t=>{
 const env=environment(t),raw=new URLSearchParams({...inquiry,addon_booking_setup:'1'});
 raw.append('addon_booking_setup','1');
 const repeated=await worker.fetch(request(raw.toString(),{'Content-Type':'application/x-www-form-urlencoded'}),env,ctx);
 assert.equal(repeated.status,400);
 const corrected=await worker.fetch(request(new URLSearchParams({...inquiry,message:'short',addon_booking_setup:'1'}).toString(),{'Content-Type':'application/x-www-form-urlencoded',Accept:'text/html'}),env,ctx);
 assert.equal(corrected.status,422);const html=await corrected.text();
 assert.match(html,/name="addon_booking_setup"[^>]*checked|checked[^>]*name="addon_booking_setup"/);
 assert.match(html,/addons=booking_setup/);assert.doesNotMatch(html,/add_ons=/);
 assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n,0);
 const response=inquiryResponseHtml({message:'Try again',service:'grow',add_ons:['booking_setup'],status:503});
 assert.match(response,/addons=booking_setup/);assert.doesNotMatch(response,/add_ons=/);
});

test('notification includes requested additions, freezes new requests, and preserves legacy attempted bytes',async t=>{
 const env=environment(t),saved=await (await worker.fetch(request({...inquiry,add_ons:['booking_setup']}),env,ctx)).json();
 env.INQUIRY_MODE='live';env.RESEND_API_KEY='synthetic-not-a-secret';env.NOTIFICATION_FROM='studio@example.test';env.NOTIFICATION_TO='owner@example.test';
 env.DB.sqlite.prepare("UPDATE inquiries SET synthetic=0,delivery_status='pending' WHERE id=?").run(saved.reference);
 const bodies=[],sender=async(_url,options)=>{bodies.push(options.body);return new Response('',{status:503});},instant=Date.now();
 await notifyInquiry(env,saved.reference,sender,instant);
 assert.match(JSON.parse(bodies[0]).text,/Booking or Deposit Setup/);assert.match(JSON.parse(bodies[0]).text,/\$850/);
 const payload=JSON.parse(env.DB.sqlite.prepare('SELECT payload FROM inquiries WHERE id=?').get(saved.reference).payload);
 env.DB.sqlite.prepare('UPDATE inquiries SET payload=? WHERE id=?').run(JSON.stringify({...payload,add_ons:['logo_identity']}),saved.reference);
 env.NOTIFICATION_TO='changed@example.test';
 await notifyInquiry(env,saved.reference,sender,instant+1000);assert.equal(bodies[1],bodies[0]);
 const legacy='11111111-1111-4111-8111-111111111111';
 env.DB.sqlite.prepare("INSERT INTO inquiries(id,created_at,payload,dedupe_key,synthetic,delivery_status,attempts,first_attempt_at) VALUES(?,?,?,?,0,'uncertain',1,?)").run(legacy,instant,JSON.stringify(payload),'legacy-only',instant-1000);
 await notifyInquiry(env,legacy,sender,instant);
 const expected={from:env.NOTIFICATION_FROM,to:[env.NOTIFICATION_TO],reply_to:payload.email,subject:`Website inquiry ${legacy}`,text:['Website inquiry',`Reference: ${legacy}`,...Object.entries(payload).map(([k,v])=>`${k}: ${v}`)].join('\n\n')};
 assert.equal(bodies[2],JSON.stringify(expected));
 assert.equal(env.DB.sqlite.prepare('SELECT notification_payload FROM inquiries WHERE id=?').get(legacy).notification_payload,null);
});

test('local native parser rejects repeated fields before saving and shares canonical selection',async()=>{
 const runtime=await mkdtemp(join(tmpdir(),'wm-addons-local-'));
 let local;
 try{
  local=await createServer({runtime,port:0});
  const submit=body=>fetch(local.url+'/api/inquiries',{method:'POST',headers:{Origin:local.url,Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body});
  const raw=new URLSearchParams({...inquiry,addon_booking_setup:'1'});
  const saved=await submit(raw.toString());assert.equal(saved.status,201);assert.deepEqual((await saved.json()).add_ons,['booking_setup']);
  raw.append('addon_booking_setup','1');assert.equal((await submit(raw.toString())).status,400);
  assert.equal(local.db.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n,1);
 }finally{
  if(local)await new Promise(done=>local.server.close(done));
  assert.ok(resolve(runtime).startsWith(resolve(tmpdir())+sep+'wm-addons-local-'));
  await rm(runtime,{recursive:true,force:true});
 }
});

test('all four website builds combine exact frozen line items with unchanged base terms and 40/30/30 stages',async()=>{
 for(const [id,base]of [['launch_site',2950],['focused_site',4500],['business_site',7500],['signature_site',11500]]){
  const original=structuredClone(offers[id]),scope=await draftScope(id,'synthetic-additions',{add_ons:['standard_page','booking_setup']});
  const quote=assertAddonCommercialSnapshot(scope);
  assert.equal(quote.base_price,base);assert.equal(quote.add_ons_total,1200);assert.equal(scope.fixed_price,base+1200);
  assert.deepEqual(scope.milestones.map(m=>m.amount),[(base+1200)*.4,(base+1200)*.3,(base+1200)*.3]);
  assert.deepEqual(offers[id],original);assert.deepEqual(quote.base_payment_schedule,original.payment_schedule);
  const packet=renderJobPacket(scope,{},offers);
  assert.match(packet,/Selected website additions/);assert.match(packet,/Booking or Deposit Setup/);assert.equal((packet.match(/class="invoice"/g)||[]).length,3);
  assert.match(packet,/accepted_commercial_digest/);
 }
 for(const id of ['keep_running','improve','local_focus','grow','website_baseline','audit_fix_sprint','brand_message','local_presence','workflow','systems'])await assert.rejects(()=>draftScope(id,'synthetic-additions',{add_ons:['booking_setup']}),/separate website_additions/);
});

test('standalone additions require a nonempty selection and explicit internally consistent schedule',async()=>{
 const ids=['booking_setup','standard_page'],schedule=[{event:'After written scope approval',percent:50,amount:600},{event:'After written acceptance of completed additions',percent:50,amount:600}];
 await assert.rejects(()=>draftScope('website_additions','synthetic-additions'),/at least one/);
 await assert.rejects(()=>draftScope('website_additions','synthetic-additions',{add_ons:ids}),/explicit agreed payment schedule/);
 for(const invalid of [[],[{event:'Accepted',percent:100,amount:1}],[{event:'',percent:100,amount:1200}],[{event:'Accepted',percent:50,amount:450}],[{event:'Accepted',percent:100,amount:-1200}],[{event:'Accepted',percent:100,amount:1200.001}]]){
  await assert.rejects(()=>draftScope('website_additions','synthetic-additions',{add_ons:ids,payment_schedule:invalid}));
 }
 const {scope,billing}=await accepted('website_additions',ids,schedule);
 assert.equal(scope.fixed_price,1200);assert.equal(scope.billing_option,'one_off');assert.equal(scope.service_period,null);
 assert.equal(assertAddonCommercialSnapshot(scope).payment_rule,'agreed_standalone');
 assert.equal(prepareInvoice(scope,billing,0,{now}).amount,60000);
 assert.equal((renderJobPacket(scope,{},offers).match(/class="invoice"/g)||[]).length,2);
});

test('new compositions bind accepted prices, selection and boundaries; stale or absent evidence blocks billing',async()=>{
 const original=await accepted();assert.equal(prepareInvoice(original.scope,original.billing,0,{now}).amount,166000);
 for(const change of [
  s=>{delete s.buyer_confirmation.accepted_commercial_digest;},
  s=>{s.buyer_confirmation.accepted_version=2;},
  s=>{s.buyer_confirmation.add_ons_and_total_understood=false;},
  s=>{s.add_ons=['logo_identity'];},
  s=>{s.commercial_snapshot.add_on_quote.lines[0].quantity=2;},
  s=>{s.commercial_snapshot.add_on_quote.lines[0].line_total=1;},
  s=>{s.commercial_snapshot.add_on_quote.add_ons_total=1;},
  s=>{s.milestones[0].amount=1;},
  s=>{s.exact_routes.push('/new-unapproved-route/');},
  s=>{s.commercial_snapshot.add_on_quote.terms.support='Changed promise';s.commercial_boundaries.add_on_terms.support='Changed promise';},
  s=>{delete s.commercial_snapshot.add_on_quote;},
  s=>{delete s.commercial_snapshot.add_on_quote;delete s.add_ons;}
 ]){
  const scope=structuredClone(original.scope);change(scope);
  assert.throws(()=>prepareInvoice(scope,original.billing,0,{now}));
  const packet=renderJobPacket(scope,{},offers);assert.match(packet,/Commercial mismatch/);assert.doesNotMatch(packet,/class="invoice"/);
 }
 const samePrice=await accepted('launch_site',['business_email_domain']),substitute=await draftScope('launch_site','synthetic-additions',{add_ons:['profile_recovery']});
 samePrice.scope.add_ons=substitute.add_ons;samePrice.scope.commercial_snapshot=substitute.commercial_snapshot;samePrice.scope.commercial_boundaries=substitute.commercial_boundaries;
 assert.throws(()=>prepareInvoice(samePrice.scope,samePrice.billing,0,{now}),/changed after acceptance/);
 original.scope.milestones[1].approval_reference='new operational approval reference';
 assert.equal(prepareInvoice(original.scope,original.billing,0,{now}).amount,166000,'Later approval evidence does not invalidate commercial acceptance.');
});

test('acceptance binds all scope obligations, project facts and optional-service terms by default',async()=>{
 const schedule=[{event:'After written scope approval',percent:50,amount:900},{event:'After written acceptance of the identity kit',percent:50,amount:900}];
 for(const [id,ids,stages]of [['website_additions',['logo_identity'],schedule],['launch_site',['booking_setup'],undefined]]){
  const {scope:original,billing}=await accepted(id,ids,stages),approved=commercialAcceptanceDigest(original);
  assert.equal(prepareInvoice(original,billing,0,{now}).amount,Math.round(original.milestones[0].amount*100));
  for(const [field,change]of [
   ['change_process',s=>{s.change_process='New work is billed automatically without written approval.';}],
   ['project_fact_sheet',s=>{s.project_fact_sheet.input_owners_and_due_dates.push({owner:'Client',input:'New mandatory content',due:'2026-10-21'});}],
   ['optional_services',s=>{s.optional_services.push({service:'Identity kit support',renewal_timestamp:'2026-11-01T00:00:00Z',written_cancellation_route:'New unapproved cancellation terms'});}],
   ['future scope term',s=>{s.additional_contract_term='A future material scope obligation.';}],
   ['milestone due date',s=>{s.milestones[0].due_date='2026-10-22';}],
   ['future milestone term',s=>{s.milestones[0].additional_payment_term='A new unapproved condition.';}]
  ]){
   const scope=structuredClone(original);change(scope);
   assert.notEqual(commercialAcceptanceDigest(scope),approved,id+' '+field);
   assert.throws(()=>prepareInvoice(scope,billing,0,{now}),/changed after acceptance/,id+' '+field);
   const packet=renderJobPacket(scope,{},offers);
   assert.match(packet,/Commercial mismatch/,id+' '+field);
   assert.doesNotMatch(packet,/class="invoice"/,id+' '+field);
  }
 }
});

test('documented operational evidence can change without redefining accepted commercial terms',async()=>{
 const {scope,billing}=await accepted(),approved=commercialAcceptanceDigest(scope);
 scope.status='Accepted; invoice prepared';
 scope.accepted_at=scope.buyer_confirmation.accepted_at;
 scope.invoice_system_reference='synthetic-invoice-reference';
 scope.access_manager_reference='synthetic-access-reference';
 scope.buyer_confirmation.written_acceptance_reference='synthetic replacement reference to the same written approval';
 Object.assign(scope.milestones[0],{approval_reference:'synthetic recorded approval',invoice_system_reference:'synthetic milestone invoice',payment_confirmed:true});
 assert.equal(commercialAcceptanceDigest(scope),approved);
 assert.equal(prepareInvoice(scope,billing,0,{now}).amount,166000);
 assert.doesNotMatch(renderJobPacket(scope,{},offers),/Commercial mismatch/);
});

test('V3 overlapping additions require reviewed credits and new builds cannot sell duplicate onboarding',async()=>{
 for(const id of ['launch_site','focused_site','business_site','signature_site','storefront']){
  await assert.rejects(()=>draftScope(id,'synthetic-credits',{add_ons:['care_onboarding']}),/onboarding is included/i);
  await assert.rejects(()=>draftScope(id,'synthetic-credits',{add_ons:['guided_quote_form']}),/reviewed incremental-scope credit/);
 }
 for(const id of ['focused_site','business_site','signature_site','storefront'])await assert.rejects(()=>draftScope(id,'synthetic-credits',{add_ons:['reporting_dashboard']}),/reviewed incremental-scope credit/);
 const credit={id:'guided_quote_form',credit:200,reason:'Remove the included ordinary form production and testing.'};
 const scope=await draftScope('launch_site','synthetic-credits',{add_ons:['guided_quote_form'],add_on_credits:[credit]});
 const quote=assertAddonCommercialSnapshot(scope);
 assert.equal(quote.add_ons_total,1000);assert.equal(quote.project_total,3950);
 assert.deepEqual(quote.lines[0].scope_credit,{listed_price:1200,credit:200,reason:credit.reason});
 assert.deepEqual(scope.milestones.map(stage=>stage.amount),[1580,1185,1185]);
 for(const invalid of [{...credit,credit:0},{...credit,credit:1200},{...credit,reason:''},{...credit,id:'unknown'}])await assert.rejects(()=>draftScope('launch_site','synthetic-credits',{add_ons:['guided_quote_form'],add_on_credits:[invalid]}));
});

test('saved add-on terms survive catalog changes and historical no-add-on acceptance remains valid',async()=>{
 const {scope,billing}=await accepted(),changed=structuredClone(offers);
 changed.add_ons=[];changed.launch_site.public_price=1;changed.version='future-unrelated-catalog';
 assert.equal(prepareInvoice(scope,billing,0,{now}).amount,166000);
 const packet=renderJobPacket(scope,{},changed);assert.match(packet,/\$4,150\.00/);assert.match(packet,/Booking or Deposit Setup/);assert.doesNotMatch(packet,/Commercial mismatch/);
 const historical=await accepted('launch_site',[],undefined,historicalOffers);
 assert.equal(historical.scope.add_ons,undefined);assert.equal(historical.scope.commercial_snapshot.add_on_quote,undefined);
 delete historical.scope.commercial_snapshot.offer.editing_mode;
 delete historical.scope.buyer_confirmation.source_folder_zip_and_build_notes_understood;
 delete historical.scope.buyer_confirmation.initial_launch_ready_service_limits_and_exclusions_understood;
 delete historical.scope.buyer_confirmation.optional_handoff_call_and_separate_growth_work_understood;
 assert.equal(prepareInvoice(historical.scope,historical.billing,0,{now}).amount,70000);
 assert.equal(quotedOffer(offers,'launch_site').public_price,2950);
});
