import lighthouse from 'lighthouse';
import {launch} from 'chrome-launcher';
import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {createServer} from './server.mjs';
import {validatePerformanceConfig,summarizePerformanceRuns} from './performance-contract.mjs';
const root=resolve(import.meta.dirname,'..'),output=resolve(root,'output/ci/performance');
const config=validatePerformanceConfig(JSON.parse(await readFile(resolve(root,'config/performance-budgets.json'),'utf8')));
await mkdir(output,{recursive:true});
const runtime=await mkdtemp(join(tmpdir(),'wm-performance-')),{server,url}=await createServer({runtime,port:0,compress:true});
const results=[],failures=[];let chrome;
try{
 chrome=await launch({chromePath:chromium.executablePath(),chromeFlags:['--headless','--no-sandbox','--disable-dev-shm-usage'],logLevel:'silent'});
 for(const [index,path] of config.paths.entries()){
  const runs=[];
  for(let run=0;run<config.runs;run++){
   const result=await lighthouse(url+path,{port:chrome.port,logLevel:'error',output:['json','html'],onlyCategories:['performance'],formFactor:'mobile',throttlingMethod:'simulate',blockedUrlPatterns:['https://*']});
   if(!result||result.lhr.runtimeError)throw Error(`Lighthouse failed for ${path}: ${result?.lhr.runtimeError?.message||'no report'}`);
   const prefix=resolve(output,`page-${index+1}-run-${run+1}`);
   await writeFile(prefix+'.json',result.report[0]);await writeFile(prefix+'.html',result.report[1]);
   const metrics=Object.fromEntries(Object.keys(config.budgets).map(id=>[id,result.lhr.audits[id]?.numericValue]));
   if(Object.values(metrics).some(value=>!Number.isFinite(value)))throw Error('Lighthouse metric missing for '+path);
   runs.push({metrics,score:result.lhr.categories.performance.score});
  }
  const {metrics,score}=summarizePerformanceRuns(runs,config);
  for(const [id,limit] of Object.entries(config.budgets))if(metrics[id]>limit)failures.push({path,metric:id,actual:metrics[id],limit});
  if(score<config.minimumPerformanceScore)failures.push({path,metric:'performance-score',actual:score,limit:config.minimumPerformanceScore});
  results.push({path,score,metrics,runs});console.log(path+' '+JSON.stringify({score,...metrics}));
 }
 if(results.length!==config.paths.length)throw Error('Performance results do not cover every configured path');
}finally{
 await chrome?.kill();server.closeAllConnections();await new Promise(done=>server.close(done));
 if(!runtime.startsWith(join(tmpdir(),'wm-performance-')))throw Error('Unexpected performance runtime');
 await rm(runtime,{recursive:true,force:true});
 await writeFile(resolve(output,'summary.json'),JSON.stringify({schemaVersion:1,checkedAt:new Date().toISOString(),config,results,failures,limits:'Three cold mobile lab runs per page, median metrics, pinned Lighthouse and Chromium. Local synthetic server with gzip text transfer; third-party HTTPS requests blocked. These are repeatable lab budgets, not field Core Web Vitals or an indexing guarantee.'},null,2)+'\n');
}
if(failures.length)throw Error('Performance budgets exceeded: '+JSON.stringify(failures));
