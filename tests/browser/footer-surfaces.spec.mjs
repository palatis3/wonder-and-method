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
 await expect(footer.locator('a')).toHaveCount(46);
 for(const state of ['georgia','mississippi','alabama','wisconsin','illinois'])await expect(footer.locator('a[href="/areas/'+state+'/"]')).toHaveCount(1);
 expect(await footer.evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(520);
});

test('section surfaces alternate without covering text or expanding the viewport',async({page})=>{
 for(const path of ['/','/pricing/','/services/web-design/','/work/','/areas/new-york/','/guides/ai-search-visibility/']){
  await page.goto(path+'?qa=1');await page.evaluate(()=>document.fonts.ready);
  const result=await page.evaluate(()=>{
   const candidates=[...document.querySelectorAll('main>section:nth-of-type(even):not(.civic-hero,.living-city-hero),.home-content>section:nth-of-type(even),.journal-prose>section:nth-of-type(even)')];
   return {width:innerWidth,scroll:document.documentElement.scrollWidth,surfaces:candidates.map(el=>({closing:el.matches('.home-content>.studio-closing'),background:getComputedStyle(el,'::before').backgroundColor,pointerEvents:getComputedStyle(el,'::before').pointerEvents,zIndex:getComputedStyle(el,'::before').zIndex}))};
  });
  expect(result.scroll,path).toBeLessThanOrEqual(result.width+1);expect(result.surfaces.length,path).toBeGreaterThan(0);
  for(const surface of result.surfaces){expect(surface.closing?['rgb(5, 43, 59)']:['rgb(238, 241, 233)','rgb(241, 238, 230)']).toContain(surface.background);expect(surface.pointerEvents).toBe('none');expect(surface.zIndex).toBe('-1');}
 }
});

test('enlarged text keeps section backgrounds and footer labels within the page',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','One complete text-resize matrix');
 await page.route('**/__test-footer-text.css',route=>route.fulfill({contentType:'text/css',body:':root{font-size:200%}'}));
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1000});await page.goto('/?qa=1');await page.evaluate(()=>document.fonts.ready);
  await page.addStyleTag({url:'/__test-footer-text.css'});
  for(const summary of await page.locator('footer summary').all())await summary.click();
  const layout=await page.evaluate(()=>({
   pageWidth:document.documentElement.scrollWidth,
   clipped:[...document.querySelectorAll('footer summary,footer a')].filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.textContent.trim())
  }));
  expect(layout.pageWidth,`${width}px at 200% text`).toBeLessThanOrEqual(width+1);
  expect(layout.clipped,`${width}px footer text`).toEqual([]);
 }
});
