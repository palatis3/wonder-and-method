import test,{beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import worker,{notifyInquiry} from '../deployment/worker.mjs';
import {validateInquiry} from '../src/inquiry.mjs';
import {inquiryFormMarkup} from '../src/inquiry-form.mjs';

const migrations=await Promise.all(['0001_inquiries.sql','0003_inquiry_followup.sql','0005_inquiry_operations.sql','0009_inquiry_delivery_resolutions.sql'].map(name=>readFile(new URL('../deployment/migrations/'+name,import.meta.url),'utf8')));
const instant=Date.UTC(2026,9,23,12,15),origin='https://example.test',ip='192.0.2.77';
const fixture={name:'Synthetic owner',email:'fixture@example.test',business:'Synthetic studio',website:'',service:'launch_site',message:'Build a new website.\nKeep the inquiry path easy to use.\nThank you.'};
beforeEach(t=>{
 t.mock.method(Date,'now',()=>instant);
 t.mock.method(globalThis,'fetch',async()=>{throw Error('Network is prohibited in native inquiry tests.');});
});
function database(afterRead=async()=>{}){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(migrations.join('\n'));
 return {sqlite,prepare(sql){const build=values=>({bind:(...next)=>build(next),async first(){const row=sqlite.prepare(sql).get(...values)??null;await afterRead(sql,row);return row;},async all(){return {results:sqlite.prepare(sql).all(...values)};},async run(){return {meta:sqlite.prepare(sql).run(...values)};}});return build([]);}};
}
function environment(db=database()){
 // Live branch, synthetic fixture: sender credentials are deliberately absent.
 return {DB:db,ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',FINGERPRINT_SECRET:'synthetic-native-parity-secret-more-than-thirty-two-characters'};
}
const context=()=>({promises:[],waitUntil(promise){this.promises.push(promise);}});
function request(value=fixture,{native=false,html=false}={}){
 const body=native?new URLSearchParams({...value,message:value.message.replace(/\r\n?|\n/g,'\r\n')}).toString():JSON.stringify(value);
 return new Request(origin+'/api/inquiries',{method:'POST',headers:{Origin:origin,Accept:html?'text/html':'application/json','Content-Type':native?'application/x-www-form-urlencoded':'application/json','CF-Connecting-IP':ip},body});
}
const records=env=>env.DB.sqlite.prepare('SELECT * FROM inquiries ORDER BY created_at,id').all();
function assertRateCharges(env,hits){
 for(const period of [3600000,86400000]){
  const key=createHmac('sha256',env.FINGERPRINT_SECRET).update(`inquiry:${ip}:${period}:${Math.floor(instant/period)}`).digest('hex');
  assert.equal(env.DB.sqlite.prepare('SELECT hits FROM rate_limits WHERE key=?').get(key)?.hits,hits);
 }
}
function senderEnvironment(env){return {...env,RESEND_API_KEY:'synthetic-only',NOTIFICATION_FROM:'sender@example.test',NOTIFICATION_TO:'owner@example.test'};}
const decode=value=>value.replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
const attributes=tag=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match=>[match[1],decode(match[2])]));
function nativeFields(html){
 const fields={};
 for(const match of html.matchAll(/<input\b[^>]*>/g)){
  const input=attributes(match[0]);
  if(!input.name||/\bdisabled\b/.test(match[0])||['checkbox','radio'].includes(input.type)&&!/\bchecked\b/.test(match[0]))continue;
  fields[input.name]=input.value||'';
 }
 for(const match of html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/g)){
  const options=[...match[2].matchAll(/<option\b([^>]*)>/g)];
  fields[attributes(match[1]).name]=attributes((options.find(option=>/\bselected\b/.test(option[1]))||options[0])[1]).value||'';
 }
 for(const match of html.matchAll(/<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/g))fields[attributes(match[1]).name]=decode(match[2]).replace(/\r\n?/g,'\n');
 return fields;
}

test('native and JSON accept the same 3,000-character multiline message without losing the ending',async()=>{
 const message='雪\n'.repeat(1499)+'終!';assert.equal(message.length,3000);
 for(const native of [false,true]){
  const env=environment(),ctx=context();
  try{
   const response=await worker.fetch(request({...fixture,message},{native}),env,ctx);
   assert.equal(response.status,202);await Promise.all(ctx.promises);
   assert.equal(JSON.parse(records(env)[0].payload).message,message);
   const rejected=await worker.fetch(request({...fixture,message:message+'X'},{native}),env,ctx);
   assert.equal(rejected.status,422);assert.ok((await rejected.json()).errors.message);assert.equal(records(env).length,1);
  }finally{env.DB.sqlite.close();}
 }
});

test('native correction preserves every character of a legal multiline message when another field is invalid',async()=>{
 const env=environment(),ctx=context(),message='line\n'.repeat(599)+'final';assert.equal(message.length,3000);
 try{
  const response=await worker.fetch(request({...fixture,message,email:'missing-at'},{native:true,html:true}),env,ctx);
  assert.equal(response.status,422);
  const html=await response.text(),restored=nativeFields(html);
  assert.equal(restored.message,message);assert.match(restored.message,/final$/);assert.equal(records(env).length,0);
  assert.doesNotMatch(html,/Keep this message within 3,000 characters/);
  restored.email=fixture.email;
  const saved=await worker.fetch(request(restored,{native:true}),env,ctx);assert.equal(saved.status,202);await Promise.all(ctx.promises);
  assert.equal(JSON.parse(records(env)[0].payload).message,message);
 }finally{env.DB.sqlite.close();}
});

test('equivalent JSON and native retries in both orders share one row, charge and notification key',async()=>{
 for(const nativeFirst of [false,true]){
  const env=environment(),ctx=context();
  try{
   const first=await worker.fetch(request(fixture,{native:nativeFirst}),env,ctx);assert.equal(first.status,202);
   const reference=(await first.json()).reference;
   const retry=await worker.fetch(request(fixture,{native:!nativeFirst}),env,ctx);assert.equal(retry.status,202);
   assert.equal((await retry.json()).reference,reference);await Promise.all(ctx.promises);
   assert.equal(records(env).length,1);assert.equal(ctx.promises.length,1);assertRateCharges(env,1);
   const sent=[];const send=async(_url,options)=>{sent.push(options);return Response.json({id:'synthetic-provider-id'});};
   assert.equal((await notifyInquiry(senderEnvironment(env),reference,send)).sent,true);
   assert.equal((await notifyInquiry(senderEnvironment(env),reference,send)).sent,false);
   assert.equal(sent.length,1);assert.equal(sent[0].headers['Idempotency-Key'],'inquiry/'+reference);
   assert.ok(JSON.parse(sent[0].body).text.includes(fixture.message));
  }finally{env.DB.sqlite.close();}
 }
});

test('recent pre-update CRLF and CR rows keep their reference, customer bytes, lease history and frozen notification',async()=>{
 for(const newline of ['\r\n','\r']){
  const env=environment(),ctx=context(),reference=crypto.randomUUID();
  const original=JSON.stringify({...validateInquiry(fixture).value,message:fixture.message.replaceAll('\n',newline)});
  const frozen=JSON.stringify({from:'old-sender@example.test',to:['old-owner@example.test'],reply_to:fixture.email,subject:'Frozen original subject',text:'Frozen original text\r\nkept byte-for-byte'});
  try{
   env.DB.sqlite.prepare("INSERT INTO inquiries(id,created_at,payload,dedupe_key,synthetic,delivery_status,attempts,first_attempt_at,notification_payload) VALUES(?,?,?,?,0,'failed',1,?,?)").run(reference,instant-10000,original,'synthetic-legacy-'+reference,instant-5000,frozen);
   const before=records(env)[0];
   for(const native of [false,true]){
    const response=await worker.fetch(request(fixture,{native}),env,ctx);assert.equal(response.status,202);assert.equal((await response.json()).reference,reference);
   }
   assert.equal(ctx.promises.length,0);assert.deepEqual(records(env),[before]);assertRateCharges(env,1);
   let body,key;
   const result=await notifyInquiry(senderEnvironment(env),reference,async(_url,options)=>{body=options.body;key=options.headers['Idempotency-Key'];return Response.json({id:'synthetic-legacy-provider'});});
   assert.equal(result.sent,true);assert.equal(body,frozen);assert.equal(key,'inquiry/'+reference);
   assert.equal(records(env)[0].payload,original);assert.equal(records(env)[0].notification_payload,frozen);
  }finally{env.DB.sqlite.close();}
 }
});

test('concurrent equivalent native and JSON submissions keep the atomic insert guard and one net allowance charge',async()=>{
 let reads=0,release;const gate=new Promise(resolve=>release=resolve);
 const db=database(async(sql,row)=>{if(/^SELECT .* FROM inquiries WHERE created_at > /.test(sql)&&!row&&reads<3){if(++reads===3)release();await gate;}});
 const env=environment(db),contexts=[context(),context(),context()];
 try{
  const responses=await Promise.all(contexts.map((ctx,index)=>worker.fetch(request(fixture,{native:index!==0}),env,ctx)));
  assert.deepEqual(responses.map(response=>response.status),[202,202,202]);
  const saved=await Promise.all(responses.map(response=>response.json()));
  assert.equal(new Set(saved.map(result=>result.reference)).size,1);assert.equal(records(env).length,1);
  assert.equal(JSON.parse(records(env)[0].payload).message,fixture.message);
  await Promise.all(contexts.flatMap(ctx=>ctx.promises));assert.equal(contexts.flatMap(ctx=>ctx.promises).length,1);assertRateCharges(env,1);
 }finally{release();db.sqlite.close();}
});

test('newline compatibility does not merge literal escape sequences or differences in other fields',async()=>{
 const env=environment(),ctx=context();
 try{
  const variants=[fixture,{...fixture,message:fixture.message.replaceAll('\n','\\r\\n')},{...fixture,business:'A different synthetic studio'}];
  const references=[];
  for(const value of variants){const response=await worker.fetch(request(value),env,ctx);assert.equal(response.status,202);references.push((await response.json()).reference);}
  await Promise.all(ctx.promises);assert.equal(new Set(references).size,3);assert.equal(records(env).length,3);
  const retry=await worker.fetch(request(fixture,{native:true}),env,ctx);assert.equal(retry.status,202);assert.equal((await retry.json()).reference,references[0]);assertRateCharges(env,3);
 }finally{env.DB.sqlite.close();}
});

test('fixed review checkouts keep the website constraint while native correction permits a service change without a website',async()=>{
 for(const service of ['website_baseline','audit_fix_sprint'])for(const nextService of ['launch_site','unsure']){
  const env=environment(),ctx=context();
  try{
   const fixed=inquiryFormMarkup({live:false},{checkout:true,service});
   assert.match(fixed.match(/<input id="website"[^>]*>/)[0],/\brequired\b/);
   const proposal={...fixture,service,request_kind:'checkout'};
   const response=await worker.fetch(request(proposal,{native:true,html:true}),env,ctx);assert.equal(response.status,422);
   const html=await response.text();assert.doesNotMatch(html,/<script\b/);assert.match(html,/<select id="service"/);
   assert.doesNotMatch(html.match(/<input id="website"[^>]*>/)[0],/\brequired\b/);
   assert.match(html,/For a Website Baseline or Audit &amp; Fix Sprint proposal, add the public website address to review/);
   assert.match(html,/For other services, a website or social page is optional/);
   assert.match(html,/Website or social page: Please add a public website address/);
   const restored=nativeFields(html);restored.service=nextService;
   assert.equal(restored.website,'');assert.equal(restored.request_kind,'checkout');assert.deepEqual(validateInquiry(restored).errors,{});
   const corrected=await worker.fetch(request(restored,{native:true}),env,ctx);assert.equal(corrected.status,202);await Promise.all(ctx.promises);
   const saved=JSON.parse(records(env)[0].payload);assert.equal(saved.service,nextService);assert.equal(saved.website,'');
  }finally{env.DB.sqlite.close();}
 }
});
