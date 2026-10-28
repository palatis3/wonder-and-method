import {test,expect} from './fixtures.mjs';
import {assertLocationBrief,assertLocationSources} from './location-brief-checks.mjs';

test('stacked and desktop planning tables retain accessible headers, rows and cells',async({page})=>{
 // These local routes now expose decisions as semantic lists, with sources
 // available by keyboard. Preserve their cross-browser coverage explicitly.
 for(const path of ['/areas/florida/brevard-county/','/areas/south-carolina/darlington-county/']){
  const response=await page.goto(path);expect(response.status(),path).toBe(200);
  await assertLocationBrief(page,path);await assertLocationSources(page,path);
  await expect(page.locator('.location-planning-table,.local-brief-summary')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),path).toBeLessThanOrEqual(1);
 }
 for(const path of ['/payments/','/guides/brevard-county-launch-tour-website/','/guides/custom-website-or-template/']){
  const response=await page.goto(path);expect(response.status(),path).toBe(200);
  for(const details of await page.locator('main details').all())if(await details.getAttribute('open')===null)await details.locator(':scope > summary').click();
  const table=page.locator('table.responsive-table').first();await expect(table).toBeVisible();
  const snapshot=await table.ariaSnapshot();
  expect(snapshot,path).toMatch(/- table/);expect(snapshot,path).toMatch(/- row/);
  expect(snapshot,path).toMatch(/- columnheader/);expect(snapshot,path).toMatch(/- cell/);
  expect(await table.getByRole('row').count(),path).toBeGreaterThan(1);
  expect(await table.getByRole('columnheader').count(),path).toBeGreaterThan(1);
  expect(await table.getByRole('cell').count(),path).toBeGreaterThan(1);
  await expect(table.locator('caption')).not.toBeEmpty();
  if(page.viewportSize().width<768){
   await expect(table.locator('tbody td[data-label]').first()).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),path).toBeLessThanOrEqual(1);
  }
 }
});
