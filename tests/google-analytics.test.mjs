import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {googleAnalyticsEnabled,googleAnalyticsPage,analyticsChoiceMarkup,analyticsContentGroup} from '../src/google-analytics.mjs';
import {intakeContent} from '../src/intake-content.mjs';
const source=await readFile(new URL('../src/assets/analytics-consent.js',import.meta.url),'utf8');
const config=JSON.parse(await readFile(new URL('../config/site.json',import.meta.url),'utf8'));
const key='wm.analytics-consent.v1',id='G-9LGFBVBKWP';
function fixture({choice=null,search='',host='wonderandmethod.com',gpc=false,dnt='',owner=false,canonicalPath='/contact/',path='/contact/',storageFails=false}={}){
 const listeners={},windowListeners={},scripts=[],cookies=[],storage=new Map();
 if(choice)storage.set(key,JSON.stringify(typeof choice==='string'?{choice,at:Date.now()}:choice));if(owner)storage.set('wm.measurement-disabled','1');
 const control=()=>({hidden:false,disabled:false,handlers:{},addEventListener(name,fn){this.handlers[name]=fn;},focus(){this.focused=true;}});
 const accept=control(),decline=control(),close=control(),settings=control(),description={textContent:''};
 const panel={hidden:true,dataset:{measurementId:id,contentGroup:'inquiry'},querySelector:s=>({'[data-analytics-accept]':accept,'[data-analytics-decline]':decline,'[data-analytics-close]':close,'[data-analytics-description]':description}[s]),addEventListener(){}};
 const document={title:'Contact — Wonder and Method',referrer:'https://www.google.com/search?q=private-person',activeElement:settings,head:{append:s=>scripts.push(s)},createElement:()=>({}),querySelector:s=>s==='[data-analytics-choice]'?panel:{href:'https://wonderandmethod.com'+canonicalPath},querySelectorAll:()=>[settings],addEventListener:(name,fn)=>listeners[name]=fn};
 Object.defineProperty(document,'cookie',{get:()=> '_ga=test; _ga_9LGFBVBKWP=session; preference=keep',set:value=>cookies.push(value)});
 const window={addEventListener:(name,fn)=>windowListeners[name]=fn};
 const scope={document,window,location:{origin:'https://'+host,pathname:path,search},navigator:{globalPrivacyControl:gpc,doNotTrack:dnt},localStorage:{getItem:k=>{if(storageFails)throw Error('blocked');return storage.get(k)||null;},setItem:(k,v)=>{if(storageFails)throw Error('blocked');storage.set(k,v);}},URL,URLSearchParams,Date,Set};
 runInNewContext(source,scope);
 return {scope,window,scripts,cookies,storage,panel,accept,decline,settings,listeners,windowListeners,commands:()=>Array.from(window.dataLayer||[],a=>Array.from(a)),event:(event,service='focused_site')=>listeners['wm:journey']({detail:{event,service}})};
}
test('Google collection has no script or event before consent, and decline persists',()=>{
 const f=fixture();assert.equal(f.panel.hidden,false);assert.equal(f.scripts.length,0);assert.equal(f.window.dataLayer,undefined);
 f.event('inquiry_saved');assert.equal(f.window.dataLayer,undefined);f.decline.handlers.click();assert.equal(f.panel.hidden,true);assert.equal(JSON.parse(f.storage.get(key)).choice,'decline');assert.equal(f.scripts.length,0);
 assert.equal(fixture({choice:'decline'}).scripts.length,0);
});
test('explicit opt-in loads once with sanitized page/referrer, denied ads and bounded cookies',()=>{
 const f=fixture({search:'?offer=focused_site&goal=redesign&county=pennsylvania%2Fadams-county'});f.accept.handlers.click();
 assert.equal(f.scripts.length,1);assert.equal(f.scripts[0].src,'https://www.googletagmanager.com/gtag/js?id='+id);assert.equal(f.scripts[0].referrerPolicy,'no-referrer');
 const commands=f.commands(),setup=commands.find(c=>c[0]==='config')[2];
 assert.equal(setup.page_location,'https://wonderandmethod.com/contact/');assert.equal(setup.page_referrer,'https://www.google.com/');assert.equal(setup.send_page_view,true);assert.equal(setup.allow_google_signals,false);assert.equal(setup.allow_ad_personalization_signals,false);assert.equal(setup.cookie_expires,15552000);assert.equal(setup.cookie_update,false);
 assert.equal(setup.content_group,'inquiry');
 assert.equal(commands[0][2].analytics_storage,'denied');assert.equal(commands[0][2].ad_user_data,'denied');assert.equal(commands[1][2].analytics_storage,'granted');
 f.windowListeners.pageshow();assert.equal(f.scripts.length,1);assert.equal(f.commands().filter(c=>c[0]==='config').length,1);
 assert.ok(!JSON.stringify(f.commands()).includes('private-person'));
});
test('privacy, QA, wrong host/canonical and unsupported query URLs suppress Google',()=>{
 for(const options of [{gpc:true},{dnt:'1'},{owner:true},{search:'?qa=1'},{host:'preview.example.com'},{canonicalPath:'/pricing/'},{search:'?q=private-person'},{search:'?email=private@example.test'},{search:'?utm_campaign=private-person'},{search:'?unknown=value'}]){
  const f=fixture({choice:'allow',...options});assert.equal(f.scripts.length,0,JSON.stringify(options));f.event('inquiry_saved');assert.equal(f.window.dataLayer,undefined);
 }
});
test('only safe actions and server-confirmed saves map to events; no replay or automatic duplicates',()=>{
 const f=fixture();f.event('inquiry_saved');f.accept.handlers.click();
 for(const name of ['page_view','request_start','question_start','form_submit','unknown'])f.event(name);
 f.event('inquiry_saved','private-person');assert.equal(f.commands().filter(c=>c[0]==='event').length,0);
 f.event('inquiry_saved');f.event('question_saved');f.event('contact_select');
 const events=f.commands().filter(c=>c[0]==='event');assert.deepEqual(events.map(c=>c[1]),['generate_lead','generate_lead','contact_select']);
 assert.deepEqual(Object.keys(events[0][2]).sort(),['request_type','send_to','service_type']);assert.equal(events[0][2].request_type,'inquiry');assert.equal(events[1][2].request_type,'question');
});
test('revocation disables collection, clears only GA cookies and propagates across tabs',()=>{
 const f=fixture({choice:'allow'});f.decline.handlers.click();assert.equal(f.window['ga-disable-'+id],true);f.event('inquiry_saved');assert.equal(f.commands().filter(c=>c[0]==='event').length,0);assert.ok(f.cookies.length>=6);assert.ok(f.cookies.every(c=>c.startsWith('_ga')));
 const other=fixture({choice:'allow'});other.storage.set(key,JSON.stringify({choice:'decline',at:Date.now()}));other.windowListeners.storage({key});assert.equal(other.window['ga-disable-'+id],true);other.event('contact_select');assert.equal(other.commands().filter(c=>c[0]==='event').length,0);
});
test('expired, malformed and future consent never loads Google; storage denial stays usable',()=>{
 for(const choice of [{choice:'allow',at:Date.now()-181*86400000},{choice:'allow',at:Date.now()+86400000},{choice:'yes',at:Date.now()}])assert.equal(fixture({choice}).scripts.length,0);
 const f=fixture({storageFails:true});assert.equal(f.scripts.length,0);f.accept.handlers.click();assert.equal(f.scripts.length,1);f.decline.handlers.click();assert.equal(f.window['ga-disable-'+id],true);
});
test('configuration gates exclude previews, private pages, 404 and fictional requests',()=>{
 assert.equal(googleAnalyticsEnabled(config),true);assert.equal(googleAnalyticsPage(config,'/contact/'),true);assert.equal(googleAnalyticsPage(config,'/checkout/focused-site/'),true);
 for(const path of ['/404/','/api/operator/','/assets/private.html','/work/fieldwork/request/'])assert.equal(googleAnalyticsPage(config,path),false);
 for(const overrides of [{mode:'staging'},{reviewOnly:true},{formMode:'synthetic'},{googleAnalytics:{enabled:false}}])assert.equal(analyticsChoiceMarkup({...config,...overrides},'/'),'');
 for(const overrides of [{measurementId:'bad'},{consent:'implicit'},{evidenceReference:''}])assert.throws(()=>intakeContent({...config,googleAnalytics:{...config.googleAnalytics,...overrides}}),/Google Analytics/);
});
test('content groups distinguish county service pages, directories, guides and inquiry pages',()=>{
 assert.equal(analyticsContentGroup('/areas/erie-county/'),'county_service');
 for(const [path,group]of Object.entries({'/':'home','/contact/':'inquiry','/checkout/focused-site/':'inquiry','/areas/':'area_directory','/areas/nevada/':'area_directory','/areas/nevada/churchill/':'county_service','/guides/':'guide_directory','/guides/website-content-template/':'guide','/services/web-design/':'service','/work/lead-workbench/':'work','/tools/website-roi-calculator/':'tool','/privacy/':'information'}))assert.equal(analyticsContentGroup(path),group);
});
