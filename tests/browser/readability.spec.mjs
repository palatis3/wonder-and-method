import {test,expect} from './fixtures.mjs';

test('table regions enter the tab order only while they need scrolling',async({page})=>{
 await page.goto('/guides/website-project-cost/');
 const region=page.locator('.journal-table-wrap').first();
 await expect(region).not.toHaveAttribute('tabindex','0');
 // A longer table or user text scaling can create genuine horizontal overflow.
 await region.evaluate(el=>{el.style.overflowX='auto';el.querySelector('table').style.minWidth='1800px';});
 await expect(region).toHaveAttribute('tabindex','0');
 await region.focus();await page.keyboard.press('ArrowRight');
 await expect.poll(()=>region.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
 await region.evaluate(el=>{el.style.removeProperty('overflow-x');el.querySelector('table').style.removeProperty('min-width');});
 await expect(region).not.toHaveAttribute('tabindex','0');
 await page.goto('/');
 expect(await page.locator('.city-project[role="tabpanel"]').count()).toBe(3);
 for(const panel of await page.locator('.city-project[role="tabpanel"]').all())await expect(panel).toHaveAttribute('tabindex','0');
});

test('concise budgets retain comparable columns and semantic headers at narrow widths',async({page})=>{
 for(const path of ['/guides/website-maintenance-cost/','/guides/website-project-cost/']){
  await page.goto(path);
  for(const width of [320,390,640,1440]){
   await page.setViewportSize({width,height:900});
   for(const table of await page.locator('.compact-money-table').all()){
    await expect(table).toBeVisible();
    expect(await table.evaluate(el=>getComputedStyle(el).display)).toBe('table');
    expect(await table.getByRole('columnheader').count()).toBe(2);
    expect(await table.getByRole('rowheader').count()).toBeGreaterThan(1);
    const snapshot=await table.ariaSnapshot();expect(snapshot).toMatch(/- table/);expect(snapshot).toMatch(/- cell/);
   }
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),path+' '+width).toBeLessThanOrEqual(1);
  }
 }
});

test('phone wordmarks and standalone guide and add-on links have comfortable targets',async({page})=>{
 for(const path of ['/','/guides/','/services/website-addons/','/work/fieldwork/'])for(const width of [320,640]){
  await page.setViewportSize({width,height:900});await page.goto(path);
  const targets=page.locator('.site-header .wordmark,.journal-group h3>a,.addon-title h3>a,.studio-concept-debrief>.button');
  expect(await targets.count()).toBeGreaterThan(0);
  for(const target of await targets.all())if(await target.isVisible())expect((await target.boundingBox()).height,path).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),path).toBeLessThanOrEqual(1);
 }
});

test('compact budgets contain scrolling and expose keyboard access with enlarged text',async({page})=>{
 await page.setViewportSize({width:320,height:900});
 let checked=0;
 for(const path of ['/guides/website-maintenance-cost/','/guides/website-project-cost/']){
  await page.goto(path);await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  for(const table of await page.locator('.compact-money-table').all()){
   const region=table.locator('..');
   await expect(region).toHaveAttribute('tabindex','0');
   expect(await table.getByRole('columnheader').count()).toBe(2);
   expect(await table.ariaSnapshot()).toMatch(/- rowheader/);
   await region.focus();await page.keyboard.press('ArrowRight');
   await expect.poll(()=>region.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
   checked++;
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),path).toBeLessThanOrEqual(1);
  await page.evaluate(()=>document.documentElement.style.removeProperty('font-size'));
  for(const table of await page.locator('.compact-money-table').all())await expect(table.locator('..')).not.toHaveAttribute('tabindex','0');
 }
 expect(checked).toBe(3);
});
