import {readFile} from 'node:fs/promises';
import {test,expect} from './fixtures.mjs';
const fixture=JSON.parse(await readFile(new URL('../fixtures/northeast-expected-areas.json',import.meta.url),'utf8'));
const northern=JSON.parse(await readFile(new URL('../fixtures/northern-expected-areas.json',import.meta.url),'utf8'));
fixture.states.push(...northern.states);
const areaPath=(state,area)=>`/areas/${state.id}/${area.slug}${area.areaType==='Independent City'?'':state.id==='connecticut'?'-planning-region':'-county'}/`;
const settle=page=>page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
async function layout(page){
 return page.evaluate(()=>({
  overflow:document.documentElement.scrollWidth-innerWidth,
  clipped:[...document.querySelectorAll('main h1,main h2,main h3,main p,main a,main summary,main li')].flatMap(element=>{
   const box=element.getBoundingClientRect();if(!box.width||!box.height)return [];
   const css=getComputedStyle(element),horizontal=box.left < -1||box.right>innerWidth+1;
   const vertical=['hidden','clip'].includes(css.overflowY)&&element.scrollHeight>element.clientHeight+2;
   return horizontal||vertical?[{tag:element.tagName,text:element.textContent.trim().slice(0,90),left:box.left,right:box.right,vertical}]:[];
  }).slice(0,12),
  layoutShift:window.__northeastLayoutShift||0,
  fontStatus:document.fonts.status,
  heading:document.querySelector('main h1')?.textContent,
  reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches
 }));
}

// All 125 new routes at three distinct widths. The regular phone/reduced-motion
// projects below exercise actual controls in their own mobile browser contexts.
for(const width of [390,768,1440])for(const state of fixture.states){
 test(`${state.name}: every new route fits ${width}px before and after disclosures`,async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop','One complete three-width layout matrix');
  test.setTimeout(90_000);
  await page.setViewportSize({width,height:width===390?844:1000});
  await page.addInitScript(()=>{window.__northeastLayoutShift=0;new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)window.__northeastLayoutShift+=entry.value;}).observe({type:'layout-shift',buffered:true});});
  const errors=[],failed=[],records=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('requestfailed',request=>failed.push({url:request.url(),error:request.failure()?.errorText}));
  page.on('response',response=>{if(response.status()>=400)failed.push({url:response.url(),status:response.status()});});
  for(const route of [`/areas/${state.id}/`,...state.areas.map(area=>areaPath(state,area))]){
   const response=await page.goto(route+'?qa=1');expect(response.status(),route).toBe(200);
   await settle(page);
   const initial=await layout(page);expect(initial.overflow,route+' initial overflow').toBeLessThanOrEqual(1);expect(initial.clipped,route+' initial clipping').toEqual([]);
   expect(initial.layoutShift,route+' layout shift').toBeLessThanOrEqual(0.1);
   const hub=route===`/areas/${state.id}/`;
   if(hub){
    for(const summary of await page.locator('[data-county-directory] > details > summary').all())await summary.click();
    await expect(page.locator('[data-county-search]:visible')).toHaveCount(state.areas.length);
   }else{
    for(const selector of ['.county-planning-details > summary','.county-communities > summary','.county-sources > summary'])await page.locator(selector).click();
    for(const summary of await page.locator('.county-faq summary').all())await summary.click();
    await expect(page.locator('.county-faq details[open]')).toHaveCount(6);
    await expect(page.locator('a[download][href*="county-briefs"]')).toHaveCount(1);
   }
   await settle(page);const expanded=await layout(page);
   expect(expanded.overflow,route+' expanded overflow').toBeLessThanOrEqual(1);expect(expanded.clipped,route+' expanded clipping').toEqual([]);
   records.push({route,width,initial,expanded});
  }
  expect(errors).toEqual([]);expect(failed).toEqual([]);
  await testInfo.attach(`layout-${state.id}-${width}.json`,{body:Buffer.from(JSON.stringify({records,errors,failed},null,2)),contentType:'application/json'});
 });
}

test('twelve-state finder preserves cross-boundary and typed names, resets focus and sends no search requests',async({page})=>{
 await page.goto('/areas/?qa=1');
 const search=page.getByRole('searchbox',{name:'County, region, city or town'}),state=page.getByRole('combobox',{name:'State',exact:true});
 await expect(state.locator('option')).toHaveCount(13);
 const requests=[];page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))requests.push(request.url());});
 const targets=()=>page.locator('[data-county-results] li a').evaluateAll(links=>links.map(link=>link.getAttribute('href')).sort());
 const cases=[
  ['Princeton municipality NJ',['/areas/new-jersey/mercer-county/']],
  ['Township of South Orange Village NJ',['/areas/new-jersey/essex-county/']],
  ['Groton city CT',['/areas/connecticut/southeastern-connecticut-planning-region/']],
  ['Groton town CT',['/areas/connecticut/southeastern-connecticut-planning-region/']],
  ['Capitol planning region CT',['/areas/connecticut/capitol-planning-region/']],
  ['Bristol county RI',['/areas/rhode-island/bristol-county/']],
  ['Amherst town MA',['/areas/massachusetts/hampshire-county/']],
  ['Smyrna town DE',['/areas/delaware/kent-county/','/areas/delaware/new-castle-county/']],
  ['Milford city DE',['/areas/delaware/kent-county/','/areas/delaware/sussex-county/']],
  ['Saint Albans city VT',['/areas/vermont/franklin-county/']],
  ['Essex Junction village VT',['/areas/vermont/chittenden-county/']],
  ['Coös County NH',['/areas/new-hampshire/coos-county/']],
  ['Rangeley plantation ME',['/areas/maine/franklin-county/']],
  ['Rangeley town ME',['/areas/maine/franklin-county/']],
  ['Baltimore city MD',['/areas/maryland/baltimore-city/']],
  ['Baltimore independent city MD',['/areas/maryland/baltimore-city/']],
  ['Baltimore county MD',['/areas/maryland/baltimore-county/']],
  ['Saint Marys County MD',['/areas/maryland/st-marys-county/']],
  ["St. Mary's County MD",['/areas/maryland/st-marys-county/']],
  ['Towson MD',['/areas/maryland/baltimore-county/']],
  ['Mount Airy town MD',['/areas/maryland/carroll-county/','/areas/maryland/frederick-county/']]
 ];
 for(const [query,expected] of cases){await search.fill(query);await expect.poll(targets).toEqual(expected);}
 await search.fill('');
 for(const s of fixture.states){await state.selectOption(s.id);await expect(page.locator('[data-county-results] li')).toHaveCount(s.areas.length);}
 await search.fill('Capitol planning region CT');await expect(page.locator('[data-county-results] li')).toHaveCount(0);
 await page.getByRole('button',{name:'Clear',exact:true}).click();await expect(search).toBeFocused();await expect(state).toHaveValue('');
 await expect(page.locator('[data-county-directory]')).toBeVisible();await expect(page.locator('[data-county-search]')).toHaveCount(333);
 expect(requests).toEqual([]);
});

test('planning-region guide supports keyboard FAQ use, download and inquiry provenance',async({page})=>{
 const route='/areas/connecticut/lower-connecticut-river-valley-planning-region/';
 await page.goto(route+'?qa=1');await settle(page);
 const summary=page.locator('.county-faq summary').first();await summary.focus();await page.keyboard.press('Enter');
 await expect(page.locator('.county-faq details').first()).toHaveAttribute('open','');await expect(summary).toBeFocused();
 const downloadPromise=page.waitForEvent('download');await page.locator('a[download][href*="county-briefs"]').click();
 const download=await downloadPromise;expect(download.suggestedFilename()).toBe('connecticut-lower-connecticut-river-valley.txt');
 const stream=await download.createReadStream();let text='';for await(const chunk of stream)text+=chunk.toString();
 expect(text).toContain('LOWER CONNECTICUT RIVER VALLEY PLANNING REGION, CONNECTICUT');expect(text).toContain('EXAMPLE (MADE UP)');
 await page.locator('.page-intro a.button').click();await expect(page).toHaveURL(url=>url.pathname==='/contact/'&&url.searchParams.get('county')==='connecticut/lower-connecticut-river-valley-planning-region'&&url.searchParams.get('request_kind')==='question'&&url.searchParams.get('qa')==='1'&&url.hash==='#inquiry');
 await expect(page.locator('input[name="county"]')).toHaveValue('connecticut/lower-connecticut-river-valley-planning-region');
 await expect(page.locator('input[name="business_location"]')).toHaveValue('');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
