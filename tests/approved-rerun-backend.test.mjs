import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import worker,{runScheduledMaintenance} from '../deployment/worker.mjs';
import {inquiryStatus} from '../deployment/inquiry-health.mjs';
import {recordSubmissionFailure,sendAttentionPing,submissionAttention,acknowledgeSubmissionAttention} from '../deployment/approved-rerun-attention.mjs';
import {publicRouteRedirect} from '../deployment/public-route-canonical.mjs';
import {countyContextOptions} from '../src/approved-rerun-county-context.mjs';
import {inquiryFormMarkup} from '../src/inquiry-form.mjs';
import {prefillInquiryHtml} from '../src/inquiry-prefill.mjs';
import {validateInquiry} from '../src/inquiry.mjs';
import {selectedInquiryContext,inquiryMessageHelp,inquiryContextSummary,calculateCost,costEstimateCopy,priceList,escapeHtml} from '../src/shared.mjs';
import {breakEvenDisplayBound,calculateWebsiteRoi} from '../src/assets/roi-math.mjs';
import offers from '../config/offers.json' with {type:'json'};

const migrationDir=new URL('../deployment/migrations/',import.meta.url);
const migrations=await Promise.all((await readdir(migrationDir)).filter(name=>name.endsWith('.sql')).sort().map(name=>readFile(new URL(name,migrationDir),'utf8')));
function fixture({fail=()=>false,after=()=>false}={}){
 const sqlite=new DatabaseSync(':memory:');for(const migration of migrations)sqlite.exec(migration);
 return {sqlite,prepare(sql){
  if(fail(sql))throw Error('synthetic failure with forbidden owner@example.test and secret');
  const statement=values=>({bind:(...next)=>statement(next),async first(){return sqlite.prepare(sql).get(...values)||null;},async all(){return {results:sqlite.prepare(sql).all(...values)};},async run(){const result=sqlite.prepare(sql).run(...values);if(after(sql))throw Error('synthetic uncertain storage outcome');return {meta:result};}});return statement([]);
 }};
}
const envFor=DB=>({DB,INQUIRY_MODE:'live',ENVIRONMENT:'production',RELEASE_APPROVED:'true',SEARCH_INDEXING:'true',FINGERPRINT_SECRET:'synthetic-fixture-only-secret-of-at-least-thirty-two-characters',INQUIRY_SUBMISSION_HEALTHCHECK_URL:'https://hc-ping.com/00000000-0000-4000-8000-000000000001',INQUIRY_FAILURE_RATE_LIMITER:{limit:async()=>({success:true})}});
const input={name:'Synthetic <person>',email:'owner@example.test',business:'Synthetic company',business_location:'Synthetic town',service:'unsure',message:'Synthetic inquiry. Never send to an owner.'};
const request=(value=input,accept='application/json')=>new Request('https://example.test/api/inquiries',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json',Accept:accept,'CF-Connecting-IP':'192.0.2.42'},body:JSON.stringify(value)});
const context=()=>({promises:[],waitUntil(promise){this.promises.push(promise);}});
const retentionRows=(db,now)=>{
 const day=86_400_000;
 const add=(id,age,{contact=true,hold=0,review=null,client=0,status='accepted'}={})=>db.sqlite.prepare('INSERT INTO inquiries (id,created_at,payload,dedupe_key,synthetic,delivery_status,last_substantive_contact_at,is_client,retention_hold,retention_hold_review_at) VALUES (?,?,?,?,0,?,?,?,?,?)').run(id,now-age*day,'{}',id,status,contact?now-age*day:null,client,hold,review);
 add('day79',79);add('day80',80);add('day89',89);add('day90',90);add('unknown80',80,{contact:false});add('unknown90',90,{contact:false});add('expiredhold',90,{hold:1,review:now-1});add('protectedhold',90,{hold:1,review:now+day});add('sending',90,{status:'sending'});add('client',90,{client:1});
};

test('submit failures distinguish pre-save, uncertain insert and confirmed-save receipt failure; native entries survive',async()=>{
 const cases=[
  {fail:sql=>sql.startsWith('SELECT id, created_at, delivery_status FROM inquiries'),code:'inquiry_pre_save_failed',saved:0},
  {fail:sql=>sql.startsWith('INSERT INTO inquiries'),code:'inquiry_storage_outcome_unknown',saved:0},
  {after:sql=>sql.startsWith('INSERT INTO inquiries'),code:'inquiry_storage_outcome_unknown',saved:1},
  {fail:sql=>sql.includes('AND expires_at>? RETURNING hits'),code:'inquiry_receipt_failed',saved:1}
 ];
 const originalFetch=globalThis.fetch,originalError=console.error;
 try{for(const item of cases){
  const db=fixture(item),env=envFor(db),ctx=context(),signals=[],logs=[];
  globalThis.fetch=async(url,options)=>{signals.push({url,options});return new Response('OK');};console.error=code=>logs.push(code);
  const response=await worker.fetch(request(input,'text/html'),env,ctx);await Promise.all(ctx.promises);
  assert.equal(response.status,503);const html=await response.text();assert.match(html,/Synthetic &lt;person&gt;/);assert.match(html,/Synthetic town/);assert.match(html,/name="message"/);
  assert.equal(db.sqlite.prepare('SELECT count(*) total FROM inquiries').get().total,item.saved);
  assert.deepEqual(logs,[item.code]);assert.equal(signals.length,1);assert.equal(signals[0].url,env.INQUIRY_SUBMISSION_HEALTHCHECK_URL+'/fail');assert.equal(signals[0].options.body,'');
  const attention=await submissionAttention(db);assert.equal(attention.incidents[0].code,item.code);assert.equal(attention.review_required,true);assert.doesNotMatch(JSON.stringify(attention),/owner@|Synthetic|192\.0\.2|secret/);db.sqlite.close();
 }}finally{globalThis.fetch=originalFetch;console.error=originalError;}
});

test('independent fixed-code signal survives a total D1 outage; invalid and synthetic traffic cannot alert',async()=>{
 const signals=[],logs=[],send=async(url,options)=>{signals.push({url,options});return new Response('OK');};
 const env=envFor({prepare(){throw Error('database offline');}});
 const result=await recordSubmissionFailure(env,'inquiry_pre_save_failed',{send,logger:code=>logs.push(code)});
 assert.equal(result.recorded,false);assert.equal(result.acknowledged,true);assert.equal(signals.length,1);assert.deepEqual(logs,['inquiry_pre_save_failed']);
 await recordSubmissionFailure(env,'form contents here',{send});await recordSubmissionFailure({...env,INQUIRY_MODE:'synthetic'},'inquiry_pre_save_failed',{send});assert.equal(signals.length,1);
 const ctx=context();assert.equal((await worker.fetch(request({...input,email:'bad'}),env,ctx)).status,422);assert.equal(ctx.promises.length,0);
 assert.equal((await worker.fetch(request({...input,_wm_note:'filled'}),env,ctx)).status,422);assert.equal(ctx.promises.length,0);
});

test('durable failure counts throttle signals and acknowledgement cannot swallow a newer occurrence',async()=>{
 const db=fixture(),env=envFor(db);let signals=0;const opts={now:100000,send:async()=>{signals++;return new Response('OK');},logger(){}};
 await recordSubmissionFailure(env,'inquiry_receipt_failed',opts);await recordSubmissionFailure(env,'inquiry_receipt_failed',{...opts,now:100001});assert.equal(signals,1);
 const stale=await acknowledgeSubmissionAttention(env,{confirm:'reviewed-submission-failures',incidents:[{code:'inquiry_receipt_failed',occurrences:1}]});assert.equal(stale.status,409);
 const ack=await acknowledgeSubmissionAttention(env,{confirm:'reviewed-submission-failures',incidents:[{code:'inquiry_receipt_failed',occurrences:2}]});assert.equal(ack.status,200);assert.equal(ack.attention.review_required,false);assert.equal(signals,1);
 await recordSubmissionFailure(env,'inquiry_receipt_failed',{...opts,now:160001});assert.equal(signals,2);assert.equal((await submissionAttention(db)).review_required,true);
 await runScheduledMaintenance(env,{now:160002,clock:()=>160002,send:opts.send,logger(){}});assert.equal(signals,3);assert.equal((await submissionAttention(db)).incidents[0].occurrences,3);db.sqlite.close();
});

test('D1 outage bursts are independently bounded and a missing limiter never opens an unbounded sender',async()=>{
 let allowed=1,pings=0;const keys=[],env={...envFor({prepare(){throw Error('offline');}}),INQUIRY_FAILURE_RATE_LIMITER:{async limit({key}){keys.push(key);return {success:allowed-- > 0};}}};
 const options={send:async()=>{pings++;return new Response('OK');},logger(){}};
 for(let i=0;i<10;i++)await recordSubmissionFailure(env,'inquiry_pre_save_failed',options);
 assert.equal(pings,1);assert.deepEqual([...new Set(keys)],['inquiry-submission-failure']);
 const result=await recordSubmissionFailure({...env,INQUIRY_FAILURE_RATE_LIMITER:undefined},'inquiry_pre_save_failed',options);assert.equal(result.limiter_ready,false);assert.equal(pings,1);
});

test('monitor acknowledgement is bounded and validates exact receiver success without exposing its response',async()=>{
 const url=envFor(null).INQUIRY_SUBMISSION_HEALTHCHECK_URL;
 for(const body of ['OK (not found)','OK (rate limited)','X'.repeat(1000)])assert.equal((await sendAttentionPing(url,{send:async()=>new Response(body)})).acknowledged,false);
 assert.equal((await sendAttentionPing(url,{send:async()=>new Response('OK',{status:302})})).acknowledged,false);
 assert.equal((await sendAttentionPing('http://hc-ping.com/00000000-0000-4000-8000-000000000001',{send:async()=>{throw Error('must not call');}})).configured,false);
 assert.equal((await sendAttentionPing(url,{send:async()=>new Response('OK')})).acknowledged,true);
});

test('unacknowledged attempted submission alerts log a fixed code; deliberate throttling does not',async()=>{
 const db=fixture(),logs=[],env=envFor(db),logger=code=>logs.push(code);
 const options={now:100000,logger,send:async()=>new Response('private response must not be logged')};
 const failed=await recordSubmissionFailure(env,'inquiry_pre_save_failed',options);
 assert.equal(failed.attempted,true);assert.equal(failed.acknowledged,false);
 assert.deepEqual(logs,['inquiry_pre_save_failed','inquiry_submission_signal_failed']);
 logs.length=0;
 await recordSubmissionFailure(env,'inquiry_pre_save_failed',{...options,now:100001});
 assert.deepEqual(logs,['inquiry_pre_save_failed']);
 logs.length=0;
 await recordSubmissionFailure({...env,INQUIRY_FAILURE_RATE_LIMITER:{limit:async()=>({success:false})}},'inquiry_receipt_failed',options);
 assert.deepEqual(logs,['inquiry_receipt_failed']);
 logs.length=0;
 await recordSubmissionFailure(env,'inquiry_configuration_unavailable',{...options,send:async()=>{throw Error('private transport error');}});
 assert.deepEqual(logs,['inquiry_configuration_unavailable','inquiry_submission_signal_failed']);db.sqlite.close();
});

test('a successful partial acknowledgement is not clear; a later conflict preserves earlier reviewed rows',async()=>{
 const db=fixture(),env=envFor(db),now=100000;
 for(const code of ['inquiry_pre_save_failed','inquiry_receipt_failed'])db.sqlite.prepare('INSERT INTO operation_attention (code,occurrences,first_at,last_at) VALUES (?,2,?,?)').run(code,now,now);
 const partial=await acknowledgeSubmissionAttention(env,{confirm:'reviewed-submission-failures',incidents:[{code:'inquiry_pre_save_failed',occurrences:2}]});
 assert.equal(partial.status,200);assert.equal(partial.attention.review_required,true);
 db.sqlite.prepare("UPDATE operation_attention SET acknowledged_occurrences=0 WHERE code='inquiry_pre_save_failed'").run();
 const conflict=await acknowledgeSubmissionAttention(env,{confirm:'reviewed-submission-failures',incidents:[{code:'inquiry_pre_save_failed',occurrences:2},{code:'inquiry_receipt_failed',occurrences:1}]});
 assert.equal(conflict.status,409);
 const fresh=await submissionAttention(db);assert.equal(fresh.review_required,true);
 assert.equal(fresh.incidents.find(row=>row.code==='inquiry_pre_save_failed').acknowledged_occurrences,2);
 assert.equal(fresh.incidents.find(row=>row.code==='inquiry_receipt_failed').acknowledged_occurrences,0);db.sqlite.close();
});

test('retention review includes day80/90, unknown dates, expired holds and sending records without deleting protected rows',async()=>{
 const db=fixture(),now=Date.UTC(2026,9,21),env={...envFor(db),RESEND_API_KEY:'synthetic',NOTIFICATION_FROM:'test',NOTIFICATION_TO:'test'};retentionRows(db,now);
 db.sqlite.prepare("INSERT INTO operation_health (name,last_success_at) VALUES ('inquiry-recovery',?)").run(now);
 const state=await inquiryStatus(env,now),r=state.attention.retention;
 assert.equal(r.upcoming,2);assert.equal(r.due,1);assert.equal(r.unconfirmed_upcoming,1);assert.equal(r.unconfirmed_old,1);assert.equal(r.holds_needing_review,1);assert.equal(r.sending_needing_review,1);assert.equal(r.review_required,true);
 assert.equal(db.sqlite.prepare('SELECT count(*) total FROM inquiries').get().total,10);
 assert.doesNotMatch(JSON.stringify(r),/day79|expiredhold|protectedhold|sending"/);db.sqlite.close();
});

test('retention monitor failure cannot suppress a healthy delivery heartbeat',async()=>{
 const db=fixture(),now=Date.UTC(2026,9,21),env={...envFor(db),RESEND_API_KEY:'synthetic',NOTIFICATION_FROM:'test',NOTIFICATION_TO:'test',HEALTHCHECK_URL:'https://example.test/delivery',RETENTION_HEALTHCHECK_URL:'https://hc-ping.com/00000000-0000-4000-8000-000000000002'};
 db.sqlite.prepare('INSERT INTO inquiries (id,created_at,payload,dedupe_key,synthetic,delivery_status,last_substantive_contact_at) VALUES (?,?,?,?,0,?,?)').run('due',now-90*86400000,'{}','due','accepted',now-90*86400000);
 const calls=[],result=await runScheduledMaintenance(env,{now,clock:()=>now,logger(){},send:async(url,options)=>{calls.push({url,options});return new Response(url.includes('/delivery')?'OK':'OK (not found)');}});
 assert.equal(calls[0].url,env.HEALTHCHECK_URL);assert.equal(calls[1].url,env.RETENTION_HEALTHCHECK_URL+'/fail');assert.ok(result.codes.includes('scheduled_retention_signal_failed'));assert.equal(db.sqlite.prepare('SELECT count(*) total FROM inquiries').get().total,1);db.sqlite.close();
});

test('operator acknowledgements require authentication and preserve all inquiry fields and clocks',async()=>{
 const db=fixture(),env={...envFor(db),OPERATOR_TOKEN:'synthetic-token'},now=Date.now();retentionRows(db,now);
 const before=db.sqlite.prepare('SELECT * FROM inquiries ORDER BY id').all();
 const action=(kind,data,authenticated=true)=>new Request('https://example.test/api/operator/inquiries/'+kind+'/acknowledge',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',...(authenticated?{Authorization:'Bearer synthetic-token'}:{})},body:JSON.stringify(data)});
 assert.equal((await worker.fetch(action('retention',{confirm:'reviewed-retention-attention'},false),env,context())).status,401);
 assert.equal((await worker.fetch(action('retention',{confirm:'wrong'}),env,context())).status,422);
 assert.equal((await worker.fetch(action('retention',{confirm:'reviewed-retention-attention'}),env,context())).status,200);
 const state=await inquiryStatus(env,now);assert.ok(state.attention.retention.last_reviewed_at);assert.equal(state.attention.retention.review_required,true);
 assert.deepEqual(db.sqlite.prepare('SELECT * FROM inquiries ORDER BY id').all(),before);
 assert.equal((await worker.fetch(action('submission-failures',{confirm:'reviewed-submission-failures',incidents:[]}),env,context())).status,200);db.sqlite.close();
});

test('all333 county contexts roundtrip as page provenance, with optional separately supplied location',()=>{
 assert.equal(countyContextOptions.length,333);
 const template=inquiryFormMarkup({live:true});
 for(const [county,label] of countyContextOptions){
  const html=prefillInquiryHtml(template,new URL('https://example.test/contact/?county='+encodeURIComponent(county)+'&business_location=FORGED'));
  assert.ok(html.includes('name="county" value="'+county+'"'));assert.ok(html.includes(escapeHtml(label)),county);assert.doesNotMatch(html,/FORGED/);
  const result=validateInquiry({...input,county});assert.deepEqual(result.errors,{});assert.equal(selectedInquiryContext(result.value).county,county);assert.ok(inquiryContextSummary(result.value).some(line=>line.includes('not your business address')));
 }
 assert.ok(validateInquiry({...input,county:'<script>'}).errors.county);assert.ok(validateInquiry({...input,county:'a'.repeat(5000)}).errors.county);
 assert.equal(validateInquiry({...input,business_location:''}).errors.business_location,undefined);
});

test('all62 NY aliases combine origin/path variants directly; unknown slugs and mutations remain excluded',()=>{
 const counties=countyContextOptions.filter(([key])=>!key.includes('/'));assert.equal(counties.length,62);
 for(const [slug] of counties){const url=new URL('http://www.wonderandmethod.com//AREAS/NEW-YORK/'+slug.toUpperCase()+'/INDEX.HTML?goal=care&qa=1');const target=slug==='erie-county'?'/areas/erie-county/?goal=care&qa=1':'/areas/new-york/?goal=care&qa=1#'+slug.replace(/-county$/,'');assert.equal(publicRouteRedirect(url,'GET','https://wonderandmethod.com'),'https://wonderandmethod.com'+target);}
 assert.equal(publicRouteRedirect(new URL('https://wonderandmethod.com/areas/new-york/made-up-county/'),'GET','https://wonderandmethod.com'),null);
 for(const method of ['POST','PUT','DELETE','OPTIONS'])assert.equal(publicRouteRedirect(new URL('http://www.wonderandmethod.com/areas/new-york/erie-county/'),method,'https://wonderandmethod.com'),null);
 assert.equal(publicRouteRedirect(new URL('http://www.wonderandmethod.com/api/inquiries'),'GET','https://wonderandmethod.com'),null);
});

test('fix prompts and field errors remain shared while questions keep optional websites',()=>{
 for(const service of ['unsure','launch_site','keep_running','website_baseline']){
  assert.match(inquiryMessageHelp(service,'question','fix',true),/when you tested it/);assert.deepEqual(validateInquiry({...input,service,goal:'fix',request_kind:'question',website:''}).errors,{});
 }
 assert.match(inquiryMessageHelp('keep_running','checkout','',false),/each month/);assert.doesNotMatch(inquiryMessageHelp('unsure','','',true),/Questions are welcome here too/);
 assert.match(validateInquiry({...input,message:'Has hidden \u0001 text'}).errors.message,/retype.*plain text/);
});

test('cost copy includes entered money once, preserves prices and has a true empty state',()=>{
 const prices=priceList(offers);
 for(const hostingMonthly of [null,0,10.25])for(const external of [null,0,120.50]){
  const v=calculateCost(prices,{build:'focused',plan:'improve',cycles:1,hostingMonths:1,hostingMonthly,external});const copy=costEstimateCopy(v,{plan:'improve',prices,external});
  assert.match(copy.breakdown,/1 monthly payment of/);assert.doesNotMatch(copy.total,/not added|Still/);
  assert.equal(copy.note.includes('hosting'),hostingMonthly===null);assert.equal(copy.note.includes('domain, email'),external===null);
 }
 assert.throws(()=>calculateCost(prices,{plan:'improve',cycles:0}),/at least one month/);assert.doesNotThrow(()=>calculateCost(prices,{plan:'improve',cycles:120}));assert.throws(()=>calculateCost(prices,{plan:'improve',cycles:121}));
 const empty=calculateCost(prices,{build:'existing',plan:'none'});assert.match(costEstimateCopy(empty).total,/Choose work/);
 const add=calculateCost(prices,{build:'existing',plan:'none',add_ons:[offers.add_ons[0].id]});assert.equal(add.knownSubtotal,offers.add_ons[0].public_price);assert.doesNotMatch(costEstimateCopy(add).total,/Choose work/);
});

test('break-even display rounds upward without changing arithmetic or bumping exact tenths',()=>{
 const result=calculateWebsiteRoi({oneTime:2350,monthlyCost:180,months:12,inquiries:3,closeRate:25,contribution:500});assert.equal(result.net,-10);assert.equal(breakEvenDisplayBound(result.breakEvenInquiries),3.1);
 for(const [value,expected]of [[3,3],[3.1,3.1],[0.1+0.2,0.3],[3.10000001,3.2],[3.09999999,3.1],[0,0],[null,null]])assert.equal(breakEvenDisplayBound(value),expected);
 const base={oneTime:0,monthlyCost:0,months:12,inquiries:0,closeRate:0,contribution:0};assert.equal(calculateWebsiteRoi(base).breakEvenInquiries,0);assert.equal(calculateWebsiteRoi({...base,oneTime:10}).breakEvenInquiries,null);
});

test('new source hosts reject suffix lookalikes and supported public downloads send no resource paths',async()=>{
 const source=(await readFile(new URL('../src/assets/journey-counts.js',import.meta.url),'utf8')).replace('export function countJourney','function countJourney');
 const run=referrer=>{const sent=[],listeners={},location=new URL('https://wonderandmethod.com/tools/website-roi-calculator/');runInNewContext(source,{URL,URLSearchParams,location,localStorage:{getItem(){return null;}},navigator:{},document:{referrer,documentElement:{dataset:{measurement:'aggregate'}},addEventListener(type,fn){listeners[type]=fn;}},fetch:async(_url,options)=>{sent.push(JSON.parse(options.body));return new Response();}});return {sent,listeners};};
 for(const [host,category]of [['search.brave.com','search'],['startpage.com','search'],['lnkd.in','social'],['search.brave.com.evil.test','referral'],['evilstartpage.com','referral']])assert.equal(run('https://'+host+'/').sent[0].source,category);
 const {sent,listeners}=run('');
 for(const path of ['/assets/buyer-packs/launch_site.txt','/assets/buyer-packs/launch_site.json','/assets/buyer-packs/website-addons','/assets/county-briefs/erie.txt']){const a={href:'https://wonderandmethod.com'+path};for(let i=0;i<2;i++)listeners.click({target:{closest:selector=>selector==='a[href]'?a:null}});}
 assert.equal(sent.filter(row=>row.event==='resource_select').length,4);assert.doesNotMatch(JSON.stringify(sent),/\/assets\/|\.txt|\.json/);
});

test('attention query failures cannot mask another monitoring channel',async()=>{
 const now=Date.now();
 for(const kind of ['submission','retention']){
  const db=fixture({fail:sql=>kind==='submission'?sql.startsWith('SELECT code,occurrences'):sql.includes('AS holds_needing_review')});
  const env={...envFor(db),HEALTHCHECK_URL:'https://hc-ping.com/00000000-0000-4000-8000-000000000002',RETENTION_HEALTHCHECK_URL:'https://hc-ping.com/00000000-0000-4000-8000-000000000003',RESEND_API_KEY:'synthetic',NOTIFICATION_FROM:'test@example.test',NOTIFICATION_TO:'owner@example.test'};
  const calls=[];const result=await runScheduledMaintenance(env,{now,send:async url=>{calls.push(url);return new Response('OK');},logger:()=>{}});
  assert.ok(calls.includes(env.HEALTHCHECK_URL),'healthy delivery receipt survives '+kind+' query error');
  if(kind==='submission'){assert.ok(calls.includes(env.RETENTION_HEALTHCHECK_URL));assert.ok(result.codes.includes('scheduled_submission_attention_failed'));}
  else {assert.ok(calls.includes(env.RETENTION_HEALTHCHECK_URL+'/fail'));assert.ok(result.codes.includes('scheduled_retention_status_failed'));assert.ok(!result.codes.includes('scheduled_submission_attention_failed'));}
  db.sqlite.close();
 }
});
test('explicit zero provider costs remain a complete zero-dollar estimate',()=>{
 const result=calculateCost(priceList(offers),{build:'existing',plan:'none',hostingMonthly:0,external:0});
 const copy=costEstimateCopy(result,{plan:'none',prices:priceList(offers),external:0});
 assert.equal(result.complete,true);assert.equal(result.total,0);assert.equal(copy.total,'Estimated total: $0');assert.match(copy.breakdown,/hosting.*\$0/);assert.doesNotMatch(copy.total,/Choose/);
});
