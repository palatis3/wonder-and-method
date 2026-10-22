import {serviceCoverage} from './service-area.mjs';
import {escapeHtml as e, money} from './shared.mjs';

// Intent owners, not a list of keyword permutations. Prices remain offer-driven.
export const searchMetadata = {
 '/': {title:'Web Design & SEO for Small Businesses',description:(o,config)=>`Small business websites from ${money(o.launch_site.public_price)} with writing, research and original graphics. Buffalo-based, working online across ${serviceCoverage(config).shortRegion}.`},
 '/services/': {title:'Website Services for Small Businesses',description:'Compare website design, redesign, SEO, monthly care and repairs. Find the right service, see prices and choose the next step for your business.'},
 '/services/web-design/': {title:'Small Business Web Design',description:o=>`Custom websites from ${money(o.launch_site.public_price)}. Work with a Buffalo designer on writing, research, SEO and original graphics for a ${o.launch_site.marketing_page_cap}-, ${o.focused_site.marketing_page_cap}- or ${o.signature_site.marketing_page_cap}-page website.`},
 '/services/website-redesign/': {title:'Website Redesign for Small Businesses',description:o=>`Rebuild a website around clear services, useful content and a working inquiry path. Packages from ${money(o.launch_site.public_price)}; review the existing site first.`},
 '/services/seo/': {title:'Monthly SEO for Small Businesses',description:o=>`Monthly SEO from a Buffalo studio: research, writing and completed improvements. Improve ${money(o.plans.improve.monthly_price)}/month; Grow ${money(o.plans.grow.monthly_price)}/month. A site review may be needed.`},
 '/services/website-care/': {title:'Monthly Website Care and Maintenance',description:o=>`Website checks, changes you send and a report for ${money(o.plans.keep_running.monthly_price)}/month. Existing sites may need the ${money(o.baseline.one_time_price)} Website Baseline. See coverage and limits.`},
 '/services/website-audit/': {title:'Website Audits and Small Fixes',description:o=>`Website Baseline ${money(o.baseline.one_time_price)}: review and priorities. Audit & Fix Sprint ${money(o.audit_sprint.one_time_price)}: review plus up to two agreed small fixes on a supported site.`},
 '/pricing/': {title:'Website, care and SEO prices',description:o=>`Websites up to 6, 15 or 30 pages with writing and research, from ${money(o.launch_site.public_price)}. Monthly care ${money(o.plans.keep_running.monthly_price)}; SEO ${money(o.plans.improve.monthly_price)} or ${money(o.plans.grow.monthly_price)}. Compare scope and payments.`},
 '/areas/erie-county/': {title:'Buffalo & Erie County, NY Web Design & SEO',description:o=>`Websites from ${money(o.launch_site.public_price)}, SEO and optional care for Buffalo and Erie County, NY businesses. Work directly with Terry through an online project process.`},
 '/process/': {title:'Your website project, step by step',description:'Six steps from the first email to design, approval, launch and handoff. See timing, feedback responsibilities and what you receive.'},
 '/contact/': {title:'Discuss your website project',description:'Talk with Terry about websites, SEO or care. Based in Buffalo. Replies within one business day, Monday–Friday, Eastern Time.'},
 '/about/': {title:'Meet Terry, your website designer',description:'Meet Terry, founder of Wonder and Method in Buffalo. Website design, SEO, care and small repairs, with a direct working relationship.'},
 '/guides/': {title:'Practical website and SEO guides',description:'Plain guides to website costs, redesign, care, search visibility and contact forms, with checklists and worksheets for business owners.'},
 "/guides/contact-form-not-working/": {"title": "Contact form not working?", "description": "Check your form, notification settings and inbox. Follow a missing inquiry from submission to reply, with deeper checks for your web person."},
 "/guides/service-area-pages/": {"title": "When does a service-area page help?", "description": "Decide which locations need their own page. Use real service coverage, customer questions and facts, with a simple planning worksheet."},
 "/guides/website-maintenance-checklist/": {"title": "A website maintenance checklist", "description": "Check forms, pages, certificates and website responsibilities. Separate the checks you can make from work for your web person."},
 "/guides/contractor-website-checklist/": {"title": "A contractor website checklist", "description": "Plan clear services, accepted jobs, project examples, service areas and estimate requests for your contractor website."},
 "/guides/website-redesign-brief/": {"title": "Write a website redesign brief", "description": "Gather your business facts, customer tasks, pages, content and decision makers before asking for a website redesign proposal."},
 "/guides/local-seo-profile-eligibility/": {"title": "Google Business Profile Eligibility", "description": "Check Google Business Profile eligibility, real customer contact and service areas before making a local-search plan."},
 "/guides/website-migration-checklist/": {"title": "Website migration checklist", "description": "Map old pages to their new destinations, check redirects and test contact forms. Includes an example and a website-migration worksheet."},
 "/guides/custom-website-or-template/": {"title": "Custom website or template?", "description": "Compare design, content, editing, ongoing costs and handoff. Choose the approach that fits the work your business website needs to do."},
 "/guides/website-care-versus-seo/": {"title": "Website care or monthly SEO?", "description": "Compare website checks and changes you send with researched improvements. See which problem each plan solves and choose a useful next step."},
 "/guides/website-audit-checklist/": {"title": "A practical website audit checklist", "description": "Start with a failing customer task. Use the checklist, inspect two documented studio fixes and record what still needs checking."},
 "/guides/website-repair-or-redesign/": {"title": "Repair or redesign your website?", "description": "Choose a small repair, broader rework or rebuild. Compare examples and use the worksheet to find the smallest change that solves the problem."},
 "/guides/seo-work-and-reporting/": {"title": "What monthly SEO work includes", "description": "See how research leads to a completed improvement and a monthly report. Separate the work delivered from rankings, clicks and business results."},
 "/guides/website-project-cost/": {"title": "Website Costs for Small Businesses", "description": "Plan build fees, hosting, domains and optional monthly work. Compare package scope and use the worksheet to budget with clear assumptions."},
 "/guides/website-maintenance-cost/": {"title": "What does website maintenance cost?", "description": "Separate hosting and software bills from website checks, edits and SEO. Identify who handles updates, backups and problems."},
 "/guides/website-launch-checklist/": {"title": "Website launch checklist", "description": "Check business facts, links, forms, mobile layouts and account access. Know what to approve and what your web person needs to test."},
 "/guides/ai-website-or-custom/": {"title": "AI website or custom build?", "description": "Compare speed, writing, editing, original design and ownership. Test the customer task and check facts before choosing a website approach."},
 "/guides/website-not-showing-on-google/": {"title": "Why is your website missing on Google?", "description": "Record the missing page and search. Check Google indexing and relevance, with clear next steps for you and your web person."},
};

const a=(url,label)=>`<a href="${url}">${label}</a>`;
const section=(id,label,title,body)=>`<section class="studio-section search-section" id="${id}"><p class="eyebrow">${label}</p><h2>${title}</h2>${body}</section>`;
const cards=items=>`<div class="continuing-grid">${items.map(([title,body])=>`<article><h3>${title}</h3>${body}</article>`).join('')}</div>`;

export function searchSupplement(path,o,config){
 if(path==='/services/web-design/')return section('planning-guides','Plan your project','Prepare a useful brief.','<p>'+a('/guides/website-redesign-brief/','List your pages, content and editing needs')+', or '+a('/guides/website-project-cost/','plan the website and provider budget')+'. Considering a builder? '+a('/guides/ai-website-or-custom/','Compare an AI draft with a custom website')+'.</p>');
 if(path==='/services/website-audit/')return section('review-next-step','After the review','Choose the next step.','<p>Use the findings to '+a('/guides/website-repair-or-redesign/','compare a small repair, broader changes and a rebuild')+'. '+a('/guides/website-audit-checklist/','Use the audit checklist to record the problem and retest')+'.</p>');
 if(path==='/services/website-care/')return section('supported-platforms','Before enrollment','Check the platform first.','<p>Tell me which website platform and connected tools you use. I confirm access and support before agreeing work. Security incidents, malware removal and complex migrations may need a separate specialist. <a href="/guides/website-care-versus-seo/">Compare care and SEO around the work you need</a>, or <a href="/guides/website-maintenance-cost/">plan your maintenance budget</a>.</p>');
 if(path==='/services/seo/')return section('search-services','Useful next steps','Find the question behind the search.','<p>Start with '+a('/guides/website-not-showing-on-google/','why a page is missing from Google')+', '+a('/guides/local-seo-profile-eligibility/','Business Profile eligibility')+' or '+a('/guides/service-area-pages/','useful service-area content')+'. Each needs different evidence and a different next step. '+a('/guides/website-care-versus-seo/','Compare care and search work')+' before choosing a plan.</p>');
 return '';
}

export const contextualGuideLinks={
  '/guides/website-project-cost/':[['/services/web-design/','Compare new website options'],['/services/website-redesign/','Plan an existing-site redesign']],
  '/guides/website-redesign-brief/':[['/services/website-redesign/','Discuss a scoped website redesign'],['/guides/website-migration-checklist/','Map the URLs you need to keep']],
  '/guides/website-migration-checklist/':[['/services/website-redesign/','Explore redesign and migration scope'],['/guides/website-not-showing-on-google/','Check search visibility after a change']],
  '/guides/website-repair-or-redesign/':[['/services/website-redesign/','Plan a rebuild when it is justified'],['/guides/contact-form-not-working/','Diagnose a form before replacing the site']],
  '/guides/website-audit-checklist/':[['/guides/website-not-showing-on-google/','Investigate a missing search result'],['/guides/contact-form-not-working/','Trace a failed contact form']],
  '/guides/local-seo-profile-eligibility/':[['/guides/service-area-pages/','Plan useful service-area content'],['/areas/erie-county/','See how this online studio explains its coverage']],
  '/guides/seo-work-and-reporting/':[['/guides/website-not-showing-on-google/','Distinguish indexing from ranking'],['/guides/service-area-pages/','Choose a useful local content task']],
  '/guides/website-care-versus-seo/':[['/guides/contact-form-not-working/','Diagnose a missing inquiry'],['/services/seo/#search-services','See the types of search work']],
  '/guides/custom-website-or-template/':[['/services/web-design/','Compare supported website options'],['/services/website-redesign/','Assess replacing your current website']]
};

export function searchGuideAdditions(path){
  if(path==='/guides/custom-website-or-template/')return [{id:'website-or-social',title:'Do you need a website as well as a social page?',body:'<p>A social profile can be useful for updates and conversation. A website gives you a place to explain your full offer, keep service and contact information together, and organize the questions customers need answered before they inquire. Decide which job is currently missing rather than buying a website simply because another business has one.</p><p>Considering an AI builder? Use the <a href="/guides/ai-website-or-custom/">AI-or-custom guide</a> to test a draft, compare editing and export options, and decide which work still needs help.</p>'}];

  return [];
}

export {countyCoverage} from './erie-content.mjs';
