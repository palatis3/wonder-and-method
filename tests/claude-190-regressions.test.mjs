import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {validEmail,validateInquiry} from '../src/inquiry.mjs';
import {inquiryNetwork,allowInquiryRate} from '../deployment/inquiry-rate.mjs';
import {inquiryConfirmationHtml} from '../src/inquiry-confirmation.mjs';
const valid={name:'Synthetic Owner',email:'synthetic@example.test',business:'',website:'',service:'launch_site',message:'A synthetic inquiry only.'};

test('email addresses cannot inject another recipient, while ordinary aliases remain valid',()=>{
  for(const email of ['a@example.com,b@elsewhere.test','a@domain,other.test','a@-domain.test','a@domain-.test','a..b@example.test','.a@example.test','a.@example.test','a@a..test','a\r\n@example.test'])assert.equal(validEmail(email),false,email);
  for(const email of ['first.last+tag@example.test',"o'brien@example.test",'person@sub.example.test'])assert.equal(validEmail(email),true,email);
  const result=validateInquiry({...valid,service:'website_baseline',billing:'annual',priority:'email',website:'N/A'});
  assert.deepEqual(result.errors,{});assert.equal(result.value.website,'');assert.equal(result.value.billing,undefined);assert.equal(result.value.priority,undefined);
  assert.ok(validateInquiry({...valid,priority:'injected'}).errors.priority);
});

test('receipt displays the reply address safely without promising a synthetic reply',()=>{
  const html=inquiryConfirmationHtml({reference:'synthetic-ref',email:'<img src=x>@example.test',synthetic:false});
  assert.match(html,/&lt;img src=x&gt;@example.test/);assert.match(html,/Wrong address/);assert.doesNotMatch(html,/<img/);
  assert.doesNotMatch(inquiryConfirmationHtml({reference:'synthetic-ref',email:'person@example.test',synthetic:true}),/Terry will reply to/);
});

test('hourly and daily limits group equivalent IPv6 prefixes and never persist source IPs',async()=>{
  assert.equal(inquiryNetwork('2001:0db8:0001:2::1'),inquiryNetwork('2001:db8:1:2:abcd::5'));
  assert.notEqual(inquiryNetwork('2001:db8:1:2::1'),inquiryNetwork('2001:db8:1:3::1'));
  assert.equal(inquiryNetwork('::ffff:192.0.2.1'),'192.0.2.1');
  const sqlite=new DatabaseSync(':memory:');sqlite.exec('CREATE TABLE rate_limits(key TEXT PRIMARY KEY,hits INTEGER,expires_at INTEGER)');
  const env={FINGERPRINT_SECRET:'synthetic',DB:{prepare(sql){return {bind(...values){return {async first(){return sqlite.prepare(sql).get(...values);}};}};}}};
  const fingerprint=async(_,value)=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))).toString('hex');
  let now=Date.UTC(2026,9,18,1);
  for(let i=0;i<3;i++)assert.equal((await allowInquiryRate(env,'2001:db8:1:2::'+i,now,fingerprint)).allowed,true);
  const blocked=await allowInquiryRate(env,'2001:db8:1:2::4',now,fingerprint);assert.equal(blocked.allowed,false);assert.equal(blocked.retryAfter,3600);
  for(let i=0;i<7;i++){now+=3600_000;assert.equal((await allowInquiryRate(env,'2001:db8:1:2::5',now,fingerprint)).allowed,true);}
  now+=3600_000;assert.equal((await allowInquiryRate(env,'2001:db8:1:2::6',now,fingerprint)).allowed,false);
  assert.ok(sqlite.prepare('SELECT key FROM rate_limits').all().every(row=>/^[a-f0-9]{64}$/.test(row.key)));
  sqlite.close();
});


test('explicit decision-pack requests stay proposals without JavaScript and retain creative boundaries',async()=>{
 const {buyerPacks}=await import('../src/buyer-packs.mjs');
 const {inquiryForm}=await import('../src/inquiry-form.mjs');
 const {prefillInquiryHtml}=await import('../src/inquiry-prefill.mjs');
 const {default:offers}=await import('../config/offers.json',{with:{type:'json'}});
 for(const pack of buyerPacks(offers)){
  assert.equal(pack.request,'/checkout/'+pack.id.replaceAll('_','-')+'/');const html=prefillInquiryHtml(inquiryForm({live:false,privacyLink:'Privacy'},{checkout:true,service:pack.id}),new URL(pack.request,'https://example.test'));
  assert.match(html,/name="request_kind" value="checkout"/);
  assert.match(html,/<button type="submit" data-request-submit>Request a proposal<\/button>/);
  if(pack.id.endsWith('_site'))assert.ok(JSON.stringify(pack.sections).includes(offers[pack.id].creative));
 }
});

test('contextual guide links keep explicit offer intent, callouts and fragments',async()=>{
 const {contextualizeGuideBody}=await import('../src/guide-inquiry-actions.mjs');
 const html=contextualizeGuideBody('<aside class="journal-callout"><a href="/contact/?offer=keep_running&amp;request_kind=checkout#inquiry">Care</a></aside>','/guides/website-audit-checklist/');
 assert.match(html,/<aside class="journal-callout">/);assert.match(html,/offer=keep_running/);assert.match(html,/request_kind=checkout/);assert.match(html,/#inquiry/);assert.match(html,/goal=fix/);
});
