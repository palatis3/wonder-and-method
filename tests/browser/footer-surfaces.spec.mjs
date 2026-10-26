import {test,expect} from './fixtures.mjs';
import {serviceStateInfo} from '../../src/assets/service-state-info.js';
test('compact footer retains keyboard access and every published area',async({page})=>{
 await page.goto('/?qa=1');const footer=page.locator('footer.site-footer--compact');await footer.scrollIntoViewIfNeeded();
 await expect(footer.locator('.footer-location')).toHaveText('Based in Buffalo.');
 const groups=footer.locator('details.footer-group');await expect(groups).toHaveCount(4);
 for(const [index,label]of ['Studio','Services','Areas','Information'].entries()){
  const group=groups.nth(index),summary=group.locator(':scope > summary');
  await expect(summary).toHaveText(label);await expect(group).toHaveCSS('border-radius','0px');await expect(group).toHaveCSS('background-image','none');
  expect(await summary.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  expect(await group.evaluate(el=>el.open)).toBe(page.viewportSize().width>=768);
  if(await group.evaluate(el=>el.open))await summary.click();
  await summary.focus();await page.keyboard.press('Enter');await expect(group).toHaveAttribute('open','');
  await page.keyboard.press('Tab');await expect(group.locator('a').first()).toBeFocused();
 }
 await groups.nth(2).locator('details > summary').click();
 const areas=groups.nth(2).locator('a');await expect(areas).toHaveCount(serviceStateInfo.length+1);
 expect(await areas.evaluateAll(links=>links.map(link=>({href:link.getAttribute('href'),name:link.textContent.trim()})))).toEqual([{href:'/areas/',name:'Service areas'},...serviceStateInfo.toSorted((a,b)=>a.name.localeCompare(b.name,'en')).map(state=>({href:'/areas/'+state.id+'/',name:state.name}))]);
 for(const path of ['/privacy/','/terms/','/payments/','/accessibility/'])await expect(groups.nth(3).locator('a[href="'+path+'"]')).toBeVisible();
 for(const path of ['/contact/#inquiry','/pricing/'])await expect(groups.nth(0).locator('a[href="'+path+'"]')).toBeVisible();
 await expect(footer.locator('.footer-essential')).toHaveCount(0);
 const destinations=await footer.locator('a[href]').evaluateAll(links=>links.map(link=>new URL(link.href).pathname));
 expect(new Set(destinations).size,'Each footer destination appears once').toBe(destinations.length);
});
test('semantic surfaces use the approved palette without tinting ordinary guide prose',async({page})=>{
 for(const path of ['/','/pricing/','/services/web-design/','/work/','/areas/new-york/','/guides/ai-search-visibility/']){
  await page.goto(path+'?qa=1');await page.evaluate(()=>document.fonts.ready);
  const result=await page.evaluate(()=>{
   const body=getComputedStyle(document.body);
   return {width:innerWidth,scroll:document.documentElement.scrollWidth,tokens:['--paper','--blue','--surface-sage','--surface-process','--surface-stone','--accent'].map(key=>body.getPropertyValue(key).trim()),guideSections:[...document.querySelectorAll('.journal-prose>section')].map(el=>getComputedStyle(el,'::before').content)};
  });
  expect(result.scroll,path).toBeLessThanOrEqual(result.width+1);
  expect(result.tokens).toEqual(['#f8f7f2','#334739','#edf0e8','#e7eef3','#f1eee6','#a34f2e']);
  for(const content of result.guideSections)expect(content,path).toBe('none');
 }
});
test('enlarged text keeps section backgrounds and footer labels within the page',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','One complete text-resize matrix');
 await page.route('**/__test-footer-text.css',route=>route.fulfill({contentType:'text/css',body:':root{font-size:200%}'}));
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1000});await page.goto('/?qa=1');await page.evaluate(()=>document.fonts.ready);await page.addStyleTag({url:'/__test-footer-text.css'});
  for(const details of await page.locator('footer details').all())if(!await details.evaluate(el=>el.open))await details.locator(':scope > summary').click();
  const layout=await page.evaluate(()=>({pageWidth:document.documentElement.scrollWidth,clipped:[...document.querySelectorAll('footer summary,footer a')].filter(el=>el.checkVisibility()&&el.scrollWidth>el.clientWidth+1).map(el=>el.textContent.trim())}));
  expect(layout.pageWidth,width+'px at 200% text').toBeLessThanOrEqual(width+1);expect(layout.clipped).toEqual([]);
 }
});
