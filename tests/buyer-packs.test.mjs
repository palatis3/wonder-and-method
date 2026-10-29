import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {paymentContent} from '../src/payment-content.mjs';
import {buyerPacks} from '../src/buyer-packs.mjs';
import {calculateCost,priceList,annualRefund,selectedInquiryContext} from '../src/shared.mjs';
import {validateInquiry} from '../src/inquiry.mjs';
import {createServer} from '../scripts/server.mjs';
import {draftScope} from '../scripts/create-job.mjs';
import {renderJobPacket} from '../scripts/job-packet.mjs';
const offers=JSON.parse(await readFile(new URL('../config/offers.json',import.meta.url),'utf8')),prices=priceList(offers);
const historical=JSON.parse(await readFile(new URL('../operations/historical/offers-2026-10-24-pre-v3.json',import.meta.url),'utf8'));
const lead={name:'Synthetic Pack Test',email:'synthetic@example.test',business:'Fictional test only',website:'',service:'improve',message:'A synthetic request to verify chosen service context.'};

test('fifteen V4 decision packs carry acceptance, payment, ownership and exact request routes',()=>{
 const expected={launch_site:2195,focused_site:2995,business_site:4495,signature_site:6495,keep_running:149,improve:399,local_focus:299,grow:449,website_baseline:199,audit_fix_sprint:849,brand_message:995,storefront:8500,local_presence:495,workflow:1495,systems:1495};
 const packs=buyerPacks(offers);assert.deepEqual(packs.map(p=>p.id),Object.keys(expected));
 for(const p of packs){assert.equal(p.price,expected[p.id]);assert.equal(p.request,'/checkout/'+p.id.replaceAll('_','-')+'/');assert.match(p.scopeStatus,/does not book work, accept terms or make a payment/);
  const text=JSON.stringify(p.sections);for(const pattern of [/accept/i,/payment/i,/ownership|handoff/i,/outside/i,/cancel/i,/provider/i,/export limits/i,/not pay twice/])assert.match(text,pattern,p.id);
 }
 for(const id of ['launch_site','focused_site','business_site','signature_site','storefront']){const text=JSON.stringify(packs.find(p=>p.id===id).sections);assert.match(text,/40%/);assert.match(text,/30%/);assert.doesNotMatch(text,/50%|20%/);assert.match(text,/unearned prepaid fees/);}
});

test('historical packs retain their accepted annual cancellation rights',()=>{
 const offers=historical,prices=priceList(historical);
 const packs=buyerPacks(offers);assert.equal(offers.annual_enrollment_gate.verified,false);
 for(const [id,upfront,equivalent,refund] of [['keep_running',1710,142.5,1140],['improve',4560,380,3040],['grow',9120,760,6080]]){
  const p=packs.find(p=>p.id===id),text=JSON.stringify(p.sections);assert.ok(!Object.hasOwn(p,'annual'));assert.equal(p.baselineFee,399);
  assert.ok(!p.sections.some(s=>s.title==='Annual prepayment'));
  const existing=paymentContent({contactEmail:'support@example.test'},offers);assert.match(existing,/id="annual-terms"/);
  for(const pattern of [/not an offer to enroll/,/within ten business days/,/Undisputed unearned amounts/,/refund the full annual service payment/,/unfinished work owed under your accepted project agreement/,/no automatic annual charge/,/No cancellation penalty, retained processing fee, discount clawback/,/no provider refund is promised/])assert.match(existing,pattern,id);
  for(const pattern of [/no minimum term/,/Cancel before renewal/,/up to 12 agreed main pages/,/still usable/,/no 24\/7 service/,/backups and restores/,/Canceling care does not disable your paid website/])assert.match(text,pattern,id);
  assert.match(text,id==='keep_running'?/refund or credit any unearned balance/:/unused-work refund or credit/);assert.doesNotMatch(text,/30 calendar days after launch/);
  const enabled=structuredClone(offers);enabled.annual_enrollment_gate.verified=true;
  const available=buyerPacks(enabled).find(p=>p.id===id);assert.equal(available.annual.upfront_price,upfront);assert.equal(available.annual.monthly_equivalent,equivalent);
  assert.ok(available.sections.some(s=>s.title==='Annual prepayment'));assert.equal(annualRefund(prices,{plan:id,completedCycles:4}),refund);
 }
});

test('historical annual estimator keeps accepted twelve-cycle fees distinct from hosting',()=>{
 const offers=historical,prices=priceList(historical);
 for(const id of ['keep_running','improve','grow']){
  assert.throws(()=>calculateCost(prices,{build:'existing',plan:id,billing:'annual',cycles:11}),/twelve cycles/);
  const cost=calculateCost(prices,{build:'existing',plan:id,billing:'annual',cycles:12,hostingMonthly:20,hostingMonths:12,external:120});
  assert.equal(cost.annualUpfront,offers.plans[id].annual.upfront_price);assert.equal(cost.serviceTotal,cost.annualUpfront);assert.equal(cost.total,cost.annualUpfront+360);assert.ok(!Object.hasOwn(cost,'monthlyHostingCredit'));assert.ok(!Object.hasOwn(cost,'planOverlapDiscount'));
  assert.equal(annualRefund(prices,{plan:id,completedCycles:0}),cost.annualUpfront);assert.equal(annualRefund(prices,{plan:id,completedCycles:12}),0);
 }
 const overlap=calculateCost(prices,{build:'focused',plan:'keep_running',billing:'annual',cycles:12,serviceStart:2,hostingMonths:13,hostingMonthly:20,external:120});
 assert.deepEqual([overlap.annualUpfront,overlap.grossHosting,overlap.total],[1710,260,4440]);
 assert.throws(()=>calculateCost(prices,{plan:'improve',billing:'annual',cycles:12,hostingMonths:11,hostingMonthly:20}),/Hosting period/);
 assert.equal(calculateCost(prices,{plan:'improve',billing:'annual',cycles:12,hostingMonthly:null,external:0}).total,null);
});

test('historical annual and one-off snapshots retain accepted payment and exit terms',async()=>{
 const offers=historical;
 const originalDraft=draftScope;const historicalDraft=(id,client,options={})=>originalDraft(id,client,{...options,catalog:historical});
 const annual=await historicalDraft('improve','synthetic-annual',{billing:'annual'});assert.equal(annual.fixed_price,4560);assert.equal(annual.milestones.length,1);assert.equal(annual.milestones[0].amount,4560);assert.equal(annual.service_period.cycles,12);assert.equal(annual.service_period.start,null);assert.equal(annual.accepted_at,null);assert.match(annual.commercial_boundaries.annual_terms.renewal,/no automatic annual charge/);assert.match(renderJobPacket(annual,{},offers),/\$4,560\.00/);
 assert.equal(annual.commercial_boundaries.enrollment_gate.verified,false);assert.match(JSON.stringify(annual.commercial_boundaries.enrollment_gate),/independent buffer/);
 const sprint=await historicalDraft('audit_fix_sprint','synthetic-sprint');assert.deepEqual(sprint.milestones.map(m=>m.amount),[375,375]);assert.match(sprint.milestones[1].event,/After you approve the finished work in writing/);assert.equal(sprint.milestones[1].approval_reference,null);assert.equal(sprint.milestones[1].payment_confirmed,false);
 const baseline=await historicalDraft('website_baseline','synthetic-baseline');assert.equal(baseline.milestones[0].amount,399);assert.match(baseline.commercial_boundaries.acceptance,/review and ordered fix list either way/);assert.match(baseline.commercial_boundaries.terms.remedy,/unearned amount to be refunded/);
 await assert.rejects(()=>historicalDraft('launch_site','synthetic-invalid',{billing:'annual'}),/only available/);
});

test('optional fit choices are allowlisted and never become arbitrary query or message content',()=>{
 const valid={...lead,billing:'annual',priority:'email',baseline_status:'needed'};assert.deepEqual(validateInquiry(valid).errors,{});assert.deepEqual(selectedInquiryContext(valid),{priority:'email',baseline_status:'needed',billing:'annual'});
 assert.ok(!Object.hasOwn(validateInquiry({...valid,workflow:'client_portal'}).value,'workflow'));assert.ok(!Object.hasOwn(selectedInquiryContext({...valid,workflow:'client_portal'}),'workflow'));assert.ok(validateInquiry({...valid,billing:'<script>'}).errors.billing);assert.ok(validateInquiry({...valid,priority:{}}).errors.priority);
 assert.deepEqual(selectedInquiryContext({...lead,billing:'https://example.test/?email=private',priority:'arbitrary',name:'Private'}),{});
});

test('native validation and corrected submission retain offer choices without personal data in retry URLs',async()=>{
 const runtime=await mkdtemp(join(tmpdir(),'wm-pack-context-'));const {server,db,url}=await createServer({runtime,port:0});
 try{
  const choices={billing:'annual',priority:'email',baseline_status:'needed'};
  const response=await fetch(url+'/api/inquiries',{method:'POST',body:new URLSearchParams({...lead,...choices,message:'short'})});assert.equal(response.status,422);const html=await response.text();
  assert.match(html,/action="\/api\/inquiries" method="post"/);assert.doesNotMatch(html,/value="annual"/);assert.match(html,/name="priority" value="email"/);assert.match(html,/value="synthetic@example.test"/);assert.match(html,/>short<\/textarea>/);
  const retry=html.match(/href="([^\"]+)"[^>]*>Return to inquiry/)[1];assert.match(retry,/offer=improve/);assert.doesNotMatch(retry,/billing=annual/);assert.doesNotMatch(retry,/synthetic|Fictional|short/);
  const saved=await fetch(url+'/api/inquiries',{method:'POST',body:new URLSearchParams({...lead,...choices})});assert.equal(saved.status,201);const savedHtml=await saved.text();assert.match(savedHtml,/Annual prepaid/);assert.match(savedHtml,/Prepare a newsletter/);
  const payload=JSON.parse(db.prepare('SELECT payload FROM inquiries').get().payload);assert.equal(payload.billing,'annual');assert.equal(payload.priority,'email');assert.equal(payload.baseline_status,'needed');
 }finally{await new Promise(done=>server.close(done));await rm(runtime,{recursive:true,force:true});}
});

test('current V4 annual requests are rejected and monthly care is charged once',async()=>{
 for(const id of ['keep_running','improve','local_focus','grow']){
  await assert.rejects(()=>draftScope(id,'synthetic-no-new-annual',{billing:'annual'}),/annual/i);
  assert.throws(()=>calculateCost(prices,{build:'existing',plan:id,billing:'annual',cycles:12}),/Annual enrollment is unavailable/);
 }
 for(const [id,monthly] of [['keep_running',149],['improve',399],['local_focus',299],['grow',449]]){
  const cost=calculateCost(prices,{build:'existing',plan:id,cycles:1,hostingMonths:1,hostingMonthly:0,external:0});
  assert.equal(cost.total,monthly);assert.equal(cost.baselineFee,0);assert.equal(cost.onboardingFee,0);
 }
 assert.equal(calculateCost(prices,{build:'existing',plan:'keep_running',careVariant:'commerce',cycles:1,hostingMonths:1,hostingMonthly:0,external:0}).total,295);
 assert.equal(calculateCost(prices,{build:'existing',plan:'improve',careVariant:'commerce',cycles:1,hostingMonths:1,hostingMonthly:0,external:0}).total,545);
});
