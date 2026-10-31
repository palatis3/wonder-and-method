import {test,expect} from '@playwright/test';
const org='10000000-0000-4000-8000-000000000001';
test('received email stays literal, routing errors preserve evidence, and customer access excludes triage',async({page},info)=>{
 await page.goto('/_preview/role?as=operator');await page.goto(`/workspace/messages?business=${org}`);
 await expect(page.getByRole('heading',{name:'Incoming email',exact:true})).toBeVisible();await page.getByText('Reply addresses and email triage',{exact:true}).click();
 const route=page.locator('form[data-action="inbound.route"]');await route.getByRole('button',{name:'Create reply address'}).click();await expect(page.getByRole('status')).toContainText('Reply address: r.');
 await page.getByText('Reply addresses and email triage',{exact:true}).click();const email=page.locator('details.card').filter({has:page.locator(':scope > summary').filter({hasText:'Synthetic urgent email'})});await email.locator(':scope > summary').click();await expect(email.getByText('Please pause. <script>Literal untrusted content</script>',{exact:true})).toBeVisible();
 const form=email.locator('form');await form.getByLabel('Routing evidence',{exact:true}).fill('Synthetic independently confirmed sender and destination '+info.project.name);
 await page.route('**/api/command',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{message:'Synthetic intake interruption'}})}));await form.getByRole('button',{name:'Save routing decision'}).click();await expect(page.getByRole('alert')).toHaveText('Synthetic intake interruption');
 await page.unroute('**/api/command');await page.getByText('Reply addresses and email triage',{exact:true}).click();await email.locator(':scope > summary').click();await expect(form.getByLabel('Routing evidence',{exact:true})).toHaveValue('Synthetic independently confirmed sender and destination '+info.project.name);
 // Retry avoids sharing the global fixture with another browser project.
 await form.getByLabel('What should happen?',{exact:true}).selectOption('inbound.retry');await form.getByRole('button',{name:'Save routing decision'}).click();await expect(page.getByRole('status')).toHaveText('Incoming email settings saved.');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(info.project.use.viewport.width+1);await page.screenshot({path:`output/playwright/workspace/${info.project.name}-inbound.png`,fullPage:true});
 await page.goto('/_preview/role?as=customer');await page.goto(`/workspace/messages?business=${org}`);await expect(page.getByText('Reply addresses and email triage',{exact:true})).toHaveCount(0);await expect(page.getByText('Synthetic urgent email',{exact:false})).toHaveCount(0);
});
