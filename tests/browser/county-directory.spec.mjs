import {test,expect} from './fixtures.mjs';

test('county finder supports shared villages, county aliases and a useful empty state',async({page})=>{
 await page.goto('/areas/?qa=1');
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
 await search.fill('Hamburg');await expect(visible).toHaveCount(1);expect(await targets()).toEqual(['/areas/erie-county/']);
 await search.fill('not a real place 123');await expect(visible).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'No county guides match that search.'})).toBeVisible();
 await expect(page.locator('[data-county-filter-controls]').getByRole('status')).toHaveText('0 county guides match your search.');
 await page.getByRole('button',{name:'Clear search',exact:true}).click();await expect(search).toBeFocused();await expect(visible).toHaveCount(62);
 await expect(page.getByRole('navigation',{name:'New York service regions'})).toBeVisible();
 expect(searchRequests).toEqual([]);
});

test('county finder keeps keyboard navigation, matched destination and page layout usable',async({page})=>{
 await page.goto('/areas/?qa=1');
 const search=page.getByRole('searchbox',{name:'Find a county or community'});
 await search.fill('Penn Yan');await expect(page.locator('[data-county-search]:visible')).toHaveCount(1);
 await search.press('Tab');await expect(page.getByRole('button',{name:'Clear search',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.locator('[data-county-search]:visible a')).toBeFocused();
 await page.keyboard.press('Enter');await expect(page).toHaveURL(/\/areas\/yates-county\/(?:\?qa=1)?$/);
 await expect(page.locator('main h1')).toContainText('Yates');
 await expect(page.locator('.county-faq summary')).toHaveCount(6);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
