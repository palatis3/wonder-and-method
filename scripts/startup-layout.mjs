import http from 'node:http';
import {parse} from 'parse5';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {layoutShiftScore} from './performance-contract.mjs';

function sceneEnd(html){
 const visit=node=>node.attrs?.some(a=>a.name==='class'&&a.value.split(/\s+/).includes('city-scene'))?node:(node.childNodes||[]).map(visit).find(Boolean);
 const scene=visit(parse(html,{sourceCodeLocationInfo:true}));
 if(!scene?.sourceCodeLocation?.endOffset)throw Error('Startup regression requires the complete homepage scene');
 return scene.sourceCodeLocation.endOffset;
}

// Proxy only the synthetic loopback build. Preserve its CSP and allow the
// browser to paint a partial HTML response, as a real network can do.
export async function createStreamingPreview(upstream,{pauseMs=1500}={}){
 if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(upstream))throw Error('Streaming preview requires a loopback build');
 if(!Number.isFinite(pauseMs)||pauseMs<0||pauseMs>5000)throw Error('Invalid stream pause');
 const timers=new Set();
 const server=http.createServer(async(req,res)=>{
  try{
   if(req.method!=='GET'||!/^\/(?!\/)/.test(req.url)||req.url.includes('\\')){res.writeHead(400);res.end();return;}
   const target=new URL(req.url,upstream);
   if(target.origin!==upstream||target.pathname.startsWith('/api/')){res.writeHead(403);res.end();return;}
   const response=await fetch(target,{redirect:'manual'}),headers=Object.fromEntries(response.headers);
   for(const name of ['content-length','content-encoding','transfer-encoding','connection'])delete headers[name];
   const bytes=Buffer.from(await response.arrayBuffer());
   if(response.status!==200||target.pathname!=='/'){res.writeHead(response.status,headers);res.end(bytes);return;}
   const html=bytes.toString('utf8'),split=sceneEnd(html);
   res.writeHead(200,headers);res.write(html.slice(0,split));
   const timer=setTimeout(()=>{timers.delete(timer);res.end(html.slice(split));},pauseMs);timers.add(timer);
   res.on('close',()=>{clearTimeout(timer);timers.delete(timer);});
  }catch(error){if(!res.headersSent)res.writeHead(500);res.end('Synthetic streaming fixture failed.');}
 });
 await new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});
 return {url:`http://127.0.0.1:${server.address().port}`,close:async()=>{for(const timer of timers)clearTimeout(timer);server.closeAllConnections();await new Promise(done=>server.close(done));}};
}

export async function measureStartupLayout(url,output,{limit=0.1}={}){
 const streaming=await createStreamingPreview(url);let browser;
 const results=[];await mkdir(output,{recursive:true});
 try{
  browser=await chromium.launch({headless:true});
  for(const viewport of [{width:390,height:844,mobile:true},{width:412,height:823,mobile:true},{width:1440,height:1000,mobile:false}]){
   for(const scenario of ['streamed-html','delayed-fonts-and-modules']){
    const target=scenario==='streamed-html'?streaming.url:url;
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},isMobile:viewport.mobile,hasTouch:viewport.mobile,deviceScaleFactor:viewport.mobile?1.75:1,serviceWorkers:'block'});
    try{
     await context.route('**/*',async route=>{
      const requested=new URL(route.request().url());
      if(requested.origin!==target||requested.pathname.startsWith('/api/'))return route.abort('blockedbyclient');
      if(scenario==='delayed-fonts-and-modules'&&(/\.woff2$/.test(requested.pathname)||/\/(?:page-navigation|living-city)\.js$/.test(requested.pathname)))await new Promise(done=>setTimeout(done,900));
      return route.continue();
     });
     const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
     await page.addInitScript(()=>{
      window.__startupLayout={supported:PerformanceObserver.supportedEntryTypes.includes('layout-shift'),entries:[]};
      new PerformanceObserver(list=>{for(const entry of list.getEntries())window.__startupLayout.entries.push({value:entry.value,startTime:entry.startTime,hadRecentInput:entry.hadRecentInput,sources:entry.sources.map(source=>({node:source.node?.tagName+'.'+source.node?.className,previous:source.previousRect.toJSON(),current:source.currentRect.toJSON()}))});}).observe({type:'layout-shift',buffered:true});
     });
     await page.goto(target,{waitUntil:'load',timeout:30000});
     await page.evaluate(async()=>{await document.fonts.ready;await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));});
     // Include late module/observer delivery after the load event.
     await page.waitForTimeout(500);
     const measured=await page.evaluate(()=>({...window.__startupLayout,fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,responseEnd:performance.getEntriesByType('navigation')[0]?.responseEnd,ready:document.querySelector('[data-living-city]')?.dataset.cityReady,overflow:document.documentElement.scrollWidth>innerWidth+1}));
     if(!measured.supported||!Number.isFinite(measured.fcp)||!Number.isFinite(measured.responseEnd)||measured.ready!=='true'||errors.length)throw Error(`Incomplete startup probe ${viewport.width}/${scenario}: ${JSON.stringify({measured,errors})}`);
     if(scenario==='streamed-html'&&measured.fcp>=measured.responseEnd-200)throw Error(`Streaming probe did not paint the partial response: ${viewport.width}`);
     const cls=layoutShiftScore(measured.entries);
     // This probe never sends input. Chromium's mobile emulation can still
     // mark entries as recent-input shifts; retain standard CLS and also
     // guard the visible movement so that flag cannot mask a regression.
     const observedShiftScore=layoutShiftScore(measured.entries.map(entry=>({...entry,hadRecentInput:false})));
     const result={viewport,scenario,cls,observedShiftScore,limit,passed:cls<=limit&&observedShiftScore<=limit&&!measured.overflow,...measured,errors};
     results.push(result);
     const prefix=resolve(output,`${viewport.width}-${scenario}`);
     await writeFile(prefix+'.json',JSON.stringify(result,null,2)+'\n');await page.screenshot({path:prefix+'.png'});
    }finally{await context.close();}
   }
  }
 }finally{await browser?.close();await streaming.close();await writeFile(resolve(output,'summary.json'),JSON.stringify({expected:6,completed:results.length,results},null,2)+'\n');}
 if(results.length!==6)throw Error('Incomplete startup layout matrix');
 return results;
}
