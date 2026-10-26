import {test,expect} from './fixtures.mjs';

const areaIdentity=href=>{
 const url=new URL(href,'http://127.0.0.1:4187'),parts=url.pathname.split('/').filter(Boolean);
 return parts[1]+'/'+(url.hash?url.hash.slice(1):parts[2].replace(/-county$/,''));
};
const searchLabel='County, parish, region or community';

test('Minnesota finder distinguishes statistical territories and retains cross-county city memberships',async({page},testInfo)=>{
 await page.goto('/areas/minnesota/?qa=1');
 const search=page.getByRole('searchbox',{name:searchLabel}),results=page.locator('[data-county-results] li');
 await expect(page.locator('[data-cs]')).toHaveCount(87);
 const requests=[];page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))requests.push(r.url());});
 for(const directory of ['/areas/minnesota/','/areas/']){
  await page.goto(directory+'?qa=1');
  for(const [query,expected] of [
   ['Northwest Aitkin unorganized territory MN',['minnesota/aitkin']],
   ['Northwest Aitkin township MN',[]],
   ['Cannon Falls city MN',['minnesota/dakota','minnesota/goodhue']],
   ['St. Anthony city MN',['minnesota/hennepin','minnesota/ramsey','minnesota/stearns']]
  ]){
   await search.fill(query);await expect(results).toHaveCount(expected.length);
   expect((await results.locator('a').evaluateAll(items=>items.map(a=>a.getAttribute('href')))).map(areaIdentity).sort()).toEqual(expected);
  }
 }
 await page.goto('/areas/minnesota/?qa=1#aitkin');
 const entry=page.locator('details#aitkin');await expect(entry).toHaveAttribute('open','');
 const heading=entry.getByRole('heading',{name:'Unorganized territories (statistical)',exact:true});
 await heading.scrollIntoViewIfNeeded();await expect(heading).toBeVisible();
 await expect(entry).toContainText('Statistical entity; not a municipal or township government.');
 await page.setViewportSize({width:320,height:800});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 expect(requests).toEqual([]);
 await page.screenshot({path:testInfo.outputPath('minnesota-territory.png'),fullPage:false});
});

test('Oklahoma finder retains cities across counties and labels inactive towns',async({page},testInfo)=>{
 await page.goto('/areas/oklahoma/?qa=1');
 const search=page.getByRole('searchbox',{name:searchLabel}),results=page.locator('[data-county-results] li');
 await expect(page.locator('[data-cs]')).toHaveCount(77);
 for(const directory of ['/areas/oklahoma/','/areas/']){
  await page.goto(directory+'?qa=1');
  for(const [query,expected] of [
   ['Oklahoma City city OK',['oklahoma/canadian','oklahoma/cleveland','oklahoma/oklahoma','oklahoma/pottawatomie']],
   ['Tulsa city OK',['oklahoma/osage','oklahoma/rogers','oklahoma/tulsa','oklahoma/wagoner']],
   ['Hoot Owl town OK',['oklahoma/mayes']]
  ]){
   await search.fill(query);await expect(results).toHaveCount(expected.length);
   expect((await results.locator('a').evaluateAll(items=>items.map(a=>a.getAttribute('href')))).map(areaIdentity).sort()).toEqual(expected);
  }
 }
 await page.goto('/areas/oklahoma/?qa=1#mayes');
 const entry=page.locator('details#mayes');await expect(entry).toHaveAttribute('open','');
 await expect(entry).toContainText('Inactive');await expect(entry).toContainText('Hoot Owl');
 const reference=entry.getByRole('link',{name:'Place definitions and sources',exact:true});
 await reference.focus();await page.keyboard.press('Enter');await expect(page.locator('.county-reference-sets')).toHaveAttribute('open','');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.screenshot({path:testInfo.outputPath('oklahoma-sources.png'),fullPage:false});
});

test.describe('Minnesota and Oklahoma native directories',()=>{
 test.use({javaScriptEnabled:false});
 test('all county entries and sources remain keyboard-accessible without JavaScript',async({page})=>{
  for(const [state,count,slug,summary] of [['minnesota',87,'aitkin','Aitkin County'],['oklahoma',77,'mayes','Mayes County']]){
   await page.goto('/areas/'+state+'/?qa=1');await expect(page.locator('[data-county-area]')).toHaveCount(count);
   const browse=page.locator('[data-county-browse-all]');await browse.locator(':scope > summary').focus();await page.keyboard.press('Enter');
   const entry=page.locator('details#'+slug),group=entry.locator('xpath=ancestor::details[contains(@class,"county-section")]');
   await group.locator(':scope > summary').focus();await page.keyboard.press('Enter');await entry.locator(':scope > summary').focus();await page.keyboard.press('Enter');
   await expect(entry).toHaveAttribute('open','');await expect(entry.locator(':scope > summary')).toHaveText(summary);
   await expect(entry.getByRole('link',{name:'Place definitions and sources',exact:true})).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
 });
});
