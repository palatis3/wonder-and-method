import {readFile} from 'node:fs/promises';
import {test,expect} from './fixtures.mjs';
const axe=await readFile(new URL('../../node_modules/axe-core/axe.min.js',import.meta.url),'utf8');
test('shared chrome and page families pass automated accessibility checks with footer groups open',async({page},testInfo)=>{
 test.skip(testInfo.project.name==='phone-reduced-motion','Same accessibility tree; reduced motion has dedicated interaction tests');test.setTimeout(180_000);
 await page.route('**/__site-axe.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:axe}));
 for(const path of ['/','/pricing/','/services/web-design/','/services/website-audit/','/services/seo/','/work/','/contact/','/areas/new-york/','/guides/ai-search-visibility/','/payments/','/about/']){
  await page.goto(path+'?qa=1');await page.evaluate(()=>document.fonts.ready);
  for(const summary of await page.locator('footer summary,.audit-sample-proof>summary').all())await summary.click();
  await page.addScriptTag({url:'/__site-axe.js'});
  const violations=await page.evaluate(async()=>{
   const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});
   return result.violations.map(item=>({id:item.id,impact:item.impact,nodes:item.nodes.map(node=>({target:node.target,summary:node.failureSummary}))}));
  });
  expect(violations,path).toEqual([]);
 }
});
