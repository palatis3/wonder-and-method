import {test,expect} from './fixtures.mjs';
import {conceptCatalog} from '../../src/portfolio-concepts.mjs';

test('guide search, topic selection, empty results and native reset agree',async({page})=>{
 await page.goto('/guides/?qa=1');const count=page.locator('[data-guide-count]'),search=page.locator('#guide-search');
 await expect(count).toHaveText('65 guides available. Choose a topic or search for a question.');
 await search.fill('booking');await expect(count).toHaveText(/\d+ of 65 guides match\./);await expect(count).not.toHaveText('65 of 65 guides match.');
 await expect(page.locator('.guide-examples')).toHaveAttribute('open','');
 const visible=await page.locator('.journal-card:visible').allTextContents();expect(visible.length).toBeGreaterThan(0);for(const text of visible)expect(text.toLowerCase()).toContain('booking');
 await search.fill('zzzz-no-match');await expect(count).toHaveText('0 of 65 guides match. Try another keyword or reset the filters.');await expect(page.locator('.journal-card:visible')).toHaveCount(0);
 await page.getByRole('button',{name:'Reset filters',exact:true}).click();await expect(count).toHaveText('65 guides available. Choose a topic or search for a question.');await expect(search).toBeFocused();await expect(search).toHaveValue('');
 const topic=await page.locator('#guide-category option').nth(1).getAttribute('value');await page.locator('#guide-category').selectOption(topic);
 await expect(page.locator('[data-guide-group]:visible')).toHaveCount(1);await expect(page.locator('[data-guide-group]:visible')).toHaveAttribute('id',topic);
 await page.getByRole('button',{name:'Reset filters',exact:true}).click();await expect(count).toHaveText('65 guides available. Choose a topic or search for a question.');
 const extra=page.locator('#plan [data-guide-more]');
 await expect(extra).not.toHaveAttribute('open','');await extra.locator('summary').click();await expect(extra).toHaveAttribute('open','');
 await search.fill('migration');await expect(page.locator('.journal-card:visible')).not.toHaveCount(0);
 for(const card of await page.locator('.journal-card:visible').all())await expect(card).toContainText(/migration/i);
 await page.getByRole('button',{name:'Reset filters',exact:true}).click();await expect(extra).toHaveAttribute('open','');
 await extra.locator('summary').click();await expect(extra).not.toHaveAttribute('open','');
});

test('break-even customers round cents correctly and retain optional detail state',async({page})=>{
 await page.goto('/tools/website-roi-calculator/?qa=1');
 for(const [key,value]of Object.entries({oneTime:'0.10',monthlyCost:'0.20',months:'1',contribution:'0.30'}))await page.locator('#roi-'+key).fill(value);
 await page.getByRole('button',{name:'Calculate scenario',exact:true}).click();await expect(page.locator('.roi-primary-number')).toHaveText('1');await expect(page.locator('.roi-secondary')).not.toHaveAttribute('open','');
 await page.locator('.roi-secondary > summary').click();await page.locator('#roi-oneTime').fill('0.11');await page.getByRole('button',{name:'Calculate scenario',exact:true}).click();await expect(page.locator('.roi-primary-number')).toHaveText('2');await expect(page.locator('.roi-secondary')).toHaveAttribute('open','');
 await page.locator('#roi-contribution').fill('0');await page.getByRole('button',{name:'Calculate scenario',exact:true}).click();await expect(page.locator('.roi-primary-number')).toHaveText('Not reachable');
});

test('one fictional tracker sample opens without enabling storage',async({page})=>{
 await page.goto('/work/lead-workbench/?qa=1');await expect(page.locator('#sample-list > li')).toHaveCount(1);await expect(page.locator('#sample-editor')).toBeVisible();await expect(page.locator('#remember-samples')).not.toBeChecked();
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);await page.locator('#sample-notes').fill('Temporary test note');await page.locator('#save-sample').click();expect(await page.evaluate(()=>localStorage.length)).toBe(0);
 await page.reload();await expect(page.locator('#sample-list > li')).toHaveCount(1);await expect(page.locator('#sample-notes')).not.toHaveValue('Temporary test note');
});

test('full package and local briefs remain available by disclosure and saved link',async({page})=>{
 await page.goto('/services/web-design/?qa=1');await page.locator('#every-inclusion > summary').click();await expect(page.locator('#every-inclusion')).toHaveAttribute('open','');
 await page.goto('/pricing/?qa=1');await expect(page.locator('#every-inclusion')).not.toHaveAttribute('open','');await page.locator('#every-inclusion > summary').click();await expect(page.locator('#every-inclusion .v3-comparison-list > article')).toHaveCount(4);for(const card of await page.locator('#every-inclusion .v3-comparison-list > article').all()){await expect(card).toBeVisible();await expect(card.locator('dl')).toBeVisible();await expect(card.getByRole('link',{name:'Read the complete scope'})).toBeVisible();}
 await page.goto('/pricing/?qa=1#every-inclusion');await expect(page.locator('#every-inclusion')).toHaveAttribute('open','');await expect(page.locator('#every-inclusion')).toBeInViewport();
 await page.goto('/areas/texas/milam-county/?qa=1');await expect(page.locator('.local-decision-steps > li')).toHaveCount(3);for(const step of await page.locator('.local-decision-steps > li').all())await expect(step).toBeVisible();await expect(page.locator('.local-brief-summary,.location-planning-table')).toHaveCount(0);await expect(page.locator('#planning-details')).not.toHaveAttribute('open','');
 await page.goto('/areas/texas/milam-county/?qa=1#planning-details');await expect(page.locator('#planning-details')).toHaveAttribute('open','');await expect(page.locator('#planning-details')).toBeInViewport();await expect(page.locator('#planning-details')).toContainText('These are public examples, not studio projects, clients or endorsements.');
});

test('every concept keeps prices and navigation clear on narrow phones',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','One complete phone matrix');test.setTimeout(90_000);
 for(const width of [320,375,390,430])for(const concept of conceptCatalog){
  await page.setViewportSize({width,height:844});await page.goto(concept.servicePath+'?qa=1');await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('.concept-toolbar')).toContainText('Fictional website concept');await expect(page.locator('.support-chat-launch')).toBeVisible();await expect(page.locator('.support-chat')).toHaveCSS('position','fixed');await expect(page.locator('#main-nav')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
  await page.locator('#site-help').scrollIntoViewIfNeeded();await page.locator('.back-to-top').click();await expect(page.locator('.concept-toolbar a').first()).toBeFocused();await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
  if(width===390)await page.screenshot({path:testInfo.outputPath(concept.id+'-phone.png')});
 }
});
