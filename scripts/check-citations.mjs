// Opt-in network check. A blocked/time-out response is unverified, not a dead link.
import {countyGeography} from '../src/county-geography.mjs';
const urls=[...new Set(Object.values(countyGeography).flatMap(c=>[...c.sources,...c.communities.map(x=>x.source)]))];
const results=[];
for(let start=0;start<urls.length;start+=4){
 results.push(...await Promise.all(urls.slice(start,start+4).map(async url=>{
  try{const response=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'WonderAndMethodCitationCheck/1.0'}});await response.body?.cancel();return {url,status:response.status,result:response.ok?'reachable':[404,410].includes(response.status)?'missing':'unverified'};}
  catch{return {url,result:'unverified'};}
 })));
}
console.log(JSON.stringify({checkedAt:new Date().toISOString(),results},null,2));
if(results.some(x=>x.result==='missing'))process.exitCode=1;
