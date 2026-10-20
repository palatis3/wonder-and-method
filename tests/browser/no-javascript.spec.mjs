import {test,expect} from './fixtures.mjs';

test('server-rendered proposal, general question and fixed monthly context work without JavaScript',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='no-javascript','Dedicated no-JavaScript project');
 for(const [path,service,kind,label] of [
  ['/contact/?request_kind=checkout#inquiry','unsure','checkout','Send message'],
  ['/contact/?request_kind=question#inquiry','unsure','question','Send message'],
  ['/checkout/grow/?offer=launch_site&priority=article#inquiry','grow','checkout','Send message']
 ]){
  await page.goto(path);await expect(page.locator('#service')).toHaveValue(service);await expect(page.locator('#request_kind')).toHaveValue(kind);
  await expect(page.getByRole('button',{name:label,exact:true})).toBeVisible();
  if(path.startsWith('/checkout/'))await expect(page.locator('.request-summary')).toHaveCount(0);
  else await expect(page.locator('.request-summary')).toBeHidden();
 }
 await expect(page.locator('[data-request-label]')).toContainText('Your message');
 await page.locator('#website').fill('https://example.com/');await page.locator('#name').fill('No-script fixture');await page.locator('#email').fill('fixture@example.test');await page.locator('#message').fill('Synthetic question submitted with JavaScript disabled.');
 let submitted;
 await page.route('http://127.0.0.1:4187/api/inquiries',async route=>{
  submitted=Object.fromEntries(new URLSearchParams(route.request().postData()));
  await route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html lang="en"><title>Synthetic receipt</title><h1>Test request received</h1><p>No email sent.</p></html>'});
 });
 await page.getByRole('button',{name:'Send message',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Test request received'})).toBeVisible();expect(submitted).toMatchObject({service:'grow',request_kind:'checkout',priority:'article',website:'https://example.com/'});
});
