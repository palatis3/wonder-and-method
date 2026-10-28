import {directorySearch} from './directory-search.mjs';
import {test,expect} from './fixtures.mjs';
import decisions from '../fixtures/wy-hi-ak-decisions.json' with {type:'json'};
const identity=href=>{const u=new URL(href,'http://127.0.0.1:4187');const area=decisions.areas.find(a=>a.servicePath===u.pathname||a.directoryPath===u.pathname+u.hash);expect(area,href).toBeDefined();return area.areaId;};
const cases=[
 {state:'wyoming',count:23,slug:'big-horn',name:'Big Horn County',places:['Frannie'],queries:[['Frannie town WY',['wyoming/big-horn','wyoming/park']],['Frannie city WY',[]],['Laramie city WY',['wyoming/albany']],['Laramie county WY',['wyoming/laramie']]],headings:['Towns','Census county divisions (statistical)']},
 {state:'hawaii',count:5,slug:'kalawao',name:'Kalawao County',places:['Kalawao'],queries:[['Kalawao county HI',['hawaii/kalawao']],['Kalawao CCD HI',['hawaii/kalawao']],['Kalaupapa CDP HI',[]],['Urban Honolulu CDP HI',['hawaii/honolulu']],['Urban Honolulu city HI',[]],['Hilo CDP HI',['hawaii/hawaii']],['Hilo city HI',[]]],headings:['Census county divisions (statistical)']},
 {state:'alaska',count:30,slug:'bethel',name:'Bethel Census Area',places:['Bethel'],queries:[['census area of Bethel AK',['alaska/bethel']],['Bethel city AK',['alaska/bethel']],['Bethel borough AK',[]],['Anchorage municipality AK',['alaska/anchorage']],['Anchorage city AK',[]],['Anchorage census subarea AK',['alaska/anchorage']],['Juneau city and borough AK',['alaska/juneau']],['Juneau city AK',[]],['Yakutat CDP AK',['alaska/yakutat']],['Yakutat city AK',[]]],headings:['Cities','Census subareas (statistical)']}
];
for(const item of cases)test(`${item.state} typed search preserves county-equivalent identities and native place lists`,async({page},testInfo)=>{
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
 if(item.state==='alaska')await expect(entry).toContainText('not an organized borough government');
 if(item.state==='hawaii'){
  await expect(entry.getByRole('heading',{name:'Cities',exact:true})).toHaveCount(0);
  await expect(entry.getByRole('heading',{name:'Census-designated places',exact:true})).toHaveCount(0);
  await expect(entry.locator('a.county-commercial-link, .county-commercial-link')).toHaveCount(0);
 }
 await page.setViewportSize({width:320,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.screenshot({path:testInfo.outputPath(item.state+'-directory.png'),fullPage:false});
});

test('typed-prefix literal names remain searchable after WY and HI become state selectors',async({page})=>{
 await page.goto('/areas/?qa=1');const search=directorySearch(page),results=page.locator('[data-county-results] li');
 for(const [q,state]of [['borough of valley hi','Pennsylvania'],['borough of west wyoming','Pennsylvania'],['village of valley hi','Ohio'],['cdp of so hi','Arizona']]){
  await search.fill(q);await expect(results).toHaveCount(1);await expect(results.locator('.county-match-reason')).toContainText(state+' \u00b7 Matched');
  await search.fill(q+' '+state);await expect(results).toHaveCount(1);
  await search.fill(q+' Hawaii');await expect(results).toHaveCount(0);
 }
});

test.describe('WY/HI/AK native directories',()=>{
 test.use({javaScriptEnabled:false});
 test('all 58 county equivalents remain keyboard accessible without invented local-government labels',async({page})=>{
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
