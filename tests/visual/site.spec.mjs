import {test,expect} from '../browser/fixtures.mjs';
import {readFileSync} from 'node:fs';

const contentOnlyCss=readFileSync(new URL('./content-only.css',import.meta.url),'utf8');
async function isolateContent(page){
 // The real CSP blocks screenshot APIs' inline styles. Serve a test-only
 // same-origin stylesheet, and verify it applied before capturing the element.
 await page.route('**/__visual-content-only.css',route=>route.fulfill({contentType:'text/css',body:contentOnlyCss}));
 await page.addStyleTag({url:'/__visual-content-only.css'});
 await expect(page.locator('.site-header')).toBeHidden();
}

async function settle(page){
 const city=page.locator('[data-living-city]');
 if(await city.count()){
  await expect(city).toHaveAttribute('data-city-ready','true');
  await expect(city).toHaveAttribute('data-city-state','reduced');
 }
 const broken=await page.evaluate(async()=>{
  document.querySelectorAll('img').forEach(img=>img.loading='eager');
  document.querySelectorAll('video').forEach(video=>video.pause());
  await document.fonts.ready;
  await Promise.all([...document.images].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});setTimeout(resolve,7000);})));
  await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  return [...document.images].filter(img=>img.getClientRects().length&&(!img.complete||!img.naturalWidth)).map(img=>img.currentSrc||img.src);
 });
 expect(broken,'Visible images must load before accepting a visual baseline').toEqual([]);
 await page.mouse.move(0,0);
}
for(const [name,path] of [
 ['home','/'],['services','/services/'],['pricing','/pricing/'],['web-design','/services/web-design/'],
 ['monthly-seo','/services/seo/'],['care','/services/website-care/'],
 ['work','/work/'],['contact','/contact/'],['scope-request','/checkout/focused-site/'],
 ['guide','/guides/ai-search-visibility/'],['county','/areas/erie-county/'],
 ['about','/about/'],['concept','/work/fieldwork/'],
 ['regional-directory','/areas/virginia/'],['district-directory','/areas/district-of-columbia/'],['texas-county','/areas/texas/milam-county/']
]){
 test(`${name} approved layout`,async({page})=>{
  const response=await page.goto(path+'?qa=1');expect(response.status()).toBe(200);await settle(page);
  await expect(page).toHaveScreenshot(name+'.png',{fullPage:true});
 });
}

test('county entry preserves readable local facts and place lists',async({page})=>{
 await page.goto('/areas/new-york/?qa=1#monroe');await settle(page);
 const entry=page.locator('#monroe');await expect(entry).toHaveAttribute('open','');
  await isolateContent(page);await expect(entry).toHaveScreenshot('county-entry.png');
});

for(const [name,path,scrollTop] of [['floating-tools-home','/',0],['floating-tools-content','/areas/texas/milam-county/',600]]){
 test(`${name} use the approved desktop corner or phone help row`,async({page})=>{
  await page.goto(path+'?qa=1');await settle(page);
  await page.evaluate(async y=>{scrollTo({top:y,behavior:'instant'});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));},scrollTop);
  if(page.viewportSize().width<=767)await page.locator('.support-chat-launch').scrollIntoViewIfNeeded();
  await expect(page.locator('.support-chat-launch')).toBeVisible();
  await expect(page.locator('.support-chat')).toHaveCSS('position',page.viewportSize().width<=767?'static':'fixed');
  if(scrollTop>=520)await expect(page.locator('.back-to-top')).toBeVisible();
  await expect(page).toHaveScreenshot(name+'.png');
 });
}
test('Georgia entry preserves government and place distinctions',async({page})=>{
 await page.goto('/areas/georgia/?qa=1#richmond');await settle(page);
 const entry=page.locator('#richmond');await expect(entry).toHaveAttribute('open','');
 await isolateContent(page);await expect(entry).toHaveScreenshot('georgia-entry.png');
});
for(const [state,county] of [['mississippi','yalobusha'],['alabama','madison'],['wisconsin','menominee'],['illinois','alexander'],['texas','anderson']]){
 test(`${state} entry preserves place classifications`,async({page})=>{
  await page.goto(`/areas/${state}/?qa=1#${county}`);await settle(page);
  const entry=page.locator('#'+county);await expect(entry).toHaveAttribute('open','');
  await isolateContent(page);await expect(entry).toHaveScreenshot(state+'-entry.png');
 });
}
for(const [name,path] of [['service-questions','/services/web-design/'],['county-questions','/areas/massachusetts/barnstable-county/']]){
 test(`${name} expanded answers remain readable`,async({page})=>{
  await page.goto(path+'?qa=1');await settle(page);
  const section=page.locator('#service-questions');
  for(const summary of await section.locator('summary').all())await summary.click();
  for(const details of await section.locator('details').all())await expect(details).toHaveAttribute('open','');
  await isolateContent(page);await expect(section).toHaveScreenshot(name+'.png');
 });
}
test('footer collapsed and expanded layouts',async({page})=>{
 await page.goto('/?qa=1');await settle(page);const footer=page.locator('footer.site-footer--compact');await footer.scrollIntoViewIfNeeded();
 const groups=footer.locator('nav[aria-label="Footer"] > details.footer-group');
 await expect(groups).toHaveCount(4);await expect(footer.locator('summary')).toHaveCount(5);
 await expect(footer.locator('details.footer-group[open]')).toHaveCount(page.viewportSize().width>=768?4:0);
 for(const group of await groups.all())if(await group.getAttribute('open')!==null)await group.locator(':scope > summary').click();
 await isolateContent(page);await expect(footer).toHaveScreenshot('footer-closed.png');
 for(const group of await groups.all())await group.locator(':scope > summary').click();
 await footer.locator('.footer-area-directories > summary').click();
 await expect(footer.locator('details[open]')).toHaveCount(5);
 await expect(footer).toHaveScreenshot('footer-open.png');
});
