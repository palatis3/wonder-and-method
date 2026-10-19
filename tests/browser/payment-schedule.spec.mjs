import {test,expect} from './fixtures.mjs';

test('all pricing tables preserve words and currency and scroll by keyboard on narrow screens',async({page})=>{
 for(const width of [320,390]){
  await page.setViewportSize({width,height:844});await page.goto('/pricing/?qa=payment-table');await page.evaluate(()=>document.fonts.ready);
  for(const details of await page.locator('main details').all()){
   const summary=details.locator(':scope > summary');await summary.focus();await page.keyboard.press('Enter');await expect(details).toHaveAttribute('open','');
  }
  const tables=page.locator('main table');await expect(tables).toHaveCount(4);
  let amounts=0;
  for(const table of await tables.all()){
   const region=table.locator('..');await expect(region).toHaveAttribute('role','region');await expect(region).toHaveAttribute('tabindex','0');
   await region.scrollIntoViewIfNeeded();
   const tokens=await table.locator('th,td').evaluateAll(elements=>elements.flatMap(el=>{
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),tokens=[];let node;
    while(node=walker.nextNode())for(const match of node.textContent.matchAll(/\$[\d,]+(?:\.\d{2})?|[A-Za-z]+/g)){
     const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);tokens.push({text:match[0],lines:range.getClientRects().length});
    }return tokens;
   }));
   amounts+=tokens.filter(token=>token.text.startsWith('$')).length;
   for(const token of tokens)expect(token.lines,width+'px '+token.text+' must remain intact').toBe(1);
   expect(await region.evaluate(el=>el.scrollWidth>el.clientWidth),width+'px table must scroll internally').toBe(true);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+'px page must not overflow').toBe(true);
   await region.focus();await expect(region).toBeFocused();
   for(let step=0;step<30;step++)await page.keyboard.press('ArrowRight');
   await expect.poll(()=>region.evaluate(el=>el.scrollWidth-el.clientWidth-el.scrollLeft)).toBeLessThanOrEqual(1);
  }
  expect(amounts).toBe(21);
  await expect(page.getByRole('region',{name:'Website payment schedule',exact:true})).toHaveAccessibleDescription('Scroll horizontally to view all payment stages on a small screen.');
 }
});
