import {reviewPageLimits} from './offer-copy.mjs';
import {guideDetails as researchGuideDetails} from './guide-details.mjs';
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
 'local-seo-profile-eligibility':['search','question','Ask about local website content'],
 'seo-work-and-reporting':['search','question','Discuss SEO work and reporting'],
 'website-migration-checklist':['redesign','question','Discuss your website migration'],
 'custom-website-or-template':['unsure','question','Compare website approaches'],
 'website-care-versus-seo':['unsure','question','Choose between care and SEO'],
 'website-audit-checklist':['fix','question','Discuss a website review'],
 'website-repair-or-redesign':['unsure','question','Discuss repair or redesign']
};
const askLabel=label=>({
 'Get help fixing your form':'Ask about fixing your form',
 'Talk through your contractor site':'Ask about your contractor website',
 'Compare website approaches':'Ask about website options',
 'Choose between care and SEO':'Ask about care or SEO'
}[label]||label.replace(/^Discuss /,'Ask about '));
export function guideInquiry(path){const key=path.split('/').filter(Boolean).at(-1);const extra=researchGuideDetails[key];const choice=extra?[extra.goal,'question',extra.action]:guideInquiryActions[key];if(!choice)throw Error(`Missing guide inquiry intent: ${path}`);const [chosenGoal,kind,label]=choice;const goal=chosenGoal==='new_website'&&['Business workflows','Local website cases'].includes(extra?.category)?'unsure':chosenGoal;return {label:askLabel(label),href:`/contact/?offer=${key==='contact-form-not-working'?'website_baseline':'unsure'}&amp;goal=${goal}&amp;request_kind=${kind}#inquiry`};}
export function contextualizeGuideBody(body,path){
 const defaults=new URL(guideInquiry(path).href.replaceAll('&amp;','&'),'https://wonderandmethod.com');
 return body.replace(/href="(\/contact\/(?:[^"<>]*))"/g,(_match,href)=>{
  const target=new URL(href.replaceAll('&amp;','&'),defaults.origin);
  for(const key of ['offer','goal','request_kind'])if(!target.searchParams.has(key))target.searchParams.set(key,defaults.searchParams.get(key));
  return `href="${e(target.pathname+target.search+(target.hash||'#inquiry'))}"`;
 });
}
const endingHeadings={'website-project-cost':'Plan a budget around your actual work','contact-form-not-working':'Get help with the failed step','website-redesign-brief':'Turn your brief into a clear proposal','website-not-generating-leads':'Find the next useful change','website-care-versus-seo':'Choose help for the work you need','website-content-template':'Bring your facts and rough notes'};
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
 'local-seo-profile-eligibility':'Share your website, how customers work with your business and the area you serve. Local Presence Setup establishes an eligible, client-owned profile; Local Search Focus and Local Search Partnership offer distinct monthly work. Profile Recovery Assessment handles a supported ownership or suspension case. Platform verification, reinstatement and rankings are not guaranteed.',
 'seo-work-and-reporting':'Share your website, the service you want to explain better and the work you could approve this month.',
 'website-migration-checklist':'Share the current website, planned destination, URL map if available and any account-access gaps.',
 'custom-website-or-template':'Share what the website needs to do, who will edit it and the options you are comparing.',
 'website-care-versus-seo':'Share your website and the specific check, update or improvement you need.',
 'website-audit-checklist':'Share your website and one customer task that fails, including the page and what happened.',
 'website-repair-or-redesign':'Share the current website, the problem and any new requirements the existing site cannot meet.'
};
export function guideAction(item,{compact=false,offers}={}){
 const action=guideInquiry(item.path);
 const formRepair=item.path==='/guides/contact-form-not-working/';
 if(compact)return `<p class="guide-help"><a href="#${formRepair?'review-options':'next-decision'}">${e(action.label)}</a></p>`;
 if(formRepair)return '';
 const slug=item.path.split('/').filter(Boolean).at(-1);const prompt=researchGuideDetails[slug]?.prompt||endingPrompts[slug];
 if(!prompt)throw Error(`Missing guide ending: ${item.path}`);
 const buttonLabel=action.label;
 return `<div id="next-decision" class="journal-callout guide-ending"><h2>${e(endingHeadings[slug]||'Talk through your next step')}</h2><p>${e(prompt)} I confirm the work, access and price before booking or payment.</p>${guideServiceLink(item)}<a class="button" href="${action.href}">${e(buttonLabel)}</a></div>`;
}
const serviceLabels={
 '/services/web-design/':'Web design',
 '/services/website-redesign/':'Website redesign',
 '/services/website-audit/':'Website reviews and small fixes',
 '/services/website-care/':'Website care',
 '/services/seo/':'Monthly SEO',
 '/pricing/':'Compare website packages',
 '/pricing/#after-launch':'Compare monthly plans'
};
export function guideServiceLink(item){
 const path=item.path==='/guides/website-care-versus-seo/'?'/pricing/#after-launch':item.fallback;
 const label=serviceLabels[path];if(!label)throw Error(`Missing related service: ${item.path}`);
 return `<p class="guide-service">${path.startsWith('/pricing/')?'See the options:':'Related service:'} <a href="${path}">${e(label)}</a>.</p>`;
}
export function formRepairHelp(o){
 const action=guideInquiry('/guides/contact-form-not-working/');
 return `<div id="next-decision" class="journal-callout guide-ending"><p>Share the form address, platform, test time and the first step that failed. I check your setup and the access I need before you pay; on Wix, access is through a collaborator invitation.</p><p>The <a href="/services/website-audit/#offer-website_baseline">${money(o.baseline.one_time_price)} ${e(o.baseline.public_name)}</a> reviews your site and gives you an evidence-backed action plan. No implementation is included. The <a href="/services/website-audit/#offer-audit_fix_sprint">${money(o.audit_sprint.one_time_price)} ${e(o.audit_sprint.public_name)}</a> completes up to three agreed fixes within a bounded six-hour implementation scope, with preparation, retesting and handoff. The unchanged accepted work is completed even if the estimate is wrong.</p><p>${e(reviewPageLimits(o))}; larger sites are quoted separately. I confirm the work, access and price before booking or payment.</p><a class="button" href="${action.href}">${e(action.label)}</a></div>`;
}
