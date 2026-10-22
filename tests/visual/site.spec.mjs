import {test,expect} from '../browser/fixtures.mjs';

async function settle(page){
 await page.evaluate(async()=>{
  document.querySelectorAll('img').forEach(img=>img.loading='eager');
  document.querySelectorAll('video').forEach(video=>video.pause());
  await document.fonts.ready;
  await Promise.all([...document.images].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});setTimeout(resolve,7000);}))); 
 });
 await page.mouse.move(0,0);
}
for(const [name,path] of [
 ['home','/'],['pricing','/pricing/'],['web-design','/services/web-design/'],
 ['monthly-seo','/services/seo/'],['care','/services/website-care/'],
 ['work','/work/'],['contact','/contact/'],['scope-request','/checkout/focused-site/'],
 ['guide','/guides/ai-search-visibility/'],['county','/areas/erie-county/'],
 ['about','/about/'],['concept','/work/fieldwork/']
]){
 test(`${name} approved layout`,async({page})=>{
  const response=await page.goto(path+'?qa=1');expect(response.status()).toBe(200);await settle(page);
  await expect(page).toHaveScreenshot(name+'.png',{fullPage:true});
 });
}
test('footer collapsed and expanded layouts',async({page})=>{
 await page.goto('/?qa=1');await settle(page);const footer=page.locator('footer.site-footer--compact');await footer.scrollIntoViewIfNeeded();
 const footerOnly={style:'.site-header,.back-to-top,.support-chat{visibility:hidden!important}'};
 await expect(footer).toHaveScreenshot('footer-closed.png',footerOnly);
 for(const summary of await footer.locator('summary').all())await summary.click();
 await expect(footer).toHaveScreenshot('footer-open.png',footerOnly);
});
