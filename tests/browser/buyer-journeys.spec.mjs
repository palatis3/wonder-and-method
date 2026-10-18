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
  await expect(page.locator('#request-summary')).toContainText('Proposal request only');
  await expect(page.getByRole('button',{name:'Request a proposal',exact:true})).toBeVisible();
 }
 await page.goto('/contact/?request_kind=question#inquiry');
 await expect(page.locator('[data-request-label]')).toHaveText('Your question (required)');
 await expect(page.getByRole('button',{name:'Send question',exact:true})).toBeVisible();
});

test('anchored monthly requests show context first and retain fixed service and priorities when switching',async({page})=>{
 await page.goto('/checkout/grow/?offer=launch_site&priority=page&priority_two=article&billing=monthly#inquiry');
 const summary=page.getByRole('group',{name:'Selected request',exact:true});
 await expect(summary).toContainText('Grow');await expect(summary).toContainText('one business day');
 await expect(page.locator('#service')).toHaveValue('grow');
 const summaryBox=await summary.boundingBox(),nameBox=await page.locator('#name').boundingBox();
 expect(summaryBox.y).toBeGreaterThanOrEqual(0);expect(summaryBox.y).toBeLessThan(250);expect(summaryBox.y+summaryBox.height).toBeLessThanOrEqual(nameBox.y);
 await expect(page.locator('[data-request-label]')).toContainText('existing website');
 await page.getByRole('link',{name:'Change request type',exact:true}).click();
 await page.locator('#request_kind').selectOption('question');
 await expect(page.locator('#request-summary')).toContainText('Question only');
 await expect(page.locator('#request-summary')).not.toContainText('$');
 await page.locator('#request_kind').selectOption('checkout');
 await expect(page.locator('#request-summary')).toContainText('Research and write an article');
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

test('pricing choices update totals, setup exceptions and annual cycles',async({page})=>{
 await page.goto('/pricing/?qa=1');
 await expect(page.locator('.pricing-overview')).toContainText('4 guides + motion centerpiece');
 await expect(page.locator('.editing-model').first()).toContainText('visual drag-and-drop editor is not included');
 await page.getByText('Estimate your first-year cost',{exact:true}).click();
 await page.locator('#build').selectOption('existing');await page.locator('#plan').selectOption('improve');
 await expect(page.locator('#cost-total')).toHaveText(money(offers.baseline.one_time_price+12*offers.plans.improve.monthly_price)+' studio subtotal');
 await page.locator('input[name="baseline"]').uncheck();
 await expect(page.locator('#cost-total')).toHaveText(money(12*offers.plans.improve.monthly_price)+' studio subtotal');
 await page.locator('#billing').selectOption('annual');await expect(page.locator('#cycles')).toHaveValue('12');
 await expect(page.locator('#cycles')).toHaveJSProperty('readOnly',true);
 await expect(page.locator('#cost-total')).toHaveText(money(offers.plans.improve.annual.upfront_price)+' studio subtotal');
});

test('portfolio previews, SEO topic navigation and early process overview work by keyboard',async({page,isMobile})=>{
 await page.goto('/work/?qa=1');
 const preview=page.locator('#fieldwork a.work-preview');await preview.focus();await expect(preview).toBeFocused();
 await page.keyboard.press('Enter');await expect(page).toHaveURL(/\/work\/fieldwork\//);await expect(page.locator('.concept-notice')).toContainText('Fictional concept');
 await page.goto('/services/seo/?qa=1');
 const topics=page.getByRole('navigation',{name:'SEO topics'});
 await topics.getByRole('link',{name:'Plans & first payment'}).click();
 await expect(page.locator('.seo-plan-summary')).toContainText(money(offers.plans.improve.monthly_price+offers.baseline.one_time_price));
 await topics.getByRole('link',{name:'Limits',exact:true}).click();
 await expect(page.locator('#seo-limits')).toHaveAttribute('open','');
 await page.goto('/process/?qa=1');
 await expect(page.locator('.process-route a')).toHaveCount(6);
 const box=await page.locator('.process-route').boundingBox();expect(box.y+box.height).toBeLessThan(isMobile?1300:1000);
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
