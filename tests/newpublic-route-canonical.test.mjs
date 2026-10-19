import test from 'node:test';
import assert from 'node:assert/strict';
import {publicRouteRedirect} from '../deployment/public-route-canonical.mjs';
import worker from '../deployment/worker.mjs';
const canonical='https://wonderandmethod.com';
test('known page variants combine canonical origin and path in one redirect preserving raw query',async()=>{
 const variants=[['/Pricing','/pricing/'],['//%70ricing//','/pricing/'],['/services/Web-Design//','/services/web-design/'],['/pricing//','/pricing/'],['/pricing/index/','/pricing/'],['/pricing/index.html','/pricing/'],['/INDEX','/'],['/services','/services/'],['/work/content-editor/','/work/source-handoff/']];
 for(const method of ['GET','HEAD'])for(const [path,target] of variants){
  const query='?x=%2f&x=two+words&Case=KEEP%20ME';let assets=0;
  const response=await worker.fetch(new Request('https://www.wonderandmethod.com'+path+query,{method}),{ENVIRONMENT:'production',RELEASE_APPROVED:'true',PUBLIC_ORIGIN:canonical,ASSETS:{fetch:async()=>{assets++;return new Response('unexpected');}}},{});
  assert.equal(response.status,308,path);assert.equal(response.headers.get('Location'),canonical+target+query);assert.equal(assets,0);
  assert.equal(publicRouteRedirect(new URL(response.headers.get('Location')),method,canonical),null);
  assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
 }
});
test('unknown paths, reserved escapes, asset case, API paths and POST requests are isolated',()=>{
 for(const path of ['/Not-Known//','/assets/Brand/Logo.PNG','/assets/%6cogo.PNG','/services%2Fweb-design/','/pricing%3Fignored/']){
  assert.equal(publicRouteRedirect(new URL(canonical+path),'GET',canonical),null,path);
  assert.equal(publicRouteRedirect(new URL('https://www.wonderandmethod.com'+path),'GET',canonical),canonical+path);
 }
 for(const path of ['/api/operator/PRIVATE-Key','/api/inquiries','//%61pi//inquiries'])assert.equal(publicRouteRedirect(new URL('https://www.wonderandmethod.com'+path),'GET',canonical),null);
 for(const method of ['POST','PUT','DELETE','OPTIONS'])assert.equal(publicRouteRedirect(new URL('https://www.wonderandmethod.com/Pricing//'),method,canonical),null);
});
test('canonical services overview reaches its own asset and staging auth still precedes redirects',async()=>{
 const seen=[],env={ENVIRONMENT:'production',RELEASE_APPROVED:'true',PUBLIC_ORIGIN:canonical,ASSETS:{fetch:async request=>{seen.push(new URL(request.url).pathname);return new Response('<h1>Services overview</h1>');}}};
 const response=await worker.fetch(new Request(canonical+'/services/'),env,{});assert.equal(response.status,200);assert.deepEqual(seen,['/services/']);assert.match(await response.text(),/Services overview/);
 const denied=await worker.fetch(new Request('https://www.wonderandmethod.com/Pricing'),{...env,ENVIRONMENT:'staging',STAGING_AUTH:'synthetic:only'},{});assert.equal(denied.status,401);assert.equal(denied.headers.get('Location'),null);
 const api=await worker.fetch(new Request('https://www.wonderandmethod.com/api/unknown'),env,{});assert.equal(api.status,404);assert.equal(api.headers.get('Location'),null);
});
