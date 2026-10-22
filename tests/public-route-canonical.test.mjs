import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {publicRouteRedirect} from '../deployment/public-route-canonical.mjs';
import {retiredCountyRoutes} from '../deployment/retired-county-routes.mjs';
import {createServer} from '../scripts/server.mjs';
import worker from '../deployment/worker.mjs';

const origin='https://wonderandmethod.com';
const query='?county=legacy%2Fvalue&x=%2f&x=two+words&Case=KEEP%20ME';
const destination=(target,base=origin)=>base+target.replace('#',query+'#');
const variants=path=>[path,path.slice(0,-1),path.slice(0,-1)+'.html',path.slice(0,-1)+'.html/',path+'index',path+'index.html',path.toUpperCase().replaceAll('/','//')+'INDEX.HTML/',path.replace('/areas/','/%61reas/')];
const environment=fetch=>({ENVIRONMENT:'production',RELEASE_APPROVED:'true',PUBLIC_ORIGIN:origin,ASSETS:{fetch}});

test('every retired county route and alias redirects once with raw query before its directory fragment',async()=>{
 let assets=0;
 const env=environment(async()=>{assets++;return new Response('Unexpected asset request');});
 for(const [path,target] of Object.entries(retiredCountyRoutes)){
  for(const method of ['GET','HEAD'])for(const variant of variants(path)){
   const url=new URL('http://www.wonderandmethod.com'+variant+query+'#coverage');
   assert.equal(publicRouteRedirect(url,method,origin),destination(target),variant);
  }
  // Exercise the real Worker boundary for both methods, including security
  // headers and avoiding a fetch of the removed static page.
  for(const method of ['GET','HEAD']){
   const response=await worker.fetch(new Request('http://www.wonderandmethod.com'+path+query,{method}),env,{});
   assert.equal(response.status,308,path);
   assert.equal(response.headers.get('Location'),destination(target),path);
   assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
   assert.equal(await response.text(),'');
   assert.equal(publicRouteRedirect(new URL(response.headers.get('Location')),method,origin),null,path);
  }
  assert.equal(publicRouteRedirect(new URL(origin+path),'GET',origin),origin+target,path);
  assert.equal(publicRouteRedirect(new URL('https://preview.example.test'+path+query),'GET'),destination(target,'https://preview.example.test'),path);
 }
 assert.equal(assets,0);
});

test('all 62 historic New York prefixed aliases remain direct and Buffalo stays a page',()=>{
 const aliases=[['/areas/erie-county/','/areas/erie-county/'],...Object.entries(retiredCountyRoutes).filter(([path])=>/^\/areas\/[^/]+-county\/$/.test(path))];
 assert.equal(aliases.length,62);
 for(const [path,target] of aliases)for(const method of ['GET','HEAD'])for(const variant of variants(path.replace('/areas/','/areas/new-york/'))){
  const expected=target.includes('#')?destination(target):origin+target+query;
  assert.equal(publicRouteRedirect(new URL('http://www.wonderandmethod.com'+variant+query),method,origin),expected,variant);
 }
 assert.equal(publicRouteRedirect(new URL(origin+'/areas/erie-county/'),'GET',origin),null);
});

test('unknown/private paths, legacy downloads and inquiry context retain their routing boundaries',async()=>{
 for(const path of ['/areas/made-up-county/','/areas/new-york/made-up-county/','/areas/virginia/fairfax-county/','/areas/albany-county/extra/','/areas%2Falbany-county/','/assets/county-briefs/new-york-albany.txt','/contact/?county=albany-county&request_kind=question','/version.json','/.well-known/private-key']){
  const url=new URL(origin+path);
  assert.equal(publicRouteRedirect(url,'GET',origin),null,path);
 }
 for(const path of ['/api/inquiries','/api/operator/PRIVATE-Key','//%61PI//operator//PRIVATE-Key'])assert.equal(publicRouteRedirect(new URL('https://www.wonderandmethod.com'+path),'GET',origin),null,path);
 for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS'])for(const path of ['/areas/albany-county/','/areas/new-york/albany-county/'])assert.equal(publicRouteRedirect(new URL('http://www.wonderandmethod.com'+path+query),method,origin),null,method);
 const seen=[],env=environment(async request=>{seen.push(new URL(request.url).pathname);return new Response('fixture');});
 const downloaded=await worker.fetch(new Request(origin+'/assets/county-briefs/new-york-albany.txt'),env,{});
 assert.equal(downloaded.status,200);assert.equal(downloaded.headers.get('Location'),null);
 assert.deepEqual(seen,['/assets/county-briefs/new-york-albany.txt']);
 const denied=await worker.fetch(new Request(origin+'/areas/albany-county/'),{...env,ENVIRONMENT:'staging',STAGING_AUTH:'synthetic:only'},{});
 assert.equal(denied.status,401);assert.equal(denied.headers.get('Location'),null);
 const unknownApi=await worker.fetch(new Request('https://www.wonderandmethod.com/api/unknown'),env,{});
 assert.equal(unknownApi.status,404);assert.equal(unknownApi.headers.get('Location'),null);
});

test('native browser-test server serves the same county redirects without a generated retired page',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'wm-retired-routes-'));
 const siteDir=join(directory,'site');
 await mkdir(join(siteDir,'areas','new-york'),{recursive:true});
 await writeFile(join(siteDir,'areas','new-york','index.html'),'<main><details id="albany"><summary>Albany</summary></details></main>');
 const {server,url}=await createServer({runtime:join(directory,'runtime'),siteDir,port:0});
 t.after(async()=>{
  server.closeAllConnections();await new Promise(done=>server.close(done));
  if(!resolve(directory).startsWith(resolve(tmpdir())+sep+'wm-retired-routes-'))throw Error('Unexpected test directory');
  await rm(directory,{recursive:true,force:true});
 });
 for(const [path,target] of Object.entries(retiredCountyRoutes))for(const method of ['GET','HEAD']){
  const response=await fetch(url+path+query,{method,redirect:'manual'});
  assert.equal(response.status,308,path);assert.equal(response.headers.get('Location'),destination(target,url),path);assert.equal(await response.text(),'');
 }
 const followed=await fetch(url+'/areas/new-york/ALBANY-COUNTY/index.html'+query);
 assert.equal(followed.status,200);assert.match(await followed.text(),/id="albany"/);
 const api=await fetch(url+'/api/inquiries',{redirect:'manual'});assert.equal(api.status,405);assert.equal(api.headers.get('Location'),null);
 const mutation=await fetch(url+'/areas/albany-county/',{method:'POST',redirect:'manual'});assert.equal(mutation.status,405);assert.equal(mutation.headers.get('Location'),null);
});
