import {test,expect} from './fixtures.mjs';

test('compact footer preserves every group and works by keyboard',async({page})=>{
 await page.goto('/?qa=1');
 const footer=page.locator('footer.site-footer--compact');await footer.scrollIntoViewIfNeeded();
 await expect(footer.locator('.footer-location')).toHaveText('Based in Buffalo.');
 await expect(footer.locator('[data-chat-open],a[href="#page-top"],a[href^="mailto:"]')).toHaveCount(0);
 const groups=footer.locator('details.footer-group');await expect(groups).toHaveCount(4);
 for(const [index,label]of ['Studio','Services','Areas','Information'].entries()){
  const group=groups.nth(index),summary=group.locator('summary');
  await expect(summary).toHaveText(label);await expect(group).not.toHaveAttribute('open','');
  await expect(group.locator('a').first()).toBeHidden();
  await summary.focus();await page.keyboard.press('Enter');await expect(group).toHaveAttribute('open','');
  await expect(group.locator('a').first()).toBeVisible();await page.keyboard.press('Tab');await expect(group.locator('a').first()).toBeFocused();
  await summary.focus();await page.keyboard.press('Space');await expect(group).not.toHaveAttribute('open','');
 }
 await expect(footer.locator('a')).toHaveCount(31);
 expect(await footer.evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(520);
});

test('section surfaces alternate without covering text or expanding the viewport',async({page})=>{
 for(const path of ['/','/pricing/','/services/web-design/','/work/','/areas/new-york/','/guides/ai-search-visibility/']){
  await page.goto(path+'?qa=1');await page.evaluate(()=>document.fonts.ready);
  const result=await page.evaluate(()=>{
   const candidates=[...document.querySelectorAll('main>section:nth-of-type(even):not(.civic-hero,.living-city-hero),.home-content>section:nth-of-type(even),.journal-prose>section:nth-of-type(even)')];
   return {width:innerWidth,scroll:document.documentElement.scrollWidth,surfaces:candidates.map(el=>({background:getComputedStyle(el,'::before').backgroundColor,pointerEvents:getComputedStyle(el,'::before').pointerEvents,zIndex:getComputedStyle(el,'::before').zIndex}))};
  });
  expect(result.scroll,path).toBeLessThanOrEqual(result.width+1);expect(result.surfaces.length,path).toBeGreaterThan(0);
  for(const surface of result.surfaces){expect(['rgb(238, 241, 233)','rgb(241, 238, 230)']).toContain(surface.background);expect(surface.pointerEvents).toBe('none');expect(surface.zIndex).toBe('-1');}
 }
});
