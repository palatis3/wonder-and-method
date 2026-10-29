import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {calculateCost,calculateLegacyCost,priceList,annualRefund,moneyExact} from '../src/shared.mjs';
import {buyerPacks} from '../src/buyer-packs.mjs';
import {packageChoice,costCalculator} from '../src/audit-content.mjs';
import {planCards,pricingContent,ongoingOverview} from '../src/service-content.mjs';
import {assertPackageVisualOffers,packageVisualCards} from '../src/package-visuals.mjs';
import {draftScope} from '../scripts/create-job.mjs';
import {renderJobPacket} from '../scripts/job-packet.mjs';
import {websiteComparison,clearPricing} from '../src/pricing-content.mjs';
import {offerSummary} from '../src/offer-summary.mjs';
const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const historical=await read('operations/historical/offers-2026-10-24-pre-v3.json');
const offers=await read('config/offers.json'),prices=priceList(offers),legacy=await read('tests/fixtures/legacy-offers.json'),artOffers=await read('tests/fixtures/plan-art-offers-20261018.json');

test('V4 pricing publishes four website totals and independent provider costs',()=>{
 const before=JSON.stringify(offers),html=clearPricing(offers);
 for(const [id,price,pages] of [['launch_site',2195,10],['focused_site',2995,15],['business_site',4495,20],['signature_site',6495,25]]){
  const summary=offerSummary(offers,id);assert.equal(summary.price,price);assert.ok(summary.briefPoints.some(x=>new RegExp(pages+' (?:(?:marketing|useful) )?pages').test(x)));
  assert.ok(html.includes('/checkout/'+id.replaceAll('_','-')+'/'));
 }
 assert.match(html,/domain|hosting/i);assert.equal(JSON.stringify(offers),before);
});

test('new costs add direct vendor bills once and retain baseline, unknown, zero and cent boundaries',()=>{
 const examples=[
  [{build:'launch',plan:'none',cycles:0,hostingMonthly:20,hostingMonths:12,external:120},2555],
  [{build:'existing',plan:'keep_running',baseline:true,cycles:12,hostingMonthly:20,hostingMonths:12,external:120},2347],
  [{build:'existing',plan:'keep_running',baseline:false,cycles:12,hostingMonthly:20,hostingMonths:12,external:120},2148],
  [{build:'focused',plan:'keep_running',cycles:11,hostingMonthly:19.99,hostingMonths:12,external:120.03},4993.91],
  [{build:'launch',plan:'none',cycles:0,hostingMonthly:.1,hostingMonths:12,external:.2},2196.4],
  [{build:'existing',plan:'keep_running',cycles:1,hostingMonthly:25.01,hostingMonths:1,external:.02},174.03],
  [{build:'launch',hostingMonthly:0,external:0},2195],
 ];
 for(const [input,total] of examples){const cost=calculateCost(prices,input);assert.equal(cost.total,total);assert.equal(moneyExact(cost.total),moneyExact(total));for(const key of ['buildHostingCredit','monthlyHostingCredit','planOverlapDiscount','overlapMonths','serviceStart'])assert.ok(!Object.hasOwn(cost,key),key);}
 for(const input of [{hostingMonthly:null,external:0},{hostingMonthly:20,external:null}])assert.equal(calculateCost(prices,input).total,null);
 for(const input of [{cycles:-1},{cycles:.5},{hostingMonths:121},{external:-1},{hostingMonthly:Infinity},{external:Number.MAX_VALUE},{plan:'unexpected'}])assert.throws(()=>calculateCost(prices,input));
 assert.throws(()=>calculateCost(priceList(legacy)),/explicit legacy calculator/);
 assert.throws(()=>calculateLegacyCost(prices),/saved hosting-credit snapshot/);
});

test('historical annual agreements preserve twelve cycles and original refunds',()=>{
 const prices=priceList(historical);
 for(const [plan,upfront,refund] of [['keep_running',1710,1140],['improve',4560,3040],['grow',9120,6080]]){
  const cost=calculateCost(prices,{build:'existing',plan,billing:'annual',cycles:12,hostingMonths:12,hostingMonthly:20,external:120});
  assert.equal(cost.total,upfront+360);assert.equal(cost.annualUpfront,upfront);assert.equal(annualRefund(prices,{plan,completedCycles:4}),refund);
  assert.equal(annualRefund(prices,{plan,completedCycles:0}),upfront);assert.equal(annualRefund(prices,{plan,completedCycles:12}),0);
  assert.throws(()=>calculateCost(prices,{plan,billing:'annual',cycles:11}),/twelve cycles/);
 }
 const old=calculateLegacyCost(priceList(legacy),{build:'focused',plan:'keep_running',billing:'annual',cycles:12,serviceStart:2,hostingMonths:13,hostingMonthly:20,external:120});
 assert.deepEqual([old.annualUpfront,old.buildHostingCredit,old.monthlyHostingCredit,old.planOverlapDiscount,old.total],[2268.6,120,140,100,4788.6]);
 assert.equal(annualRefund(priceList(legacy),{plan:'keep_running',completedCycles:4}),1512.4);
 assert.match(offers.annual_terms.cancellation,/current-cycle unearned work/);assert.match(offers.annual_terms.refund_timing,/Undisputed unearned amounts/);assert.match(offers.annual_terms.hosting,/Vendor cancellation and refunds follow each vendor/);
});

test('V4 monthly cards distinguish four outputs and included care',()=>{
 const packs=buyerPacks(offers);assert.equal(packs.length,15);
 for(const [id,count,price] of [['keep_running',0,149],['improve',1,399],['local_focus',1,299],['grow',5,449]]){
  assert.equal(offers.plans[id].priorities,count);assert.equal(packs.find(p=>p.id===id).price,price);
 }
 const monthly=planCards(offers);assert.equal((monthly.match(/class="[^"\n]*\bv3-offer-card\b[^"\n]*"/g)||[]).length,4);
 assert.match(monthly,/Care included|Care bill|maintenance/i);
});

test('native pricing links to a separate estimator and directly paid provider costs',()=>{
 const html=pricingContent(offers);assert.match(html,/href="\/payments\/#cost-calculator"/);
 assert.doesNotMatch(html,/<form\b[^>]*\bid="cost-calculator"/);
 const calculator=costCalculator(offers);assert.doesNotMatch(calculator,/value="annual"|hosting credit|overlap discount/);
 const overview=ongoingOverview(offers);assert.equal((overview.match(/class="[^"\n]*\bv3-offer-card\b[^"\n]*"/g)||[]).length,4);
});

test('all V4 builds snapshot measurable acceptance without inventing proof',async()=>{
 for(const id of ['launch_site','focused_site','business_site','signature_site','storefront']){
  const draft=await draftScope(id,'foundation-check');assert.equal(draft.commercial_version,offers.version);
  assert.deepEqual(draft.commercial_snapshot.provider_policy,offers.provider_policy);
  for(const check of offers[id].v3.acceptance)assert.ok(draft.acceptance_tests.includes(check));
  const checks=JSON.stringify(draft.acceptance_tests);for(const phrase of ['sitemap','Form receipt','three desktop and three mobile runs','physical devices tested'])assert.ok(checks.includes(phrase),phrase);
  assert.equal(draft.accepted_at,null);for(const milestone of draft.milestones){assert.equal(milestone.approval_reference,null);assert.equal(milestone.payment_confirmed,false);}
 }
 const operational=await read('operations/launch-acceptance-checklist.json');assert.match(JSON.stringify(operational.build_foundation_acceptance),/do not report submission or indexing without evidence/);
});

test('saved agreements survive current policy drift; missing snapshots never authorize replacement invoices',async()=>{
 const scope=await draftScope('focused_site','saved-agreement'),before=JSON.stringify(scope);
 const changed=structuredClone(offers);changed.version='future';changed.focused_site.public_price=9999;changed.focused_site.payment_schedule[0].amount=4999.5;changed.provider_policy.summary='Different terms';
 const html=renderJobPacket(scope,{},changed);assert.equal((html.match(/class="invoice"/g)||[]).length,3);assert.match(html,/\$1,198\.00/);assert.doesNotMatch(html,/Different terms|\$9,999/);assert.equal(JSON.stringify(scope),before);
 const missing=structuredClone(scope);delete missing.commercial_snapshot;const blocked=renderJobPacket(missing,{},offers);assert.match(blocked,/Commercial mismatch/);assert.doesNotMatch(blocked,/class="invoice"/);assert.match(blocked,/Historical hosting and refund rights/);
});

test('recurring packet billing and cycle changes withhold drafts without reinterpreting saved terms',async()=>{
 for(const id of ['keep_running','improve','local_focus','grow'])for(const billing of ['monthly']){
  const scope=await draftScope(id,'billing-compatibility',{billing});
  assert.equal((renderJobPacket(scope,{},offers).match(/class="invoice"/g)||[]).length,1);
  const cases=[
   s=>{s.billing_option=billing==='monthly'?'annual':'monthly';s.service_period.cycles=billing==='monthly'?12:1;},
   s=>{s.billing_option=billing==='monthly'?'annual':'monthly';},
   s=>{s.service_period.cycles=billing==='monthly'?12:1;},
   s=>{delete s.service_period.cycles;},
   s=>{s.commercial_snapshot.billing=billing==='monthly'?'annual':'monthly';},
   s=>{s.billing_option='unknown';},
  ];
  for(const mutate of cases){const changed=structuredClone(scope);mutate(changed);const before=JSON.stringify(changed),html=renderJobPacket(changed,{},offers);assert.match(html,/Commercial mismatch/);assert.doesNotMatch(html,/class="invoice"/);assert.equal(JSON.stringify(changed),before);}
  const drift=structuredClone(offers);drift.plans[id].monthly_price+=1000;drift.plans[id].annual.upfront_price+=12000;
  const preserved=renderJobPacket(scope,{},drift);assert.equal((preserved.match(/class="invoice"/g)||[]).length,1);assert.doesNotMatch(preserved,/Commercial mismatch/);
 }
});


test('archived artwork guards retain their exact dated source and reject current offer drift',()=>{
 assert.doesNotThrow(()=>assertPackageVisualOffers(artOffers));
 assert.throws(()=>assertPackageVisualOffers(offers),/Regenerate package comparison/);
 for(const [key,field,value] of [['launch_site','public_price',1401],['focused_site','marketing_page_cap',8],['signature_site','public_name','Changed Website']]){const changed=structuredClone(artOffers);changed[key][field]=value;assert.throws(()=>assertPackageVisualOffers(changed),/Regenerate package comparison image/);}
 for(const [key,field,value] of [['keep_running','monthly_price',151],['improve','priorities',2],['grow','public_name','Changed Plan']]){const changed=structuredClone(artOffers);changed.plans[key][field]=value;assert.throws(()=>assertPackageVisualOffers(changed),/Regenerate package comparison image/);}
 for(const [key,field,value] of [['baseline','one_time_price',400],['audit_sprint','one_time_price',751],['audit_sprint','page_cap',13]]){const changed=structuredClone(artOffers);changed[key][field]=value;assert.throws(()=>assertPackageVisualOffers(changed),/Regenerate package comparison image/);}
});

test('current pricing has fifteen live-text offers and no stale poster publication',()=>{
 const html=pricingContent(offers);assert.equal((html.match(/class="[^"\n]*\bv3-offer-card\b[^"\n]*" id="offer-[^"]+"/g)||[]).length,15);
 assert.doesNotMatch(html,/package-visual-grid|assets\/package-visuals/);
 for(const id of ['launch_site','focused_site','business_site','signature_site','keep_running','improve','local_focus','grow','website_baseline','audit_fix_sprint','brand_message','storefront','local_presence','workflow','systems']){
  assert.ok(html.includes('href="/assets/buyer-packs/'+id+'"'),id);
  assert.ok(html.includes('href="/checkout/'+id.replaceAll('_','-')+'/"'),id);
 }
});

test('archived feature headings remain semantically valid in a disclosure',()=>{
 for(const kind of ['website','monthly','existing']){const html=packageVisualCards(artOffers,{kind});const common=html.match(/<div class="package-visual-common">([\s\S]*?)<\/div>/)[1];assert.match(common,/^<p class="package-visual-common-label"><strong>[^<]+<\/strong><\/p>/);assert.doesNotMatch(common,/<h[1-6]\b|role="heading"|aria-level=/);}
});
