import {test,expect} from './fixtures.mjs';

test('all guides remain browsable when search enhancement is unavailable',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='no-javascript','Native fallback coverage');
 await page.goto('/guides/?qa=1');await expect(page.locator('[data-guide-filters]')).toBeHidden();
 await expect(page.locator('.journal-card')).toHaveCount(65);
 await page.locator('.guide-examples > summary').click();await expect(page.locator('.journal-card:visible')).toHaveCount(65);
 const hrefs=await page.locator('.journal-card h3 a').evaluateAll(links=>links.map(link=>link.getAttribute('href')));expect(new Set(hrefs).size).toBe(65);
});
import faqsByPath from '../../src/service-faqs.json' with {type:'json'};

test('service and county project answers remain accessible by keyboard without JavaScript',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='no-javascript','Dedicated no-JavaScript project');
 const entries=Object.entries(faqsByPath);
 const cases=['/services/','/areas/'].flatMap(prefix=>[1,2].map(size=>entries.find(([path,answers])=>path.startsWith(prefix)&&(size===1?answers.length===1:answers.length>1))));
 for(const [path,answers] of cases){
  await page.goto(path+'?qa=1');
  const section=page.locator('#service-questions');await expect(section).toHaveCount(1);
  for(const [index,answer] of answers.entries()){
   if(answers.length===1){
    await expect(section.getByRole('heading',{name:answer.question,exact:true})).toBeVisible();
    await expect(section.locator('details')).toHaveCount(0);
    await expect(section.locator('p').first()).toHaveText(answer.answer);await expect(section.locator('p').first()).toBeVisible();
    for(const link of answer.links||[]){const target=section.getByRole('link',{name:link.label,exact:true});await expect(target).toHaveAttribute('href',link.path);await target.focus();await expect(target).toBeFocused();}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    continue;
   }
   const details=section.locator('details').nth(index),summary=details.locator('summary');
   await expect(details).not.toHaveAttribute('open','');await expect(summary).toHaveText(answer.question);
   await summary.focus();await page.keyboard.press('Enter');
   await expect(summary).toBeFocused();await expect(details).toHaveAttribute('open','');
   await expect(details.locator('p').first()).toBeVisible();await expect(details.locator('p').first()).toHaveText(answer.answer);
   for(const link of answer.links||[])await expect(details.getByRole('link',{name:link.label,exact:true})).toHaveAttribute('href',link.path);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
   await page.keyboard.press('Space');await expect(details).not.toHaveAttribute('open','');
  }
 }
});

test('Florida county facts, local articles and worksheets remain usable without JavaScript',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='no-javascript','Dedicated no-JavaScript project');
 await page.goto('/areas/florida/?qa=1');await openNativeCountyLists(page,67);
 const entry=await openNativeCountyEntry(page,'brevard','Palm Bay');
 await entry.getByRole('link',{name:'Brevard County tour websites: explain launch changes before checkout',exact:true}).click();
 await expect(page.locator('#layout table')).toBeVisible();await expect(page.locator('#check')).toBeVisible();
 const download=page.locator('#take-away').getByRole('link',{name:'Download the planning worksheet (text file)',exact:true});
 const response=await page.request.get(await download.getAttribute('href'));expect(response.status()).toBe(200);expect(await response.text()).toContain('Mission postponement');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});

test('footer destinations and single back-to-top link work without JavaScript',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='no-javascript','Dedicated no-JavaScript project');await page.goto('/?qa=1');
 const footer=page.locator('footer');
 await footer.scrollIntoViewIfNeeded();
 await expect(footer.locator('details.footer-group[open]')).toHaveCount(4);
 for(const path of ['/contact/#inquiry','/pricing/','/areas/','/payments/','/privacy/','/terms/','/accessibility/']){
  const destination=footer.locator(`a[href="${path}"]`);await expect(destination).toHaveCount(1);await expect(destination).toBeVisible();
 }
 const destinations=await footer.locator('a[href]').evaluateAll(links=>links.map(link=>new URL(link.href).pathname));expect(new Set(destinations).size).toBe(destinations.length);
 const directories=footer.locator('.footer-area-directories');await expect(directories).not.toHaveAttribute('open','');
 await directories.locator(':scope > summary').focus();await page.keyboard.press('Enter');
 await expect(directories.locator('a[href="/areas/new-york/"]')).toBeVisible();
 await page.locator('.back-to-top').click();await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
 await expect(footer.locator('a[href="#page-top"]')).toHaveCount(0);
});

test('checkout terms remain available by keyboard without JavaScript',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='no-javascript','Dedicated no-JavaScript project');
 for(const id of ['launch-site','focused-site','signature-site','website-baseline','audit-fix-sprint','keep-running','improve','grow']){
  await page.goto('/checkout/'+id+'/?qa=1');
  const overview=page.locator('.checkout-overview'),summary=overview.locator('summary');
  await expect(page.locator('#name')).toBeVisible();await expect(overview).not.toHaveAttribute('open','');
  await summary.focus();await page.keyboard.press('Enter');await expect(overview).toHaveAttribute('open','');
  await expect(overview.getByRole('heading',{name:['launch-site','focused-site','signature-site'].includes(id)?'Your project and payments':'Payment steps',exact:true})).toBeVisible();
  await expect(overview.getByRole('link',{name:'Payments and cancellation',exact:true})).toBeVisible();
 }
});
test('new guide examples and contact intent are usable without JavaScript',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='no-javascript','Dedicated no-JavaScript project');
 for(const [slug,goal]of [['ai-search-visibility','search'],['ai-website-content-review','search'],['local-seo-audit','search'],['slow-website-on-mobile','fix']]){
  await page.goto('/guides/'+slug+'/?qa=1');await expect(page.locator('#worked-example, #completed-example')).toBeVisible();
  const download=page.locator('.journal-prose a[download]').first();expect((await page.request.get(await download.getAttribute('href'))).status()).toBe(200);
  await page.locator('#next-decision .button').click();await expect(page.locator('input[name=goal]:checked')).toHaveValue(goal);await expect(page.locator('#request_kind')).toHaveValue('question');
 }
});

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
 await page.goto('/tools/website-roi-calculator/?qa=1');await expect(page.locator('#website-roi')).toBeHidden();
 await expect(page.getByText('The interactive calculator needs JavaScript. Open “How this is calculated” below for the example and formulas.',{exact:true})).toBeVisible();
 await page.locator('#worked-example summary').click();await expect(page.locator('#worked-example details')).toHaveAttribute('open','');
 await expect(page.getByRole('heading',{name:'The example, step by step',exact:true})).toBeVisible();
 for(const value of ['$4,510','$1,490','33%','7.3 months'])await expect(page.locator('#worked-example')).toContainText(value);
 await page.goto('/guides/website-content-template/?qa=1');await expect(page.locator('.journal-prose')).toBeVisible();
 const template=page.locator('a[href^="/assets/guides/website-content-template.txt"]').first();await expect(template).toBeVisible();await expect(template).toHaveAttribute('download','');
 const download=await page.request.get(await template.getAttribute('href'));expect(download.status()).toBe(200);expect((await download.text()).length).toBeGreaterThan(300);
});

test('Texas directory entries and reviewed county briefs remain usable without JavaScript',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='no-javascript','Dedicated no-JavaScript project');
 await page.goto('/areas/texas/?qa=1');await openNativeCountyLists(page,254);
 const entry=await openNativeCountyEntry(page,'anderson','Palestine');
 await expect(entry.getByRole('link',{name:'Website design for Anderson County',exact:true})).toHaveAttribute('href','/areas/texas/anderson-county/');
 await page.goto('/areas/texas/ellis-county/?qa=1');
 const question=faqsByPath['/areas/texas/ellis-county/'][0];
 await expect(page.locator('#service-questions').getByRole('heading',{name:question.question,exact:true})).toBeVisible();
 await expect(page.locator('#service-questions p').first()).toHaveText(question.answer);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.getByRole('link',{name:'Ask about your website',exact:true}).first().click();
 await expect(page.locator('input[name="county"]')).toHaveValue('texas/ellis-county');
});

async function openNativeCountyLists(page,count){
 await expect(page.locator('[data-county-filter-controls]')).toBeVisible();
 await expect(page.getByRole('searchbox',{name:'County, parish, region or community'})).toBeDisabled();
 await expect(page.getByText('Search needs JavaScript. Open the lists below to browse every service area.',{exact:true})).toBeVisible();
 await expect(page.locator('[data-cs]')).toHaveCount(count);
 await expect(page.locator('[data-cs]:visible')).toHaveCount(0);
 const allAreas=page.locator('[data-county-browse-all] > summary');
 if(await allAreas.count())await allAreas.click();
 for(const summary of await page.locator('[data-county-directory] > details > summary').all()){
  await summary.click();await expect(summary.locator('..')).toHaveAttribute('open','');
 }
 await expect(page.locator('[data-cs]:visible')).toHaveCount(count);
}

async function openNativeCountyEntry(page,slug,place){
 const entry=page.locator(`[data-county-area][id="${slug}"]`),summary=entry.locator(':scope > summary');
 await summary.focus();await page.keyboard.press('Enter');
 await expect(entry).toHaveAttribute('open','');await expect(summary).toBeFocused();
 await expect(entry.locator('.county-directory')).toBeVisible();
 await expect(entry.locator('.county-place-list')).toContainText([place]);
 const referenceId=await entry.getByRole('link',{name:'Place definitions and sources',exact:true}).getAttribute('href');
 await page.locator('.county-reference-sets > summary').click();
 await entry.getByRole('link',{name:'Place definitions and sources',exact:true}).click();
 await expect(page.locator(referenceId)).toBeVisible();
 const source=page.locator(referenceId).locator('a[href^="#geography-source-"]').first(),sourceId=await source.getAttribute('href');
 await page.locator('.county-source-index > summary').click();await source.click();
 await expect(page.locator(sourceId)).toBeVisible();
 await expect(page.locator(sourceId+' a')).toHaveAttribute('href',/^https:\/\//);
 return entry;
}

test('New York county places and source references remain usable without JavaScript',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='no-javascript','Dedicated no-JavaScript project');
 await page.goto('/areas/new-york/?qa=1');
 await openNativeCountyLists(page,62);
 await expect(page.locator('[data-county-directory] > details[open]')).toHaveCount(10);
 const entry=await openNativeCountyEntry(page,'st-lawrence','Ogdensburg');
 await expect(entry.getByRole('heading',{name:'Cities',exact:true})).toBeVisible();
 await expect(entry.locator('.county-geography-note')).toContainText('Canton');
 await expect(entry.locator('[data-cl]')).toHaveAttribute('href','/areas/st-lawrence-county/');
 await expect(entry.getByRole('link',{name:'Link to this directory entry',exact:true})).toHaveAttribute('href','/areas/new-york/#st-lawrence');
});

test('state directories and Pennsylvania county details work without JavaScript',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='no-javascript','Dedicated no-JavaScript project');
 await page.goto('/areas/?qa=1');
 await openNativeCountyLists(page,2837);
 await page.locator('.state-area-links a[href="/areas/pennsylvania/"]').click();
 await openNativeCountyLists(page,67);
 await expect(page.locator('[data-county-directory] > details[open]')).toHaveCount(10);
 const entry=await openNativeCountyEntry(page,'columbia','Bloomsburg');
 await expect(entry.getByRole('heading',{name:'Towns',exact:true})).toBeVisible();
 await expect(entry.locator('.county-geography-note')).toContainText('incorporated town');
 const download=entry.getByRole('link',{name:'General website-planning worksheet (TXT)',exact:true});
 await expect(download).toHaveCount(0);
 expect((await page.request.get('/assets/county-briefs/pennsylvania-columbia.txt')).status()).toBe(200);
});

test('Ohio directory preserves typed municipalities and omits an unrelated worksheet without JavaScript',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='no-javascript','Dedicated no-JavaScript project');
 await page.goto('/areas/?qa=1');
 await page.locator('.state-area-links a[href="/areas/ohio/"]').click();
 await openNativeCountyLists(page,88);
 await expect(page.locator('[data-county-directory] > details[open]')).toHaveCount(7);
 const entry=await openNativeCountyEntry(page,'greene','Yellow Springs');
 await expect(entry.getByRole('heading',{name:'Villages',exact:true})).toBeVisible();
 await expect(entry.getByRole('heading',{name:'Census-designated places',exact:true})).toBeVisible();
 await expect(entry.getByRole('link',{name:'General website-planning worksheet (TXT)',exact:true})).toHaveCount(0);
});

test('state hubs and independent-city entries work without JavaScript or inferred inquiry context',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='no-javascript','Dedicated no-JavaScript project');
 test.setTimeout(90_000);
 for(const [state,count] of [['new-jersey',21],['connecticut',9],['rhode-island',5],['massachusetts',14],['delaware',3],['vermont',14],['new-hampshire',10],['maine',16],['maryland',24]]){
  await page.goto(`/areas/${state}/?qa=1`);await openNativeCountyLists(page,count);
 }
 const entry=await openNativeCountyEntry(page,'baltimore-city','Baltimore');
 await expect(entry.locator('.county-area-content')).toContainText('Independent city; separate from surrounding counties.');
 const download=entry.getByRole('link',{name:'General website-planning worksheet (TXT)',exact:true});
 await expect(download).toHaveCount(0);
 await page.locator('.county-state-switch').getByRole('link',{name:'Ask about your website',exact:true}).click();
 await expect(page.locator('input[name="county"]')).toHaveValue('');
 await expect(page.locator('input[name="business_location"]')).toHaveValue('');
 await expect(page.locator('#request_kind')).toHaveValue('question');
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
 await page.locator('[data-addon-picker] > summary').click();
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

test('native checkout retains chosen additions and welcomes questions without another form',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='no-javascript','Dedicated no-JavaScript project');
 await page.goto('/checkout/launch-site/?addons=contact_form,booking_setup#inquiry');
 await expect(page.locator('[data-addon-project-total]')).toContainText('$2,000');
 await expect(page.locator('[data-addon-payments]')).toContainText('$1,000 to book (50%)');
 await expect(page.locator('[data-checkout-question]')).toHaveCount(0);
 await expect(page.locator('#message-help')).toContainText('Questions are welcome here too');
 await expect(page.locator('#service')).toHaveValue('launch_site');
 await expect(page.locator('#request_kind')).toHaveValue('checkout');
 await expect(page.getByRole('button',{name:'Request my Launch proposal',exact:true})).toBeVisible();
 await expect(page.locator('#inquiry-addon-contact_form')).toBeChecked();
 await expect(page.locator('#inquiry-addon-booking_setup')).toBeChecked();
});

test('server-rendered proposal, general question and fixed monthly context work without JavaScript',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='no-javascript','Dedicated no-JavaScript project');
 for(const [path,service,kind,label] of [
  ['/contact/?request_kind=checkout#inquiry','unsure','checkout','Send message'],
  ['/contact/?request_kind=question#inquiry','unsure','question','Send message'],
  ['/checkout/grow/?offer=launch_site&priority=article#inquiry','grow','checkout','Request a Grow proposal']
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
 await page.getByRole('button',{name:'Request a Grow proposal',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Test request received'})).toBeVisible();expect(submitted).toMatchObject({service:'grow',request_kind:'checkout',priority:'article',website:'https://example.com/'});
});
