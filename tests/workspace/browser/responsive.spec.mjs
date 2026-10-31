import {test,expect} from '@playwright/test';
const business='10000000-0000-4000-8000-000000000001';
const route=section=>`/workspace/${section}?business=${business}`;
test('workspace navigation stays reachable from small phones through desktop and short windows',async({page},info)=>{
 test.setTimeout(90000);
 await page.goto('/_preview/role?as=operator');await page.goto(route('business'));
 for(const [width,height] of [[320,568],[390,844],[768,1024],[1024,600],[1440,900],[1920,1080],[1200,360],[390,844]]){
  await page.setViewportSize({width,height});
  if(width<=700){
   const menu=page.getByRole('button',{name:'Workspace menu',exact:true});await expect(menu).toBeVisible();
   if(await menu.getAttribute('aria-expanded')!=='true')await menu.click();
   for(const name of ['Billing','People & access','Help','Studio workspace ↗'])await expect(page.getByRole('navigation',{name:'Workspace'}).getByRole('link',{name,exact:true})).toBeVisible();
   const sizes=await page.locator('#workspace-nav a').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height));expect(sizes.every(h=>h>=44)).toBe(true);
   await page.getByRole('navigation',{name:'Workspace'}).getByRole('link',{name:'Billing',exact:true}).click();await expect(page.getByRole('button',{name:'Workspace menu',exact:true})).toHaveAttribute('aria-expanded','false');
  }else{
   const help=page.getByRole('navigation',{name:'Workspace'}).getByRole('link',{name:'Help',exact:true});await help.scrollIntoViewIfNeeded();await help.click();await expect(page).toHaveURL(/workspace\/help/);
  }
  expect(await page.evaluate(expected=>document.documentElement.scrollWidth<=expected+1,width),`${width}x${height}`).toBe(true);
 }
 const menu=page.getByRole('button',{name:'Workspace menu',exact:true});await menu.click();await page.screenshot({path:`output/playwright/workspace/${info.project.name}-mobile-menu.png`,fullPage:true});await page.keyboard.press('Escape');await expect(menu).toHaveAttribute('aria-expanded','false');await expect(menu).toBeFocused();
});
test('workspace forms and long business names reflow at 320px and desktop widths',async({page},info)=>{
 test.setTimeout(90000);
 await page.route('**/api/workspace?*',async r=>{const response=await r.fetch(),data=await response.json();data.business.name='A very long business name '+ 'InternationalServices'.repeat(8);await r.fulfill({response,json:data});});
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});
  for(const section of ['new','business','agreements','billing','people','files']){
   await page.goto(route(section));await expect(page.locator('.page h1')).toBeVisible();
   const layout=await page.evaluate(expected=>({scrollWidth:document.documentElement.scrollWidth,overflow:Array.from(document.querySelectorAll('body *')).flatMap(el=>{const rect=el.getBoundingClientRect();return rect.width&&rect.right>expected+1?[{tag:el.tagName,className:el.className,type:el.getAttribute('type'),width:rect.width,right:rect.right}]:[];}).slice(-12)}),width);
   expect(layout.scrollWidth,`${section} at ${width}: ${JSON.stringify(layout.overflow)}`).toBeLessThanOrEqual(width+1);
   if(width<=700){
    const controls=await page.locator('input:not([type=hidden]):not([type=checkbox]),textarea,select').evaluateAll(els=>els.filter(el=>el.getClientRects().length).map(el=>({font:parseFloat(getComputedStyle(el).fontSize),height:el.getBoundingClientRect().height,width:el.getBoundingClientRect().width})));
    expect(controls.every(x=>x.font>=16&&x.height>=44&&x.width<=width),`${section} touch controls`).toBe(true);
   }
  }
  if(width===390||width===1440)await page.screenshot({path:`output/playwright/workspace/${info.project.name}-responsive-${width}.png`,fullPage:true});
 }
});

test('opening and dismissing the mobile menu preserves unfinished form and file inputs',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(route('new'));const draft='Keep this unfinished request while I inspect the menu';await page.getByLabel('What would you like to achieve?',{exact:true}).fill(draft);
 const menu=page.getByRole('button',{name:'Workspace menu',exact:true});await menu.click();await page.keyboard.press('Escape');await expect(page.getByLabel('What would you like to achieve?',{exact:true})).toHaveValue(draft);await menu.click();await menu.click();await expect(page.getByLabel('What would you like to achieve?',{exact:true})).toHaveValue(draft);
 await page.goto(route('files'));const files=page.getByLabel(/^Choose files/);await files.setInputFiles({name:'synthetic-not-uploaded.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic selection only')});await menu.click();await page.keyboard.press('Escape');expect(await files.evaluate(el=>el.files[0]?.name)).toBe('synthetic-not-uploaded.txt');
});
