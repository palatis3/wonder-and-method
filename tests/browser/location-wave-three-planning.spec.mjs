import {readFile} from 'node:fs/promises';
import {test,expect} from './fixtures.mjs';
import paths from '../fixtures/location-wave-three-paths.json' with {type:'json'};
const axe=await readFile(new URL('../../node_modules/axe-core/axe.min.js',import.meta.url),'utf8');

for(let offset=0;offset<paths.length;offset+=6){
 const batch=paths.slice(offset,offset+6);
 test(`location wave three ${offset/6+1} preserves table headings, phone labels, links and accessibility`,async({page},testInfo)=>{
 test.skip(testInfo.project.name==='phone-reduced-motion','Same static tables; reduced motion has separate coverage');test.setTimeout(180_000);
 await page.route('**/__location-axe.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:axe}));
 for(const path of batch){
  const response=await page.goto(path+'?qa=1');expect(response.status()).toBe(200);
  await page.evaluate(()=>document.fonts.ready);
  const table=page.locator('.location-planning-table table');await expect(table).toHaveCount(1);
  await expect(table.locator('caption')).not.toBeEmpty();await expect(table.getByRole('columnheader')).toHaveCount(4);await expect(table.getByRole('rowheader')).toHaveCount(4);
  const headers=await table.getByRole('columnheader').allTextContents();
  for(const row of await table.locator('tbody tr').all()){
   await expect(row.locator('th')).toHaveAttribute('scope','row');
   const cells=row.getByRole('cell');await expect(cells).toHaveCount(3);
   for(let i=0;i<3;i++){
    await expect(cells.nth(i)).toHaveAttribute('data-label',headers[i+1]);
    if(testInfo.project.name==='phone')expect(await cells.nth(i).evaluate(cell=>getComputedStyle(cell,'::before').content)).toBe('"'+headers[i+1]+'"');
   }
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.locator('.location-source-note summary').click();await expect(page.locator('.location-source-note')).toContainText('Reviewed October 23, 2026.');
  await page.addScriptTag({url:'/__location-axe.js'});
  const violations=await page.evaluate(async()=>{const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return result.violations.map(({id,nodes})=>({id,targets:nodes.map(node=>node.target)}));});
  expect(violations,path).toEqual([]);
  await table.screenshot({path:testInfo.outputPath(path.split('/').slice(-3,-1).join('-')+'-table.png')});
  await page.getByRole('link',{name:'Discuss your website',exact:true}).first().click();
  await expect(page).toHaveURL(url=>url.pathname==='/contact/'&&url.hash==='#inquiry'&&url.searchParams.get('offer')==='unsure'&&url.searchParams.get('goal')==='new_website'&&url.searchParams.get('request_kind')==='question'&&url.searchParams.get('qa')==='1'&&url.searchParams.size===4);
 }
 if(testInfo.project.name==='phone'){
  await page.setViewportSize({width:320,height:800});
  for(const path of batch){await page.goto(path+'?qa=1');expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);}
 }
});

}
