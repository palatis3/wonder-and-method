import {test,expect} from './fixtures.mjs';

function floatingState(){
 return [...document.querySelectorAll('.back-to-top,.support-chat-launch')].map(el=>{
  const r=el.getBoundingClientRect();
  return {name:el.classList[0],visible:el.checkVisibility({checkVisibilityCSS:true}),top:r.top,bottom:r.bottom,left:r.left,right:r.right};
 });
}

// The previous prose-gap placement moved or hid tools as every line passed.
// They now stay in their corners; focused controls and inquiry forms still yield.
test('corner tools remain visible and anchored throughout ordinary page scrolling',async({page})=>{
 test.setTimeout(90_000);
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const width of [320,390])for(const path of ['/','/about/','/pricing/','/work/','/areas/texas/milam-county/']){
  await page.setViewportSize({width,height:844});await page.goto(path+'?qa=1');await page.evaluate(()=>document.fonts.ready);
  let initial;
  for(const y of [600,800,1000,1200,1500,1800,1200,800]){
   await page.evaluate(async y=>{scrollTo({top:y,behavior:'instant'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));},y);
   const state=await page.evaluate(floatingState);
   for(const control of state){expect(control.visible,path+' '+width+' at '+y).toBe(true);expect(control.bottom).toBeLessThanOrEqual(844);expect(control.bottom).toBeGreaterThanOrEqual(820);}
   if(initial)expect(state).toEqual(initial);else initial=state;
  }
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  const chat=page.locator('.support-chat-launch'),top=page.locator('.back-to-top');
  await expect(chat).toBeVisible();await expect(chat).toBeInViewport();await expect(top).toBeVisible();
  await top.click();await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);await expect(page.locator('.site-header .wordmark')).toBeFocused();
 }
});

test('corner placement retains focus across scrolling, disclosures and viewport changes',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/pricing/?qa=1');await page.evaluate(()=>document.fonts.ready);
 const chat=page.locator('.support-chat-launch');
 await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await expect(chat).toBeVisible();
 await chat.focus();const focusedBox=await chat.boundingBox();
 await page.evaluate(()=>scrollBy({top:-100,behavior:'instant'}));
 await expect(chat).toBeFocused();await expect(chat).toBeVisible();expect((await chat.boundingBox()).y).toBeCloseTo(focusedBox.y,0);
 await page.evaluate(()=>document.activeElement.blur());
 const summary=page.locator('details.pricing-detail-table>summary').first();await summary.click();
 await expect(summary).toBeFocused();await expect(summary.locator('..')).toHaveAttribute('open','');
 for(const viewport of [{width:320,height:640},{width:1440,height:1000}]){
  await page.setViewportSize(viewport);await page.evaluate(()=>{document.activeElement.blur();scrollTo({top:680,behavior:'instant'});});
  await expect(chat).toBeVisible();const box=await chat.boundingBox();expect(box.y+box.height).toBeCloseTo(viewport.height-16,0);
 }
});

test('dense enlarged prose does not flicker or displace tools between animation frames',async({page})=>{
 await page.setViewportSize({width:320,height:640});await page.goto('/about/?qa=1');await page.evaluate(()=>document.fonts.ready);
 // Continuous enlarged text reproduces the old no-gap hide/show behavior.
 await page.evaluate(()=>{
  const main=document.querySelector('main'),p=document.createElement('p');
  p.textContent='Reading should stay clear at every line. '.repeat(500);
  main.replaceChildren(p);main.style.cssText='padding:0;margin:0;width:100%;max-width:none';
  p.style.cssText='font-size:32px;line-height:1.5;max-width:none;margin:0';
  scrollTo({top:600,behavior:'instant'});
 });
 await expect(page.locator('.support-chat-launch')).toBeVisible();await expect(page.locator('.back-to-top')).toBeVisible();
 const samples=await page.evaluate(async()=>{
  const records=[];
  for(let y=650;y<=2200;y+=25){
   scrollTo({top:y,behavior:'instant'});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   records.push([...document.querySelectorAll('.back-to-top,.support-chat-launch')].map(el=>({visible:el.checkVisibility({checkVisibilityCSS:true}),top:el.getBoundingClientRect().top})));
  }
  return records;
 });
 expect(samples.length).toBeGreaterThan(50);
 for(const sample of samples)expect(sample).toEqual([{visible:true,top:576},{visible:true,top:576}]);
 await page.locator('.back-to-top').click();await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);await expect(page.locator('.site-header .wordmark')).toBeFocused();
});

test('ambiguous exact place names remain visible with their official state and type',async({page})=>{
 await page.goto('/areas/?qa=1');
 const search=page.getByRole('searchbox',{name:'Place'});
 await search.fill('Anchorage');
 const best=page.locator('[data-county-best]');
 await expect(best.locator('a[href="/areas/alaska/anchorage-municipality/"]')).toBeVisible();
 await expect(best.locator('a[href="/areas/kentucky/jefferson-county/"]')).toBeVisible();
 await expect(best).toContainText('Alaska');await expect(best).toContainText('Kentucky');
 await search.fill('Anchorage AK');
 await expect(best.locator('a')).toHaveCount(1);
 await expect(best.locator('a')).toHaveAttribute('href','/areas/alaska/anchorage-municipality/');
 await page.getByRole('button',{name:'Clear',exact:true}).click();
 await expect(search).toHaveValue('');await expect(search).toBeFocused();
 await expect(page.locator('[data-county-results]')).toBeHidden();
});

test('contact starts with the message and preserves selected service after validation',async({page})=>{
 await page.goto('/contact/?offer=launch_site&goal=new_website&request_kind=question&qa=1');
 await expect(page.locator('#service')).toHaveValue('launch_site');
 await expect(page.locator('#request-summary')).toContainText('Launch Website');
 const order=await page.locator('#inquiry input,#inquiry textarea').evaluateAll(fields=>fields.filter(f=>['name','email','message','goal-new_website'].includes(f.id)).map(f=>f.id));
 expect(order).toEqual(['name','email','message','goal-new_website']);
 await page.locator('#inquiry button[type="submit"]').click();
 await expect(page.locator('#name-error')).not.toHaveText('');
 await expect(page.locator('#service')).toHaveValue('launch_site');
 await expect(page.locator('#goal-new_website')).toBeChecked();
});

test('floating help yields to visible inquiry controls even before focus',async({page})=>{
 await page.goto('/contact/?qa=1');
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>document.fonts.ready);
 const name=page.locator('#name');
 // Recreate a field at the fixed launcher's height, without first focusing it.
 await page.evaluate(()=>{const input=document.querySelector('#website');scrollTo({top:Math.max(0,scrollY+input.getBoundingClientRect().top-(innerHeight-70)),behavior:'instant'});});
 await expect.poll(()=>page.evaluate(()=>{
  const control=document.querySelector('.support-chat-launch'),field=document.querySelector('#website');
  if(!control.checkVisibility({checkVisibilityCSS:true}))return false;
  const a=control.getBoundingClientRect(),b=field.getBoundingClientRect();
  return Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top);
 })).toBe(false);
 await name.click();await expect(name).toBeFocused();
});

test('price choices expose editing and booking terms before optional detail',async({page})=>{
 await page.goto('/pricing/?qa=1');
 const editing=page.locator('#website-packages>.editing-model'),card=page.locator('#offer-launch_site');
 await expect(editing).toContainText('no visual or drag-and-drop editor');
 expect(await editing.evaluate((el)=>!!(el.compareDocumentPosition(document.querySelector('#offer-launch_site'))&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
 await expect(card).toContainText('$700 to book after proposal approval');
 const comparison=page.locator('details.pricing-detail-table');
 await expect(comparison).not.toHaveAttribute('open','');
 await comparison.locator('summary').click();
 await expect(comparison.locator('table')).toBeVisible();
 await comparison.locator('summary').click();await expect(comparison.locator('table')).toBeHidden();
});

test('guide contents and direct fragments reveal optional operator examples',async({page})=>{
 await page.goto('/guides/timed-booking-handoff/?qa=1');
 await expect(page.locator('#planning-2')).not.toHaveAttribute('open','');
 await page.locator('.journal-toc>summary').click();
 await page.locator('.journal-toc a[href="#planning-2"]').click();
 await expect(page.locator('#planning-2')).toHaveAttribute('open','');
 await expect(page.locator('#planning-2')).toContainText('Mammoth Cave');
 await page.goto('/guides/timed-booking-handoff/?qa=1#related-cases');
 await expect(page.locator('#related-cases')).toHaveAttribute('open','');
 await expect(page.locator('#related-cases a').first()).toBeVisible();
});

test('homepage follows visitor needs, real work, concepts, process, questions and contact',async({page})=>{
 await page.goto('/?qa=1');
 const order=await page.locator('.home-starting-points,.real-project-preview,#website-examples,.studio-process,.home-faq,.studio-closing').evaluateAll(nodes=>nodes.map(node=>node.id||[...node.classList].find(name=>['home-starting-points','studio-process','home-faq','studio-closing'].includes(name))));
 expect(order).toEqual(['home-starting-points','featured-work','website-examples','studio-process','home-faq','studio-closing']);
 await expect(page.locator('.real-project-preview')).toContainText('AssetRounds');
 await expect(page.locator('.founder-strip')).toHaveCount(0);
 await expect(page.locator('main')).not.toContainText('You work directly with me, Terry');
 await expect(page.locator('#website-examples')).toContainText('fictional');
 await page.locator('.city-explore').click();
 await expect(page).toHaveURL(/#featured-work$/);
 await expect(page.locator('.real-project-preview')).toBeInViewport();
 await page.goto('/about/?qa=1#terry');await expect(page.locator('#terry')).toHaveText('Hello, I’m Terry.');await expect(page.locator('main')).toContainText('since 2018');
});
