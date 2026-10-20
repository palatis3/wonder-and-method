import {test,expect} from './fixtures.mjs';
import {inquiryResponseHtml} from '../../src/inquiry-response.mjs';
import {validateInquiry} from '../../src/inquiry.mjs';

test('native additions prefill, correction and receipt preserve all selected work without JavaScript',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='no-javascript','Dedicated no-JavaScript project');
 let calls=0;const payloads=[];
 await page.route('http://127.0.0.1:4187/api/inquiries',async route=>{
  const raw=Object.fromEntries(new URLSearchParams(route.request().postData()));
  const {value}=validateInquiry(raw);payloads.push(value);calls++;
  const html=calls===1?inquiryResponseHtml({service:value.service,...value,errors:{message:'Synthetic retry: review the message.'},message:'Review before sending.',retry:value}):inquiryResponseHtml({...value,reference:'00000000-0000-4000-8000-000000000002',synthetic:true});
  await route.fulfill({status:calls===1?422:201,contentType:'text/html',body:html});
 });
 await page.goto('/contact/?addons=standard_page,booking_setup&request_kind=checkout#inquiry');
 await expect(page.locator('#inquiry-addon-standard_page')).toBeChecked();
 await expect(page.locator('#inquiry-addon-booking_setup')).toBeChecked();
 await expect(page.locator('[data-addon-total]')).toHaveText('$650');
 await page.locator('#inquiry-addon-contact_form').check();
 await page.locator('#name').fill('Native additions fixture');await page.locator('#email').fill('fixture@example.test');await page.locator('#message').fill('Synthetic request for several agreed additions.');
 await page.getByRole('button',{name:'Send message',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Please check these details',exact:true})).toBeVisible();
 for(const id of ['standard_page','booking_setup','contact_form'])await expect(page.locator('#inquiry-addon-'+id)).toBeChecked();
 await expect(page.locator('[data-addon-total]')).toHaveText('$850');
 await page.getByRole('button',{name:'Send message',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Test inquiry recorded.',exact:true})).toBeVisible();
 await expect(page.locator('.inquiry-confirmation')).toContainText('One-time additions subtotal: $850');
 expect(payloads[1]).toEqual(payloads[0]);
 expect(payloads[1].add_ons).toEqual(['booking_setup','contact_form','standard_page']);
});

test('native checkout question link carries the chosen additions and current package',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='no-javascript','Dedicated no-JavaScript project');
 await page.goto('/checkout/launch-site/?addons=contact_form,booking_setup#inquiry');
 await expect(page.locator('[data-addon-project-total]')).toContainText('$2,000');
 await expect(page.locator('[data-addon-payments]')).toContainText('$1,000 to book (50%)');
 await page.locator('[data-checkout-question]').click();
 await expect(page.locator('#service')).toHaveValue('launch_site');
 await expect(page.locator('#request_kind')).toHaveValue('question');
 await expect(page.locator('#inquiry-addon-contact_form')).toBeChecked();
 await expect(page.locator('#inquiry-addon-booking_setup')).toBeChecked();
});

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
