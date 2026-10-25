import test from 'node:test';
import assert from 'node:assert/strict';
import {validateInquiry,validCallbackPhone} from '../src/inquiry.mjs';
import {inquiryConfirmationHtml} from '../src/inquiry-confirmation.mjs';
import {inquiryResponseHtml} from '../src/inquiry-response.mjs';
import {inquiryFormMarkup} from '../src/inquiry-form.mjs';
import {selectedInquiryContext} from '../src/shared.mjs';
const fixture={name:'Synthetic Person',email:'fixture@example.test',service:'launch_site',message:'Please discuss a website project.'};
test('email default preserves legacy normalized payload and discards unsolicited phone data',()=>{
 const expected=validateInquiry(fixture).value;
 for(const input of [{reply_preference:'email',callback_phone:'+1 202 555 0100'},{callback_phone:'secret string'},{reply_preference:'',email_receipt:''}]){
  const result=validateInquiry({...fixture,...input});assert.deepEqual(result.errors,{});assert.deepEqual(result.value,expected);
 }
});
test('callback numbers and explicit email reference consent have bounded validation',()=>{
 for(const phone of ['202-555-0100','+44 (20) 7946 0000','202 555 0100 ext. 123','2025550100 x12'])assert.equal(validCallbackPhone(phone),true,phone);
 for(const phone of ['123','1'.repeat(16),'2025550100 ext 1234567','call-me','2025550100\nBcc:other@example.test','<script>2025550100</script>'])assert.equal(validCallbackPhone(phone),false,phone);
 const result=validateInquiry({...fixture,reply_preference:'callback',callback_phone:' +1 202 555 0100 ',email_receipt:'requested'});
 assert.deepEqual(result.errors,{});assert.equal(result.value.callback_phone,'+1 202 555 0100');assert.equal(result.value.reply_preference,'callback');assert.equal(result.value.email_receipt,'requested');
 for(const input of [{reply_preference:'callback'},{reply_preference:'sms'},{email_receipt:true},{email_receipt:'yes'}])assert.ok(Object.keys(validateInquiry({...fixture,...input}).errors).length);
 assert.ok(!('callback_phone' in selectedInquiryContext(result.value)));
});
test('receipt acknowledges requested callback and optional email without exposing phone',()=>{
 const data={...fixture,reference:'abcdef12-3456-4000-8000-000000000001',reply_preference:'callback',callback_phone:'+1 202 555 0100',email_receipt:'requested'};
 for(const html of [inquiryConfirmationHtml(data),inquiryResponseHtml(data)]){
  assert.match(html,/requested a callback/);assert.match(html,/may email first/);assert.match(html,/requested an email with your reference/);assert.match(html,/may be delayed or unavailable/);assert.doesNotMatch(html,/202 555 0100|No automatic confirmation email is sent/);
 }
 assert.match(inquiryConfirmationHtml({...data,email_receipt:undefined,reply_preference:undefined}),/No automatic confirmation email is sent/);
});
test('native stale-choice recovery preserves private POST entries and provides corrected controls',()=>{
 const input={...fixture,request_kind:'retired-kind',county:'unknown-county',reply_preference:'callback',callback_phone:'+1 202 555 0100',email_receipt:'requested'};
 const {errors,value}=validateInquiry(input);assert.ok(errors.request_kind&&errors.county);
 const html=inquiryResponseHtml({status:422,message:'Review current choices.',errors,service:value.service,...selectedInquiryContext(value),retry:value});
 assert.match(html,/Unavailable or invalid choices have been cleared/);assert.match(html,/value="\+1 202 555 0100"/);assert.match(html,/name="email_receipt"[^>]* checked/);assert.match(html,/Please discuss a website project/);
 assert.doesNotMatch(html,/value="retired-kind"|value="unknown-county"/);
 for(const href of html.matchAll(/href="([^"]*)"/g))assert.doesNotMatch(href[1],/202|fixture%40|Synthetic|Please/);
 const defaults=inquiryFormMarkup({live:true});assert.doesNotMatch(defaults,/name="email_receipt"[^>]* checked/);
});
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import worker,{notifyInquiry} from '../deployment/worker.mjs';
const migrationDir=new URL('../deployment/migrations/',import.meta.url);
const migrationSql=(await Promise.all((await readdir(migrationDir)).filter(n=>n.endsWith('.sql')).sort().map(n=>readFile(new URL(n,migrationDir),'utf8')))).join('\n');
function database(t){const sqlite=new DatabaseSync(':memory:');sqlite.exec(migrationSql);t.after(()=>sqlite.close());return {sqlite,prepare(sql){const bind=values=>({bind:(...args)=>bind(args),async first(){return sqlite.prepare(sql).get(...values)??null;},async all(){return {results:sqlite.prepare(sql).all(...values)};},async run(){return {meta:sqlite.prepare(sql).run(...values)};}});return bind([]);}};}
const environment=db=>({DB:db,ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',FINGERPRINT_SECRET:'synthetic-only-secret-more-than-thirty-two-characters'});
const context=()=>({promises:[],waitUntil(p){this.promises.push(p);}});
const request=(data,{native=false,html=false}={})=>new Request('https://example.test/api/inquiries',{method:'POST',headers:{Origin:'https://example.test','Content-Type':native?'application/x-www-form-urlencoded':'application/json',Accept:html?'text/html':'application/json','CF-Connecting-IP':'192.0.2.99'},body:native?new URLSearchParams(data).toString():JSON.stringify(data)});
test('worker rejects unreadable JSON shapes with400 and no false saved or retained claim',async t=>{
 const db=database(t),env=environment(db),ctx=context();
 for(const data of [null,[],['name','value'],'text',42,false]){
  const response=await worker.fetch(request(data,{html:true}),env,ctx);assert.equal(response.status,400);const html=await response.text();assert.match(html,/could not be read/);assert.doesNotMatch(html,/Your entries are kept|inquiry-confirmation|<form /);
 }
 assert.equal(db.sqlite.prepare('SELECT count(*) n FROM inquiries').get().n,0);assert.equal(ctx.promises.length,0);
});
test('native and JSON callbacks save privately, return reference choices and notify only the owner with phone',async t=>{
 const input={...fixture,reply_preference:'callback',callback_phone:'+1 202 555 0100',email_receipt:'requested'},sent=[];
 for(const native of [false,true]){
  const db=database(t),env=environment(db),ctx=context();
  const response=await worker.fetch(request(input,{native,html:native}),env,ctx);assert.equal(response.status,202);await Promise.all(ctx.promises);
  const row=db.sqlite.prepare('SELECT id,payload FROM inquiries').get(),value=JSON.parse(row.payload);assert.equal(value.callback_phone,input.callback_phone);assert.equal(value.email_receipt,'requested');
  const receipt=await response.text();assert.doesNotMatch(receipt,/202 555 0100/);assert.match(receipt,native?/requested a callback/:/"reply_preference":"callback"/);
  const notification=await notifyInquiry({...env,RESEND_API_KEY:'synthetic-only',NOTIFICATION_FROM:'sender@example.test',NOTIFICATION_TO:'owner@example.test'},row.id,async(_url,options)=>{sent.push(JSON.parse(options.body));return Response.json({id:'synthetic-provider'});});assert.equal(notification.sent,true);
 }
 assert.equal(sent.length,2);for(const message of sent){assert.deepEqual(message.to,['owner@example.test']);assert.match(message.text,/Callback requested/);assert.match(message.text,/Callback number \(visitor supplied\): \+1 202 555 0100/);}
});
test('native callback rejection preserves number and email consent without pretending the request was saved',async t=>{
 const db=database(t),ctx=context();const response=await worker.fetch(request({...fixture,reply_preference:'callback',callback_phone:'123',email_receipt:'requested'},{native:true,html:true}),environment(db),ctx);
 assert.equal(response.status,422);const html=await response.text();assert.match(html,/Your message has not been saved/);assert.match(html,/data-callback-choice open/);assert.match(html,/value="123"/);assert.match(html,/id="callback_phone-error"[^>]*>Add a phone number/);assert.equal(db.sqlite.prepare('SELECT count(*) n FROM inquiries').get().n,0);
});
