import {test,expect} from './fixtures.mjs';
import offers from '../../config/offers.json' with {type:'json'};
import {money,inquirySubmitLabel} from '../../src/shared.mjs';

test('mobile menu traps focus and Escape returns to its trigger',async({page,isMobile})=>{
 test.skip(!isMobile,'Phone navigation');
 await page.goto('/?qa=1');
 const menu=page.locator('.menu-toggle');
 await menu.click();
 await expect(menu).toHaveAttribute('aria-expanded','true');
 const nav=page.getByRole('navigation',{name:'Primary',exact:true});
 await expect(nav.getByRole('link',{name:'Work',exact:true})).toBeFocused();
 await menu.focus();await page.keyboard.press('Shift+Tab');
 await expect(nav.getByRole('link',{name:'Contact',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');await expect(menu).toBeFocused();
 await page.keyboard.press('Escape');await expect(menu).toHaveAttribute('aria-expanded','false');await expect(menu).toBeFocused();
});

test('neutral contact stays unclassified while explicit offer requests preserve proposal intent',async({page,isMobile})=>{
 await page.goto('/?qa=1');
 if(isMobile)await page.locator('.menu-toggle').click();
 const contact=page.locator('.site-header a[href="/contact/#inquiry"]:visible').first();
 await contact.click();await expect(page.locator('#request_kind')).toHaveValue('');await expect(page.locator('.request-summary')).toBeHidden();await expect(page.locator('[data-request-label]')).toHaveText('Your message (required)');await expect(page.getByRole('button',{name:'Send message',exact:true})).toBeVisible();
 await page.goto('/pricing/?qa=1');
 const destinations=await page.locator('main a[href^="/checkout/"]').evaluateAll(links=>links.map(link=>link.getAttribute('href')));
 expect(new Set(destinations).size).toBe(8);
 for(const href of new Set(destinations)){
  await page.goto(href);
  await expect(page.locator('#request_kind')).toHaveValue('checkout');
  await expect(page.locator('#request-summary')).toHaveCount(0);
  await expect(page.locator('#service')).not.toHaveValue('unsure');
  await expect(page.locator('.inquiry-next')).toContainText('You approve the written proposal, including work, price and dates, before payment.');
  await expect(page.getByRole('button',{name:inquirySubmitLabel(await page.locator('#service').inputValue(),true,'checkout'),exact:true})).toBeVisible();
 }
 await page.goto('/contact/?request_kind=question#inquiry');
 await expect(page.locator('[data-request-label]')).toHaveText('Your message (required)');
 await expect(page.getByRole('button',{name:'Send message',exact:true})).toBeVisible();
});

test('checkout keeps its fixed offer and priorities while welcoming questions in the same form',async({page})=>{
 await page.goto('/checkout/grow/?offer=launch_site&priority=page&priority_two=article&billing=monthly#inquiry');
 await expect(page.getByRole('heading',{name:'Request Grow monthly SEO',exact:true})).toBeVisible();
 await expect(page.locator('.request-summary')).toHaveCount(0);await expect(page.locator('.inquiry-next')).toContainText('one business day');
 await expect(page.locator('#service')).toHaveValue('grow');
 await expect(page.locator('#request_kind')).toHaveValue('checkout');
 await expect(page.locator('[data-request-label]')).toHaveText('Your message (required)');await expect(page.locator('#message-help')).toContainText('What would you like help with each month?');
 await expect(page.locator('#priority')).toHaveValue('page');await expect(page.locator('#priority_two')).toHaveValue('article');
 await expect(page.locator('#message-help')).toContainText('Questions are welcome here too');await expect(page.locator('[data-checkout-question]')).toHaveCount(0);
 await page.goto('/contact/?offer=grow&priority=page&priority_two=article&request_kind=question#inquiry');
 await expect(page.locator('#request_kind')).toHaveValue('question');await expect(page.locator('#service')).toHaveValue('grow');
 await expect(page.locator('#request-summary')).toContainText('Grow');await expect(page.getByRole('button',{name:'Send message',exact:true})).toBeVisible();
});

test('inquiry validation, failed submission, retry and focused receipt use a mocked endpoint',async({page})=>{
 let calls=0;const payloads=[];
 await page.route('http://127.0.0.1:4187/api/inquiries',async route=>{
  calls++;payloads.push(route.request().postDataJSON());
  await route.fulfill({status:calls===1?503:201,contentType:'application/json',body:JSON.stringify(calls===1?{message:'Synthetic outage. Your entries remain here.'}:{reference:'00000000-0000-4000-8000-000000000001',synthetic:true})});
 });
 await page.goto('/contact/?offer=improve&request_kind=question#inquiry');
 const submit=page.getByRole('button',{name:'Send message',exact:true});
 await submit.click();await expect(page.locator('#name')).toBeFocused();expect(calls).toBe(0);
 await page.locator('#name').fill('Browser fixture');await page.locator('#email').fill('fixture@example.test');
 await page.locator('#message').fill('Synthetic browser question about the monthly service.');
 await submit.click();await expect(page.locator('#form-status')).toContainText('Synthetic outage');
 await expect(page.locator('#email')).toHaveValue('fixture@example.test');await expect(submit).toBeEnabled();
 await submit.click();
 await expect(page.locator('#inquiry-confirmation')).toBeFocused();
 await expect(page.getByRole('heading',{name:'Test inquiry recorded.',exact:true})).toBeVisible();
 await expect(page.locator('#inquiry')).toBeHidden();
 expect(calls).toBe(2);expect(payloads[1]).toEqual(payloads[0]);expect(payloads[1]).toMatchObject({service:'improve',request_kind:'question'});
});

test('payments estimator preserves provider costs, setup exceptions and the closed annual gate',async({page})=>{
 await page.goto('/payments/?qa=1#cost-calculator');
 await page.locator('#plan').selectOption('improve');await expect(page.locator('#cycles')).toHaveValue('12');
 await page.locator('#build').selectOption('existing');await page.locator('#plan').selectOption('improve');
 await expect(page.locator('#cycles')).toHaveValue('12');
 await expect(page.locator('#cost-total')).toHaveText('Your estimate so far: '+money(offers.baseline.one_time_price+12*offers.plans.improve.monthly_price)+'');
 await page.locator('input[name="baseline"]').uncheck();
 const studio=12*offers.plans.improve.monthly_price;
 await expect(page.locator('#cost-total')).toHaveText('Your estimate so far: '+money(studio)+'');
 await page.locator('.provider-estimate summary').click();await page.locator('#hosting-monthly').fill('25');
 await expect(page.locator('#cost-total')).toHaveText('Your estimate so far: '+money(studio+300)+'');
 await expect(page.locator('#external-note')).toContainText('Still to add: domain, email and other paid tools');
 await page.locator('#external').fill('50');await expect(page.locator('#cost-total')).toHaveText('Estimated total: '+money(studio+350));
 await expect(page.locator('#billing option[value="annual"]')).toHaveCount(0);
 await page.locator('#build').selectOption('launch');await expect(page.locator('#cycles')).toHaveValue('12');
 await page.locator('#cycles').fill('8');await page.locator('#build').selectOption('existing');await expect(page.locator('#cycles')).toHaveValue('8');
});

test('authorized annual calculator fixture restores monthly cycles after switching back',async({page})=>{
 // The public gate stays closed. This local fixture exercises the supported
 // future state without changing saved offers or enabling enrollment.
 await page.route('http://127.0.0.1:4187/payments/?qa=annual-fixture',async route=>{
  const response=await route.fetch(),html=await response.text();
  await route.fulfill({response,body:html.replace('<input type="hidden" id="billing" name="billing" value="monthly">','<label for="billing">Billing fixture</label><select id="billing" name="billing"><option value="monthly">Monthly invoices</option><option value="annual">Annual prepaid — 12 service cycles</option></select>')});
 });
 await page.route('http://127.0.0.1:4187/assets/prices.json',async route=>{
  const response=await route.fetch(),prices=await response.json();await route.fulfill({response,json:{...prices,annual_available:true}});
 });
 await page.goto('/payments/?qa=annual-fixture');
 await page.locator('#plan').selectOption('improve');await expect(page.locator('#cycles')).toHaveValue('12');
 await page.locator('#billing').selectOption('annual');await expect(page.locator('#cycles')).toHaveValue('12');
 await expect(page.locator('#cycles')).toHaveJSProperty('readOnly',true);
 await expect(page.locator('#cost-breakdown')).toContainText(money(offers.plans.improve.annual.upfront_price)+' paid upfront for 12 months');
 await page.locator('#billing').selectOption('monthly');await expect(page.locator('#cycles')).toHaveValue('12');await expect(page.locator('#cycles')).toHaveJSProperty('readOnly',false);
 await page.locator('#cycles').fill('8');await page.locator('#billing').selectOption('annual');await page.locator('#billing').selectOption('monthly');await expect(page.locator('#cycles')).toHaveValue('8');
});

test('portfolio previews, SEO topic navigation and early process overview work by keyboard',async({page,isMobile})=>{
 await page.goto('/work/?qa=1');
 const preview=page.locator('#fieldwork a.text-link');await preview.focus();await expect(preview).toBeFocused();
 await page.keyboard.press('Enter');await expect(page).toHaveURL(/\/work\/fieldwork\//);await expect(page.locator('.concept-notice')).toContainText('Fictional concept');
 await page.goto('/services/seo/?qa=1');
 const request=page.getByRole('link',{name:'Request Improve',exact:true});await request.focus();await page.keyboard.press('Enter');
 await expect(page).toHaveURL(/\/checkout\/improve\/\?billing=monthly/);await expect(page.locator('#service')).toHaveValue('improve');
 await page.goto('/services/seo/?qa=1');
 const limits=page.locator('summary').filter({hasText:'Research and other work you can choose'});await limits.focus();await page.keyboard.press('Enter');
 await expect(limits.locator('..')).toHaveAttribute('open','');await expect(limits.locator('..')).toContainText('These limits describe research, not promised new pages.');await expect(page.locator('main')).toContainText('No ranking, traffic, inquiry, revenue or AI-citation result is guaranteed.');
 await page.goto('/process/?qa=1');
 const firstStep=page.getByRole('heading',{name:'Start with the business',exact:true});await expect(firstStep).toBeVisible();
 const box=await firstStep.boundingBox();expect(box.y+box.height).toBeLessThan(isMobile?1300:1000);
 for(const name of ['Agree the work and book','Review the design','Approve the finished website','Receive your files and fixes','Decide how future updates happen'])await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
 await page.locator('#handoff-sample summary').click();
 const handoff=page.getByRole('link',{name:'See an example delivery folder',exact:true});await handoff.focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(/\/work\/source-handoff\//);
});

test('main buying pages fit small viewports and reduced motion stays honored',async({page,isMobile},testInfo)=>{
 if(isMobile)await page.setViewportSize({width:320,height:844});
 for(const path of ['/pricing/','/process/','/services/seo/','/work/','/contact/?request_kind=checkout#inquiry']){
  await page.goto(path);await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),path).toBe(true);
 }
 if(testInfo.project.name==='phone-reduced-motion'){
  await page.goto('/?qa=1');expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await expect(page.locator('#city-film')).toHaveJSProperty('paused',true);
 }
});

test('review request rejects notes and accepts a public website address without fetching it',async({page})=>{
 let payload;
 await page.route('http://127.0.0.1:4187/api/inquiries',async route=>{payload=route.request().postDataJSON();await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({reference:'00000000-0000-4000-8000-000000000002',synthetic:true})});});
 await page.goto('/checkout/website-baseline/?qa=planned-site');
 await page.locator('#name').fill('Synthetic planned-site fixture');await page.locator('#email').fill('fixture@example.test');await page.locator('#message').fill('The website is still being prepared. This is a synthetic fixture.');
 await expect(page.locator('#website')).toHaveAttribute('required','');await expect(page.locator('#website-help')).toContainText('website address');
 await page.getByRole('button',{name:'Request my Website Baseline',exact:true}).click();await expect(page.locator('#website')).toBeFocused();expect(payload).toBeUndefined();
 await page.locator('#website').fill('not yet');await page.getByRole('button',{name:'Request my Website Baseline',exact:true}).click();await expect(page.locator('#website')).toBeFocused();await expect(page.locator('#website-error')).toContainText('public website address');expect(payload).toBeUndefined();await page.locator('#website').fill('example.com');await page.getByRole('button',{name:'Request my Website Baseline',exact:true}).click();await expect(page.locator('#inquiry-confirmation')).toBeFocused();expect(payload.website).toBe('https://example.com/');
 await page.goto('/contact/?offer=website_baseline&request_kind=question');await expect(page.locator('#website')).not.toHaveAttribute('required','');
});

test('long message paste preserves existing text and explains the email alternative',async({page})=>{
 await page.goto('/contact/?qa=paste-boundary');const message=page.locator('#message');await message.fill('A short synthetic question.');await expect(page.locator('#message-counter')).toBeHidden();
 const existing='a'.repeat(2600);await message.fill(existing);await expect(page.locator('#message-counter')).toContainText('400 characters remaining');
 const paste=async(text,start,end)=>message.evaluate((el,{text,start,end})=>{el.setSelectionRange(start,end);const clipboardData=new DataTransfer();clipboardData.setData('text',text);return el.dispatchEvent(new ClipboardEvent('paste',{clipboardData,bubbles:true,cancelable:true}));},{text,start,end});
 expect(await paste('b'.repeat(401),2600,2600)).toBe(false);await expect(message).toHaveValue(existing);await expect(page.locator('#message-error')).toContainText('kept your existing text');await expect(page.locator('#message-error')).toContainText('support@wonderandmethod.com');
 expect(await paste('b'.repeat(400),2600,2600)).toBe(true);expect(await paste('b'.repeat(1000),0,1000)).toBe(true);
});

test('changing the selected offer keeps the website label and requirement in sync',async({page})=>{
 for(const query of ['?request_kind=checkout','?request_kind=question&goal=fix']){
  await page.goto('/contact/'+query);
  await page.locator('#service').selectOption('improve');
  await expect(page.locator('label[for="website"]')).toHaveText('Your website (if you have one)');
  await expect(page.locator('#website')).not.toHaveAttribute('required','');
  await page.locator('#service').selectOption('website_baseline');
  if(query.includes('request_kind=checkout'))await expect(page.locator('#website')).toHaveAttribute('required','');
  else await expect(page.locator('#website')).not.toHaveAttribute('required','');
  await page.locator('#service').selectOption('launch_site');
  await expect(page.locator('label[for="website"]')).toHaveText('Website or social page (optional)');
  await expect(page.locator('#website')).not.toHaveAttribute('required','');
  await expect(page.locator('#website-help')).toContainText('social handle or short note');
 }
});
