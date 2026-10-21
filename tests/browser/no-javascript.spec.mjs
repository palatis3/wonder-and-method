import {test,expect} from './fixtures.mjs';

test('homepage projects and Buffalo films remain available without JavaScript',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='no-javascript','Dedicated no-JavaScript project');
 await page.goto('/?qa=1');
 await expect(page.locator('.city-tabs')).toBeHidden();
 await expect(page.locator('[data-city-play]')).toBeHidden();
 for(const id of ['fieldwork','northline','hearthside']){
  const panel=page.locator('[data-city-panel="'+id+'"]');
  await expect(panel).toBeVisible();
  await expect(panel.locator('.city-project-link')).toHaveAttribute('href','/work/'+id+'/');
 }
 await page.goto('/work/buffalo-civic/?qa=1');
 await expect(page.locator('video[controls]')).toHaveCount(2);
 await expect(page.locator('#buffalo-intro')).toHaveJSProperty('paused',true);
});
import {inquiryResponseHtml} from '../../src/inquiry-response.mjs';
import {validateInquiry} from '../../src/inquiry.mjs';

test('ROI worked example and guide templates stay useful without JavaScript',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='no-javascript','Dedicated no-JavaScript project');
 await page.goto('/tools/website-roi-calculator/?qa=1');await expect(page.locator('#website-roi')).toBeHidden();await expect(page.locator('#worked-example')).toContainText('$1,800');await expect(page.getByText('The interactive calculator needs JavaScript. The worked example and formulas below remain available.',{exact:true})).toBeVisible();
 await page.goto('/guides/website-content-template/?qa=1');await expect(page.locator('.journal-prose')).toBeVisible();await expect(page.locator('a[href^="/assets/guides/website-content-template.txt"]').first()).toBeVisible();
});

test('all statewide county links remain usable without JavaScript',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='no-javascript','Dedicated no-JavaScript project');
 await page.goto('/areas/new-york/?qa=1');
 await expect(page.locator('[data-county-filter-controls]')).toBeHidden();
 await expect(page.locator('[data-county-search]:visible')).toHaveCount(62);
 await expect(page.getByRole('navigation',{name:'New York service regions'}).locator('a')).toHaveCount(10);
 await page.locator('[data-county-search] a[href="/areas/st-lawrence-county/"]').click();
 await expect(page.locator('main h1')).toContainText('St. Lawrence');
 await page.locator('.county-faq summary').first().click();
 await expect(page.locator('.county-faq details').first()).toHaveAttribute('open','');
});

test('state directories and Pennsylvania county details work without JavaScript',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='no-javascript','Dedicated no-JavaScript project');
 await page.goto('/areas/?qa=1');
 await expect(page.locator('[data-county-filter-controls]')).toBeHidden();await expect(page.locator('[data-county-search]:visible')).toHaveCount(217);
 await page.locator('.state-area-cards').getByRole('link',{name:'Explore Pennsylvania',exact:true}).click();
 await expect(page.locator('[data-county-search]:visible')).toHaveCount(67);
 await expect(page.getByRole('navigation',{name:'Pennsylvania service regions'}).locator('a')).toHaveCount(10);
 await page.locator('[data-county-search] a[href="/areas/pennsylvania/columbia-county/"]').click();
 await expect(page.locator('main h1')).toContainText('Columbia');
 await page.locator('.county-communities summary').click();await expect(page.locator('.county-communities')).toContainText('Bloomsburg');
 await page.locator('.county-faq summary').first().click();await expect(page.locator('.county-faq details').first()).toHaveAttribute('open','');
 await expect(page.getByRole('link',{name:'Download the planning worksheet (TXT)',exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'Download the planning worksheet (TXT)',exact:true})).toHaveAttribute('href',/^\/assets\/county-briefs\/pennsylvania-columbia\.txt(?:\?v=[a-f0-9]+)?$/);
});

test('Ohio directory, municipalities and FAQs work without JavaScript',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='no-javascript','Dedicated no-JavaScript project');
 await page.goto('/areas/?qa=1');
 await page.locator('.state-area-cards').getByRole('link',{name:'Explore Ohio',exact:true}).click();
 await expect(page.locator('[data-county-filter-controls]')).toBeHidden();await expect(page.locator('[data-county-search]:visible')).toHaveCount(88);
 await expect(page.getByRole('navigation',{name:'Ohio service regions'}).locator('a')).toHaveCount(7);
 await page.locator('[data-county-search] a[href="/areas/ohio/greene-county/"]').click();
 await expect(page.locator('main h1')).toContainText('Greene');
 await page.locator('.county-communities summary').click();await expect(page.locator('.county-communities')).toContainText('Yellow Springs');
 await page.locator('.county-faq summary').first().click();await expect(page.locator('.county-faq details').first()).toHaveAttribute('open','');
 await expect(page.getByRole('link',{name:'Download the planning worksheet (TXT)',exact:true})).toHaveAttribute('href',/^\/assets\/county-briefs\/ohio-greene\.txt(?:\?v=[a-f0-9]+)?$/);
});

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
