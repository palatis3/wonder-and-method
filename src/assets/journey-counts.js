// Aggregate counts only. No visitor/session IDs, fields or raw URLs.
// The only storage is an explicit owner opt-out preference.
let ownerOptOut=false;
try{const qa=new URLSearchParams(location.search).get('qa');if(qa==='persist')localStorage.setItem('wm.measurement-disabled','1');if(qa==='resume')localStorage.removeItem('wm.measurement-disabled');ownerOptOut=localStorage.getItem('wm.measurement-disabled')==='1';}catch{}
function sourceCategory(){
 const campaign=new URLSearchParams(location.search).get('utm_source');
 const source=(campaign||'').trim().toLowerCase().replace(/^www\./,'').replace(/\.$/,'');
 const classify=host=>{
  const is=domain=>host===domain||host.endsWith('.'+domain);
  if(['chatgpt.com','openai.com','perplexity.ai','claude.ai','copilot.microsoft.com','gemini.google.com'].some(is))return 'ai_assistant';
  if(/(?:^|\.)google\.(?:com|[a-z]{2}|(?:co|com)\.[a-z]{2})$/.test(host)||host==='com.google.android.googlequicksearchbox')return 'google';
  if(is('bing.com'))return 'bing';
  if(['duckduckgo.com','yahoo.com','ecosia.org','search.brave.com','startpage.com'].some(is))return 'search';
  if(['linkedin.com','lnkd.in','facebook.com','instagram.com','twitter.com','x.com','t.co'].some(is))return 'social';
  return '';
 };
 if(campaign){if(source==='google'||source==='bing')return source;if(['chatgpt','openai','perplexity','claude','copilot','gemini'].includes(source))return 'ai_assistant';if(['duckduckgo','yahoo','ecosia','brave','startpage'].includes(source))return 'search';if(['linkedin','facebook','instagram','twitter','x'].includes(source))return 'social';return classify(source)||'campaign';}
 let host;try{host=new URL(document.referrer||'').hostname.toLowerCase();}catch{return 'direct';}
 if(host===location.hostname)return 'internal';
 return classify(host)||'referral';
}
const services=['launch_site','focused_site','business_site','signature_site','keep_running','improve','local_focus','grow','website_baseline','audit_fix_sprint','brand_message','storefront','local_presence','workflow','systems','unsure'];
const sent=new Set();
// Carry an explicit QA opt-out through same-site page navigation, without storage.
if(new URLSearchParams(location.search).has('qa')&&new URLSearchParams(location.search).get('qa')!=='resume')document.addEventListener('click',event=>{
 const a=event.target.closest?.('a[href]');if(!a)return;
 const url=new URL(a.href,location.href);if(url.origin!==location.origin||url.pathname.startsWith('/assets/'))return;
 url.searchParams.set('qa','1');a.href=url.pathname+url.search+url.hash;
});
export function countJourney(event,service='unsure',localResourceKey=''){
 if(ownerOptOut||document.documentElement.dataset.measurement!=='aggregate'||location.hostname!=='wonderandmethod.com'||navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'||new URLSearchParams(location.search).has('qa'))return;
 if(!services.includes(service))service='unsure';
 // Resource identity is only a page-local deduplication key; it is never sent.
 const key=event+':'+service+(event==='resource_select'?':'+localResourceKey:'');if(sent.has(key))return;sent.add(key);
 // Only fixed event/service names reach the separately consented adapter.
 // No field values, resource URL, page URL or reference is included.
 if(typeof CustomEvent==='function')document.dispatchEvent?.(new CustomEvent('wm:journey',{detail:{event,service}}));
 const categories={'/':'home','/pricing/':'pricing','/guides/':'guide_index','/areas/':'areas','/services/web-design/':'service_new','/services/website-redesign/':'service_redesign','/services/seo/':'service_seo','/services/website-care/':'service_care','/services/website-audit/':'service_audit','/services/contractor-websites/':'service_contractors','/work/lead-workbench/':'work_demo','/contact/':'contact'};
 const path=location.pathname,page=document.documentElement.dataset.journeyPage||categories[path]||(path.startsWith('/guides/')?'guide':path.startsWith('/services/')?'service':path.startsWith('/areas/')?'county':path.startsWith('/work/')?'work':path.startsWith('/checkout/')?'request':'other');
 fetch('/api/journey-counts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event,service,page,source:event==='page_view'?sourceCategory():'not_recorded'}),credentials:'omit',referrerPolicy:'no-referrer',keepalive:true}).catch(()=>{});
}
const landedService=location.pathname.match(/^\/checkout\/([a-z-]+)\/$/)?.[1]?.replaceAll('-','_')||'unsure';
countJourney('page_view',landedService);
document.addEventListener('click',event=>{
 // Historical event name: activation of a chat control, not proof that the
 // third-party widget connected or that a conversation took place.
 if(event.target.closest?.('.support-chat-launch,[data-chat-open]')){countJourney('chat_open');return;}
 const a=event.target.closest?.('a[href]');if(!a)return;
 const url=new URL(a.href,location.href);
 if(url.protocol==='mailto:'){countJourney('email_click');return;}
 if(url.origin!==location.origin)return;
 const pack=url.pathname.match(/^\/assets\/buyer-packs\/([a-z_-]+)(?:\.(?:html|txt|json))?\/?$/)?.[1];
 const packService=pack?.replaceAll('-','_');
 if(pack&&(services.includes(packService)&&packService!=='unsure'||['owned-audit-two-fixes','website-addons'].includes(pack))){countJourney('resource_select',services.includes(packService)?packService:'unsure',url.pathname);return;}
 if(/^\/assets\/(?:guides|downloads|county-briefs|audit-implementation)\/[a-z0-9-]+\.(?:csv|txt|json)$/i.test(url.pathname)){countJourney('resource_select','unsure',url.pathname);return;}
 const match=url.pathname.match(/^\/checkout\/([a-z-]+)\/$/);
 if(match)countJourney('offer_select',match[1].replaceAll('-','_'));
 else if(url.pathname==='/contact/'&&url.searchParams.get('request_kind')==='question')countJourney('question_select',url.searchParams.get('offer'));
 else if(url.pathname==='/contact/')countJourney('contact_select',url.searchParams.get('offer'));
 if(url.pathname==='/contact/'){
  const goal=url.searchParams.get('goal');
  if(['new_website','redesign','fix','search','care'].includes(goal))countJourney('goal_'+goal);
 }
});
