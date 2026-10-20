import {test,expect} from './fixtures.mjs';

test('county finder supports shared villages, county aliases and a useful empty state',async({page})=>{
 await page.goto('/areas/new-york/?qa=1');
 const search=page.getByRole('searchbox',{name:'Find a county or community'});
 const visible=page.locator('[data-county-search]:visible');
 const targets=async()=>visible.locator('a').evaluateAll(links=>links.map(link=>link.getAttribute('href')).sort());
 await expect(search).toBeVisible();await expect(visible).toHaveCount(62);
 const searchRequests=[];page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))searchRequests.push(request.url());});
 await search.fill('Ithaca');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/tompkins-county/']);
 await search.fill('Saranac Lake');await expect(visible).toHaveCount(2);expect(await targets()).toEqual(['/areas/essex-county/','/areas/franklin-county/']);
 await search.fill('Gowanda');await expect(visible).toHaveCount(2);expect(await targets()).toEqual(['/areas/cattaraugus-county/','/areas/erie-county/']);
 await search.fill('Saint Lawrence');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/st-lawrence-county/']);
 await search.fill('St. Lawrence');await expect(visible).toHaveCount(1);
 await search.fill('Brooklyn');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/kings-county/']);
 await search.fill('New York City');await expect(visible).toHaveCount(5);expect(await targets()).toEqual(['/areas/bronx-county/','/areas/kings-county/','/areas/new-york-county/','/areas/queens-county/','/areas/richmond-county/']);
 await search.fill('Hamburg');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/erie-county/']);
 await search.fill('not a real place 123');await expect(visible).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'No county guides match that search.'})).toBeVisible();
 await expect(page.locator('[data-county-filter-controls]').getByRole('status')).toHaveText('0 county guides match your search.');
 await page.getByRole('button',{name:'Clear search',exact:true}).click();await expect(search).toBeFocused();await expect(visible).toHaveCount(62);
 await expect(page.getByRole('navigation',{name:'New York service regions'})).toBeVisible();
 expect(searchRequests).toEqual([]);
});

test('county finder keeps keyboard navigation, matched destination and page layout usable',async({page})=>{
 await page.goto('/areas/new-york/?qa=1');
 const search=page.getByRole('searchbox',{name:'Find a county or community'});
 await search.fill('Penn Yan');await expect(page.locator('[data-county-search]:visible')).toHaveCount(1);
 await search.press('Tab');await expect(page.getByRole('button',{name:'Clear search',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.locator('[data-county-search]:visible a')).toBeFocused();
 await page.keyboard.press('Enter');await expect(page).toHaveURL(/\/areas\/yates-county\/(?:\?qa=1)?$/);
 await expect(page.locator('main h1')).toContainText('Yates');
 await expect(page.locator('.county-faq summary')).toHaveCount(6);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});

test('combined finder disambiguates states and shared place names without sending search text',async({page})=>{
 await page.goto('/areas/?qa=1');
 const search=page.getByRole('searchbox',{name:'Find a county or community'}),state=page.getByRole('combobox',{name:'Filter by state'});
 const visible=page.locator('[data-county-search]:visible');
 const targets=async()=>visible.locator('a').evaluateAll(links=>links.map(link=>link.getAttribute('href')).sort());
 await expect(visible).toHaveCount(217);
 const requests=[];page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))requests.push(request.url());});
 await search.fill('Hamburg');await expect(visible).toHaveCount(3);expect(await targets()).toEqual(['/areas/erie-county/','/areas/ohio/fairfield-county/','/areas/pennsylvania/berks-county/']);
 await state.selectOption('pennsylvania');await expect(visible).toHaveCount(1);
 await expect(page.locator('[data-county-filter-controls]').getByRole('status')).toHaveText('1 county guide matches your search in Pennsylvania.');
 await search.fill('');await expect(visible).toHaveCount(67);
 await state.selectOption('new-york');await expect(visible).toHaveCount(62);
 await page.getByRole('button',{name:'Clear search',exact:true}).click();await expect(state).toHaveValue('');await expect(search).toBeFocused();await expect(visible).toHaveCount(217);
 await search.fill('Erie PA');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/pennsylvania/erie-county/']);
 await search.fill('Erie NY');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/erie-county/']);
 await search.fill('Erie County OH');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/ohio/erie-county/']);
 await state.selectOption('ohio');await search.fill('');await expect(visible).toHaveCount(88);
 await search.fill('Erie NY');await expect(visible).toHaveCount(0);
 await state.selectOption('pennsylvania');await expect(visible).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'No county guides match that search.'})).toBeVisible();
 expect(requests).toEqual([]);
});

test('Ohio finder distinguishes cities, villages and cross-county destinations',async({page})=>{
 await page.goto('/areas/ohio/?qa=1');
 const search=page.getByRole('searchbox',{name:'Find a county or community'}),visible=page.locator('[data-county-search]:visible');
 const targets=async()=>visible.locator('a').evaluateAll(links=>links.map(link=>link.getAttribute('href')).sort());
 const county=slug=>`/areas/ohio/${slug}-county/`;
 await expect(visible).toHaveCount(88);
 const requests=[];page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))requests.push(request.url());});
 for(const [query,slugs] of [['Columbus city',['delaware','fairfield','franklin']],['Dublin city',['delaware','franklin','union']],['Fostoria city',['hancock','seneca','wood']],['Hamilton city',['butler']],['Sandusky city',['erie']],['Sandusky city OH',['erie']],['Upper Sandusky city',['wyandot']],['Saint Clairsville city',['belmont']],['McArthur village',['vinton']],['Yellow Springs village',['greene']]]){
  await search.fill(query);expect(await targets()).toEqual(slugs.map(county).sort());
 }
 await search.press('Tab');await expect(page.getByRole('button',{name:'Clear search',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');await expect(visible.locator('a')).toBeFocused();
 await page.keyboard.press('Enter');await expect(page).toHaveURL(/\/areas\/ohio\/greene-county\/(?:\?qa=1)?$/);
 await expect(page.locator('main h1')).toContainText('Greene');await expect(page.locator('.county-faq summary')).toHaveCount(6);
 await expect(page.getByRole('navigation',{name:'Breadcrumb'})).toContainText('Ohio');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 expect(requests).toEqual([]);
});

test('Pennsylvania finder supports cross-county cities, community names and keyboard destinations',async({page})=>{
 await page.goto('/areas/pennsylvania/?qa=1');
 const search=page.getByRole('searchbox',{name:'Find a county or community'}),visible=page.locator('[data-county-search]:visible');
 const targets=async()=>visible.locator('a').evaluateAll(links=>links.map(link=>link.getAttribute('href')).sort());
 await expect(visible).toHaveCount(67);
 await search.fill('Bethlehem');await expect(visible).toHaveCount(5);expect(await targets()).toEqual(['/areas/pennsylvania/armstrong-county/','/areas/pennsylvania/clarion-county/','/areas/pennsylvania/lehigh-county/','/areas/pennsylvania/northampton-county/','/areas/pennsylvania/washington-county/']);
 await search.fill('Bethlehem city');await expect(visible).toHaveCount(2);expect(await targets()).toEqual(['/areas/pennsylvania/lehigh-county/','/areas/pennsylvania/northampton-county/']);
 await search.fill('State College borough');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/pennsylvania/centre-county/']);
 await search.fill('King of Prussia');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/pennsylvania/montgomery-county/']);
 await search.fill('DuBois city');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/pennsylvania/clearfield-county/']);
 await search.press('Tab');await expect(page.getByRole('button',{name:'Clear search',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');await expect(visible.locator('a')).toBeFocused();
 await page.keyboard.press('Enter');await expect(page).toHaveURL(/\/areas\/pennsylvania\/clearfield-county\/(?:\?qa=1)?$/);
 await expect(page.locator('main h1')).toContainText('Clearfield');await expect(page.locator('.county-faq summary')).toHaveCount(6);
 await expect(page.getByRole('navigation',{name:'Breadcrumb'})).toContainText('Pennsylvania');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
