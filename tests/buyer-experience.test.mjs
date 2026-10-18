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
  assert.match(summary,/Question only\. No booking or payment/);assert.doesNotMatch(summary,/\$|prepaid|First monthly priority|Billing/);
  const html=prefillInquiryHtml(inquiryForm({live:false,privacyLink:'Privacy'}),new URL('https://example.test/contact/?offer=improve&request_kind=question&goal=search&concept=fieldwork&billing=annual&priority=article'));
  assert.doesNotMatch(html,/<details class="inquiry-extra" open/);
  assert.match(html,/value="fieldwork" selected/);assert.doesNotMatch(html,/value="annual"/);
  assert.ok(html.indexOf('id="message"')<html.indexOf('id="request-summary"'));
  assert.ok(html.indexOf('id="request-summary"')<html.indexOf('class="inquiry-extra"'));
  assert.match(html,/Send question/);
});

test('proposal summaries keep annual prepayment and existing-site setup distinct',()=>{
  const summary=inquiryRequestSummary({service:'improve',request_kind:'checkout',billing:'annual'},{price:400,priceLabel:'monthly',annual:{upfront_price:4000},baselineFee:399});
  assert.match(summary,/\$4,000 prepaid for 12 service cycles/);
  assert.match(summary,/first payment for an existing site \$4,399 including \$399 setup/);
  assert.match(summary,/or \$4,000 when a usable studio build or Sprint covers setup/);
  assert.match(summary,/Proposal request only/);
});

test('production timing stays consistent across buying pages and generated decision packs',async()=>{
 const load=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
 const [config,offers,map,geography]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json'].map(load));
 assert.match(config.projectTiming,/production, review and launch dates/);assert.match(config.projectTiming,/agreed page map, content research, creative work/);
 const pages=renderPages({config,offers,map,geography});
 for(const path of ['/','/pricing/','/process/'])assert.ok(pages.find(page=>page.path===path).html.includes(config.projectTiming),path);
 for(const pack of buyerPacks(offers).filter(pack=>['launch_site','focused_site','signature_site'].includes(pack.id)))assert.ok(JSON.stringify(pack.sections).includes(config.projectTiming),pack.id);
 const process=pages.find(page=>page.path==='/process/').html;
 for(let index=1;index<=6;index++)assert.equal((process.match(new RegExp(`id="process-stage-${index}"`,'g'))||[]).length,1);
 assert.equal((process.match(/id="project-calendar"/g)||[]).length,1);
 assert.match(process,/ten production days across four working weeks/);assert.match(process,/not an available slot or delivery guarantee/);
});
