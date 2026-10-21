import {test,expect} from './fixtures.mjs';
import offers from '../../config/offers.json' with {type:'json'};
import {money} from '../../src/shared.mjs';

test('all addition prices, scope disclosures and request links work on the catalogue',async({page})=>{
 await page.goto('/services/website-addons/?qa=addons');
 await expect(page.locator('.addon-item')).toHaveCount(12);
 for(const item of offers.add_ons){
  const row=page.locator('#addon-'+item.id);
  await expect(row.locator('.addon-price')).toContainText(money(item.public_price));
  await expect(row.getByRole('link',{name:'Request '+item.public_name,exact:true})).toHaveAttribute('href',`/contact/?addons=${item.id}&request_kind=checkout#inquiry`);
 }
 const disclosure=page.locator('#addon-guided_quote_form summary');
 await disclosure.focus();await page.keyboard.press('Enter');
 await expect(page.locator('#addon-guided_quote_form details')).toHaveAttribute('open','');
 await expect(page.locator('#addon-guided_quote_form details')).toContainText('12 agreed fields');
 await page.locator('#addon-guided_quote_form h3 a').click();
 await expect(page.locator('#inquiry-addon-guided_quote_form')).toBeChecked();
 await expect(page.locator('[data-addon-total]')).toHaveText('$500');
 await expect(page.locator('#request_kind')).toHaveValue('checkout');
 await expect(page.locator('.addon-picker')).not.toHaveAttribute('open','');
});

test('multiple additions survive a failed enhanced request and appear in its confirmed receipt',async({page})=>{
 let calls=0;const payloads=[];
 await page.route('http://127.0.0.1:4187/api/inquiries',async route=>{
  payloads.push(route.request().postDataJSON());calls++;
  await route.fulfill({status:calls===1?503:201,contentType:'application/json',body:JSON.stringify(calls===1?{message:'Synthetic retry needed.'}:{reference:'00000000-0000-4000-8000-000000000001',synthetic:true})});
 });
 await page.goto('/checkout/launch-site/?addons=booking_setup,standard_page#inquiry');
 await expect(page.locator('[data-addon-total]')).toHaveText('$650');
 await expect(page.locator('[data-addon-project-total]')).toContainText('$2,050');
 await page.locator('.addon-picker summary').click();await page.locator('#inquiry-addon-contact_form').check();
 await page.locator('#inquiry-addon-standard_page').uncheck();
 await expect(page.locator('[data-addon-total]')).toHaveText('$600');
 await expect(page.locator('[data-addon-project-total]')).toContainText('$2,000');
 await expect(page.locator('[data-addon-payments]')).toContainText('$1,000 to book (50%)');
 await expect(page.locator('[data-addon-payments]')).toContainText('$600 after written design approval (30%)');
 await expect(page.locator('[data-addon-payments]')).toContainText('$400 after written working-site approval');
 await expect(page.locator('[data-checkout-question]')).toHaveCount(0);
 await expect(page.locator('#request_kind')).toHaveValue('checkout');
 await expect(page.locator('#service')).toHaveValue('launch_site');
 await page.locator('#name').fill('Synthetic additions fixture');
 await page.locator('#email').fill('fixture@example.test');
 await page.locator('#message').fill('Please quote these additional tools for a fictional test project.');
 await page.getByRole('button',{name:'Request my Launch proposal',exact:true}).click();
 await expect(page.locator('#form-status')).toContainText('Synthetic retry needed');
 await expect(page.locator('#inquiry-addon-booking_setup')).toBeChecked();
 await expect(page.locator('#inquiry-addon-contact_form')).toBeChecked();
 await page.getByRole('button',{name:'Request my Launch proposal',exact:true}).click();
 await expect(page.locator('#inquiry-confirmation')).toBeFocused();
 await expect(page.locator('#inquiry-confirmation')).toContainText('One-time additions subtotal: $600');
 expect(payloads[1]).toEqual(payloads[0]);
 expect(payloads[1].add_ons).toEqual(['booking_setup','contact_form']);
 expect(Object.keys(payloads[1]).filter(key=>key.startsWith('addon_'))).toEqual([]);
});

test('estimator includes selected additions once through package and recurring-plan changes',async({page})=>{
 await page.goto('/payments/?qa=addons#cost-calculator');
 await page.locator('#cost-calculator .addon-picker summary').click();
 await page.locator('#estimate-addon-three_page_bundle').check();
 await page.locator('#estimate-addon-payment_setup').check();
 await expect(page.locator('#cost-total')).toHaveText('Your estimate so far: $2,300');
 await expect(page.locator('[data-addon-total]')).toHaveText('$900');
 await page.locator('#plan').selectOption('keep_running');
 await expect(page.locator('#cost-total')).toHaveText('Your estimate so far: $4,100');
 await page.locator('#build').selectOption('existing');
 await page.locator('input[name="baseline"]').uncheck();
 await expect(page.locator('#cost-total')).toHaveText('Your estimate so far: $2,700');
 await page.locator('#estimate-addon-payment_setup').uncheck();
 await expect(page.locator('#cost-total')).toHaveText('Your estimate so far: $2,400');
 await expect(page.locator('#cost-breakdown')).toContainText('selected additions: $600');
 await expect(page.locator('#external-note')).toContainText('Still to add');
 await page.locator('#plan').selectOption('none');
 await expect(page.locator('#cost-total')).toHaveText('Your estimate so far: $600');
});

test('catalogue and all-open selection controls fit narrow screens and text spacing',async({page})=>{
 for(const path of ['/pricing/','/services/website-addons/','/contact/?addons=client_portal,job_dashboard','/payments/']){
  await page.setViewportSize({width:320,height:844});
  await page.goto(path);
  await page.evaluate(()=>{for(const el of document.querySelectorAll('main *')){el.style.setProperty('line-height','1.5','important');el.style.setProperty('letter-spacing','.12em','important');el.style.setProperty('word-spacing','.16em','important');if(el.tagName==='P')el.style.setProperty('margin-bottom','2em','important');}});
  for(const details of await page.locator('.addon-picker,.addon-scope').all())await details.evaluate(el=>el.open=true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),path).toBe(true);
  const labels=page.locator('.addon-choice:visible');
  for(const label of await labels.all()){
   const box=await label.boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);
  }
 }
});
