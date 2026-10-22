import {test,expect} from '../browser/fixtures.mjs';
import {fileURLToPath} from 'node:url';

const contentOnly={stylePath:fileURLToPath(new URL('./content-only.css',import.meta.url))};

async function settle(page){
 const city=page.locator('[data-living-city]');
 if(await city.count()){
  await expect(city).toHaveAttribute('data-city-ready','true');
  await expect(city).toHaveAttribute('data-city-state','reduced');
 }
 await page.evaluate(async()=>{
  document.querySelectorAll('img').forEach(img=>img.loading='eager');
  document.querySelectorAll('video').forEach(video=>video.pause());
  await document.fonts.ready;
  await Promise.all([...document.images].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});setTimeout(resolve,7000);})));
  await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 });
 await page.mouse.move(0,0);
}
for(const [name,path] of [
 ['home','/'],['pricing','/pricing/'],['web-design','/services/web-design/'],
 ['monthly-seo','/services/seo/'],['care','/services/website-care/'],
 ['work','/work/'],['contact','/contact/'],['scope-request','/checkout/focused-site/'],
 ['guide','/guides/ai-search-visibility/'],['county','/areas/erie-county/'],
 ['about','/about/'],['concept','/work/fieldwork/'],
 ['regional-directory','/areas/virginia/'],['district-directory','/areas/district-of-columbia/']
]){
 test(`${name} approved layout`,async({page})=>{
  const response=await page.goto(path+'?qa=1');expect(response.status()).toBe(200);await settle(page);
  await expect(page).toHaveScreenshot(name+'.png',{fullPage:true});
 });
}

test('county entry preserves readable local facts and place lists',async({page})=>{
 await page.goto('/areas/new-york/?qa=1#monroe');await settle(page);
 const entry=page.locator('#monroe');await expect(entry).toHaveAttribute('open','');
  await expect(entry).toHaveScreenshot('county-entry.png',contentOnly);
});
test('footer collapsed and expanded layouts',async({page})=>{
 await page.goto('/?qa=1');await settle(page);const footer=page.locator('footer.site-footer--compact');await footer.scrollIntoViewIfNeeded();
 await expect(footer).toHaveScreenshot('footer-closed.png',contentOnly);
 for(const summary of await footer.locator('summary').all())await summary.click();
 await expect(footer).toHaveScreenshot('footer-open.png',contentOnly);
});
