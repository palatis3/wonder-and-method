// Aggregate counts only. No visitor/session IDs, fields or raw URLs.
// The only storage is an explicit owner opt-out preference.
let ownerOptOut=false;
try{const qa=new URLSearchParams(location.search).get('qa');if(qa==='persist')localStorage.setItem('wm.measurement-disabled','1');if(qa==='resume')localStorage.removeItem('wm.measurement-disabled');ownerOptOut=localStorage.getItem('wm.measurement-disabled')==='1';}catch{}
function sourceCategory(){
 const campaign=new URLSearchParams(location.search).get('utm_source');
 const source=(campaign||'').toLowerCase();
 if(campaign){if(source==='google'||source==='bing')return source;if(['chatgpt','perplexity','claude','copilot'].includes(source))return 'ai_assistant';if(['linkedin','facebook','instagram','twitter','x'].includes(source))return 'social';return 'campaign';}
 let host;try{host=new URL(document.referrer||'').hostname.toLowerCase();}catch{return 'direct';}
 if(host===location.hostname)return 'internal';
 const is=domain=>host===domain||host.endsWith('.'+domain);
 if(is('google.com'))return 'google';if(is('bing.com'))return 'bing';
 if(['chatgpt.com','chat.openai.com','perplexity.ai','claude.ai','copilot.microsoft.com'].some(is))return 'ai_assistant';
 if(['linkedin.com','facebook.com','instagram.com','twitter.com','x.com','t.co'].some(is))return 'social';
 return 'referral';
}
const services=['launch_site','focused_site','signature_site','keep_running','improve','grow','website_baseline','audit_fix_sprint','unsure'];
const sent=new Set();
// Carry an explicit QA opt-out through same-site page navigation, without storage.
if(new URLSearchParams(location.search).has('qa')&&new URLSearchParams(location.search).get('qa')!=='resume')document.addEventListener('click',event=>{
 const a=event.target.closest?.('a[href]');if(!a)return;
 const url=new URL(a.href,location.href);if(url.origin!==location.origin||url.pathname.startsWith('/assets/'))return;
 url.searchParams.set('qa','1');a.href=url.pathname+url.search+url.hash;
});
export function countJourney(event,service='unsure'){
 if(ownerOptOut||document.documentElement.dataset.measurement!=='aggregate'||location.hostname!=='wonderandmethod.com'||navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'||new URLSearchParams(location.search).has('qa'))return;
 if(!services.includes(service))service='unsure';
 const key=event+':'+service;if(sent.has(key))return;sent.add(key);
 const categories={'/':'home','/pricing/':'pricing','/guides/':'guide_index','/areas/':'areas','/services/web-design/':'service_new','/services/website-redesign/':'service_redesign','/services/seo/':'service_seo','/services/website-care/':'service_care','/services/website-audit/':'service_audit','/services/contractor-websites/':'service_contractors','/work/lead-workbench/':'work_demo','/contact/':'contact'};
 const path=location.pathname,page=document.documentElement.dataset.journeyPage||categories[path]||(path.startsWith('/guides/')?'guide':path.startsWith('/services/')?'service':path.startsWith('/areas/')?'county':path.startsWith('/work/')?'work':path.startsWith('/checkout/')?'request':'other');
 fetch('/api/journey-counts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event,service,page,source:event==='page_view'?sourceCategory():'not_recorded'}),credentials:'omit',referrerPolicy:'no-referrer',keepalive:true}).catch(()=>{});
}
const landedService=location.pathname.match(/^\/checkout\/([a-z-]+)\/$/)?.[1]?.replaceAll('-','_')||'unsure';
countJourney('page_view',landedService);
document.addEventListener('click',event=>{
 if(event.target.closest?.('.support-chat-launch')){countJourney('chat_open');return;}
 const a=event.target.closest?.('a[href]');if(!a)return;
 const url=new URL(a.href,location.href);
 if(url.protocol==='mailto:'){countJourney('email_click');return;}
 if(url.origin!==location.origin)return;
 const match=url.pathname.match(/^\/checkout\/([a-z-]+)\/$/);
 if(match)countJourney('offer_select',match[1].replaceAll('-','_'));
 else if(url.pathname==='/contact/'&&url.searchParams.get('request_kind')==='question')countJourney('question_select',url.searchParams.get('offer'));
 else if(url.pathname==='/contact/')countJourney('contact_select',url.searchParams.get('offer'));
});
