import {test,expect} from './fixtures.mjs';
import offers from '../../config/offers.json' with {type:'json'};
import {money} from '../../src/shared.mjs';

test('V4 payment cards preserve labelled amounts and fit narrow and desktop screens',async({page})=>{
 for(const width of [320,390,640,768])for(const path of ['/pricing/','/payments/']){
  await page.setViewportSize({width,height:844});await page.goto(path+'?qa=payment-table');await page.evaluate(()=>document.fonts.ready);
  const cards=page.locator('.v3-payment-list>article');await expect(cards).toHaveCount(4);
  for(const [index,id] of ['launch_site','focused_site','business_site','signature_site'].entries()){
   await expect(cards.nth(index).locator('h3')).toHaveText(offers[id].public_name);
   const steps=cards.nth(index).locator('li');await expect(steps).toHaveCount(3);
   for(const [i,stage] of offers[id].payment_schedule.entries()){
    await expect(steps.nth(i)).toContainText(money(stage.amount)+' · '+stage.percent+'%');
    await expect(steps.nth(i)).toContainText(stage.event);
   }
  }
  const broken=await cards.locator('li strong').evaluateAll(elements=>elements.flatMap(el=>{
   const node=el.firstChild,broken=[];
   for(const match of node.textContent.matchAll(/\$[\d,]+(?:\.\d{2})?/g)){
    const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
    if(range.getClientRects().length!==1)broken.push(match[0]);
   }return broken;
  }));expect(broken,width+'px '+path+' currency must remain readable').toEqual([]);
  if(path==='/payments/'){
   const monthly=page.locator('#monthly-payments .v3-comparison-list>article');await expect(monthly).toHaveCount(4);
   for(const [index,id] of ['keep_running','improve','local_focus','grow'].entries()){
    await expect(monthly.nth(index)).toContainText(offers.plans[id].public_name);
    const options=monthly.nth(index).locator('.v4-variants>div');await expect(options).toHaveCount(Object.keys(offers.plans[id].variants).length);
    for(const [optionIndex,variant] of Object.values(offers.plans[id].variants).entries()){await expect(options.nth(optionIndex)).toContainText(variant.name);await expect(options.nth(optionIndex)).toContainText(money(variant.price)+'/mo');}
   }
   await expect(page.locator('#monthly-payments')).toContainText('exact first invoice');
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+'px '+path+' page must fit').toBe(true);
 }
});
