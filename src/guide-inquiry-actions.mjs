import {researchGuideDetails} from './research-guides.mjs';
import {escapeHtml as e,money} from './shared.mjs';
// Deliberate reader intent, independent of the fallback service used for navigation.
export const guideInquiryActions={
 'website-maintenance-cost':['care','question','Ask about ongoing website costs'],
 'website-launch-checklist':['new_website','question','Discuss your website launch'],
 'ai-website-or-custom':['unsure','question','Discuss the right website approach'],
 'website-not-showing-on-google':['search','question','Discuss your search visibility'],
 'contact-form-not-working':['fix','question','Get help fixing your form'],
 'service-area-pages':['search','question','Discuss your service-area content'],
 'website-maintenance-checklist':['care','question','Discuss ongoing website help'],
 'contractor-website-checklist':['new_website','question','Talk through your contractor site'],
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
export function guideInquiry(path){const key=path.split('/').filter(Boolean).at(-1);const extra=researchGuideDetails[key];const choice=extra?[extra.goal,'question',extra.action]:guideInquiryActions[key];if(!choice)throw Error(`Missing guide inquiry intent: ${path}`);const [goal,kind,label]=choice;return {label,href:`/contact/?offer=${key==='contact-form-not-working'?'website_baseline':'unsure'}&amp;goal=${goal}&amp;request_kind=${kind}#inquiry`};}
export function contextualizeGuideBody(body,path){
 const defaults=new URL(guideInquiry(path).href.replaceAll('&amp;','&'),'https://wonderandmethod.com');
 return body.replace(/href="(\/contact\/(?:[^"<>]*))"/g,(_match,href)=>{
  const target=new URL(href.replaceAll('&amp;','&'),defaults.origin);
  for(const key of ['offer','goal','request_kind'])if(!target.searchParams.has(key))target.searchParams.set(key,defaults.searchParams.get(key));
  return `href="${e(target.pathname+target.search+(target.hash||'#inquiry'))}"`;
 });
}
const endingPrompts={
 'website-maintenance-cost':'Share your website, the tools you pay for and the checks or updates you need help with.',
 'website-launch-checklist':'Share your launch plan and anything not yet tested.',
 'ai-website-or-custom':'Share the draft or idea, what the website needs to do and who will update it.',
 'website-not-showing-on-google':'Share the page address, the search you expected it to appear for and any Search Console result you have.',
 'contact-form-not-working':'Share the form address, platform, test time and the first step that failed.',
 'service-area-pages':'Share your services, actual coverage and the customer question a new area page would answer.',
 'website-maintenance-checklist':'Share your website and which checks or updates are being missed.',
 'contractor-website-checklist':'Share your trade, accepted job types, service area and current website if you have one.',
 'website-project-cost':'Share the page list, needed features, editing plans and budget range. You do not need an existing website.',
 'website-redesign-brief':'Share your current website and the brief, including what should stay, what must change and who will edit it.',
 'local-seo-profile-eligibility':'Share how customers work with your business, the area you serve and the profile question you need to resolve.',
 'seo-work-and-reporting':'Share your website, the service you want to explain better and the work you could approve this month.',
 'website-migration-checklist':'Share the current website, planned destination, URL map if available and any account-access gaps.',
 'custom-website-or-template':'Share what the website needs to do, who will edit it and the options you are comparing.',
 'website-care-versus-seo':'Share your website and the specific check, update or improvement you need.',
 'website-audit-checklist':'Share your website and one customer task that fails, including the page and what happened.',
 'website-repair-or-redesign':'Share the current website, the problem and any new requirements the existing site cannot meet.'
};
export function guideAction(item,{compact=false,offers}={}){
 const action=guideInquiry(item.path);
 if(compact)return `<p class="guide-help"><a href="#next-decision">${e(action.label)}</a></p>`;
 const slug=item.path.split('/').filter(Boolean).at(-1);const prompt=researchGuideDetails[slug]?.prompt||endingPrompts[slug];
 if(!prompt)throw Error(`Missing guide ending: ${item.path}`);
 const buttonLabel=slug==='contact-form-not-working'&&offers?`Ask about the ${money(offers.baseline.one_time_price)} Website Baseline`:action.label;
 return `<div id="next-decision" class="journal-callout guide-ending"><h2>${e(action.label)}</h2><p>${e(prompt)} I confirm the work, access and price before booking or payment.</p><a class="button" href="${action.href}">${e(buttonLabel)}</a></div>`;
}
