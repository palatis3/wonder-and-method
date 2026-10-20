import {test,expect} from './fixtures.mjs';
import offers from '../../config/offers.json' with {type:'json'};
import {money} from '../../src/shared.mjs';

test('pricing and payment tables preserve labelled values in phone cards and desktop tables',async({page})=>{
 for(const width of [320,390,640,768])for(const path of ['/pricing/','/payments/']){
  await page.setViewportSize({width,height:844});await page.goto(path+'?qa=payment-table');await page.evaluate(()=>document.fonts.ready);
  for(const details of await page.locator('main details').all())if(await details.getAttribute('open')===null)await details.locator(':scope > summary').click();
  const tables=page.locator('main table');expect(await tables.count()).toBeGreaterThanOrEqual(2);
  for(const table of await tables.all()){
   await expect(table).toHaveAttribute('role','table');
   const headers=await table.locator('thead th').allTextContents();
   for(const row of await table.locator('tbody tr').all()){
    const cells=row.locator('td');
    for(let i=0;i<await cells.count();i++)await expect(cells.nth(i)).toHaveAttribute('data-label',headers[i+1].trim());
   }
   const broken=await table.locator('tbody th,tbody td').evaluateAll(elements=>elements.flatMap(el=>{
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),broken=[];let node;
    while(node=walker.nextNode())for(const match of node.textContent.matchAll(/\$[\d,]+(?:\.\d{2})?|[A-Za-z]+/g)){
     const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);if(range.getClientRects().length!==1)broken.push(match[0]);
    }return broken;
   }));
   expect(broken,width+'px '+path+' unbroken words and amounts').toEqual([]);
   if(width<768)await expect(table).toHaveCSS('display','block');else await expect(table).toHaveCSS('display','table');
  }
  if(path==='/payments/'){
   const rows=page.locator('#build-payments tbody tr');
   for(const [index,id] of ['launch_site','focused_site','signature_site'].entries())await expect(rows.nth(index).locator('td')).toHaveText(offers[id].payment_schedule.map(stage=>money(stage.amount)));
   for(const [index,id] of ['keep_running','improve','grow'].entries())await expect(page.locator('#monthly-payments tbody tr').nth(index).locator('td')).toHaveText([money(offers.plans[id].monthly_price),money(offers.plans[id].monthly_price),money(offers.baseline.one_time_price+offers.plans[id].monthly_price)]);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+'px '+path+' page must fit').toBe(true);
 }
});
