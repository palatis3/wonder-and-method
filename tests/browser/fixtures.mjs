import {test as base,expect} from '@playwright/test';

export const test=base.extend({
 context:async({context},use)=>{
  // Never let a test reach production or third-party endpoints. A forgotten API
  // mock is a failing request, never a real submission or measurement event.
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin!=='http://127.0.0.1:4187')return route.abort('blockedbyclient');
   if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Unmocked API blocked by browser test.'})});
   return route.continue();
  });
  await use(context);
 }
});
export {expect};
