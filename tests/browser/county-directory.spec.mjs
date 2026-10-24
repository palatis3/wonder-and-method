import {test,expect} from './fixtures.mjs';

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

async function checkCountyEntry(page,{state,slug,place,group,note}){
 await expect(page).toHaveURL(url=>url.pathname===`/areas/${state}/`&&url.hash===`#${slug}`);
 const entry=page.locator(`[data-county-area][id="${slug}"]`);
 await expect(entry).toHaveAttribute('open','');
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
 const search=page.getByRole('searchbox',{name:'County, region or community'});
 const visible=page.locator('[data-county-results] li');
 const targets=async()=>visible.locator('a').evaluateAll(links=>links.map(link=>link.getAttribute('href')).sort());
 await expect(search).toBeVisible();await expect(page.locator('[data-cs]')).toHaveCount(62);await expect(visible).toHaveCount(0);
 await page.locator('#western-new-york > summary').click();
 await expect(page.locator('#western-new-york')).toHaveAttribute('open','');
 const initiallyOpenCount=await page.locator('[data-cs]:visible').count();expect(initiallyOpenCount).toBeGreaterThan(0);
 const searchRequests=[];page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))searchRequests.push(request.url());});
 await search.fill('Buffalo');await expect(page.locator('[data-county-best] a').first()).toHaveAttribute('href','/areas/erie-county/');await search.fill('Ithaca');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/new-york/#tompkins']);
 await search.fill('Saranac Lake');await expect(visible).toHaveCount(2);expect(await targets()).toEqual(['/areas/new-york/#essex','/areas/new-york/#franklin']);
 await search.fill('Gowanda');await expect(visible).toHaveCount(2);expect(await targets()).toEqual(['/areas/erie-county/','/areas/new-york/#cattaraugus']);
 await search.fill('Saint Lawrence');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/new-york/#st-lawrence']);
 await search.fill('St. Lawrence');await expect(visible).toHaveCount(1);
 await search.fill('Brooklyn');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/new-york/#kings']);
 await search.fill('New York City');await expect(visible).toHaveCount(5);expect(await targets()).toEqual(['/areas/new-york/#bronx','/areas/new-york/#kings','/areas/new-york/#new-york','/areas/new-york/#queens','/areas/new-york/#richmond']);
 await search.fill('Hamburg');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/erie-county/']);
 await search.fill('not a real place 123');await expect(visible).toHaveCount(0);
 await expect(page.getByText('No service areas match that search.',{exact:true})).toBeVisible();
 await expect(page.locator('[data-county-filter-controls]').getByRole('status')).toHaveText('0 areas match your search.');
 await page.getByRole('button',{name:'Clear',exact:true}).click();await expect(search).toBeFocused();await expect(page.locator('[data-cs]:visible')).toHaveCount(initiallyOpenCount);await expect(visible).toHaveCount(0);await expect(page.locator('#western-new-york')).toHaveAttribute('open','');
 await expect(page.locator('[data-county-directory]')).toBeVisible();
 expect(searchRequests).toEqual([]);
});

test('county finder keeps keyboard navigation, matched destination and page layout usable',async({page})=>{
 await page.goto('/areas/new-york/?qa=1');
 const search=page.getByRole('searchbox',{name:'County, region or community'});
 await search.fill('Penn Yan');await expect(page.locator('[data-county-results] li')).toHaveCount(1);
 await search.press('Tab');await expect(page.getByRole('button',{name:'Clear',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.locator('[data-county-best] a')).toBeFocused();
 await page.keyboard.press('Enter');
 await checkCountyEntry(page,{state:'new-york',slug:'yates',place:'Penn Yan',group:'Villages',note:'Rushville crosses into Ontario County'});
 await expect(page.locator('main h1')).toContainText('New York');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});

test('combined finder disambiguates states and shared place names without sending search text',async({page})=>{
 await page.goto('/areas/?qa=1');
 const search=page.getByRole('searchbox',{name:'County, region or community'}),state=page.getByRole('combobox',{name:'State or district',exact:true});
 const visible=page.locator('[data-county-results] li');
 const targets=async()=>visible.locator('a').evaluateAll(links=>links.map(link=>link.getAttribute('href')).sort());
 await expect(page.locator('[data-cs]')).toHaveCount(1607);await expect(visible).toHaveCount(0);
 const requests=[];page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))requests.push(request.url());});
 await search.fill('Hamburg');await expect(visible).toHaveCount(9);expect(await targets()).toEqual(['/areas/erie-county/','/areas/illinois/#calhoun','/areas/indiana/#franklin','/areas/michigan/#livingston','/areas/new-jersey/#sussex','/areas/ohio/#fairfield','/areas/pennsylvania/#berks','/areas/wisconsin/#marathon','/areas/wisconsin/#vernon']);
 await state.selectOption('pennsylvania');await expect(visible).toHaveCount(1);
 await expect(page.locator('[data-county-filter-controls]').getByRole('status')).toHaveText('1 area matches your search in Pennsylvania.');
 await search.fill('');await expect(visible).toHaveCount(67);
 await state.selectOption('new-york');await expect(visible).toHaveCount(62);
 await page.getByRole('button',{name:'Clear',exact:true}).click();await expect(state).toHaveValue('');await expect(search).toBeFocused();await expect(visible).toHaveCount(0);await expect(page.locator('[data-cs]')).toHaveCount(1607);
 await search.fill('Hamburg township MI');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/michigan/#livingston']);
 await search.fill('Hamburg CDP IN');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/indiana/#franklin']);
 await search.fill('Erie PA');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/pennsylvania/#erie']);
 await search.fill('Erie NY');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/erie-county/']);
 await search.fill('Erie County OH');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/ohio/#erie']);
 await state.selectOption('ohio');await search.fill('');await expect(visible).toHaveCount(88);
 await search.fill('Erie NY');await expect(visible).toHaveCount(0);
 await state.selectOption('pennsylvania');await expect(visible).toHaveCount(0);
 await expect(page.getByText('No service areas match that search.',{exact:true})).toBeVisible();
 expect(requests).toEqual([]);
});

test('Ohio finder distinguishes cities, villages and cross-county destinations',async({page})=>{
 await page.goto('/areas/ohio/?qa=1');
 const search=page.getByRole('searchbox',{name:'County, region or community'}),visible=page.locator('[data-county-results] li');
 const targets=async()=>visible.locator('a').evaluateAll(links=>links.map(link=>link.getAttribute('href')).sort());
 const county=slug=>`/areas/ohio/#${slug}`;
 await expect(page.locator('[data-cs]')).toHaveCount(88);await expect(visible).toHaveCount(0);
 const requests=[];page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))requests.push(request.url());});
 for(const [query,slugs] of [['Columbus city',['delaware','fairfield','franklin']],['Dublin city',['delaware','franklin','union']],['Fostoria city',['hancock','seneca','wood']],['Hamilton city',['butler']],['Sandusky city',['erie']],['Sandusky city OH',['erie']],['Upper Sandusky city',['wyandot']],['Saint Clairsville city',['belmont']],['McArthur village',['vinton']],['Yellow Springs village',['greene']]]){
  await search.fill(query);await expect(visible).toHaveCount(slugs.length);expect(await targets()).toEqual(slugs.map(county).sort());
 }
 await search.press('Tab');await expect(page.getByRole('button',{name:'Clear',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.locator('[data-county-best] a')).toBeFocused();
 await page.keyboard.press('Enter');
 await checkCountyEntry(page,{state:'ohio',slug:'greene',place:'Yellow Springs',group:'Villages',note:'Xenia is Greene County'});
 await expect(page.getByRole('navigation',{name:'Breadcrumb'})).toContainText('Ohio');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 expect(requests).toEqual([]);
});

test('Pennsylvania finder supports cross-county cities, community names and keyboard destinations',async({page})=>{
 await page.goto('/areas/pennsylvania/?qa=1');
 const search=page.getByRole('searchbox',{name:'County, region or community'}),visible=page.locator('[data-county-results] li');
 const targets=async()=>visible.locator('a').evaluateAll(links=>links.map(link=>link.getAttribute('href')).sort());
 await expect(page.locator('[data-cs]')).toHaveCount(67);await expect(visible).toHaveCount(0);
 await search.fill('Bethlehem');await expect(visible).toHaveCount(5);expect(await targets()).toEqual(['/areas/pennsylvania/#armstrong','/areas/pennsylvania/#clarion','/areas/pennsylvania/#lehigh','/areas/pennsylvania/#northampton','/areas/pennsylvania/#washington']);
 await search.fill('Bethlehem city');await expect(visible).toHaveCount(2);expect(await targets()).toEqual(['/areas/pennsylvania/#lehigh','/areas/pennsylvania/#northampton']);
 await search.fill('State College borough');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/pennsylvania/#centre']);
 await search.fill('King of Prussia');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/pennsylvania/#montgomery']);
 await search.fill('DuBois city');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/pennsylvania/#clearfield']);
 await search.press('Tab');await expect(page.getByRole('button',{name:'Clear',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.locator('[data-county-best] a')).toBeFocused();
 await page.keyboard.press('Enter');
 await checkCountyEntry(page,{state:'pennsylvania',slug:'clearfield',place:'DuBois',group:'Cities',note:'January 5, 2026'});
 await expect(page.getByRole('navigation',{name:'Breadcrumb'})).toContainText('Pennsylvania');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
