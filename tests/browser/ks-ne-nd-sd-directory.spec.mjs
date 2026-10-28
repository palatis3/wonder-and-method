import {directorySearch} from './directory-search.mjs';
import {test,expect} from './fixtures.mjs';
const identity=href=>{const u=new URL(href,'http://127.0.0.1:4187'),p=u.pathname.split('/').filter(Boolean);return p[1]+'/'+(u.hash?u.hash.slice(1):p[2].replace(/-county$/,''));};
const cases=[
 {state:'kansas',count:105,slug:'johnson',name:'Johnson',queries:[['Bonner Springs city KS',['kansas/johnson','kansas/leavenworth','kansas/wyandotte']],['Oakley city KS',['kansas/gove','kansas/logan','kansas/thomas']]]},
 {state:'nebraska',count:93,slug:'dakota',name:'Dakota',queries:[['Emerson village NE',['nebraska/dakota','nebraska/dixon','nebraska/thurston']],['Oxford village NE',['nebraska/furnas','nebraska/harlan']]]},
 {state:'north-dakota',count:53,slug:'cass',name:'Cass',queries:[['Grandin city ND',['north-dakota/cass','north-dakota/traill']],['Nesson Valley township ND',['north-dakota/williams']],['Central Adams unorganized territory ND',['north-dakota/adams']],['Central Adams township ND',[]]]},
 {state:'south-dakota',count:66,slug:'buffalo',name:'Buffalo',queries:[['Sioux Falls city SD',['south-dakota/lincoln','south-dakota/minnehaha']],['Fort Thompson CDP SD',['south-dakota/buffalo']],['East Bennett unorganized territory SD',['south-dakota/bennett']],['East Bennett township SD',[]]]}
];
for(const item of cases)test(`${item.state} typed search preserves source-qualified place types and every cross-county match`,async({page},testInfo)=>{
 const apiRequests=[],dataRequests=[];page.on('request',r=>{const p=new URL(r.url()).pathname;if(p.startsWith('/api/'))apiRequests.push(p);if(/^\/assets\/county-search-[a-f0-9]+\.bin$/.test(p))dataRequests.push(p);});
 for(const route of ['/areas/'+item.state+'/','/areas/']){
  await page.goto(route+'?qa=1');
  await expect(page.locator('[data-cs]')).toHaveCount(route==='/areas/'?3222:item.count);
  if(route==='/areas/')expect(dataRequests).toEqual([]);
  const search=directorySearch(page),results=page.locator('[data-county-results] li');
  for(const [query,expected]of item.queries){
   await search.fill(query);await expect(results).toHaveCount(expected.length);
   expect((await results.locator('a').evaluateAll(a=>a.map(x=>x.getAttribute('href')))).map(identity).sort()).toEqual(expected);
  }
 }
 expect(dataRequests).toHaveLength(1);expect(apiRequests).toEqual([]);
 await page.goto('/areas/'+item.state+'/?qa=1#'+item.slug);
 const entry=page.locator('details#'+item.slug);await expect(entry).toHaveAttribute('open','');
 if(item.state==='north-dakota')await expect(entry).toContainText('Inactive township government.');
 if(item.state==='south-dakota'){
  await expect(entry).toContainText('Fort Thompson');await expect(entry).toContainText('Gann Valley');
  await expect(entry.getByRole('heading',{name:'Census-designated places',exact:true})).toBeVisible();
  await expect(entry.getByRole('heading',{name:'Cities',exact:true})).toHaveCount(0);
 }
 await page.setViewportSize({width:320,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.screenshot({path:testInfo.outputPath(item.state+'-directory.png'),fullPage:false});
});
test.describe('Kansas, Nebraska and Dakota native directories',()=>{
 test.use({javaScriptEnabled:false});
 test('all county entries retain keyboard access and source links without JavaScript',async({page})=>{
  for(const item of cases){
   await page.goto('/areas/'+item.state+'/?qa=1');await expect(page.locator('[data-county-area]')).toHaveCount(item.count);
   const browse=page.locator('[data-county-browse-all]');await browse.locator(':scope > summary').focus();await page.keyboard.press('Enter');
   const entry=page.locator('details#'+item.slug),group=entry.locator('xpath=ancestor::details[contains(@class,"county-section")]');
   await group.locator(':scope > summary').focus();await page.keyboard.press('Enter');await entry.locator(':scope > summary').focus();await page.keyboard.press('Enter');
   await expect(entry).toHaveAttribute('open','');await expect(entry.locator(':scope > summary')).toHaveText(item.name+' County');
   await expect(entry.getByRole('link',{name:'Place definitions and sources',exact:true})).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
 });
});
