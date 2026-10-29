import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import offers from '../config/offers.json' with {type:'json'};
import {calculateWebsiteRoi,parseMoneyInput,roiFields,breakEvenDisplayBound} from '../src/assets/roi-math.mjs';
import {websiteRoiPage} from '../src/website-roi.mjs';
import {costCalculator} from '../src/audit-content.mjs';
import {bindCostCalculator} from '../src/calculator.js';
import {priceList} from '../src/shared.mjs';
import {leadWorkbench} from '../src/lead-workbench.mjs';

const scenario={oneTime:2350,monthlyCost:180,months:12,inquiries:4,closeRate:25,contribution:500};

test('large ROI assumptions prompt checking without clipping valid values or fabricating break-even',()=>{
 assert.deepEqual(calculateWebsiteRoi(scenario).checks,[]);
 const extreme={oneTime:1000000000,monthlyCost:1000000000,months:120,inquiries:1000000,closeRate:100,contribution:1000000000};
 const r=calculateWebsiteRoi(extreme);assert.equal(r.ok,true);assert.deepEqual(r.values,extreme);assert.equal(r.checks.length,4);
 for(const key of ['totalCost','totalContribution','net','roiPercent','expectedJobs','paybackMonths','breakEvenInquiries'])assert.ok(Number.isFinite(r[key]),key);
 assert.equal(calculateWebsiteRoi({...scenario,closeRate:0}).breakEvenInquiries,null);
 assert.equal(calculateWebsiteRoi({...scenario,contribution:0}).paybackMonths,null);
 const free=calculateWebsiteRoi({...scenario,oneTime:0,monthlyCost:0});assert.equal(free.roiPercent,null);assert.equal(free.breakEvenInquiries,0);
 const html=websiteRoiPage();assert.ok(html.indexOf('class="roi-next"')>html.indexOf('id="roi-output"'));assert.ok(html.indexOf('class="roi-next"')<html.indexOf('id="worked-example"'));
 assert.match(html,/Ask about your website/);assert.doesNotMatch(html,/Discuss your website scope/);
});

test('currency inputs accept common formatting without guessing malformed amounts',()=>{
 for(const text of ['2350.50','$2,350.50','  $ 2,350.50  ','2 350.50','2\u00a0350.50','2\u202f350.50',2350.5])assert.deepEqual(parseMoneyInput(text),{ok:true,value:2350.5},String(text));
 for(const text of ['$0','0.00','$.00','.00',0])assert.equal(parseMoneyInput(text).value,0);
 for(const text of ['2,35','23,50','2,,350','2,350,00','2 35 0','2,350 000','$2$350','$\n2350','2350 USD','2350$','2.350,50','1e3','0x10','Infinity',true,null,undefined])assert.equal(parseMoneyInput(text).ok,false,String(text));
 for(const text of ['2.001','$2,350.000',0.001])assert.equal(parseMoneyInput(text).reason,'precision');
 assert.equal(parseMoneyInput('   ').reason,'empty');assert.equal(parseMoneyInput('-1').reason,'range');
 assert.equal(parseMoneyInput('$1,000,000',{max:1000000}).ok,true);assert.equal(parseMoneyInput('$1,000,000.01',{max:1000000}).reason,'range');
});

test('formatted ROI money preserves the calculation and percentage values remain percentages',()=>{
 const plain=calculateWebsiteRoi(scenario),formatted=calculateWebsiteRoi({...scenario,oneTime:'$2,350',monthlyCost:'$180.00',contribution:'$500'});
 assert.deepEqual(formatted,plain);assert.equal(plain.totalCost,4510);assert.equal(plain.net,1490);assert.equal(plain.monthlyNet,320);assert.equal(plain.paybackMonths,2350/320);
 assert.equal(calculateWebsiteRoi({...scenario,closeRate:'2.5'}).expectedJobs,1.2000000000000002);
 assert.equal(calculateWebsiteRoi({...scenario,closeRate:'25%'}).ok,false);
 assert.equal(calculateWebsiteRoi({...scenario,closeRate:'101'}).ok,false);
 const errors=calculateWebsiteRoi({...scenario,oneTime:'',monthlyCost:'1.005',months:'0',closeRate:'101',contribution:'$1,23'}).errors;
 assert.match(errors.oneTime,/Enter an amount, like 2350/);assert.match(errors.monthlyCost,/whole dollars or cents/);assert.match(errors.months,/whole number of months from 1 to 120/);assert.match(errors.closeRate,/percentage from 0 to 100/);assert.match(errors.contribution,/like 2350 or \$2,350.00/);
});

test('ROI preset uses offer prices and a reconciled provider assumption with formulas still available',()=>{
 const html=websiteRoiPage();
 assert.match(html,/name="oneTime" type="text" inputmode="decimal" value="2995"/);
 assert.match(html,/name="monthlyCost" type="text" inputmode="decimal" value="179"/);
 assert.match(html,/name="closeRate" type="number" inputmode="decimal" min="0" max="100"/);
 assert.match(html,/25 means one in four/);assert.match(html,/optional Website Care/);
 assert.match(html,/<details><summary>How this is calculated<\/summary>/);
 assert.match(html,/\$20\/month hosting and \$120\/year/);assert.match(html,/\$5,143/);assert.match(html,/\$857/);
 const revised=websiteRoiPage({...offers,focused_site:{...offers.focused_site,public_price:2500},plans:{...offers.plans,keep_running:{...offers.plans.keep_running,monthly_price:175}}});
 assert.match(revised,/name="oneTime" type="text" inputmode="decimal" value="2500"/);assert.match(revised,/name="monthlyCost" type="text" inputmode="decimal" value="205"/);assert.match(revised,/\$4,960/);
 const estimator=costCalculator(offers);for(const name of ['hostingMonthly','external'])assert.match(estimator,new RegExp('name="'+name+'" type="text" inputmode="decimal"'));
 for(const name of ['cycles','hostingMonths','hostingMonthly','external'])assert.match(estimator,new RegExp('aria-describedby="cost-'+name+'-error"'));
});

function costFixture(initial={}){
 const fields=Object.fromEntries(Object.entries({build:'focused',plan:'improve',cycles:'12',hostingMonths:'12',hostingMonthly:'10',external:'20',billing:'monthly',baseline:'on',sprint:'on',...initial}).map(([name,value])=>[name,{name,value,disabled:false,checked:name==='baseline',attributes:{},options:[],setAttribute(key,value){this.attributes[key]=value;},removeAttribute(key){delete this.attributes[key];},closest(selector){return selector==='details'&&['external','hostingMonthly','hostingMonths'].includes(name)?disclosure:null;}}]));
 const disclosure={open:false,parentElement:null},listeners={},calculator={elements:{namedItem:name=>fields[name]},addEventListener:(type,handler)=>listeners[type]=handler,querySelector:()=>null,querySelectorAll:selector=>selector==='[data-cost-months]'?[]:Object.values(fields).filter(field=>field.attributes['aria-invalid']==='true')};
 const output=Object.fromEntries(['cost-total','cost-breakdown','calculator-error','external-note',...['cycles','hostingMonths','hostingMonthly','external'].map(name=>'cost-'+name+'-error')].map(id=>[id,{textContent:''}]));
 class Data{constructor(){this.values=new Map(Object.entries(fields).filter(([name,field])=>!field.disabled&&(!['baseline','sprint'].includes(name)||field.checked)).map(([name,field])=>[name,field.value]));}get(name){return this.values.get(name)??null;}has(name){return this.values.has(name);}}
 const original=globalThis.FormData;globalThis.FormData=Data;
 const update=bindCostCalculator(calculator,priceList(offers),{querySelector:selector=>output[selector.slice(1)]});
 return {fields,output,disclosure,update,listeners,restore:()=>{globalThis.FormData=original;}};
}

test('cost estimate itemizes entered domain/tools and keeps dollars and cents in the total',()=>{
 const app=costFixture();try{
  assert.equal(app.output['cost-total'].textContent,'Estimated total: $7,923');
  assert.equal(app.output['cost-breakdown'].textContent,'$2,995 one-time + 12 monthly payments of $399. Direct hosting (12 months): $120. Domain, email and tools: $20.');
  app.fields.external.value='$2,350.50';app.fields.hostingMonthly.value='$10.25';app.update();
  assert.equal(app.output['cost-total'].textContent,'Estimated total: $10,256.50');assert.match(app.output['cost-breakdown'].textContent,/Direct hosting \(12 months\): \$123\. Domain, email and tools: \$2,350.50\./);
  app.fields.external.value=' ';app.update();assert.match(app.output['cost-total'].textContent,/Your estimate so far: \$7,906/);assert.doesNotMatch(app.output['cost-breakdown'].textContent,/Domain, email and tools:/);
 }finally{app.restore();}
});

test('cost inputs show individual errors and reveal invalid fields inside outside-cost details',()=>{
 const app=costFixture();try{
  app.fields.hostingMonthly.value='$1,00';app.fields.external.value='10.001';app.fields.cycles.value='1e1';app.update();
  assert.equal(app.output['cost-total'].textContent,'Check the highlighted fields');assert.equal(app.disclosure.open,true);
  for(const name of ['hostingMonthly','external','cycles'])assert.equal(app.fields[name].attributes['aria-invalid'],'true');
  assert.match(app.output['cost-hostingMonthly-error'].textContent,/Enter an amount like/);assert.match(app.output['cost-external-error'].textContent,/whole dollars or cents/);assert.match(app.output['cost-cycles-error'].textContent,/whole number of months/);
  app.fields.hostingMonthly.value='20';app.fields.external.value='0';app.fields.cycles.value='12';app.fields.hostingMonths.value='11';app.listeners.input({target:app.fields.hostingMonths});assert.match(app.output['cost-hostingMonths-error'].textContent,/cover all selected months/);
  app.fields.hostingMonths.value='12';app.update();assert.equal(app.output['calculator-error'].textContent,'');for(const name of ['hostingMonthly','external','cycles','hostingMonths']){assert.equal(app.fields[name].attributes['aria-invalid'],undefined);assert.equal(app.output['cost-'+name+'-error'].textContent,'');}
 }finally{app.restore();}
});

test('a Roadmap and Repair Sprint remain distinct services with proposal-specific reuse credits',()=>{
 const app=costFixture({build:'existing',plan:'none',hostingMonthly:'',external:''});try{
  assert.equal(app.output['cost-breakdown'].textContent,'$199 one-time.');assert.match(app.output['cost-total'].textContent,/\$199/);
  app.fields.sprint.checked=true;app.update();assert.equal(app.fields.baseline.disabled,false);assert.equal(app.output['cost-breakdown'].textContent,'$1,048 one-time (including website review: $199).');
 }finally{app.restore();}
});

test('ROI controller renders complete scenarios, individual errors and reset without sending entries',async()=>{
 const source=(await readFile(new URL('../src/assets/website-roi.js',import.meta.url),'utf8')).replace(/^import [^\n]+\n/gm,'');
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,textContent:'',innerHTML:'',querySelector(){return null;},attributes:{},focus(){this.focused=true;},setAttribute(name,value){this.attributes[name]=value;},removeAttribute(name){delete this.attributes[name];},replaceChildren(){this.innerHTML='';}});return nodes.get(id);};
 const form=get('website-roi'),listeners={};form.elements=Object.fromEntries(Object.entries(scenario).map(([key,value])=>[key,Object.assign(get('roi-'+key),{value:String(value)})]));form.addEventListener=(type,handler)=>{listeners[type]=handler;};
 const timers=[],counts=[];runInNewContext(source,{calculateWebsiteRoi,roiFields,breakEvenDisplayBound,countJourney(...args){counts.push(args);},Intl,setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},document:{getElementById:get}});
 assert.equal(get('roi-results').hidden,false);assert.equal(get('roi-results-title').focused,undefined);
 assert.deepEqual(counts,[]);
 form.elements.oneTime.value='$2,350';listeners.submit({preventDefault(){}});
 assert.equal(get('roi-results').hidden,false);assert.match(get('roi-output').innerHTML,/Money left after website costs/);assert.match(get('roi-output').innerHTML,/\$1,490/);assert.match(get('roi-output').innerHTML,/scope="col">Inquiries/);assert.match(get('roi-output').innerHTML,/scope="col">Net/);
 form.elements.oneTime.value='$2,35';listeners.input();assert.equal(get('roi-results').hidden,false);assert.equal(get('roi-stale').hidden,false);listeners.submit({preventDefault(){}});assert.equal(form.elements.oneTime.attributes['aria-invalid'],'true');assert.equal(form.elements.oneTime.focused,true);
 form.elements.oneTime.value='2350';listeners.reset();timers.at(-1)();assert.equal(get('roi-results').hidden,false);assert.match(get('roi-output').innerHTML,/\$1,490/);assert.equal(form.elements.oneTime.attributes['aria-invalid'],undefined);
 listeners.input();timers.at(-1)();assert.deepEqual(counts,[['roi_calculate']]);
 for(const [values,expected] of [
  [{oneTime:'0.10',monthlyCost:'0.20',months:'1',contribution:'0.30'},'1'],
  [{oneTime:'0.11',monthlyCost:'0.20',months:'1',contribution:'0.30'},'2'],
  [{oneTime:'0',monthlyCost:'0',months:'1',contribution:'0'},'0'],
  [{oneTime:'1',monthlyCost:'0',months:'1',contribution:'0'},'Not reachable']
 ]){for(const [key,value] of Object.entries(values))form.elements[key].value=value;listeners.input();timers.at(-1)();assert.match(get('roi-output').innerHTML,new RegExp('class="roi-primary-number">'+expected+'<'),'Whole-customer break-even threshold handles cents and zero values');}
});

test('inquiry tracker keeps storage and download boundaries and links to relevant add-ons',async()=>{
 const html=leadWorkbench(),controller=await readFile(new URL('../src/assets/lead-workbench.js',import.meta.url),'utf8');
 assert.match(html,/<h1>Inquiry tracker demo/);assert.match(html,/anyone using this browser can open its saved data/);assert.match(html,/Use made-up data only/);assert.match(html,/Reset clears the demo’s browser data; it does not delete downloaded copies/);assert.match(html,/href="\/services\/website-addons\/"/);assert.doesNotMatch(html,/Try it in three steps/);
 assert.doesNotMatch(controller,/synthetic records|Synthetic changes/);assert.match(controller,/a.download='inquiry-tracker-demo.csv'/);
});
