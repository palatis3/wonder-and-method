import test from 'node:test';
import assert from 'node:assert/strict';
import offers from '../config/offers.json' with {type:'json'};
import {addonCatalogue,addonPicker} from '../src/addon-content.mjs';
import {priceList,calculateCost,selectedInquiryContext,inquiryContextSummary} from '../src/shared.mjs';
import {prefillInquiryHtml} from '../src/inquiry-prefill.mjs';
import {inquiryFormMarkup} from '../src/inquiry-form.mjs';
import {inquiryResponseHtml} from '../src/inquiry-response.mjs';

test('the approved V4 addition prices are consistent in catalogues and native controls',()=>{
 const expected={reporting_dashboard:795,logo_identity:995,standard_page:195,three_page_bundle:525,practical_guide:495,campaign_landing_page:695,booking_setup:495,guided_quote_form:695,business_email_domain:295,profile_recovery:395,print_collateral:395,care_onboarding:195,single_fix:295};
 assert.deepEqual(Object.fromEntries(offers.add_ons.map(item=>[item.id,item.public_price])),expected);
 for(const detailed of [false,true]){
  const html=addonCatalogue(offers,{detailed});
  assert.equal((html.match(/class="v3-addon-card"/g)||[]).length,14);
  assert.doesNotMatch(html,/class="compact-offer"/);
  for(const item of offers.add_ons)assert.ok(html.includes(detailed?'addons='+item.id:'id="addon-'+item.id+'"'));
  if(!detailed)assert.match(html,/href="\/services\/website-addons\/"/);
 }
 const form=addonPicker(offers);
 assert.equal((form.match(/type="checkbox"/g)||[]).length,13);
 assert.equal(new Set([...form.matchAll(/name="([^"]+)"/g)].map(match=>match[1])).size,13);
 assert.match(form,/more than your package includes/);
 assert.match(form,/Ongoing support for stores, dashboards and portals is priced separately/);
});

test('selected additions enter the one-time subtotal once and V4 rejects annual enrollment',()=>{
 const prices=priceList(offers),add_ons=['standard_page','three_page_bundle','booking_setup'];
 const base=calculateCost(prices,{build:'launch',plan:'improve',cycles:12,external:0,hostingMonthly:0});
 const selected=calculateCost(prices,{build:'launch',plan:'improve',cycles:12,external:0,hostingMonthly:0,add_ons});
 assert.equal(selected.addonTotal,1215);
 assert.equal(selected.once,3410);
 assert.equal(selected.total-base.total,1215);
 for(const ids of [[],add_ons])assert.throws(()=>calculateCost(prices,{build:'existing',plan:'improve',billing:'annual',cycles:12,add_ons:ids}),/Annual enrollment is unavailable/);
 const incomplete=calculateCost(prices,{build:'existing',plan:'improve',cycles:12,add_ons});
 assert.equal(incomplete.complete,false);assert.equal(incomplete.total,null);
 assert.throws(()=>calculateCost(prices,{add_ons:['unknown']}));
 assert.throws(()=>calculateCost(prices,{add_ons:['standard_page','standard_page']}));
 assert.throws(()=>calculateCost(prices,{add_ons:[{id:'standard_page',price:1}]}));
});

test('native link prefill, validation recovery and receipts retain the complete selected set',()=>{
 const initial=inquiryFormMarkup({live:false},{service:'unsure'});
 const selected=['booking_setup','standard_page'];
 const html=prefillInquiryHtml(initial,new URL('https://example.com/contact/?addons=standard_page,booking_setup&request_kind=checkout&name=INJECTED'));
 for(const id of selected)assert.match(html,new RegExp(`name="addon_${id}"[^>]* checked`));
 assert.match(html,/\$690/);
 assert.match(html,/<details class="addon-picker" data-addon-picker(?: hidden)?>/);assert.doesNotMatch(html,/<details class="addon-picker"[^>]* open/);
 assert.doesNotMatch(html,/INJECTED/);
 const context=selectedInquiryContext({service:'grow',addon_standard_page:'1',addon_booking_setup:'1'});
 assert.deepEqual(context.add_ons,selected);
 assert.equal(inquiryContextSummary({service:'grow',...context}).filter(line=>line.startsWith('Addition requested:')).length,2);
 const retry=inquiryResponseHtml({service:'grow',...context,message:'Fix the message.',errors:{message:'Too short.'},retry:{name:'Fixture',email:'fixture@example.test',message:'short',...context}});
 assert.match(retry,/addons=booking_setup%2Cstandard_page/);
 assert.doesNotMatch(retry.match(/href="([^"]+)"[^>]*>Return to inquiry/)[1],/fixture|short|add_ons=/);
 for(const id of selected)assert.match(retry,new RegExp(`name="addon_${id}"[^>]* checked`));
 const receipt=inquiryResponseHtml({reference:'00000000-0000-4000-8000-000000000001',synthetic:true,service:'unsure',...context});
 assert.match(receipt,/Booking or Deposit Setup/);
 assert.match(receipt,/Additional Standard Page/);
 assert.match(receipt,/One-time additions subtotal: \$690/);
});

test('invalid prefill cannot become a partial priced selection or inject markup',()=>{
 const initial=inquiryFormMarkup({live:false});
 for(const query of ['standard_page,unknown','standard_page,standard_page','%3Cscript%3E','standard_page%2C','standard_page&addons=logo_identity']){
  const html=prefillInquiryHtml(initial,new URL('https://example.com/contact/?addons='+query));
  assert.doesNotMatch(html,/name="addon_[^"]+"[^>]* checked/);
 }
 const html=inquiryFormMarkup({live:false},{service:'launch_site',value:{add_ons:['standard_page']}});
 assert.match(html,/Package \+ selected additions: \$2,390/);
 assert.match(html,/\$956 to book \(40%\)/);
 assert.match(html,/\$717 after copy\/design approval \(30%\)/);
 assert.match(html,/\$717 after staging approval/);
});

test('server-rendered checkout question links preserve selections and exclude personal URL fields',()=>{
 const form=inquiryFormMarkup({live:false},{service:'focused_site',checkout:true});
 const page='<a data-checkout-question href="/contact/?offer=focused_site&amp;request_kind=question#inquiry">Ask a question</a>'+form;
 const html=prefillInquiryHtml(page,new URL('https://example.com/checkout/focused-site/?addons=standard_page,booking_setup&offer=launch_site&name=PRIVATE&email=private%40example.test'));
 const href=html.match(/data-checkout-question href="([^"]+)"/)[1].replaceAll('&amp;','&');
 const url=new URL(href,'https://example.com');
 assert.equal(url.searchParams.get('offer'),'focused_site');
 assert.equal(url.searchParams.get('request_kind'),'question');
 assert.equal(url.searchParams.get('addons'),'booking_setup,standard_page');
 assert.doesNotMatch(href,/PRIVATE|private|name=|email=/);
});
