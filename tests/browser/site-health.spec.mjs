import {readFile} from 'node:fs/promises';
import {test,expect} from './fixtures.mjs';
import faqsByPath from '../../src/service-faqs.json' with {type:'json'};

const {routes}=JSON.parse(await readFile(new URL('../../evidence/build.json',import.meta.url),'utf8'));

// Visit every built page at both widths. This complements focused interaction
// tests: a new route is automatically included, rather than added to a sample.
for(let offset=0;offset<routes.length;offset+=25){
 const batch=routes.slice(offset,offset+25);
 test(`all-route resources, landmarks and responsive layout ${offset+1}–${offset+batch.length}`,async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop','One complete desktop/phone matrix');test.setTimeout(180_000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.url().startsWith('http://127.0.0.1:4187/assets/')&&response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
  for(const width of [360,1440]){
   await page.setViewportSize({width,height:900});
   for(const path of batch){
    errors.length=0;const response=await page.goto(path+'?qa=1',{waitUntil:'load'});expect(response.status(),path).toBe(200);
    await page.evaluate(async()=>{document.querySelectorAll('img').forEach(img=>img.loading='eager');await document.fonts.ready;await Promise.all([...document.images].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});setTimeout(resolve,7000);})));});
    const health=await page.evaluate(()=>({
     width:innerWidth,scroll:document.documentElement.scrollWidth,
     h1:[...document.querySelectorAll('main h1')].filter(el=>el.checkVisibility()).length,
     brokenImages:[...document.images].filter(img=>!img.complete||!img.naturalWidth).map(img=>img.currentSrc||img.src),
     badFonts:[...document.fonts].filter(font=>font.status==='error').map(font=>font.family),
     bodyFont:getComputedStyle(document.body).fontFamily,
     footer:document.querySelectorAll('footer.site-footer--compact').length,
     top:document.querySelectorAll('a.back-to-top[href="#page-top"]').length,
     chat:document.querySelectorAll('.support-chat').length,
     footerGroups:document.querySelectorAll('footer details.footer-group').length
    }));
    expect(health.scroll,`${path} ${width}px overflow`).toBeLessThanOrEqual(width+1);
    expect(health.h1,`${path} heading`).toBe(1);expect(health.brokenImages,path).toEqual([]);expect(health.badFonts,path).toEqual([]);
    expect(health.bodyFont,path).toContain('Manrope');expect(health.footer,path).toBe(1);expect(health.top,path).toBe(1);expect(health.chat,path).toBe(1);expect(health.footerGroups,path).toBe(4);expect(errors,path).toEqual([]);
    // Presence alone misses controls hidden by a future CSS or boot-script edit.
    const inline=page.locator('.support-chat--inline');
    if(await inline.count())await expect(page.locator('[data-chat-open]')).toBeVisible();
    else await expect(page.locator('.support-chat-launch')).toBeVisible();
    const answers=faqsByPath[path]||[],section=page.locator('#service-questions');
    await expect(section).toHaveCount(answers.length?1:0);
    for(const [index,answer] of answers.entries()){
     const details=section.locator('details').nth(index),summary=details.locator('summary');
     await expect(summary).toHaveText(answer.question);await expect(details).not.toHaveAttribute('open','');
     await summary.focus();await page.keyboard.press('Enter');
     await expect(summary).toBeFocused();await expect(details).toHaveAttribute('open','');
     await expect(details.locator('p').first()).toBeVisible();await expect(details.locator('p').first()).toHaveText(answer.answer);
     for(const link of answer.links||[])await expect(details.getByRole('link',{name:link.label,exact:true})).toHaveAttribute('href',link.path);
     expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),path+' open FAQ at '+width).toBeLessThanOrEqual(1);
     await page.keyboard.press('Space');await expect(details).not.toHaveAttribute('open','');await expect(summary).toBeFocused();
    }
    await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
    if(await page.evaluate(()=>scrollY>=520))await expect(page.locator('.back-to-top')).toBeVisible();
   }
  }
 });
}
