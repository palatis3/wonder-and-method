import test from 'node:test';
import assert from 'node:assert/strict';
import {testEntry} from '../deployment/form-test-worker.mjs';
import draft from './fixtures/form-delivery-test.json' with {type:'json'};
import {createHash} from 'node:crypto';
const {approval,...content}=draft;
const approved={...content,approval:{approved:true,approvedAt:'2026-10-14',payloadSha256:createHash('sha256').update(JSON.stringify(content)).digest('hex')}};

test('temporary entry is authenticated, exact, time bounded and claimed once across requests',async()=>{
 let now=1000000,claimed=false,claims=0,liveCalls=0;
 const env={ENVIRONMENT:'production',INQUIRY_MODE:'live',RELEASE_APPROVED:'true',STAGING_AUTH:'fake:auth',TEST_START_MS:String(now),TEST_END_MS:String(now+300000),DB:{prepare:()=>({bind:()=>({first:async()=>{claims++;if(claimed)return null;claimed=true;return {key:'test'};}})})}};
 const base={fetch:async(request,actual)=>{assert.equal(actual.ENVIRONMENT,'staging');if(actual.INQUIRY_MODE==='live'){liveCalls++;assert.equal(actual.NOTIFICATION_FROM,draft.from);assert.equal(actual.NOTIFICATION_TO,draft.to[0]);}return new Response(actual.INQUIRY_MODE,{status:200});}};
 const entry=testEntry(base,()=>now,approved);
 const request=(body=JSON.stringify(draft.inquiry),auth='Basic '+btoa(env.STAGING_AUTH))=>new Request(draft.origin+'/api/inquiries',{method:'POST',headers:{Authorization:auth,Origin:draft.origin,'Content-Type':'application/json'},body});
 const ready=await entry.fetch(new Request(draft.origin+'/api/setup-test-readiness',{headers:{Authorization:'Basic '+btoa(env.STAGING_AUTH)}}),{...env,RESEND_API_KEY:'fake-local-test-key'},{});
 assert.equal(ready.status,200);const readiness=await ready.json();assert.equal(readiness.testReference,draft.reference);assert.equal(readiness.ready,true);assert.equal(readiness.approvedPayloadSha256,approved.approval.payloadSha256);assert.equal(claims,0);assert.equal(liveCalls,0);
 assert.equal(await (await entry.fetch(request(undefined,'wrong'),env,{})).text(),'synthetic');assert.equal(claims,0);
 assert.equal((await entry.fetch(request('{}'),env,{})).status,400);assert.equal(claims,0);
 assert.equal(await (await entry.fetch(request(),env,{})).text(),'live');assert.equal(liveCalls,1);
 assert.equal((await entry.fetch(request(),env,{})).status,409);assert.equal(liveCalls,1);
 now+=300000;assert.equal((await entry.fetch(request(),env,{})).status,403);assert.equal(liveCalls,1);
 assert.equal(await (await entry.fetch(new Request(draft.origin+'/api/operator/inquiries/x/retry',{method:'POST'}),env,{})).text(),'synthetic');
});
test('temporary entry rejects invalid or excessive time windows before accessing storage',async()=>{
 const entry=testEntry({fetch:async()=>new Response('synthetic')},()=>1000000,approved);
 for(const [start,end] of [[undefined,undefined],['NaN','NaN'],['1000000','999999999'],['1000001','1300001']]){
  const env={STAGING_AUTH:'fake:auth',TEST_START_MS:start,TEST_END_MS:end,DB:{prepare:()=>{throw Error('Storage must not be accessed');}}};
  const request=new Request(draft.origin+'/api/inquiries',{method:'POST',headers:{Authorization:'Basic '+btoa(env.STAGING_AUTH)},body:'{}'});
  assert.equal((await entry.fetch(request,env,{})).status,403);
 }
});
test('temporary entry refuses missing or changed approval even in an active window',async()=>{
 for(const proposal of [{...draft,approval:{approved:false}},{...approved,scope:'changed'}]){
  const entry=testEntry({fetch:async()=>new Response('synthetic')},()=>1000000,proposal);
  const env={STAGING_AUTH:'fake:auth',TEST_START_MS:'1000000',TEST_END_MS:'1300000',DB:{prepare:()=>{throw Error('Storage must not be accessed');}}};
  const request=new Request(draft.origin+'/api/inquiries',{method:'POST',headers:{Authorization:'Basic '+btoa(env.STAGING_AUTH)},body:JSON.stringify(draft.inquiry)});
  assert.equal((await entry.fetch(request,env,{})).status,403);
 }
});
