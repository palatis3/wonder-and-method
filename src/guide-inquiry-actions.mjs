import {escapeHtml as e} from './shared.mjs';
// Deliberate reader intent, independent of the fallback service used for navigation.
export const guideInquiryActions={
 'website-maintenance-cost':['care','question','Ask about ongoing website costs'],
 'website-launch-checklist':['new_website','checkout','Discuss your website launch'],
 'ai-website-or-custom':['unsure','question','Discuss the right website approach'],
 'website-not-showing-on-google':['search','checkout','Discuss your search visibility'],
 'contact-form-not-working':['fix','checkout','Get help with a broken inquiry form'],
 'service-area-pages':['search','checkout','Discuss your service-area content'],
 'website-maintenance-checklist':['care','checkout','Discuss ongoing website help'],
 'contractor-website-checklist':['new_website','checkout','Discuss your contractor website'],
 'website-project-cost':['unsure','question','Ask about your website budget'],
 'website-redesign-brief':['redesign','checkout','Discuss your redesign brief'],
 'local-seo-profile-eligibility':['search','question','Ask about local search fit'],
 'seo-work-and-reporting':['search','question','Discuss SEO work and reporting'],
 'website-migration-checklist':['redesign','checkout','Discuss your website migration'],
 'custom-website-or-template':['unsure','question','Compare website approaches'],
 'website-care-versus-seo':['unsure','question','Choose between care and SEO'],
 'website-audit-checklist':['fix','checkout','Discuss a website review'],
 'website-repair-or-redesign':['unsure','question','Discuss repair or redesign']
};
export function guideInquiry(path){const key=path.split('/').filter(Boolean).at(-1);const choice=guideInquiryActions[key];if(!choice)throw Error(`Missing guide inquiry intent: ${path}`);const [goal,kind,label]=choice;return {label,href:`/contact/?offer=unsure&amp;goal=${goal}&amp;request_kind=${kind}#inquiry`};}
export function contextualizeGuideBody(body,path){const action=guideInquiry(path);return body.replace(/<aside class="journal-callout">[\s\S]*?<\/aside>/g,match=>match.includes('href="/contact/')?'':match).replace(/href="\/contact\/(?:[^"<>]*)"/g,`href="${action.href}"`);}
export function guideAction(item){const action=guideInquiry(item.path);return `<aside class="journal-callout"><h3>${e(action.label)}.</h3><p>Send your website address and the question you want to resolve. Terry replies within one business day, Monday–Friday, Eastern Time. We will discuss the suitable next step before any booking or payment.</p><a class="button" href="${action.href}">${e(action.label)}</a></aside>`;}
