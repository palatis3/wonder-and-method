// Read-only checks of every rendered outbound anchor, including source links.
import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parse} from 'parse5';
import {filesUnder} from './ci-files.mjs';
const root=resolve(import.meta.dirname,'..'),pause=ms=>new Promise(done=>setTimeout(done,ms));
const redirectCodes=new Set([301,302,303,307,308]);

export function outboundLinks(html,pageUrl){
 const links=[],base=new URL(pageUrl);
 function walk(node){
  if(['a','area'].includes(node.tagName)){
   const raw=node.attrs?.find(attr=>attr.name==='href')?.value;
   if(raw&&!/^(?:mailto:|tel:|sms:|#)/i.test(raw)){
    try{const url=new URL(raw,base);url.hash='';if(url.origin!==base.origin)links.push({url:url.href,raw});}
    catch{links.push({url:raw,raw,invalid:true});}
   }
  }
  for(const child of node.childNodes||[])walk(child);
 }
 walk(parse(html));return links;
}

function checkTarget(raw){
 const url=new URL(raw);
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('Unsupported protocol or embedded credentials');
 const host=url.hostname.toLowerCase();
 if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||!host.includes('.')||/^\[|^(?:127|10|0)\.|^192\.168\.|^169\.254\.|^172\.(?:1[6-9]|2\d|3[01])\./.test(host))throw Error('Non-public link destination');
 return url;
}

export async function probeLink(url,{fetcher=fetch,sleep=pause,deadline=Date.now()+45_000}={}){
 const attempts=[];
 for(let attempt=0;attempt<2;attempt++){
  const chain=[],seen=new Set();let current=url,result='unverified',issue=null,status=null;
  try{
   while(true){
    let target;try{target=checkTarget(current);}catch(error){result='broken';issue=error.message;break;}
    if(seen.has(target.href)){result='broken';issue='Redirect loop';break;}
    seen.add(target.href);
    const remaining=deadline-Date.now();if(remaining<=0)throw Error('Link check time budget expired');
    const response=await fetcher(target,{redirect:'manual',signal:AbortSignal.timeout(Math.min(10_000,remaining)),headers:{'User-Agent':'WonderAndMethodLinkCheck/1.0'}});
    status=response.status;const location=response.headers.get('location');await response.body?.cancel();
    chain.push({url:target.href,status,...(location?{location}:{})});
    if(redirectCodes.has(status)){
     if(!location){result='broken';issue='Redirect without Location';break;}
     if(chain.length>5){result='broken';issue='More than five redirects';break;}
     try{current=new URL(location,target).href;}catch{result='broken';issue='Invalid redirect destination';break;}
     continue;
    }
    if(status>=200&&status<300){
     result='reachable';
     if(chain.some((hop,index)=>index>0&&hop.url.startsWith('http:')&&chain[index-1].url.startsWith('https:'))){result='broken';issue='Redirect drops HTTPS';}
    }else if(status>=400&&status<500&&![401,403,408,425,429].includes(status)){result='broken';issue='HTTP '+status;}
    else issue='Access or server response requires manual verification';
    break;
   }
  }catch(error){issue=error.name==='TimeoutError'?'Request timed out':error.message+(error.cause?.code?' ('+error.cause.code+')':'');}
  attempts.push({result,issue,status,finalUrl:current,chain});
  if(result==='reachable'||[401,403,429].includes(status))break;
  if(attempt===0&&deadline-Date.now()>400)await sleep(350);else break;
 }
 const last=attempts.at(-1),confirmed=attempts.length===2&&attempts.every(row=>row.result==='broken'&&row.issue===last.issue);
 const result=last.result==='reachable'?'reachable':confirmed?'broken':'unverified';
 const warnings=[];
 if(last.chain.length>3)warnings.push('More than two redirects');
 try{if(new URL(last.finalUrl).hostname!==new URL(url).hostname)warnings.push('Destination host changed');}catch{}
 if(url.startsWith('http:'))warnings.push('Original link uses HTTP');
 return {url,result,issue:last.issue,status:last.status,finalUrl:last.finalUrl,redirects:Math.max(0,last.chain.length-1),warnings,attempts};
}

export async function collectLinkInventory(directory,origin){
 const inventory=new Map();let pages=0;
 for(const file of await filesUnder(directory)){
  if(!file.endsWith('.html'))continue;pages++;
  const path='/'+relative(directory,file).split(sep).join('/').replace(/index\.html$/,'');
  for(const link of outboundLinks(await readFile(file,'utf8'),new URL(path,origin))){
   const row=inventory.get(link.url)||{url:link.url,pages:new Set()};row.pages.add(path);inventory.set(link.url,row);
  }
 }
 return {pages,links:[...inventory.values()].map(row=>({...row,pages:[...row.pages].sort()})).sort((a,b)=>a.url.localeCompare(b.url))};
}

async function main(){
 const args=process.argv.slice(2),secondsIndex=args.indexOf('--max-seconds'),maxSeconds=secondsIndex<0?1200:Number(args[secondsIndex+1]);
 if(!Number.isInteger(maxSeconds)||maxSeconds<1||maxSeconds>2400)throw Error('--max-seconds must be 1–2400.');
 const config=JSON.parse(await readFile(resolve(root,'config/site.json'),'utf8'));
 const inventory=await collectLinkInventory(resolve(root,'dist'),config.origin);
 if(!inventory.pages||!inventory.links.length)throw Error('No rendered link inventory. Build first.');
 const output=resolve(root,'output/ci/links');await mkdir(output,{recursive:true});
 await writeFile(resolve(output,'inventory.json'),JSON.stringify(inventory,null,2)+'\n');
 console.log(`Outbound inventory: ${inventory.links.length} unique links across ${inventory.pages} HTML documents.`);
 if(args.includes('--inventory-only'))return;
 const started=Date.now(),deadline=started+maxSeconds*1000,queue=[...inventory.links],hosts=new Set(),results=[];
 await Promise.all(Array.from({length:8},async()=>{
  while(queue.length&&Date.now()<deadline){
   const hostname=row=>{try{return new URL(row.url).hostname;}catch{return row.url;}};
   const index=queue.findIndex(row=>!hosts.has(hostname(row)));if(index<0){await pause(50);continue;}
   const row=queue.splice(index,1)[0],host=hostname(row);hosts.add(host);
   try{
    results.push({...await probeLink(row.url,{deadline:Math.min(deadline,Date.now()+45_000)}),pages:row.pages});
    if(results.length%100===0)console.log(`Checked ${results.length}/${inventory.links.length} outbound links.`);
    await pause(Math.min(200,Math.max(0,deadline-Date.now())));
   }finally{hosts.delete(host);}
  }
 }));
 for(const row of queue)results.push({...row,result:'unverified',issue:'Not checked before the total time budget expired',attempts:[]});
 results.sort((a,b)=>a.url.localeCompare(b.url));
 const counts=Object.fromEntries(['reachable','broken','unverified'].map(key=>[key,results.filter(row=>row.result===key).length]));
 const report={schemaVersion:1,checkedAt:new Date().toISOString(),pages:inventory.pages,total:results.length,maxSeconds,elapsedSeconds:Math.round((Date.now()-started)/1000),counts,redirected:results.filter(row=>row.redirects>0).length,results,limits:'GET requests without credentials; rendered outbound anchors only. All source pages and redirect hops retained. Two consistent observations are required to fail on broken links. Blocked access, rate limits, transport errors and unfinished checks are unverified. HTTP success does not prove source accuracy, detect all soft 404/challenge pages, or validate external fragments. Local files/fragments and historical redirects have separate technical gates.'};
 await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 const escape=value=>String(value??'').replace(/[|\n\r]/g,' ');
 const problems=results.filter(row=>row.result==='broken'),unverified=results.filter(row=>row.result==='unverified');
 let summary=`# Outbound links\n\n${results.length} unique links on ${inventory.pages} documents: ${counts.reachable} reachable, ${counts.broken} confirmed broken, ${counts.unverified} unverified; ${report.redirected} redirect.\n\n`;
 for(const [label,rows] of [['Confirmed problems',problems],['Unverified access',unverified]]){
  summary+=`## ${label}\n\n| Link | Result | Example page |\n| --- | --- | --- |\n`;
  for(const row of rows.slice(0,50))summary+=`| ${escape(row.url)} | ${escape(row.issue)} | ${escape(row.pages[0])} |\n`;
  summary+='\n';
 }
 summary+='## Redirect review\n\n| Original link | Final destination | Hops | Notes |\n| --- | --- | --- | --- |\n';
 for(const row of results.filter(row=>row.redirects>0||row.warnings?.length).slice(0,100))summary+=`| ${escape(row.url)} | ${escape(row.finalUrl)} | ${row.redirects} | ${escape(row.warnings.join('; ')||'Redirect reached its destination')} |\n`;
 summary+='\n';
 summary+='Download the `outbound-links` artifact for every URL, affected page, redirect hop, and warning. '+report.limits+'\n';
 await writeFile(resolve(output,'report.md'),summary);if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,summary);
 console.log(JSON.stringify({total:report.total,...counts,redirected:report.redirected,elapsedSeconds:report.elapsedSeconds}));
 if(counts.broken)throw Error('Confirmed broken outbound links or unsafe redirects require review; see output/ci/links/report.md.');
 // An uncompleted inventory must not silently certify the whole site.
 if(queue.length)throw Error(`${queue.length} links were not checked within the time budget; increase the budget or investigate slow hosts.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
