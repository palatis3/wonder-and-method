import test from 'node:test';
import assert from 'node:assert/strict';
import entries from '../src/location-service-data.json' with {type:'json'};
import additions from '../src/location-inquiry-contexts.json' with {type:'json'};
import {countyContextOptions as legacy} from '../src/approved-rerun-county-context.mjs';
import {serviceAreaContextOptions,serviceAreaQuestionHref} from '../src/inquiry-area-context.mjs';
import {deriveLocationInquiryContexts,assertLocationInquiryContexts} from '../scripts/location-inquiry-contexts.mjs';
import {locationServicePages,locationServiceDisplay} from '../src/location-service-pages.mjs';
import {inquiryFormMarkup} from '../src/inquiry-form.mjs';
import {prefillInquiryHtml} from '../src/inquiry-prefill.mjs';
import {validateInquiry} from '../src/inquiry.mjs';
import {inquiryContextSummary,inquiryRequestSummary,escapeHtml} from '../src/shared.mjs';
import offers from '../config/offers.json' with {type:'json'};

test('every reviewed service-area page has a generated allowlisted provenance key while all legacy keys remain',async()=>{
 assert.equal(legacy.length,333);assert.equal(additions.length,1816);assert.equal(serviceAreaContextOptions.length,2149);
 assert.deepEqual(serviceAreaContextOptions.slice(0,legacy.length),legacy);
 assert.deepEqual(additions,deriveLocationInquiryContexts(entries));await assertLocationInquiryContexts();
 const template=inquiryFormMarkup({live:true}),input={name:'Synthetic Person',email:'synthetic@example.test',service:'unsure',message:'Synthetic validation only. No message sent.'};
 const paths=[...entries.map(x=>x.path),'/areas/erie-county/'];assert.equal(new Set(paths).size,2147);
 for(const path of paths){
  const url=new URL(serviceAreaQuestionHref(path),'https://example.test'),county=url.searchParams.get('county');
  assert.equal(url.searchParams.get('request_kind'),'question');assert.equal(url.searchParams.get('offer'),'unsure');assert.equal(url.searchParams.get('goal'),null);
  const result=validateInquiry({...input,request_kind:'question',county});assert.deepEqual(result.errors,{},path);assert.equal(result.value.county,county);assert.equal(result.value.business_location,undefined);
  const label=serviceAreaContextOptions.find(([key])=>key===county)[1];
  url.searchParams.set('business_location','FORGED');
  const html=prefillInquiryHtml(template,url);
  assert.ok(html.includes('name="county" value="'+escapeHtml(county)+'"'),path);assert.ok(html.includes(escapeHtml(label)),path);assert.doesNotMatch(html,/FORGED/);
  assert.ok(inquiryContextSummary(result.value).some(x=>x.includes('not your business address')));
  assert.ok(inquiryRequestSummary(result.value).includes('From service-area page: '+label));
 }
 for(const county of ['invented-county','<script>','a'.repeat(5000),'https://example.test/areas/erie-county/'])assert.ok(validateInquiry({...input,county}).errors.county);
 assert.throws(()=>serviceAreaQuestionHref('/areas/imaginary-county/'),/Unknown/);
 assert.throws(()=>deriveLocationInquiryContexts([entries[0],entries[0]]),/duplicate/);
});

test('county service titles retain every market name and CTAs carry context without assuming a new build',()=>{
 const before=JSON.stringify(entries),pages=locationServicePages(offers);
 assert.equal(pages.length,2146);
 for(const entry of entries){
  const display=locationServiceDisplay(entry),page=pages.find(x=>x.path===entry.path);
  assert.equal(display.market,entry.market.split(' / ').join(', '));assert.ok(page.title.startsWith('Web design for '));assert.equal(page.title,display.title);
  assert.equal(page.description,display.description,entry.path);assert.match(page.description,/web design for /i,entry.path);assert.doesNotMatch(page.description,/Example brief:/);assert.ok(page.description.length<=160,entry.path);
  assert.ok(page.body.includes(escapeHtml(entry.lead)));assert.ok(page.body.replace(/<\/p><p>/g,' ').replace(/\s+/g,' ').includes(escapeHtml(entry.decision).replace(/\s+/g,' ')),entry.path);
  const links=[...page.body.matchAll(/href="([^"<>]*\/contact\/[^"<>]*)"/g)].map(m=>new URL(m[1].replaceAll('&amp;','&'),'https://example.test')).filter(url=>url.origin==='https://example.test'&&url.pathname==='/contact/');
  assert.equal(links.length,2,entry.path);
  for(const url of links){assert.equal(url.searchParams.get('county'),entry.path.slice(7,-1));assert.equal(url.searchParams.get('request_kind'),'question');assert.equal(url.searchParams.get('goal'),null);}
  for(const source of entry.sources)assert.ok(page.body.includes(escapeHtml(source.url)),entry.path+' source preserved');
 }
 assert.equal(JSON.stringify(entries),before);
});
