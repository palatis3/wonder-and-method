import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {runInNewContext} from 'node:vm';
import * as shared from '../src/shared.mjs';
import * as addons from '../src/addons.mjs';
import {addonBuildPayments} from '../src/addon-content.mjs';
import {checkoutPages} from '../src/checkout-content.mjs';
import {inquiryFormMarkup} from '../src/inquiry-form.mjs';
import {inquiryNextStep} from '../src/inquiry-next-step.mjs';
import {inquiryConfirmationHtml} from '../src/inquiry-confirmation.mjs';
import {prefillInquiryHtml} from '../src/inquiry-prefill.mjs';
import {inquiryResponseHtml} from '../src/inquiry-response.mjs';
import {bindInquirySubmission} from '../src/inquiry-submit.mjs';
import {validateInquiry} from '../src/inquiry.mjs';
import worker from '../deployment/worker.mjs';
import offers from '../config/offers.json' with {type:'json'};
import site from '../config/site.json' with {type:'json'};

const builds=['launch_site','focused_site','signature_site'],monthly=['keep_running','improve','grow'];
const fixture={name:'Synthetic owner',email:'fixture@example.test',message:'Please help with this fictional website request.'};
const decode=value=>value.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match=>[match[1],decode(match[2])]));
function nativeValues(html){
 const values={};
 for(const match of html.matchAll(/<input\b[^>]*>/g)){
  const input=attrs(match[0]);if(!input.name||/\bdisabled\b/.test(match[0])||['checkbox','radio'].includes(input.type)&&!/\bchecked\b/.test(match[0]))continue;
  values[input.name]=input.value||'';
 }
 for(const match of html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/g)){
  const options=[...match[2].matchAll(/<option\b([^>]*)>/g)],selected=options.find(option=>/\bselected\b/.test(option[1]))||options[0];
  values[attrs(match[1]).name]=attrs(selected[1]).value||'';
 }
 for(const match of html.matchAll(/<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/g))values[attrs(match[1]).name]=decode(match[2]);
 return values;
}
const visibleText=html=>html.replace(/<details\b[^>]*>([\s\S]*?)<\/details>/g,(_match,inside)=>inside.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/)?.[1]||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();

test('all checkouts lead with price and no-charge reassurance, with complete scope and payment steps in a native disclosure',()=>{
 const pages=checkoutPages(offers,{live:true});assert.equal(pages.length,8);
 for(const page of pages){
  const id=page.path.split('/')[2].replaceAll('-','_'),offer=shared.inquiryOffer(id),formStart=page.body.indexOf('<form');
  const before=page.body.slice(0,formStart),header=before.split('</header>')[0],scope=before.match(/<aside class="checkout-summary">([\s\S]*?)<\/aside>/)?.[1];
  assert.ok(scope,id);const serviceType={keep_running:' website care',improve:' monthly SEO',grow:' monthly SEO'}[id]||'';assert.match(header,new RegExp('<h1>Request '+shared.escapeHtml(offer.name)+serviceType+'</h1>'));
  assert.ok(header.includes(shared.money(offer.price)));assert.ok(page.title.includes(shared.money(offer.price)));
  assert.match(scope,/<details class="checkout-overview"><summary>What you get and when you pay<\/summary>/);
  assert.match(header,/Free to ask\. Nothing is booked or charged\./);
  assert.match(header,/cost (?:separately|extra)/);
  assert.equal(page.body.split(site.responseWindow).length-1,1,id);
  assert.doesNotMatch(page.body,/data-checkout-question|A request for review, with no payment or booking/);
  assert.ok(visibleText(before).split(/\s+/).length<=220,id+' retains a concise introduction with important costs and limits visible');
  assert.ok(page.body.includes(shared.escapeHtml(shared.inquirySubmitLabel(id,true,'checkout'))));
  if(builds.includes(id)){
   for(const milestone of offers[id].payment_schedule)assert.ok(scope.includes(shared.money(milestone.amount)));
   assert.match(scope,/after written proposal approval/);assert.match(scope,/written design approval/);assert.match(scope,/written working-site approval, before launch/);
   assert.match(scope,/No visual or drag-and-drop editor is included/);assert.match(scope,/30 calendar days after launch/);
  }
  if(monthly.includes(id)){
   assert.ok(header.includes(shared.money(offers.baseline.one_time_price+offer.price)));
   assert.match(scope,/previous Website Baseline, website I built or Audit &amp; Fix Sprint already provides a usable review/);
   assert.match(scope,/do not pay for it twice/);assert.match(scope,/New websites I build include this review/);
   assert.match(scope,/Not included in monthly care:.*updates.*backups, restores and malware cleanup/);
  }
 }
});

test('contact starts with required fields and keeps optional choices and labeled disclosures',()=>{
 const html=inquiryFormMarkup({live:true});
 assert.match(html,/<legend>What do you need\? <span class="field-note">\(optional\)<\/span><\/legend>/);
 assert.equal([...html.matchAll(/type="radio"[^>]*name="goal"/g)].length,6);
 assert.match(html,/<details class="inquiry-package-choice" id="package-choice"><summary>Already have a package in mind\? \(optional\)<\/summary>/);
 assert.ok(html.indexOf('id="name"')<html.indexOf('id="email"'));
 assert.ok(html.indexOf('id="email"')<html.indexOf('id="message"'));
 assert.ok(html.indexOf('id="message"')<html.indexOf('name="goal"'));
 assert.ok(html.indexOf('id="message"')<html.indexOf('id="service"'));
 assert.match(html,/<details class="inquiry-extra" data-project-details><summary>Website and business details \(optional\)<\/summary>/);
 assert.ok(html.indexOf('id="business"')>html.indexOf('id="message"'));
 for(const [id]of shared.inquiryChoices)assert.ok(html.includes(shared.escapeHtml(shared.inquiryChoiceLabel(id))));
 assert.match(html,/one SEO improvement a month/);assert.match(html,/two SEO improvements a month/);
 const source=html.match(/<select id="found_via"[^>]*>([\s\S]*?)<\/select>/)[1];
 assert.deepEqual([...source.matchAll(/<option value="([^"]*)"/g)].map(match=>match[1]),['','search','maps','ai','referral','social','other']);
 assert.ok(html.indexOf('id="found_via"')>html.indexOf('id="business_location"'));
 assert.match(html,/<h2>What happens next<\/h2>/);
 assert.ok(html.indexOf('Nothing is booked or charged when you send this.')<html.indexOf('type="submit"'));
 for(const value of ['google','directory','returning']){
  const restored=inquiryFormMarkup({live:true},{value:{found_via:value}});
  assert.match(restored,new RegExp(`<option value="${value}" selected>`));
  assert.equal(validateInquiry({...fixture,...nativeValues(restored)}).value.found_via,value);
 }
 assert.doesNotMatch(html,/name="(?:arrival|monthly_plan)"/);
});

test('fixed Baseline and Sprint proposals require a website; editable native forms defer the service rule to validation',()=>{
 for(const service of [...builds,...monthly,'website_baseline','audit_fix_sprint','unsure'])for(const request_kind of ['', 'question','checkout']){
  const value={service,request_kind,goal:'fix'},expected=request_kind==='checkout'&&['website_baseline','audit_fix_sprint'].includes(service);
  const html=inquiryFormMarkup({live:true},{value}),websiteTag=html.match(/<input id="website"[^>]*>/)[0];
  assert.equal(/\brequired\b/.test(websiteTag),false,service+' '+request_kind);
  if(service!=='unsure'){
   const fixed=inquiryFormMarkup({live:true},{service,checkout:true,value});
   assert.equal(/\brequired\b/.test(fixed.match(/<input id="website"[^>]*>/)[0]),request_kind!=='question'&&['website_baseline','audit_fix_sprint'].includes(service),service+' fixed '+request_kind);
  }
  assert.equal(Boolean(validateInquiry({...fixture,...value,website:''}).errors.website),expected,service+' '+request_kind);
  assert.equal(Boolean(validateInquiry({...fixture,...value,website:'not yet'}).errors.website),expected,service+' '+request_kind);
  assert.deepEqual(validateInquiry({...fixture,...value,website:'https://example.com/broken-page'}).errors,{});
 }
 for(const service of monthly){
  const html=inquiryFormMarkup({live:true},{service,checkout:true});
  assert.match(html,/Your website <span class="field-note">\(if you have one\)<\/span>/);
  assert.match(html,/No website yet, or I’m building your site\?/);
  assert.match(html,/What would you like help with each month\?/);
 }
});

test('extras appear only when relevant and survive native monthly prefill and correction without a full picker',()=>{
 const plain=inquiryFormMarkup({live:true});assert.match(plain,/<div data-inquiry-addons hidden>/);
 for(const service of builds)assert.match(inquiryFormMarkup({live:true},{service,checkout:true}),/<div data-inquiry-addons>/);
 for(const service of [...monthly,'website_baseline','audit_fix_sprint'])assert.doesNotMatch(inquiryFormMarkup({live:true},{service,checkout:true}),/data-addon-picker/);
 const extras=prefillInquiryHtml(plain,new URL('https://example.test/contact/?addons=booking_setup&request_kind=checkout'));
 assert.match(extras,/Asking about: Booking system setup \(\$400 extra\)/);
 assert.match(extras,/data-change-service href="#service" hidden/);assert.doesNotMatch(extras,/data-clear-addons[^>]* hidden/);
 const monthlyPage=prefillInquiryHtml(inquiryFormMarkup({live:true},{service:'grow',checkout:true}),new URL('https://example.test/checkout/grow/?addons=booking_setup,contact_form&goal=fix'));
 assert.doesNotMatch(monthlyPage,/data-addon-picker/);assert.match(monthlyPage,/<fieldset data-retained-addons>/);
 const values={...nativeValues(monthlyPage),...fixture},checked=validateInquiry(values);
 assert.deepEqual(checked.errors,{});assert.deepEqual(checked.value.add_ons,['booking_setup','contact_form']);assert.equal(checked.value.service,'grow');
 assert.equal(checked.value.request_kind,'checkout');assert.equal(checked.value.website,'');
 const correction=inquiryResponseHtml({...checked.value,status:422,message:'Check your message.',errors:{message:'Please add more detail.'},retry:checked.value});
 for(const id of checked.value.add_ons)assert.match(correction,new RegExp(`name="addon_${id}"[^>]* checked`));
 assert.equal(nativeValues(correction).request_kind,'checkout');
});

const migrationsDir=new URL('../deployment/migrations/',import.meta.url);
const migrations=await Promise.all((await readdir(migrationsDir)).filter(name=>name.endsWith('.sql')).sort().map(name=>readFile(new URL(name,migrationsDir),'utf8')));
function database(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(migrations.join('\n'));
 return {sqlite,prepare(sql){const statement=values=>({bind:(...next)=>statement(next),async first(){return sqlite.prepare(sql).get(...values)??null;},async all(){return {results:sqlite.prepare(sql).all(...values)};},async run(){return {meta:sqlite.prepare(sql).run(...values)};}});return statement([]);}};
}
test('neutral contact and selected monthly extras persist without inventing a request kind or sending a notification',async()=>{
 for(const [url,markup,expected]of [
  ['https://example.test/contact/?goal=redesign',inquiryFormMarkup({live:false}),{service:'unsure',kind:undefined}],
  ['https://example.test/contact/?request_kind=question&offer=improve',inquiryFormMarkup({live:false}),{service:'improve',kind:'question'}],
  ['https://example.test/checkout/grow/?addons=booking_setup&goal=fix',inquiryFormMarkup({live:false},{checkout:true,service:'grow'}),{service:'grow',kind:'checkout',extras:['booking_setup']}]
 ]){
  const db=database();let queued=0;
  try{
   const html=prefillInquiryHtml(markup,new URL(url)),values={...nativeValues(html),...fixture};
   const response=await worker.fetch(new Request('https://example.test/api/inquiries',{method:'POST',headers:{Origin:'https://example.test',Accept:'application/json','Content-Type':'application/x-www-form-urlencoded','CF-Connecting-IP':'192.0.2.12'},body:new URLSearchParams(values)}),{DB:db,ENVIRONMENT:'production',INQUIRY_MODE:'synthetic',RELEASE_APPROVED:'true',FINGERPRINT_SECRET:'synthetic-form-clarity-fingerprint-secret'},{waitUntil(){queued++;}});
   assert.equal(response.status,202);assert.equal(queued,0);
   const row=db.sqlite.prepare('SELECT payload,synthetic,delivery_status FROM inquiries').get(),saved=JSON.parse(row.payload);
   assert.equal(row.synthetic,1);assert.equal(row.delivery_status,'synthetic');assert.equal(saved.service,expected.service);assert.equal(saved.request_kind,expected.kind);
   assert.deepEqual(saved.add_ons,expected.extras);assert.equal(saved.website,'');
  }finally{db.sqlite.close();}
 }
});

const client=(await readFile(new URL('../src/client.js',import.meta.url),'utf8')).replace(/^import[^\n]*\r?\n/gm,'').replace(/^const countJourney=.*$/m,'const countJourney=__countJourney;');
function node(properties={}){
 return {value:'',textContent:'',hidden:false,disabled:false,type:'text',listeners:{},attributes:{},...properties,
  addEventListener(name,handler){(this.listeners[name]??=[]).push(handler);},dispatch(name,event={}){return this.listeners[name]?.map(handler=>handler(event)).at(-1);},
  setAttribute(name,value){this.attributes[name]=value;},hasAttribute(name){return Object.hasOwn(this.attributes,name);},
  checkValidity(){return true;},focus(){this.focused=true;},scrollIntoView(){},closest(){return null;},
  replaceChildren(...children){this.textContent=children.map(child=>child.textContent||'').join('');},append(child){this.textContent+=child.textContent||'';},querySelector(){return null;}
 };
}
function clientFixture({service='unsure',fixed=false,kind=fixed?'checkout':'',query='',selected=[]}={}){
 const fields=Object.fromEntries(Object.entries({...fixture,website:'',business:'',service,request_kind:kind,...Object.fromEntries(Object.keys(shared.inquiryContextFields).filter(key=>key!=='request_kind').map(key=>[key,'']))}).map(([name,value])=>[name,node({name,id:name,value,type:['goal','request_kind',...Object.keys(shared.inquiryContextFields).filter(key=>key!=='found_via')].includes(name)?'hidden':'text'})]));
 fields.found_via.options=shared.inquiryContextFields.found_via.options.map(([value])=>({value}));
 const checks=offers.add_ons.map(item=>{
  const row=node({hidden:!selected.includes(item.id)}),input=node({name:'addon_'+item.id,id:'inquiry-addon-'+item.id,type:'checkbox',value:'1',checked:selected.includes(item.id),disabled:fixed&&!builds.includes(service)&&!selected.includes(item.id)});
  if(fixed&&!builds.includes(service))input.attributes['data-retained-addon-input']='';input.closest=selector=>selector==='[data-retained-addon]'?row:null;return input;
 });
 const get=name=>fields[name]||checks.find(input=>input.name===name);
 const button=node({textContent:shared.inquirySubmitLabel(service,fixed,kind)}),status=node(),confirmation=node({hidden:true}),summary=node(),counts=[],sent=[];
 const addonSummary=node(),addonParts=Object.fromEntries(['names','total','project-total','payments'].map(key=>['[data-addon-'+key+']',node()]));addonSummary.querySelector=selector=>addonParts[selector];
 const websiteNote=node(),websiteLabel=node();websiteLabel.querySelector=selector=>selector==='.field-note'?websiteNote:null;
 const selectors={'[type=submit]':button,'[data-request-submit]':button,'[data-request-label]':node(),'[data-request-next]':node(),'#website-help':node(),'label[for=website]':websiteLabel,'[data-addon-alternative]':node(),'[data-addon-summary]':addonSummary};
 if(!fixed||builds.includes(service))selectors['[data-inquiry-addons]']=node();else selectors['[data-retained-addons]']=node({hidden:!selected.length});
 if(!fixed)Object.assign(selectors,{'.request-summary':node(),'[data-change-service]':node(),'[data-clear-addons]':node()});
 const form=node({action:'https://example.test/api/inquiries',dataset:{mode:'live',annualEnabled:'false',neutralMessage:String(!fixed&&!kind),...(fixed?{fixedService:service}:{})},elements:{namedItem:get}});
 form.querySelector=selector=>selectors[selector]||null;form.querySelectorAll=selector=>selector==='input[name^="addon_"]'?checks:selector==='[aria-describedby]'?Object.values(fields):[];
 form.reset=()=>{form.resetCalled=true;};
 const errors=Object.fromEntries(Object.keys(fields).map(key=>[key+'-error',node()]));
 const doc={querySelector:selector=>({'form#inquiry':form,'#inquiry':form,'#form-status':status,'#inquiry-confirmation':confirmation,'#message-help':selectors['#message-help']??=node(),'#request-summary':summary}[selector]||null),querySelectorAll:()=>[],getElementById:id=>errors[id]||null,createTextNode:text=>({textContent:text}),createElement:()=>node()};
 class FormData {constructor(){return [...Object.values(fields),...checks].filter(input=>!input.disabled&&(input.type!=='checkbox'||input.checked)).map(input=>[input.name,input.value]);}}
 const countJourney=(...args)=>counts.push(args);
 runInNewContext(client,{...shared,...addons,addonBuildPayments,inquiryNextStep,document:doc,location:new URL('https://example.test/'+query),URLSearchParams,FormData,requestAnimationFrame:fn=>fn(),__countJourney:countJourney,bindInquirySubmission:(target,options)=>bindInquirySubmission(target,{...options,document:doc,FormData,fetch:async(_url,init)=>{sent.push(JSON.parse(init.body));return {ok:true,json:async()=>({reference:'00000000-0000-4000-8000-000000000123',synthetic:false})};}})});
 return {form,fields,checks,button,selectors,summary,counts,sent,status,confirmation,change:input=>form.dispatch('change',{target:input}),submit:()=>form.dispatch('submit',{preventDefault(){}})};
}

test('enhanced service changes reveal relevant extras, keep priced context and preserve neutral analytics',()=>{
 const ui=clientFixture();assert.equal(ui.fields.request_kind.value,'');assert.equal(ui.selectors['[data-inquiry-addons]'].hidden,true);
 ui.fields.service.value='focused_site';ui.change(ui.fields.service);assert.equal(ui.selectors['[data-inquiry-addons]'].hidden,false);assert.equal(ui.button.textContent,'Send message');assert.match(ui.summary.textContent,/Focused Website \(\$2,350\)/);
 const booking=ui.checks.find(input=>input.name==='addon_booking_setup');booking.checked=true;ui.change(booking);
 ui.fields.service.value='unsure';ui.change(ui.fields.service);assert.match(ui.summary.textContent,/Asking about: Booking system setup \(\$400 extra\)/);assert.equal(ui.selectors['[data-change-service]'].hidden,true);assert.equal(ui.selectors['[data-clear-addons]'].hidden,false);
 ui.selectors['[data-clear-addons]'].dispatch('click',{preventDefault(){}});assert.equal(booking.checked,false);assert.equal(ui.selectors['[data-inquiry-addons]'].hidden,true);assert.equal(ui.fields.service.focused,true);
 ui.form.dispatch('input');assert.deepEqual(ui.counts,[['request_start','unsure']]);assert.equal(ui.fields.request_kind.value,'');
});

test('fixed-fee review wording stays consistent through native, enhanced and saved-request states',()=>{
 for(const service of ['website_baseline','audit_fix_sprint']){
  const native=inquiryFormMarkup({live:true},{service,checkout:true,offers});
  const ui=clientFixture({fixed:true,service});
  const receipt=inquiryConfirmationHtml({service,request_kind:'checkout',email:'sample@example.test',reference:'00000000-0000-4000-8000-000000000123'});
  for(const copy of [native,ui.selectors['[data-request-next]'].textContent,receipt]){
   assert.match(copy,/listed work has a fixed fee/);
   assert.match(copy,/different work is quoted separately before you decide/);
   assert.doesNotMatch(copy,/email you about the work, price/);
  }
  assert.match(native,/Nothing is booked or charged/);
  assert.match(receipt,/No payment has been taken and no project is booked/);
 }
 const switching=clientFixture({query:'?request_kind=checkout'});
 switching.fields.service.value='website_baseline';switching.change(switching.fields.service);
 assert.match(switching.selectors['[data-request-next]'].textContent,/fixed fee/);
 switching.fields.service.value='focused_site';switching.change(switching.fields.service);
 assert.doesNotMatch(switching.selectors['[data-request-next]'].textContent,/listed review/);
});

test('enhanced checkout preserves offer-specific buttons and the same website rule after query hydration',()=>{
 const build=clientFixture({fixed:true,service:'focused_site',query:'?addons=booking_setup'});assert.equal(build.button.textContent,'Request my Focused proposal');
 build.change(build.checks.find(input=>input.name==='addon_booking_setup'));assert.equal(build.button.textContent,'Request my Focused proposal');
 const care=clientFixture({fixed:true,service:'grow',query:'?goal=fix&addons=booking_setup'});assert.equal(care.fields.website.required,false);assert.equal(care.button.textContent,'Request a Grow proposal');assert.equal(care.selectors['[data-retained-addons]'].hidden,false);
 const selected=care.checks.find(input=>input.name==='addon_booking_setup');assert.equal(selected.checked,true);assert.equal(selected.disabled,false);
 const review=clientFixture({fixed:true,service:'website_baseline'});assert.equal(review.fields.website.required,true);
 const question=clientFixture({fixed:true,service:'website_baseline',query:'?request_kind=question'});assert.equal(question.fields.website.required,false);assert.equal(question.fields.request_kind.value,'question');assert.equal(question.button.textContent,'Send my Website Baseline question');
});

test('enhanced neutral and explicit question submissions retain intent and use distinct saved events',async()=>{
 for(const [query,kind,event]of [['',undefined,'inquiry_saved'],['?request_kind=question','question','question_saved']]){
  const ui=clientFixture({query});await ui.submit();assert.equal(ui.sent.length,1);assert.equal(ui.sent[0].request_kind,kind);assert.deepEqual(ui.counts,[[event,'unsure']]);assert.equal(ui.form.hidden,true);assert.equal(ui.confirmation.hidden,false);
 }
});

test('native errors share visible field labels and distinguish an unconfirmed save from a known rejection',()=>{
 for(const [service,kind,label]of [['website_baseline','checkout','Website or social page'],['grow','checkout','Website or social page'],['unsure','question','Website or social page']]){
  const html=inquiryResponseHtml({service,request_kind:kind,status:422,message:'Check these details.',errors:{service:'Choose a service.',website:'Check this entry.'},retry:{...fixture,service,request_kind:kind}});
  assert.ok(html.includes(label+': Check this entry.'));assert.match(html,/Package or service: Choose a service\./);assert.doesNotMatch(html,/Which plan\?/);
 }
 assert.match(inquiryResponseHtml({status:503,message:'The save is unconfirmed.'}),/Your message is not confirmed yet/);
 assert.match(inquiryResponseHtml({status:429,message:'Please wait before trying again.'}),/Your message wasn’t sent yet/);
});


test('native need choices retain each actual goal and never manufacture a default goal',()=>{
 const neutral=validateInquiry({...nativeValues(inquiryFormMarkup({live:false})),...fixture}).value;
 assert.equal(neutral.goal,undefined);assert.equal(neutral.service,'unsure');assert.equal(neutral.care_interest,undefined);
 for(const [goal]of shared.inquiryContextFields.goal.options){
  const html=prefillInquiryHtml(inquiryFormMarkup({live:false}),new URL('https://example.test/contact/?goal='+goal));
  const values=nativeValues(html);assert.equal(values.goal,goal);assert.equal(validateInquiry({...values,...fixture}).value.goal,goal);
  assert.equal([...html.matchAll(/type="radio"[^>]* checked/g)].length,1);
 }
});

test('monthly interest preserves website intent, price, receipts and correction',()=>{
 for(const service of builds)for(const care_interest of ['keep_running','improve','grow','discuss']){
  const html=prefillInquiryHtml(inquiryFormMarkup({live:false},{service,checkout:true}),new URL('https://example.test/checkout/'+service.replaceAll('_','-')+'/?care_interest='+care_interest));
  const values={...nativeValues(html),...fixture};const checked=validateInquiry(values);
  assert.deepEqual(checked.errors,{});assert.equal(checked.value.care_interest,care_interest);assert.equal(checked.value.service,service);assert.equal(checked.value.request_kind,'checkout');assert.equal(checked.value.billing,undefined);
  assert.equal([...html.matchAll(/name="care_interest"/g)].length,1);assert.match(html,/Nothing is added to the website price or enrolled automatically/);
  const correction=inquiryResponseHtml({...checked.value,status:422,message:'Check your email.',errors:{email:'Check the address.'},retry:checked.value});assert.equal(nativeValues(correction).care_interest,care_interest);
  const receipt=inquiryConfirmationHtml({...checked.value,reference:'00000000-0000-4000-8000-000000000123',synthetic:true});assert.match(receipt,/Monthly help to discuss after launch \(not enrolled\)/);
  const cost=shared.calculateCost(shared.priceList(offers),{build:service.replace('_site',''),plan:'none',care_interest,hostingMonthly:0,external:0});assert.equal(cost.total,offers[service].public_price);
 }
 for(const service of [...monthly,'website_baseline','audit_fix_sprint','unsure'])assert.equal(validateInquiry({...fixture,service,care_interest:'grow'}).value.care_interest,undefined);
 assert.ok(validateInquiry({...fixture,service:'launch_site',care_interest:'free_forever'}).errors.care_interest);
 const changed=structuredClone(offers);changed.plans.keep_running.monthly_price=177;changed.plans.keep_running.public_name='Steady';assert.match(inquiryFormMarkup({live:false},{service:'launch_site',checkout:true,offers:changed}),/Steady — \$177\/month/);
});

test('native and JSON save monthly interest as nonbinding context without notification or enrollment',async()=>{
 for(const service of ['focused_site','unsure'])for(const native of [false,true]){
  const db=database();let queued=0;
  try{
   const values={...fixture,service,request_kind:'checkout',goal:'new_website',care_interest:'improve'};
   const response=await worker.fetch(new Request('https://example.test/api/inquiries',{method:'POST',headers:{Origin:'https://example.test',Accept:'application/json','Content-Type':native?'application/x-www-form-urlencoded':'application/json','CF-Connecting-IP':'192.0.2.35'},body:native?new URLSearchParams(values):JSON.stringify(values)}),{DB:db,ENVIRONMENT:'production',INQUIRY_MODE:'synthetic',RELEASE_APPROVED:'true',FINGERPRINT_SECRET:'synthetic-monthly-interest-secret-long-enough'},{waitUntil(){queued++;}});
   assert.equal(response.status,202);assert.equal(queued,0);const result=await response.json();assert.equal(result.care_interest,'improve');
   const row=db.sqlite.prepare('SELECT payload,synthetic,delivery_status FROM inquiries').get(),saved=JSON.parse(row.payload);
   assert.equal(saved.care_interest,'improve');assert.equal(saved.service,service);assert.equal(saved.billing,undefined);assert.equal(row.synthetic,1);assert.equal(row.delivery_status,'synthetic');
  }finally{db.sqlite.close();}
 }
});

test('changing away from a build clears monthly interest and changing back does not silently restore it',()=>{
 const ui=clientFixture({service:'launch_site',query:'?care_interest=grow'});assert.equal(ui.fields.care_interest.value,'grow');assert.equal(ui.fields.care_interest.disabled,false);
 ui.fields.service.value='improve';ui.change(ui.fields.service);assert.equal(ui.fields.care_interest.value,'');assert.equal(ui.fields.care_interest.disabled,true);
 ui.fields.service.value='focused_site';ui.change(ui.fields.service);assert.equal(ui.fields.care_interest.value,'');assert.equal(ui.fields.care_interest.disabled,false);
});


test('monthly interest survives an undecided package only for an explicit website goal',()=>{
 for(const goal of ['new_website','redesign','fix','care','search','unsure']){
  const html=prefillInquiryHtml(inquiryFormMarkup({live:false}),new URL('https://example.test/contact/?goal='+goal+'&care_interest=grow'));
  const value=validateInquiry({...nativeValues(html),...fixture}).value;
  assert.equal(value.service,'unsure');assert.equal(value.goal,goal);assert.equal(value.care_interest,['new_website','redesign'].includes(goal)?'grow':undefined);
 }
 const ui=clientFixture({query:'?goal=new_website&care_interest=grow'});assert.equal(ui.fields.care_interest.value,'grow');assert.equal(ui.fields.care_interest.disabled,false);
 ui.fields.goal.value='fix';ui.change(ui.fields.goal);assert.equal(ui.fields.care_interest.value,'');assert.equal(ui.fields.care_interest.disabled,true);
 ui.fields.goal.value='redesign';ui.change(ui.fields.goal);assert.equal(ui.fields.care_interest.value,'');assert.equal(ui.fields.care_interest.disabled,false);
});
