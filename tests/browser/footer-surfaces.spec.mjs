import {test,expect} from './fixtures.mjs';

test('footer destinations are visible and keyboard reachable without opening disclosures',async({page})=>{
 await page.goto('/?qa=1');
 const footer=page.locator('footer.site-footer--compact');await footer.scrollIntoViewIfNeeded();
 await expect(footer.locator('.footer-location')).toHaveText('Based in Buffalo.');
 await expect(footer.locator('[data-chat-open],a[href="#page-top"],a[href^="mailto:"]')).toHaveCount(0);
 const groups=footer.locator('section.footer-group');await expect(groups).toHaveCount(3);
 for(const [index,label]of ['Studio','Services','Information'].entries()){
  const group=groups.nth(index);
  await expect(group.locator('h2')).toHaveText(label);
  await expect(group.locator('a').first()).toBeVisible();
  await group.locator('a').first().focus();await page.keyboard.press('Tab');await expect(group.locator('a').nth(1)).toBeFocused();
 }
 await expect(footer.locator('a')).toHaveCount(19);
 for(const path of ['/areas/','/payments/','/privacy/','/terms/','/accessibility/'])await expect(footer.locator(`a[href="${path}"]`)).toBeVisible();
 expect(await footer.evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(1000);
});

test('section surfaces alternate without covering text or expanding the viewport',async({page})=>{
 for(const path of ['/','/pricing/','/services/web-design/','/work/','/areas/new-york/','/guides/ai-search-visibility/']){
  await page.goto(path+'?qa=1');await page.evaluate(()=>document.fonts.ready);
  const result=await page.evaluate(()=>{
   const candidates=[...document.querySelectorAll('main>section:nth-of-type(even):not(.civic-hero,.living-city-hero),.home-content>section:nth-of-type(even)')];
   return {width:innerWidth,scroll:document.documentElement.scrollWidth,guideSections:[...document.querySelectorAll('.journal-prose>section')].map(el=>getComputedStyle(el,'::before').content),surfaces:candidates.map(el=>({closing:el.matches('.home-content>.studio-closing,.studio-closing--night'),background:getComputedStyle(el,'::before').backgroundColor,pointerEvents:getComputedStyle(el,'::before').pointerEvents,zIndex:getComputedStyle(el,'::before').zIndex}))};
  });
  expect(result.scroll,path).toBeLessThanOrEqual(result.width+1);expect(result.surfaces.length+result.guideSections.length,path).toBeGreaterThan(0);
  // Guide tints identify decisions and worked examples; prose has no alternating bands.
  for(const content of result.guideSections)expect(content,path).toBe('none');
  for(const surface of result.surfaces){expect(surface.closing?['rgb(5, 43, 59)']:['rgb(238, 241, 233)','rgb(241, 238, 230)']).toContain(surface.background);expect(surface.pointerEvents).toBe('none');expect(surface.zIndex).toBe('-1');}
 }
});

test('enlarged text keeps section backgrounds and footer labels within the page',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','One complete text-resize matrix');
 await page.route('**/__test-footer-text.css',route=>route.fulfill({contentType:'text/css',body:':root{font-size:200%}'}));
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1000});await page.goto('/?qa=1');await page.evaluate(()=>document.fonts.ready);
  await page.addStyleTag({url:'/__test-footer-text.css'});
  const layout=await page.evaluate(()=>({
   pageWidth:document.documentElement.scrollWidth,
   clipped:[...document.querySelectorAll('footer h2,footer a')].filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.textContent.trim())
  }));
  expect(layout.pageWidth,`${width}px at 200% text`).toBeLessThanOrEqual(width+1);
  expect(layout.clipped,`${width}px footer text`).toEqual([]);
 }
});
