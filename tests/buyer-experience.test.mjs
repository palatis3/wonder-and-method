import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inquiryRequestSummary} from '../src/shared.mjs';
import {inquiryForm} from '../src/inquiry-form.mjs';
import {prefillInquiryHtml} from '../src/inquiry-prefill.mjs';
import {renderPages} from '../src/pages.mjs';
import {buyerPacks} from '../src/buyer-packs.mjs';

test('a question retains useful context without adopting proposal prices or opening optional controls',()=>{
  const value={service:'improve',request_kind:'question',goal:'search',concept:'fieldwork',billing:'annual',priority:'article'};
  const summary=inquiryRequestSummary(value,{price:400,priceLabel:'monthly',annual:{upfront_price:4000},baselineFee:399});
  assert.match(summary,/Improve/);assert.match(summary,/Help customers find my business/);assert.match(summary,/Fieldwork/);
  assert.match(summary,/^Question ·/);assert.doesNotMatch(summary,/\$|prepaid|First monthly priority|Billing/);
  const html=prefillInquiryHtml(inquiryForm({live:false,privacyLink:'Privacy'}),new URL('https://example.test/contact/?offer=improve&request_kind=question&goal=search&concept=fieldwork&billing=annual&priority=article'));
  assert.doesNotMatch(html,/<details class="inquiry-extra" open/);
  assert.doesNotMatch(html,/name="concept" value="fieldwork"/);assert.doesNotMatch(html,/value="annual"/);
  assert.ok(html.indexOf('id="request-summary"')<html.indexOf('id="name"'));
  assert.ok(html.indexOf('id="request-summary"')<html.indexOf('class="inquiry-extra"'));
  assert.match(html,/Send question/);
});

test('proposal summaries stay concise while hidden selected details remain available to submit',()=>{
  const value={service:'grow',request_kind:'checkout',billing:'monthly',priority:'page',priority_two:'article'};
  const summary=inquiryRequestSummary(value,{price:800,priceLabel:'monthly',baselineFee:399});
  assert.match(summary,/Proposal request.*Grow/);assert.ok(summary.length<160);assert.doesNotMatch(summary,/\$|payment|scope|billing/i);
  assert.equal(inquiryRequestSummary({service:'unsure',request_kind:'question'}),'Question');
  const html=inquiryForm({live:true},{checkout:true,service:'grow',value});
  assert.match(html,/type="hidden" id="service" name="service" value="grow"/);assert.match(html,/name="priority_two" value="article"/);
  assert.doesNotMatch(html,/class="fixed-service"/);assert.match(html,/href="\/pricing\/">Change service/);
});

test('production timing stays consistent across buying pages and generated decision packs',async()=>{
 const load=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
 const [config,offers,map,geography]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json'].map(load));
 assert.match(config.projectTiming,/7 days from the confirmed start/);assert.match(config.projectTiming,/page list agreed.*business facts, assets and access ready/);
 assert.match(config.projectTiming,/Complete writing is included/);assert.match(config.projectTiming,/delayed reviews or added scope change the schedule/);assert.match(config.projectTiming,/proposal confirms the dates/);
 const pages=renderPages({config,offers,map,geography});
 const home=pages.find(page=>page.path==='/').html;assert.match(home,/seven days from a confirmed start/);assert.match(home,/delays or extra work change the schedule/);
 for(const path of ['/pricing/','/process/'])assert.ok(pages.find(page=>page.path===path).html.includes(config.projectTiming),path);
 for(const pack of buyerPacks(offers).filter(pack=>['launch_site','focused_site','signature_site'].includes(pack.id)))assert.ok(JSON.stringify(pack.sections).includes(config.projectTiming),pack.id);
 const process=pages.find(page=>page.path==='/process/').html;
 for(let index=1;index<=6;index++)assert.equal((process.match(new RegExp(`id="process-stage-${index}"`,'g'))||[]).length,1);
 assert.equal((process.match(/id="project-calendar"/g)||[]).length,1);
 assert.match(process,/using that full time can extend the seven-day target/);
 assert.match(process,/Missing inputs or added scope receive a revised schedule/);
 assert.match(process,/review allowance is up to five business days each/);assert.match(process,/silence is never approval/);
 assert.match(process,/five business days after paid completion, or after settling the account if work ends early/);assert.match(process,/30-day defect-correction window does not delay/);
 assert.doesNotMatch(process,/ten production days across four working weeks/);
});
