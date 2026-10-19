import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {siteHeader,siteFooter} from '../src/site-chrome.mjs';
import {breadcrumbTrail} from '../src/navigation.mjs';
import {conceptPages} from '../src/portfolio-concepts.mjs';
import {validateDemo,demoOrderTotal} from '../src/assets/portfolio-concepts.js';
import {bindCostCalculator} from '../src/calculator.js';
import {priceList} from '../src/shared.mjs';

const offers=JSON.parse(await readFile(new URL('../config/offers.json',import.meta.url),'utf8'));
test('compact chrome preserves service, pricing, process and contact navigation',()=>{
 const html=siteHeader('/services/seo/');
 for(const path of ['/services/','/pricing/','/process/','/contact/'])assert.ok(html.includes(`href="${path}"`));
 assert.match(html,/href="\/services\/seo\/" aria-current="page"/);
 assert.match(html,/role="group" aria-label="Services"/);
 assert.match(html,/class="header-contact"/);
 assert.doesNotMatch(siteHeader('/contact/'),/class="header-contact"/);
 assert.doesNotMatch(siteHeader('/checkout/grow/'),/class="header-contact"/);
 const footer=siteFooter({businessIdentity:'Example & Co'});
 for(const path of ['/privacy/','/terms/','/accessibility/','/payments/','/pricing/'])assert.ok(footer.includes(`href="${path}"`));
 assert.match(footer,/Example &amp; Co/);
 assert.equal(breadcrumbTrail('/services/seo/','SEO')[1].path,'/services/');
 assert.equal(breadcrumbTrail('/work/hearthside/request/','Long title').at(-1).name,'Order preview');
});

test('pizza note is optional while real inquiry-like demos retain useful message validation',()=>{
 const sample={name:'Sample',email:'sample@example.test',message:'',concept:'hearthside',quantity:'2'};
 assert.deepEqual(validateDemo(sample),{});
 assert.ok(validateDemo({...sample,concept:'fieldwork'}).message);
 assert.ok(validateDemo({...sample,quantity:'1.5'}).quantity);
 assert.equal(demoOrderTotal('Classic cheese ($16)',2),'$32.00');
 const pages=conceptPages({config:{},offers:{}});
 const pizza=pages.find(page=>page.path==='/work/hearthside/request/').body;
 assert.match(pizza,/Order note \(optional\)/);
 assert.doesNotMatch(pizza.match(/<textarea[^>]+>/)[0],/required|minlength/);
 assert.match(pizza,/<fieldset disabled>/);
 assert.doesNotMatch(pizza,/<form[^>]+(?:action|method)=/);
 assert.ok(pizza.indexOf('Classic cheese ($16)')<pizza.indexOf('Pepperoni ($19)'));
 assert.ok(pizza.indexOf('Pepperoni ($19)')<pizza.indexOf('Garden ($18)'));
 assert.equal(pages.filter(page=>page.body.includes('studio-concept-debrief')).length,3);
});

function calculatorFixture(annual=true){
 const fields=Object.fromEntries(Object.entries({build:'focused',plan:'grow',cycles:'11',hostingMonths:'12',hostingMonthly:'25',external:'',billing:'monthly',baseline:'on',sprint:'on'}).map(([name,value])=>[name,{name,value,disabled:false,checked:name==='baseline',options:name==='billing'?[{value:'monthly'},{value:'annual'}]:[],setAttribute(){},removeAttribute(){},closest(){return null;}}]));
 const listeners={},calculator={elements:{namedItem:name=>fields[name]},addEventListener:(name,handler)=>listeners[name]=handler};
 const output=Object.fromEntries(['cost-total','cost-breakdown','calculator-error','external-note'].map(id=>[id,{textContent:''}]));
 class Data{constructor(){this.values=new Map(Object.entries(fields).filter(([name,f])=>!f.disabled&&(!['baseline','sprint'].includes(name)||f.checked)).map(([name,f])=>[name,f.value]));}get(name){return this.values.get(name)??null;}has(name){return this.values.has(name);}}
 const original=globalThis.FormData;globalThis.FormData=Data;
 const update=bindCostCalculator(calculator,{...priceList(offers),annual_available:annual},{querySelector:id=>output[id.slice(1)]});
 return {fields,output,update,event:(type,name)=>listeners[type]({target:fields[name]}),restore:()=>{globalThis.FormData=original;}};
}
test('calculator includes known hosting while naming other unknown costs',()=>{
 const f=calculatorFixture();try{
  assert.equal(f.output['calculator-error'].textContent,'');
  assert.match(f.output['cost-total'].textContent,/\$11,450 known costs/);
  assert.match(f.output['external-note'].textContent,/Still to add: domain, email and other paid tools/);
  f.fields.external.value='50';f.update();assert.match(f.output['cost-total'].textContent,/\$11,500 estimated total/);
 }finally{f.restore();}
});
test('annual toggling restores unedited defaults and preserves edited monthly counts',()=>{
 const f=calculatorFixture();try{
  f.fields.billing.value='annual';f.event('change','billing');assert.equal(f.fields.cycles.value,'12');
  assert.match(f.output['cost-breakdown'].textContent,/same 12 months billed monthly/);
  f.fields.billing.value='monthly';f.event('change','billing');assert.equal(f.fields.cycles.value,'11');
  f.fields.cycles.value='8';f.event('input','cycles');
  f.fields.billing.value='annual';f.event('change','billing');f.fields.billing.value='monthly';f.event('change','billing');
  assert.equal(f.fields.cycles.value,'8');
 }finally{f.restore();}
});
test('unverified annual enrollment cannot be selected by the calculator',()=>{
 const f=calculatorFixture(false);try{
  assert.equal(f.fields.billing.options[1].disabled,true);assert.equal(f.fields.billing.options[1].hidden,true);
  f.fields.billing.value='annual';f.event('change','billing');assert.equal(f.fields.billing.value,'monthly');
 }finally{f.restore();}
});
