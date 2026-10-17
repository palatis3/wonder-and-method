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
  assert.ok(body.includes(total));assert.ok(body.includes('$399 setup'));assert.match(body,/usable studio build or Sprint already covers setup/);
 }
});
test('all eight offers have request-only checkout with the exact service preserved without JavaScript',()=>{
 const pages=checkoutPages(offers,intakeContent(config));assert.equal(pages.length,8);assert.equal(new Set(pages.map(p=>p.path)).size,8);
 for(const page of pages){const id=page.path.split('/')[2].replaceAll('-','_');assert.match(page.body,new RegExp(`<option value="${id}" selected>`));assert.match(page.body,/<option value="checkout" selected>/);assert.match(page.body,/No payment is taken here/);assert.match(page.body,/action="\/api\/inquiries"/);assert.doesNotMatch(page.body,/buy\.stripe\.com|invoice\.stripe\.com|name="(?:card|cvc|card_number)"/);}
 assert.match(pages.find(p=>p.path.includes('audit-fix-sprint')).body,/\$375/);assert.match(pages.find(p=>p.path.includes('website-baseline')).body,/\$399/);assert.match(pages.find(p=>p.path.includes('focused-site')).body,/\$1,175/);
});
test('checkout and service-question context survives validation, status and native correction',()=>{
 for(const kind of ['checkout','question']){
  const data={name:'Synthetic example',email:'fixture@example.invalid',business:'Synthetic only',website:'https://example.com',service:'improve',billing:'annual',request_kind:kind,message:'Synthetic request testing the selected service context.'};
  const checked=validateInquiry(data);assert.deepEqual(checked.errors,{});assert.equal(checked.value.request_kind,kind);assert.equal(checked.value.billing,'annual');assert.ok(inquiryContextSummary(checked.value).some(text=>text.includes('Request type')));
  const html=inquiryResponseHtml({...checked.value,message:'Correct the requested field',errors:{name:'Required'},retry:checked.value});assert.match(html,new RegExp(`name="request_kind" value="${kind}"`));assert.match(html,/value="annual" selected/);
 }
 assert.ok(validateInquiry({name:'Synthetic',email:'fixture@example.invalid',business:'Synthetic',service:'launch_site',message:'A synthetic example request.',request_kind:'charge_now'}).errors.request_kind);
});
test('offer actions separate checkout requests from questions and retain annual options',()=>{
 assert.match(offerActions('launch_site','Launch'),/href="\/checkout\/launch-site\/"/);assert.match(offerActions('launch_site','Launch'),/offer=launch_site&amp;request_kind=question#inquiry/);assert.throws(()=>offerActions('unknown','Unknown'));
 const privacy=intakeContent(config).privacyBody;assert.match(privacy,/Payments and billing/);assert.match(privacy,/90-day unsuccessful-inquiry period does not apply/);assert.match(privacy,/https:\/\/stripe.com\/privacy/);
});
