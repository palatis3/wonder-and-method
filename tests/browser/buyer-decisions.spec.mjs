import {test,expect} from '@playwright/test';

test('package guide gives an explained choice, clears stale results and preserves the inquiry selection',async({page})=>{
 await page.goto('/pricing/');await page.locator('#package-guide>summary').click();
 const form=page.locator('[data-package-guide]');await expect(form).toBeVisible();
 if(page.viewportSize().width<800){
  const field=form.locator('[name=pages]');
  await field.evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-innerHeight+75,behavior:'instant'}));
  await expect(field).not.toBeFocused();
  await expect(page.locator('.support-chat-launch')).toBeHidden();
  await expect(page.locator('.back-to-top')).toBeHidden();
  expect(await field.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.right-12,r.top+r.height/2)===el;})).toBe(true);
 }
 await form.locator('[name=services]').selectOption('several');await form.locator('[name=pages]').selectOption('medium');
 await form.getByRole('button',{name:'Find a starting point'}).click();
 await expect(form.locator('[data-guide-title]')).toHaveText('Focused Website · $2,350');
 await expect(form.locator('[data-guide-result]')).toBeFocused();
 await form.locator('[name=editing]').selectOption('visual');await expect(form.locator('[data-guide-result]')).toBeHidden();
 await form.getByRole('button',{name:'Find a starting point'}).click();await expect(form.locator('[data-guide-title]')).toHaveText('Start with a scope conversation');
 await expect(form.locator('[data-guide-reason]')).toContainText('do not include a visual editor');
 await form.locator('[name=editing]').selectOption('care');await form.getByRole('button',{name:'Find a starting point'}).click();
 if(page.viewportSize().width<800){
  const inquiryLink=form.locator('[data-guide-inquiry]');
  await inquiryLink.evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-innerHeight+75,behavior:'instant'}));
  await expect(inquiryLink).not.toBeFocused();await expect(page.locator('.back-to-top')).toBeHidden();
  expect(await inquiryLink.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.left+12,r.top+r.height/2));})).toBe(true);
 }
 await form.locator('[data-guide-inquiry]').click();await expect(page.locator('#service')).toHaveValue('focused_site');await expect(page.locator('#request_kind')).toHaveValue('question');
 await expect(page.locator('#request-summary')).toContainText('Focused');await expect(page.locator('#inquiry input[required],#inquiry textarea[required]')).toHaveCount(3);
});

test('cost preset exposes assumptions and recalculates actual edited inputs',async({page})=>{
 await page.goto('/pricing/');await page.locator('#cost-examples>summary').click();
 await page.locator('#cost-examples a').nth(1).click();
 await expect(page.locator('#build')).toHaveValue('focused');await expect(page.locator('#plan')).toHaveValue('keep_running');
 await expect(page.locator('#hosting-monthly')).toHaveValue('20');await expect(page.locator('#external')).toHaveValue('120');
 await expect(page.locator('#cost-total')).toContainText('4,510');
 await page.locator('#hosting-monthly').fill('30');await expect(page.locator('#cost-total')).toContainText('4,630');
 await page.locator('#plan').selectOption('none');await expect(page.locator('#cost-total')).toContainText('2,830');
 await page.goto('/payments/?estimate=untrusted#cost-calculator');await expect(page.locator('#hosting-monthly')).toHaveValue('');
});

test('concept preference and optional website context survive the inquiry route',async({page})=>{
 await page.goto('/work/');await page.getByRole('link',{name:'Ask about a Fieldwork direction',exact:true}).click();
 await expect(page.locator('#request-summary')).toContainText('Fieldwork');await expect(page.locator('[name=concept]')).toHaveValue('fieldwork');
 await expect(page.locator('[data-project-details]')).not.toHaveAttribute('open','');
 await page.locator('[data-project-details]>summary').click();await expect(page.locator('#website')).toBeVisible();
 await expect(page.locator('#email_receipt')).not.toBeChecked();await expect(page.locator('#email_receipt-help')).toContainText('backup copy');
 const positions=await page.locator('.inquiry-expectation,#name').evaluateAll(elements=>elements.map(e=>e.getBoundingClientRect().top));expect(positions[0]).toBeLessThan(positions[1]);
});

test('proof and scope links reach the real case and illustrative monthly examples',async({page})=>{
 await page.goto('/pricing/');await expect(page.locator('#offer-launch_site .offer-timing')).toContainText('3–5 business days');
 await expect(page.locator('#offer-launch_site .offer-timing')).toContainText('proposal sets the dates');
 await page.locator('#example-month>summary').click();await expect(page.locator('#example-month')).toContainText('not completed client work');
 await page.locator('#offer-launch_site .offer-proof a').click();await expect(page).toHaveURL(/\/work\/assetrounds\//);
 await expect(page.locator('main')).toContainText('studio-owned product website');await expect(page.locator('h1')).toHaveCount(1);
});
