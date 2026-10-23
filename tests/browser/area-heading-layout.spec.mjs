import {test,expect} from './fixtures.mjs';
import {serviceStates} from '../../src/service-area-directory.mjs';

const paths=[...new Set(['/areas/pennsylvania/',...serviceStates.map(state=>state.path),'/areas/','/areas/erie-county/','/areas/albany-county/','/areas/florida/baker-county/','/areas/maryland/baltimore-area/'])];

test('area section labels remain above their headings at phone, tablet and desktop widths',async({page},testInfo)=>{
 test.skip(testInfo.project.name==='phone-reduced-motion','Same static heading layout; motion has separate coverage.');
 test.setTimeout(240_000);
 const widths=testInfo.project.name==='phone'?[390,320]:[834,1280,1600];
 for(const width of widths){
  await page.setViewportSize({width,height:1000});
  for(const path of paths){
   await page.goto(path+'?qa=1');await page.evaluate(()=>document.fonts.ready);
   const headings=page.locator('.county-section > .section-heading, .studio-section:has(> .eyebrow):has(> h2)');expect(await headings.count(),path).toBeGreaterThan(0);
   if(path==='/areas/pennsylvania/')await page.locator('#state-planning').screenshot({path:testInfo.outputPath('pennsylvania-planning-'+width+'.png')});
   if(path==='/areas/albany-county/')await page.locator('#buyer-task > .section-heading').screenshot({path:testInfo.outputPath('albany-heading-'+width+'.png')});
   const boxes=await headings.evaluateAll(elements=>elements.map(element=>{
    const label=element.querySelector('.eyebrow'),heading=element.querySelector('h2');
    const parent=element.getBoundingClientRect(),l=label.getBoundingClientRect(),h=heading.getBoundingClientRect();
    return {id:element.parentElement.id,labelBottom:l.bottom,headingTop:h.top,labelLeft:l.left,headingLeft:h.left,headingRight:h.right,parentRight:parent.right};
   }));
   for(const box of boxes){
    expect(box.headingTop-box.labelBottom,path+'#'+box.id+' at '+width).toBeGreaterThanOrEqual(8);
    expect(Math.abs(box.headingLeft-box.labelLeft),path+' aligned heading').toBeLessThanOrEqual(1);
    expect(box.headingRight-box.parentRight,path+' heading width').toBeLessThanOrEqual(1);
   }
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),path+' at '+width).toBeLessThanOrEqual(1);
  }
 }
});
