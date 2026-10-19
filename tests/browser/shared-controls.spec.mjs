import {test,expect} from './fixtures.mjs';

const inViewport=async(locator)=>{
 await expect(locator).toBeVisible();
 const fits=await locator.evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.left>=0&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1;});
 expect(fits).toBe(true);
};

// Page links and motion controls take priority over floating tools. Find a
// clear footer position before testing the tool itself, without forcing clicks.
const revealTools=async page=>{
 await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
 await inViewport(page.locator('.support-chat-launch'));
};

test('sticky contact, floating chat and back-to-top remain reachable across page types',async({page,isMobile})=>{
 if(isMobile)await page.setViewportSize({width:320,height:844});
 for(const path of ['/','/pricing/','/contact/','/work/fieldwork/','/services/seo/','/areas/']){
  await page.goto(path+'?qa=1');await page.evaluate(()=>document.fonts.ready);
  const contact=page.locator(isMobile?(path==='/contact/'?'.menu-toggle':'.header-contact'):'#main-nav > a[href="/contact/"]');
  if(isMobile&&path==='/contact/')await expect(page.locator('.header-contact')).toHaveCount(0);
  await inViewport(contact);
  await expect(page.locator('.back-to-top')).toBeHidden();
  await page.evaluate(contactPage=>window.scrollTo({top:contactPage?document.documentElement.scrollHeight:1000,behavior:'instant'}),path==='/contact/');
  await revealTools(page);await inViewport(contact);await inViewport(page.locator('.back-to-top'));
  const separated=await page.evaluate(()=>{const a=document.querySelector('.back-to-top').getBoundingClientRect(),b=document.querySelector('.support-chat').getBoundingClientRect();return a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top;});
  expect(separated,path).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),path).toBe(true);
  await page.locator('.back-to-top').click();
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
  await expect(page.locator('.site-header .wordmark')).toBeFocused();
 }
 if(isMobile){
  await page.locator('.header-contact').click();
  await expect(page.locator('#request_kind')).toHaveValue('checkout');
  await expect(page.getByRole('button',{name:'Request a proposal',exact:true})).toBeVisible();
 }
});

test('floating controls yield to the phone menu and recover after it closes',async({page,isMobile})=>{
 test.skip(!isMobile,'Phone navigation');
 await page.goto('/?qa=1');await page.evaluate(()=>window.scrollTo({top:1000,behavior:'instant'}));
 // Click its current viewport position; locator auto-scroll can itself move a
 // sticky element toward the document start before dispatching the click.
 const menu=await page.locator('.menu-toggle').boundingBox();await page.mouse.click(menu.x+menu.width/2,menu.y+menu.height/2);
 await expect(page.locator('.support-chat-launch')).toBeHidden();await expect(page.locator('.back-to-top')).toBeHidden();
 await page.keyboard.press('Escape');
 expect(await page.evaluate(()=>scrollY)).toBeGreaterThan(800);
 await revealTools(page);await inViewport(page.locator('.header-contact'));await inViewport(page.locator('.back-to-top'));
});

test('keyboard wrapping and reopening reveal links inside a short mobile menu',async({page,isMobile})=>{
 test.skip(!isMobile,'Phone navigation');
 await page.setViewportSize({width:390,height:500});await page.goto('/?qa=1');
 await page.evaluate(()=>window.scrollTo({top:1000,behavior:'instant'}));
 const open=async()=>{const r=await page.locator('.menu-toggle').boundingBox();await page.mouse.click(r.x+r.width/2,r.y+r.height/2);};
 const visibleInsideNav=async link=>{
  await expect(link).toBeFocused();
  expect(await link.evaluate(el=>{const r=el.getBoundingClientRect(),nav=el.closest('#main-nav').getBoundingClientRect();return r.top>=nav.top&&r.bottom<=nav.bottom+1&&r.bottom<=innerHeight+1;})).toBe(true);
 };
 await open();await page.locator('.menu-toggle').evaluate(el=>el.focus({preventScroll:true}));await page.keyboard.press('Shift+Tab');
 await visibleInsideNav(page.locator('#main-nav > a[href="/contact/"]'));
 await page.keyboard.press('Escape');await open();
 await visibleInsideNav(page.locator('#main-nav > a[href="/work/"]'));
 await page.keyboard.press('Escape');expect(await page.evaluate(()=>scrollY)).toBeGreaterThan(800);
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

test('floating controls clear form fields and motion controls, and remain usable in landscape',async({page})=>{
 await page.setViewportSize({width:390,height:320});await page.goto('/?qa=1');
 const overlap=async selector=>{
  await page.evaluate(()=>document.fonts.ready);
  await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect(),chat=document.querySelector('.support-chat-launch').getBoundingClientRect();window.scrollBy({top:r.top-chat.top-10,behavior:'instant'});});
  expect(await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect(),c=document.querySelector('.support-chat-launch').getBoundingClientRect();return r.left<c.right&&r.right>c.left&&r.top<c.bottom&&r.bottom>c.top;}),`${selector} must actually overlap chat on both axes`).toBe(true);
  await expect(page.locator('.support-chat-launch')).toBeHidden();
 };
 await overlap('.civic-controls');
 await page.goto('/contact/?qa=1');await overlap('#email');
 await page.locator('#email').click();await expect(page.locator('#email')).toBeFocused();
 await page.setViewportSize({width:844,height:390});
 await allowMockChat(page);await page.route('https://embed.tawk.to/**',route=>route.abort('blockedbyclient'));
 await page.goto('/?qa=1');await page.evaluate(()=>window.scrollTo({top:1600,behavior:'instant'}));
 await page.locator('.support-chat-launch').click();await page.locator('.support-chat-dismiss').click();
 await expect(page.locator('.back-to-top')).toBeFocused();await inViewport(page.locator('.back-to-top'));
});
