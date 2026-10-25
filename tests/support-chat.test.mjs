import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {supportChatConfig,supportChatMarkup,supportChatCsp} from '../src/support-chat.mjs';

const config=()=>({mode:'production',formMode:'live',supportChat:{enabled:true,provider:'tawk',propertyId:'0123456789abcdef01234567',widgetId:'12345abcde',verified:true},privacy:{chat:'Optional chat disclosure',processors:[{name:'tawk.to'}]}});
test('chat requires actual identifiers, verified delivery and privacy, and stays out of review/staging',()=>{
 const c=config();
 assert.ok(supportChatMarkup(c).includes('https://embed.tawk.to/0123456789abcdef01234567/12345abcde'));
 assert.equal(supportChatConfig({...c,reviewOnly:true}),null);
 assert.equal(supportChatConfig({...c,mode:'staging',formMode:'synthetic'}),null);
 assert.equal(supportChatCsp({...c,supportChat:{enabled:false}}),null);
 assert.equal(supportChatCsp(c).script,'https://embed.tawk.to https://cdn.jsdelivr.net/emojione/2.2.7/lib/js/emojione.min.js');
 assert.doesNotMatch(JSON.stringify(supportChatCsp(c)),/fonts\.googleapis|fonts\.gstatic/);
 assert.doesNotMatch(supportChatCsp(c).script,/\*\.tawk\.to/);
 for(const mutation of [{propertyId:'not-a-property'},{widgetId:'../script'},{verified:false}])assert.throws(()=>supportChatConfig({...c,supportChat:{...c.supportChat,...mutation}}));
 assert.throws(()=>supportChatConfig({...c,privacy:{processors:[{name:'tawk.to'}]}}));
 assert.throws(()=>supportChatConfig({...c,privacy:{chat:'Text',processors:[]}}));
});

const source=await readFile(new URL('../src/assets/support-chat.js',import.meta.url),'utf8');
function browser({inline=false}={}){
 const events={},dismissEvents={},appended=[],timeouts=new Map();let focused='';
 const classList={add(){},remove(){},toggle(){}};
 const status={textContent:''},label={textContent:'Chat with Terry'};
 const link={focus:()=>{focused='fallback';document.activeElement=link;}};
 const fallback={hidden:true,querySelector:()=>link};
 const dismiss={addEventListener:(name,callback)=>dismissEvents[name]=callback};
 const trigger={hidden:true,classList,attributes:{},setAttribute(k,v){this.attributes[k]=v;},focus:()=>{focused='opener';document.activeElement=trigger;},getClientRects:()=>[{}],querySelector:()=>label,addEventListener:(name,callback)=>events[name]=callback};
 const root={hidden:false,classList,dataset:{chatScript:'https://embed.tawk.to/0123456789abcdef01234567/12345abcde'},querySelector:s=>s==='.support-chat-fallback'?fallback:s==='.support-chat-launch'?(inline?null:trigger):dismiss};
 const footerLink={hidden:false,getClientRects:()=>[{}],focus:()=>focused='footer'};
 const window={addEventListener(){}};let nextTimer=0,maximized=0,hidden=0;
 const document={body:{},activeElement:null,documentElement:{classList},dispatchEvent(){},querySelector:s=>s==='.support-chat'?root:s==='#support-chat-status'?status:s==='footer a[href="#page-top"]'?footerLink:null,querySelectorAll:s=>s==='[data-chat-open]'&&inline?[trigger]:[],createElement:()=>({events:{},addEventListener(name,callback){this.events[name]=callback;}}),head:{append:el=>appended.push(el)}};
 runInNewContext(source,{window,document,Event:class{},getComputedStyle:()=>({visibility:'visible',display:'block'}),matchMedia:()=>({matches:false,addEventListener(){}}),scrollY:0,MutationObserver:class{observe(){}disconnect(){}},setTimeout:fn=>{timeouts.set(++nextTimer,fn);return nextTimer;},clearTimeout:id=>timeouts.delete(id)});
 const load=()=>{window.Tawk_API.maximize=()=>maximized++;window.Tawk_API.hideWidget=()=>hidden++;window.Tawk_API.onBeforeLoad();window.Tawk_API.onLoad();};
 return {launcher:trigger,label,fallback,root,status,focus:()=>focused,appended,timeouts,click:()=>{document.activeElement=trigger;events.click();},moveFocus:()=>{document.activeElement={};},dismiss:()=>dismissEvents.click(),load,counts:()=>({maximized,hidden})};
}
test('chat has no external request until clicked and loads once before opening',()=>{
 const b=browser();assert.equal(b.launcher.hidden,false);assert.equal(b.appended.length,0);
 b.click();b.click();assert.equal(b.appended.length,1);assert.equal(b.launcher.attributes['aria-disabled'],'true');
 assert.match(b.appended[0].src,/^https:\/\/embed\.tawk\.to\//);
 b.load();assert.equal(b.timeouts.size,1);assert.equal(b.root.hidden,true);assert.deepEqual(b.counts(),{maximized:1,hidden:0});
});
test('chat connection failure exposes the contact fallback and dismissal prevents a late popup',()=>{
 for(const failure of ['error','timeout']){
  const b=browser();b.click();
  if(failure==='error')b.appended[0].events.error();else [...b.timeouts.values()][0]();
  assert.equal(b.fallback.hidden,false);assert.equal(b.launcher.hidden,true);assert.equal(b.timeouts.size,0);
  assert.equal(b.focus(),'fallback');assert.match(b.status.textContent,/Chat could not connect/);
  b.dismiss();b.load();assert.equal(b.root.hidden,true);assert.equal(b.counts().maximized,0);assert.ok(b.counts().hidden>=1);
 }
});

test('delayed chat failure does not steal focus after the visitor moves elsewhere',()=>{
 const b=browser();b.click();b.moveFocus();[...b.timeouts.values()][0]();
 assert.equal(b.fallback.hidden,false);assert.equal(b.focus(),'');assert.match(b.status.textContent,/could not connect/);
});

test('optional inline helper mode omits the floating launcher and keeps the same consent boundary',()=>{
 const markup=supportChatMarkup(config(),{formPage:true});
 assert.doesNotMatch(markup,/class="support-chat-launch"/);assert.match(markup,/support-chat--inline/);
 const b=browser({inline:true});assert.equal(b.appended.length,0);b.click();b.click();assert.equal(b.appended.length,1);
 b.appended[0].events.error();assert.equal(b.focus(),'fallback');b.dismiss();assert.equal(b.focus(),'opener');
 b.click();assert.equal(b.fallback.hidden,false);assert.equal(b.root.hidden,false);assert.equal(b.appended.length,1);
});
