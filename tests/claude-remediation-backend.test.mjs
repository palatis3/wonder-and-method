import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import worker from '../deployment/worker.mjs';
import {inquiryStatus,recordRecoverySuccess} from '../deployment/inquiry-health.mjs';
import {validateInquiry} from '../src/inquiry.mjs';
import {emailTypoSuggestion} from '../src/inquiry-submit.mjs';
import {inquiryFormMarkup} from '../src/inquiry-form.mjs';
import {prefillInquiryHtml} from '../src/inquiry-prefill.mjs';
import {inquiryConfirmationHtml} from '../src/inquiry-confirmation.mjs';
import {inquiryContextSummary} from '../src/shared.mjs';
import config from '../config/site.json' with {type:'json'};
import pageDates from '../config/page-dates.json' with {type:'json'};
import {journeyPageKey} from '../src/journey-page-key.mjs';
const dir=new URL('../deployment/migrations/',import.meta.url);
const migrations=await Promise.all((await readdir(dir)).filter(n=>n.endsWith('.sql')).sort().map(n=>readFile(new URL(n,dir),'utf8')));
function fixture(){const sqlite=new DatabaseSync(':memory:');sqlite.exec(migrations.join('\n'));return {sqlite,prepare(sql){const build=values=>({bind:(...next)=>build(next),async first(){return sqlite.prepare(sql).get(...values)??null;},async all(){return {results:sqlite.prepare(sql).all(...values)};},async run(){return {meta:sqlite.prepare(sql).run(...values)};}});return build([]);}};}
const base={name:'Synthetic Person',email:'synthetic@example.test',business:'',website:'',service:'unsure',request_kind:'question',message:'A synthetic question for testing.'};

test('Baseline and Sprint proposals require an address while questions, monthly help and new builds remain optional',()=>{
 for(const service of ['website_baseline','audit_fix_sprint']){
  assert.ok(validateInquiry({...base,service,request_kind:'checkout'}).errors.website);
  for(const website of ['not yet','no website','not live yet']){
   const result=validateInquiry({...base,service,request_kind:'checkout',website});
   assert.ok(result.errors.website);
  }
  assert.deepEqual(validateInquiry({...base,service,request_kind:'question'}).errors,{});
 }
 assert.deepEqual(validateInquiry({...base,service:'launch_site',request_kind:'checkout'}).errors,{});
 for(const service of ['keep_running','improve','grow'])assert.deepEqual(validateInquiry({...base,service,request_kind:'checkout',goal:'fix'}).errors,{});
});
const env=()=>({DB:fixture(),ENVIRONMENT:'production',INQUIRY_MODE:'synthetic',RELEASE_APPROVED:'true',FINGERPRINT_SECRET:'synthetic-32-character-fingerprint-secret'});
const request=(value,origin='https://example.test')=>new Request('https://example.test/api/inquiries',{method:'POST',headers:{Origin:origin,Accept:'text/html','Content-Type':'application/x-www-form-urlencoded','CF-Connecting-IP':'192.0.2.2'},body:new URLSearchParams(value)});
const ctx={waitUntil(){}};
test('every emitted public-page journey key passes API validation and migrated database constraints',async()=>{
 const e={...env(),INQUIRY_MODE:'live',JOURNEY_COUNTS:'aggregate'},keys=new Set(Object.keys(pageDates).map(journeyPageKey));
 try{
  let index=0;for(const page of keys){
   const response=await worker.fetch(new Request('https://example.test/api/journey-counts',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.'+(++index)},body:JSON.stringify({event:'page_view',service:'unsure',page,source:'direct'})}),e,ctx);
   assert.equal(response.status,204,page);
   assert.equal(e.DB.sqlite.prepare('SELECT total FROM journey_counts WHERE page=?').get(page)?.total,1,page);
  }
  assert.equal(e.DB.sqlite.prepare('SELECT COUNT(*) n FROM journey_counts').get().n,keys.size);
  assert.ok(keys.has('services'));
 }finally{e.DB.sqlite.close();}
});
test('native query prefill uses the same first-value policy as enhanced URLSearchParams.get',()=>{
 for(const [firstKind,lastKind,firstService,lastService] of [['question','checkout','grow','launch_site'],['checkout','question','launch_site','grow']]){
  const url=new URL(`https://example.test/contact/?offer=${firstService}&offer=${lastService}&request_kind=${firstKind}&request_kind=${lastKind}&goal=search&goal=fix&email=private@example.test`);
  const html=prefillInquiryHtml(inquiryFormMarkup({live:true}),url);
  assert.match(html,new RegExp(`<option value="${url.searchParams.get('offer')}" selected>`));
  assert.match(html,new RegExp(`name="request_kind" value="${url.searchParams.get('request_kind')}"`));
  assert.match(html,/type="hidden" id="goal" name="goal" value="search"/);assert.doesNotMatch(html,/private@example\.test/);
  const fixed=prefillInquiryHtml(inquiryFormMarkup({live:true},{checkout:true,service:'website_baseline'}),new URL(url.href.replace('/contact/','/checkout/website-baseline/')));
  assert.match(fixed,/type="hidden" id="service" name="service" value="website_baseline"/);
  assert.match(fixed,new RegExp(`name="request_kind" value="${firstKind}"`));
 }
});
test('live receipts confirm the reply destination without promising a verified sender or repeated timing',()=>{
 for(const request_kind of ['question','checkout']){
  const data={reference:'synthetic-regression-reference',service:'unsure',request_kind,found_via:'search'};
  const live=inquiryConfirmationHtml({...data,synthetic:false});
  assert.doesNotMatch(live,/My reply will come from/);assert.match(live,/I’ll reply to/);
  assert.equal(live.split(config.responseWindow).length-1,1);
  assert.match(live,/How did you find me\?: Google or another search engine/);
  assert.doesNotMatch(inquiryConfirmationHtml({...data,synthetic:true}),/My reply will come from|one business day/);
 }
 assert.deepEqual(inquiryContextSummary({service:'unsure',found_via:'google'}),['How did you find me?: Google Search']);
});
test('optional service, social notes and advisory email correction preserve valid user intent',()=>{
 const value={...base,service:'',website:'@my-business on Instagram',email:'person@gmial.com'};
 const result=validateInquiry(value);assert.deepEqual(result.errors,{});assert.equal(result.value.service,'unsure');assert.equal(result.value.website,value.website);assert.equal(result.value.email,value.email);assert.equal(emailTypoSuggestion(value.email),'person@gmail.com');assert.equal(emailTypoSuggestion('person@smallbusiness.test'),'');
 assert.deepEqual(validateInquiry({...base,website:'Instagram: @my-business'}).errors,{});
 for(const website of ['IG: patsbiz','facebook: Pat Plumbing','Note: none yet'])assert.deepEqual(validateInquiry({...base,website}).errors,{});
 assert.match(validateInquiry({...base,website:'person@example.test'}).errors.website,/looks like an email address/);
 for(const website of ['javascript:alert(1)','data:text/html,hello','vbscript:msgbox(1)','file:///private'])assert.ok(validateInquiry({...base,website}).errors.website,website);
 assert.ok(validateInquiry({...base,website:'https://user:pass@example.test'}).errors.website);
});
test('plain contact remains neutral and fixed proposal keeps choices without inactive annual',()=>{
 const plain=inquiryFormMarkup({live:true});assert.match(plain,/name="request_kind" value=""/);assert.match(plain,/<select id="service"[^>]*>/);assert.doesNotMatch(plain,/<select id="service"[^>]*required/);
 assert.match(plain,/class="request-summary"[^>]* hidden>/);assert.doesNotMatch(plain,/<select[^>]*name="request_kind"/);
 const fixed=inquiryFormMarkup({live:true},{checkout:true,service:'grow',value:{billing:'annual',priority:'graphic'},annualEnabled:false});assert.match(fixed,/type="hidden" id="service" name="service" value="grow"/);assert.match(fixed,/name="priority" value="graphic"/);assert.doesNotMatch(fixed,/value="annual"/);
 assert.doesNotMatch(fixed,/class="request-summary"|<select[^>]*name="request_kind"/);assert.match(fixed,/name="request_kind" value="checkout"/);
});
test('maximum Unicode native inquiry fits bounded body and oversized bodies do not claim recovery',async()=>{
 const e=env();try{const value={...base,name:'名'.repeat(100),business:'社'.repeat(160),website:'注'.repeat(500),message:'文'.repeat(3000)};assert.ok(new URLSearchParams(value).toString().length>20000);const res=await worker.fetch(request(value),e,ctx);assert.equal(res.status,202);assert.equal(JSON.parse(e.DB.sqlite.prepare('SELECT payload FROM inquiries').get().payload).message,value.message);
 const tooLarge=await worker.fetch(request({...base,message:'文'.repeat(5000)}),e,ctx);assert.equal(tooLarge.status,400);assert.doesNotMatch(await tooLarge.text(),/entries are kept|entries remain/);
 }finally{e.DB.sqlite.close();}
});
test('native storage failures preserve escaped text while foreign-origin responses never echo it',async()=>{
 const e=env(),value={...base,name:'<b>Synthetic</b>'};try{const res=await worker.fetch(request(value),{...e,DB:undefined},ctx);assert.equal(res.status,503);assert.match(await res.text(),/value="&lt;b&gt;Synthetic&lt;\/b&gt;"/);const foreign=await worker.fetch(request(value,'https://foreign.test'),e,ctx);assert.equal(foreign.status,403);assert.doesNotMatch(await foreign.text(),/Synthetic/);}finally{e.DB.sqlite.close();}
});
test('native rate rejection preserves the fourth inquiry and supplies a bounded retry interval',async()=>{
 const e=env();try{for(let i=0;i<3;i++)assert.equal((await worker.fetch(request({...base,message:base.message+' Distinct request '+i+'.'}),e,ctx)).status,202);const response=await worker.fetch(request({...base,message:'Please keep this fourth question intact.'}),e,ctx);assert.equal(response.status,429);assert.ok(Number(response.headers.get('Retry-After'))>0);assert.ok(Number(response.headers.get('Retry-After'))<=3600);assert.match(await response.text(),/Please keep this fourth question intact\./);assert.equal(e.DB.sqlite.prepare('SELECT COUNT(*) n FROM inquiries').get().n,3);}finally{e.DB.sqlite.close();}
});
test('retention review remains distinct from delivery health and quota exhaustion is immediately unhealthy',async()=>{
 const e=env(),now=Date.now();Object.assign(e,{INQUIRY_MODE:'live',RESEND_API_KEY:'synthetic',NOTIFICATION_FROM:'from@example.test',NOTIFICATION_TO:'to@example.test',NOTIFICATION_DAILY_LIMIT:2});
 try{await worker.fetch(request(base),{...e,INQUIRY_MODE:'synthetic'},ctx);e.DB.sqlite.prepare("UPDATE inquiries SET synthetic=0,delivery_status='accepted',created_at=?").run(now-100*86400000);await recordRecoverySuccess(e.DB,now);let status=await inquiryStatus(e,now);assert.equal(status.attention.retention.review_required,true);assert.equal(status.health.ok,true);assert.equal(status.total,1);
 e.DB.sqlite.prepare('INSERT INTO rate_limits VALUES (?,?,?)').run('notification-quota:'+Math.floor(now/86400000),2,now+86400000);status=await inquiryStatus(e,now);assert.deepEqual(status.health.reasons,['notification_budget_exhausted']);assert.equal(status.attention.notification_budget.used,2);
 }finally{e.DB.sqlite.close();}
});
test('resource migration preserves every historical source and total',()=>{
 const db=new DatabaseSync(':memory:');try{db.exec(migrations.slice(0,7).join('\n'));const sources=['not_recorded','direct','internal','google','bing','ai_assistant','social','referral','campaign'];for(const source of sources)db.prepare('INSERT INTO journey_counts VALUES (?,?,?,?,?,?)').run('2026-10-19','page_view','unsure','home',source,7);db.exec(migrations[7]);assert.equal(db.prepare('SELECT SUM(total) n FROM journey_counts').get().n,63);db.prepare('INSERT INTO journey_counts VALUES (?,?,?,?,?,?)').run('2026-10-19','resource_select','grow','pricing','search',2);assert.equal(db.prepare('SELECT COUNT(*) n FROM journey_counts').get().n,10);}finally{db.close();}
});
test('image embedding policy is narrowly scoped and does not enable CORS',async()=>{
 for(const [path,mime,policy] of [['/assets/brand/logo.png','image/png','cross-origin'],['/assets/social/card.webp','image/webp','cross-origin'],['/assets/brand/script.js','text/javascript','same-origin'],['/assets/other.png','image/png','same-origin']]){const response=await worker.fetch(new Request('https://example.test'+path),{ENVIRONMENT:'production',RELEASE_APPROVED:'true',ASSETS:{fetch:async()=>new Response('synthetic',{headers:{'Content-Type':mime}})}},ctx);assert.equal(response.headers.get('Cross-Origin-Resource-Policy'),policy);assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);}
});
const analytics=await readFile(new URL('../src/assets/journey-counts.js',import.meta.url),'utf8');
test('approximate sources recognize real hosts without accepting lookalikes and clicks send no resource URL',()=>{
 for(const [referrer,search,source] of [['https://www.google.co.uk/search','','google'],['https://chatgpt.com/c/example','','ai_assistant'],['https://google.com.evil.test/','','referral'],['','?utm_source=chatgpt.com','ai_assistant']]){
  const sent=[],listeners=[],location=new URL('https://wonderandmethod.com/pricing/'+search);runInNewContext(analytics.replace('export function','function'),{URL,URLSearchParams,location,navigator:{},localStorage:{getItem(){return null;}},document:{referrer,documentElement:{dataset:{measurement:'aggregate'}},addEventListener(_name,fn){listeners.push(fn);}},fetch(_url,options){sent.push(JSON.parse(options.body));return Promise.resolve();}});
  assert.equal(sent[0].source,source);const a={href:'https://wonderandmethod.com/assets/buyer-packs/grow.html?private=value'};listeners[0]({target:{closest(selector){return selector==='a[href]'?a:null;}}});assert.deepEqual(Object.keys(sent[1]).sort(),['event','page','service','source']);assert.equal(sent[1].event,'resource_select');assert.equal(sent[1].service,'grow');assert.equal(sent[1].source,'not_recorded');assert.ok(!JSON.stringify(sent).includes('private'));
 }
});
