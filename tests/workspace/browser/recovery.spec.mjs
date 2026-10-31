import {test,expect} from '@playwright/test';
const business='10000000-0000-4000-8000-000000000001';
test('recovery operators retain a restricted screen while ordinary work remains unavailable',async({page},info)=>{
 await page.goto('/_preview/role?as=operator');
 try{
  await page.request.get('/_preview/recovery-state?state=restricted');
  await page.goto(`/operator/queue?business=${business}`);
  await expect(page.getByRole('heading',{name:'Recovery is in progress',exact:true})).toBeVisible();
  await expect(page.locator('[aria-labelledby="restore-title"]')).toBeVisible();
  await expect(page.locator('[aria-labelledby="retention-title"]')).toBeVisible();
  for(const button of await page.locator('[aria-labelledby="retention-title"] button').all())expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await expect(page.locator('form[data-action="request.accept"]')).toHaveCount(0);
  expect((await page.request.get(`/api/workspace?business=${business}`)).status()).toBe(403);
  const source=page.locator('form[data-retention-action="retention.plan"]');await source.getByLabel('Exact source ID',{exact:true}).fill('workspace:40000000-0000-4000-8000-000000000001');
  await expect(source.getByLabel('Exact source ID',{exact:true})).toHaveValue('workspace:40000000-0000-4000-8000-000000000001');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(info.project.use.viewport.width+1);
  await page.screenshot({path:`output/playwright/workspace/${info.project.name}-restricted-recovery.png`,fullPage:true});
  await page.goto('/_preview/role?as=customer');expect((await page.request.get(`/api/recovery-workspace?business=${business}`)).status()).toBe(403);
  await page.goto(`/workspace/?business=${business}`);await expect(page.locator('[aria-labelledby="restore-title"]')).toHaveCount(0);await expect(page.locator('[aria-labelledby="retention-title"]')).toHaveCount(0);
 }finally{await page.goto('/_preview/role?as=operator');await page.request.get('/_preview/recovery-state?state=open');}
});
