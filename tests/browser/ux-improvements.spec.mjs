import {test,expect} from './fixtures.mjs';

test('ambiguous exact place names remain visible with their official state and type',async({page})=>{
 await page.goto('/areas/?qa=1');
 const search=page.getByRole('searchbox',{name:'County, parish, municipio, region or community'});
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
