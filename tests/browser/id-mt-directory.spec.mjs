import {directorySearch} from './directory-search.mjs';
import {test,expect} from './fixtures.mjs';
const identity=href=>{const u=new URL(href,'http://127.0.0.1:4187'),p=u.pathname.split('/').filter(Boolean);return p[1]+'/'+(u.hash?u.hash.slice(1):p[2].replace(/-(?:county|municipio)$/,''));};
const cases=[
 {state:'idaho',count:44,slug:'custer',name:'Custer County',places:['Lost River'],queries:[['Lost River city ID',['idaho/custer']],['Lost River town ID',[]],['Ada county ID',['idaho/ada']]],headings:['Cities','Census county divisions (statistical)']},
 {state:'montana',count:56,slug:'silver-bow',name:'Silver Bow County',places:['Butte-Silver Bow','Walkerville'],queries:[['consolidated city balance of Butte-Silver Bow MT',['montana/silver-bow']],['consolidated city of Butte-Silver Bow MT',['montana/silver-bow']],['Walkerville town MT',['montana/silver-bow']],['Walkerville city MT',[]],['Butte-Silver Bow city MT',[]],['Butte-Silver Bow (balance) municipality MT',[]],['Anaconda-Deer Lodge county MT',['montana/deer-lodge']],['Deer Lodge city MT',['montana/powell']]],headings:['Towns','Consolidated city-county governments','Consolidated city balances (statistical)','Census county divisions (statistical)']}
];
for(const item of cases)test(`${item.state} typed search preserves legal and statistical identities`,async({page},testInfo)=>{
 const apiRequests=[],dataRequests=[];page.on('request',r=>{const p=new URL(r.url()).pathname;if(p.startsWith('/api/'))apiRequests.push(p);if(/^\/assets\/county-search-[a-f0-9]+\.bin$/.test(p))dataRequests.push(p);});
 for(const route of ['/areas/'+item.state+'/','/areas/']){
  await page.goto(route+'?qa=1');await expect(page.locator('[data-cs]')).toHaveCount(route==='/areas/'?3222:item.count);
  if(route==='/areas/')expect(dataRequests).toEqual([]);
  const search=directorySearch(page),results=page.locator('[data-county-results] li');
  for(const [query,expected]of item.queries){await search.fill(query);await expect(results).toHaveCount(expected.length);expect((await results.locator('a').evaluateAll(a=>a.map(x=>x.getAttribute('href')))).map(identity).sort()).toEqual(expected);}
 }
 expect(dataRequests).toHaveLength(1);expect(apiRequests).toEqual([]);
 await page.goto('/areas/'+item.state+'/?qa=1#'+item.slug);
 const entry=page.locator('details#'+item.slug);await expect(entry).toHaveAttribute('open','');await expect(entry.locator(':scope > summary')).toHaveText(item.name);
 for(const place of item.places)await expect(entry).toContainText(place);
 for(const heading of item.headings)await expect(entry.getByRole('heading',{name:heading,exact:true})).toBeVisible();
 await page.setViewportSize({width:320,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.screenshot({path:testInfo.outputPath(item.state+'-directory.png'),fullPage:false});
});
test.describe('ID/MT native directories',()=>{
 test.use({javaScriptEnabled:false});
 test('every area remains keyboard accessible with accurate place labels',async({page})=>{
  for(const item of cases){
   await page.goto('/areas/'+item.state+'/?qa=1');await expect(page.locator('[data-county-area]')).toHaveCount(item.count);
   const browse=page.locator('[data-county-browse-all]');await browse.locator(':scope > summary').focus();await page.keyboard.press('Enter');
   const entry=page.locator('details#'+item.slug),group=entry.locator('xpath=ancestor::details[contains(@class,"county-section")]');
   await group.locator(':scope > summary').focus();await page.keyboard.press('Enter');await entry.locator(':scope > summary').focus();await page.keyboard.press('Enter');
   await expect(entry).toHaveAttribute('open','');await expect(entry.locator(':scope > summary')).toHaveText(item.name);
   await expect(entry.getByRole('link',{name:'Place definitions and sources',exact:true})).toBeVisible();
   for(const heading of item.headings)await expect(entry.getByRole('heading',{name:heading,exact:true})).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
 });
});
