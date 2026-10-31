import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const axe=await readFile(new URL('../../../node_modules/axe-core/axe.min.js',import.meta.url),'utf8');
const business='10000000-0000-4000-8000-000000000001';
const route=section=>`/workspace/${section}?business=${business}`;

test('customer request, scoped studio preparation and exact-version approval work end to end',async({page},info)=>{
 await page.goto('/');await page.getByRole('link',{name:'＋ Make a request',exact:true}).click();
 const outcome=`Synthetic ${info.project.name} hours change ${Date.now()}`;
 await page.getByLabel('What would you like to achieve?',{exact:true}).fill(outcome);await page.getByRole('button',{name:'Send request',exact:true}).click();
 await expect(page.getByRole('heading',{name:outcome,exact:true})).toBeVisible();const workUrl=page.url();
 await page.getByRole('link',{name:'Studio',exact:true}).click();await page.goto(workUrl);
 await page.getByLabel('Scope',{exact:true}).fill('Update the confirmed opening hours only.');await page.getByLabel('Coverage or agreed charge',{exact:true}).fill('Included correction, no added fee.');
 const future=new Date(Date.now()+86400000).toISOString().slice(0,16);
 await page.getByLabel('Due',{exact:true}).fill(future);await page.getByLabel('Next update',{exact:true}).fill(future);
 await page.getByRole('button',{name:'Accept and schedule',exact:true}).click();await page.getByRole('link',{name:'Prepare a version',exact:true}).click();
 await page.getByLabel('Summary',{exact:true}).fill('Confirmed opening hours update');await page.getByLabel('Prepared work or content',{exact:true}).fill('Monday to Friday, 9 am to 5 pm.');await page.getByLabel('Date effect',{exact:true}).fill('Tomorrow after approval.');
 await page.getByRole('button',{name:'Send version for review',exact:true}).click();await expect(page.getByRole('heading',{name:'Confirmed opening hours update',exact:true})).toBeVisible();const reviewUrl=page.url();
 await page.getByRole('link',{name:'Customer',exact:true}).click();await page.goto(reviewUrl);
 await expect(page.getByText('Monday to Friday, 9 am to 5 pm.',{exact:true})).toBeVisible();
 await page.getByLabel('I have reviewed the work, cost, and timing above.',{exact:true}).check();await page.getByRole('button',{name:'Save my decision',exact:true}).click();
 await expect(page.getByText('Your decision is recorded.',{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Decision history',exact:true})).toBeVisible();
 await expect(page.getByText('Approve',{exact:true})).toBeVisible();
 await page.screenshot({path:`output/playwright/workspace/${info.project.name}-approval.png`,fullPage:true});
});

test('customer invitation save and revoke, and failed form submission preserve intent',async({page},info)=>{
 await page.goto(route('people'));const email=`${info.project.name}-${Date.now()}@synthetic.example`;
 await page.getByRole('textbox',{name:'Email address',exact:true}).fill(email);await page.getByRole('button',{name:'Save invitation',exact:true}).click();
 await expect(page.getByText(email,{exact:true})).toBeVisible();
 await page.locator('form[data-action="invitation.revoke"]').filter({hasText:email}).getByRole('button',{name:'Revoke invitation',exact:true}).click();await expect(page.getByText(email,{exact:true})).toHaveCount(0);
 await page.goto(route('new'));const draft='Keep this draft after a synthetic network error';await page.getByLabel('What would you like to achieve?',{exact:true}).fill(draft);
 await page.route('**/api/command',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'unavailable',message:'Synthetic service interruption'}})}));
 await page.getByRole('button',{name:'Send request',exact:true}).click();await expect(page.getByRole('alert')).toHaveText('Synthetic service interruption');await expect(page.getByLabel('What would you like to achieve?',{exact:true})).toHaveValue(draft);
 await page.unroute('**/api/command');await page.getByRole('button',{name:'Send request',exact:true}).click();await expect(page.getByRole('heading',{name:draft,exact:true})).toBeVisible();
});

test('catalog proposal, named signer, agreement acceptance and portable receipt work together',async({page},info)=>{
 await page.goto('/_preview/role?as=operator');await page.goto(route('agreements'));
 const title=`Synthetic ${info.project.name} proposal ${Date.now()}`;
 await page.getByLabel('Catalog service',{exact:true}).selectOption('launch_site|standard');await page.getByLabel('Service name',{exact:true}).fill(title);await page.getByRole('button',{name:'Add service',exact:true}).click();
 await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();const proposalUrl=page.url();
 await page.goto(route('people'));await page.getByText('Assign a verified decision-maker',{exact:true}).click();
 const authority=page.locator('form[data-action="authority.assign"]');await authority.getByLabel('Service',{exact:true}).selectOption({label:title});await authority.getByLabel('Decision domain',{exact:true}).selectOption('contract');
 await authority.getByLabel('Valid from',{exact:true}).fill(new Date(Date.now()-86400000).toISOString().slice(0,16));await authority.getByLabel('Valid until',{exact:true}).fill(new Date(Date.now()+86400000*365).toISOString().slice(0,16));
 await authority.getByLabel('Independent business-authority verification evidence',{exact:true}).fill('Synthetic owner identity and business authority checked independently.');await authority.getByRole('button',{name:'Record verified authority',exact:true}).click();await expect(page.getByRole('status')).toBeVisible();
 await page.goto(proposalUrl);await page.getByLabel('Proposed start',{exact:true}).fill(new Date(Date.now()+86400000).toISOString().slice(0,16));await page.getByLabel('Site hostname',{exact:true}).fill('synthetic.example');await page.getByLabel('Agreed scope and site',{exact:true}).fill('Synthetic focused website with included native measurement and one agreed domain.');await page.getByRole('button',{name:'Save proposal draft',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Focused Website',exact:true})).toBeVisible();await expect(page.getByText('$878.00',{exact:true})).toBeVisible();const agreementUrl=page.url();
 await page.getByRole('button',{name:'Send agreement for review',exact:true}).click();await expect(page.getByRole('status')).toBeVisible();
 await page.getByRole('link',{name:'Customer',exact:true}).click();await page.goto(agreementUrl);
 await page.getByLabel('Your full name',{exact:true}).fill('Avery Synthetic');await page.getByLabel('I am authorized to accept this exact agreement for the business and agree to its scope, fees, and terms.',{exact:true}).check();await page.getByRole('button',{name:'Accept this agreement',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Acceptance receipt',exact:true})).toBeVisible();
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'Download acceptance receipt',exact:true}).click();expect((await download).suggestedFilename()).toBe('agreement-receipt.json');
 await page.addScriptTag({content:axe});expect(await page.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id))).toEqual([]);
 await page.screenshot({path:`output/playwright/workspace/${info.project.name}-agreement.png`,fullPage:true});
 await page.getByRole('link',{name:'Studio',exact:true}).click();await page.goto(route('billing'));
 const stage=page.locator('article.card').filter({has:page.locator('form[data-action="milestone.due"]')}).first();
 await stage.getByText('Start this milestone',{exact:true}).click();
 await stage.getByLabel('Start and readiness evidence',{exact:true}).fill('Synthetic booked start confirmed.');
 await stage.getByRole('button',{name:'Record milestone as due',exact:true}).click();await expect(page.getByRole('status')).toBeVisible();
 await page.getByRole('button',{name:'Prepare the agreed invoice',exact:true}).first().click();await expect(page.getByRole('status')).toBeVisible();
 await expect(page.getByText('Prepared',{exact:true})).toBeVisible();

});

test('workspace pages have no horizontal overflow or automated serious accessibility violations',async({page})=>{
 test.setTimeout(90000);
 for(const section of ['','work','approvals','messages','files','ads','results','business','agreements','onboarding','billing','people','help']){
  await page.goto(route(section));await expect(page.locator('h1')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),section+' width').toBe(true);
  await page.addScriptTag({content:axe});const violations=await page.evaluate(async()=>{const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));});
  expect(violations,section+' accessibility').toEqual([]);
 }
});
