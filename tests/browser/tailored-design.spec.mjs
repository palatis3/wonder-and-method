import {readFile} from 'node:fs/promises';
import {test,expect} from './fixtures.mjs';
const axe=await readFile(new URL('../../node_modules/axe-core/axe.min.js',import.meta.url),'utf8');
const paths=['/work/','/services/','/services/web-design/','/services/website-redesign/','/services/contractor-websites/','/services/website-audit/','/services/website-addons/','/services/website-care/','/services/seo/','/process/','/'];

test('design desk changes presentation while preserving content, inquiry context and keyboard focus',async({page})=>{
 await page.goto('/work/?qa=1');const desk=page.locator('[data-design-desk]');await expect(desk).toHaveAttribute('data-desk-ready','true');
 const specimen=desk.locator('[data-desk-specimen]'),copy=await specimen.innerText();
 await page.route('**/__site-axe.js',route=>route.fulfill({contentType:'text/javascript',body:axe}));await page.addScriptTag({url:'/__site-axe.js'});
 for(const direction of ['expressive','warm','quiet']){
  const radio=desk.locator(`input[name="desk-direction"][value="${direction}"]`);await radio.focus();await radio.press('Space');
  await expect(radio).toBeChecked();await expect(radio).toBeFocused();await expect(specimen).toHaveAttribute('data-direction',direction);expect(await specimen.innerText()).toBe(copy);
  const violations=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('[data-design-desk]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});expect(violations).toEqual([]);
  if(await desk.locator('[data-desk-width-controls]').isVisible()){
   for(const width of ['phone','desktop']){await desk.locator(`input[name="desk-width"][value="${width}"]`).check();await expect(desk.locator('[data-desk-container]')).toHaveAttribute('data-width',width);expect(await specimen.innerText()).toBe(copy);}
  }
 }
 await expect(specimen.locator('a')).toHaveAttribute('href','/work/fieldwork/landscaping/');
 await desk.getByRole('link',{name:'Ask about a Fieldwork direction'}).click();await expect(page.locator('#service')).toHaveValue('unsure');await expect(page.locator('[name="concept"]')).toHaveValue('fieldwork');await expect(page.locator('#request_kind')).toHaveValue('question');
});

test('design desk survives resizing, enlarged text and missing artwork without trapping focus',async({page},testInfo)=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/work/?qa=1');const desk=page.locator('[data-design-desk]');
 const warm=desk.locator('input[name="desk-direction"][value="warm"]'),phone=desk.locator('input[name="desk-width"][value="phone"]');await warm.check();await phone.check();await phone.focus();
 await page.setViewportSize({width:390,height:844});await expect(desk.locator('[data-desk-width-controls]')).toBeHidden();await expect(warm).toBeFocused();await expect(desk.locator('[data-desk-container]')).toHaveAttribute('data-width','fit');
 await page.setViewportSize({width:1440,height:900});await expect(phone).toBeChecked();await expect(desk.locator('[data-desk-container]')).toHaveAttribute('data-width','phone');
 await page.route('**/__large-text.css',route=>route.fulfill({contentType:'text/css',body:'html{font-size:200%!important}*{letter-spacing:.12em!important;word-spacing:.16em!important}p{line-height:1.5!important}'}));
 await page.setViewportSize({width:320,height:800});await page.addStyleTag({url:'/__large-text.css'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await expect(warm).toBeChecked();await expect(desk.locator('[data-desk-specimen]')).toHaveAttribute('data-direction','warm');
 let blocked=false;await page.route('**/assets/work/concepts/fieldwork.svg*',route=>{blocked=true;return route.abort();});await page.reload();const artwork=desk.locator('[data-desk-specimen] img');await artwork.scrollIntoViewIfNeeded();await expect.poll(()=>blocked).toBe(true);await expect.poll(()=>artwork.evaluate(i=>i.complete&&i.naturalWidth===0)).toBe(true);await expect(desk.locator('h3')).toHaveText('A garden to come home to.');await expect(desk.locator('.desk-service-link')).toBeVisible();
});

test('tailored page families retain usable images, anchors, actions and responsive layout',async({page},testInfo)=>{
 test.setTimeout(180_000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const path of paths){
  const response=await page.goto(path+'?qa=1');expect(response.status()).toBe(200);await page.evaluate(()=>document.fonts.ready);
  const state=await page.evaluate(async()=>{for(const img of document.images)img.loading='eager';await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);return {overflow:document.documentElement.scrollWidth-innerWidth,duplicates:ids.filter((id,i)=>ids.indexOf(id)!==i),broken:[...document.images].filter(i=>i.getClientRects().length&&!i.naturalWidth).map(i=>i.src)};});
  expect(state,path).toEqual({overflow:0,duplicates:[],broken:[]});await expect(page.locator('main h1')).toHaveCount(1);
  if(path==='/work/'){
   for(const id of ['assetrounds','work-live','fieldwork','northline','hearthside','websites','search','handoff','workflow','buffalo-civic','studies','website-decisions'])await expect(page.locator('#'+id)).toHaveCount(1);
   const image=await page.locator('.tailored-work-hero img').boundingBox();expect(image.y).toBeLessThan(page.viewportSize().height);
   if(page.viewportSize().width<768)expect(await page.locator('.tailored-work-hero img').evaluate(i=>i.currentSrc)).toContain('/mobile.webp');
   const radio=page.locator('input[name="desk-direction"]').first();const size=await radio.boundingBox();expect(Math.abs(size.width-size.height)).toBeLessThan(1);
   await page.locator('.tailored-work-hero').screenshot({path:testInfo.outputPath('work-opening.png')});
   await page.locator('[data-design-desk]').screenshot({path:testInfo.outputPath('design-desk.png')});
  }
  await page.screenshot({path:testInfo.outputPath((path==='/'?'home':path.replaceAll('/','-'))+'.png'),fullPage:true});
 }
 expect(errors).toEqual([]);
});

test('blocked design-desk script keeps a complete quiet example and hides unusable controls',async({page})=>{
 await page.route('**/assets/design-desk.js*',route=>route.abort());await page.goto('/work/?qa=1');const desk=page.locator('[data-design-desk]');
 await expect(desk.locator('[data-desk-controls]')).toBeHidden();await expect(desk.locator('[data-desk-specimen]')).toHaveAttribute('data-direction','quiet');await expect(desk.locator('[data-desk-static]')).toBeVisible();
 await desk.locator('.desk-service-link').click();await expect(page).toHaveURL(/\/work\/fieldwork\/landscaping\//);
});

 test.describe('native design-desk fallback',()=>{
 test.use({javaScriptEnabled:false});
 test('quiet example and useful service link remain available without JavaScript',async({page})=>{
  await page.goto('/work/?qa=1');const desk=page.locator('[data-design-desk]');
  await expect(desk.locator('[data-desk-controls]')).toBeHidden();await expect(desk.locator('h3')).toHaveText('A garden to come home to.');
  await desk.locator('.desk-service-link').click();await expect(page).toHaveURL(/\/work\/fieldwork\/landscaping\//);
 });
});
