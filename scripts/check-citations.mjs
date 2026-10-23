// Opt-in, read-only network review. HTTP reachability does not verify a claim.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {countyGeography} from '../src/county-geography.mjs';

const root=resolve(import.meta.dirname,'..');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export const businessCitationUrls=records=>[...new Set(records.flatMap(record=>(record.sources||[]).map(source=>source.url)))].sort();
export function changedCitationUrls(current,previous){
 const old=new Set(previous.flatMap(record=>(record.sources||[]).map(source=>JSON.stringify(source))));
 return [...new Set(current.flatMap(record=>(record.sources||[]).filter(source=>!old.has(JSON.stringify(source))).map(source=>source.url)))].sort();
}

export async function probeCitation(url,{fetcher=fetch,deadline=Date.now()+30_000,pause=sleep}={}){
 const checkedAt=new Date().toISOString(),attempts=[];
 for(let attempt=0;attempt<2;attempt++){
  let finalUrl=url,hops=0,status,reason,retryAfter;
  try{
   while(true){
    const remaining=deadline-Date.now();if(remaining<=0)throw Error('Review time budget exhausted');
    const target=new URL(finalUrl);if(!['https:','http:'].includes(target.protocol)||target.username||target.password)throw Error('Unsupported citation URL');
    const response=await fetcher(target,{redirect:'manual',signal:AbortSignal.timeout(Math.min(12000,remaining)),headers:{'User-Agent':'WonderAndMethodCitationCheck/2.0'}});
    status=response.status;retryAfter=response.headers.get('Retry-After');const location=response.headers.get('Location');await response.body?.cancel();
    if([301,302,303,307,308].includes(status)&&location){
     if(++hops>5)throw Error('More than five citation redirects');
     finalUrl=new URL(location,finalUrl).href;continue;
    }
    break;
   }
  }catch(error){reason=error.name==='TimeoutError'?'Request timed out':error.message;}
  attempts.push({status:status??null,finalUrl,redirects:hops,reason:reason||null,...(retryAfter?{retryAfter}:{})});
  if(!reason&&status>=200&&status<300)return {url,checkedAt,result:'reachable',status,finalUrl,attempts};
  // A rate limit is a reason to stop, not to immediately retry the same host.
  const retryable=reason||[404,410].includes(status)||status>=500;
  if(!retryable||attempt===1||deadline-Date.now()<500)break;
  await pause(350);
 }
 const last=attempts.at(-1),missing=attempts.length===2&&attempts.every(item=>!item.reason&&[404,410].includes(item.status));
 return {url,checkedAt,result:missing?'missing':'unverified',status:last.status,finalUrl:last.finalUrl,attempts};
}

async function main(){
 const args=process.argv.slice(2),value=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
 const scope=value('--scope','geography'),base=value('--changed-since',null),reportOnly=args.includes('--report-only');
 if(!['geography','business','all'].includes(scope))throw Error('--scope must be geography, business or all.');
 const maxSeconds=Number(value('--max-seconds','900'));if(!Number.isInteger(maxSeconds)||maxSeconds<1||maxSeconds>3600)throw Error('--max-seconds must be 1–3600.');
 const current=JSON.parse(await readFile(resolve(root,'src/location-service-data.json'),'utf8'));
 const geography=[...new Set(Object.values(countyGeography).flatMap(record=>[...record.sources,...record.communities.map(place=>place.source)]))];
 let urls=scope==='geography'?geography:scope==='business'?businessCitationUrls(current):[...new Set([...geography,...businessCitationUrls(current)])];
 if(base){
  if(!/^[\w./~^+-]+$/.test(base)||base.startsWith('-'))throw Error('Use an ordinary Git ref for --changed-since.');
  const previous=JSON.parse(execFileSync('git',['show',base+':src/location-service-data.json'],{cwd:root,encoding:'utf8',maxBuffer:24*1024*1024}));
  urls=changedCitationUrls(current,previous);
 }
 urls.sort();const began=Date.now(),deadline=began+maxSeconds*1000,queue=[...urls],busyHosts=new Set(),results=[];
 if(reportOnly)for(const url of urls)results.push({url,result:'not-checked'});
 else await Promise.all(Array.from({length:4},async()=>{
  while(queue.length&&Date.now()<deadline){
   const index=queue.findIndex(url=>!busyHosts.has(new URL(url).hostname));
   if(index<0){await sleep(50);continue;}
   const url=queue.splice(index,1)[0],host=new URL(url).hostname;busyHosts.add(host);
   try{results.push(await probeCitation(url,{deadline}));await sleep(Math.min(250,Math.max(0,deadline-Date.now())));}
   finally{busyHosts.delete(host);}
  }
 }));
 if(!reportOnly)for(const url of queue)results.push({url,result:'unverified',reason:'Not requested before the total review time budget expired.'});
 results.sort((a,b)=>a.url.localeCompare(b.url));
 const counts=Object.fromEntries(['reachable','missing','unverified','not-checked'].map(key=>[key,results.filter(row=>row.result===key).length]));
 const report={schemaVersion:1,checkedAt:new Date().toISOString(),scope:base?'changed business source records':scope,base,reportOnly,maxSeconds,elapsedSeconds:Math.round((Date.now()-began)/1000),counts,results,limits:'Checks declared business-source URLs and the legacy countyGeography citation inventory, not every external link on the website. Two 404/410 observations flag review; 403, 429, timeouts and server failures remain unverified. HTTP success does not verify attribution, detect every challenge/soft 404, or justify automatic citation removal.'};
 await mkdir(resolve(root,'evidence'),{recursive:true});await writeFile(resolve(root,'evidence/citation-review.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({scope:report.scope,urls:urls.length,...counts,elapsedSeconds:report.elapsedSeconds,report:'evidence/citation-review.json'}));
 if(counts.missing)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
