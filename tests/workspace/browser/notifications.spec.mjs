import {test,expect} from '@playwright/test';
const business='10000000-0000-4000-8000-000000000001';
test('versioned preferences preserve opt-out intent through a failed save on desktop and phones',async({page},info)=>{
 await page.goto('/_preview/role?as=customer');await page.goto(`/workspace/help?business=${business}`);
 await expect(page.getByRole('heading',{name:'Notification preferences and delivery',exact:true})).toBeVisible();
 const form=page.locator('form[data-action="notification.preference"]'),keys=[];page.on('request',request=>{if(request.url().endsWith('/api/command')&&request.postDataJSON()?.command==='notification.preference')keys.push(request.headers()['idempotency-key']);});
 await form.getByLabel('Routine updates',{exact:true}).selectOption('none');await form.getByLabel('Email routine updates',{exact:true}).uncheck();await form.getByLabel('Timezone',{exact:true}).fill('America/New_York');
 await page.route('**/api/command',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{message:'Synthetic preference interruption'}})}));await form.getByRole('button',{name:'Save preferences',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'Synthetic preference interruption'})).toBeVisible();await expect(form.getByLabel('Routine updates',{exact:true})).toHaveValue('none');await expect(form.getByLabel('Email routine updates',{exact:true})).not.toBeChecked();await expect(form.getByLabel('Timezone',{exact:true})).toHaveValue('America/New_York');
 await page.unroute('**/api/command');await form.getByRole('button',{name:'Save preferences',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Notification settings saved.'})).toBeVisible();expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);
 const current=await (await page.request.get(`/api/notifications?business=${business}`)).json();expect(current.preferences.digest).toBe('none');expect(current.preferences.email_enabled).toBe(false);expect(current.preferences.version).toBeGreaterThan(0);
 await page.reload();await expect(form.getByLabel('Routine updates',{exact:true})).toHaveValue('none');await expect(page.locator('form[data-action="notification.exception.note"]')).toHaveCount(0);await expect(page.locator('form[data-action="preference.save"]')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(info.project.use.viewport.width+1);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`output/playwright/workspace/${info.project.name}-notifications.png`,fullPage:true});
 await page.goto('/_preview/role?as=operator');await page.goto(`/workspace/help?business=${business}`);await expect(page.getByRole('heading',{name:'Notification preferences and delivery',exact:true})).toBeVisible();await expect(form).toHaveCount(0);
});
