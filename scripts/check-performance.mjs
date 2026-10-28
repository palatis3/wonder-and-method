import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import {launch} from 'chrome-launcher';
import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {createServer} from './server.mjs';
import {validatePerformanceConfig,performanceFailures} from './performance-contract.mjs';
import {measureStartupLayout} from './startup-layout.mjs';
const root=resolve(import.meta.dirname,'..'),output=resolve(root,'output/ci/performance');
const config=validatePerformanceConfig(JSON.parse(await readFile(resolve(root,'config/performance-budgets.json'),'utf8')));
await mkdir(output,{recursive:true});
const runtime=await mkdtemp(join(tmpdir(),'wm-performance-')),{server,url}=await createServer({runtime,port:0,compress:true});
const results=[],failures=[];let chrome,startup=[],error;
try{
 startup=await measureStartupLayout(url,resolve(output,'startup'),{limit:config.budgets['cumulative-layout-shift']});
 for(const result of startup)if(!result.passed)failures.push({path:'/',profile:result.viewport.width,scenario:result.scenario,metric:result.overflow?'horizontal-overflow':'startup-layout-shift',actual:result.overflow?1:Math.max(result.cls,result.observedShiftScore),limit:result.overflow?0:result.limit});
 chrome=await launch({chromePath:chromium.executablePath(),chromeFlags:['--headless','--no-sandbox','--disable-dev-shm-usage'],logLevel:'silent'});
 for(const profile of config.profiles){
 for(const [index,path] of config.paths.entries()){
  const runs=[];
  for(let run=0;run<config.runs;run++){
   const result=await lighthouse(url+path,{port:chrome.port,logLevel:'error',output:['json','html'],onlyCategories:['performance'],throttlingMethod:'simulate',blockedUrlPatterns:['https://*']},profile==='desktop'?desktopConfig:undefined);
   if(!result||result.lhr.runtimeError)throw Error(`Lighthouse failed for ${path}: ${result?.lhr.runtimeError?.message||'no report'}`);
   const prefix=resolve(output,`${profile}-page-${index+1}-run-${run+1}`);
   await writeFile(prefix+'.json',result.report[0]);await writeFile(prefix+'.html',result.report[1]);
   const metrics=Object.fromEntries(Object.keys(config.budgets).map(id=>[id,result.lhr.audits[id]?.numericValue]));
   if(Object.values(metrics).some(value=>!Number.isFinite(value)))throw Error('Lighthouse metric missing for '+path);
   runs.push({metrics,score:result.lhr.categories.performance.score});
  }
  const {metrics,score,failures:pageFailures}=performanceFailures(runs,config);
  failures.push(...pageFailures.map(failure=>({profile,path,...failure})));
  results.push({profile,path,score,metrics,runs});console.log(profile+' '+path+' '+JSON.stringify({score,...metrics}));
 }
 }
 if(results.length!==config.paths.length*config.profiles.length)throw Error('Performance results do not cover every configured path and profile');
}catch(cause){error=cause;throw cause;
}finally{
 await chrome?.kill();server.closeAllConnections();await new Promise(done=>server.close(done));
 if(!runtime.startsWith(join(tmpdir(),'wm-performance-')))throw Error('Unexpected performance runtime');
 await rm(runtime,{recursive:true,force:true});
 await writeFile(resolve(output,'summary.json'),JSON.stringify({schemaVersion:2,status:error||failures.length?'failed':'passed',error:error?.message,checkedAt:new Date().toISOString(),config,startup,results,failures,limits:'Three cold lab runs per page and profile, median timing metrics and score, worst CLS across runs. Pinned Lighthouse and Chromium with mobile/desktop presets. Six startup probes cover streamed HTML and delayed fonts/modules. Local synthetic server with gzip text transfer; third-party HTTPS requests blocked. Full reports retain image, CSS and request-chain diagnostics. These are lab budgets, not field Core Web Vitals or a guarantee about every real visit.'},null,2)+'\n');
}
if(failures.length)throw Error('Performance budgets exceeded: '+JSON.stringify(failures));
