// Basic consent: no Google script, connection, cookie or event before permission.
const panel=document.querySelector('[data-analytics-choice]');
const preferenceKey='wm.analytics-consent.v1',maxAge=180*86400000;
const services=['launch_site','focused_site','business_site','signature_site','keep_running','improve','local_focus','grow','website_baseline','audit_fix_sprint','brand_message','storefront','local_presence','workflow','systems','unsure'];
const events=new Set(['offer_select','contact_select','question_select','goal_new_website','goal_redesign','goal_fix','goal_search','goal_care','email_click','chat_open','resource_select','roi_calculate','inquiry_saved','question_saved']);
const readPreference=()=>{try{const p=JSON.parse(localStorage.getItem(preferenceKey));return p&&['allow','decline'].includes(p.choice)&&Number.isFinite(p.at)&&p.at<=Date.now()&&Date.now()-p.at<maxAge?p.choice:null;}catch{return null;}};
const ownerDisabled=()=>{try{return localStorage.getItem('wm.measurement-disabled')==='1';}catch{return false;}};
const suppressed=()=>navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'||ownerDisabled()||new URLSearchParams(location.search).has('qa');
// Only the site's fixed navigation fields are allowed. Search terms, campaign
// strings and arbitrary URL fields are never exposed to automatic detection.
const navigationKeys=new Set(['offer','goal','county','concept','found_via','request_kind','care_interest','addons','booking_choice','priority','priority_two','baseline_status','billing']);
const safeQuery=()=>[...new URLSearchParams(location.search)].every(([key,value])=>navigationKeys.has(key)&&(key==='county'?value.length<=120&&/^[a-z0-9_-]+(?:\/[a-z0-9_-]+)?$/.test(value):/^[a-z0-9_,\-]{1,120}$/.test(value)));
let choice=readPreference(),started=false,permitted=false,returnFocus=null;
const measurementId=panel?.dataset.measurementId;
let canonical;
try{canonical=new URL(document.querySelector('link[rel="canonical"]')?.href);}catch{}
const eligible=Boolean(panel&&/^G-[A-Z0-9]+$/.test(measurementId||'')&&location.origin==='https://wonderandmethod.com'&&canonical?.origin===location.origin&&canonical.pathname===location.pathname&&!canonical.search&&!canonical.hash&&safeQuery());
const disabledKey='ga-disable-'+measurementId;
function clearCookies(){
 for(const part of document.cookie.split(';')){
  const name=part.split('=')[0].trim();if(!/^_ga(?:_|$)/.test(name))continue;
  for(const domain of ['', '; domain=wonderandmethod.com','; domain=.wonderandmethod.com'])document.cookie=name+'=; Max-Age=0; path=/; SameSite=Lax; Secure'+domain;
 }
}
function stop(){permitted=false;window[disabledKey]=true;clearCookies();}
function start(){
 if(!eligible||suppressed()||choice!=='allow'){stop();return;}
 permitted=true;window[disabledKey]=false;
 if(started)return;started=true;
 window.dataLayer=window.dataLayer||[];
 window.gtag=function(){window.dataLayer.push(arguments);};
 window.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
 window.gtag('consent','update',{analytics_storage:'granted'});
 window.gtag('js',new Date());
 let referrer='';try{const u=new URL(document.referrer);if(['https:','http:'].includes(u.protocol))referrer=u.origin+'/';}catch{}
 const groups=['home','inquiry','pricing','guide_directory','guide','county_service','area_directory','service','work','tool','information'];
 const contentGroup=groups.includes(panel.dataset.contentGroup)?panel.dataset.contentGroup:'information';
 const page={page_location:canonical.href,page_referrer:referrer,page_title:document.title,content_group:contentGroup};
 window.gtag('set',page);
 window.gtag('config',measurementId,{...page,send_page_view:true,allow_google_signals:false,allow_ad_personalization_signals:false,cookie_domain:'wonderandmethod.com',cookie_path:'/',cookie_expires:15552000,cookie_update:false,cookie_flags:'SameSite=Lax;Secure'});
 const script=document.createElement('script');script.async=true;script.referrerPolicy='no-referrer';script.src='https://www.googletagmanager.com/gtag/js?id='+measurementId;document.head.append(script);
}
function closePanel(){panel.hidden=true;returnFocus?.focus();returnFocus=null;}
function choose(value){
 choice=value;try{localStorage.setItem(preferenceKey,JSON.stringify({choice:value,at:Date.now()}));}catch{}
 if(value==='allow')start();else stop();closePanel();
}
if(panel){
 const accept=panel.querySelector('[data-analytics-accept]'),decline=panel.querySelector('[data-analytics-decline]'),close=panel.querySelector('[data-analytics-close]');
 const open=()=>{
  const blocked=suppressed();accept.disabled=blocked;
  close.hidden=false;panel.hidden=false;returnFocus=document.activeElement;
  panel.querySelector('[data-analytics-description]').textContent=blocked?'Analytics is off because of your browser privacy setting or testing preference.':'Google Analytics is '+(choice==='allow'?'allowed':'off')+' in this browser. You can change your choice. Your form answers are not included.';
  (blocked?decline:accept).focus();
 };
 for(const button of document.querySelectorAll('[data-analytics-settings]')){button.hidden=false;button.addEventListener('click',open);}
 accept.addEventListener('click',()=>choose('allow'));decline.addEventListener('click',()=>choose('decline'));close.addEventListener('click',closePanel);
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'&&choice){closePanel();}});
 window.addEventListener('storage',event=>{if(event.key===preferenceKey||event.key==='wm.measurement-disabled'||event.key===null){choice=readPreference();start();}});
 window.addEventListener('pageshow',()=>{choice=readPreference();start();});
 document.addEventListener('wm:journey',event=>{
  if(!permitted||choice!=='allow'||suppressed()||!safeQuery())return;
  const {event:name,service}=event.detail||{};if(!events.has(name)||!services.includes(service))return;
  const saved=['inquiry_saved','question_saved'].includes(name);
  window.gtag('event',saved?'generate_lead':name,{send_to:measurementId,service_type:service,...(saved?{request_type:name==='question_saved'?'question':'inquiry'}:{})});
 });
 if(!choice&&!suppressed()&&eligible)panel.hidden=false;
 start();
}
