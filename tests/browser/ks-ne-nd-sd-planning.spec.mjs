import {assertLocationBrief,assertLocationSources} from './location-brief-checks.mjs';
import {readFile} from 'node:fs/promises';
import {test,expect} from './fixtures.mjs';
import ksNe from '../fixtures/ks-ne-approved-paths.json' with {type:'json'};
import ndSd from '../fixtures/nd-sd-approved-paths.json' with {type:'json'};
import services from '../../src/location-service-data.json' with {type:'json'};
const paths=[...ksNe.slice(2),...ndSd.slice(2)];
const sourceByPath=new Map(services.filter(entry=>paths.includes(entry.path)).map(entry=>[entry.path,entry]));
const axe=await readFile(new URL('../../node_modules/axe-core/axe.min.js',import.meta.url),'utf8');

for(let offset=0;offset<paths.length;offset+=6){
 const batch=paths.slice(offset,offset+6);
 test(`Kansas/Nebraska/Dakota county batch ${offset/6+1} preserves complete briefs, visible decisions, source notes and inquiry context`,async({page},testInfo)=>{
  test.setTimeout(180_000);
  await page.route('**/__ks-ne-nd-sd-axe.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:axe}));
  for(const path of batch){
   const source=sourceByPath.get(path);expect(source,path).toBeDefined();
   const response=await page.goto(path+'?qa=1');expect(response.status()).toBe(200);
   await page.evaluate(()=>document.fonts.ready);
   await expect(page.getByRole('heading',{level:1})).toContainText('Web design for');
   for(const id of ['buyer-task','approach','search'])await expect(page.locator('#'+id)).toBeVisible();
   await assertLocationBrief(page,path);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
   await assertLocationSources(page,path);
   await page.addScriptTag({url:'/__ks-ne-nd-sd-axe.js'});
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
    await assertLocationBrief(page,path);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
   }
  }
 });
}
