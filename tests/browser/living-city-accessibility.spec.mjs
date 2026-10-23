import {test,expect} from './fixtures.mjs';
import {readFile} from 'node:fs/promises';
const axe=await readFile(new URL('../../node_modules/axe-core/axe.min.js',import.meta.url),'utf8');

// Measure each word's rendered line boxes, rather than assuming a fitting element
// means its text has stayed intact under the shared overflow-wrap rule.
function cityHeadingLayout(){
 const heading=document.querySelector('.city-copy h1'),hero=document.querySelector('.city-hero');
 const walker=document.createTreeWalker(heading,NodeFilter.SHOW_TEXT),splitWords=[];
 while(walker.nextNode()){
  if(walker.currentNode.parentElement.closest('.sr-only,[hidden]'))continue;
  for(const match of walker.currentNode.textContent.matchAll(/\S+/g)){
  const range=document.createRange();range.setStart(walker.currentNode,match.index);range.setEnd(walker.currentNode,match.index+match[0].length);
  if(range.getClientRects().length>1)splitWords.push(match[0]);
  }
 }
 const style=getComputedStyle(hero);
 return {splitWords,columns:style.display==='grid'?style.gridTemplateColumns.split(' ').length:1,overflow:document.documentElement.scrollWidth>innerWidth+1};
}

test('artwork and sky stay aligned above the roofs across desktop and phone crops',async({page},testInfo)=>{
 test.skip(!['phone','desktop'].includes(testInfo.project.name),'Desktop and phone matrices cover the composition');
 test.setTimeout(90_000);
 await page.emulateMedia({reducedMotion:'reduce'});
 const inspect=async label=>{
  const layout=await page.evaluate(async()=>{
   const rect=s=>document.querySelector(s).getBoundingClientRect();
   const art=document.querySelector('.city-poster'),scene=rect('.city-scene'),copy=rect('.city-copy'),plane=rect('.city-atmosphere');
   // Srcset density correction rounds natural dimensions; decode the selected
   // source directly so that this geometry uses its actual pixel aspect ratio.
   const source=new Image();source.src=art.currentSrc;await source.decode();
   const scale=Math.max(scene.width/source.naturalWidth,scene.height/source.naturalHeight),width=source.naturalWidth*scale,height=source.naturalHeight*scale;
   const position=getComputedStyle(art).objectPosition.split(' ').map(value=>parseFloat(value)/100);
   const left=scene.left+(scene.width-width)*position[0],top=scene.top+(scene.height-height)*position[1],narrow=innerWidth<=1023;
   // Conservative roof lines measured from the desktop and mobile source frames.
   const roof=top+height*(narrow?.595:.295),sky=rect('.city-night'),moon=rect('.city-moon'),stars=rect('.city-stars');
   return {narrow,planeWidth:plane.width,alignmentError:Math.max(Math.abs(plane.left-left),Math.abs(plane.top-top),Math.abs(plane.width-width),Math.abs(plane.height-height)),ratio:scene.width/scene.height,sourceRatio:source.naturalWidth/source.naturalHeight,copyClearance:roof-copy.bottom,moonClearance:roof-moon.bottom,skyClearance:roof-sky.bottom,starsClearance:roof-stars.bottom,skyAfterCopy:sky.top-copy.bottom,overflow:document.documentElement.scrollWidth>innerWidth+1};
  });
  expect(layout.planeWidth,label).toBeGreaterThan(100);
  expect(layout.alignmentError,label).toBeLessThan(1);
  if(layout.narrow){
   expect(layout.ratio,label).toBeCloseTo(layout.sourceRatio,2);
   expect(layout.copyClearance,label).toBeGreaterThan(20);
   expect(layout.skyAfterCopy,label).toBeGreaterThan(-1);
  }
  expect(layout.moonClearance,label).toBeGreaterThan(5);
  expect(layout.skyClearance,label).toBeGreaterThan(5);
  expect(layout.starsClearance,label).toBeGreaterThan(5);
  expect(layout.overflow,label).toBe(false);
 };
 for(const width of testInfo.project.name==='phone'?[320,390,430,768,1023]:[1024,1199,1440,1521,1920,2560]){
  await page.setViewportSize({width,height:1100});await page.goto('/?qa=1');await page.evaluate(()=>document.fonts.ready);
  const poster=await page.evaluate(async()=>{
   const image=document.querySelector('.city-poster');await image.decode();
   return {selected:image.currentSrc,requests:performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/assets/living-city/')&&entry.name.includes('poster.webp')).map(entry=>({url:entry.name,initiator:entry.initiatorType}))};
  });
  expect(poster.requests,`Only the selected poster downloads at ${width}px`).toEqual([{url:poster.selected,initiator:'link'}]);
  await inspect(String(width));
  await testInfo.attach('sky-composition-'+width,{body:await page.screenshot(),contentType:'image/png'});
 }
 await page.setViewportSize({width:testInfo.project.name==='phone'?390:1521,height:1100});await page.emulateMedia({reducedMotion:'no-preference'});await page.reload();
 await expect(page.locator('[data-living-city]')).toHaveAttribute('data-city-ready','true');
 if(await page.locator('[data-living-city]').getAttribute('data-city-state')==='idle')await page.locator('[data-city-play]').click();
 await expect(page.locator('[data-living-city]')).toHaveClass(/has-city-frame/);
 await page.locator('#city-film').evaluate(video=>video.playbackRate=6);
 await expect(page.locator('[data-living-city]')).toHaveAttribute('data-city-beat','ambient');
 await page.locator('[data-city-play]').click();await inspect('ambient film');
 const video=await page.locator('#city-film').evaluate(video=>{const poster=document.querySelector('.city-poster');return {source:video.videoWidth/video.videoHeight,posterSource:poster.naturalWidth/poster.naturalHeight,widthDifference:video.clientWidth-poster.clientWidth,heightDifference:video.clientHeight-poster.clientHeight};});
 expect(video.source).toBeCloseTo(video.posterSource,2);expect(video.widthDifference).toBe(0);expect(video.heightDifference).toBe(0);
 await testInfo.attach('sky-composition-ambient',{body:await page.screenshot(),contentType:'image/png'});
});

test('city heading keeps whole words in two columns across wide desktops',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','One viewport matrix covers the desktop composition');
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const width of [1024,1199,1440,1600,1920,2560]){
  await page.setViewportSize({width,height:1140});await page.goto('/?qa=1');await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(cityHeadingLayout),String(width)).toEqual({splitWords:[],columns:2,overflow:false});
  if(width===1920)await testInfo.attach('desktop-heading-1920',{body:await page.screenshot(),contentType:'image/png'});
 }
});

test('the city homepage and Buffalo archive have no detected WCAG A or AA violations',async({page})=>{
 await page.route('**/__test-city-axe.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:axe}));
 for(const path of ['/','/work/buffalo-civic/']){
  await page.goto(path+'?qa=1');await page.evaluate(()=>document.fonts.ready);
  await page.addScriptTag({url:'/__test-city-axe.js'});
  const violations=await page.evaluate(async()=>{const result=await axe.run(document.getElementById('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return result.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}));});
  expect(violations,path).toEqual([]);
 }
});

test('city copy and controls survive doubled text across phone, tablet and desktop',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','One independent viewport matrix covers this text-resize check');
 await page.route('**/__test-city-text.css',route=>route.fulfill({status:200,contentType:'text/css',body:':root{font-size:200%}'}));
 for(const width of [320,768,1024,1440]){
  await page.setViewportSize({width,height:1000});await page.goto('/?qa=1');await page.evaluate(()=>document.fonts.ready);
  await page.addStyleTag({url:'/__test-city-text.css'});
  const heading=await page.evaluate(cityHeadingLayout);
  expect(heading.columns,String(width)).toBe(1);
  // At 320px, emergency wrapping retains the enlarged type without horizontal
  // scrolling; tablet and desktop have room to keep every word on one line.
  if(width>320)expect(heading.splitWords,String(width)).toEqual([]);
  const layout=await page.evaluate(()=>{
   const rect=selector=>document.querySelector(selector).getBoundingClientRect();
   const hero=rect('.city-hero'),copy=rect('.city-copy'),eyebrow=rect('.city-eyebrow'),brand=rect('.brand-lockup');
   const buttons=['.city-primary','.city-explore','[data-city-play]'].map(selector=>({selector,r:rect(selector)}));
   const controls=buttons.map(({selector,r})=>({selector,insideHero:r.top>=hero.top&&r.bottom<=hero.bottom+1&&r.left>=0&&r.right<=innerWidth+1}));
   const visibleHeader=[...document.querySelectorAll('.site-header .brand-lockup,.site-header .header-contact,.site-header .menu-toggle,.site-header #main-nav>a,.site-header .service-navigation>summary')].filter(node=>node.getClientRects().length).map(node=>({selector:node.textContent.trim(),r:node.getBoundingClientRect()}));
   const allControls=[...buttons,...visibleHeader];
   const overlaps=allControls.flatMap((a,i)=>allControls.slice(i+1).filter(b=>Math.min(a.r.right,b.r.right)>Math.max(a.r.left,b.r.left)+1&&Math.min(a.r.bottom,b.r.bottom)>Math.max(a.r.top,b.r.top)+1).map(b=>a.selector+' / '+b.selector));
   const clippedChoices=[...document.querySelectorAll('.city-choice')].filter(node=>node.scrollWidth>node.clientWidth+1).map(node=>node.textContent.trim());
   const clippedHeader=visibleHeader.filter(({r})=>r.left<0||r.right>innerWidth+1).map(({selector})=>selector);
   return {overflow:document.documentElement.scrollWidth>innerWidth+1,copyInside:copy.bottom<=hero.bottom+1,brandClear:brand.bottom<=eyebrow.top+1,controls,overlaps,clippedChoices,clippedHeader};
  });
  expect(layout.overflow,String(width)).toBe(false);expect(layout.copyInside,String(width)).toBe(true);expect(layout.brandClear,String(width)).toBe(true);
  for(const control of layout.controls)expect(control.insideHero,width+' '+control.selector).toBe(true);
  expect(layout.overlaps,String(width)).toEqual([]);
  expect(layout.clippedChoices,String(width)).toEqual([]);
  expect(layout.clippedHeader,String(width)).toEqual([]);
  await testInfo.attach('doubled-text-'+width,{body:await page.screenshot(),contentType:'image/png'});
 }
});

test('homepage city film controls keep their own space across desktop and doubled text',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','One viewport matrix covers the real-film responsive states');
 test.setTimeout(90_000);
 await page.route('**/__test-city-text.css',route=>route.fulfill({status:200,contentType:'text/css',body:':root{font-size:200%}'}));
 const clearLayout=async(width,state)=>{
  const result=await page.evaluate(()=>{
   const nodes=[...document.querySelectorAll('.city-primary,.city-explore,.city-controls button,.city-location,.city-chooser,[data-city-showcase][data-active=true]')].filter(node=>node.getClientRects().length&&node.textContent.trim());
   const boxes=nodes.map(node=>({name:node.textContent.trim(),r:node.getBoundingClientRect()}));
   const hero=document.querySelector('.city-hero').getBoundingClientRect();
   const overlaps=boxes.flatMap((a,i)=>boxes.slice(i+1).filter(b=>Math.min(a.r.right,b.r.right)>Math.max(a.r.left,b.r.left)+1&&Math.min(a.r.bottom,b.r.bottom)>Math.max(a.r.top,b.r.top)+1).map(b=>a.name+' / '+b.name));
   return {overlaps,outside:boxes.filter(({r})=>r.left<0||r.right>innerWidth+1||r.bottom>hero.bottom+1).map(({name,r})=>({name,left:r.left,right:r.right,bottom:r.bottom,heroBottom:hero.bottom}))};
  });
  expect(result.overlaps,width+' '+state).toEqual([]);expect(result.outside,width+' '+state).toEqual([]);
 };
 const sizes=[...[1024,1199,1440,1600,1920,2560].map(width=>({width,doubled:false})),...[320,768,1024,1440].map(width=>({width,doubled:true}))];
 for(const {width,doubled} of sizes){
  const label=width+(doubled?' at 200% text':' at normal text');
  await page.setViewportSize({width,height:1500});await page.goto('/?qa=1');await page.evaluate(()=>document.fonts.ready);
  if(doubled)await page.addStyleTag({url:'/__test-city-text.css'});
  await expect(page.locator('[data-living-city]')).toHaveAttribute('data-city-ready','true');
  if(await page.locator('[data-living-city]').getAttribute('data-city-state')==='idle')await page.locator('[data-city-play]').click();
  await expect(page.locator('[data-living-city]')).toHaveClass(/has-city-frame/);
  await expect(page.locator('[data-city-showcase=fieldwork]')).toHaveAttribute('data-active','true');
  await page.locator('[data-city-play]').click();await expect(page.locator('#city-film')).toHaveJSProperty('paused',true);
  expect(await page.locator('[data-city-showcase=fieldwork]').evaluate(card=>card.getAnimations().every(animation=>animation.playState!=='running'))).toBe(true);
  await clearLayout(label,'paused');
  // A pause can land on any entrance frame, including a frame a fast runner skips.
  const card=page.locator('[data-city-showcase=fieldwork]');
  // Restart the real CSS entrance while media is held, even if a slow runner
  // reached the pause button after the original entrance had already finished.
  const duration=await card.evaluate(node=>{
   node.style.animationName='none';void node.offsetWidth;node.style.removeProperty('animation-name');
   const animation=node.getAnimations().find(a=>a.animationName==='city-card-arrive');
   if(!animation)throw Error('The active card must expose its entrance animation');
   animation.pause();return animation.effect.getTiming().duration;
  });
  for(const progress of [0,.075,.19,.42,.68,.99]){
   await card.evaluate((node,time)=>{node.getAnimations().find(a=>a.animationName==='city-card-arrive').currentTime=time;},duration*progress);
   await clearLayout(label,'entrance '+Math.round(progress*100)+'%');
  }
  await card.evaluate(node=>node.getAnimations().find(a=>a.animationName==='city-card-arrive').finish());
  await page.locator('#city-film').evaluate(video=>video.playbackRate=4);await page.locator('[data-city-play]').click();await expect(page.locator('[data-living-city]')).toHaveAttribute('data-city-beat','ambient',{timeout:15000});
  await clearLayout(label,'ambient');
  await expect(page.locator('[data-city-replay]')).toBeVisible();
  await page.locator('[data-city-replay]').click();await expect(page.locator('[data-living-city]')).toHaveAttribute('data-city-state','playing');
  await clearLayout(label,'replaying');
 }
});
