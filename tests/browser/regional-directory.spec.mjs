import {test,expect} from './fixtures.mjs';
import {retiredCountyRoutes} from '../../deployment/retired-county-routes.mjs';
import currentLocationPaths from '../fixtures/current-location-paths.mjs';

const hubs=[['virginia',133,'accomack'],['west-virginia',55,'jefferson'],['michigan',83,'oakland'],['district-of-columbia',1,'district-of-columbia'],['indiana',92,'marion'],['kentucky',120,'fayette'],['tennessee',95,'davidson'],['north-carolina',100,'wake'],['florida',67,'duval'],['south-carolina',46,'charleston'],['georgia',159,'richmond'],['mississippi',82,'yalobusha'],['alabama',67,'madison'],['wisconsin',72,'menominee'],['illinois',102,'cook']];
const searchbox=page=>page.getByRole('searchbox',{name:'County, parish, region or community',exact:true});

test('new hubs reveal saved entry fragments with complete place lists and no horizontal overflow',async({page},testInfo)=>{
 test.setTimeout(60_000);
 for(const [state,count,slug] of hubs){
  const response=await page.goto(`/areas/${state}/?qa=1#${slug}`);expect(response.status()).toBe(200);
  await expect(page.locator('[data-county-area]')).toHaveCount(count);
  const entry=page.locator('#'+slug);
  await expect(entry).toHaveAttribute('open','');
  await expect(entry.locator('.county-directory')).toBeVisible();
  await expect(entry.getByRole('link',{name:'Place definitions and sources',exact:true})).toBeVisible();
  const ids=await page.locator('[id]').evaluateAll(nodes=>nodes.map(node=>node.id));
  expect(new Set(ids).size).toBe(ids.length);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  const canonical=await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(new URL(canonical).pathname).toBe(`/areas/${state}/`);expect(new URL(canonical).hash).toBe('');
 }
 await page.goto('/areas/michigan/?qa=1#oakland');
 await page.setViewportSize({width:320,height:800});
 await page.evaluate(()=>document.fonts.ready);
 await expect(page.locator('#oakland').getByRole('heading',{name:'Charter townships',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.screenshot({path:testInfo.outputPath('michigan-entry-320px.png')});
});

test('typed searches distinguish governments and keyboard results open services while directory bookmarks reveal places',async({page})=>{
 await page.goto('/areas/?qa=1');
 await expect(page.locator('[data-cs]')).toHaveCount(1746);
 const search=searchbox(page),state=page.getByRole('combobox',{name:'State or district',exact:true});
 const requests=[];page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))requests.push(request.url());});
 for(const [query,paths] of [
  ['Richmond city VA',['/areas/virginia/richmond-city/']],
  ['Richmond county VA',['/areas/virginia/richmond-county/']],
  ['Belle Haven town VA',['/areas/virginia/accomack-county/','/areas/virginia/northampton-county/']],
  ['Harpers Ferry town WV',['/areas/west-virginia/jefferson-county/']],
  ['Bloomfield charter township MI',['/areas/michigan/oakland-county/']],
  ['Bloomfield township MI',['/areas/michigan/huron-county/','/areas/michigan/missaukee-county/','/areas/michigan/oakland-county/']],
  ['Ward 3 DC',['/areas/district-of-columbia/district-of-columbia/']],
  ['Georgetown neighborhood DC',['/areas/district-of-columbia/district-of-columbia/']],
  ['Indianapolis consolidated city county government IN',['/areas/indiana/marion-county/']],
  ['Frankfort city KY',['/areas/kentucky/franklin-county/']],
  ['Memphis city TN',['/areas/tennessee/shelby-county/']],
  ['Asheville city NC',['/areas/north-carolina/buncombe-county/']],
  ['Longboat Key town FL',['/areas/florida/manatee-county/','/areas/florida/sarasota-county/']],
  ['Orange county FL',['/areas/florida/orange-county/']],
  ['Jackson city MS',['/areas/mississippi/#hinds','/areas/mississippi/#madison','/areas/mississippi/#rankin']],
  ['Huntsville city AL',['/areas/alabama/#limestone','/areas/alabama/#madison','/areas/alabama/#marshall','/areas/alabama/#morgan']],
  ['Tillatoba MS',['/areas/mississippi/#yalobusha']],
  ['Wisconsin Dells city WI',['/areas/wisconsin/#adams','/areas/wisconsin/#columbia','/areas/wisconsin/#juneau','/areas/wisconsin/#sauk']],
  ['Brookfield town WI',['/areas/wisconsin/#waukesha']],
  ['Naperville city IL',['/areas/illinois/dupage-county/','/areas/illinois/#will']],
  ['Cicero township IL',['/areas/illinois/cook-county/']],
  ['Election precinct 1 IL',['/areas/illinois/#monroe']],
  ['Precinct Cache IL',['/areas/illinois/#alexander','/areas/illinois/#johnson']],
  ['Cache precinct IL',['/areas/illinois/#alexander','/areas/illinois/#johnson']],
  ['Atlanta city GA',['/areas/georgia/#dekalb','/areas/georgia/fulton-county/']],
  ['Athens municipality GA',['/areas/georgia/#clarke']],
  ['Braselton town GA',['/areas/georgia/#barrow','/areas/georgia/gwinnett-county/','/areas/georgia/#hall','/areas/georgia/#jackson']]
 ]){
  await search.fill(query);
  await expect(page.locator('[data-county-results] li')).toHaveCount(paths.length);
  expect(await page.locator('[data-county-results] a').evaluateAll(links=>links.map(link=>link.getAttribute('href')).sort())).toEqual(paths.sort());
 }
 await state.selectOption('virginia');await search.fill('');
 await expect(page.locator('[data-county-results] li')).toHaveCount(133);
 await page.getByRole('button',{name:'Clear',exact:true}).click();
 await expect(state).toHaveValue('');await expect(search).toBeFocused();
 expect(requests).toEqual([]);

 await page.goto('/areas/virginia/?qa=1');
 await searchbox(page).fill('Richmond independent city');
 const result=page.locator('[data-county-best] a');
 await expect(result).toHaveCount(1);
 await searchbox(page).press('Tab');await expect(page.getByRole('button',{name:'Clear',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');await expect(result).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(page).toHaveURL(/\/areas\/virginia\/richmond-city\/(?:\?qa=1)?$/);
 await page.goto('/areas/virginia/?qa=1#richmond-city');
 await expect(page.locator('#richmond-city')).toHaveAttribute('open','');
 const permalink=page.locator('#richmond-city').getByRole('link',{name:'Link to this directory entry',exact:true});
 await permalink.focus();await page.keyboard.press('Enter');
 await expect(page.locator('#richmond-city > summary')).toBeFocused();
 await expect(page.locator('#richmond-city .county-directory')).toBeVisible();
 await expect(page.locator('[data-county-directory]')).toBeVisible();
 await expect(searchbox(page)).toHaveValue('');
});

test('entry references reveal the applicable source set and historic county bookmarks open their new entry',async({page})=>{
 await page.goto('/areas/michigan/?qa=1#oakland');
 const sourceLink=page.locator('#oakland').getByRole('link',{name:'Place definitions and sources',exact:true});
 const reference=await sourceLink.getAttribute('href');await sourceLink.click();
 await expect(page.locator('.county-reference-sets')).toHaveAttribute('open','');
 await expect(page.locator(reference)).toBeVisible();
 const source=page.locator(reference).locator('a[href^="#geography-source-"]').first(),destination=await source.getAttribute('href');
 await source.click();
 await expect(page.locator('.county-source-index')).toHaveAttribute('open','');
 await expect(page.locator(destination)).toBeVisible();
 expect(await page.locator(destination+' a').getAttribute('href')).toMatch(/^https:\/\//);

 for(const [oldPath,state,slug,fragment] of [
  ['/areas/monroe-county/','new-york','monroe','buyer-task'],
  ['/areas/pennsylvania/columbia-county/','pennsylvania','columbia','approach'],
  ['/areas/ohio/greene-county/','ohio','greene','coverage'],
  ['/areas/connecticut/lower-connecticut-river-valley-planning-region/','connecticut','lower-connecticut-river-valley','questions'],
  ['/areas/maryland/baltimore-city/','maryland','baltimore-city','buyer-task']
 ]){
  await page.goto(`${oldPath}?qa=1&utm_source=bookmark#${fragment}`);
  if(currentLocationPaths.includes(oldPath)||oldPath==='/areas/maryland/baltimore-city/'){
   const restored=currentLocationPaths.includes(oldPath);
   await expect(page).toHaveURL(url=>url.pathname===(restored?oldPath:'/areas/maryland/baltimore-area/')&&url.search==='?qa=1&utm_source=bookmark'&&url.hash==='#'+fragment);
   await expect(page.locator('#'+fragment)).toBeVisible();
   await expect(page.locator('#'+fragment)).not.toBeEmpty();
   await expect(page.locator('main').getByRole('link',{name:'Ask about your website',exact:true}).first()).toBeVisible();
   continue;
  }
  await expect(page).toHaveURL(url=>url.pathname===`/areas/${state}/`&&url.search==='?qa=1&utm_source=bookmark'&&url.hash===`#${slug}`);
  const entry=page.locator('#'+slug);
  await expect(entry).toHaveAttribute('open','');await expect(entry.locator('.county-directory')).toBeVisible();
  await expect(entry.getByRole('link',{name:'Place definitions and sources',exact:true})).toBeVisible();
 }
});

test('all retired county URLs permanently redirect while preserving query bytes and the Erie page remains live',async({request},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','One complete HTTP redirect matrix');
 test.setTimeout(60_000);
 const routes=Object.entries(retiredCountyRoutes);expect(routes).toHaveLength(2);
 const query='?qa=1&utm_source=old%20bookmark&tag=a&tag=b&literal=%2B';
 for(const [oldPath,destination] of routes){
  const response=await request.get(oldPath+query,{maxRedirects:0});
  expect(response.status(),oldPath).toBe(308);
  const target=new URL(destination,'http://127.0.0.1:4187');target.search=query;
  expect(new URL(response.headers().location,'http://127.0.0.1:4187').href,oldPath).toBe(target.href);
 }
 const erie=await request.get('/areas/erie-county/'+query,{maxRedirects:0});expect(erie.status()).toBe(200);
 expect(erie.headers().location).toBeUndefined();
});

test.describe('without JavaScript',()=>{
 test.use({javaScriptEnabled:false});
 test('native browse controls expose county places and DC wards without a search service',async({page})=>{
  await page.goto('/areas/virginia/?qa=1');
  await expect(searchbox(page)).toBeDisabled();
  const group=page.locator('.county-region').filter({has:page.locator('#accomack')});
  await group.locator(':scope > summary').click();
  await page.locator('#accomack > summary').click();
  await expect(page.locator('#accomack .county-directory')).toBeVisible();
  await expect(page.locator('#accomack').getByRole('heading',{name:'Towns',exact:true})).toBeVisible();
  await expect(page.locator('#accomack').getByText('Belle Haven',{exact:true})).toBeVisible();
  await expect(page.locator('#accomack').getByRole('heading',{name:'Census-designated places',exact:true})).toBeVisible();
  await page.goto('/areas/district-of-columbia/?qa=1');
  await page.locator('.county-region > summary').click();
  await page.locator('#district-of-columbia > summary').click();
  await expect(page.getByRole('heading',{name:'Selected neighborhoods',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Council wards',exact:true})).toBeVisible();
  await expect(page.getByText('Ward 8',{exact:true})).toBeVisible();
  await page.setViewportSize({width:320,height:800});await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 });
});
