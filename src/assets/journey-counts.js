// Aggregate counts only. No storage, visitor/session IDs, fields or raw URLs.
const services=['launch_site','focused_site','signature_site','keep_running','improve','grow','website_baseline','audit_fix_sprint','unsure'];
const sent=new Set();
// Carry an explicit QA opt-out through same-site page navigation, without storage.
if(new URLSearchParams(location.search).has('qa'))document.addEventListener('click',event=>{
 const a=event.target.closest?.('a[href]');if(!a)return;
 const url=new URL(a.href,location.href);if(url.origin!==location.origin||url.pathname.startsWith('/assets/'))return;
 url.searchParams.set('qa','1');a.href=url.pathname+url.search+url.hash;
});
export function countJourney(event,service='unsure'){
 if(document.documentElement.dataset.measurement!=='aggregate'||location.hostname!=='wonderandmethod.com'||navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'||new URLSearchParams(location.search).has('qa'))return;
 if(!services.includes(service))service='unsure';
 const key=event+':'+service;if(sent.has(key))return;sent.add(key);
 const categories={'/':'home','/pricing/':'pricing','/guides/':'guide_index','/areas/':'areas','/services/web-design/':'service_new','/services/website-redesign/':'service_redesign','/services/seo/':'service_seo','/services/website-care/':'service_care','/services/website-audit/':'service_audit','/services/contractor-websites/':'service_contractors','/work/lead-workbench/':'work_demo','/contact/':'contact'};
 const path=location.pathname,page=categories[path]||(path.startsWith('/guides/')?'guide':path.startsWith('/services/')?'service':path.startsWith('/areas/')?'county':path.startsWith('/work/')?'work':path.startsWith('/checkout/')?'request':'other');
 fetch('/api/journey-counts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event,service,page}),credentials:'omit',referrerPolicy:'no-referrer',keepalive:true}).catch(()=>{});
}
countJourney('page_view');
document.addEventListener('click',event=>{
 const a=event.target.closest?.('a[href]');if(!a)return;
 const url=new URL(a.href,location.href);if(url.origin!==location.origin)return;
 const match=url.pathname.match(/^\/checkout\/([a-z-]+)\/$/);
 if(match)countJourney('offer_select',match[1].replaceAll('-','_'));
 else if(url.pathname==='/contact/'&&url.searchParams.get('request_kind')==='question')countJourney('question_select',url.searchParams.get('offer'));
 else if(url.pathname==='/contact/')countJourney('contact_select',url.searchParams.get('offer'));
});
