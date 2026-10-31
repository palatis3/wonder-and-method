import {test,expect} from '@playwright/test';
import {PRIVATE_HEADERS} from '../../../worker/workspace/http.mjs';
const business='10000000-0000-4000-8000-000000000001',id='90000000-0000-4000-8000-000000000001';
test('portal navigation posts session CSRF to the workspace and follows only the server redirect',async({page},info)=>{
 const destination='http://127.0.0.1:4211/_preview/portal-handoff';let posts=0;
 await page.route(url=>url.pathname==='/api/billing-portal',route=>route.fulfill({json:{available:true,binding_version:1,items:[{id,created_at:new Date().toISOString(),state:'verified',available:true}]}}));
 page.on('request',request=>{if(new URL(request.url()).pathname===`/api/billing-portal/${id}/open`){expect(request.method()).toBe('POST');expect(request.postData()).toBe('csrf=synthetic-only');expect(request.headers()['content-type']).toContain('application/x-www-form-urlencoded');posts++;}});
 await page.route(url=>url.pathname==='/workspace/billing',async route=>{const response=await route.fetch();await route.fulfill({response,headers:{...response.headers(),'Content-Security-Policy':PRIVATE_HEADERS['Content-Security-Policy']}});});
 await page.goto('/_preview/role?as=customer');await page.goto(`/workspace/billing?business=${business}`);
 const panel=page.locator('[aria-labelledby="billing-portal-title"]');await expect(panel).toBeVisible();expect(await panel.innerHTML()).not.toContain('/p/session/');
 const form=panel.locator('form[data-portal-open]');await expect(form.locator('input[name=csrf]')).toHaveValue('synthetic-only');await expect(form).not.toHaveAttribute('data-action');
 expect((await form.getByRole('button').boundingBox()).height).toBeGreaterThanOrEqual(44);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(info.project.use.viewport.width+1);
 await form.getByRole('button',{name:'Open Stripe billing portal'}).click();await expect(page).toHaveURL(destination);await expect(page.getByRole('heading',{name:'Synthetic portal handoff'})).toBeVisible();expect(posts).toBe(1);
});
