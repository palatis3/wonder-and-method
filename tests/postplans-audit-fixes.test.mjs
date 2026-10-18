import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {allowInquiryRate} from '../deployment/inquiry-rate.mjs';
import {journeyReportCoverage} from '../deployment/journey-counts.mjs';
import {formatMeasurement} from '../deployment/production-operator.mjs';
import {inquiryForm} from '../src/inquiry-form.mjs';
import {prefillInquiryHtml} from '../src/inquiry-prefill.mjs';
import {inquiryMessagePrompt} from '../src/shared.mjs';
import {routeIndexEligible} from '../src/index-policy.mjs';
import {verifyWorkerVersion,verifyTechnicalManifest} from '../src/release-verification.mjs';

test('inquiry retention bounds match the published hourly/daily policy at bucket boundaries',async()=>{
 for(const now of [Date.UTC(2026,9,18),Date.UTC(2026,9,18,12,30),Date.UTC(2026,9,18,23,59,59,999)]){
  const expiries=[];
  const env={FINGERPRINT_SECRET:'synthetic-only',DB:{prepare(){return {bind(_key,expires){expiries.push(expires);return {first:async()=>({hits:1})};}};}}};
  assert.equal((await allowInquiryRate(env,'192.0.2.1',now,async()=> 'synthetic')).allowed,true);
  for(const [i,period] of [3600000,86400000].entries())assert.ok(expiries[i]-now>period&&expiries[i]-now<=2*period);
 }
 const config=JSON.parse(await readFile(new URL('../config/site.json',import.meta.url),'utf8'));
 assert.match(config.privacy.networkData,/between one and two hours, or between one and two days/);
 assert.match(config.privacy.networkData,/another hour.*longer if cleanup fails/);
 assert.match(config.privacy.networkData,/Separate analytics rate-control records expire after 20 minutes/);
});

test('retention-limited reports never turn absent previous history into growth',()=>{
 const now=Date.UTC(2026,9,18,12);
 const daily=Array.from({length:90},(_,i)=>({day:new Date(now-i*86400000).toISOString().slice(0,10),event:'page_view',total:1}));
 for(const days of [45,46,60,90]){
  const report={days,...journeyReportCoverage(days,now),daily,counts:[],bySource:[],note:'Synthetic constant series'};
  const output=formatMeasurement(report),line=output.split('\n').find(x=>x.startsWith('Page views '));
  assert.equal(report.coverage.previousAvailable,days===45);
  assert.equal(report.coverage.retainedSince,'2026-07-21');
  assert.match(line,days===45?/45\s+45\s+0$/:new RegExp(days+'\\s+N/A\\s+N/A$'));
  if(days>45)assert.match(output,/WARNING: Previous and Change are unavailable/);
 }
 const legacy=formatMeasurement({days:7,since:'2026-10-12',daily,counts:[],note:''});
 assert.match(legacy,/unavailable/,'A legacy response without coverage must not fabricate certainty.');
});

test('monthly prompts agree across static and query-prefilled forms, with useful build and repair prompts',()=>{
 for(const service of ['keep_running','improve','grow']){
  const initial=inquiryForm({live:false,privacyLink:'Privacy'},{service,checkout:true});
  const label=html=>html.match(/data-request-label>(.*?) <span>/)[1];
  assert.equal(label(initial),inquiryMessagePrompt(service));assert.match(label(initial),/existing website.*monthly help/);
  for(const query of ['?billing=annual','?request_kind=checkout&billing=monthly','?request_kind=question','?offer=launch_site&request_kind=checkout']){
   const html=prefillInquiryHtml(initial,new URL('https://example.test/checkout/'+service.replaceAll('_','-')+'/'+query));
   assert.equal(label(html),inquiryMessagePrompt(service,query.includes('request_kind=question')?'question':'checkout'));
  }
 }
 assert.match(inquiryMessagePrompt('launch_site'),/when do you need the website/);
 assert.match(inquiryMessagePrompt('audit_fix_sprint'),/What is broken/);
});

test('current guide readiness agrees with current search eligibility',async()=>{
 const config=JSON.parse(await readFile(new URL('../config/site.json',import.meta.url),'utf8'));
 const readiness=JSON.parse(await readFile(new URL('../config/conditional-readiness.json',import.meta.url),'utf8'));
 for(const guide of readiness.launch_guides)assert.equal(guide.status,config.searchIndexing&&routeIndexEligible(guide.path)?'published_indexable':'published_noindex');
 assert.doesNotMatch(readiness.enable_rule,/indexing is separately disabled/);
});

test('runtime identity mismatch or a missing binding fails release verification',()=>{
 const expected='a6311256-7a94-40d5-8e73-e48c17bd99f3';
 assert.equal(verifyWorkerVersion(expected,expected).verified,true);
 assert.throws(()=>verifyWorkerVersion(expected,'11111111-1111-4111-8111-111111111111'),/differs/);
 assert.throws(()=>verifyWorkerVersion(expected,null),/binding/);
 assert.throws(()=>verifyWorkerVersion(null,expected),/expected deployed/);
});

test('technical manifest rejects changed artifacts or incomplete checks without approving business gates',()=>{
 const current={commit:'a'.repeat(40),sourceSha256:'b'.repeat(64),artifactSha256:'c'.repeat(64)};
 const manifest={schemaVersion:1,kind:'website-technical',dirty:false,...current,checks:['build','tests','static-verification','browser-journeys','worker-dry-run']};
 assert.equal(verifyTechnicalManifest(manifest,current),true);
 assert.throws(()=>verifyTechnicalManifest(manifest,{...current,artifactSha256:'d'.repeat(64)}),/artifactSha256/);
 assert.throws(()=>verifyTechnicalManifest({...manifest,dirty:true},current),/clean source/);
 assert.throws(()=>verifyTechnicalManifest({...manifest,checks:['build']},current),/Incomplete/);
});
