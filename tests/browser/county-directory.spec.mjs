import {test,expect} from './fixtures.mjs';

test('shared township status stays with the complete Arkansas place list',async({page},testInfo)=>{
 await page.goto('/areas/arkansas/?qa=1#arkansas');
 const entry=page.locator('[data-county-area]#arkansas');
 await expect(entry).toHaveAttribute('open','');
 const group=entry.locator('.county-directory > div').filter({has:page.getByRole('heading',{name:'Townships',exact:true})});
 await expect(group.locator('p.county-place-note')).toHaveText('All places in this list: Nonfunctioning legal county subdivision used by the Census; not an active municipal government.');
 await expect(group.getByText('Arkansas',{exact:true})).toBeVisible();
 await expect(group.getByText('Barton',{exact:true})).toBeVisible();
 await expect(group.getByText('Bayou Meto',{exact:true})).toBeVisible();
 await group.scrollIntoViewIfNeeded();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await group.screenshot({path:`evidence/combined-improvements-20261024/visual/arkansas-townships-${testInfo.project.name}.png`});
});

test('city relevance keeps explicit county and state choices available',async({page})=>{
 await page.goto('/areas/?qa=1');
 const search=page.getByRole('searchbox',{name:'County, parish, region or community'});
 const best=page.locator('[data-county-best] a');
 const requests=[];page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))requests.push(request.url());});
 for(const [query,href] of [['Buffalo','/areas/erie-county/'],['Cleveland','/areas/ohio/cuyahoga-county/'],['Miami','/areas/florida/miami-dade-county/'],['Newark','/areas/new-jersey/essex-county/']]){
  await search.fill(query);await expect(best.first()).toHaveAttribute('href',href);
  await expect(page.locator('[data-county-best] li').first()).toContainText('Matched city: '+query.toLowerCase());
 }
 await search.fill('Buffalo county WI');await expect(best).toHaveCount(1);await expect(best).toHaveAttribute('href','/areas/wisconsin/buffalo-county/');
 await search.fill('Newark village NY');await expect(best).toHaveCount(1);await expect(best).toHaveAttribute('href','/areas/wayne-county/');
 await search.fill('Newark');await page.getByRole('combobox',{name:'State or district',exact:true}).selectOption('delaware');
 await expect(best.first()).toHaveAttribute('href','/areas/delaware/new-castle-county/');
 await page.getByRole('button',{name:'Clear',exact:true}).click();await expect(search).toBeFocused();
 await search.fill('District of Columbia Federal District DC');await expect(best).toHaveCount(1);await expect(best).toHaveAttribute('href','/areas/district-of-columbia/district-of-columbia/');
 await search.fill('City of Traverse City MI');await expect(best).toHaveCount(2);
 expect(await best.evaluateAll(links=>links.map(link=>link.getAttribute('href')).sort())).toEqual(["/areas/michigan/grand-traverse-county/","/areas/michigan/leelanau-county/"]);
 await search.fill('Jackson county');await expect(best).toHaveCount(17);
 await expect(page.locator('[data-county-best] a[href="/areas/texas/#jackson"]')).toHaveText('Jackson County (Edna)');
 for(const [state,anchor] of [['missouri','Kansas City'],['iowa','Maquoketa']])await expect(page.locator(`[data-county-best] a[href="/areas/${state}/jackson-county/"]`)).toHaveText(`Jackson County (${anchor})`);
 await expect(page.locator('[data-county-more] a')).toHaveCount(0);
 await expect(page.locator('[data-county-best] li')).toContainText(Array(17).fill('Matched county: jackson'));
 expect(requests).toEqual([]);
});

test('directory navigation preserves skip links and moves focus into source references',async({page})=>{
 for(const path of ['/areas/','/areas/michigan/']){
  await page.goto(path+'?qa=1');await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'Skip to content',exact:true})).toBeFocused();await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
 }
 await page.goto('/areas/michigan/?qa=1#oakland');
 const entry=page.locator('#oakland');await expect(entry).toHaveAttribute('open','');
 const reference=entry.getByRole('link',{name:'Place definitions and sources'});
 const referenceId=(await reference.getAttribute('href')).slice(1);
 await reference.focus();await page.keyboard.press('Enter');
 const referenceRow=page.locator('#'+referenceId);await expect(referenceRow.locator('a').first()).toBeFocused();
 const sourceLink=referenceRow.locator('a[href^="#geography-source-"]').first();
 const sourceId=(await sourceLink.getAttribute('href')).slice(1);
 await sourceLink.focus();await page.keyboard.press('Enter');
 await expect(page.locator('#'+sourceId+' a')).toBeFocused();
 await page.goBack();await expect(referenceRow).toBeVisible();
});

async function checkCountyEntry(page,{state,slug,place,group,note,servicePath}){
 await expect(page).toHaveURL(url=>url.pathname===servicePath&&url.searchParams.get('qa')==='1');
 await expect(page.locator('main h1')).toBeVisible();
 const directory=page.locator(`main a[href="/areas/${state}/#${slug}"]`);await expect(directory).toHaveCount(1);
 await directory.focus();await page.keyboard.press('Enter');
 await expect(page).toHaveURL(url=>url.pathname===`/areas/${state}/`&&url.hash===`#${slug}`);
 const entry=page.locator(`[data-county-area][id="${slug}"]`);
 await expect(entry).toHaveAttribute('open','');
 // Cross-document fragments set the native tab starting point at the entry.
 await page.keyboard.press('Tab');
 await expect(entry.locator(':scope > summary')).toBeFocused();
 await expect(entry.locator('.county-directory')).toBeVisible();
 await expect(entry.getByRole('heading',{name:group,exact:true})).toBeVisible();
 await expect(entry.locator('.county-place-list').getByText(place,{exact:true})).toBeVisible();
 await expect(entry.locator('.county-geography-note')).toContainText(note);
 const reference=entry.getByRole('link',{name:'Place definitions and sources',exact:true});
 const referenceId=await reference.getAttribute('href');await reference.click();
 await expect(page.locator('.county-reference-sets')).toHaveAttribute('open','');
 const source=page.locator(referenceId).locator('a[href^="#geography-source-"]').first();
 const sourceId=await source.getAttribute('href');await source.click();
 await expect(page.locator('.county-source-index')).toHaveAttribute('open','');
 await expect(page.locator(sourceId)).toBeVisible();
 await expect(page.locator(sourceId+' a')).toHaveAttribute('href',/^https:\/\//);
}

test('county finder supports shared villages, county aliases and a useful empty state',async({page})=>{
 await page.goto('/areas/new-york/?qa=1');
 const search=page.getByRole('searchbox',{name:'County, parish, region or community'});
 const visible=page.locator('[data-county-results] li');
 const targets=async()=>visible.locator('a').evaluateAll(links=>links.map(link=>link.getAttribute('href')).sort());
 await expect(search).toBeVisible();await expect(page.locator('[data-cs]')).toHaveCount(62);await expect(visible).toHaveCount(0);
 const browse=page.locator('[data-county-browse-all]');await expect(browse).not.toHaveAttribute('open','');
 await browse.locator(':scope > summary').click();await expect(browse).toHaveAttribute('open','');
 await page.locator('#western-new-york > summary').click();
 await expect(page.locator('#western-new-york')).toHaveAttribute('open','');
 const initiallyOpenCount=await page.locator('[data-cs]:visible').count();expect(initiallyOpenCount).toBeGreaterThan(0);
 const searchRequests=[];page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))searchRequests.push(request.url());});
 await search.fill('Buffalo');await expect(page.locator('[data-county-best] a').first()).toHaveAttribute('href','/areas/erie-county/');await search.fill('Ithaca');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(["/areas/tompkins-county/"]);
 await search.fill('Saranac Lake');await expect(visible).toHaveCount(2);expect(await targets()).toEqual(["/areas/essex-county/","/areas/franklin-county/"]);
 await search.fill('Gowanda');await expect(visible).toHaveCount(2);expect(await targets()).toEqual(["/areas/cattaraugus-county/","/areas/erie-county/"]);
 await search.fill('Saint Lawrence');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(["/areas/st-lawrence-county/"]);
 await search.fill('St. Lawrence');await expect(visible).toHaveCount(1);
 await search.fill('Brooklyn');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(["/areas/kings-county/"]);
 await search.fill('New York City');await expect(visible).toHaveCount(5);expect(await targets()).toEqual(["/areas/bronx-county/","/areas/kings-county/","/areas/new-york-county/","/areas/queens-county/","/areas/richmond-county/"]);
 await search.fill('Hamburg');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(["/areas/erie-county/"]);
 await search.fill('not a real place 123');await expect(visible).toHaveCount(0);
 await expect(page.getByText('No service areas match that search.',{exact:true})).toBeVisible();
 await expect(page.locator('[data-county-filter-controls]').getByRole('status')).toHaveText('0 areas match your search.');
 await page.getByRole('button',{name:'Clear',exact:true}).click();await expect(search).toBeFocused();await expect(page.locator('[data-cs]:visible')).toHaveCount(initiallyOpenCount);await expect(visible).toHaveCount(0);await expect(page.locator('#western-new-york')).toHaveAttribute('open','');
 await expect(browse).toHaveAttribute('open','');
 await expect(page.locator('[data-county-directory]')).toBeVisible();
 expect(searchRequests).toEqual([]);
});

test('county finder keeps keyboard navigation, matched destination and page layout usable',async({page})=>{
 await page.goto('/areas/new-york/?qa=1');
 const search=page.getByRole('searchbox',{name:'County, parish, region or community'});
 await search.fill('Penn Yan');await expect(page.locator('[data-county-results] li')).toHaveCount(1);
 await search.press('Tab');await expect(page.getByRole('button',{name:'Clear',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.locator('[data-county-best] a')).toBeFocused();
 await page.keyboard.press('Enter');
 await checkCountyEntry(page,{servicePath:'/areas/yates-county/',state:'new-york',slug:'yates',place:'Penn Yan',group:'Villages',note:'Rushville crosses into Ontario County'});
 await expect(page.locator('main h1')).toContainText('New York');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});

test('combined finder disambiguates states and shared place names without sending search text',async({page})=>{
 await page.goto('/areas/?qa=1');
 const search=page.getByRole('searchbox',{name:'County, parish, region or community'}),state=page.getByRole('combobox',{name:'State or district',exact:true});
 const visible=page.locator('[data-county-results] li');
 const targets=async()=>visible.locator('a').evaluateAll(links=>links.map(link=>link.getAttribute('href')).sort());
 await expect(page.locator('[data-cs]')).toHaveCount(2214);await expect(visible).toHaveCount(0);
 const requests=[];page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))requests.push(request.url());});
 await search.fill('Hamburg');await expect(visible).toHaveCount(12);expect(await targets()).toEqual(["/areas/arkansas/#ashley","/areas/erie-county/","/areas/illinois/#calhoun","/areas/indiana/franklin-county/","/areas/iowa/fremont-county/","/areas/michigan/livingston-county/","/areas/missouri/scott-county/","/areas/new-jersey/sussex-county/","/areas/ohio/fairfield-county/","/areas/pennsylvania/berks-county/","/areas/wisconsin/#marathon","/areas/wisconsin/#vernon"]);
 await state.selectOption('pennsylvania');await expect(visible).toHaveCount(1);
 await expect(page.locator('[data-county-filter-controls]').getByRole('status')).toHaveText('1 area matches your search in Pennsylvania.');
 await search.fill('');await expect(visible).toHaveCount(67);
 await state.selectOption('new-york');await expect(visible).toHaveCount(62);
 await page.getByRole('button',{name:'Clear',exact:true}).click();await expect(state).toHaveValue('');await expect(search).toBeFocused();await expect(visible).toHaveCount(0);await expect(page.locator('[data-cs]')).toHaveCount(2214);
 await search.fill('Hamburg township MI');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(["/areas/michigan/livingston-county/"]);
 await search.fill('Hamburg CDP IN');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(["/areas/indiana/franklin-county/"]);
 await search.fill('Hamburg city IA');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(["/areas/iowa/fremont-county/"]);
 await search.fill('New Hamburg CDP MO');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(["/areas/missouri/scott-county/"]);
 await search.fill('Erie PA');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(["/areas/pennsylvania/erie-county/"]);
 await search.fill('Erie NY');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(["/areas/erie-county/"]);
 await search.fill('Erie County OH');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(["/areas/ohio/erie-county/"]);
 await state.selectOption('ohio');await search.fill('');await expect(visible).toHaveCount(88);
 await search.fill('Erie NY');await expect(visible).toHaveCount(0);
 await state.selectOption('pennsylvania');await expect(visible).toHaveCount(0);
 await expect(page.getByText('No service areas match that search.',{exact:true})).toBeVisible();
 expect(requests).toEqual([]);
});

test('Ohio finder distinguishes cities, villages and cross-county destinations',async({page})=>{
 await page.goto('/areas/ohio/?qa=1');
 const search=page.getByRole('searchbox',{name:'County, parish, region or community'}),visible=page.locator('[data-county-results] li');
 const targets=async()=>visible.locator('a').evaluateAll(links=>links.map(link=>link.getAttribute('href')).sort());
 const county=slug=>`/areas/ohio/${slug}-county/`;
 await expect(page.locator('[data-cs]')).toHaveCount(88);await expect(visible).toHaveCount(0);
 const requests=[];page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))requests.push(request.url());});
 for(const [query,slugs] of [['Columbus city',['delaware','fairfield','franklin']],['Dublin city',['delaware','franklin','union']],['Fostoria city',['hancock','seneca','wood']],['Hamilton city',['butler']],['Sandusky city',['erie']],['Sandusky city OH',['erie']],['Upper Sandusky city',['wyandot']],['Saint Clairsville city',['belmont']],['McArthur village',['vinton']],['Yellow Springs village',['greene']]]){
  await search.fill(query);await expect(visible).toHaveCount(slugs.length);expect(await targets()).toEqual(slugs.map(county).sort());
 }
 await search.press('Tab');await expect(page.getByRole('button',{name:'Clear',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.locator('[data-county-best] a')).toBeFocused();
 await page.keyboard.press('Enter');
 await checkCountyEntry(page,{servicePath:'/areas/ohio/greene-county/',state:'ohio',slug:'greene',place:'Yellow Springs',group:'Villages',note:'Xenia is Greene County'});
 await expect(page.getByRole('navigation',{name:'Breadcrumb'})).toContainText('Ohio');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 expect(requests).toEqual([]);
});

test('Pennsylvania finder supports cross-county cities, community names and keyboard destinations',async({page})=>{
 await page.goto('/areas/pennsylvania/?qa=1');
 const search=page.getByRole('searchbox',{name:'County, parish, region or community'}),visible=page.locator('[data-county-results] li');
 const targets=async()=>visible.locator('a').evaluateAll(links=>links.map(link=>link.getAttribute('href')).sort());
 await expect(page.locator('[data-cs]')).toHaveCount(67);await expect(visible).toHaveCount(0);
 await search.fill('Bethlehem');await expect(visible).toHaveCount(5);expect(await targets()).toEqual(["/areas/pennsylvania/armstrong-county/","/areas/pennsylvania/clarion-county/","/areas/pennsylvania/lehigh-county/","/areas/pennsylvania/northampton-county/","/areas/pennsylvania/washington-county/"]);
 await search.fill('Bethlehem city');await expect(visible).toHaveCount(2);expect(await targets()).toEqual(["/areas/pennsylvania/lehigh-county/","/areas/pennsylvania/northampton-county/"]);
 await search.fill('State College borough');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(["/areas/pennsylvania/centre-county/"]);
 await search.fill('King of Prussia');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(["/areas/pennsylvania/montgomery-county/"]);
 await search.fill('DuBois city');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(["/areas/pennsylvania/clearfield-county/"]);
 await search.press('Tab');await expect(page.getByRole('button',{name:'Clear',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.locator('[data-county-best] a')).toBeFocused();
 await page.keyboard.press('Enter');
 await checkCountyEntry(page,{servicePath:'/areas/pennsylvania/clearfield-county/',state:'pennsylvania',slug:'clearfield',place:'DuBois',group:'Cities',note:'January 5, 2026'});
 await expect(page.getByRole('navigation',{name:'Breadcrumb'})).toContainText('Pennsylvania');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
