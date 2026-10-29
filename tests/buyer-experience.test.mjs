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
  assert.match(summary,/Website Improvement Partnership \(\$1,250\/month\)/);assert.doesNotMatch(summary,/^(Question|Proposal request) ·/);assert.doesNotMatch(summary,/prepaid|First monthly priority|Billing/);
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
  assert.match(summary,/^Local Search Partnership \(\$1,750\/month\)/);assert.ok(summary.length<160);assert.doesNotMatch(summary,/payment|scope|billing/i);
  assert.equal(inquiryRequestSummary({service:'unsure',request_kind:'question'}),'');
  const html=inquiryForm({live:true},{checkout:true,service:'grow',value});
  assert.match(html,/type="hidden" id="service" name="service" value="grow"/);assert.match(html,/name="priority_two" value="article"/);
  assert.doesNotMatch(html,/class="fixed-service"/);assert.doesNotMatch(html,/class="request-summary"/);
});

test('production timing consistently includes two-business-day feedback in the approved V3 windows',async()=>{
 const load=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
 const [config,offers,map,geography]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json'].map(load));
 const ranges={launch_site:'5–10 business days',focused_site:'2–3 weeks',business_site:'3–4 weeks',signature_site:'4–6 weeks'};
 for(const range of Object.values(ranges))assert.ok(config.projectTiming.includes(range));
 assert.match(config.projectTiming,/ready, booked kickoff/);assert.match(config.projectTiming,/review time is already included/);assert.match(config.projectTiming,/two business days/);assert.match(config.projectTiming,/Missing inputs or approved scope changes can move dates/);
 const pages=renderPages({config,offers,map,geography});
 const home=pages.find(page=>page.path==='/').html;assert.ok(home.includes(config.projectTiming));assert.match(home,/writing/i);
 const process=pages.find(page=>page.path==='/process/').html;assert.ok(process.includes(config.projectTiming));
 const pricing=pages.find(page=>page.path==='/pricing/').html;for(const range of Object.values(ranges))assert.ok(pricing.includes(range));
 for(const [id,range] of Object.entries(ranges)){
  assert.equal(offers[id].delivery_average,range);
  const detail=buyerPacks(offers).find(pack=>pack.id===id).sections.flatMap(section=>section.items).join(' ');
  assert.ok(detail.includes(range),id);assert.match(detail,/review time is already included/);assert.match(detail,/two business days/);
  const checkout=pages.find(page=>page.path===`/checkout/${id.replaceAll('_','-')}/`).html;
  assert.ok(checkout.includes(range),id+' timing');assert.match(checkout,/review time is already included/);
  for(const other of Object.keys(ranges).filter(key=>key!==id))assert.ok(!checkout.includes(ranges[other]),id+' must not inherit '+other+' timing');
 }
 for(const page of pages)assert.doesNotMatch(page.html,/seven.day target|7.day target|delivery in 7 days|target is seven days/i,page.path);
 const redesign=pages.find(page=>page.path==='/services/website-redesign/').html;
 for(const id of Object.keys(ranges)){assert.ok(redesign.includes(`href="/checkout/${id.replaceAll('_','-')}/"`));assert.ok(redesign.includes(`href="/assets/buyer-packs/${id}"`));}
 assert.match(redesign,/href="\/contact\/\?[^"]*goal=redesign[^"]*#inquiry"/);
 assert.ok(redesign.indexOf('id="redesign-packages"')<redesign.indexOf('id="migration"'));
 for(let index=1;index<=6;index++)assert.equal((process.match(new RegExp(`id="process-stage-${index}"`,'g'))||[]).length,1);
 assert.equal((process.match(/id="project-calendar"/g)||[]).length,1);
 assert.match(process,/three for Signature/);assert.match(process,/Two business days for each review are included/);assert.match(process,/Silence is never approval and does not trigger a payment/);
 assert.match(process,/Missing information or extra work means agreeing a new schedule/);
 assert.match(process,/five business days after the paid work is finished/);assert.match(process,/You receive your files without waiting for that correction period to end/);
 assert.doesNotMatch(process,/ten production days across four working weeks/);
});
