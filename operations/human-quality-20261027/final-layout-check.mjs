import {createReadStream,createWriteStream} from 'node:fs';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {resolve,relative,extname,sep} from 'node:path';
import {chromium} from '@playwright/test';

// Frozen-build geometry evidence, not an automatic quality rating.
// Optional --limit=N is a smoke run; --workers=N defaults to four browser pages.
const root=resolve(import.meta.dirname,'../..'),evidence=resolve(root,'operations/human-quality-20261027');
const build=resolve(root,'output/human-quality-20261027/final-dist');
const output=resolve(root,'output/human-quality-20261027/final-layout');
const arg=(key,fallback)=>Number(process.argv.find(v=>v.startsWith(`--${key}=`))?.split('=')[1]||fallback);
const limit=arg('limit',Infinity),workers=arg('workers',4);
const hash=value=>createHash('sha256').update(value).digest('hex');
const rows=[];
for await(const line of createInterface({input:createReadStream(resolve(root,'output/human-quality-20261027/final-inventory/pages.jsonl')),crlfDelay:Infinity})){
 const p=JSON.parse(line);rows.push({route:p.route,family:p.family,inventoryLineSha256:hash(line),inventoryHtmlSha256:p.baselineRenderedSha256,sourceFile:p.sourceIdentity?.file,sourceKey:p.sourceIdentity?.key,sourceUrls:p.externalLinks.map(l=>l.href),htmlFile:p.renderedFile.replace(/^dist\//,'')});
 if(rows.length>=limit)break;
}
await mkdir(output,{recursive:true});
const assetHashes=new Map();
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.mp4':'video/mp4'};
const server=createServer(async(req,res)=>{try{
 const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=resolve(build,'.'+path+(path.endsWith('/')?'index.html':''));
 if(!file.startsWith(build+sep))throw Error('Outside build');
 const bytes=await readFile(file);if(/\.(css|m?js)$/.test(file))assetHashes.set(relative(build,file).replaceAll('\\','/'),hash(bytes));
 res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Robots-Tag':'noindex'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
const startedAt=new Date().toISOString(),results=[],groups=new Map();let cursor=0,completed=0;
const jobs=rows.flatMap(row=>[{row,width:1440,height:900},{row,width:390,height:844}]);
const stream=createWriteStream(resolve(evidence,'final-layout-results.jsonl'));
const settle=page=>page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r))));});
async function geometry(page,sourceUrls){return page.evaluate(sourceUrls=>{
 const main=document.querySelector('main'),round=n=>Math.round(n*10)/10;
 const rect=e=>{const b=e.getBoundingClientRect();return {x:round(b.x+scrollX),y:round(b.y+scrollY),width:round(b.width),height:round(b.height),right:round(b.right+scrollX),bottom:round(b.bottom+scrollY)};};
 const text=e=>e.textContent.replace(/\s+/g,' ').trim();
 const visible=e=>!!e.getClientRects().length&&e.checkVisibility({checkVisibilityCSS:true})&&![...document.querySelectorAll('details:not([open])')].some(d=>d!==e&&d.contains(e)&&!d.querySelector(':scope>summary')?.contains(e));
 const selector=e=>e.id?'#'+e.id:e.tagName.toLowerCase()+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).join('.'):'');
 const headings=[...main.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(e=>({selector:selector(e),level:Number(e.tagName[1]),text:text(e),visible:visible(e),bounds:rect(e)}));
 const links=[...main.querySelectorAll('a[href]')].map(e=>({text:text(e),href:e.getAttribute('href'),visible:visible(e),bounds:rect(e),rectCount:e.getClientRects().length}));
 const sections=[...main.querySelectorAll('section,article,details')].filter(e=>text(e)).map(e=>({selector:selector(e),heading:text(e.querySelector('h2,h3,summary')||e).slice(0,180),visible:visible(e),bounds:rect(e),sourceLinks:[...e.querySelectorAll('a[href]')].filter(a=>sourceUrls.includes(a.getAttribute('href'))).map(a=>a.getAttribute('href'))}));
 const overflowing=[];
 for(const e of main.querySelectorAll('*')){if(!visible(e))continue;const b=e.getBoundingClientRect();if(b.width&&b.height&&(b.left< -1||b.right>innerWidth+1)){
  const scroller=e.closest('.table-scroll,.journal-table-wrap,.comparison-scroll,.payment-schedule');
  overflowing.push({selector:selector(e),text:text(e).slice(0,100),bounds:rect(e),insideHorizontalScrollRegion:!!scroller});
 }}
 const hClips=[];
 for(const e of main.querySelectorAll('h1,h2,h3,h4,h5,h6,a[href]')){if(!visible(e))continue;for(let a=e.parentElement;a&&a!==main;a=a.parentElement){const s=getComputedStyle(a);if(!['hidden','clip'].includes(s.overflowX))continue;const eb=e.getBoundingClientRect(),ab=a.getBoundingClientRect();if(eb.left<ab.left-1||eb.right>ab.right+1){hClips.push({selector:selector(e),text:text(e).slice(0,100),clippedBy:selector(a)});break;}}}
 const outline=[...main.children].map(e=>({tag:e.tagName,className:e.className,id:e.id}));
 return {viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,horizontalOverflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),main:rect(main),headings,links,sections,overflowingElements:overflowing,headingLinkClipCandidates:hClips,outline,styles:[...document.querySelectorAll('link[rel=stylesheet]')].map(e=>new URL(e.href).pathname),scripts:[...document.scripts].filter(e=>e.src).map(e=>new URL(e.src).pathname),bodyClass:document.body.className,details:[...main.querySelectorAll('details')].map(e=>({summary:text(e.querySelector('summary')||e),open:e.open,bounds:rect(e)}))};
 },sourceUrls);}
async function collisions(page,y){await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await settle(page);return page.evaluate(()=>{
 const tools=[...document.querySelectorAll('.back-to-top,.support-chat-launch')].filter(e=>!e.hidden&&e.checkVisibility({checkVisibilityCSS:true})).map(e=>({selector:e.classList.contains('back-to-top')?'.back-to-top':'.support-chat-launch',r:e.getBoundingClientRect()}));
 const hits=[];for(const region of document.querySelectorAll('main,footer')){const w=document.createTreeWalker(region,NodeFilter.SHOW_TEXT);while(w.nextNode()){
 const n=w.currentNode,p=n.parentElement,b=p.getBoundingClientRect();if(!n.textContent.trim()||p.closest('script,style')||b.bottom<0||b.top>innerHeight||!p.checkVisibility({checkVisibilityCSS:true}))continue;
 if(p.closest('details:not([open])')&&!p.closest('summary'))continue;
 const range=document.createRange();range.selectNodeContents(n);for(const r of range.getClientRects())for(const t of tools)if(Math.min(r.right,t.r.right)>Math.max(r.left,t.r.left)+1&&Math.min(r.bottom,t.r.bottom)>Math.max(r.top,t.r.top)+1)hits.push({tool:t.selector,text:n.textContent.trim().slice(0,160),textBounds:{x:r.x,y:r.y,width:r.width,height:r.height},toolBounds:{x:t.r.x,y:t.r.y,width:t.r.width,height:t.r.height}});
 }}return {scrollY,hits};
 });}
async function worker(){const context=await browser.newContext({reducedMotion:'reduce',serviceWorkers:'block'});await context.route('**/*',route=>{const u=route.request().url();return u.startsWith(origin)||u.startsWith('data:')||u.startsWith('blob:')?route.continue():route.abort();});const page=await context.newPage();
 while(cursor<jobs.length){const {row,width,height}=jobs[cursor++];const result={route:row.route,family:row.family,width,height,sourceFile:row.sourceFile,sourceKey:row.sourceKey,inventoryLineSha256:row.inventoryLineSha256,inventoryHtmlSha256:row.inventoryHtmlSha256,reviewedAt:new Date().toISOString(),numericRatings:null};
 try{const html=await readFile(resolve(build,row.htmlFile));result.renderedHtmlSha256=hash(html);result.inventoryHtmlMatches=result.renderedHtmlSha256===row.inventoryHtmlSha256;
 await page.setViewportSize({width,height});const response=await page.goto(origin+row.route+'?qa=1',{waitUntil:'load',timeout:30000});result.httpStatus=response.status();await settle(page);
 result.default=await geometry(page,row.sourceUrls);
 result.styleHashes=Object.fromEntries(result.default.styles.map(p=>[p,assetHashes.get(p.slice(1))||null]));
 result.scriptHashes=Object.fromEntries(result.default.scripts.map(p=>[p,assetHashes.get(p.slice(1))||null]));
 const signature={family:row.family,width,bodyClass:result.default.bodyClass,outline:result.default.outline,styleHashes:result.styleHashes};result.layoutStyleGroup=hash(JSON.stringify(signature));
 if(!groups.has(result.layoutStyleGroup))groups.set(result.layoutStyleGroup,{signature,representative:row.route,width,height,members:[]});const group=groups.get(result.layoutStyleGroup);group.members.push(row.route);
 const sourceSection=result.default.sections.find(s=>s.visible&&s.selector==='#buyer-task')||result.default.sections.find(s=>s.visible&&s.sourceLinks.length&&s.bounds.height>80&&s.bounds.y>200)||result.default.sections.find(s=>s.visible&&s.bounds.height>150&&s.bounds.y>height*.5)||result.default.sections.find(s=>s.visible);
 result.contentCase=sourceSection?{selector:sourceSection.selector,heading:sourceSection.heading,bounds:sourceSection.bounds,sourceLinks:sourceSection.sourceLinks}:null;
 const contentY=Math.max(0,Math.min(sourceSection?.bounds.y||600,result.default.documentHeight-height));
 result.collisions=[];for(const y of [...new Set([0,600,Math.round(contentY),Math.max(0,result.default.documentHeight-height)])])result.collisions.push(await collisions(page,y));
 await page.evaluate(()=>{for(const d of document.querySelectorAll('main details'))d.open=true;scrollTo({top:0,behavior:'instant'});});await settle(page);
 const expanded=await geometry(page,row.sourceUrls);result.expanded={documentHeight:expanded.documentHeight,horizontalOverflow:expanded.horizontalOverflow,overflowingElements:expanded.overflowingElements,headingLinkClipCandidates:expanded.headingLinkClipCandidates,headings:expanded.headings,links:expanded.links,sections:expanded.sections,details:expanded.details};
 result.anomalies=[];
 if(result.httpStatus!==200)result.anomalies.push('http-status');if(!result.inventoryHtmlMatches)result.anomalies.push('inventory-html-mismatch');
 if(result.default.horizontalOverflow>1||expanded.horizontalOverflow>1)result.anomalies.push('document-horizontal-overflow');
 if(result.default.headingLinkClipCandidates.length||expanded.headingLinkClipCandidates.length)result.anomalies.push('heading-link-clipping-candidate');
 if(result.collisions.some(s=>s.hits.length))result.anomalies.push('floating-tool-text-collision');
 result.screenshots=[];
 if(group.representative===row.route||result.anomalies.length){
  await page.evaluate(states=>{[...document.querySelectorAll('main details')].forEach((d,i)=>d.open=states[i]);scrollTo({top:0,behavior:'instant'});},result.default.details.map(d=>d.open));await settle(page);
  const key=hash(row.route).slice(0,16)+'-'+width;
  for(const [name,y] of [['firstscreen',0],['content',contentY]]){await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await settle(page);const path=resolve(output,key+'-'+name+'.jpg');await page.screenshot({path,type:'jpeg',quality:82});result.screenshots.push({case:name,path:relative(root,path).replaceAll('\\','/'),sha256:hash(await readFile(path)),scrollY:await page.evaluate(()=>scrollY),width,height});}
  const collision=result.collisions.find(s=>s.hits.length);if(collision&&collision.scrollY!==0&&Math.abs(collision.scrollY-contentY)>1){await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),collision.scrollY);await settle(page);const path=resolve(output,key+'-collision.jpg');await page.screenshot({path,type:'jpeg',quality:82});result.screenshots.push({case:'collision',path:relative(root,path).replaceAll('\\','/'),sha256:hash(await readFile(path)),scrollY:collision.scrollY,width,height});}
 }
 }catch(error){result.error=String(error.stack||error);result.anomalies=['execution-error'];}
 results.push(result);stream.write(JSON.stringify(result)+'\n');completed++;if(completed%100===0)console.log(JSON.stringify({completed,total:jobs.length,anomalousCases:results.filter(r=>r.anomalies.length).length,errors:results.filter(r=>r.error).length,groups:groups.size}));
 }await context.close();}
try{await Promise.all(Array.from({length:workers},worker));}finally{await browser.close();await new Promise(r=>server.close(r));await new Promise(r=>stream.end(r));}
const anomalyCounts={};for(const r of results)for(const a of r.anomalies)anomalyCounts[a]=(anomalyCounts[a]||0)+1;
const summary={version:1,startedAt,finishedAt:new Date().toISOString(),frozenBuild:relative(root,build).replaceAll('\\','/'),inventory:'output/human-quality-20261027/final-inventory/pages.jsonl',scriptSha256:hash(await readFile(new URL(import.meta.url))),browser:'Chromium '+browser.version(),platform:process.platform,viewports:[{width:1440,height:900},{width:390,height:844}],expectedUrls:2394,actualUrls:rows.length,completedCases:results.length,expectedCases:jobs.length,complete:rows.length===2394&&results.length===4788&&!results.some(r=>r.error),anomalyCounts,executionErrors:results.filter(r=>r.error).map(r=>({route:r.route,width:r.width,error:r.error})),assetHashes:Object.fromEntries(assetHashes),layoutStyleGroups:[...groups].map(([id,g])=>({id,...g})),screenshots:results.reduce((n,r)=>n+(r.screenshots?.length||0),0),ratingDimensionsSupported:['visuals: measured overflow, clipping candidates, spacing bounds and screenshots','scanability: heading/section geometry and collapsed/expanded content locations','accessibility: geometry observations only; no conformance claim'],unknowns:['No numeric quality ratings assigned.','Screenshots captured, not all manually inspected. Geometry does not constitute manual copy or pixel review.','Only Chromium on Windows, reduced motion, two viewport sizes, default and all-main-disclosures-open states.','No contrast, keyboard, 320px reflow, text-spacing override or action-submission audit.','Floating control collisions checked at firstscreen, 600px, selected content section and footer, not every scroll pixel.','Shared visual judgments may be inherited only within documented layout/style groups after human representative review and each URL geometry checks; content length and copy remain per-URL.','External network requests blocked; public source links recorded but not verified.','Clipping candidates and overlap measurements require human interpretation; no automatic audit scores.'],resultsFile:'operations/human-quality-20261027/final-layout-results.jsonl'};
await writeFile(resolve(evidence,'final-layout-summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({complete:summary.complete,completed:results.length,anomalyCounts,groups:groups.size,screenshots:summary.screenshots}));

