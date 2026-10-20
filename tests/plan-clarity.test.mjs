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
const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const offers=await read('config/offers.json'),prices=priceList(offers),legacy=await read('tests/fixtures/legacy-offers.json'),artOffers=await read('tests/fixtures/plan-art-offers-20261018.json');

test('new costs add direct vendor bills once and retain baseline, unknown, zero and cent boundaries',()=>{
 const examples=[
  [{build:'launch',plan:'none',cycles:0,hostingMonthly:20,hostingMonths:12,external:120},1760],
  [{build:'existing',plan:'keep_running',baseline:true,cycles:12,hostingMonthly:20,hostingMonths:12,external:120},2559],
  [{build:'existing',plan:'keep_running',baseline:false,cycles:12,hostingMonthly:20,hostingMonths:12,external:120},2160],
  [{build:'focused',plan:'keep_running',cycles:11,hostingMonthly:19.99,hostingMonths:12,external:120.03},4359.91],
  [{build:'launch',plan:'none',cycles:0,hostingMonthly:.1,hostingMonths:12,external:.2},1401.4],
  [{build:'existing',plan:'keep_running',cycles:1,hostingMonthly:25.01,hostingMonths:1,external:.02},175.03],
  [{build:'launch',hostingMonthly:0,external:0},1400],
 ];
 for(const [input,total] of examples){const cost=calculateCost(prices,input);assert.equal(cost.total,total);assert.equal(moneyExact(cost.total),moneyExact(total));for(const key of ['buildHostingCredit','monthlyHostingCredit','planOverlapDiscount','overlapMonths','serviceStart'])assert.ok(!Object.hasOwn(cost,key),key);}
 for(const input of [{hostingMonthly:null,external:0},{hostingMonthly:20,external:null}])assert.equal(calculateCost(prices,input).total,null);
 for(const input of [{cycles:-1},{cycles:.5},{hostingMonths:121},{external:-1},{hostingMonthly:Infinity},{external:Number.MAX_VALUE},{plan:'unexpected'}])assert.throws(()=>calculateCost(prices,input));
 assert.throws(()=>calculateCost(priceList(legacy)),/explicit legacy calculator/);
 assert.throws(()=>calculateLegacyCost(prices),/saved hosting-credit snapshot/);
});

test('annual prepayment and refunds preserve twelve cycles and distinguish current versus legacy benefits',()=>{
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

test('packs and card summaries keep zero/one/two priorities and lower-build exclusions truthful',()=>{
 const packs=buyerPacks(offers),keep=packs.find(p=>p.id==='keep_running');
 const text=JSON.stringify(keep.sections);assert.match(text,/No main improvement is included/);assert.doesNotMatch(text,/Choose one defined priority|before a priority starts/);
 for(const [id,count] of [['keep_running',0],['improve',1],['grow',2]])assert.equal(offers.plans[id].priorities,count);
 const launch=packs.find(p=>p.id==='launch_site'),launchWork=launch.sections.filter(s=>['What the fee buys','How completion is accepted'].includes(s.title)).flatMap(s=>s.items).join(' ');
 assert.doesNotMatch(launchWork,/selected Signature|chosen workflow|follow-up articles|after day 90|90-day/);
 const focused=offers.focused_site;for(const key of ['page_scope','form_limit','revisions','functionality'])assert.doesNotMatch(focused[key],/selected Signature|chosen Signature|chosen workflow/);
 const builds=packageChoice(offers,true);assert.equal((builds.match(/Illustrative example:/g)||[]).length,3);assert.match(builds,/source-code handoff/);assert.doesNotMatch(builds,/3 articles total|CMS\/blog editing/);assert.doesNotMatch(builds,/hosting credit/);
 const monthly=planCards(offers);assert.equal((monthly.match(/class="compact-offer"/g)||[]).length,3);assert.match(monthly,/One researched, completed website improvement each month/);assert.match(monthly,/two completed improvements each month/);assert.match(monthly,/what’s included/);
});

test('native pricing links to a separate estimator and explains directly paid provider costs',()=>{
 const html=pricingContent(offers);for(const id of ['website-packages','after-launch','audit-sprint']){assert.ok(html.includes('href="#'+id+'"'));assert.ok(html.includes('id="'+id+'"'));}
 assert.doesNotMatch(html,/<form\b[^>]*\bid="cost-calculator"/);assert.match(html,/<p\b[^>]*\bid="cost-calculator"/);assert.match(html,/href="\/payments\/#cost-calculator"/);assert.match(html,/You pay these companies and any chosen tools directly/);assert.match(html,/actual provider price/);assert.match(html,/No minimum term/);
 const calculator=costCalculator(offers);assert.doesNotMatch(calculator,/serviceStart|service-start|hosting-credit|hosting credit|overlap discount/);assert.doesNotMatch(calculator,/value="annual"/);
 const overview=ongoingOverview(offers);assert.equal((overview.match(/class="compact-offer"/g)||[]).length,3);assert.doesNotMatch(overview,/package-visual-grid|data-feature=/);assert.match(overview,/what’s included/);assert.match(overview,/\/services\/website-care\//);
});

test('all builds snapshot explicit icon, sharing, sitemap and HTTPS acceptance without inventing proof',async()=>{
 for(const id of ['launch_site','focused_site','signature_site']){
  const draft=await draftScope(id,'foundation-check');assert.equal(draft.commercial_version,offers.version);
  assert.deepEqual(draft.commercial_snapshot.provider_policy,offers.provider_policy);
  const checks=JSON.stringify(draft.acceptance_tests);for(const phrase of ['browser-tab icon','sharing image','sitemap','HTTPS','test message reached the receiving inbox'])assert.ok(checks.includes(phrase),phrase);
  const operational=JSON.parse(await readFile(new URL('../operations/launch-acceptance-checklist.json',import.meta.url),'utf8'));assert.match(JSON.stringify(operational.build_foundation_acceptance),/do not report submission or indexing without evidence/);assert.match(JSON.stringify(operational.build_foundation_acceptance),/receiving-mailbox delivery/);
 }
 const keep=await draftScope('keep_running','no-phantom-priority');assert.deepEqual(keep.commercial_boundaries.priority_menu,[]);assert.deepEqual(keep.commercial_snapshot.priority_menu,[]);
});

test('saved agreements survive current policy drift; missing snapshots never authorize replacement invoices',async()=>{
 const scope=await draftScope('focused_site','saved-agreement'),before=JSON.stringify(scope);
 const changed=structuredClone(offers);changed.version='future';changed.focused_site.public_price=9999;changed.focused_site.payment_schedule[0].amount=4999.5;changed.provider_policy.summary='Different terms';
 const html=renderJobPacket(scope,{},changed);assert.equal((html.match(/class="invoice"/g)||[]).length,3);assert.match(html,/\$1,175\.00/);assert.doesNotMatch(html,/Different terms|\$9,999/);assert.equal(JSON.stringify(scope),before);
 const missing=structuredClone(scope);delete missing.commercial_snapshot;const blocked=renderJobPacket(missing,{},offers);assert.match(blocked,/Commercial mismatch/);assert.doesNotMatch(blocked,/class="invoice"/);assert.match(blocked,/Historical hosting and refund rights/);
});

test('recurring packet billing and cycle changes withhold drafts without reinterpreting saved terms',async()=>{
 for(const id of ['keep_running','improve','grow'])for(const billing of ['monthly','annual']){
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
 assert.throws(()=>assertPackageVisualOffers(offers),/configured offer scope changed/);
 for(const [key,field,value] of [['launch_site','public_price',1401],['focused_site','marketing_page_cap',8],['signature_site','public_name','Changed Website']]){const changed=structuredClone(artOffers);changed[key][field]=value;assert.throws(()=>assertPackageVisualOffers(changed),/Regenerate package comparison image/);}
 for(const [key,field,value] of [['keep_running','monthly_price',151],['improve','priorities',2],['grow','public_name','Changed Plan']]){const changed=structuredClone(artOffers);changed.plans[key][field]=value;assert.throws(()=>assertPackageVisualOffers(changed),/Regenerate package comparison image/);}
 for(const [key,field,value] of [['baseline','one_time_price',400],['audit_sprint','one_time_price',751],['audit_sprint','page_cap',13]]){const changed=structuredClone(artOffers);changed[key][field]=value;assert.throws(()=>assertPackageVisualOffers(changed),/Regenerate package comparison image/);}
});

test('current pricing has eight live-text offers and no stale poster publication',()=>{
 const html=pricingContent(offers);assert.equal((html.match(/class="compact-offer"/g)||[]).length,8);assert.doesNotMatch(html,/package-visual-grid|assets\/package-visuals/);
 for(const id of ['launch_site','focused_site','signature_site','keep_running','improve','grow','website_baseline','audit_fix_sprint']){assert.ok(html.includes('id="offer-'+id+'"'));assert.ok(html.includes('/assets/buyer-packs/'+id));}
 assert.match(html,/one small fix if it is safe and practical/);assert.match(html,/up to two agreed small fixes in total/i);assert.match(html,/you do not pay for it twice/);
});

test('archived feature headings remain semantically valid in a disclosure',()=>{
 for(const kind of ['website','monthly','existing']){const html=packageVisualCards(artOffers,{kind});const common=html.match(/<div class="package-visual-common">([\s\S]*?)<\/div>/)[1];assert.match(common,/^<p class="package-visual-common-label"><strong>[^<]+<\/strong><\/p>/);assert.doesNotMatch(common,/<h[1-6]\b|role="heading"|aria-level=/);}
});
