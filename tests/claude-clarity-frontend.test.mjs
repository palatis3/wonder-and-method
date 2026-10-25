import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {siteHeader,siteFooter} from '../src/site-chrome.mjs';
import {breadcrumbTrail} from '../src/navigation.mjs';
import {conceptPages} from '../src/portfolio-concepts.mjs';
import {bindCostCalculator} from '../src/calculator.js';
import {priceList} from '../src/shared.mjs';

const offers=JSON.parse(await readFile(new URL('../config/offers.json',import.meta.url),'utf8'));
test('compact chrome preserves service, pricing, process and contact navigation',()=>{
 const html=siteHeader('/services/seo/');
 for(const path of ['/services/','/pricing/','/process/','/contact/#inquiry'])assert.ok(html.includes(`href="${path}"`));
 assert.match(html,/href="\/services\/seo\/" aria-current="page"/);
 assert.match(html,/role="group" aria-label="Services"/);
 assert.match(html,/class="header-contact"/);
 assert.match(html,/class="header-contact" href="\/contact\/#inquiry" aria-label="Contact"/);
 assert.doesNotMatch(siteHeader('/contact/'),/class="header-contact"/);
 assert.doesNotMatch(siteHeader('/checkout/grow/'),/class="header-contact"/);
 const footer=siteFooter({businessIdentity:'Example & Co'});
 for(const path of ['/privacy/','/terms/','/accessibility/','/payments/','/pricing/'])assert.ok(footer.includes(`href="${path}"`));
 assert.match(footer,/Example &amp; Co/);
 assert.equal(breadcrumbTrail('/services/seo/','SEO')[1].path,'/services/');
 assert.equal(breadcrumbTrail('/work/hearthside/menu/','Long title').at(-1).name,'Menu');
});

test('service navigation marks only listed current pages and keeps secondary services reachable',()=>{
 const secondary=['/services/contractor-websites/','/services/website-addons/'];
 for(const path of ['/services/','/services/web-design/','/services/website-redesign/',...secondary,'/services/seo/','/services/website-care/','/services/website-audit/']){
  const html=siteHeader(path),current=[...html.matchAll(/<a href="([^"]+)" aria-current="(?:page|location)"/g)].map(match=>match[1]);
  assert.deepEqual(current,[path]);
  assert.match(html,/class="service-navigation is-current"/);
  if(secondary.includes(path))assert.ok(siteFooter().includes(`href="${path}"`),path);
 }
});

function calculatorFixture(annual=true){
 const fields=Object.fromEntries(Object.entries({build:'focused',plan:'grow',cycles:'11',hostingMonths:'12',hostingMonthly:'25',external:'',billing:'monthly',baseline:'on',sprint:'on'}).map(([name,value])=>[name,{name,value,disabled:false,checked:name==='baseline',options:name==='billing'?[{value:'monthly'},{value:'annual'}]:[],setAttribute(){},removeAttribute(){},closest(){return null;}}]));
 const listeners={},calculator={elements:{namedItem:name=>fields[name]},querySelectorAll:()=>[],addEventListener:(name,handler)=>listeners[name]=handler};
 const output=Object.fromEntries(['cost-total','cost-breakdown','calculator-error','external-note'].map(id=>[id,{textContent:''}]));
 class Data{constructor(){this.values=new Map(Object.entries(fields).filter(([name,f])=>!f.disabled&&(!['baseline','sprint'].includes(name)||f.checked)).map(([name,f])=>[name,f.value]));}get(name){return this.values.get(name)??null;}has(name){return this.values.has(name);}}
 const original=globalThis.FormData;globalThis.FormData=Data;
 const update=bindCostCalculator(calculator,{...priceList(offers),annual_available:annual},{querySelector:id=>output[id.slice(1)]});
 return {fields,output,update,event:(type,name)=>listeners[type]({target:fields[name]}),restore:()=>{globalThis.FormData=original;}};
}
test('calculator includes known hosting while naming other unknown costs',()=>{
 const f=calculatorFixture();try{
  assert.equal(f.output['calculator-error'].textContent,'');
  assert.match(f.output['cost-total'].textContent,/Your estimate so far: \$11,425/);
  assert.match(f.output['external-note'].textContent,/Still to add: domain, email and other paid tools/);
  f.fields.external.value='50';f.update();assert.match(f.output['cost-total'].textContent,/Estimated total: \$11,475/);
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
