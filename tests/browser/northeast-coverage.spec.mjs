import {readFile} from 'node:fs/promises';
import {test,expect} from './fixtures.mjs';
import reviewedWorksheets from '../../src/location-worksheet-links.json' with {type:'json'};
const fixture=JSON.parse(await readFile(new URL('../fixtures/northeast-expected-areas.json',import.meta.url),'utf8'));
const northern=JSON.parse(await readFile(new URL('../fixtures/northern-expected-areas.json',import.meta.url),'utf8'));
fixture.states.push(...northern.states);
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

// The independent fixture covers every entry in the nine consolidated hubs.
// Phone projects below additionally exercise real mobile keyboard/control flows.
for(const width of [320,768,1440])for(const state of fixture.states){
 test(`${state.name}: every directory entry fits ${width}px before and after disclosures`,async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop','One complete three-width layout matrix');
  test.setTimeout(90_000);
  await page.setViewportSize({width,height:width===320?844:1000});
  await page.addInitScript(()=>{window.__northeastLayoutShift=0;new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)window.__northeastLayoutShift+=entry.value;}).observe({type:'layout-shift',buffered:true});});
  const errors=[],failed=[],records=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('requestfailed',request=>failed.push({url:request.url(),error:request.failure()?.errorText}));
  page.on('response',response=>{if(response.status()>=400)failed.push({url:response.url(),status:response.status()});});
  const route=`/areas/${state.id}/`,response=await page.goto(route+'?qa=1');expect(response.status(),route).toBe(200);
  await settle(page);
  const initial=await layout(page);expect(initial.overflow,route+' initial overflow').toBeLessThanOrEqual(1);expect(initial.clipped,route+' initial clipping').toEqual([]);
  expect(initial.layoutShift,route+' layout shift').toBeLessThanOrEqual(0.1);
  expect(await page.locator('[data-county-area]').evaluateAll(entries=>entries.map(entry=>entry.id).sort())).toEqual(state.areas.map(area=>area.slug).sort());
  const browse=page.locator('[data-county-browse-all]');
  await browse.locator(':scope > summary').click();await expect(browse).toHaveAttribute('open','');
  for(const summary of await page.locator('[data-county-directory] > details > summary').all())await summary.click();
  await expect(page.locator('[data-cs]:visible')).toHaveCount(state.areas.length);
  for(const area of state.areas){
   const entry=page.locator(`[data-county-area][id="${area.slug}"]`),summary=entry.locator(':scope > summary');
   expect((await summary.innerText()).normalize('NFD').replace(/[\u0300-\u036f]/g,'')).toContain(area.name.normalize('NFD').replace(/[\u0300-\u036f]/g,''));
   await summary.click();await expect(entry).toHaveAttribute('open','');
   await expect(entry.locator('.county-directory')).toBeVisible();
   expect(await entry.locator('.county-directory h3').count()).toBeGreaterThan(0);
   expect(await entry.locator('.county-place-list li').count()).toBeGreaterThan(0);
   const referenceId=await entry.getByRole('link',{name:'Place definitions and sources',exact:true}).getAttribute('href');
   await expect(page.locator(referenceId)).toBeAttached();
   expect(await page.locator(referenceId+' a[href^="#geography-source-"]').count()).toBeGreaterThan(0);
   const worksheet=entry.getByRole('link',{name:'General website-planning worksheet (TXT)',exact:true}),reviewed=reviewedWorksheets[state.id+'/'+area.slug];
   if(reviewed){await expect(worksheet).toHaveAttribute('download','');await expect(worksheet).toHaveAttribute('href',new RegExp('^'+reviewed.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:\\?v=[a-f0-9]+)?$'));}
   else await expect(worksheet).toHaveCount(0);
  }
  for(const selector of ['.county-reference-sets > summary','.county-source-index > summary'])await page.locator(selector).click();
  await settle(page);const expanded=await layout(page);
  expect(expanded.overflow,route+' expanded overflow').toBeLessThanOrEqual(1);expect(expanded.clipped,route+' expanded clipping').toEqual([]);
  records.push({route,width,entries:state.areas.length,initial,expanded});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
  await testInfo.attach(`layout-${state.id}-${width}.json`,{body:Buffer.from(JSON.stringify({records,errors,failed},null,2)),contentType:'application/json'});
 });
}

test('state and district finder preserves cross-boundary and typed names, resets focus and sends no search requests',async({page})=>{
 await page.goto('/areas/?qa=1');
 const search=page.getByRole('searchbox',{name:'County, parish, region or community'}),state=page.getByRole('combobox',{name:'State or district',exact:true});
 await expect(state.locator('option')).toHaveCount(45); // 43 states, Washington DC and the all-states option.
 await expect(state.getByRole('option',{name:'South Carolina',exact:true})).toHaveAttribute('value','south-carolina');
 for(const [name,id] of [['Georgia','georgia'],['Mississippi','mississippi'],['Alabama','alabama'],['Wisconsin','wisconsin'],['Illinois','illinois'],['Louisiana','louisiana'],['Arkansas','arkansas'],['Texas','texas'],['Missouri','missouri'],['Iowa','iowa'],['Minnesota','minnesota'],['Oklahoma','oklahoma']])await expect(state.getByRole('option',{name,exact:true})).toHaveAttribute('value',id);
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
  ['Baltimore city MD',['/areas/maryland/baltimore-area/']],
  ['Baltimore independent city MD',['/areas/maryland/baltimore-area/']],
  ['Baltimore county MD',['/areas/maryland/baltimore-area/']],
  ['Saint Marys County MD',['/areas/maryland/st-marys-county/']],
  ["St. Mary's County MD",['/areas/maryland/st-marys-county/']],
  ['Towson MD',['/areas/maryland/baltimore-area/']],
  ['Mount Airy town MD',['/areas/maryland/carroll-county/','/areas/maryland/frederick-county/']]
 ];
 for(const [query,expected] of cases){await search.fill(query);await expect.poll(targets).toEqual([...expected].sort());}
 await search.fill('');
 for(const s of fixture.states){await state.selectOption(s.id);await expect(page.locator('[data-county-results] li')).toHaveCount(s.areas.length);}
 await search.fill('Capitol planning region CT');await expect(page.locator('[data-county-results] li')).toHaveCount(0);
 await page.getByRole('button',{name:'Clear',exact:true}).click();await expect(search).toBeFocused();await expect(state).toHaveValue('');
 const browse=page.locator('[data-county-browse-all] > summary');await expect(browse).toBeVisible();await browse.click();
 await expect(page.locator('[data-county-directory]')).toBeVisible();await expect(page.locator('[data-cs]')).toHaveCount(2893);
 expect(requests).toEqual([]);
});

test('planning-region entry supports keyboard use and general inquiry context without a mismatched worksheet',async({page})=>{
 await page.goto('/areas/connecticut/?qa=1');await settle(page);
 const browse=page.locator('[data-county-browse-all]');
 await browse.locator(':scope > summary').click();await expect(browse).toHaveAttribute('open','');
 const entry=page.locator('#lower-connecticut-river-valley'),group=page.locator('.county-region').filter({has:entry});
 await group.locator(':scope > summary').click();
 const summary=entry.locator(':scope > summary');await summary.focus();await page.keyboard.press('Enter');
 await expect(entry).toHaveAttribute('open','');await expect(summary).toBeFocused();
 await expect(entry.locator('.county-area-content')).toContainText('current Census county equivalent');
 await expect(entry.getByRole('heading',{name:'Towns',exact:true})).toBeVisible();
 await expect(entry.getByRole('heading',{name:'Census-designated places',exact:true})).toBeVisible();
 await expect(entry.getByRole('link',{name:'General website-planning worksheet (TXT)',exact:true})).toHaveCount(0);
 const preserved=await page.request.get('/assets/county-briefs/connecticut-lower-connecticut-river-valley.txt');expect(preserved.status()).toBe(200);const text=await preserved.text();
 expect(text).toContain('LOWER CONNECTICUT RIVER VALLEY PLANNING REGION, CONNECTICUT');expect(text).toContain('EXAMPLE (MADE UP)');
 expect(text).toContain('/areas/connecticut/lower-connecticut-river-valley-planning-region/');
 await page.locator('.county-state-switch').getByRole('link',{name:'Ask about your website',exact:true}).click();await expect(page).toHaveURL(url=>url.pathname==='/contact/'&&!url.searchParams.has('county')&&url.searchParams.get('request_kind')==='question'&&url.searchParams.get('qa')==='1'&&url.hash==='#inquiry');
 await expect(page.locator('input[name="county"]')).toHaveValue('');
 await expect(page.locator('input[name="business_location"]')).toHaveValue('');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
