import {directorySearch} from './directory-search.mjs';
import {test,expect} from './fixtures.mjs';

const areaIdentity=href=>{
 const url=new URL(href,'http://127.0.0.1:4187');
 const parts=url.pathname.split('/').filter(Boolean);
 return parts[1]+'/'+(url.hash?url.hash.slice(1):parts[2].replace(/-county$/,''));
};

test('Missouri finder keeps St. Louis City separate from the county and retains all Kansas City counties',async({page},testInfo)=>{
 await page.goto('/areas/missouri/?qa=1');
 const search=directorySearch(page),results=page.locator('[data-county-results] li');
 await expect(page.locator('[data-cs]')).toHaveCount(115);
 const requests=[];page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))requests.push(r.url());});
 for(const directory of ['/areas/missouri/','/areas/']){
 await page.goto(directory+'?qa=1');
 for(const [query,expected] of [
  ['St. Louis city MO',['missouri/st-louis-city']],
  ['St. Louis county MO',['missouri/st-louis']],
  ['Kansas City city MO',['missouri/cass','missouri/clay','missouri/jackson','missouri/platte']]
 ]){
  await search.fill(query);await expect(results).toHaveCount(expected.length);
  const links=await results.locator('a').evaluateAll(items=>items.map(a=>a.getAttribute('href')));
  expect(links.map(areaIdentity).sort()).toEqual(expected);
 }
 }
 await page.goto('/areas/missouri/?qa=1#st-louis-city');
 const city=page.locator('details#st-louis-city');await expect(city).toHaveAttribute('open','');
 await expect(city.locator(':scope > summary')).toHaveText('St. Louis City');
 await expect(city).toContainText('Independent city; separate from surrounding counties.');
 await expect(city.getByRole('heading',{name:'Cities',exact:true})).toBeVisible();
 await expect(city.locator('.county-place-list').getByText('St. Louis',{exact:true})).toBeVisible();
 const reference=city.getByRole('link',{name:'Place definitions and sources',exact:true});
 await reference.focus();await page.keyboard.press('Enter');
 await expect(page.locator('.county-reference-sets')).toHaveAttribute('open','');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 expect(requests).toEqual([]);
 await page.screenshot({path:testInfo.outputPath('missouri-directory.png'),fullPage:false});
});

test('Iowa finder distinguishes statistical territory from township and preserves cross-county cities',async({page},testInfo)=>{
 await page.goto('/areas/iowa/?qa=1');
 const search=directorySearch(page),results=page.locator('[data-county-results] li');
 await expect(page.locator('[data-cs]')).toHaveCount(99);
 for(const directory of ['/areas/iowa/','/areas/']){
 await page.goto(directory+'?qa=1');
 for(const [query,expected] of [
  ['Saylorville Reservoir unorganized territory IA',['iowa/polk']],
  ['Saylorville Reservoir township IA',[]],
  ['Des Moines city IA',['iowa/polk','iowa/warren']],
  ['West Des Moines city IA',['iowa/dallas','iowa/madison','iowa/polk','iowa/warren']]
 ]){
  await search.fill(query);await expect(results).toHaveCount(expected.length);
  const links=await results.locator('a').evaluateAll(items=>items.map(a=>a.getAttribute('href')));
  expect(links.map(areaIdentity).sort()).toEqual(expected);
  if(query.includes('unorganized'))await expect(results).toContainText('Matched unorganized territory (statistical): saylorville reservoir');
 }
 }
 await page.goto('/areas/iowa/?qa=1#polk');
 const polk=page.locator('details#polk');await expect(polk).toHaveAttribute('open','');
 const heading=polk.getByRole('heading',{name:'Unorganized territories (statistical)',exact:true});
 await heading.scrollIntoViewIfNeeded();await expect(heading).toBeVisible();
 await expect(polk).toContainText('Statistical entity; not a township government.');
 await page.setViewportSize({width:320,height:800});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.screenshot({path:testInfo.outputPath('iowa-territory.png'),fullPage:false});
});

test.describe('Missouri and Iowa native directories',()=>{
 test.use({javaScriptEnabled:false});
 test('all county entries and source disclosures remain keyboard-accessible without JavaScript',async({page})=>{
  for(const [state,count,slug,summary] of [['missouri',115,'st-louis-city','St. Louis City'],['iowa',99,'polk','Polk County']]){
   await page.goto('/areas/'+state+'/?qa=1');
   await expect(page.locator('[data-county-area]')).toHaveCount(count);
   const browse=page.locator('[data-county-browse-all]');await browse.locator(':scope > summary').focus();await page.keyboard.press('Enter');
   const entry=page.locator('details#'+slug),group=entry.locator('xpath=ancestor::details[contains(@class,"county-section")]');
   await group.locator(':scope > summary').focus();await page.keyboard.press('Enter');
   await entry.locator(':scope > summary').focus();await page.keyboard.press('Enter');
   await expect(entry).toHaveAttribute('open','');await expect(entry.locator(':scope > summary')).toHaveText(summary);
   await expect(entry.getByRole('link',{name:'Place definitions and sources',exact:true})).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
 });
});
