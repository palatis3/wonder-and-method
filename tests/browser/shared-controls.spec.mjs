import {test,expect} from './fixtures.mjs';

const inViewport=async(locator)=>{
 await expect(locator).toBeVisible();
 const fits=await locator.evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.left>=0&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1;});
 expect(fits).toBe(true);
};

// Persistent corner controls need no footer disclosure.
const revealTools=async page=>{
 if(await page.locator('body.studio-form').count())await page.locator('.site-tools').scrollIntoViewIfNeeded();else await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
 await inViewport(page.locator('.support-chat-launch'));
 await inViewport(page.locator('.back-to-top'));
};

test('header contact and floating corner tools remain reachable across page types',async({page,isMobile})=>{
 if(isMobile)await page.setViewportSize({width:320,height:844});
 for(const path of ['/','/pricing/','/contact/','/work/fieldwork/','/services/seo/','/areas/']){
  await page.goto(path+'?qa=1');await page.evaluate(()=>document.fonts.ready);
  const contact=page.locator(isMobile?(path==='/contact/'?'.menu-toggle':'.header-contact'):'#main-nav > a[href="/contact/#inquiry"]');
  if(isMobile&&path==='/contact/')await expect(page.locator('.header-contact')).toHaveCount(0);
  await inViewport(contact);await expect(page.locator('.back-to-top')).toBeHidden();
  await revealTools(page);await expect(page.locator('.support-chat')).toHaveCSS('position',path==='/contact/'?'static':'fixed');
  await page.locator('.back-to-top').scrollIntoViewIfNeeded();await inViewport(page.locator('.back-to-top'));
  const separated=await page.evaluate(()=>{const a=document.querySelector('.back-to-top').getBoundingClientRect(),b=document.querySelector('.support-chat').getBoundingClientRect();return a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top;});
  expect(separated,path).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),path).toBe(true);
  await page.locator('.back-to-top').click();await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);await expect(page.locator('.site-header .wordmark')).toBeFocused();
 }
 if(isMobile){await page.locator('.header-contact').click();await expect(page.locator('#request_kind')).toHaveValue('question');await expect(page.getByRole('button',{name:'Send message',exact:true})).toBeVisible();}
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

async function allowMockChat(page){
 // Only the local HTML response is adjusted. The provider script is fulfilled
 // below; the fixture still blocks every unmocked third-party request.
 await page.route('http://127.0.0.1:4187/?qa=1',async route=>{
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
 await allowMockChat(page);
 await page.route('https://embed.tawk.to/**',route=>route.abort('blockedbyclient'));
 await page.goto('/?qa=1');await revealTools(page);await page.locator('.support-chat-launch').click();
 const contact=page.locator('.support-chat-fallback a');await inViewport(contact);await expect(contact).toBeFocused();
 await expect(contact).toHaveAttribute('href','/contact/');
 await page.locator('.support-chat-dismiss').click();
 await expect(page.locator('.support-chat')).toBeHidden();await expect(page.locator('.back-to-top')).toBeFocused();
});

test('floating tools yield to focused form fields and remain usable in landscape',async({page})=>{
 await page.setViewportSize({width:390,height:320});
 await page.goto('/contact/?qa=1');await page.locator('#email').focus();
 await expect(page.locator('#email')).toBeFocused();await expect(page.locator('.support-chat')).toHaveCSS('position','static');const covered=await page.locator('#email').evaluate(el=>{const r=el.getBoundingClientRect();return !el.contains(document.elementFromPoint(r.left+8,r.top+8));});expect(covered).toBe(false);
 await page.locator('#main').focus();await revealTools(page);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.setViewportSize({width:844,height:390});await allowMockChat(page);await page.route('https://embed.tawk.to/**',route=>route.abort('blockedbyclient'));
 await page.goto('/?qa=1');await revealTools(page);await page.locator('.support-chat-launch').click();await page.locator('.support-chat-dismiss').click();await expect(page.locator('.back-to-top')).toBeFocused();await inViewport(page.locator('.back-to-top'));
});

test('saved section links still reach consolidated tools, privacy details and county downloads',async({page})=>{
 await page.goto('/pricing/?qa=1#cost-calculator');await expect(page.locator('#cost-calculator')).toBeVisible();await expect(page.locator('#cost-calculator a[href="/payments/#cost-calculator"]')).toBeVisible();
 await page.goto('/privacy/?qa=1#privacy-11');await expect(page.locator('#privacy-6')).toHaveAttribute('open','');await expect(page.locator('#privacy-11')).toBeVisible();
 await page.goto('/areas/erie-county/?qa=1#buyer-task');await expect(page.locator('#buyer-task')).toBeVisible();await expect(page.locator('a[href^="/assets/county-briefs/erie.txt"]')).toBeVisible();
});

test('homepage animation can replay its opening after reaching ambient motion',async({page})=>{
 await page.goto('/?qa=1');await page.locator('.civic-stage').scrollIntoViewIfNeeded();
 await page.locator('.civic-toggle').click();
 await expect.poll(()=>page.locator('#civic-motion').evaluate(video=>Number.isFinite(video.duration)&&video.duration>0&&!video.paused)).toBe(true);
 await expect(page.locator('.civic-hero')).toHaveAttribute('data-phase','ambient',{timeout:20000});
 await expect(page.getByRole('button',{name:'Replay animation',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Replay animation',exact:true}).click();
 await expect(page.locator('.civic-hero')).toHaveAttribute('data-phase','intro');
 await expect(page.locator('.civic-toggle')).toBeFocused();
 expect(await page.locator('#civic-motion').evaluate(video=>video.currentTime)).toBeLessThan(2);
 await page.locator('.civic-toggle').click();
});

test('ordinary scrolling keeps corner tools steady and retains every page section',async({page})=>{
 for(const path of ['/','/pricing/']){
  await page.goto(path+'?qa=1');await page.evaluate(()=>document.fonts.ready);
  const sections=()=>page.locator('main section').evaluateAll(xs=>xs.map(x=>({id:x.id,hidden:x.hidden,display:getComputedStyle(x).display,text:x.textContent.length})));
  const before=await sections(),max=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
  const scroll=async y=>page.evaluate(async y=>{scrollTo({top:y,behavior:'instant'});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));},y);
  for(let y=600;y<max+250;y+=250){
   await scroll(Math.min(y,max));
   await expect(page.locator('.support-chat-launch')).toBeVisible();
   await expect(page.locator('.back-to-top')).toBeVisible();
   expect(await sections()).toEqual(before);
  }
  for(const y of [540,470,510,400]){await scroll(y);await expect(page.locator('.back-to-top')).toBeVisible();}
  await scroll(340);await expect(page.locator('.back-to-top')).toBeHidden();
  await expect(page.locator('.support-chat-launch')).toBeVisible();
  await page.locator('#main').focus();await scroll(600);
  await expect(page.locator('.support-chat-launch')).toBeVisible();await expect(page.locator('.back-to-top')).toBeVisible();
 }
});
