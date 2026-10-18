import {escapeHtml as e} from './shared.mjs';
// Deliberate reader intent, independent of the fallback service used for navigation.
export const guideInquiryActions={
 'website-maintenance-cost':['care','question','Ask about ongoing website costs'],
 'website-launch-checklist':['new_website','question','Discuss your website launch'],
 'ai-website-or-custom':['unsure','question','Discuss the right website approach'],
 'website-not-showing-on-google':['search','question','Discuss your search visibility'],
 'contact-form-not-working':['fix','question','Get help with a broken inquiry form'],
 'service-area-pages':['search','question','Discuss your service-area content'],
 'website-maintenance-checklist':['care','question','Discuss ongoing website help'],
 'contractor-website-checklist':['new_website','question','Discuss your contractor website'],
 'website-project-cost':['unsure','question','Ask about your website budget'],
 'website-redesign-brief':['redesign','question','Discuss your redesign brief'],
 'local-seo-profile-eligibility':['search','question','Ask about local search fit'],
 'seo-work-and-reporting':['search','question','Discuss SEO work and reporting'],
 'website-migration-checklist':['redesign','question','Discuss your website migration'],
 'custom-website-or-template':['unsure','question','Compare website approaches'],
 'website-care-versus-seo':['unsure','question','Choose between care and SEO'],
 'website-audit-checklist':['fix','question','Discuss a website review'],
 'website-repair-or-redesign':['unsure','question','Discuss repair or redesign']
};
export function guideInquiry(path){const key=path.split('/').filter(Boolean).at(-1);const choice=guideInquiryActions[key];if(!choice)throw Error(`Missing guide inquiry intent: ${path}`);const [goal,kind,label]=choice;return {label,href:`/contact/?offer=unsure&amp;goal=${goal}&amp;request_kind=${kind}#inquiry`};}
export function contextualizeGuideBody(body,path){
 const defaults=new URL(guideInquiry(path).href.replaceAll('&amp;','&'),'https://wonderandmethod.com');
 return body.replace(/href="(\/contact\/(?:[^"<>]*))"/g,(_match,href)=>{
  const target=new URL(href.replaceAll('&amp;','&'),defaults.origin);
  for(const key of ['offer','goal','request_kind'])if(!target.searchParams.has(key))target.searchParams.set(key,defaults.searchParams.get(key));
  return `href="${e(target.pathname+target.search+(target.hash||'#inquiry'))}"`;
 });
}
export function guideAction(item){const action=guideInquiry(item.path);return `<aside class="journal-callout"><h3>${e(action.label)}.</h3><p>Send your website address and the question you want to resolve. I reply within one business day, Monday–Friday, Eastern Time. We’ll agree on the next step before any booking or payment.</p><a class="button" href="${action.href}">${e(action.label)}</a></aside>`;}
