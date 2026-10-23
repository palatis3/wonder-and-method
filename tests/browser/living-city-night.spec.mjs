import {test,expect} from './fixtures.mjs';

const rootSelector='[data-living-city]';
async function reachNight(page){
 await page.goto('/?qa=1');
 await expect(page.locator(rootSelector)).toHaveAttribute('data-city-ready','true');
 if(page.viewportSize().width<=1023)await page.locator('[data-city-play]').click();
 await expect(page.locator(rootSelector)).toHaveAttribute('data-city-state','playing');
 await page.locator('#city-film').evaluate(video=>video.playbackRate=6);
 await expect(page.locator(rootSelector)).toHaveAttribute('data-city-beat','ambient');
}
const skyTimes=page=>page.locator('.city-night').evaluate(node=>node.getAnimations({subtree:true}).map(a=>({time:a.currentTime,state:a.playState})));
async function expectHeld(page){
 await page.locator('.city-night').evaluate(node=>Promise.all(node.getAnimations({subtree:true}).map(a=>a.ready)));
 const before=await skyTimes(page);
 expect(before.length).toBeGreaterThan(0);
 await page.waitForTimeout(180);
 expect(await skyTimes(page)).toEqual(before);
 expect(before.every(a=>a.state==='paused')).toBe(true);
}

test('the night sky loops after the cards finish and freezes with the motion control',async({page},testInfo)=>{
 test.skip(testInfo.project.name==='phone-reduced-motion','Covered by the static-sky test');
 await reachNight(page);
 await expect(page.locator('.city-night')).toHaveAttribute('aria-hidden','true');
 expect(await page.locator('.city-night').evaluate(node=>node.getAnimations({subtree:true}).every(a=>a.effect.getTiming().iterations===Infinity))).toBe(true);
 await page.locator('[data-city-play]').click();
 await expectHeld(page);
 // Sample the actual rendered meteor in two cycles, including its quiet interval.
 const meteor=page.locator('.city-meteor--one');
 const sample=milliseconds=>meteor.evaluate((node,time)=>{node.getAnimations()[0].currentTime=time;return {opacity:Number(getComputedStyle(node).opacity),transform:getComputedStyle(node).transform};},milliseconds);
 const first=await sample(1400),next=await sample(18400),quiet=await sample(8000);
 expect(first.opacity).toBeGreaterThan(.2);expect(next).toEqual(first);expect(quiet.opacity).toBe(0);
 await page.locator('[data-city-play]').click();
 await expect.poll(async()=>(await skyTimes(page)).every(a=>a.state==='running')).toBe(true);
 await expect(page.locator('[data-city-showcase][data-active=true]')).toHaveCount(0);
});

test('night effects survive rapid replay and pause, offscreen suspension, and page backgrounding',async({page},testInfo)=>{
 test.skip(testInfo.project.name==='phone-reduced-motion','Motion is disabled');
 await reachNight(page);
 await page.evaluate(()=>{for(let i=0;i<12;i++){document.querySelector('[data-city-replay]').click();document.querySelector('[data-city-play]').click();}});
 await expect(page.locator('#city-film')).toHaveJSProperty('paused',true);
 await expect(page.locator(rootSelector)).not.toHaveClass(/is-city-complete/);
 expect(await page.locator('.city-night').evaluate(node=>node.getAnimations({subtree:true}).length)).toBe(0);
 await page.locator('[data-city-play]').click();
 await expect(page.locator(rootSelector)).toHaveAttribute('data-city-beat','ambient');
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
 await expectHeld(page);
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
 await expect(page.locator(rootSelector)).toHaveAttribute('data-city-state','playing');
 await page.locator('footer').scrollIntoViewIfNeeded();
 await expect(page.locator(rootSelector)).toHaveAttribute('data-city-state','paused');
 await expectHeld(page);
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
 await expect(page.locator(rootSelector)).toHaveAttribute('data-city-state','playing');
});

test('reduced motion has a static moon and star map with no shooting stars',async({page},testInfo)=>{
 try {
  if(testInfo.project.name==='phone-reduced-motion')await page.goto('/?qa=1');
  else {await reachNight(page);await page.emulateMedia({reducedMotion:'reduce'});}
  await expect(page.locator('[data-city-play]')).toBeDisabled();
  expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  expect(await page.locator('.city-night').evaluate(node=>node.getAnimations({subtree:true}).length)).toBe(0);
  expect(await page.locator('.city-meteor').evaluateAll(nodes=>nodes.every(node=>getComputedStyle(node).opacity==='0'))).toBe(true);
  await expect(page.locator('.city-moon')).toBeVisible();
  await expect(page.locator('#city-film')).not.toHaveAttribute('src',/./);
 } finally {
  const state=await page.evaluate(()=>{
   const root=document.querySelector('[data-living-city]'),video=document.querySelector('#city-film'),button=document.querySelector('[data-city-play]');
   return {reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,visibility:document.visibilityState,cityState:root?.dataset.cityState,cityBeat:root?.dataset.cityBeat,buttonDisabled:button?.disabled,buttonLabel:button?.textContent,video:video&&{paused:video.paused,readyState:video.readyState,networkState:video.networkState,hasSource:video.hasAttribute('src')}};
  });
  await testInfo.attach('reduced-motion-state',{body:JSON.stringify(state,null,2),contentType:'application/json'});
 }
});

test('failed moon and film assets keep the homepage copy and project navigation usable',async({page},testInfo)=>{
 await page.route(/\/crescent-moon\.webp(?:\?.*)?$/,route=>route.abort('failed'));
 await page.route(/\/living-city\/[^/?]+\.mp4(?:\?.*)?$/,route=>route.abort('failed'));
 await page.goto('/?qa=1');
 if(testInfo.project.name!=='phone-reduced-motion'){
  if(page.viewportSize().width<=1023)await page.locator('[data-city-play]').click();
  await expect(page.locator(rootSelector)).toHaveAttribute('data-city-state','error');
  await expect(page.locator('[data-city-play]')).toHaveAccessibleName('Retry motion');
 }
 await expect(page.getByRole('heading',{name:'Web design & SEO. Built for small businesses.'})).toBeVisible();
 await expect(page.locator('.city-location')).toHaveText('Websites from $1,400. Serving businesses online across 21 states and Washington, DC.');
 await expect(page.locator('.home-starting-points')).toContainText('From $1,400');
 await expect(page.locator('#seo-services')).toContainText('From $400/month');await expect(page.locator('#seo-services')).toContainText('Useful content and researched website improvements');
 await expect(page.locator('.home-choice-grid>article')).toHaveCount(3);
 for(const card of await page.locator('.home-choice-grid>article').all()){await expect(card.locator('a')).toHaveCount(1);await expect(card.locator('.starting-price')).toHaveCount(1);}
 await expect(page.locator('.home-faq')).toContainText('You own the custom website work once it is paid for');
 await page.getByRole('tab',{name:'Northline',exact:true}).click();
 await expect(page.locator('#city-panel-northline')).toBeVisible();
 await expect(page.locator('#city-panel-northline a[data-city-project-link]').first()).toHaveAttribute('href','/work/northline/');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
