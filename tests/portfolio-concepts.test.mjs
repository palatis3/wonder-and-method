import offers from '../config/offers.json' with {type:'json'};
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {conceptPages,conceptCatalog} from '../src/portfolio-concepts.mjs';
import {validateDemo,bindConceptDemo} from '../src/assets/portfolio-concepts.js';

test('every concept has an overview, a service and a request with resolvable internal links',()=>{
 const pages=conceptPages({config:{},offers}),paths=new Set(pages.map(p=>p.path));
 assert.equal(pages.length,9);
 assert.equal(new Set(pages.map(p=>p.description)).size,pages.length);
 assert.equal(paths.size,conceptCatalog.length*3);
 for(const c of conceptCatalog)for(const path of [c.path,c.servicePath,c.requestPath])assert.ok(paths.has(path));
 for(const page of pages){
  assert.match(page.body,/Fictional concept — not a client project/);
  assert.equal((page.body.match(/<h1[ >]/g)||[]).length,1);
  assert.match(page.body,/aria-current="page"/);
  for(const [,href]of page.body.matchAll(/href="([^"#]+)[^"]*"/g)){
   const path=new URL(href,'https://example.test').pathname;
   if(path.startsWith('/work/')&&path!=='/work/')assert.ok(paths.has(path),`${page.path} links to missing ${path}`);
  }
 }
});
test('request pages are inert without the demo script and cannot target production intake',()=>{
 for(const page of conceptPages().filter(p=>p.path.endsWith('/request/'))){
  assert.match(page.body,/<fieldset disabled>/);
  assert.match(page.body,/nothing is sent or saved/i);
  assert.doesNotMatch(page.body,/<form[^>]+(?:action|method)=/);
  assert.doesNotMatch(page.body,/\/api\/|mailto:|https?:\/\//);
 }
});
test('local demo validates useful sample inputs',()=>{
 assert.deepEqual(Object.keys(validateDemo({})),['name','email','message']);
 assert.ok(validateDemo({name:'Sample',email:'not-an-email',message:'short'}).email);
 assert.ok(validateDemo({name:'Sample',email:'sample@example.test',message:'   short   '}).message);
 assert.deepEqual(validateDemo({name:'Sample',email:'sample@example.test',message:'A fictional request with enough detail.'}),{});
});
function element(value=''){return {value,hidden:false,textContent:'',attributes:{},listeners:{},focus(){this.focused=true;},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},addEventListener(k,fn){this.listeners[k]=fn;}};}
function fixture({concept='example',services=['Example service']}={}){
 const controls=Object.fromEntries(['name','email','message','service'].map(k=>[k,element()]));controls.service.options=services.map(value=>({value}));controls.service.value=services[0];
 const sample=element(),reset=element(),fieldset={disabled:true};
 const outputs=Object.fromEntries(['name','email','message','service'].map(k=>[k,element()]));
 const errors=Object.fromEntries(['name','email','message'].map(k=>[`concept-${k}-error`,element()]));
 const confirmation=element();confirmation.hidden=true;confirmation.querySelector=s=>s==='[data-demo-reset]'?reset:outputs[s.match(/data-demo-(\w+)/)[1]];
 const form=element();Object.assign(form,{dataset:{concept},elements:{namedItem:k=>controls[k]},parentElement:{querySelector:()=>confirmation},querySelector:s=>s==='.concept-sample'?sample:fieldset,reset(){for(const field of Object.values(controls))field.value='';controls.service.value=services[0];}});
 return {form,controls,sample,reset,fieldset,outputs,errors,confirmation,doc:{getElementById:id=>errors[id]}};
}
test('demo blocks native submit, reports errors, shows safe text and clears ephemeral data',()=>{
 const f=fixture();bindConceptDemo(f.form,f.doc);assert.equal(f.fieldset.disabled,false);
 let prevented=0;const event={preventDefault(){prevented++;}};
 f.form.listeners.submit(event);assert.equal(prevented,1);assert.equal(f.controls.name.focused,true);assert.equal(f.confirmation.hidden,true);assert.ok(f.errors['concept-email-error'].textContent);
 f.sample.listeners.click();assert.equal(f.controls.email.value,'sample@example.test');assert.equal(f.controls.service.focused,true);
 f.controls.message.value='<img src=x onerror=alert(1)> This is text only.';
 f.form.listeners.submit(event);assert.equal(prevented,2);assert.equal(f.form.hidden,true);assert.equal(f.confirmation.hidden,false);assert.equal(f.confirmation.focused,true);assert.equal(f.outputs.message.textContent,f.controls.message.value);assert.equal(f.outputs.service.textContent,'Example service');
 f.reset.listeners.click();assert.equal(f.form.hidden,false);assert.equal(f.confirmation.hidden,true);assert.equal(f.controls.email.value,'');assert.equal(f.outputs.message.textContent,'');assert.equal(f.sample.focused,true);
});
test('demo module has no networking or persistence capabilities',async()=>{
 const source=await readFile(new URL('../src/assets/portfolio-concepts.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|sendBeacon)\b/);
 assert.doesNotMatch(source,/\.innerHTML\s*=|\.submit\s*\(/);
});
test('an old Northline service link selects the new label and survives resetting the preview',t=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'location');
 Object.defineProperty(globalThis,'location',{value:{search:'?service=Interior%20layout%20conversation'},configurable:true});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'location',previous);else delete globalThis.location;});
 const f=fixture({concept:'northline',services:['Kitchen remodeling','Bathroom remodeling','Interior layout changes']});
 bindConceptDemo(f.form,f.doc);
 assert.equal(f.controls.service.value,'Interior layout changes');
 f.sample.listeners.click();f.form.listeners.submit({preventDefault(){}});
 assert.equal(f.outputs.service.textContent,'Interior layout changes');
 f.reset.listeners.click();
 assert.equal(f.controls.service.value,'Interior layout changes');
 assert.equal(f.outputs.service.textContent,'');
 assert.equal(f.fieldset.disabled,false);
});
test('original concept illustrations remain self-contained accessible SVGs',async()=>{
 for(const item of conceptCatalog){
  const svg=await readFile(new URL(`../src/assets/work/concepts/${item.id}.svg`,import.meta.url),'utf8');
  assert.match(svg,/width="1200" height="900"/);
  assert.match(svg,/<title\b/);assert.match(svg,/<desc\b/);
  assert.doesNotMatch(svg,/<(?:script|foreignObject|image)\b/);
  assert.doesNotMatch(svg,/(?:href|src)="(?:https?:|\/\/)/);
 }
});

test('website preview assets contain actual desktop and phone WebP captures',async()=>{
 for(const item of conceptCatalog)for(const asset of [item.image,item.phoneImage]){
  const bytes=await readFile(new URL(`../src${asset}`,import.meta.url));
  assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');assert.ok(bytes.length<100000);
 }
});
