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
const offers=await read('config/offers.json'),prices=priceList(offers),legacy=await read('tests/fixtures/legacy-offers.json');

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
 assert.match(offers.annual_terms.cancellation,/current-cycle unearned work/);assert.match(offers.annual_terms.refund_timing,/undisputed unearned money/);assert.match(offers.annual_terms.hosting,/Vendor cancellation and refunds follow each vendor/);
});

test('packs and card summaries keep zero/one/two priorities and lower-build exclusions truthful',()=>{
 const packs=buyerPacks(offers),keep=packs.find(p=>p.id==='keep_running');
 const text=JSON.stringify(keep.sections);assert.match(text,/Zero improvement priorities/);assert.doesNotMatch(text,/Choose one defined priority|before a priority starts/);
 for(const [id,count] of [['keep_running',0],['improve',1],['grow',2]])assert.equal(offers.plans[id].priorities,count);
 const launch=packs.find(p=>p.id==='launch_site'),launchWork=launch.sections.filter(s=>['What the fee buys','How completion is accepted'].includes(s.title)).flatMap(s=>s.items).join(' ');
 assert.doesNotMatch(launchWork,/selected Signature|chosen workflow|follow-up articles|after day 90|90-day/);
 const focused=offers.focused_site;for(const key of ['page_scope','form_limit','revisions','functionality'])assert.doesNotMatch(focused[key],/selected Signature|chosen Signature|chosen workflow/);
 const builds=packageChoice(offers,true);assert.equal((builds.match(/Illustrative example:/g)||[]).length,3);assert.match(builds,/3 articles total/);assert.doesNotMatch(builds,/hosting credit/);
 const monthly=planCards(offers);assert.equal((monthly.match(/Illustrative example:/g)||[]).length,3);assert.match(monthly,/No substantive improvement priority/);
});

test('native task links and simple costs precede advanced estimator; homepage care is concise',()=>{
 const html=pricingContent(offers);for(const id of ['website-packages','after-launch','audit-sprint']){assert.ok(html.includes('href="#'+id+'"'));assert.ok(html.includes('id="'+id+'"'));}
 assert.ok(html.indexOf('Hypothetical build, no care')<html.indexOf('id="cost-calculator"'));assert.match(html,/\$1,760/);assert.match(html,/\$2,559/);
 const calculator=costCalculator(offers);assert.doesNotMatch(calculator,/serviceStart|service-start|hosting-credit|hosting credit|overlap discount/);
 assert.match(html,/developers.cloudflare.com/);assert.match(html,/www.sanity.io/);assert.match(html,/webflow.com/);
 const home=ongoingOverview(offers,{home:true});assert.doesNotMatch(home,/class="monthly-plan"/);assert.match(home,/class="compact-comparison"/);assert.doesNotMatch(home,/package-visual-grid|data-feature=/);assert.match(home,/Full scope and payment terms/);assert.match(home,/\/services\/website-care\//);
});

test('all builds snapshot explicit icon, sharing, sitemap and HTTPS acceptance without inventing proof',async()=>{
 for(const id of ['launch_site','focused_site','signature_site']){
  const draft=await draftScope(id,'foundation-check');assert.equal(draft.commercial_version,offers.version);
  assert.deepEqual(draft.commercial_snapshot.provider_policy,offers.provider_policy);
  const checks=JSON.stringify(draft.acceptance_tests);for(const phrase of ['browser-tab icon','default sharing image','sitemap','HTTPS certificate','receiving-mailbox delivery'])assert.ok(checks.includes(phrase),phrase);
  assert.match(checks,/do not report submission or indexing without evidence/);
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


test('comparison artwork cannot silently retain stale prices or unit limits',()=>{
 assert.doesNotThrow(()=>assertPackageVisualOffers(offers));
 for(const [key,field,value] of [['launch_site','public_price',1401],['focused_site','marketing_page_cap',8],['signature_site','public_name','Changed Website']]){const changed=structuredClone(offers);changed[key][field]=value;assert.throws(()=>assertPackageVisualOffers(changed),/Regenerate package comparison image/);}
 for(const [key,field,value] of [['keep_running','monthly_price',151],['improve','priorities',2],['grow','public_name','Changed Plan']]){const changed=structuredClone(offers);changed.plans[key][field]=value;assert.throws(()=>assertPackageVisualOffers(changed),/Regenerate package comparison image/);}
 for(const [key,field,value] of [['baseline','one_time_price',400],['audit_sprint','one_time_price',751],['audit_sprint','page_cap',13]]){const changed=structuredClone(offers);changed[key][field]=value;assert.throws(()=>assertPackageVisualOffers(changed),/Regenerate package comparison image/);}
});

test('existing-site comparison keeps the two real one-off offers and safe-fix and duplicate-fee limits',()=>{
 const html=packageVisualCards(offers,{kind:'existing'});
 assert.equal((html.match(/<article class="package-visual-card">/g)||[]).length,2);
 for(const id of ['website_baseline','audit_fix_sprint']){assert.ok(html.includes('/assets/buyer-packs/'+id));assert.ok(html.includes('/contact/?offer='+id));}
 assert.match(html,/\$399/);assert.match(html,/\$750/);assert.match(html,/review of all 22 website areas/);assert.match(html,/clear finding and reason/);assert.match(html,/does not use the first month/);assert.match(html,/Up to 2 agreed small fixes TOTAL/);assert.match(html,/not charged twice/);assert.ok(html.includes('/services/website-audit/#one-off-terms'));
 assert.match(html,/before payment/);assert.ok(html.includes('/assets/buyer-packs/audit_fix_sprint'));assert.doesNotMatch(html,/Everything in Launch|Everything in Focused|billing=monthly/);
});

test('illustrated comparisons retain native scope, optional costs and distinct service boundaries',()=>{
 const build=packageVisualCards(offers),monthly=packageVisualCards(offers,{kind:'monthly'});
 for(const id of ['launch_site','focused_site','signature_site']){assert.ok(build.includes('/assets/buyer-packs/'+id));assert.ok(build.includes('/contact/?offer='+id));}
 assert.match(build,/website pages need code edits/);assert.match(build,/booking OR newsletter/);assert.match(build,/booking AND newsletter/);assert.match(build,/edit agreed words, pictures and blog posts/);assert.match(build,/Reviews around days 30, 60 and 90/);assert.match(build,/Choose ONE: a new-inquiry tracker, a private client area, or a small online store/);assert.match(build,/Hosting, domains, tools, taxes and approved additions are extra/);
 assert.match(monthly,/One agreed improvement each month/);assert.match(monthly,/Two agreed improvements each month/);assert.match(monthly,/done one after the other/);assert.match(monthly,/Every 3 months, research into one related set/);assert.match(monthly,/Monthly research into customer searches and competitors/);assert.match(monthly,/no recurring keyword campaign/);assert.match(monthly,/existing-site setup is \$399 once/);assert.match(monthly,/included after a usable build or Audit/);assert.match(monthly,/Bundled launch work is not charged again/);
 for(const html of [build,monthly]){assert.equal((html.match(/<details class="package-visual-details">/g)||[]).length,3);assert.equal((html.match(/loading="lazy"/g)||[]).length,3);assert.doesNotMatch(html,/onclick=|onkeydown=|<script/);}
});


test('comparison foundation lead-ins do not introduce headings inside a disclosure',()=>{
 for(const kind of ['website','monthly','existing']){
  const html=packageVisualCards(offers,{kind});
  const common=html.match(/<div class="package-visual-common">([\s\S]*?)<\/div>/)[1];
  assert.match(common,/^<p class="package-visual-common-label"><strong>[^<]+<\/strong><\/p>/);
  assert.doesNotMatch(common,/<h[1-6]\b|role="heading"|aria-level=/);
 }
});
