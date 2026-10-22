import {test,expect} from './fixtures.mjs';
import {readFile} from 'node:fs/promises';
const axe=await readFile(new URL('../../node_modules/axe-core/axe.min.js',import.meta.url),'utf8');
const guides=[['ai-search-visibility','search'],['ai-website-content-review','search'],['local-seo-audit','search'],['slow-website-on-mobile','fix']];
test('four new guide journeys retain examples, accessible tables, downloads and inquiry intent',async({page},testInfo)=>{
 test.setTimeout(60_000);
 await page.route('**/__test-axe.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:axe}));
 for(const [slug,goal]of guides){
  await page.goto('/guides/'+slug+'/?qa=1');await expect(page.locator('.journal-prose > section')).toHaveCount(6);await expect(page.locator('.guide-steps li')).toHaveCount(3);
  await expect(page.locator('#worked-example, #completed-example')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),slug).toBe(true);
  const link=page.locator('.journal-prose a[download]').first();await link.scrollIntoViewIfNeeded();
  const [download]=await Promise.all([page.waitForEvent('download'),link.click()]);expect(await download.failure()).toBeNull();expect(download.suggestedFilename()).toMatch(/\.csv$/);
  await page.addScriptTag({url:'/__test-axe.js'});const violations=await page.evaluate(async()=>{const r=await axe.run(document.getElementById('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(x=>({id:x.id,nodes:x.nodes.length}));});expect(violations,slug).toEqual([]);
  await page.locator('#next-decision .button').click();await expect(page.locator('#goal')).toHaveValue(goal);await expect(page.locator('#request_kind')).toHaveValue('question');await expect(page.locator('#service')).toHaveValue('unsure');
 }
});
