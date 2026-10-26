import {test,expect} from './fixtures.mjs';
const paths=['/','/areas/nevada/','/areas/nevada/churchill-county/','/contact/','/guides/ai-search-visibility/','/services/web-design/'];
test('optional analytics heading stays compact after shared site styles load',async({page})=>{
 test.setTimeout(90_000);
 for(const {width,height} of [{width:1440,height:900},{width:320,height:640}]){
  await page.setViewportSize({width,height});
  for(const path of paths){
   // QA keeps measurement off; show the existing panel only to inspect layout.
   // Never allow analytics or submit an inquiry. fixtures.mjs blocks off-origin traffic.
   await page.goto(path+'?qa=1');await page.evaluate(()=>document.fonts.ready);
   const panel=page.locator('[data-analytics-choice]');await expect(panel).toHaveCount(1);
   await panel.evaluate(element=>{element.hidden=false;});
   const metrics=await panel.evaluate(element=>{
    const heading=element.querySelector('#analytics-choice-title'),rect=element.getBoundingClientRect();
    return {headingPx:parseFloat(getComputedStyle(heading).fontSize),rootPx:parseFloat(getComputedStyle(document.documentElement).fontSize),left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,scrollWidth:element.scrollWidth,clientWidth:element.clientWidth,buttons:[...element.querySelectorAll('button:not([hidden])')].map(button=>{const r=button.getBoundingClientRect();return {left:r.left,right:r.right,height:r.height};})};
   });
   const label=path+' at '+width;
   expect(metrics.headingPx,label+' heading size').toBeCloseTo(metrics.rootPx*1.15,1);
   expect(metrics.left,label).toBeGreaterThanOrEqual(0);expect(metrics.right,label).toBeLessThanOrEqual(width+1);
   expect(metrics.top,label).toBeGreaterThanOrEqual(0);expect(metrics.bottom,label).toBeLessThanOrEqual(height+1);
   expect(metrics.scrollWidth-metrics.clientWidth,label+' horizontal overflow').toBeLessThanOrEqual(1);
   for(const button of metrics.buttons){expect(button.height,label+' tap target').toBeGreaterThanOrEqual(44);expect(button.left,label).toBeGreaterThanOrEqual(metrics.left);expect(button.right,label).toBeLessThanOrEqual(metrics.right+1);}
  }
 }
});
