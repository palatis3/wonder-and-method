import {test,expect} from './fixtures.mjs';
import {serviceStateInfo} from '../../src/assets/service-state-info.js';

test('four illustrated footer disclosures retain services and every published area',async({page})=>{
 await page.goto('/?qa=1');const footer=page.locator('footer.site-footer--compact');await footer.scrollIntoViewIfNeeded();
 await expect(footer.locator('.footer-location')).toHaveText('Based in Buffalo.');
 const groups=footer.locator('details.footer-group');await expect(groups).toHaveCount(4);
 for(const [index,label]of ['Studio','Services','Areas','Information'].entries()){
  const group=groups.nth(index),summary=group.locator('summary');
  await expect(summary).toHaveText(label);await expect(summary.locator('svg')).toHaveCount(2);
  // Guard the approved visual treatment as well as link presence. A plain
  // heading list must fail CI even if all destinations survive the change.
  await expect(group).toHaveCSS('border-radius','18px');
  expect(await group.evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('linear-gradient');
  expect(await summary.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(112);
  await expect(summary.locator('.footer-section-icon')).toHaveCSS('border-radius','50%');
  expect(await summary.locator('.footer-section-label').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(20);
  await expect(summary.locator('.footer-chevron')).toHaveCSS('border-radius','50%');
  await summary.focus();await page.keyboard.press('Enter');await expect(group).toHaveAttribute('open','');
  await page.keyboard.press('Tab');await expect(group.locator('a').first()).toBeFocused();
 }
 await expect(groups.nth(2).locator('a[href="/areas/"]')).toBeVisible();
 await expect(groups.nth(2).locator('a[href="/areas/new-york/"]')).toBeVisible();
 const areas=groups.nth(2).locator('a');await expect(areas).toHaveCount(serviceStateInfo.length+1);
 expect(await areas.evaluateAll(links=>links.map(link=>({href:link.getAttribute('href'),name:link.textContent.trim()})))).toEqual([{href:'/areas/',name:'Service areas'},...serviceStateInfo.toSorted((a,b)=>a.name.localeCompare(b.name,'en')).map(state=>({href:`/areas/${state.id}/`,name:state.name}))]);
 for(const path of ['/payments/','/privacy/','/terms/','/accessibility/'])await expect(footer.locator(`a[href="${path}"]`)).toBeVisible();
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
  for(const summary of await page.locator('footer details summary').all())await summary.click();
  const layout=await page.evaluate(()=>({
   pageWidth:document.documentElement.scrollWidth,
   clipped:[...document.querySelectorAll('footer summary,footer a')].filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.textContent.trim())
  }));
  expect(layout.pageWidth,`${width}px at 200% text`).toBeLessThanOrEqual(width+1);
  expect(layout.clipped,`${width}px footer text`).toEqual([]);
 }
});
