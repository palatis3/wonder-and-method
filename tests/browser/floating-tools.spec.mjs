import {test,expect} from './fixtures.mjs';
for(const [width,height] of [[320,640],[390,844],[768,900],[1024,900],[1279,900],[1280,900],[1440,1000],[844,390]]){
 test('page help leaves reading space clear at '+width+'x'+height,async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop','One complete viewport matrix');test.setTimeout(90_000);
  await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});
  for(const path of ['/','/services/','/contact/','/areas/texas/milam-county/']){
   await page.goto(path+'?qa=1');await page.evaluate(()=>document.fonts.ready);
   const form=path==='/contact/',phone=width<=767,max=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
   await expect(page.locator('.support-chat-launch')).toHaveCount(form?0:1);
   for(const y of [Math.min(600,max),0,max]){
    await page.evaluate(async y=>{scrollTo({top:y,behavior:'instant'});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));},y);
    const geometry=await page.evaluate(()=>{
     const shared=document.querySelector('.site-tools'),style=getComputedStyle(shared),main=document.querySelector('main').getBoundingClientRect();
     const controls=[...document.querySelectorAll('.back-to-top,.support-chat-launch')].filter(el=>el.checkVisibility({checkVisibilityCSS:true})).map(el=>{
      const r=el.getBoundingClientRect(),s=getComputedStyle(el),container=el.matches('.support-chat-launch')?el.closest('.support-chat'):el;
      return {name:el.className,width:r.width,height:r.height,left:r.left,right:r.right,position:getComputedStyle(container).position,shadow:s.boxShadow,radius:parseFloat(s.borderRadius),inViewport:r.top>=0&&r.bottom<=innerHeight,hit:el.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)),afterMain:r.top>=main.bottom-1};
     });
     return {pseudo:['::before','::after'].map(p=>getComputedStyle(shared,p).content),background:style.backgroundColor,image:style.backgroundImage,shadow:style.boxShadow,controls,overflow:document.documentElement.scrollWidth-innerWidth};
    });
    expect(geometry.pseudo).toEqual(['none','none']);expect(geometry.background).toBe('rgba(0, 0, 0, 0)');expect(geometry.image).toBe('none');expect(geometry.shadow).toBe('none');expect(geometry.overflow).toBeLessThanOrEqual(1);
    for(const control of geometry.controls){
     expect(control.position).toBe(phone?'static':'fixed');expect(control.width).toBeGreaterThanOrEqual(44);expect(control.height).toBeGreaterThanOrEqual(44);expect(control.left).toBeGreaterThanOrEqual(0);expect(control.right).toBeLessThanOrEqual(width);
     if(phone)expect(control.afterMain).toBe(true);
     else {expect(control.width).toBeLessThanOrEqual(56);expect(control.height).toBeLessThanOrEqual(56);expect(control.radius).toBeGreaterThanOrEqual(control.width/2);expect(control.shadow).not.toBe('none');expect(control.inViewport).toBe(true);}
     if(control.inViewport)expect(control.hit,path+' '+control.name+' is reachable').toBe(true);
    }
   }
   const help=page.locator(form?'[data-chat-open]':'.support-chat-launch');await help.scrollIntoViewIfNeeded();await expect(help).toBeInViewport();
   if([320,390,1440].includes(width)&&['/','/areas/texas/milam-county/'].includes(path))await page.screenshot({path:testInfo.outputPath(path==='/'?'home-help.png':'texas-help.png')});
  }
 });
}
