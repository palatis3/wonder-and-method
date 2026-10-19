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
export function guideAction(item,{compact=false}={}){const action=guideInquiry(item.path);if(compact)return `<p class="guide-help"><a href="${action.href}">${e(action.label)}</a></p>`;return `<div id="next-decision" class="journal-callout guide-ending"><h2>Need help with the next step?</h2><p>Send your website address and the question you want to resolve. I confirm the work and price before booking or payment.</p><a class="button" href="${action.href}">${e(action.label)}</a></div>`;}
