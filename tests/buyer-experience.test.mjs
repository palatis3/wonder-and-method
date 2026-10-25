import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inquiryRequestSummary} from '../src/shared.mjs';
import {inquiryForm} from '../src/inquiry-form.mjs';
import {prefillInquiryHtml} from '../src/inquiry-prefill.mjs';
import {renderPages} from '../src/pages.mjs';
import {buyerPacks} from '../src/buyer-packs.mjs';

test('a question retains useful context and the public price without adopting billing choices or opening optional controls',()=>{
  const value={service:'improve',request_kind:'question',goal:'search',concept:'fieldwork',billing:'annual',priority:'article'};
  const summary=inquiryRequestSummary(value);
  assert.match(summary,/Improve/);assert.match(summary,/Help customers find my business/);assert.match(summary,/Fieldwork/);
  assert.match(summary,/Improve \(\$400\/month\)/);assert.doesNotMatch(summary,/^(Question|Proposal request) ·/);assert.doesNotMatch(summary,/prepaid|First monthly priority|Billing/);
  const html=prefillInquiryHtml(inquiryForm({live:false,privacyLink:'Privacy'}),new URL('https://example.test/contact/?offer=improve&request_kind=question&goal=search&concept=fieldwork&billing=annual&priority=article'));
  assert.doesNotMatch(html,/<details class="inquiry-extra" open/);
  assert.doesNotMatch(html,/name="concept" value="fieldwork"/);assert.doesNotMatch(html,/value="annual"/);assert.match(html,/name="request_kind" value="question"/);
  assert.ok(html.indexOf('id="request-summary"')<html.indexOf('id="name"'));
  assert.ok(html.indexOf('id="request-summary"')<html.indexOf('id="business"'));
  assert.match(html,/Send message/);
});

test('proposal summaries stay concise while hidden selected details remain available to submit',()=>{
  const value={service:'grow',request_kind:'checkout',billing:'monthly',priority:'page',priority_two:'article'};
  const summary=inquiryRequestSummary(value);
  assert.match(summary,/^Grow \(\$800\/month\)/);assert.ok(summary.length<160);assert.doesNotMatch(summary,/payment|scope|billing/i);
  assert.equal(inquiryRequestSummary({service:'unsure',request_kind:'question'}),'');
  const html=inquiryForm({live:true},{checkout:true,service:'grow',value});
  assert.match(html,/type="hidden" id="service" name="service" value="grow"/);assert.match(html,/name="priority_two" value="article"/);
  assert.doesNotMatch(html,/class="fixed-service"/);assert.doesNotMatch(html,/class="request-summary"/);
});

test('production timing stays consistent across buying pages and generated decision packs',async()=>{
 const load=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
 const [config,offers,map,geography]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json'].map(load));
 assert.match(config.projectTiming,/Planned build work: Launch Website 3–5 business days, Focused Website 5–8 and Signature Website 7–10/);assert.match(config.projectTiming,/page list, facts, photos and account access are ready/);
 assert.match(config.projectTiming,/Add your review time: two rounds, each allowing up to five business days/);assert.match(config.projectTiming,/missing information or extra work can move them/);assert.match(config.projectTiming,/proposal confirms the start and launch dates/);
 const pages=renderPages({config,offers,map,geography});
 const home=pages.find(page=>page.path==='/').html;assert.ok(home.includes(config.projectTiming));assert.match(home,/complete writing/i);
 assert.ok(pages.find(page=>page.path==='/process/').html.includes(config.projectTiming));const pricing=pages.find(page=>page.path==='/pricing/').html;for(const range of ['3–5 business days','5–8 business days','7–10 business days'])assert.ok(pricing.includes(range));assert.match(pricing,/complete writing/i);assert.match(pricing,/Both reviews allow up to five business days, added to the build work/);assert.match(pricing,/href="\/process\/#project-calendar"/);
 const ranges={launch_site:'3–5 business days',focused_site:'5–8 business days',signature_site:'7–10 business days'};
 for(const [id,range] of Object.entries(ranges)){
  assert.equal(offers[id].delivery_average,range);
  assert.ok(offers[id].delivery_target.includes(range));assert.ok(offers[id].delivery_target.includes(offers.delivery_conditions));
  assert.match(offers[id].delivery_target,/plus your review time/);assert.match(offers[id].delivery_target,/Build work starts once the page list, business facts, photos and account access are ready/);
  const pack=buyerPacks(offers).find(pack=>pack.id===id);
  const detail=pack.sections.flatMap(section=>section.items).join(' ');assert.ok(detail.includes(range),id);assert.match(detail,/once pages, facts, photos and access are ready/);assert.match(detail,/review time is additional/);assert.match(detail,/five business days per round unless agreed otherwise/);assert.match(detail,/written proposal sets start and launch dates/);assert.match(detail,/Added work can move these dates/);
  const checkout=pages.find(page=>page.path===`/checkout/${id.replaceAll('_','-')}/`).html;
  assert.ok(checkout.includes('Planned build work: '+range),id+' selected package timing');assert.match(checkout,/once your pages, facts, photos and access are ready/);assert.match(checkout,/Add two review windows of up to five business days each/);assert.match(checkout,/Your proposal confirms the launch date/);
  for(const other of Object.keys(ranges).filter(key=>key!==id))assert.ok(!checkout.includes(ranges[other]),id+' must not inherit '+other+' timing');
 }
 for(const page of pages)assert.doesNotMatch(page.html,/seven.day target|7.day target|delivery in 7 days|target is seven days/i,page.path);
 const process=pages.find(page=>page.path==='/process/').html;
 const redesign=pages.find(page=>page.path==='/services/website-redesign/').html;
 for(const id of Object.keys(ranges)){
  assert.ok(redesign.includes(`href="/checkout/${id.replaceAll('_','-')}/"`),id+' redesign request action');
  assert.match(redesign,/href="\/contact\/\?[^"]*goal=redesign[^"]*#inquiry"/);
  assert.ok(redesign.includes(`href="/assets/buyer-packs/${id}"`),id+' redesign full details');
 }
 assert.ok(redesign.indexOf('id="redesign-packages"')<redesign.indexOf('id="migration"'),'Package choices appear before migration detail');
 for(let index=1;index<=6;index++)assert.equal((process.match(new RegExp(`id="process-stage-${index}"`,'g'))||[]).length,1);
 assert.equal((process.match(/id="project-calendar"/g)||[]).length,1);
 assert.match(process,/using that full time can extend the build-time target/);
 assert.match(process,/Missing information or extra work means agreeing a new schedule/);
 assert.match(process,/Each allows up to five business days/);assert.match(process,/Silence is never approval/);
 assert.match(process,/five business days after the paid work is finished/);assert.match(process,/You receive your files without waiting for that correction period to end/);
 assert.doesNotMatch(process,/ten production days across four working weeks/);
});
