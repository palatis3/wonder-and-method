import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkoutPages,offerActions} from '../src/checkout-content.mjs';
import {intakeContent} from '../src/intake-content.mjs';
import {validateInquiry} from '../src/inquiry.mjs';
import {inquiryResponseHtml} from '../src/inquiry-response.mjs';
import {inquiryContextSummary} from '../src/shared.mjs';
const load=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const offers=await load('config/offers.json'),config=await load('config/site.json');

test('monthly checkout states setup plus the first cycle and the baseline waiver',()=>{
 const pages=checkoutPages(offers,intakeContent(config));
 for(const [slug,total] of [['keep-running','$549'],['improve','$799'],['grow','$1,199']]){
  const body=pages.find(p=>p.path===`/checkout/${slug}/`).body;
  const header=body.split('</header>')[0];assert.ok(header.includes(total));assert.match(body,/previous Website Baseline, website I built or Audit &amp; Fix Sprint already provides a usable review/);assert.match(body,/up to 12 agreed main pages/);assert.match(body,/updates.*backups.*restores.*malware cleanup/);assert.ok(body.includes(total));assert.match(body,/\$399.*Website Baseline/);assert.match(body,/do not pay for it twice/);
 }
});
test('all eight offers have request-only checkout with the exact service preserved without JavaScript',()=>{
 const pages=checkoutPages(offers,intakeContent(config));assert.equal(pages.length,8);assert.equal(new Set(pages.map(p=>p.path)).size,8);
 for(const page of pages){const id=page.path.split('/')[2].replaceAll('-','_');assert.match(page.body,new RegExp(`name="service" value="${id}"`));assert.match(page.body,/name="request_kind" value="checkout"/);assert.match(page.body,/Nothing is booked or charged when you send this/);assert.match(page.body,/action="\/api\/inquiries"/);assert.doesNotMatch(page.body,/buy\.stripe\.com|invoice\.stripe\.com|name="(?:card|cvc|card_number)"/);}
 assert.match(pages.find(p=>p.path.includes('audit-fix-sprint')).body,/\$375/);assert.match(pages.find(p=>p.path.includes('website-baseline')).body,/\$399/);assert.match(pages.find(p=>p.path.includes('focused-site')).body,/\$1,175/);
});
test('checkout and service-question context survives validation, status and native correction',()=>{
 for(const kind of ['checkout','question']){
  const data={name:'Synthetic example',email:'fixture@example.invalid',business:'Synthetic only',website:'https://example.com',service:'improve',billing:'annual',request_kind:kind,message:'Synthetic request testing the selected service context.'};
  const checked=validateInquiry(data);assert.deepEqual(checked.errors,{});assert.equal(checked.value.request_kind,kind);assert.equal(checked.value.billing,'annual');assert.ok(inquiryContextSummary(checked.value).some(text=>text.includes('Request type')));
  const html=inquiryResponseHtml({...checked.value,message:'Correct the requested field',errors:{name:'Required'},retry:checked.value});assert.match(html,new RegExp(`name="request_kind" value="${kind}"`));assert.doesNotMatch(html,/value="annual"/);
 }
 assert.ok(validateInquiry({name:'Synthetic',email:'fixture@example.invalid',business:'Synthetic',service:'launch_site',message:'A synthetic example request.',request_kind:'charge_now'}).errors.request_kind);
});
test('offer actions separate checkout requests from questions and retain privacy terms',()=>{
 assert.match(offerActions('launch_site','Launch'),/href="\/checkout\/launch-site\/"/);assert.match(offerActions('launch_site','Launch'),/offer=launch_site&amp;request_kind=question#inquiry/);assert.throws(()=>offerActions('unknown','Unknown'));
 const privacy=intakeContent(config).privacyBody;assert.match(privacy,/Stripe handles agreed invoice payments/);assert.match(privacy,/Client, invoice and accounting records follow separate requirements/);assert.match(privacy,/https:\/\/stripe.com\/privacy/);
});

test('checkout explains the email reply and preserves synthetic-preview boundaries',()=>{
 const live=checkoutPages(offers,intakeContent(config),config);
 for(const page of live){assert.ok(page.body.includes(config.responseWindow));const nearSend=page.body.slice(page.body.indexOf('<div class="inquiry-next">'),page.body.indexOf('<button type="submit"'));assert.match(nearSend,/Nothing is booked or charged when you send this/);assert.match(nearSend,/You approve the written proposal, including work, price and dates, before payment/);assert.equal(page.body.split(config.responseWindow).length-1,1);}
 const synthetic={...config,mode:'staging',formMode:'synthetic'};
 for(const page of checkoutPages(offers,intakeContent(synthetic),synthetic)){assert.match(page.body,/Synthetic test form/);assert.match(page.body,/invented details only/);assert.match(page.body,/does not send email/);}
 const preview={...config,reviewOnly:true};
 for(const page of checkoutPages(offers,intakeContent(preview),preview))assert.match(page.body,/Submissions are disabled/);
});


test('build checkout keeps editing limits in the package details before the form and outside costs accessible',()=>{
 for(const page of checkoutPages(offers,intakeContent(config)).filter(p=>/-site\/$/.test(p.path))){
  const beforeForm=page.body.slice(0,page.body.indexOf('<form'));
  assert.match(beforeForm,/No visual or drag-and-drop editor is included/);assert.match(beforeForm,/Future changes require editing and publishing the website files/);assert.match(beforeForm,/You can do this yourself if you have those skills, use another developer, or ask me about optional care/);assert.match(page.body,/Domain, hosting, paid tools and approved extras cost separately/);
  assert.ok(page.body.indexOf('No visual or drag-and-drop editor is included')<page.body.indexOf('<form'));assert.match(page.body,/href="\/assets\/buyer-packs\//);
 }
});
