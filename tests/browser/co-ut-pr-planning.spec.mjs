import {readFile} from 'node:fs/promises';
import {test,expect} from './fixtures.mjs';
import coUtPr from '../fixtures/co-ut-pr-approved-paths.json' with {type:'json'};
import services from '../../src/location-service-data.json' with {type:'json'};
const paths=coUtPr.slice(3);
const sourceByPath=new Map(services.filter(entry=>paths.includes(entry.path)).map(entry=>[entry.path,entry]));
const axe=await readFile(new URL('../../node_modules/axe-core/axe.min.js',import.meta.url),'utf8');

for(let offset=0;offset<paths.length;offset+=6){
 const batch=paths.slice(offset,offset+6);
 test(`Colorado/Utah/Puerto Rico area batch ${offset/6+1} preserves complete briefs, table semantics, source notes and inquiry context`,async({page},testInfo)=>{
  test.setTimeout(180_000);
  await page.route('**/__co-ut-pr-axe.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:axe}));
  for(const path of batch){
   const source=sourceByPath.get(path);expect(source,path).toBeDefined();
   const response=await page.goto(path+'?qa=1');expect(response.status()).toBe(200);
   await page.evaluate(()=>document.fonts.ready);
   await expect(page.getByRole('heading',{level:1})).toContainText('Web design for');
   for(const id of ['buyer-task','approach','search'])await expect(page.locator('#'+id)).toBeVisible();
   const planning=page.locator('details.local-planning-details');
   await expect(planning).not.toHaveAttribute('open','');
   await planning.locator(':scope > summary').focus();await page.keyboard.press('Enter');
   await expect(planning).toHaveAttribute('open','');
   await expect(planning.locator('.location-scope')).toHaveCount(source.scopes.length);
   for(const [index,scope] of source.scopes.entries()){
    const article=planning.locator('.location-scope').nth(index);
    await expect(article.getByRole('heading',{level:3})).toHaveText(scope.title);
    await expect(article.locator('li')).toHaveText(scope.pages);
    for(const detail of [scope.request,scope.supplies,scope.check])await expect(article).toContainText(detail);
   }
   await expect(planning.locator('.location-planning-table table')).toHaveCount(source.planningTable?1:0);
   for(const table of await page.locator('.location-planning-table table').all()){
    await expect(table).toBeVisible();
    await expect(table.locator('caption')).toHaveText(source.planningTable.title);
    await expect(table.locator('tbody tr')).toHaveCount(source.planningTable.rows.length);
    const headers=await table.getByRole('columnheader').allTextContents();
    expect(headers).toEqual(source.planningTable.columns);
    for(const [index,row] of (await table.locator('tbody tr').all()).entries()){
     await expect(row.locator('th,td')).toHaveText(source.planningTable.rows[index]);
     await expect(row.locator('th')).toHaveAttribute('scope','row');
     const cells=row.getByRole('cell');await expect(cells).toHaveCount(headers.length-1);
     for(let i=0;i<headers.length-1;i++){
      await expect(cells.nth(i)).toHaveAttribute('data-label',headers[i+1]);
      if(testInfo.project.name==='phone')expect(await cells.nth(i).evaluate(cell=>getComputedStyle(cell,'::before').content)).toBe('"'+headers[i+1]+'"');
     }
    }
   }
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
   await page.locator('.location-source-note summary').click();
   await expect(page.locator('.location-source-note')).toContainText('Reviewed October 26, 2026.');
   await page.addScriptTag({url:'/__co-ut-pr-axe.js'});
   const violations=await page.evaluate(async()=>{const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return result.violations.map(({id,nodes})=>({id,targets:nodes.map(node=>node.target)}));});
   expect(violations,path).toEqual([]);
   if(batch[0]===path)await page.screenshot({path:testInfo.outputPath(path.split('/').at(-2)+'.png'),fullPage:true});
   await page.getByRole('link',{name:'Ask about your website',exact:true}).first().click();
   await expect(page).toHaveURL(url=>url.pathname==='/contact/'&&url.hash==='#inquiry'&&url.searchParams.get('county')===path.slice('/areas/'.length,-1)&&url.searchParams.get('request_kind')==='question'&&url.searchParams.get('offer')==='unsure'&&!url.searchParams.has('goal')&&url.searchParams.get('qa')==='1'&&url.searchParams.size===4);
  }
  if(testInfo.project.name==='phone'){
   await page.setViewportSize({width:320,height:800});
   for(const path of batch){
    await page.goto(path+'?qa=1');
    const planning=page.locator('details.local-planning-details');await planning.locator(':scope > summary').click();
    await expect(planning).toHaveAttribute('open','');
    for(const table of await planning.locator('.location-planning-table table').all())await expect(table).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
   }
  }
 });
}
