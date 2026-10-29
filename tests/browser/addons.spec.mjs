import {test,expect} from './fixtures.mjs';
import offers from '../../config/offers.json' with {type:'json'};
import {money} from '../../src/shared.mjs';

test('all addition prices, scope disclosures and request links work on the catalogue',async({page})=>{
 await page.goto('/services/website-addons/?qa=addons');
 await expect(page.locator('.v3-addon-card')).toHaveCount(14);
 for(const item of offers.add_ons){
  const row=page.locator('#addon-'+item.id);
  await expect(row.locator('.v3-addon-price')).toContainText(money(item.public_price));
  await expect(row.getByRole('link',{name:'Ask about this addition',exact:true})).toHaveAttribute('href',`/contact/?request_kind=question&addons=${item.id}#inquiry`);
 }
 const disclosure=page.locator('#addon-guided_quote_form summary');
 await disclosure.focus();await page.keyboard.press('Enter');
 await expect(page.locator('#addon-guided_quote_form details')).toHaveAttribute('open','');
 await expect(page.locator('#addon-guided_quote_form details')).toContainText('15 fields');
 await page.locator('#addon-guided_quote_form').getByRole('link',{name:'Ask about this addition',exact:true}).click();
 await expect(page.locator('#inquiry-addon-guided_quote_form')).toBeChecked();
 await expect(page.locator('[data-addon-total]')).toHaveText('$1,200');
 await expect(page.locator('#request_kind')).toHaveValue('question');
 await expect(page.locator('.addon-picker')).not.toHaveAttribute('open','');
});

test('multiple additions survive a failed enhanced request and appear in its confirmed receipt',async({page})=>{
 let calls=0;const payloads=[];
 await page.route('http://127.0.0.1:4187/api/inquiries',async route=>{
  payloads.push(route.request().postDataJSON());calls++;
  await route.fulfill({status:calls===1?503:201,contentType:'application/json',body:JSON.stringify(calls===1?{message:'Synthetic retry needed.'}:{reference:'00000000-0000-4000-8000-000000000001',synthetic:true})});
 });
 await page.goto('/checkout/launch-site/?addons=booking_setup,standard_page#inquiry');
 await expect(page.locator('[data-addon-total]')).toHaveText('$1,200');
 await expect(page.locator('[data-addon-project-total]')).toContainText('$4,150');
 await page.locator('.addon-picker summary').click();await page.locator('#inquiry-addon-guided_quote_form').check();
 await page.locator('#inquiry-addon-standard_page').uncheck();
 await expect(page.locator('[data-addon-total]')).toHaveText('$2,050');
 await expect(page.locator('[data-addon-project-total]')).toContainText('$5,000');
 await expect(page.locator('[data-addon-payments]')).toContainText('$2,000 to book (40%)');
 await expect(page.locator('[data-addon-payments]')).toContainText('$1,500 after copy/design approval (30%)');
 await expect(page.locator('[data-addon-payments]')).toContainText('$1,500 after staging approval');
 await expect(page.locator('[data-checkout-question]')).toHaveCount(0);
 await expect(page.locator('#request_kind')).toHaveValue('checkout');
 await expect(page.locator('#service')).toHaveValue('launch_site');
 await page.locator('#name').fill('Synthetic additions fixture');
 await page.locator('#email').fill('fixture@example.test');
 await page.locator('#message').fill('Please quote these additional tools for a fictional test project.');
 await page.getByRole('button',{name:'Request my Focused proposal',exact:true}).click();
 await expect(page.locator('#form-status')).toContainText('Synthetic retry needed');
 await expect(page.locator('#inquiry-addon-booking_setup')).toBeChecked();
 await expect(page.locator('#inquiry-addon-guided_quote_form')).toBeChecked();
 await page.getByRole('button',{name:'Request my Focused proposal',exact:true}).click();
 await expect(page.locator('#inquiry-confirmation')).toBeFocused();
 await expect(page.locator('#inquiry-confirmation')).toContainText('One-time additions subtotal: $2,050');
 expect(payloads[1]).toEqual(payloads[0]);
 expect(payloads[1].add_ons).toEqual(['booking_setup','guided_quote_form']);
 expect(Object.keys(payloads[1]).filter(key=>key.startsWith('addon_'))).toEqual([]);
});

test('estimator includes selected additions once through package and recurring-plan changes',async({page})=>{
 await page.goto('/payments/?qa=addons#cost-calculator');
 await page.locator('#cost-calculator .addon-picker summary').click();
 await page.locator('#estimate-addon-three_page_bundle').check();
 await page.locator('#estimate-addon-booking_setup').check();
 await expect(page.locator('#cost-total')).toHaveText('Your estimate so far: $4,700');
 await expect(page.locator('[data-addon-total]')).toHaveText('$1,750');
 await page.locator('#plan').selectOption('keep_running');
 await expect(page.locator('#cost-total')).toHaveText('Your estimate so far: $8,000');
 await page.locator('#build').selectOption('existing');
 await page.locator('input[name="baseline"]').uncheck();
 await expect(page.locator('#cost-total')).toHaveText('Your estimate so far: $5,050');
 await page.locator('#estimate-addon-booking_setup').uncheck();
 await expect(page.locator('#cost-total')).toHaveText('Your estimate so far: $4,200');
 await expect(page.locator('#cost-breakdown')).toContainText('selected additions: $900');
 await expect(page.locator('#external-note')).toContainText('Still to add');
 await page.locator('#plan').selectOption('none');
 await expect(page.locator('#cost-total')).toHaveText('Your estimate so far: $900');
});

test('catalogue and all-open selection controls fit narrow screens and text spacing',async({page})=>{
 for(const path of ['/pricing/','/services/website-addons/','/contact/?addons=guided_quote_form,reporting_dashboard','/payments/']){
  await page.setViewportSize({width:320,height:844});
  await page.goto(path);
  await page.evaluate(()=>{for(const el of document.querySelectorAll('main *')){el.style.setProperty('line-height','1.5','important');el.style.setProperty('letter-spacing','.12em','important');el.style.setProperty('word-spacing','.16em','important');if(el.tagName==='P')el.style.setProperty('margin-bottom','2em','important');}});
  for(const details of await page.locator('.addon-picker,.v3-addon-card details').all())await details.evaluate(el=>el.open=true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),path).toBe(true);
  const labels=page.locator('.addon-choice:visible');
  for(const label of await labels.all()){
   const box=await label.boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);
  }
 }
});
