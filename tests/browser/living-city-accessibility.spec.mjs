import {test,expect} from './fixtures.mjs';
import {readFile} from 'node:fs/promises';
const axe=await readFile(new URL('../../node_modules/axe-core/axe.min.js',import.meta.url),'utf8');

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
  const layout=await page.evaluate(()=>{
   const rect=selector=>document.querySelector(selector).getBoundingClientRect();
   const hero=rect('.city-hero'),copy=rect('.city-copy'),eyebrow=rect('.city-eyebrow'),brand=rect('.brand-lockup');
   const buttons=['.city-primary','.city-explore','[data-city-play]'].map(selector=>({selector,r:rect(selector)}));
   const controls=buttons.map(({selector,r})=>({selector,insideHero:r.top>=hero.top&&r.bottom<=hero.bottom+1&&r.left>=0&&r.right<=innerWidth+1}));
   const visibleHeader=[...document.querySelectorAll('.site-header .brand-lockup,.site-header #main-nav>a,.site-header .service-navigation>summary')].filter(node=>node.getClientRects().length).map(node=>({selector:node.textContent.trim(),r:node.getBoundingClientRect()}));
   const allControls=[...buttons,...visibleHeader];
   const overlaps=allControls.flatMap((a,i)=>allControls.slice(i+1).filter(b=>Math.min(a.r.right,b.r.right)>Math.max(a.r.left,b.r.left)+1&&Math.min(a.r.bottom,b.r.bottom)>Math.max(a.r.top,b.r.top)+1).map(b=>a.selector+' / '+b.selector));
   const clippedChoices=[...document.querySelectorAll('.city-choice')].filter(node=>node.scrollWidth>node.clientWidth+1).map(node=>node.textContent.trim());
   return {overflow:document.documentElement.scrollWidth>innerWidth+1,copyInside:copy.bottom<=hero.bottom+1,brandClear:brand.bottom<=eyebrow.top+1,controls,overlaps,clippedChoices};
  });
  expect(layout.overflow,String(width)).toBe(false);expect(layout.copyInside,String(width)).toBe(true);expect(layout.brandClear,String(width)).toBe(true);
  for(const control of layout.controls)expect(control.insideHero,width+' '+control.selector).toBe(true);
  expect(layout.overlaps,String(width)).toEqual([]);
  expect(layout.clippedChoices,String(width)).toEqual([]);
  await testInfo.attach('doubled-text-'+width,{body:await page.screenshot(),contentType:'image/png'});
 }
});

test('homepage city film controls keep their own space at doubled text',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','One viewport matrix covers the real-film enlarged-text states');
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
 for(const width of [320,768,1024]){
  await page.setViewportSize({width,height:1500});await page.goto('/?qa=1');await page.evaluate(()=>document.fonts.ready);await page.addStyleTag({url:'/__test-city-text.css'});
  await expect(page.locator('[data-living-city]')).toHaveClass(/has-city-frame/);
  await expect(page.locator('[data-city-showcase=fieldwork]')).toHaveAttribute('data-active','true');
  await page.locator('[data-city-play]').click();await expect(page.locator('#city-film')).toHaveJSProperty('paused',true);
  expect(await page.locator('[data-city-showcase=fieldwork]').evaluate(card=>card.getAnimations().every(animation=>animation.playState!=='running'))).toBe(true);
  await clearLayout(width,'paused');
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
   await clearLayout(width,'entrance '+Math.round(progress*100)+'%');
  }
  await card.evaluate(node=>node.getAnimations().find(a=>a.animationName==='city-card-arrive').finish());
  await page.locator('#city-film').evaluate(video=>video.playbackRate=4);await page.locator('[data-city-play]').click();await expect(page.locator('[data-living-city]')).toHaveAttribute('data-city-beat','ambient',{timeout:15000});
  await clearLayout(width,'ambient');
  await expect(page.locator('[data-city-replay]')).toBeVisible();
  await page.locator('[data-city-replay]').click();await expect(page.locator('[data-living-city]')).toHaveAttribute('data-city-state','playing');
  await clearLayout(width,'replaying');
 }
});
