import {test,expect} from './fixtures.mjs';
import offers from '../../config/offers.json' with {type:'json'};
import {money} from '../../src/shared.mjs';

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

test('all project actions lead to proposal mode; question actions remain questions',async({page})=>{
 await page.goto('/?qa=1');
 const destinations=await page.getByRole('link',{name:'Start a project',exact:true,includeHidden:true}).evaluateAll(links=>links.map(link=>link.getAttribute('href')));
 expect(destinations.length).toBeGreaterThanOrEqual(3);
 for(const href of new Set(destinations)){
  await page.goto(href);
  await expect(page.locator('#request_kind')).toHaveValue('checkout');
  await expect(page.locator('#request-summary')).toContainText('Proposal request');
  await expect(page.getByRole('button',{name:'Request a proposal',exact:true})).toBeVisible();
 }
 await page.goto('/contact/?request_kind=question#inquiry');
 await expect(page.locator('[data-request-label]')).toHaveText('Your question (required)');
 await expect(page.getByRole('button',{name:'Send question',exact:true})).toBeVisible();
});

test('anchored monthly requests show context first and retain fixed service and priorities when switching',async({page})=>{
 await page.goto('/checkout/grow/?offer=launch_site&priority=page&priority_two=article&billing=monthly#inquiry');
 const summary=page.getByRole('group',{name:'Selected request',exact:true});
 await expect(summary).toContainText('Grow');await expect(summary).not.toContainText('one business day');await expect(page.locator('.inquiry-response-time')).toContainText('one business day');
 await expect(page.locator('#service')).toHaveValue('grow');
 const summaryBox=await summary.boundingBox(),nameBox=await page.locator('#name').boundingBox();
 expect(summaryBox.y).toBeGreaterThanOrEqual(0);expect(summaryBox.y).toBeLessThan(250);expect(summaryBox.y+summaryBox.height).toBeLessThanOrEqual(nameBox.y);
 await expect(page.locator('[data-request-label]')).toContainText('existing website');
 await page.getByRole('link',{name:"Change what you're asking for",exact:true}).click();
 await page.locator('#request_kind').selectOption('question');
 await expect(page.locator('#request-summary')).toContainText('Question');
 await expect(page.locator('#request-summary')).not.toContainText('$');
 await page.locator('#request_kind').selectOption('checkout');
 expect((await page.locator('#request-summary').textContent()).length).toBeLessThan(160);
 await expect(page.locator('#priority')).toHaveValue('page');await expect(page.locator('#priority_two')).toHaveValue('article');
});

test('inquiry validation, failed submission, retry and focused receipt use a mocked endpoint',async({page})=>{
 let calls=0;const payloads=[];
 await page.route('http://127.0.0.1:4187/api/inquiries',async route=>{
  calls++;payloads.push(route.request().postDataJSON());
  await route.fulfill({status:calls===1?503:201,contentType:'application/json',body:JSON.stringify(calls===1?{message:'Synthetic outage. Your entries remain here.'}:{reference:'00000000-0000-4000-8000-000000000001',synthetic:true})});
 });
 await page.goto('/contact/?offer=improve&request_kind=question#inquiry');
 const submit=page.getByRole('button',{name:'Send question',exact:true});
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

test('pricing choices preserve known provider costs, setup exceptions and closed annual gate',async({page})=>{
 await page.goto('/pricing/?qa=1');
 await page.getByText('Estimate your first-year cost',{exact:true}).click();
 await page.locator('#plan').selectOption('improve');await expect(page.locator('#cycles')).toHaveValue('11');
 await page.locator('#build').selectOption('existing');await page.locator('#plan').selectOption('improve');
 await expect(page.locator('#cycles')).toHaveValue('12');
 await expect(page.locator('#cost-total')).toHaveText(money(offers.baseline.one_time_price+12*offers.plans.improve.monthly_price)+' known costs');
 await page.locator('input[name="baseline"]').uncheck();
 const studio=12*offers.plans.improve.monthly_price;
 await expect(page.locator('#cost-total')).toHaveText(money(studio)+' known costs');
 await page.locator('.provider-estimate summary').click();await page.locator('#hosting-monthly').fill('25');
 await expect(page.locator('#cost-total')).toHaveText(money(studio+300)+' known costs');
 await expect(page.locator('#external-note')).toContainText('Still to add: domain, email and other paid tools');
 await page.locator('#external').fill('50');await expect(page.locator('#cost-total')).toHaveText(money(studio+350)+' estimated total');
 await expect(page.locator('#billing option[value="annual"]')).toHaveCount(0);
 await page.locator('#build').selectOption('launch');await expect(page.locator('#cycles')).toHaveValue('11');
 await page.locator('#cycles').fill('8');await page.locator('#build').selectOption('existing');await expect(page.locator('#cycles')).toHaveValue('8');
});

test('authorized annual calculator fixture restores monthly cycles after switching back',async({page})=>{
 // The public gate stays closed. This local fixture exercises the supported
 // future state without changing saved offers or enabling enrollment.
 await page.route('http://127.0.0.1:4187/pricing/?qa=annual-fixture',async route=>{
  const response=await route.fetch(),html=await response.text();
  await route.fulfill({response,body:html.replace('<option value="monthly">Monthly invoices</option>','<option value="monthly">Monthly invoices</option><option value="annual">Annual prepaid — 12 service cycles</option>')});
 });
 await page.route('http://127.0.0.1:4187/assets/prices.json',async route=>{
  const response=await route.fetch(),prices=await response.json();await route.fulfill({response,json:{...prices,annual_available:true}});
 });
 await page.goto('/pricing/?qa=annual-fixture');await page.getByText('Estimate your first-year cost',{exact:true}).click();
 await page.locator('#plan').selectOption('improve');await expect(page.locator('#cycles')).toHaveValue('11');
 await page.locator('#billing').selectOption('annual');await expect(page.locator('#cycles')).toHaveValue('12');
 await expect(page.locator('#cycles')).toHaveJSProperty('readOnly',true);
 await expect(page.locator('#cost-breakdown')).toContainText(money(offers.plans.improve.annual.upfront_price)+' paid upfront for 12 months');
 await page.locator('#billing').selectOption('monthly');await expect(page.locator('#cycles')).toHaveValue('11');await expect(page.locator('#cycles')).toHaveJSProperty('readOnly',false);
 await page.locator('#cycles').fill('8');await page.locator('#billing').selectOption('annual');await page.locator('#billing').selectOption('monthly');await expect(page.locator('#cycles')).toHaveValue('8');
});

test('portfolio previews, SEO topic navigation and early process overview work by keyboard',async({page,isMobile})=>{
 await page.goto('/work/?qa=1');
 const preview=page.locator('#fieldwork a.work-preview');await preview.focus();await expect(preview).toBeFocused();
 await page.keyboard.press('Enter');await expect(page).toHaveURL(/\/work\/fieldwork\//);await expect(page.locator('.concept-notice')).toContainText('Fictional concept');
 await page.goto('/services/seo/?qa=1');
 const request=page.getByRole('link',{name:'Request Improve',exact:true});await request.focus();await page.keyboard.press('Enter');
 await expect(page).toHaveURL(/\/checkout\/improve\/\?billing=monthly/);await expect(page.locator('#service')).toHaveValue('improve');
 await page.goto('/services/seo/?qa=1');
 const limits=page.locator('summary').filter({hasText:'Research and task limits'});await limits.focus();await page.keyboard.press('Enter');
 await expect(limits.locator('..')).toHaveAttribute('open','');await expect(limits.locator('..')).toContainText('research limits, not promised new pages or rankings');
 await page.goto('/process/?qa=1');
 const firstStep=page.getByRole('heading',{name:'Fit',exact:true});await expect(firstStep).toBeVisible();
 const box=await firstStep.boundingBox();expect(box.y+box.height).toBeLessThan(isMobile?1300:1000);
 for(const name of ['Quote and book','Design and build','Approve and launch','Hand over and correct','Optional ongoing service'])await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
 const handoff=page.getByRole('link',{name:'Inspect an example delivery folder',exact:true});await handoff.focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(/\/work\/source-handoff\//);
});

test('main buying pages fit small viewports and reduced motion stays honored',async({page,isMobile},testInfo)=>{
 if(isMobile)await page.setViewportSize({width:320,height:844});
 for(const path of ['/pricing/','/process/','/services/seo/','/work/','/contact/?request_kind=checkout#inquiry']){
  await page.goto(path);await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),path).toBe(true);
 }
 if(testInfo.project.name==='phone-reduced-motion'){
  await page.goto('/?qa=1');expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await expect(page.locator('.civic-motion--intro')).toHaveJSProperty('paused',true);
 }
});
