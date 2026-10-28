import {test,expect} from './fixtures.mjs';
import {serviceStateInfo} from '../../src/assets/service-state-info.js';

test('state choices stay alphabetical in the footer, finder and browse lists',async({page})=>{
 await page.goto('/areas/?qa=1');
 const expected=serviceStateInfo.map(state=>state.name).sort((a,b)=>a.localeCompare(b,'en'));
 expect(await page.locator('#county-state option:not([value=""])').allTextContents()).toEqual(expected);
 expect(await page.locator('[data-state-directory-links] a>span').allTextContents()).toEqual(expected);
 expect((await page.locator('#counties>.county-region>summary').allTextContents()).map(name=>name.replace(/ \(\d+ [^)]+\)$/,''))).toEqual(expected);
 expect((await page.locator('#footer-areas-heading+div a').allTextContents()).slice(1)).toEqual(expected);
});

test('page help floats in separate corners at every width and yields to form editing',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop','One complete viewport matrix');test.setTimeout(60_000);
 const toolSurfaces=()=>page.locator('#site-help').evaluate(el=>['::before','::after'].map(pseudo=>getComputedStyle(el,pseudo).content));
 for(const width of [320,390,768,1024,1440]){
  await page.setViewportSize({width,height:900});
  for(const path of ['/about/','/services/','/contact/']){
   await page.goto(path+'?qa=1');await page.evaluate(()=>document.fonts.ready);
   const chat=page.locator('.support-chat-launch');
   // On a form, check the fixed launcher in the footer's clear space.
   // The separate inquiry-obstruction test protects fields before focus.
   if(path==='/contact/')await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
   await inViewport(chat);expect((await chat.boundingBox()).width).toBe(48);
   await expect(page.locator('.support-chat')).toHaveCSS('position','fixed');
   expect(await toolSurfaces()).toEqual(['none','none']);
   if(width>=1280&&path!=='/contact/'){
    const covered=await page.evaluate(()=>{
     const button=document.querySelector('.support-chat-launch').getBoundingClientRect(),hits=[];
     const walker=document.createTreeWalker(document.querySelector('main'),NodeFilter.SHOW_TEXT);
     while(walker.nextNode()){
      const node=walker.currentNode;if(!node.textContent.trim()||!node.parentElement.checkVisibility())continue;
      const range=document.createRange();range.selectNodeContents(node);
      if([...range.getClientRects()].some(r=>Math.min(r.right,button.right)>Math.max(r.left,button.left)&&Math.min(r.bottom,button.bottom)>Math.max(r.top,button.top)))hits.push(node.textContent.trim());
     }
     return hits;
    });expect(covered).toEqual([]);
   }
   if(width===390||width===1440)await page.screenshot({path:testInfo.outputPath(`${width}-${path.split('/')[1]}-reading.png`)});
  }
  await page.locator('#email').focus();await expect(page.locator('.support-chat-launch')).toBeHidden();
  expect(await toolSurfaces()).toEqual(['none','none']);
  if(width===390)await page.screenshot({path:testInfo.outputPath('390-contact-focused.png')});
  await page.locator('#email').evaluate(el=>el.blur());
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  await expect(page.locator('.support-chat-launch')).toBeVisible();
  if(width<1024){
   await page.goto('/about/?qa=1');await page.locator('.menu-toggle').click();
   await expect(page.locator('.support-chat-launch')).toBeHidden();expect(await toolSurfaces()).toEqual(['none','none']);
   await page.keyboard.press('Escape');await expect(page.locator('.support-chat-launch')).toBeVisible();expect(await toolSurfaces()).toEqual(['none','none']);
  }
 }
});

const inViewport=async(locator)=>{
 await expect(locator).toBeVisible();
 const fits=await locator.evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.left>=0&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1;});
 expect(fits).toBe(true);
};

// Both controls float at every supported viewport.
const revealTools=async page=>{
 await page.evaluate(()=>scrollTo({top:900,behavior:'instant'}));
 await inViewport(page.locator('.support-chat-launch'));
};

test('shared header contact and the single floating top link remain reachable across page types',async({page,isMobile})=>{
 if(isMobile)await page.setViewportSize({width:320,height:844});
 for(const path of ['/','/pricing/','/contact/','/work/fieldwork/','/services/seo/','/areas/']){
  await page.goto(path+'?qa=1');await page.evaluate(()=>document.fonts.ready);
  if(path==='/work/fieldwork/'||path==='/services/seo/'){
   await expect(page.locator('.breadcrumb-parent')).toBeVisible({visible:isMobile});
   await expect(page.locator('.breadcrumb > ol')).toBeVisible({visible:!isMobile});
  }else{
   await expect(page.locator('.breadcrumb')).toHaveCount(0);
  }
  const concept=path==='/work/fieldwork/';
  const contact=page.locator(concept?'.concept-toolbar a[href="/contact/#inquiry"]':isMobile?(path==='/contact/'?'.menu-toggle':'.header-contact'):'#main-nav > a[href="/contact/#inquiry"]');
  if(isMobile&&path==='/contact/')await expect(page.locator('.header-contact')).toHaveCount(0);
  await inViewport(contact);await expect(page.locator('.back-to-top')).not.toBeInViewport();
  if(path==='/contact/'){
   const email=page.locator('#inquiry input[name="email"]');await email.focus();
   await expect(page.locator('.support-chat-launch')).toBeHidden();
   await email.blur();await page.locator('footer').scrollIntoViewIfNeeded();
   await expect(page.locator('.support-chat-launch')).toBeVisible();
   await expect(page.locator('[data-chat-open]')).toHaveCount(0);await inViewport(page.locator('.support-chat-launch'));
  }else if(concept){
   await expect(page.locator('#main-nav')).toHaveCount(0);await expect(page.locator('.support-chat-launch')).toBeVisible();
   await expect(page.locator('.concept-toolbar a[href="/work/"]')).toBeVisible();
  }else await revealTools(page);
  await page.evaluate(()=>scrollTo({top:900,behavior:'instant'}));
  // A dense mobile inquiry view may have no clear tool slot. Its footer must
  // restore both controls so the navigation action remains available.
  if(isMobile)await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  await inViewport(page.locator('.back-to-top'));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),path).toBe(true);
  await expect(page.locator('footer a[href="#page-top"]')).toHaveCount(0);
  const top=page.locator('.back-to-top');await inViewport(top);await top.click();await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
 }
});

test('page tools yield to the phone menu and recover after it closes',async({page,isMobile})=>{
 test.skip(!isMobile,'Phone navigation');await page.goto('/?qa=1');await revealTools(page);
 const menu=page.locator('.menu-toggle');await menu.scrollIntoViewIfNeeded();await menu.click();
 await expect(page.locator('.support-chat-launch')).toBeHidden();await expect(page.locator('.back-to-top')).toBeHidden();
 await page.keyboard.press('Escape');await expect(menu).toBeFocused();await revealTools(page);
});

test('keyboard wrapping and reopening reveal links inside a short mobile menu',async({page,isMobile})=>{
 test.skip(!isMobile,'Phone navigation');await page.setViewportSize({width:390,height:500});await page.goto('/?qa=1');
 await page.evaluate(()=>window.scrollTo({top:1000,behavior:'instant'}));
 const open=async()=>{await page.locator('.menu-toggle').scrollIntoViewIfNeeded();await page.locator('.menu-toggle').click();};
 const visibleInsideNav=async link=>{await expect(link).toBeFocused();expect(await link.evaluate(el=>{const r=el.getBoundingClientRect(),nav=el.closest('#main-nav').getBoundingClientRect();return r.top>=nav.top&&r.bottom<=nav.bottom+1&&r.bottom<=innerHeight+1;})).toBe(true);};
 await open();await page.locator('.menu-toggle').evaluate(el=>el.focus({preventScroll:true}));await page.keyboard.press('Shift+Tab');await visibleInsideNav(page.locator('#main-nav > a[href="/contact/#inquiry"]'));
 await page.keyboard.press('Escape');await open();await visibleInsideNav(page.locator('#main-nav > a[href="/work/"]'));await page.keyboard.press('Escape');await expect(page.locator('.menu-toggle')).toBeFocused();
});

async function allowMockChat(page,path='/'){
 // Only the local HTML response is adjusted. The provider script is fulfilled
 // below; the fixture still blocks every unmocked third-party request.
 await page.route('http://127.0.0.1:4187'+path+'?qa=1',async route=>{
  const response=await route.fetch();const headers={...response.headers()};delete headers['content-security-policy'];
  await route.fulfill({response,headers});
 });
}

test('chat loads only on click and hands focus to the mocked provider',async({page})=>{
 await allowMockChat(page);let requests=0;
 await page.route('https://embed.tawk.to/**',async route=>{
  requests++;
  await route.fulfill({contentType:'application/javascript',body:`Tawk_API.maximize=()=>{const frame=document.createElement('iframe');frame.title='Chat widget';frame.style.cssText='position:fixed;right:0;bottom:0;width:280px;height:350px;z-index:1000;background:white';document.body.append(frame);};Tawk_API.hideWidget=()=>{};Tawk_API.onBeforeLoad();Tawk_API.onLoad();`});
 });
 await page.goto('/?qa=1');await revealTools(page);expect(requests).toBe(0);
 await expect(page.locator('.support-chat-launch')).toHaveAccessibleName('Chat with Terry (opens chat, uses cookies)');
 await expect(page.locator('.support-chat-launch')).toHaveAttribute('aria-describedby','support-chat-description');
 await page.locator('.support-chat-launch').click();
 await expect(page.locator('iframe[title="Chat widget"]')).toBeFocused();expect(requests).toBe(1);
 await expect(page.locator('.support-chat')).toBeHidden();
});

test('blocked chat exposes a usable contact fallback and restores visible focus on dismissal',async({page})=>{
 await allowMockChat(page);await allowMockChat(page,'/work/hearthside/');
 await page.route('https://embed.tawk.to/**',route=>route.abort('blockedbyclient'));
 for(const path of ['/','/work/hearthside/'])for(const scroll of [0,900]){
  await page.goto(path+'?qa=1');expect(await page.locator('script[src^="https://embed.tawk.to/"]').count()).toBe(0);await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),scroll);
   await inViewport(page.locator('.support-chat-launch'));await page.locator('.support-chat-launch').click();
  const contact=page.locator('.support-chat-fallback a');await inViewport(contact);await expect(contact).toBeFocused();
  await expect(contact).toHaveAttribute('href','/contact/');
  await page.locator('.support-chat-dismiss').click();await expect(page.locator('.support-chat')).toBeHidden();
  const target=page.locator(scroll ? '.back-to-top' : path==='/'?'.site-header .wordmark':'.concept-toolbar a[href="/work/"]');await expect(target).toBeFocused();await inViewport(target);
 }
});

test('form pages keep chat available while yielding to focused fields in landscape',async({page})=>{
 await page.setViewportSize({width:390,height:320});await page.goto('/contact/?qa=1');await page.locator('#email').focus();
 await expect(page.locator('#email')).toBeFocused();await expect(page.locator('.support-chat-launch')).toBeHidden();await expect(page.locator('.support-chat')).toHaveCSS('position','fixed');await expect(page.locator('.back-to-top')).toBeHidden();
 const covered=await page.locator('#email').evaluate(el=>{const r=el.getBoundingClientRect();return !el.contains(document.elementFromPoint(r.left+8,r.top+8));});expect(covered).toBe(false);
 await expect(page.locator('[data-chat-open]')).toHaveCount(0);await page.locator('#email').evaluate(el=>el.blur());await inViewport(page.locator('.support-chat-launch'));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('saved section links still reach consolidated tools, privacy details and county downloads',async({page})=>{
 await page.goto('/pricing/?qa=1#cost-calculator');await expect(page.locator('#cost-calculator')).toBeVisible();await expect(page.locator('#cost-calculator a[href="/payments/#cost-calculator"]')).toBeVisible();
 await page.goto('/privacy/?qa=1#privacy-6');await expect(page.locator('#privacy-6')).toHaveAttribute('open','');
 await page.goto('/privacy/?qa=1#privacy-11');const storage=page.locator('#privacy-11').locator('..');await expect(storage).toHaveAttribute('open','');await expect(storage.locator('summary')).toHaveText('Optional demo storage and downloaded files');await expect(page.locator('#privacy-11')).toBeVisible();
 await page.goto('/areas/erie-county/?qa=1#buyer-task');await expect(page.locator('#buyer-task')).toBeVisible();await expect(page.locator('a[href^="/assets/county-briefs/erie.txt"]')).toBeVisible();
});

test('desktop starts automatically and phone starts on request, then preserves the tour and looping city',async({page},testInfo)=>{
 const requests=[];page.on('request',request=>{if(request.url().includes('/living-city/')&&request.url().includes('.mp4'))requests.push(request.url());});
 await page.goto('/?qa=1');await expect(page.locator('[data-living-city]')).toHaveAttribute('data-city-ready','true');
 if(testInfo.project.name==='phone-reduced-motion'){
  await expect(page.locator('[data-city-play]')).toBeDisabled();expect(requests).toHaveLength(0);return;
 }
 if(page.viewportSize().width<=1023){
  await expect(page.locator('[data-city-play]')).toHaveAccessibleName('Play motion');
  await expect(page.locator('#city-film')).not.toHaveAttribute('src',/./);expect(requests).toHaveLength(0);
  await page.locator('[data-city-play]').click();
 }
 await expect(page.locator('[data-living-city]')).toHaveClass(/has-city-frame/);
 expect(requests.length).toBeGreaterThan(0);
 await expect(page.locator('#city-film')).toHaveAttribute('src',page.viewportSize().width<=1023?/mobile.*\.mp4(?:\?.*)?$/:/desktop.*\.mp4(?:\?.*)?$/);
 await page.locator('[data-city-play]').click();
 await expect(page.locator('#city-film')).toHaveJSProperty('paused',true);
 const held=await page.locator('#city-film').evaluate(video=>video.currentTime);
 await page.locator('#website-examples').scrollIntoViewIfNeeded();
 await page.locator('[data-city-play]').scrollIntoViewIfNeeded();
 await expect(page.locator('#city-film')).toHaveJSProperty('paused',true);
 expect(await page.locator('#city-film').evaluate(video=>video.currentTime)).toBe(held);
 await page.locator('[data-city-play]').click();
 await page.locator('[data-city-replay]').focus();
 for(const id of ['fieldwork','northline','hearthside'])await expect(page.locator('[data-city-showcase="'+id+'"]')).toBeVisible({timeout:6000});
 await expect(page.locator('[data-living-city]')).toHaveAttribute('data-city-beat','ambient',{timeout:6000});
 await expect(page.locator('#city-film')).toHaveJSProperty('paused',false);
 await expect(page.locator('#city-film')).toHaveJSProperty('loop',true);
 await expect(page.locator('[data-city-replay]')).toBeFocused();
 await page.locator('[data-city-replay]').click();
 await expect(page.locator('[data-living-city]')).toHaveAttribute('data-city-state','playing');
 expect(await page.locator('#city-film').evaluate(video=>video.currentTime)).toBeLessThan(2);
 await page.locator('[data-city-play]').click();
});

test('a first phone visit requests no film, remembers explicit play in its tab, and respects a later pause',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='phone','One first-visit phone trace covers session behavior');
 const requests=[];page.on('request',request=>{if(/\/living-city\/[^/]+\.mp4(?:\?|$)/.test(request.url()))requests.push(request.url());});
 const ready=()=>expect(page.locator('[data-living-city]')).toHaveAttribute('data-city-ready','true');
 await page.goto('/?qa=1');await ready();await page.evaluate(()=>document.fonts.ready);
 await expect(page.locator('[data-city-play]')).toHaveAccessibleName('Play motion');
 await expect(page.locator('#city-film')).not.toHaveAttribute('src',/./);expect(requests).toHaveLength(0);
 await testInfo.attach('phone-first-visit-still',{body:await page.screenshot(),contentType:'image/png'});
 await page.locator('footer').scrollIntoViewIfNeeded();await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
 await page.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
 await page.setViewportSize({width:1100,height:900});await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 await expect(page.locator('#city-film')).not.toHaveAttribute('src',/./);expect(requests).toHaveLength(0);
 const evidence={firstVisitFilmRequests:requests.length};
 await page.locator('[data-city-play]').click();await expect(page.locator('[data-living-city]')).toHaveClass(/has-city-frame/);
 await expect(page.locator('#city-film')).toHaveAttribute('src',/mobile.*\.mp4(?:\?.*)?$/);expect(requests.length).toBeGreaterThan(0);
 evidence.explicitPlayFilmRequests=requests.length;requests.length=0;
 await page.reload();await ready();await expect(page.locator('[data-living-city]')).toHaveClass(/has-city-frame/);
 expect(requests.length).toBeGreaterThan(0);evidence.rememberedPlayFilmRequests=requests.length;
 const separate=await page.context().newPage(),separateRequests=[];
 try{
  separate.on('request',request=>{if(/\/living-city\/[^/]+\.mp4(?:\?|$)/.test(request.url()))separateRequests.push(request.url());});
  await separate.goto('/?qa=1');await expect(separate.locator('[data-living-city]')).toHaveAttribute('data-city-state','idle');
  await expect(separate.locator('#city-film')).not.toHaveAttribute('src',/./);expect(separateRequests).toHaveLength(0);
  evidence.newTabFilmRequests=separateRequests.length;
 }finally{await separate.close();}
 await page.bringToFront();await expect(page.locator('[data-living-city]')).toHaveAttribute('data-city-state','playing');
 await page.locator('[data-city-play]').click();await expect(page.locator('#city-film')).toHaveJSProperty('paused',true);
 requests.length=0;await page.reload();await ready();await page.evaluate(()=>document.fonts.ready);
 await expect(page.locator('[data-city-play]')).toHaveAccessibleName('Play motion');await expect(page.locator('#city-film')).not.toHaveAttribute('src',/./);
 expect(requests).toHaveLength(0);evidence.rememberedPauseFilmRequests=requests.length;
 await testInfo.attach('phone-motion-network-boundary',{body:JSON.stringify(evidence,null,2),contentType:'application/json'});
});

test('city project tabs update the preview and destination together with keyboard access',async({page})=>{
 await page.goto('/?qa=1');await page.getByRole('tab',{name:'Fieldwork',exact:true}).focus();
 await page.keyboard.press('ArrowRight');
 await expect(page.getByRole('tab',{name:'Northline',exact:true})).toBeFocused();
 await expect(page.locator('[data-city-panel]:visible')).toHaveAttribute('data-city-panel','northline');
 await expect(page.locator('[data-city-panel]:visible .city-project-link')).toHaveAttribute('href','/work/northline/');
 await page.keyboard.press('End');
 await expect(page.locator('[data-city-panel]:visible')).toHaveAttribute('data-city-panel','hearthside');
 await expect(page.locator('[data-city-panel]:visible .city-project-link')).toHaveText(/Explore Hearthside/);
 await page.locator('[data-city-panel]:visible .city-project-link').click();
 await expect(page).toHaveURL(/\/work\/hearthside\//);
});

test('city scene links and browser history reveal the matching project below the sticky header',async({page})=>{
 await page.goto('/?qa=1');
 for(const id of ['northline','hearthside']){
  await page.evaluate(id=>{location.hash='city-panel-'+id;},id);
  await expect(page.locator('[data-city-panel]:visible')).toHaveAttribute('data-city-panel',id);
  await expect.poll(()=>page.evaluate(()=>{const panel=document.querySelector('[data-city-panel]:not([hidden])').getBoundingClientRect(),header=document.querySelector('.site-header').getBoundingClientRect();return panel.top>=header.bottom-1&&panel.top<innerHeight;})).toBe(true);
 }
 await page.goBack();await expect(page.locator('[data-city-panel]:visible')).toHaveAttribute('data-city-panel','northline');
 await page.goForward();await expect(page.locator('[data-city-panel]:visible')).toHaveAttribute('data-city-panel','hearthside');
});

test('a visitor pause choice survives reloading the homepage until motion is requested again',async({page},testInfo)=>{
 test.skip(testInfo.project.name==='phone-reduced-motion','Reduced motion is already static');
 await page.goto('/?qa=1');
 if(page.viewportSize().width<=1023)await page.locator('[data-city-play]').click();
 await expect(page.locator('[data-living-city]')).toHaveClass(/has-city-frame/);
 await page.locator('[data-city-play]').click();await page.reload();
 await expect(page.locator('[data-city-play]')).toHaveAccessibleName('Play motion');
 await expect(page.locator('#city-film')).not.toHaveAttribute('src',/./);
 await page.locator('[data-city-play]').click();await expect(page.locator('[data-living-city]')).toHaveClass(/has-city-frame/);
});

test('a failed city film keeps the still and website links usable, then retries',async({page},testInfo)=>{
 test.skip(testInfo.project.name==='phone-reduced-motion','Reduced motion never requests a film');
 const filmPattern=/\/assets\/living-city\/[^/?]+\.mp4(?:\?.*)?$/;
 await page.route(filmPattern,route=>route.abort('failed'));
 await page.goto('/?qa=1');
 if(page.viewportSize().width<=1023&&testInfo.project.name!=='phone-reduced-motion')await page.locator('[data-city-play]').click();
 await expect(page.locator('[data-living-city]')).toHaveAttribute('data-city-state','error');
 await expect(page.locator('[data-living-city]')).not.toHaveClass(/has-city-frame/);
 await expect(page.locator('.city-poster')).toBeVisible();
 await expect(page.locator('[data-city-play]')).toHaveAccessibleName('Retry motion');
 await expect(page.locator('.city-primary')).toHaveAttribute('href','/contact/');
 await expect(page.locator('[data-city-panel]:visible .city-project-link')).toHaveAttribute('href','/work/fieldwork/');
 await page.unroute(filmPattern);await page.locator('[data-city-play]').click();
 await expect(page.locator('[data-living-city]')).toHaveClass(/has-city-frame/);
 await page.getByRole('tab',{name:'Northline',exact:true}).click();
 await expect(page.locator('#city-film')).toHaveJSProperty('paused',true);
 await expect(page.locator('[data-city-panel]:visible .city-project-link')).toHaveAttribute('href','/work/northline/');
});

test('Buffalo Work archive preserves playable reveal and ambient films',async({page})=>{
 await page.goto('/work/?qa=1');await page.getByRole('link',{name:'Explore Buffalo Civic',exact:true}).click();
 await expect(page).toHaveURL(/\/work\/buffalo-civic\//);
 for(const id of ['buffalo-intro','buffalo-ambient']){
  const film=page.locator('#'+id);await expect(film).toHaveJSProperty('paused',true);
  await film.evaluate(video=>video.play());
  await expect.poll(()=>film.evaluate(video=>Number.isFinite(video.duration)&&video.duration>0&&!video.paused)).toBe(true);
  await film.evaluate(video=>video.pause());await expect(film).toHaveJSProperty('paused',true);
 }
});

test('ordinary scrolling preserves every page section and reachable tools',async({page})=>{
 for(const path of ['/','/pricing/']){
  await page.goto(path+'?qa=1');await page.evaluate(()=>document.fonts.ready);
  const sections=()=>page.locator('main section').evaluateAll(xs=>xs.map(x=>({id:x.id,hidden:x.hidden,display:getComputedStyle(x).display,text:x.textContent.length})));
  const before=await sections(),max=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
  for(let y=600;y<max+500;y+=500){
   await page.evaluate(async y=>{scrollTo({top:y,behavior:'instant'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));},Math.min(y,max));
   expect(await sections()).toEqual(before);
  }
  await revealTools(page);
 }
});

test('back-to-top and chat follow each viewport and page type',async({page})=>{
 for(const path of ['/','/pricing/','/services/','/services/seo/','/areas/','/contact/','/checkout/focused-site/','/guides/ai-search-visibility/','/work/hearthside/']){
  await page.goto(path+'?qa=1');await page.evaluate(()=>document.fonts.ready);
  const chat=page.locator('.support-chat-launch'),top=page.locator('.back-to-top');
  await expect(top).toBeHidden();
  await expect(page.locator('.support-chat')).toHaveCSS('position','fixed');
  for(const y of [680,1200,760]){
   await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);
   await expect(top).toHaveCSS('position','fixed');
   const narrow=await page.evaluate(()=>matchMedia('(max-width:767px),(max-height:520px)').matches);
   if(!narrow){await expect(top).toBeVisible();await inViewport(top);await inViewport(chat);}
   for(const control of [top,chat])expect(await control.evaluate(el=>{if(!el.checkVisibility({checkVisibilityCSS:true}))return true;const r=el.getBoundingClientRect();return r.top>=0&&r.left>=0&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1;})).toBe(true);
   expect(await top.evaluate(el=>el.getBoundingClientRect().right<innerWidth/2)).toBe(true);
   expect(await chat.evaluate(el=>el.getBoundingClientRect().left>innerWidth/2)).toBe(true);
   // Ordinary prose no longer changes visibility or vertical placement.
   // Inquiry forms still temporarily suppress overlapping controls.
   if(!await page.locator('#inquiry').count()){
    await expect(top).toBeVisible();await expect(chat).toBeVisible();
    for(const control of [top,chat])expect(await control.evaluate(el=>{
     const r=el.getBoundingClientRect();return {bottom:innerHeight-r.bottom,translated:el.style.translate};
    })).toEqual({bottom:16,translated:''});
   }

  }
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  await expect(top).toBeVisible();await inViewport(top);await expect(chat).toBeVisible();await inViewport(chat);
  await top.click();await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
  await expect(page.locator(path==='/work/hearthside/'?'.concept-toolbar a[href="/work/"]':'.site-header .wordmark')).toBeFocused();
  if(!await page.evaluate(()=>matchMedia('(max-width:767px),(max-height:520px)').matches))await inViewport(chat);
 }
});
