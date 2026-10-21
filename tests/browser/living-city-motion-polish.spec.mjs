import {test,expect} from './fixtures.mjs';

test('stars visibly twinkle in a loop and obey pause and reduced motion',async({page},testInfo)=>{
 await page.goto('/?qa=1');
 const stars=page.locator('.city-star');
 await expect(stars).toHaveCount(18);
 await expect(page.locator('.city-stars')).toHaveAttribute('aria-hidden','true');
 if(testInfo.project.name==='phone-reduced-motion'){
  expect(await stars.evaluateAll(nodes=>nodes.every(node=>node.getAnimations().length===0))).toBe(true);
  return;
 }
 await expect(page.locator('[data-living-city]')).toHaveAttribute('data-city-state','playing');
 const sample=()=>stars.evaluateAll(nodes=>nodes.map(node=>({opacity:Number(getComputedStyle(node).opacity),time:node.getAnimations()[0]?.currentTime,state:node.getAnimations()[0]?.playState,iterations:node.getAnimations()[0]?.effect.getTiming().iterations})));
 const first=await sample();
 await expect.poll(async()=>{const next=await sample();return next.some((star,index)=>Math.abs(star.opacity-first[index].opacity)>.4);}).toBe(true);
 expect(first.every(star=>star.iterations===Infinity&&star.state==='running')).toBe(true);
 await page.locator('[data-city-play]').click();
 await stars.evaluateAll(nodes=>Promise.all(nodes.flatMap(node=>node.getAnimations().map(animation=>animation.ready))));
 const held=await sample();
 await page.waitForTimeout(250);
 const paused=await sample();
 expect(paused.map(star=>star.time)).toEqual(held.map(star=>star.time));
 expect(paused.every(star=>star.state==='paused')).toBe(true);
 await page.locator('[data-city-play]').click();
 await expect.poll(async()=>{const next=await sample();return next.every((star,index)=>star.time>paused[index].time);}).toBe(true);
});

test('card entrances settle into crisp text and pause their entire animation',async({page},testInfo)=>{
 test.skip(testInfo.project.name==='phone-reduced-motion','The tour is disabled when reduced motion is requested');
 await page.goto('/?qa=1');
 const card=page.locator('[data-city-showcase=fieldwork]');
 await expect(card).toHaveAttribute('data-active','true');
 await page.locator('[data-city-play]').click();
 expect(await card.evaluate(node=>node.getAnimations({subtree:true}).every(animation=>animation.playState!=='running'))).toBe(true);
 await page.locator('[data-city-play]').click();
 await expect.poll(()=>card.evaluate(node=>getComputedStyle(node).transform)).toBe('none');
 await expect.poll(()=>card.locator('h2').evaluate(node=>getComputedStyle(node).transform)).toBe('none');
 await page.locator('[data-city-play]').click();
 const bounds=await card.evaluate(node=>{const rect=node.getBoundingClientRect();return {inside:rect.left>=0&&rect.right<=innerWidth,opaque:getComputedStyle(node).opacity};});
 expect(bounds).toEqual({inside:true,opaque:'1'});
});

test('keyboard focus during an entrance reveals the complete card before holding it',async({page},testInfo)=>{
 test.skip(testInfo.project.name==='phone-reduced-motion','The tour is disabled when reduced motion is requested');
 await page.goto('/?qa=1');
 const card=page.locator('[data-city-showcase=fieldwork]');
 await expect(card).toHaveAttribute('data-active','true');
 await card.locator('a').focus();
 await expect(page.locator('#city-film')).toHaveJSProperty('paused',true);
 await expect(card.locator('a')).toBeFocused();
 const visible=()=>card.evaluate(node=>[node,...node.querySelectorAll('.city-reveal-copy>*')].every(element=>getComputedStyle(element).opacity==='1'&&getComputedStyle(element).transform==='none'));
 expect(await visible()).toBe(true);
 await page.keyboard.press('Tab');
 await expect(card.locator('a')).not.toBeFocused();
 expect(await visible()).toBe(true);
 await expect(page.locator('#city-film')).toHaveJSProperty('paused',true);
});
