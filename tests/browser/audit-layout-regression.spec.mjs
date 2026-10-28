import {test,expect} from './fixtures.mjs';

test('Services separates three needs and keeps every choice readable at enlarged text',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','One complete responsive matrix');
 await page.route('**/__services-large-text.css',route=>route.fulfill({contentType:'text/css',body:':root{font-size:200%}'}));
 for(const width of [320,390,768,1440])for(const enlarged of [false,true]){
  await page.setViewportSize({width,height:1000});await page.goto('/services/?qa=1');await page.evaluate(()=>document.fonts.ready);
  if(enlarged)await page.addStyleTag({url:'/__services-large-text.css'});
  const overview=page.locator('.services-overview');await expect(overview.locator('h1')).toHaveText('Website design, SEO and care.');
  await expect(overview.locator('.services-overview-group')).toHaveCount(3);
  const cards=overview.locator('.services-overview-card');await expect(cards).toHaveCount(7);
  for(const card of await cards.all()){await expect(card).toBeVisible();expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);}
  expect(await cards.evaluateAll(elements=>elements.map(el=>el.getAttribute('href')))).toEqual(['/services/web-design/','/services/website-redesign/','/services/contractor-websites/','/services/website-audit/','/services/website-addons/','/services/website-care/','/services/seo/']);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth),`${width}px enlarged=${enlarged}`).toBeLessThanOrEqual(width+1);
  await overview.getByRole('link',{name:'Ongoing help',exact:false}).click();
  await expect(page).toHaveURL(/#services-ongoing$/);
  await expect(overview.getByRole('heading',{name:'Choose ongoing website help.'})).toBeInViewport();
 }
});

// Stable floating tools yield to overlapping keyboard focus, not passing prose.
function coveredContent(){
 const floats=[...document.querySelectorAll('.back-to-top,.support-chat-launch')].filter(node=>node.checkVisibility({checkVisibilityCSS:true,checkOpacity:true})).map(node=>({name:node.className,r:node.getBoundingClientRect()}));
 const hits=[],overlaps=(a,b)=>Math.min(a.right,b.right)>Math.max(a.left,b.left)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1;
 for(const node of document.querySelectorAll('main p,main li,main h1,main h2,main h3,main a,main label,main input,main textarea,main button,main summary,main video,footer a')){
  if(!node.checkVisibility({checkVisibilityCSS:true}))continue;
  const box=node.getBoundingClientRect();if(box.bottom<0||box.top>innerHeight)continue;
  if(node===document.activeElement)for(const control of floats)if(overlaps(box,control.r))hits.push(control.name+' / focused '+node.tagName);

 }
 return {hits,visible:floats.filter(({r})=>r.bottom>0&&r.top<innerHeight).length,outside:floats.filter(({r})=>r.left<0||r.right>innerWidth+1).map(({name})=>name)};
}

for(const [width,height] of [[320,640],[390,844],[844,390],[683,328],[1440,900]])test(`floating page tools remain reachable and leave focused controls clear at ${width}x${height}`,async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','One viewport matrix covers the responsive sweep');
 await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});
 await page.clock.install();
 for(const path of ['/pricing/','/areas/erie-county/','/work/studio-search/']){
  await page.goto(path+'?qa=1');await page.evaluate(()=>document.fonts.ready);
  const max=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight),stops=[];
  for(let y=0;y<max;y+=Math.round(height*.5))stops.push(y);stops.push(max);
  let visible=0;
  for(const y of stops){
   await page.evaluate(async y=>{scrollTo({top:y,behavior:'instant'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));},y);
   await page.clock.fastForward(3001);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   {
    await expect(page.locator('.support-chat-launch'),`${path} at ${y}`).toBeVisible();
    if(y>=520)await expect(page.locator('.back-to-top'),`${path} at ${y}`).toBeVisible();
   }
   await expect(page.locator('.support-chat')).toHaveCSS('position','fixed');
   await expect.poll(async()=>(await page.evaluate(coveredContent)).hits,`${path} at ${y}`).toEqual([]);
   const result=await page.evaluate(coveredContent);expect(result.outside).toEqual([]);visible+=result.visible;
   const focused=await page.evaluate(()=>{
    const floats=[...document.querySelectorAll('.back-to-top,.support-chat-launch')].filter(n=>n.checkVisibility({checkVisibilityCSS:true})).map(n=>n.getBoundingClientRect());
    const target=[...document.querySelectorAll('main a[href],main button,main summary,footer a[href]')].find(n=>{if(!n.checkVisibility({checkVisibilityCSS:true}))return false;const r=n.getBoundingClientRect();return floats.some(f=>Math.min(r.right,f.right)>Math.max(r.left,f.left)+1&&Math.min(r.bottom,f.bottom)>Math.max(r.top,f.top)+1);});
    if(!target)return false;target.focus({preventScroll:true});return true;
   });
   if(focused){await expect.poll(async()=>(await page.evaluate(coveredContent)).hits).toEqual([]);await page.evaluate(()=>document.activeElement.blur());}
  }
  await page.locator('#site-help').scrollIntoViewIfNeeded();
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  await expect(page.locator('.back-to-top')).toBeInViewport();await expect(page.locator('.support-chat-launch')).toBeInViewport();
  const help=await page.locator('#site-help').evaluate(el=>({top:el.getBoundingClientRect().top,mainBottom:document.querySelector('main').getBoundingClientRect().bottom}));expect(help.top).toBeGreaterThanOrEqual(help.mainBottom);
 }
});

test('home hero controls remain clear and short screens fit the project action',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','One viewport matrix');await page.emulateMedia({reducedMotion:'reduce'});
 for(const [width,height] of [[1280,720],[1366,768],[1440,900],[844,390],[683,328]]){
  await page.setViewportSize({width,height});await page.goto('/?qa=1');await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('.support-chat-launch')).toBeVisible();
  const primary=await page.locator('.city-primary').boundingBox();expect(primary.y+primary.height,`${width} project action fits the viewport`).toBeLessThanOrEqual(await page.evaluate(()=>innerHeight));
  const controls=await page.locator('.city-primary,.city-explore,.city-choice').evaluateAll(nodes=>nodes.filter(node=>{const r=node.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}).map(node=>{const r=node.getBoundingClientRect();return {name:node.textContent.trim(),clear:node.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))};}));
  expect(controls.filter(item=>!item.clear)).toEqual([]);
  if(height<=520)await page.screenshot({path:testInfo.outputPath(`short-landscape-${width}.png`)});
  if(height<=520){await page.evaluate(()=>scrollTo({top:600,behavior:'instant'}));await expect.poll(()=>page.locator('.site-header').evaluate(node=>Math.abs(node.getBoundingClientRect().top)<=1)).toBe(true);}
 }
});

test('short touch screens let the header scroll away while the project action fits',async({page,isMobile},testInfo)=>{
 test.skip(!isMobile,'Touch landscape exception');await page.emulateMedia({reducedMotion:'reduce'});
 for(const [width,height] of [[844,390],[683,328]]){
  await page.setViewportSize({width,height});await page.goto('/?qa=1');await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>matchMedia('(hover:none) and (pointer:coarse)').matches)).toBe(true);
  const primary=await page.locator('.city-primary').boundingBox();expect(primary.y+primary.height).toBeLessThanOrEqual(await page.evaluate(()=>innerHeight));
  await page.screenshot({path:testInfo.outputPath(`short-landscape-${width}.png`)});
  await page.evaluate(()=>scrollTo({top:600,behavior:'instant'}));await expect.poll(()=>page.locator('.site-header').evaluate(node=>node.getBoundingClientRect().bottom)).toBeLessThanOrEqual(0);
 }
});

test('navigation order, mobile Services alignment and footer disclosures agree',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','One viewport matrix');
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:900});
  for(const path of ['/','/pricing/']){
   await page.goto(path+'?qa=1');
   const order=await page.locator('#main-nav').evaluate(nav=>[...nav.children].map(node=>node.matches('details')?node.querySelector('summary').textContent.trim():node.textContent.trim()));
   expect(order).toEqual(['Work','Services','Pricing','Process','Guides','About','Contact']);
   if(width<1024){
    await page.locator('.menu-toggle').click();
    const metrics=await page.locator('#main-nav').evaluate(nav=>{const a=nav.querySelector('a'),s=nav.querySelector('summary');return {a:a.getBoundingClientRect().left+parseFloat(getComputedStyle(a).paddingLeft),s:s.getBoundingClientRect().left+parseFloat(getComputedStyle(s).paddingLeft),font:parseFloat(getComputedStyle(s).fontSize),height:s.getBoundingClientRect().height};});
    expect(Math.abs(metrics.a-metrics.s)).toBeLessThanOrEqual(1);expect(metrics.font).toBeGreaterThanOrEqual(15);expect(metrics.height).toBeGreaterThanOrEqual(44);
    await page.keyboard.press('Escape');
   }
   await expect(page.locator('footer details.footer-group')).toHaveCount(4);await expect(page.locator('footer .footer-group > summary')).toHaveCount(4);await expect(page.locator('footer a[href="#page-top"]')).toHaveCount(0);
   await page.locator('footer').scrollIntoViewIfNeeded();await expect(page.locator('a.back-to-top[href="#page-top"]')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
 }
});

test('form pages retain one floating chat launcher without duplicate inline actions',async({page})=>{
 for(const path of ['/contact/','/checkout/focused-site/']){
  await page.goto(path+'?qa=1');await expect(page.locator('.support-chat-launch')).toHaveCount(1);await expect(page.locator('.support-chat')).toHaveCSS('position','fixed');
  await expect(page.locator('[data-chat-open]')).toHaveCount(0);
  const email=page.locator('#inquiry input[name="email"]');await email.focus();
  await expect(page.locator('.support-chat-launch')).toBeHidden();
  await email.blur();await page.locator('footer').scrollIntoViewIfNeeded();
  await expect(page.locator('.support-chat-launch')).toBeVisible();await expect(page.locator('.support-chat-launch')).toHaveAttribute('aria-describedby','support-chat-description');
  expect(await page.locator('script[src^="https://embed.tawk.to/"]').count()).toBe(0);
 }
});

test('shared header retains readable brand, Contact and navigation with enlarged text',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','One independent viewport and text-size matrix');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.route('**/__test-header-text.css',route=>route.fulfill({status:200,contentType:'text/css',body:':root{font-size:200%}'}));
 for(const doubled of [false,true])for(const [width,height] of [[320,640],[390,844],[768,900],[1024,900],[1440,900]]){
  await page.setViewportSize({width,height});await page.goto('/privacy/?qa=1');await page.evaluate(()=>document.fonts.ready);
  if(doubled)await page.addStyleTag({url:'/__test-header-text.css'});
  const geometry=await page.evaluate(()=>{
   const nodes=[...document.querySelectorAll('.site-header .brand-lockup,.site-header .header-contact,.site-header .menu-toggle,.site-header #main-nav>a,.site-header .service-navigation>summary')].filter(n=>n.checkVisibility({checkVisibilityCSS:true}));
   const boxes=nodes.map(node=>{
    const range=document.createRange();range.selectNodeContents(node);
    return {name:node.textContent.trim(),r:node.getBoundingClientRect(),text:[...range.getClientRects()]};
   });
   const intersects=(a,b)=>Math.min(a.right,b.right)>Math.max(a.left,b.left)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1;
   return {overlaps:boxes.flatMap((a,i)=>boxes.slice(i+1).filter(b=>intersects(a.r,b.r)||a.text.some(r=>intersects(r,b.r))||b.text.some(r=>intersects(r,a.r))).map(b=>a.name+' / '+b.name)),clipped:boxes.filter(({r,text})=>[r,...text].some(box=>box.left<0||box.right>document.documentElement.clientWidth+1)).map(({name})=>name),brandWidth:boxes.find(b=>b.name.includes('Wonder')).r.width};
  });
  const label=width+' at '+(doubled?200:100)+'%';
  expect(geometry.overlaps,label).toEqual([]);expect(geometry.clipped,label).toEqual([]);expect(geometry.brandWidth,label).toBeGreaterThan(80);
  if(doubled&&[320,1440].includes(width))await testInfo.attach('shared-header-'+width+'-double-text',{body:await page.screenshot(),contentType:'image/png'});
  if(width<1024){
   await expect(page.locator('.header-contact')).toBeVisible();await expect(page.locator('.header-contact')).toHaveAttribute('href','/contact/#inquiry');
   await page.locator('.menu-toggle').click();await expect(page.locator('#main-nav')).toBeVisible();
   await page.locator('#main-nav>a').last().focus();await expect(page.locator('#main-nav>a').last()).toBeInViewport();
   await page.keyboard.press('Escape');await expect(page.locator('.menu-toggle')).toBeFocused();await expect(page.locator('.header-contact')).toBeVisible();
  }else{
   const services=page.locator('.service-navigation>summary');
   expect(await services.evaluate(node=>{const range=document.createRange();range.selectNodeContents(node);return [...range.getClientRects()].filter(r=>r.width>0).length;}),label+' whole Services label').toBeLessThanOrEqual(2);
  }
 }
});

test('mobile home Contact remains readable across hero, scrolled and menu states',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','One responsive state check');
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?qa=1');
 const contact=page.locator('.header-contact'),header=page.locator('.site-header');
 await expect(contact).toHaveCSS('color','rgb(248, 246, 239)');
 await page.evaluate(()=>scrollTo({top:700,behavior:'instant'}));await expect(header).toHaveClass(/is-scrolled/);
 const contrast=()=>contact.evaluate(node=>{
  const rgba=value=>value.match(/[\d.]+/g).map(Number),over=(a,b)=>a.slice(0,3).map((v,i)=>v*(a[3]??1)+b[i]*(1-(a[3]??1)));
  const style=getComputedStyle(node),headerStyle=getComputedStyle(node.closest('header'));
  const background=over(rgba(style.backgroundColor),over(rgba(headerStyle.backgroundColor),[0,0,0]));
  const lum=rgb=>rgb.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  const a=lum(rgba(style.color)),b=lum(background);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 });
 await expect.poll(contrast).toBeGreaterThanOrEqual(4.5);await expect(contact).toHaveCSS('color','rgb(9, 45, 59)');
 await page.locator('.menu-toggle').click();await expect(contact).toBeHidden();await expect(page.locator('#main-nav')).toBeVisible();
 await page.keyboard.press('Escape');await expect(contact).toBeVisible();await expect.poll(contrast).toBeGreaterThanOrEqual(4.5);
 await testInfo.attach('home-contact-scrolled',{body:await page.screenshot(),contentType:'image/png'});
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await expect(header).not.toHaveClass(/is-scrolled/);await expect(contact).toHaveCSS('color','rgb(248, 246, 239)');
});
