import {test,expect} from './fixtures.mjs';

// The regular browser suite runs in GitHub's mandatory technical check. Exercise
// a real resize while scrolled; an initial-load screenshot misses this failure.
const sizes=[[1440,900],[1200,520],[1200,500],[1024,480],[1023,480],[900,360],[768,320],[390,500],[1440,900]];
const reachable=async locator=>{
 await expect(locator).toBeVisible();
 await expect.poll(()=>locator.evaluate(el=>{
  const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
  return r.top>=-1&&r.left>=-1&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1&&!!hit&&el.contains(hit);
 })).toBe(true);
};

for(const path of ['/','/pricing/','/services/web-design/','/areas/michigan/','/contact/','/guides/service-area-pages/']){
 test(`desktop header survives width and height changes while scrolled: ${path}`,async({page,isMobile})=>{
  test.skip(isMobile,'Desktop pointer and resizable-window regression');
  await page.goto(path+'?qa=1');await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>scrollTo({top:900,behavior:'instant'}));
  const header=page.locator('.site-header'),brand=header.locator('.wordmark');
  for(const [width,height] of sizes){
   await page.setViewportSize({width,height});
   await expect.poll(()=>header.evaluate(el=>{
    const r=el.getBoundingClientRect();return /^(sticky|fixed)$/.test(getComputedStyle(el).position)&&Math.abs(r.top)<=1&&r.bottom<=innerHeight&&scrollY>100;
   }),{message:`${path} header remains pinned at ${width}×${height}`}).toBe(true);
   await reachable(brand);
   await reachable(width>=1024?header.locator('.service-navigation > summary'):header.locator('.menu-toggle'));
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
 });
}

test('short desktop menus scroll and recover across the navigation breakpoint',async({page,isMobile})=>{
 test.skip(isMobile,'Desktop resize and keyboard navigation');
 await page.goto('/pricing/?qa=1');await page.evaluate(()=>scrollTo({top:900,behavior:'instant'}));
 await page.setViewportSize({width:1200,height:320});
 const summary=page.locator('.service-navigation > summary'),services=page.locator('.service-navigation');
 await reachable(summary);await summary.click();
 const links=services.locator('.service-links a');
 // Tab through every service so the native scroll container must reveal each.
 await summary.focus();
 for(let index=0;index<await links.count();index++){
  await page.keyboard.press('Tab');await expect(links.nth(index)).toBeFocused();await reachable(links.nth(index));
 }
 await page.keyboard.press('Escape');await expect(summary).toBeFocused();
 await page.setViewportSize({width:900,height:480});
 const menu=page.locator('.menu-toggle');await reachable(menu);await menu.click();
 await expect(menu).toHaveAttribute('aria-expanded','true');
 await page.setViewportSize({width:1440,height:900});
 await expect(menu).toHaveAttribute('aria-expanded','false');
 await expect(page.locator('body')).not.toHaveClass(/menu-open/);
 await reachable(page.locator('#main-nav > a[href="/contact/#inquiry"]'));
 await page.evaluate(()=>scrollBy({top:200,behavior:'instant'}));await reachable(summary);
});
