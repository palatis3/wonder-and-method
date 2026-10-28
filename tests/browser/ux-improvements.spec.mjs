import {test,expect} from './fixtures.mjs';

function proseCollisions(){
 const tools=[...document.querySelectorAll('.back-to-top,.support-chat-launch')].filter(n=>n.checkVisibility({checkVisibilityCSS:true}));
 const hits=[];
 for(const region of document.querySelectorAll('main,footer')){
  const walker=document.createTreeWalker(region,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
   const node=walker.currentNode,parent=node.parentElement;
   if(!node.textContent.trim()||parent.closest('script,style')||!parent.checkVisibility({checkVisibilityCSS:true}))continue;
   const box=parent.getBoundingClientRect();if(box.bottom<0||box.top>innerHeight)continue;
   const range=document.createRange();range.selectNodeContents(node);
   for(const r of range.getClientRects())for(const tool of tools){const t=tool.getBoundingClientRect();if(Math.min(r.right,t.right)>Math.max(r.left,t.left)+1&&Math.min(r.bottom,t.bottom)>Math.max(r.top,t.top)+1)hits.push(node.textContent.trim().slice(0,80));}
  }
 }
 return hits;
}

test('mobile corner tools leave ordinary prose clear and recover after dense content',async({page})=>{
 test.setTimeout(90_000);
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const width of [320,390])for(const path of ['/about/','/pricing/','/work/','/areas/texas/milam-county/']){
  await page.setViewportSize({width,height:844});await page.goto(path+'?qa=1');await page.evaluate(()=>document.fonts.ready);
  for(const y of [0,600,1200,1800]){
   await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);
   await expect.poll(()=>page.evaluate(proseCollisions),`${path} ${width}px at ${y}`).toEqual([]);
  }
  // The footer's reserved bottom space must make both tools discoverable again.
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  const chat=page.locator('.support-chat-launch'),top=page.locator('.back-to-top');
  await expect(chat).toBeVisible();await expect(chat).toBeInViewport();await expect(top).toBeVisible();
  await top.click();await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);await expect(page.locator('.site-header .wordmark')).toBeFocused();
 }
});

test('mobile reading placement retains focus, refreshes after disclosure and viewport changes',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/pricing/?qa=1');await page.evaluate(()=>document.fonts.ready);
 await expect.poll(()=>page.evaluate(proseCollisions)).toEqual([]);
 const chat=page.locator('.support-chat-launch');
 await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await expect(chat).toBeVisible();
 await chat.focus();const focusedBox=await chat.boundingBox();
 await page.evaluate(()=>scrollBy({top:-100,behavior:'instant'}));
 await expect(chat).toBeFocused();await expect(chat).toBeVisible();expect((await chat.boundingBox()).y).toBeCloseTo(focusedBox.y,0);
 await page.evaluate(()=>document.activeElement.blur());
 const summary=page.locator('details.pricing-detail-table>summary').first();await summary.click();
 await expect.poll(()=>page.evaluate(proseCollisions)).toEqual([]);
 await page.setViewportSize({width:320,height:640});await expect.poll(()=>page.evaluate(proseCollisions)).toEqual([]);
 await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>scrollTo({top:680,behavior:'instant'}));
 await expect(chat).toBeVisible();expect(await chat.evaluate(el=>el.style.translate)).toBe('');
});

test('dense enlarged mobile prose can temporarily hide tools without losing them',async({page})=>{
 await page.setViewportSize({width:320,height:640});await page.goto('/about/?qa=1');await page.evaluate(()=>document.fonts.ready);
 // Deliberately leave no 48px gap on either side: a long continuous paragraph.
 await page.evaluate(()=>{
  const main=document.querySelector('main'),p=document.createElement('p');
  p.textContent='Reading should stay clear at every line. '.repeat(500);
  main.replaceChildren(p);main.style.cssText='padding:0;margin:0;width:100%;max-width:none';
  p.style.cssText='font-size:32px;line-height:1.5;max-width:none;margin:0';
  scrollTo({top:900,behavior:'instant'});
 });
 await expect(page.locator('.support-chat-launch')).toBeHidden();await expect(page.locator('.back-to-top')).toBeHidden();
 await expect.poll(()=>page.evaluate(proseCollisions)).toEqual([]);
 await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
 await expect(page.locator('.support-chat-launch')).toBeVisible();await expect(page.locator('.back-to-top')).toBeVisible();
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

test('real work and the maker come before the fictional homepage gallery',async({page})=>{
 await page.goto('/?qa=1');
 const order=await page.locator('.real-project-preview,.founder-strip,.home-starting-points,#website-examples').evaluateAll(nodes=>nodes.map(node=>node.id||node.classList[0]));
 expect(order).toEqual(['featured-work','founder-strip','studio-section','website-examples']);
 await expect(page.locator('.real-project-preview')).toContainText('AssetRounds');
 await expect(page.locator('.founder-strip')).toContainText('Terry');
 await expect(page.locator('#website-examples')).toContainText('fictional');
 await page.locator('.city-explore').click();
 await expect(page).toHaveURL(/#featured-work$/);
 await expect(page.locator('.real-project-preview')).toBeInViewport();
});
