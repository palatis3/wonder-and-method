import {friendlyGuideDownloads,withoutRepeatedPreparation,guidePreparationNote} from './guide-presentation.mjs';
import {serviceRegionLabel} from './assets/service-state-info.js';
import {guideDisplayName} from './guide-display-names.mjs';
import {guideIllustration,guideIllustrationAlt} from './guide-art.mjs';
import {socialCardPath} from './social-cards.mjs';
import {accessibleGuideTables} from './guide-practical-steps.mjs';
import {pageDate} from './page-dates.mjs';
import {guideAction,contextualizeGuideBody} from './guide-inquiry-actions.mjs';
import {researchGuides} from './research-guides.mjs';
import {guideDetails as researchGuideDetails} from './guide-details.mjs';
import {longtailGuides} from './longtail-guides.mjs';
import {operatingGuides} from './operating-guides.mjs';
import {floridaGuides} from './florida-guides.mjs';
import {newGuides} from './audit-guide-updates.mjs';
import {ongoingGuides} from './ongoing-guides.mjs';
import {serviceCoverageLink} from './service-area.mjs';
import {searchGuides} from './search-guides.mjs';
import {semrushGuides} from './semrush-guides.mjs';
import {guideContentSections as journalSections} from './guide-content.mjs';
import {guideDecision,guideDownload,guideDownloadLabel} from './guide-decisions.mjs';
import {escapeHtml as e} from './shared.mjs';

export {journalSections};

// Original publication is recorded in evidence/editorial-release.json.
// The October 15 revision reconciled offers and added explanatory illustrations.
const guideGroups=[{"id":"diagnose","title":"Fix a problem","paths":["slow-website-on-mobile","website-not-generating-leads","contact-form-not-working","website-repair-or-redesign","website-audit-checklist"]},{"id":"plan","title":"Plan a website","paths":["ai-website-content-review","website-project-cost","how-to-choose-a-web-designer","one-page-website-seo","custom-website-or-template","ai-website-or-custom","website-content-template","website-redesign-brief","website-redesign-timeline","contractor-website-checklist","website-migration-checklist","website-launch-checklist","website-handover-checklist"]},{"id":"search","title":"Search visibility","paths":["ai-search-visibility","local-seo-audit","website-not-showing-on-google","service-area-pages","local-seo-profile-eligibility","seo-work-and-reporting"]},{"id":"care-search","title":"Ongoing care","paths":["website-care-versus-seo","website-maintenance-checklist","website-maintenance-cost"]}];
guideGroups.find(group=>group.id==='plan').paths.push('industrial-website-planning');
guideGroups.push(...['Business workflows','Local website cases'].map((title,i)=>({id:i?'local-cases':'business-workflows',title,paths:[...operatingGuides,...floridaGuides,...semrushGuides].filter(item=>item.category===title).map(item=>item.path.split('/').filter(Boolean).at(-1))})));
guideGroups.find(group=>group.id==='business-workflows').title='Forms, bookings and customer instructions';
const guideGroupDescriptions={diagnose:'Find the broken step before choosing a repair or a larger project.',plan:'Compare costs, choose the scope and prepare the information a designer needs.',search:'Help people and search engines understand your real services and useful answers.','care-search':'Plan routine checks, updates and ongoing costs.','business-workflows':'Worked examples for the information customers need before an order, visit or request.','local-cases':'Public examples from named places, with lessons you can adapt to a similar business. These are research examples, not studio client projects.'};
const guideCategory=item=>guideGroups.find(group=>group.paths.includes(item.path.split('/').filter(Boolean).at(-1)))?.title||item.category;

export const journal=[
 ...operatingGuides,
 ...floridaGuides,
 ...longtailGuides,
 ...researchGuides,
 ...newGuides,
 ...searchGuides,
 ...ongoingGuides,
 ...semrushGuides,
 {path:'/guides/website-project-cost/',title:'Small business website costs: plan the full budget',category:'Planning',image:'website-budget',alt:'Illustrated website proposal showing Design, Content and Build beside a premium website mockup',description:`Plan a small business website or redesign budget with current studio prices, ongoing costs, migration work and a practical quote checklist. Based in Buffalo; serving ${serviceRegionLabel}.`,minutes:6,fallback:'/pricing/'},
 {path:'/guides/website-redesign-brief/',title:'A website redesign brief that gets useful answers',category:'Planning',image:'redesign-brief',alt:'A redesign brief with customer, pages, content and next-step questions beside home and contact page concepts',description:'Prepare a redesign brief for your service business, with a download covering pages, facts, account ownership and launch checks.',minutes:5,fallback:'/services/web-design/'},
 {path:'/guides/local-seo-profile-eligibility/',title:'Google Business Profile eligibility: local SEO starts with the business you actually run',category:'Search',image:'local-search',alt:'An illustrated Buffalo local-search map with service, area and website cards against a stylized waterfront skyline',description:'Local SEO and Google Business Profile eligibility for small service businesses: online-only work, service areas, address choices and useful website content.',minutes:5,fallback:'/services/seo/'},
 {path:'/guides/seo-work-and-reporting/',title:'What monthly SEO work includes',category:'Search',image:'seo-report',alt:'An illustrative monthly SEO review organized into work completed, what changed and the next decision',description:'See how search research becomes a finished page improvement, what the monthly plans include and how to read the report.',minutes:6,fallback:'/services/seo/'},
 {path:'/guides/website-migration-checklist/',title:'A website migration checklist for your next redesign',category:'Websites',image:'website-migration',alt:'Current and new website concepts connected by an arrow, preserving pages, links and inquiries',description:'Plan a website migration with an old-to-new URL map, redirects, form checks, account ownership and a measured launch review. Includes a CSV worksheet.',minutes:5,fallback:'/services/web-design/'},
 {path:'/guides/custom-website-or-template/',title:'Custom website or template? Start with the job.',category:'Websites',image:'custom-or-template',alt:'Two fictional website concepts comparing a template layout with a custom editorial direction',description:'Compare a custom website and a template around content, editing, accessibility, ongoing cost and the customer journey for a small service business.',minutes:5,fallback:'/services/web-design/'},
 {path:'/guides/website-care-versus-seo/',title:'Website care or monthly SEO: what are you paying for?',category:'Planning',image:'care-versus-seo',diagram:true,imageHeight:520,alt:'Two work lanes: keep the site working and improve the search decision. Both lead to verifying and recording the change.',description:'Compare routine checks and small edits with work to improve a service page. Includes plan prices and a worksheet for choosing the job you need.',minutes:6,fallback:'/services/website-care/',datePublished:'2026-10-15'},
 {path:'/guides/website-audit-checklist/',title:'A practical website audit checklist',category:'Websites',image:'audit-checklist',diagram:true,imageHeight:660,alt:'Audit sequence: question, evidence, priority, small agreed fix, retest and dated record. Missing access is recorded and obtained before dependent checks continue.',description:'Start with a customer task that fails, use the checklist and see two small fixes made to this website.',minutes:7,fallback:'/services/website-audit/',datePublished:'2026-10-15'},
 {path:'/guides/website-repair-or-redesign/',title:'Repair or redesign your website? Choose the smallest useful change.',category:'Planning',image:'repair-or-redesign',diagram:true,imageHeight:850,diagramCaption:'Process diagram: first confirm the visitor task and access. Keep a useful site when the task works. If a supported small correction and its retest are known, fix and verify it. Otherwise diagnose the scope: rework the current content or structure where it can support the requirements, or assess a rebuild. Missing access pauses the dependent decision; no branch promises a price or outcome.',alt:'Decision tree for keeping, correcting, reworking or rebuilding a website, with a separate needs-access branch before the decision.',description:'For small service businesses deciding whether an existing website needs a small fix, broader changes or a rebuild. Includes practical examples and a decision worksheet.',minutes:6,fallback:'/services/website-audit/',datePublished:'2026-10-15'}
].map(x=>({datePublished:'2026-10-14',dateModified:'2026-10-16',...x,...(['/guides/website-project-cost/','/guides/contact-form-not-working/','/guides/website-not-showing-on-google/'].includes(x.path)?{dateModified:'2026-10-17'}:{}),needed:'Dated editorial accuracy review and owner publication instruction.'})).map(item=>({...item,title:guideDisplayName(item),dateModified:pageDate(item.path,item.dateModified),category:guideCategory(item)}));
export const journalImage=item=>socialCardPath(item.path);

const readableDate=value=>new Date(value+'T12:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
const guideDiagramAlts={
 'google-visibility-flow':'Keep private pages excluded. For public pages, check discovery, indexing and relevance; assess Maps eligibility separately. Search placement is not guaranteed.',
 'contact-form-flow':'Trace one authorized test through submission and any saved receipt, notification, inbox and reply. Investigate the first missing step; a success message alone does not prove delivery.',
 'service-area-decision':'Confirm coverage and the visitor’s need. Use an existing page when it does the job; create and maintain a separate page only when it adds substantial help.',
 'maintenance-cycle':'Choose important website tasks, check them, record results, agree on corrections and retest. Set the schedule and responsibilities for your actual site.',
 'contractor-inquiry':'Explain accepted work, show real evidence, confirm coverage, collect job details and acknowledge the request. A request is not a quote or confirmed appointment.',
 'care-versus-seo':'Care provides routine checks and supplied small edits; search work improves a page’s answer to a customer question. Both end with a verified, dated change record, not promised growth.',
 'audit-checklist':'Question, evidence, priority, agreed small fix, retest and dated record. Obtain missing account access before continuing checks that need it.',
 'repair-or-redesign':'Confirm the task and access. Keep what works, fix a known small problem, or assess broader changes and rebuilding. Missing access pauses the decision.'
};
const guideCardDescriptions={
 'website-maintenance-cost':'Separate hosting and tool bills from maintenance work, then build a realistic yearly website budget.',
 'website-launch-checklist':'Check content, forms, phone layouts and account access before launch, then test the public website.',
 'ai-website-or-custom':'Test an AI website draft for accurate content, working forms, editing access and ownership before committing.',
 'website-not-showing-on-google':'Check whether Google has indexed your page, then investigate search relevance and Maps eligibility separately.',
 'contact-form-not-working':'Send one test and check submissions, notification settings, spam and replies to find the missing step.',
 'service-area-pages':'Decide whether your customers need a separate area page or one clear explanation of service coverage.',
 'website-maintenance-checklist':'Keep business details, contact paths and account access working with a practical schedule and maintenance log.',
 'contractor-website-checklist':'Explain accepted jobs, real project evidence, service coverage and what customers should send for an estimate.',
 'website-project-cost':'Compare website packages, local quotes and outside bills, with scope and payment schedules made clear.',
 'website-redesign-brief':'Prepare the customer goals, page list, business facts and editing responsibilities needed for a useful quote.',
 'local-seo-profile-eligibility':'Check Google Business Profile eligibility and describe your real services and coverage without inventing an office.',
 'seo-work-and-reporting':'Connect search research to a completed website improvement, then separate the work record from measured results.',
 'website-migration-checklist':'Map old page addresses, plan matching redirects and test forms before and after moving your website.',
 'custom-website-or-template':'Compare custom design and templates around your content, customer journey, editing needs, ownership and ongoing costs.',
 'website-care-versus-seo':'Match routine updates and search improvements to the problem before choosing monthly help or a finite project.',
 'website-audit-checklist':'Follow a customer task, record where it fails and agree on a small correction with a clear retest.',
 'website-repair-or-redesign':'Decide whether to keep your site, fix a small problem, rework its content or consider rebuilding.'
};
const guideThumbnail=item=>'/assets/guides/'+item.path.split('/').filter(Boolean).at(-1)+'-card';
const guideIndexCopy={
 'website-maintenance-cost':['Website maintenance costs','Add provider bills, routine checks and optional help to your yearly budget.'],
 'website-launch-checklist':['Website launch checklist','Check content, forms, phone layouts and accounts before and after launch.'],
 'ai-website-or-custom':['AI website or custom build?','Test the draft, editing tools and ownership before choosing your next step.'],
 'website-not-showing-on-google':['Website missing from Google?','Check whether Google can find your page, then investigate the search question.'],
 'contact-form-not-working':['Contact form not working?','Send one test and check the saved record, notification, inbox and reply.'],
 'service-area-pages':['Do you need area pages?','Decide when a separate location page answers a useful customer question.'],
 'website-maintenance-checklist':['Website maintenance checklist','Keep contact paths, business details and account access working with regular checks.'],
 'contractor-website-checklist':['Contractor website checklist','Explain accepted jobs, project evidence, coverage and what customers should send.'],
 'website-project-cost':['Custom website costs','Compare build scopes, provider bills and ongoing work using a clear budget.'],
 'website-redesign-brief':['Prepare a redesign brief','Outline your customer goals, pages, business facts and future editing needs.'],
 'local-seo-profile-eligibility':['Google Business Profile eligibility','Check which business locations and service arrangements qualify for a profile.'],
 'seo-work-and-reporting':['What monthly SEO includes','Connect search research to completed improvements and a useful monthly work record.'],
 'website-migration-checklist':['Website migration checklist','Map old URLs and check forms, accounts and redirects during a move.'],
 'custom-website-or-template':['Custom website or template?','Compare both approaches around your content, editing needs, ownership and costs.'],
 'website-care-versus-seo':['Website care or SEO?','Match routine updates and search improvements to the work your website needs.'],
 'website-audit-checklist':['Check your own website','Follow a customer task, record the problem and agree what to fix.'],
 'website-repair-or-redesign':['Repair or redesign?','Decide whether to keep, repair, rework or replace your existing website.']
};
const articleFigure=item=>{
 const slug=item.path.split('/').filter(Boolean).at(-1),steps=researchGuideDetails[slug]?.steps;
 if(slug==='website-not-generating-leads')return `<nav class="page-jump" aria-label="Inquiry diagnosis steps"><a href="#find-the-bottleneck">Find the failed stage</a><a href="#worked-example">See a worked example</a><a href="#measurement">Choose evidence to record</a><a href="#lead-record">Record the next action</a></nav>`;
 if(steps?.[0]?.[0]==='Define the customer decision')return '';
 if(steps)return `<ol class="guide-steps" aria-label="Steps in this guide">${steps.map(([title,detail])=>`<li><strong>${e(title)}</strong><span>${e(detail)}</span></li>`).join('')}</ol>`;
 // Keep the branching decision diagram; other figures repeated the nearby text.
 if(item.image==='repair-or-redesign')return `<figure class="journal-hero journal-diagram"><img src="/assets/guides/${item.image}.svg" width="360" height="${item.imageHeight}" alt="${e(guideDiagramAlts[item.image])}" loading="lazy" decoding="async"><figcaption>${e(item.diagramCaption)}</figcaption></figure>`;
 return '';
};
const displayGuideTitle=item=>item.title;
export function journalCard(item,{headingLevel=3,layout='related',eager=false}={}){
 const slug=item.path.split('/').filter(Boolean).at(-1),description=researchGuideDetails[slug]?.indexDescription||guideCardDescriptions[slug];
 if(!description)throw Error(`Missing guide card description: ${slug}`);
 if(layout==='index'){const extra=researchGuideDetails[slug];const summary=extra?extra.indexDescription:guideIndexCopy[slug][1];const title=displayGuideTitle(item);return `<article class="journal-card journal-card-text"><div><h${headingLevel}><a href="${item.path}">${e(title)}</a></h${headingLevel}><p class="journal-card-description">${e(summary)}</p></div></article>`;}
 return `<article class="journal-card journal-card-text"><div><h${headingLevel}><a href="${item.path}">${e(displayGuideTitle(item))}</a></h${headingLevel}><p class="journal-card-description">${e(description)}</p></div></article>`;
}
const indexGroup=(group,items)=>{
 const selected=group.paths.map(slug=>items.find(item=>item.path===`/guides/${slug}/`)).filter(Boolean);
 const split=!['business-workflows','local-cases'].includes(group.id)&&selected.length>4?4:selected.length;
 const cards=list=>list.map(item=>journalCard(item,{headingLevel:3,layout:'index'})).join('');
 return `<section class="journal-group" data-guide-group id="${group.id}"><h2>${e(group.title)} <span class="guide-topic-count">${selected.length} guides</span></h2><p class="guide-group-intro">${e(guideGroupDescriptions[group.id])}</p><div class="journal-index-list">${cards(selected.slice(0,split))}</div>${split<selected.length?`<details class="guide-more" data-guide-more><summary>Browse ${selected.length-split} more ${selected.length-split===1?'guide':'guides'} on this topic</summary><div class="journal-index-list">${cards(selected.slice(split))}</div></details>`:''}</section>`;
};
export function journalIndex(items){
 const core=guideGroups.filter(group=>!['business-workflows','local-cases'].includes(group.id)),examples=guideGroups.filter(group=>['business-workflows','local-cases'].includes(group.id));
 return `<header class="page-intro"><p class="eyebrow">Website guides</p><h1>Practical website<br>and SEO guides.</h1><p class="lede">Clear explanations, examples and worksheets for the decisions around your website. Written for service businesses across ${serviceCoverageLink()}.</p></header><section class="guide-start"><h2>Start here</h2><ul><li><a href="/guides/website-not-generating-leads/">My website is not bringing in inquiries</a></li><li><a href="/guides/website-project-cost/">What should I budget?</a></li><li><a href="/guides/contact-form-not-working/">My contact form is not working</a></li></ul></section><form class="guide-filters" data-guide-filters hidden role="search" aria-label="Find a guide"><div><label for="guide-search">Search guides</label><input id="guide-search" type="search" maxlength="120" placeholder="For example, pricing, contact forms or booking"></div><div><label for="guide-category">Topic</label><select id="guide-category"><option value="">All topics</option>${guideGroups.map(group=>`<option value="${group.id}">${e(group.title)}</option>`).join('')}</select></div><button type="reset" class="text-button">Reset filters</button><p role="status" aria-live="polite" data-guide-count>${items.length} guides available.</p></form><span id="choose"></span><nav class="page-jump" aria-label="Guide topics">${core.map(group=>'<a href="#'+group.id+'">'+group.title+'</a>').join('')}<a href="#examples">Examples and workflows</a><a href="#planning-tools">Planning tool</a></nav>${core.map(group=>indexGroup(group,items)).join('')}<details class="guide-examples" id="examples"><summary>Browse business workflows and local website cases</summary><p>Use these worked examples to plan the information, choices and next steps a website needs.</p><nav class="related-links" aria-label="Example collections">${examples.map(group=>'<a href="#'+group.id+'">'+group.title+'</a>').join('')}</nav>${examples.map(group=>indexGroup(group,items)).join('')}</details><section class="journal-group" id="planning-tools"><h2>Try a planning tool</h2><h3><a href="/tools/website-roi-calculator/">Website ROI scenario calculator</a></h3><p>Enter your costs and assumptions about extra jobs to see when a website project could pay for itself.</p></section>`;
}

const relatedGuidePaths={
  'website-maintenance-cost':['website-maintenance-checklist','website-care-versus-seo','website-project-cost'],
  'website-launch-checklist':['website-redesign-brief','website-migration-checklist','website-maintenance-checklist'],
  'ai-website-or-custom':['custom-website-or-template','website-project-cost','website-launch-checklist'],
  'website-not-showing-on-google':['seo-work-and-reporting','local-seo-profile-eligibility','service-area-pages'],
  'contact-form-not-working':['website-audit-checklist','website-maintenance-checklist','website-repair-or-redesign'],
  'service-area-pages':['contractor-website-checklist','local-seo-profile-eligibility','seo-work-and-reporting'],
  'website-maintenance-checklist':['website-maintenance-cost','contact-form-not-working','website-audit-checklist'],
  'contractor-website-checklist':['service-area-pages','website-redesign-brief','contact-form-not-working'],
  "website-project-cost": [
    "custom-website-or-template",
    "website-redesign-brief",
    "website-care-versus-seo"
  ],
  "website-redesign-brief": [
    "website-migration-checklist",
    "website-audit-checklist",
    "website-project-cost"
  ],
  "local-seo-profile-eligibility": [
    "seo-work-and-reporting",
    "website-care-versus-seo",
    "website-redesign-brief"
  ],
  "seo-work-and-reporting": [
    "website-care-versus-seo",
    "local-seo-profile-eligibility",
    "website-audit-checklist"
  ],
  "website-migration-checklist": [
    "website-redesign-brief",
    "website-repair-or-redesign",
    "website-audit-checklist"
  ],
  "custom-website-or-template": [
    "website-project-cost",
    "website-redesign-brief",
    "website-care-versus-seo"
  ],
  "website-care-versus-seo": [
    "seo-work-and-reporting",
    "website-audit-checklist",
    "website-project-cost"
  ],
  "website-audit-checklist": [
    "website-repair-or-redesign",
    "website-migration-checklist",
    "website-care-versus-seo"
  ],
  "website-repair-or-redesign": [
    "website-audit-checklist",
    "website-project-cost",
    "website-redesign-brief"
  ]
};

export const relatedGuides=(item,available)=>{
 const slug=item.path.split('/').filter(Boolean).at(-1);const paths=researchGuideDetails[slug]?.related||relatedGuidePaths[slug];
 if(!paths)throw Error(`Missing related guides for ${item.path}`);
 return paths.map(slug=>available.find(page=>page.path===`/guides/${slug}/`)).filter(Boolean).slice(0,2);
};
export function journalArticle(item,offers,available){
 const sections=journalSections(item.path,offers).map(section=>({...section,body:friendlyGuideDownloads(accessibleGuideTables(contextualizeGuideBody(withoutRepeatedPreparation(section.body),item.path)),item.path)}));
 // Lead long worked collections with the reusable instruction; keep every
 // case, source, section id and table of contents entry intact.
 const firstSection={'/guides/timed-booking-handoff/':'layout','/guides/seo-work-and-reporting/':'completed-report','/guides/website-content-template/':'notes-to-copy'}[item.path];
 const firstIndex=sections.findIndex(section=>section.id===firstSection);
 if(firstIndex>0)sections.unshift(...sections.splice(firstIndex,1));
 const optionalCases=item.path==='/guides/timed-booking-handoff/'?new Set(['planning-2','planning-3','planning-4','planning-5','related-cases']):new Set();
 const renderSection=(x,index)=>{const body=x.body.replace(`<caption>${e(x.title)}</caption>`,`<caption class="guide-caption-hidden">${e(x.title)}</caption>`);return `<section${optionalCases.has(x.id)?'':` id="${x.id}"`}>${optionalCases.has(x.id)?`<details class="guide-case-details" id="${x.id}"><summary>${e(x.title)}</summary>${body}</details>`:`<h2>${e(x.title)}</h2>${body}`}</section>${index===0?articleFigure(item):''}`;};
 const download=guideDownload(item.path);
 const takeaway=download&&!sections.some(x=>x.body.includes(download))?`<div id="take-away"><p><a href="${download}" download>${e(guideDownloadLabel(item.path))} (${download.endsWith('.csv')?'spreadsheet':'text file'})</a>. Fill it in with your own business facts.</p></div>`:'';
 const words=(item.description+' '+guideDecision(item.path,offers)+' '+sections.map(x=>x.title+' '+x.body).join(' ')).replace(/<[^>]+>/g,' ').split(/\s+/).filter(Boolean).length;
 const minutes=Math.max(1,Math.ceil(words/220));
 const toc=sections.length>=6||words>=900?`<details class="journal-toc"><summary>In this guide</summary><nav aria-label="In this guide"><ol>${sections.map(x=>`<li><a href="#${x.id}">${e(x.title)}</a></li>`).join('')}</ol></nav></details>`:'';
 return `<article class="journal-article"><header class="journal-header"><p class="eyebrow">${e(item.category)} / ${minutes} min read</p><h1>${e(item.title)}</h1><p class="lede">${e(item.description)}</p><p class="journal-byline">By <a href="/about/">Wonder and Method</a> <span class="byline-date">Published <time datetime="${item.datePublished}">${readableDate(item.datePublished)}</time></span>${item.dateModified!==item.datePublished?` <span class="byline-date">Updated <time datetime="${item.dateModified}">${readableDate(item.dateModified)}</time></span>`:''} <a class="byline-correction" href="/contact/?request_kind=question#inquiry">Suggest a correction</a></p></header><div class="journal-layout${toc?'':' journal-layout-no-toc'}">${toc}<div class="journal-prose">${guideDecision(item.path,offers)}${download?`<p class="guide-help"><a href="${download}" download>${e(guideDownloadLabel(item.path))} (${download.endsWith('.csv')?'spreadsheet':'text file'})</a></p>`:''}${sections.map(renderSection).join('')}${takeaway}${guideAction(item,{offers})}${guidePreparationNote(item)}</div></div></article><section class="journal-related"><p class="eyebrow">Keep exploring</p><h2>Related guides</h2><div class="journal-grid">${relatedGuides(item,available).map(item=>journalCard(item)).join('')}</div><a class="text-link" href="/guides/">All guides</a></section>`;
}
