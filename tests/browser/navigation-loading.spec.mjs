import {test,expect} from './fixtures.mjs';

test('a slow navigation script does not move already-visible page content',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>{
  window.navigationLayoutShift=0;
  new PerformanceObserver(list=>{
   for(const entry of list.getEntries()){
    if(!entry.hadRecentInput&&entry.sources.some(source=>source.node?.id==='main'))window.navigationLayoutShift+=entry.value;
   }
  }).observe({type:'layout-shift',buffered:true});
 });
 // Delay only the shared navigation resource so a deferred implementation
 // paints its tall native fallback before collapsing it over the page.
 await page.route('**/assets/site-navigation.js*',async route=>{
  await new Promise(resolve=>setTimeout(resolve,500));await route.continue();
 });
 for(const path of ['/','/pricing/','/payments/','/guides/website-content-template/']){
  await page.goto(path+'?qa=1');
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  await expect(page.locator('html')).toHaveClass(/nav-ready/);
  expect(await page.evaluate(()=>window.navigationLayoutShift),path).toBeLessThan(.005);
  await page.locator('.menu-toggle').click();
  await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('Escape');
  await expect(page.locator('.menu-toggle')).toBeFocused();
 }
});

test('navigation resource failure leaves native links and disclosures usable',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route('**/assets/site-navigation.js*',route=>route.abort('failed'));
 for(const path of ['/','/pricing/']){
  await page.goto(path+'?qa=1');
  await expect(page.locator('html')).not.toHaveClass(/nav-ready/);
  const links=page.locator('#main-nav > a');await expect(links).toHaveCount(6);
  for(const link of await links.all())await expect(link).toBeVisible();
  const services=page.locator('.service-navigation');
  await services.locator('summary').click();
  await expect(services.locator('a').first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 }
});
