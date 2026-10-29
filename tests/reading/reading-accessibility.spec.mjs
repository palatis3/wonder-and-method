import {test,expect} from '../browser/fixtures.mjs';

const routes=['/','/pricing/','/services/web-design/','/services/website-addons/','/services/brand-messaging/','/services/ecommerce-websites/','/services/local-business-profiles/','/services/workflow-automation/','/services/custom-systems/','/checkout/business-site/','/contact/','/areas/texas/','/areas/texas/milam-county/','/guides/website-content-template/','/tools/website-roi-calculator/','/payments/','/work/','/privacy/'];
const textSelectors='h1,h2,h3,p,li,label,summary,button,input,select,textarea,th,td,nav a';

async function openContent(page){
 // Exercise native keyboard activation, then expose every disclosure for the
 // layout inspection. Repeated keyboard journeys have separate full coverage.
 const summaries=page.locator('main details > summary,footer details > summary');
 for(const summary of await summaries.all()){
  if(!await summary.isVisible())continue;
  if(!await summary.evaluate(el=>el.parentElement.open)){await summary.focus();await page.keyboard.press('Enter');await expect(summary.locator('..')).toHaveAttribute('open','');break;}
 }
 await page.locator('main details,footer details').evaluateAll(details=>{for(const item of details)item.open=true;});
}
async function inspectReadableLayout(page){
 const layout=await page.evaluate(selector=>{
  const visible=el=>{
   if(el.closest('.honeypot[aria-hidden="true"]'))return false;
   if(!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})||!el.getClientRects().length)return false;
   for(let parent=el;parent&&parent!==document.body;parent=parent.parentElement){const css=getComputedStyle(parent),box=parent.getBoundingClientRect();if(css.clipPath==='inset(50%)'&&box.width<=2&&box.height<=2)return false;}
   return true;
  };
  const exceptions=el=>{if(!el.closest('table'))return false;for(let node=el;node&&node!==document.body;node=node.parentElement){const css=getComputedStyle(node);if(/auto|scroll/.test(css.overflowX)&&node.scrollWidth>node.clientWidth+1)return true;}return false;};
  const clipped=[];
  for(const el of document.querySelectorAll(selector)){
   if(!visible(el))continue;
   // Off-canvas navigation and closed disclosure content have no rendered boxes.
   for(const child of el.childNodes){if(child.nodeType!==Node.TEXT_NODE||!child.textContent.trim())continue;
    const range=document.createRange();range.selectNodeContents(child);
    for(const rect of range.getClientRects()){
     if(rect.width<1||rect.height<1)continue;
     if((rect.left< -2||rect.right>innerWidth+2)&&!exceptions(el))clipped.push({tag:el.tagName,text:child.textContent.trim().slice(0,90),reason:'outside viewport'});
     for(let parent=el;parent&&parent!==document.body;parent=parent.parentElement){
      const css=getComputedStyle(parent),box=parent.getBoundingClientRect();
      if(/hidden|clip/.test(css.overflowX)&&css.clipPath==='none'&&(rect.left<box.left-3||rect.right>box.right+3))clipped.push({tag:el.tagName,text:child.textContent.trim().slice(0,90),reason:'horizontal clipping'});
      if(/hidden|clip/.test(css.overflowY)&&css.clipPath==='none'&&(rect.top<box.top-3||rect.bottom>box.bottom+3))clipped.push({tag:el.tagName,text:child.textContent.trim().slice(0,90),reason:'vertical clipping'});
     }
    }
   }
  }
  return {overflow:document.documentElement.scrollWidth-innerWidth,clipped};
 },textSelectors);
 expect(layout.overflow,'Page must reflow without horizontal scrolling').toBeLessThanOrEqual(1);
 expect(layout.clipped,'Visible reading text must not be clipped or pushed outside the viewport').toEqual([]);
}
async function exerciseControls(page,path){
 const toggle=page.locator('.menu-toggle');
 if(await toggle.isVisible()){
  await toggle.focus();await page.keyboard.press('Enter');await expect(toggle).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#main-nav')).toBeVisible();await page.keyboard.press('Escape');await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(toggle).toBeFocused();
 }
 if(path==='/contact/'){
  const email=page.locator('input[name="email"]');await email.fill('not-an-email');await email.focus();
  expect(await email.evaluate(el=>el.validity.typeMismatch)).toBe(true);
  await expect(email).toBeVisible();await expect(email).toBeFocused();
  await page.route('http://127.0.0.1:4198/api/inquiries',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Synthetic reading check. Your entries remain available.'})}));
  await page.locator('#name').fill('Reading accessibility fixture');await email.fill('reading@example.test');await page.locator('#message').fill('Synthetic readability and retained-input check.');
  const submit=page.getByRole('button',{name:'Send message',exact:true});await submit.click();
  await expect(page.locator('#form-status')).toContainText('Synthetic reading check');await expect(page.locator('#form-status')).toBeVisible();
  await expect(email).toHaveValue('reading@example.test');await expect(submit).toBeEnabled();
 }
 const contact=page.getByRole('navigation',{name:'Footer',exact:true}).getByRole('link',{name:'Contact',exact:true});await contact.focus();await expect(contact).toBeFocused();await expect(contact).toBeVisible();
}

for(const path of routes)for(const mode of ['reflow-320','text-200','text-spacing'])test(`${mode}: ${path} retains readable expanded content and controls`,async({page})=>{
 await page.setViewportSize({width:mode==='reflow-320'?320:1280,height:900});
 const response=await page.goto(path+'?qa=1');expect(response.status()).toBe(200);await page.evaluate(()=>document.fonts.ready);
 await openContent(page);
 if(mode==='text-200'){
  const enlarged=await page.evaluate(selector=>{
   const elements=[...document.querySelectorAll('body,body *')].filter(el=>el instanceof HTMLElement);
   const before=elements.map(el=>({el,size:parseFloat(getComputedStyle(el).fontSize)}));
   for(const {el,size} of before)el.style.setProperty('font-size',`${size*2}px`,'important');
   return before.filter(({el})=>el.matches(selector)&&el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})).map(({el,size})=>({tag:el.tagName,ratio:parseFloat(getComputedStyle(el).fontSize)/size}));
  },textSelectors);
  expect(enlarged.length).toBeGreaterThan(10);expect(enlarged.every(item=>item.ratio>=1.99),'Every selected visible text element actually doubled').toBe(true);
 }else if(mode==='text-spacing'){
  const spacing=await page.evaluate(selector=>{
   for(const el of document.querySelectorAll('body *')){
    if(!(el instanceof HTMLElement))continue;
    el.style.setProperty('line-height','1.5','important');
    el.style.setProperty('letter-spacing','.12em','important');
    el.style.setProperty('word-spacing','.16em','important');
    if(el.matches('p'))el.style.setProperty('margin-bottom','2em','important');
   }
   return [...document.querySelectorAll(selector)].filter(el=>el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})).map(el=>{
    const css=getComputedStyle(el),size=parseFloat(css.fontSize);
    // Chromium's native select retains a platform-controlled 'normal' line
    // height. Still require its letter and word spacing and inspect its layout.
    return {tag:el.tagName,nativeLineHeight:el.matches('select')&&css.lineHeight==='normal',line:parseFloat(css.lineHeight)/size,letter:parseFloat(css.letterSpacing)/size,word:parseFloat(css.wordSpacing)/size,paragraph:!el.matches('p')||parseFloat(css.marginBottom)/size>=1.999};
   });
  },textSelectors);
  expect(spacing.length).toBeGreaterThan(10);
  expect(spacing.filter(item=>!((item.nativeLineHeight||item.line>=1.499)&&item.letter>=.119&&item.word>=.159&&item.paragraph)),'Requested text spacing actually applies').toEqual([]);
 }
 await exerciseControls(page,path);await inspectReadableLayout(page);
});
