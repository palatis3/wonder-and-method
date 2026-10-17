import test from 'node:test';
import assert from 'node:assert/strict';
import {inquiryForm} from '../src/inquiry-form.mjs';
import {journal} from '../src/journal.mjs';
import {guideInquiry,contextualizeGuideBody} from '../src/guide-inquiry-actions.mjs';
import {routeIndexEligible} from '../src/index-policy.mjs';
test('core inquiry fields precede one optional detail disclosure and preserve contract',()=>{
 const html=inquiryForm({live:false,privacyLink:'Privacy'});
 assert.ok(html.indexOf('id="message"')<html.indexOf('<details class="inquiry-extra">'));
 assert.ok(html.indexOf('id="business"')>html.indexOf('<details class="inquiry-extra">'));
 assert.equal((html.match(/name="service"/g)||[]).length,1);
 assert.match(html,/value="unsure" selected/);assert.match(html,/action="\/api\/inquiries"/);
});
test('every guide has explicit intent and contextual replacement retains editorial examples',()=>{
 for(const item of journal)assert.match(guideInquiry(item.path).href,/offer=unsure&amp;goal=/);
 assert.match(guideInquiry('/guides/contact-form-not-working/').href,/goal=fix/);
 assert.match(guideInquiry('/guides/website-project-cost/').href,/goal=unsure&amp;request_kind=question/);
 const body='<aside class="journal-callout"><p>Hypothetical example.</p></aside><a href="/contact/">Ask</a>';
 assert.match(contextualizeGuideBody(body,'/guides/website-redesign-brief/'),/Hypothetical example/);
 assert.match(contextualizeGuideBody(body,'/guides/website-redesign-brief/'),/goal=redesign/);
});
test('fictional concept pages stay excluded from search while work remains indexable',()=>{
 for(const id of ['fieldwork','northline','hearthside']){assert.equal(routeIndexEligible(`/work/${id}/`),false);assert.equal(routeIndexEligible(`/work/${id}/request/`),false);}
 assert.equal(routeIndexEligible('/work/'),true);
});
