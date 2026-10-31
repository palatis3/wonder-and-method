import {test,expect} from '@playwright/test';
const business='10000000-0000-4000-8000-000000000001';
test('recovery operator can request and cancel backup preparation while customers have no backup access',async({page},info)=>{
 await page.goto('/_preview/role?as=operator');await page.goto(`/operator/queue?business=${business}`);
 const panel=page.locator('[aria-labelledby="backups-title"]'),request=panel.locator('form[data-backup-action="backup.request"]');
 await expect(request).toBeVisible();await page.route('**/api/command',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{message:'Synthetic backup interruption'}})}));
 await request.getByRole('button',{name:'Request encrypted tenant backup',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Synthetic backup interruption'})).toBeVisible();
 await expect(request.locator('input[name=key_id]')).toHaveValue('synthetic');await page.unroute('**/api/command');
 await request.getByRole('button',{name:'Request encrypted tenant backup',exact:true}).click();await expect(page.getByRole('status')).toContainText('Backup requested.');
 const data=await(await page.request.get(`/api/backups?business=${business}`)).json(),job=data.items.find(j=>j.state==='queued');expect(job).toBeTruthy();
 await panel.locator(`form[data-backup-action="backup.cancel"] input[value="${job.id}"]`).locator('..').getByRole('button',{name:'Cancel preparation',exact:true}).click();await expect(page.getByRole('status')).toContainText('Backup preparation cancelled.');
 await panel.getByText('Daily backup schedule',{exact:true}).click();const scheduled=panel.locator('form[data-backup-action="backup.schedule"]');await scheduled.getByLabel('Daily preparation',{exact:true}).selectOption('true');await scheduled.getByRole('button',{name:'Save daily backup schedule',exact:true}).click();await expect(page.getByRole('status')).toContainText('Daily backup schedule saved.');
 const saved=await(await page.request.get(`/api/backups?business=${business}`)).json();expect(saved.schedule.enabled).toBe(true);
 await panel.getByText('Daily backup schedule',{exact:true}).click();await scheduled.getByLabel('Daily preparation',{exact:true}).selectOption('false');await scheduled.getByRole('button',{name:'Save daily backup schedule',exact:true}).click();await expect(page.getByRole('status')).toContainText('Daily backup schedule saved.');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(info.project.use.viewport.width+1);
 await page.screenshot({path:`output/playwright/workspace/${info.project.name}-tenant-backup.png`,fullPage:true});
 await page.goto('/_preview/role?as=customer');await page.goto(`/workspace/help?business=${business}`);await expect(page.locator('[aria-labelledby="backups-title"]')).toHaveCount(0);
 expect((await page.request.get(`/api/backups?business=${business}`)).status()).toBe(403);
});
