import {test,expect} from '@playwright/test';

test('four website choices explain scope and preserve the selected inquiry',async({page})=>{
 await page.goto('/pricing/');await page.locator('#package-guide>summary').click();
 const guide=page.locator('#package-guide');await expect(guide).toContainText('platform and editing workflow before booking');
 const cards=page.locator('#website-packages');await expect(cards.locator('.v3-offer-card')).toHaveCount(4);
 await expect(cards).toContainText('Business Custom Website');
 await page.locator('#every-inclusion>summary').click();
 await expect(page.locator('#every-inclusion')).toContainText('Up to 15');
 await cards.getByRole('link',{name:'Discuss Business Custom Website',exact:true}).click();
 await expect(page.locator('#service')).toHaveValue('business_site');
 await expect(page.locator('#request_kind')).toHaveValue('checkout');
 await expect(page.locator('h1')).toHaveText('Request Business Custom Website');
 await expect(page.locator('#inquiry input[required],#inquiry textarea[required]')).toHaveCount(3);
});

test('cost preset exposes assumptions and recalculates actual edited inputs',async({page})=>{
 await page.goto('/pricing/');await page.locator('#cost-examples>summary').click();
 await page.locator('#cost-examples a').nth(1).click();
 await expect(page.locator('#build')).toHaveValue('focused');await expect(page.locator('#plan')).toHaveValue('keep_running');
 await expect(page.locator('#hosting-monthly')).toHaveValue('20');await expect(page.locator('#external')).toHaveValue('120');
 await expect(page.locator('#cost-total')).toContainText('4,903');await expect(page.locator('#cost-breakdown')).toContainText('Eligible hosting offset: −$240');
 await page.locator('#hosting-monthly').fill('30');await expect(page.locator('#cost-total')).toContainText('4,963');await expect(page.locator('#cost-breakdown')).toContainText('Eligible hosting offset: −$300');
 await page.locator('#plan').selectOption('none');await expect(page.locator('#cost-total')).toContainText('3,475');
 await page.goto('/payments/?estimate=untrusted#cost-calculator');await expect(page.locator('#hosting-monthly')).toHaveValue('');
});

test('concept preference and optional website context survive the inquiry route',async({page})=>{
 await page.goto('/work/');await page.locator('#fieldwork').getByRole('link',{name:'Ask about a Fieldwork direction',exact:true}).click();
 await expect(page.locator('#request-summary')).toContainText('Fieldwork');await expect(page.locator('[name=concept]')).toHaveValue('fieldwork');
 await expect(page.locator('[data-project-details]')).not.toHaveAttribute('open','');
 await page.locator('[data-project-details]>summary').click();await expect(page.locator('#website')).toBeVisible();
 await expect(page.locator('#email_receipt')).not.toBeChecked();await expect(page.locator('#email_receipt-help')).toContainText('backup copy');
 const positions=await page.locator('.inquiry-expectation,#name').evaluateAll(elements=>elements.map(e=>e.getBoundingClientRect().top));expect(positions[0]).toBeLessThan(positions[1]);
});

test('proof and scope links reach the real case and illustrative monthly examples',async({page})=>{
 await page.goto('/pricing/');await expect(page.locator('#offer-launch_site .v3-timing')).toContainText('5–7 business days');
 await expect(page.locator('#offer-launch_site')).toContainText('Monthly help is optional');
 await page.locator('#example-month>summary').click();await expect(page.locator('#example-month')).toContainText('Illustrations only');
 await page.locator('#website-packages').getByRole('link',{name:'Explore the website process'}).click();await page.getByRole('link',{name:'See a real website and the decisions behind it'}).click();await expect(page).toHaveURL(/\/work\/assetrounds\//);
 await expect(page.locator('main')).toContainText('studio-owned product website');await expect(page.locator('h1')).toHaveCount(1);
});
