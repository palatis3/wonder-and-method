import {test,expect} from './fixtures.mjs';
import {readFile} from 'node:fs/promises';
const axe=await readFile(new URL('../../node_modules/axe-core/axe.min.js',import.meta.url),'utf8');
test.beforeEach(async({page})=>{await page.route('**/__test-axe.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:axe}));});
test('ROI calculator validates, recalculates and resets without transmitting inputs',async({page},testInfo)=>{
 test.skip(testInfo.project.name==='no-javascript','Covered by the no-JavaScript fallback');
 const requests=[];page.on('request',request=>requests.push({url:request.url(),method:request.method(),body:request.postData()}));
 await page.goto('/tools/website-roi-calculator/?qa=1');
 await expect(page.locator('#website-roi')).toBeVisible();
 await page.getByRole('button',{name:'Calculate scenario',exact:true}).click();
 await expect(page.locator('#roi-output')).toContainText('Total website cost$4,510');await expect(page.locator('#roi-output')).toContainText('Money left after website costs$1,490');await expect(page.locator('#roi-output')).toContainText('33%');await expect(page.locator('#roi-output')).toContainText('7.3 months');
 await expect(page.locator('#roi-results-title')).toBeFocused();
 await page.locator('#roi-months').fill('0');await expect(page.locator('#roi-results')).toBeHidden();await page.getByRole('button',{name:'Calculate scenario',exact:true}).click();
 await expect(page.locator('#roi-months')).toBeFocused();await expect(page.locator('#roi-months')).toHaveAttribute('aria-invalid','true');await expect(page.locator('#roi-months-error')).toContainText('whole number');
 await page.locator('#roi-months').fill('12');await page.locator('#roi-inquiries').fill('0');await page.getByRole('button',{name:'Calculate scenario',exact:true}).click();
 await expect(page.locator('#roi-output')).toContainText('-$4,510');await expect(page.locator('#roi-output')).toContainText('There is no money left each month after direct job and website costs under these assumptions.');
 await page.locator('#roi-oneTime').fill('0');await page.locator('#roi-monthlyCost').fill('0');await page.getByRole('button',{name:'Calculate scenario',exact:true}).click();await expect(page.locator('#roi-output')).toContainText('Not defined: zero cost');
 await page.locator('#roi-inquiries').fill('1000000');await page.getByRole('button',{name:'Calculate scenario',exact:true}).click();await expect(page.locator('#roi-output')).not.toContainText('NaN');await expect(page.locator('#roi-output')).not.toContainText(/Infinity|∞/);
 await page.locator('#roi-oneTime').fill('1e-310');await page.getByRole('button',{name:'Calculate scenario',exact:true}).click();await expect(page.locator('#roi-oneTime')).toHaveAttribute('aria-invalid','true');await expect(page.locator('#roi-oneTime-error')).toContainText('Enter an amount like 2350 or $2,350.00.');
 await page.locator('#roi-oneTime').fill('0.001');await page.getByRole('button',{name:'Calculate scenario',exact:true}).click();await expect(page.locator('#roi-oneTime')).toHaveAttribute('aria-invalid','true');await expect(page.locator('#roi-oneTime-error')).toContainText('Use whole dollars or cents only.');
 await page.getByRole('button',{name:'Reset example',exact:true}).click();await expect(page.locator('#roi-results')).toBeHidden();await expect(page.locator('#roi-oneTime')).toHaveValue('2350');await expect(page.locator('#roi-monthlyCost')).toHaveValue('180');await expect(page.locator('#roi-inquiries')).toHaveValue('4');
 expect(requests.filter(r=>r.method!=='GET')).toEqual([]);expect(requests.filter(r=>/oneTime|monthlyCost|contribution=|inquiries=/.test(r.url))).toEqual([]);expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}))).toEqual({local:0,session:0});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.addScriptTag({url:'/__test-axe.js'});const violations=await page.evaluate(async()=>{const r=await axe.run(document.getElementById('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(x=>({id:x.id,nodes:x.nodes.length}));});expect(violations).toEqual([]);
});

test('six new guides have visible content, working downloads and narrow-screen layouts',async({page},testInfo)=>{
 test.skip(testInfo.project.name==='no-javascript');
 for(const slug of ['website-not-generating-leads','how-to-choose-a-web-designer','website-content-template','website-redesign-timeline','one-page-website-seo','website-handover-checklist']){
  await page.goto('/guides/'+slug+'/?qa=1');await expect(page.locator('.journal-prose')).toBeVisible();await expect(page.locator('.journal-prose > section')).toHaveCount(slug==='website-content-template'?7:6);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  const download=page.locator('.journal-prose a[href^="/assets/guides/"]').first();await expect(download).toBeVisible();const url=await download.getAttribute('href');const response=await page.request.get(url);expect(response.status()).toBe(200);expect((await response.text()).length).toBeGreaterThan(300);
  const diagram=page.locator('.journal-diagram img');await diagram.scrollIntoViewIfNeeded();await expect(diagram).toBeVisible();await expect(diagram).toHaveJSProperty('complete',true);expect(await diagram.evaluate(image=>image.naturalWidth)).toBeGreaterThan(0);await expect(diagram).toHaveAttribute('alt',/.+/);
  await page.addScriptTag({url:'/__test-axe.js'});const violations=await page.evaluate(async()=>{const r=await axe.run(document.getElementById('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(x=>({id:x.id,nodes:x.nodes.length}));});expect(violations,slug).toEqual([]);
 }
});
