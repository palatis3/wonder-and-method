import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import worker from '../deployment/worker.mjs';
import {markupFindings,locationCopyFindings,relatedGuideFindings,historicalFragmentFindings,assertHistoricalDestination,assertHistoricalHtml} from './site-quality-rules.mjs';

const root=resolve(import.meta.dirname,'..'),dist=resolve(root,'dist');
const readJson=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
const [build,config,entries,routeContract,fragmentContract,guideReview]=await Promise.all([
 'evidence/build.json','config/site.json','src/location-service-data.json','tests/fixtures/historical-route-contract.json',
 'tests/fixtures/historical-fragment-contract.json','operations/google-quality-audit-20261023/related-guide-review.json'
].map(readJson));
assert.equal(routeContract.origin,config.origin,'Historical-route contract must name the actual public origin.');
assert.equal(routeContract.version,1);assert.equal(fragmentContract.version,1);
const htmlByPath=new Map(await Promise.all(build.routes.map(async path=>[path,await readFile(resolve(dist,'.'+path,'index.html'),'utf8')])));
const findings=[];
for(const [path,html] of htmlByPath)findings.push(...markupFindings(path,html));
for(const entry of entries)findings.push(...locationCopyFindings(entry));
findings.push(...relatedGuideFindings(entries,guideReview,htmlByPath));
findings.push(...historicalFragmentFindings(fragmentContract.routes.map(row=>({...row,fragments:row.retainedIds})),htmlByPath));

// Exercise the actual Worker without remote requests, credentials or writes.
// The asset binding reads this build, rather than returning an unconditional 200.
const cache=new Map();
const env={ENVIRONMENT:'production',RELEASE_APPROVED:'true',SEARCH_INDEXING:'true',PUBLIC_ORIGIN:config.origin,ASSETS:{async fetch(request){
 const path=new URL(request.url).pathname;
 if(!cache.has(path)){
  let html=htmlByPath.get(path),type='text/html; charset=utf-8',status=200;
  if(html===undefined){
   const target=resolve(dist,'.'+decodeURIComponent(path));
   if(target!==dist&&!target.startsWith(dist+sep))throw Error('Asset path escapes the build: '+path);
   try{html=await readFile(target);type=path.endsWith('.csv')?'text/csv; charset=utf-8':'application/octet-stream';}
   catch{try{html=await readFile(target+'.html');}catch{html='Not found.';type='text/plain; charset=utf-8';status=404;}}
  }
  cache.set(path,{html,type,status});
 }
 const {html,type,status}=cache.get(path);
 return new Response(request.method==='HEAD'?null:html,{status,headers:{'Content-Type':type}});
}}};

function variantUrl(row,variant){
 let path=row.from,origin=config.origin,method='GET';
 if(variant==='head')method='HEAD';
 else if(variant==='www')origin=config.origin.replace('://','://www.');
 else if(variant==='http')origin=config.origin.replace('https:','http:');
 else if(variant==='no-slash')path=path.replace(/\/$/,'');
 else if(variant==='html')path=path.replace(/\/$/,'')+'.html';
 else if(variant==='index-html')path+='index.html';
 else if(variant==='index')path+='index';
 else if(variant==='uppercase')path=path.toUpperCase();
 else if(variant==='double-slash')path=path.replace('/areas/','/areas//');
 else if(variant==='unreserved-escape')path=path.replace(/[A-Za-z]/,letter=>'%'+letter.charCodeAt(0).toString(16));
 else assert.equal(variant,'exact','Unknown historical-route variant.');
 return {url:origin+path+routeContract.query,method};
}

let routeChecks=0,maxRedirects=0;
for(const row of routeContract.routes){
 const variants=row.from.startsWith('/assets/')?routeContract.assetAliasVariants:routeContract.pageVariants;
 for(const variant of variants){
  const initial=variantUrl(row,variant),seen=new Set();let url=initial.url,redirects=0,response;
  try{
   while(true){
    assert.ok(!seen.has(url),'Redirect loop');seen.add(url);
    response=await worker.fetch(new Request(url,{method:initial.method}),env,{});
    if(response.status<300||response.status>=400)break;
    assert.equal(response.status,308,'Worker redirects must be permanent');
    const location=response.headers.get('Location');assert.ok(location,'Redirect needs a destination');
    const target=new URL(location,url);assert.equal(target.origin,config.origin,'Redirect leaves the canonical origin');
    assert.equal(target.search,routeContract.query,'Redirect changed the exact query');
    url=target.href;await response.body?.cancel();redirects++;
    assert.ok(redirects<=1,'Known aliases must reach their final destination in one Worker hop');
   }
   assert.equal(response.status,200,'Historical route must reach a live destination');
   const final=new URL(url),expected=new URL(row.to,config.origin);
   assertHistoricalDestination(final,expected,routeContract.query);
   if(!row.to.endsWith('.csv')){
    const headHtml=initial.method==='HEAD'?(htmlByPath.get(expected.pathname)||String(cache.get(expected.pathname)?.html||'')):undefined;
    await assertHistoricalHtml(response,{method:initial.method,headHtml,expected,areaName:row.areaName,state:row.state});
   }else await response.body?.cancel();
   maxRedirects=Math.max(maxRedirects,redirects);
  }catch(error){await response?.body?.cancel().catch(()=>{});findings.push({path:row.from,rule:'historic-route',detail:`${variant}: ${error.message}`});}
  routeChecks++;
 }
}
for(const path of routeContract.unknownPaths)for(const method of ['GET','HEAD']){
 const response=await worker.fetch(new Request(config.origin+path,{method}),env,{});
 if(response.status!==404||!/noindex/.test(response.headers.get('X-Robots-Tag')||''))findings.push({path,rule:'unknown-route',detail:`${method}: unknown routes must return an actual 404 with noindex.`});
 await response.body?.cancel();routeChecks++;
}
const result={checkedAt:new Date().toISOString(),status:findings.length?'fail':'pass',pages:htmlByPath.size,locationRecords:entries.length,reviewedGuideConnections:guideReview.length,historicalRoutes:routeContract.routes.length,routeChecks,maxWorkerRedirects:maxRedirects,historicalFragmentTargets:fragmentContract.routes.reduce((sum,row)=>sum+row.retainedIds.length,0),findings,limits:'Deterministic regression checks for markup, source-record structure, known scope ambiguity, reviewed contextual-link associations and historical routing. Not factual source verification, an editorial quality score, Google approval, or a guarantee of indexing/rankings.'};
await mkdir(resolve(root,'evidence'),{recursive:true});await writeFile(resolve(root,'evidence/site-quality.json'),JSON.stringify(result,null,2)+'\n');
console.log(`Site quality: ${result.status}; ${result.pages} pages, ${routeChecks} route checks, ${result.historicalFragmentTargets} historical fragment targets, ${findings.length} findings.`);
for(const finding of findings.slice(0,20))console.error(`${finding.rule}: ${finding.path}: ${finding.detail}`);
if(findings.length){console.error('Full findings: evidence/site-quality.json');process.exitCode=1;}
