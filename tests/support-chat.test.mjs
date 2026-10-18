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
 assert.doesNotMatch(supportChatCsp(c).script,/\*\.tawk\.to/);
 for(const mutation of [{propertyId:'not-a-property'},{widgetId:'../script'},{verified:false}])assert.throws(()=>supportChatConfig({...c,supportChat:{...c.supportChat,...mutation}}));
 assert.throws(()=>supportChatConfig({...c,privacy:{processors:[{name:'tawk.to'}]}}));
 assert.throws(()=>supportChatConfig({...c,privacy:{chat:'Text',processors:[]}}));
});

const source=await readFile(new URL('../src/assets/support-chat.js',import.meta.url),'utf8');
function browser(){
 const events={},dismissEvents={},appended=[],timeouts=new Map();
 let focused='';
 const link={focus:()=>focused='fallback'},status={textContent:''};
 const label={textContent:'Message us'},fallback={hidden:true,querySelector:()=>link};
 const dismiss={addEventListener:(name,callback)=>dismissEvents[name]=callback};
 const root={hidden:false,querySelector:s=>s==='.support-chat-fallback'?fallback:s==='.support-chat-status'?status:dismiss};
 const launcher={hidden:true,attributes:{},setAttribute(k,v){this.attributes[k]=v;},focus:()=>focused='launcher',dataset:{chatScript:'https://embed.tawk.to/0123456789abcdef01234567/12345abcde'},closest:()=>root,querySelector:()=>label,addEventListener:(name,callback)=>events[name]=callback};
 const window={};let nextTimer=0,maximized=0,hidden=0;
 const document={body:{},activeElement:null,querySelector:s=>s==='#support-chat-status'?status:launcher,querySelectorAll:()=>[],createElement:()=>({events:{},addEventListener(name,callback){this.events[name]=callback;}}),head:{append:el=>appended.push(el)}};
 runInNewContext(source,{window,document,MutationObserver:class{observe(){}disconnect(){}},setTimeout:fn=>{timeouts.set(++nextTimer,fn);return nextTimer;},clearTimeout:id=>timeouts.delete(id)});
 const load=()=>{window.Tawk_API.maximize=()=>maximized++;window.Tawk_API.hideWidget=()=>hidden++;window.Tawk_API.onBeforeLoad();window.Tawk_API.onLoad();};
 return {launcher,label,fallback,root,status,focus:()=>focused,appended,timeouts,click:()=>events.click(),dismiss:()=>dismissEvents.click(),load,counts:()=>({maximized,hidden})};
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
  b.dismiss();b.load();assert.equal(b.root.hidden,true);assert.deepEqual(b.counts(),{maximized:0,hidden:1});
 }
});
