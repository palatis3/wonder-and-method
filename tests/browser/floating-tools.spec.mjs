import {test,expect} from './fixtures.mjs';

for(const [width,height] of [[320,640],[390,844],[768,900],[1024,900],[1279,900],[1280,900],[1440,1000],[844,390]]){
 test(`corner controls float without a shared bottom bar at ${width}x${height}`,async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop','One complete viewport matrix; touch and reduced-motion interaction journeys run separately');
  test.setTimeout(90_000);
  await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});
  for(const path of ['/','/services/','/contact/','/areas/texas/milam-county/']){
   await page.goto(path+'?qa=1');await page.evaluate(()=>document.fonts.ready);
   const max=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
   for(const y of [Math.min(600,max),0,max]){
    await page.evaluate(async y=>{scrollTo({top:y,behavior:'instant'});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));},y);
    await expect(page.locator('.support-chat-launch')).toBeVisible();
    if(y>=520)await expect(page.locator('.back-to-top')).toBeVisible();
    const geometry=await page.evaluate(()=>{
     const shared=document.querySelector('.site-tools'),style=getComputedStyle(shared);
     const controls=[...document.querySelectorAll('.back-to-top,.support-chat-launch')].filter(el=>el.checkVisibility({checkVisibilityCSS:true})).map(el=>{
      const r=el.getBoundingClientRect(),s=getComputedStyle(el),fixed=el.matches('.support-chat-launch')?el.closest('.support-chat'):el;
      return {name:el.className,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom,position:getComputedStyle(fixed).position,shadow:s.boxShadow,radius:parseFloat(s.borderRadius),hit:el.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))};
     });
     return {pseudo:['::before','::after'].map(p=>getComputedStyle(shared,p).content),background:style.backgroundColor,image:style.backgroundImage,shadow:style.boxShadow,border:parseFloat(style.borderTopWidth),centerCovered:!!document.elementFromPoint(innerWidth/2,innerHeight-8)?.closest('.site-tools'),controls,overflow:document.documentElement.scrollWidth-innerWidth};
    });
    expect(geometry.pseudo,`${path} at ${y}: no shared painted strip`).toEqual(['none','none']);
    expect(geometry.background).toBe('rgba(0, 0, 0, 0)');expect(geometry.image).toBe('none');expect(geometry.shadow).toBe('none');expect(geometry.border).toBe(0);
    expect(geometry.centerCovered,`${path} at ${y}: the space between the floating buttons stays on the page`).toBe(false);
    expect(geometry.overflow).toBeLessThanOrEqual(1);
    for(const control of geometry.controls){
     expect(control.position).toBe('fixed');expect(control.width).toBeGreaterThanOrEqual(44);expect(control.width).toBeLessThanOrEqual(56);
     expect(control.height).toBeGreaterThanOrEqual(44);expect(control.height).toBeLessThanOrEqual(56);expect(control.radius).toBeGreaterThanOrEqual(control.width/2);
     expect(control.shadow).not.toBe('none');expect(control.hit,`${path} ${control.name} is reachable`).toBe(true);
     expect(control.left).toBeGreaterThanOrEqual(0);expect(control.right).toBeLessThanOrEqual(width);expect(control.top).toBeGreaterThanOrEqual(0);expect(control.bottom).toBeLessThanOrEqual(height);
    }
    if([320,390,1440].includes(width)&&['/','/areas/texas/milam-county/'].includes(path)&&y===Math.min(600,max))await page.screenshot({path:testInfo.outputPath(path==='/'?'home-floating.png':'texas-floating.png')});
   }
  }
 });
}
