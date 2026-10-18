import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {buyerPacks} from '../src/buyer-packs.mjs';
import {calculateCost,priceList,annualRefund,selectedInquiryContext} from '../src/shared.mjs';
import {validateInquiry} from '../src/inquiry.mjs';
import {createServer} from '../scripts/server.mjs';
import {draftScope} from '../scripts/create-job.mjs';
import {renderJobPacket} from '../scripts/job-packet.mjs';
const offers=JSON.parse(await readFile(new URL('../config/offers.json',import.meta.url),'utf8')),prices=priceList(offers);
const lead={name:'Synthetic Pack Test',email:'synthetic@example.test',business:'Fictional test only',website:'',service:'improve',message:'A synthetic request to verify chosen service context.'};

test('eight decision packs carry acceptance, payments, costs, limits and the exact request',()=>{
 const packs=buyerPacks(offers);assert.equal(packs.length,8);assert.equal(new Set(packs.map(p=>p.id)).size,8);
 for(const p of packs){assert.equal(p.request,'/contact/?offer='+p.id);const text=JSON.stringify(p.sections);for(const pattern of [/accept/i,/payment/i,/ownership|handoff/i,/worked.*fee|fee.*example/i,/outside/i])assert.match(text,pattern);assert.match(text,/unknown|assumptions|hypothetical/i);}
 for(const [id,upfront,equivalent,refund] of [['keep_running',1710,142.5,1140],['improve',4560,380,3040],['grow',9120,760,6080]]){
  const p=packs.find(p=>p.id===id);assert.equal(p.annual.upfront_price,upfront);assert.equal(p.annual.monthly_equivalent,equivalent);assert.equal(annualRefund(prices,{plan:id,completedCycles:4}),refund);assert.match(JSON.stringify(p.sections),/Illustrative completed month — not a client record/);
  assert.match(JSON.stringify(p.sections),/within ten business days/);assert.match(JSON.stringify(p.sections),/undisputed unearned money/);assert.match(JSON.stringify(p.sections),/refund the full annual service payment/);assert.match(JSON.stringify(p.sections),/unfinished work owed under your accepted project agreement/);
 }
});

test('annual estimator charges twelve cycles upfront and keeps refunds distinct from hosting',()=>{
 for(const id of ['keep_running','improve','grow']){
  assert.throws(()=>calculateCost(prices,{build:'existing',plan:id,billing:'annual',cycles:11}),/twelve cycles/);
  const cost=calculateCost(prices,{build:'existing',plan:id,billing:'annual',cycles:12,hostingMonthly:20,hostingMonths:12,external:120});
  assert.equal(cost.annualUpfront,offers.plans[id].annual.upfront_price);assert.equal(cost.serviceTotal,cost.annualUpfront);assert.equal(cost.total,cost.annualUpfront+360);assert.ok(!Object.hasOwn(cost,'monthlyHostingCredit'));assert.ok(!Object.hasOwn(cost,'planOverlapDiscount'));
  assert.equal(annualRefund(prices,{plan:id,completedCycles:0}),cost.annualUpfront);assert.equal(annualRefund(prices,{plan:id,completedCycles:12}),0);
 }
 const overlap=calculateCost(prices,{build:'focused',plan:'keep_running',billing:'annual',cycles:12,serviceStart:2,hostingMonths:13,hostingMonthly:20,external:120});
 assert.deepEqual([overlap.annualUpfront,overlap.grossHosting,overlap.total],[1710,260,4440]);
 assert.throws(()=>calculateCost(prices,{plan:'improve',billing:'annual',cycles:12,hostingMonths:11}),/Hosting period/);
 assert.equal(calculateCost(prices,{plan:'improve',billing:'annual',cycles:12,hostingMonthly:null,external:0}).total,null);
});

test('annual and one-off quote snapshots retain their actual payment and exit terms',async()=>{
 const annual=await draftScope('improve','synthetic-annual',{billing:'annual'});assert.equal(annual.fixed_price,4560);assert.equal(annual.milestones.length,1);assert.equal(annual.milestones[0].amount,4560);assert.equal(annual.service_period.cycles,12);assert.equal(annual.service_period.start,null);assert.equal(annual.accepted_at,null);assert.match(annual.commercial_boundaries.annual_terms.renewal,/no automatic annual charge/);assert.match(renderJobPacket(annual,{},offers),/\$4,560\.00/);
 assert.equal(annual.commercial_boundaries.enrollment_gate.verified,false);assert.match(JSON.stringify(annual.commercial_boundaries.enrollment_gate),/independent buffer/);
 const sprint=await draftScope('audit_fix_sprint','synthetic-sprint');assert.deepEqual(sprint.milestones.map(m=>m.amount),[375,375]);assert.match(sprint.milestones[1].event,/written completion acceptance/);
 const baseline=await draftScope('website_baseline','synthetic-baseline');assert.equal(baseline.milestones[0].amount,399);assert.match(baseline.commercial_boundaries.acceptance,/not a fictional fix/);assert.match(baseline.commercial_boundaries.terms.remedy,/refund unearned/);
 await assert.rejects(()=>draftScope('launch_site','synthetic-invalid',{billing:'annual'}),/only available/);
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
  assert.match(html,/<form action="\/api\/inquiries" method="post">/);assert.match(html,/<option value="annual" selected>/);assert.match(html,/<option value="email" selected>/);assert.match(html,/value="synthetic@example.test"/);assert.match(html,/>short<\/textarea>/);
  const retry=html.match(/href="([^\"]+)"[^>]*>Return to inquiry/)[1];assert.match(retry,/offer=improve/);assert.match(retry,/billing=annual/);assert.doesNotMatch(retry,/synthetic|Fictional|short/);
  const saved=await fetch(url+'/api/inquiries',{method:'POST',body:new URLSearchParams({...lead,...choices})});assert.equal(saved.status,201);const savedHtml=await saved.text();assert.match(savedHtml,/Annual prepaid/);assert.match(savedHtml,/Newsletter campaign draft\/setup/);
  const payload=JSON.parse(db.prepare('SELECT payload FROM inquiries').get().payload);assert.equal(payload.billing,'annual');assert.equal(payload.priority,'email');assert.equal(payload.baseline_status,'needed');
 }finally{await new Promise(done=>server.close(done));await rm(runtime,{recursive:true,force:true});}
});
