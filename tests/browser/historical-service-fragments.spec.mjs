import {test,expect} from './fixtures.mjs';

test('historical service bookmarks reach visible content on direct pages and shared destinations',async({page})=>{
 test.setTimeout(120_000);
 const shared=['coverage','local-planning','next','questions','search-plan','services'];
 for(const [from,to,fragments] of [
  ['/areas/albany-county/','/areas/albany-county/',shared],
  ['/areas/new-york/albany-county/','/areas/albany-county/',shared],
  ['/areas/connecticut/lower-connecticut-river-valley-planning-region/','/areas/connecticut/lower-connecticut-river-valley-planning-region/',shared],
  ['/areas/maryland/baltimore-city/','/areas/maryland/baltimore-area/',shared],
  ['/areas/maryland/baltimore-county/','/areas/maryland/baltimore-area/',shared],
  ['/areas/new-york/erie-county/','/areas/erie-county/',['buyer-task','choose-a-service','coverage','local-questions','remote-project','service-areas','start-a-project']]
 ])for(const fragment of fragments){
  // A fresh document request checks response status and native fragment scrolling;
  // navigating only between hashes in one document would return no response.
  await page.goto('about:blank');
  const response=await page.goto(from+'?qa=1&utm_source=bookmark#'+fragment);
  expect(response.status()).toBe(200);
  await expect(page).toHaveURL(url=>url.pathname===to&&url.search==='?qa=1&utm_source=bookmark'&&url.hash==='#'+fragment);
  const target=page.locator('#'+fragment);
  await expect(target).toBeVisible();await expect(target).not.toBeEmpty();
  await expect(target).toBeInViewport();
  const position=await target.evaluate(element=>({top:element.getBoundingClientRect().top,headerBottom:document.querySelector('.site-header').getBoundingClientRect().bottom}));
  expect(position.top,from+'#'+fragment+' clears the sticky header').toBeGreaterThanOrEqual(position.headerBottom-1);
  expect((await target.innerText()).trim().length).toBeGreaterThan(20);
  if(fragment==='next')await expect(target.locator('a[href^="/contact/"]')).toHaveCount(1);
  if(fragment==='services')await expect(target.locator('a[href^="/pricing/"]').first()).toBeVisible();
  if(fragment==='coverage'&&to!=='/areas/erie-county/')await expect(target.locator('a[href^="/areas/"]').first()).toBeVisible();
  if(fragment==='questions')expect(await target.locator('li').count()).toBeGreaterThan(0);
 }
});
