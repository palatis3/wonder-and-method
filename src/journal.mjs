import {guideIllustration,guideIllustrationAlt} from './guide-art.mjs';
import {socialCardPath} from './social-cards.mjs';
import {accessibleGuideTables} from './guide-practical-steps.mjs';
import {pageDate} from './page-dates.mjs';
import {guideAction,contextualizeGuideBody} from './guide-inquiry-actions.mjs';
import {newGuides} from './audit-guide-updates.mjs';
import {ongoingGuides} from './ongoing-guides.mjs';
import {serviceCoverage} from './service-area.mjs';
import {searchGuides} from './search-guides.mjs';
import {guideContentSections as journalSections} from './guide-content.mjs';
import {guideDecision,guideDownload,guideDownloadLabel} from './guide-decisions.mjs';
import {escapeHtml as e} from './shared.mjs';

export {journalSections};

// Original publication is recorded in evidence/editorial-release.json.
// The October 15 revision reconciled offers and added explanatory illustrations.
export const journal=[
 ...newGuides,
 ...searchGuides,
 ...ongoingGuides,
 {path:'/guides/website-project-cost/',title:'What does a custom website cost in Buffalo?',category:'Planning',image:'website-budget',alt:'Illustrated website proposal showing Design, Content and Build beside a premium website mockup',description:'Plan a Buffalo small business website budget with three explicit scope examples, ongoing costs, editing choices and a practical quote checklist.',minutes:6,fallback:'/pricing/'},
 {path:'/guides/website-redesign-brief/',title:'A website redesign brief that gets useful answers',category:'Planning',image:'redesign-brief',alt:'A redesign brief with customer, pages, content and next-step questions beside home and contact page concepts',description:'A practical website redesign brief for Buffalo and Erie County service businesses, with a downloadable checklist for content, ownership, scope and launch.',minutes:5,fallback:'/services/web-design/'},
 {path:'/guides/local-seo-profile-eligibility/',title:'Local SEO starts with the business you actually run',category:'Search',image:'local-search',alt:'An illustrated Buffalo local-search map with service, area and website cards against a stylized waterfront skyline',description:'Local SEO and Google Business Profile eligibility for Buffalo service businesses: online-only work, service areas, address choices and useful website content.',minutes:5,fallback:'/services/seo/'},
 {path:'/guides/seo-work-and-reporting/',title:'Monthly SEO: from keyword opportunities to completed work',category:'Search',image:'seo-report',alt:'An illustrative monthly SEO review organized into work completed, what changed and the next decision',description:'Follow keyword research through a completed page, campaign plan and useful reporting. Understand low difficulty, actual search evidence and monthly SEO scope.',minutes:6,fallback:'/services/seo/'},
 {path:'/guides/website-migration-checklist/',title:'A website migration checklist for your next redesign',category:'Websites',image:'website-migration',alt:'Current and new website concepts connected by an arrow, preserving pages, links and inquiries',description:'Plan a website migration with an old-to-new URL map, redirects, form checks, account ownership and a measured launch review. Includes a CSV worksheet.',minutes:5,fallback:'/services/web-design/'},
 {path:'/guides/custom-website-or-template/',title:'Custom website or template? Start with the job.',category:'Websites',image:'custom-or-template',alt:'Two fictional website concepts comparing a template layout with a custom editorial direction',description:'Compare a custom website and a template around content, editing, accessibility, ongoing cost and the customer journey for a small service business.',minutes:5,fallback:'/services/web-design/'},
 {path:'/guides/website-care-versus-seo/',title:'Website care, monthly SEO or growth: what are you paying for?',category:'Planning',image:'care-versus-seo',diagram:true,imageHeight:520,alt:'Two work lanes: keep the site working and improve the search decision. Both lead to verifying and recording the change.',description:'Compare website maintenance and SEO by the problem, agreed task and verification. Includes a decision worksheet, current studio plan references and a reusable work-record template.',minutes:6,fallback:'/services/website-care/',datePublished:'2026-10-15'},
 {path:'/guides/website-audit-checklist/',title:'A website audit checklist you can actually use',category:'Websites',image:'audit-checklist',diagram:true,imageHeight:660,alt:'Audit sequence: question, evidence, priority, small agreed fix, retest and dated record. Missing access is recorded and obtained before dependent checks continue.',description:'Start a small business website audit with a failing visitor task. Download an actionable checklist and inspect two documented fixes, with access and testing limits made clear.',minutes:7,fallback:'/services/website-audit/',datePublished:'2026-10-15'},
 {path:'/guides/website-repair-or-redesign/',title:'Repair or redesign your website? Choose the smallest useful change.',category:'Planning',image:'repair-or-redesign',diagram:true,imageHeight:850,diagramCaption:'Process diagram: first confirm the visitor task and access. Keep a useful site when the task works. If a supported small correction and its retest are known, fix and verify it. Otherwise diagnose the scope: rework the current content or structure where it can support the requirements, or assess a rebuild. Missing access pauses the dependent decision; no branch promises a price or outcome.',alt:'Decision tree for keeping, correcting, reworking or rebuilding a website, with a separate needs-access branch before the decision.',description:'For Buffalo and Erie County small businesses deciding whether an existing website needs a small fix, broader rework or a rebuild. Includes practical examples and a decision worksheet.',minutes:6,fallback:'/services/website-audit/',datePublished:'2026-10-15'}
].map(x=>({datePublished:'2026-10-14',dateModified:'2026-10-16',...x,...(['/guides/website-project-cost/','/guides/contact-form-not-working/','/guides/website-not-showing-on-google/'].includes(x.path)?{dateModified:'2026-10-17'}:{}),needed:'Dated editorial accuracy review and owner publication instruction.'})).map(item=>({...item,dateModified:pageDate(item.path,item.dateModified)}));
export const journalImage=item=>socialCardPath(item.path);

const readableDate=value=>new Date(value+'T12:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
const guideDiagramAlts={
 'google-visibility-flow':'Keep private pages excluded. For public pages, check discovery, indexing and relevance; assess Maps eligibility separately. Search placement is not guaranteed.',
 'contact-form-flow':'Trace one authorized test through submission and any saved receipt, notification, inbox and reply. Investigate the first missing step; a success message alone does not prove delivery.',
 'service-area-decision':'Confirm coverage and a distinct customer question. Use an existing page when it answers the question; create and maintain a separate page only when useful.',
 'maintenance-cycle':'Choose important website tasks, check them, record results, agree corrections and retest. Set the schedule and responsibilities for your actual site.',
 'contractor-inquiry':'Explain accepted work, show real evidence, confirm coverage, collect job details and acknowledge the request. A request is not a quote or confirmed appointment.',
 'care-versus-seo':'Care keeps the site working; search work improves its answer to a customer question. Both end with a verified, dated change record, not promised growth.',
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
 'website-audit-checklist':'Follow a customer task, record where it fails and agree a small correction with a clear retest.',
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
const articleFigure=item=>item.diagram?`<figure class="journal-hero journal-diagram"><img src="/assets/guides/${item.image}.svg" width="360" height="${item.imageHeight}" alt="${e(guideDiagramAlts[item.image])}" loading="lazy" decoding="async"></figure>`:`<figure class="journal-hero"><img src="${guideIllustration(item)}-1200.webp" srcset="${guideIllustration(item)}-640.webp 640w, ${guideIllustration(item)}-1200.webp 1200w" sizes="(max-width:700px) calc(100vw - 40px), (max-width:1000px) 62vw, 760px" width="1200" height="800" alt="${e(guideIllustrationAlt(item))}" loading="lazy" decoding="async"></figure>`;
export function journalCard(item,{headingLevel=3,layout='related',eager=false}={}){
 const slug=item.path.split('/').filter(Boolean).at(-1),description=guideCardDescriptions[slug];
 if(!description)throw Error(`Missing guide card description: ${slug}`);
 if(layout==='index'){const [title,summary]=guideIndexCopy[slug];return `<article class="journal-card journal-card-text"><div><h${headingLevel}><a href="${item.path}">${e(title)}</a></h${headingLevel}><p class="journal-card-description">${e(summary)}</p></div></article>`;}
 return `<article class="journal-card"><span class="journal-card-image"><img src="${guideThumbnail(item)}-480.webp" srcset="${guideThumbnail(item)}-480.webp 480w, ${guideThumbnail(item)}-720.webp 720w, ${guideThumbnail(item)}-1080.webp 1080w" sizes="(max-width:767px) calc(100vw - 40px), 406px" width="1080" height="720" alt="" loading="${eager?'eager':'lazy'}" decoding="async"></span><div><p class="eyebrow">${item.category}</p><h${headingLevel}><a href="${item.path}">${e(item.title)}</a></h${headingLevel}></div><p class="journal-card-description">${e(description)}</p></article>`;
}
export function journalIndex(items){const groups=[{id:'diagnose',title:'Solve a website problem',paths:['website-not-showing-on-google','contact-form-not-working']},{id:'choose',title:'Choose your next project',paths:['website-repair-or-redesign','custom-website-or-template','website-project-cost','ai-website-or-custom']},{id:'plan',title:'Plan the work',paths:['service-area-pages','website-redesign-brief','website-audit-checklist','website-migration-checklist','contractor-website-checklist','website-launch-checklist']},{id:'care-search',title:'Understand care and search',paths:['website-care-versus-seo','seo-work-and-reporting','local-seo-profile-eligibility','website-maintenance-checklist','website-maintenance-cost']}];let firstCard=true;return `<header class="page-intro"><p class="eyebrow">Website guides</p><h1>Practical website<br>and SEO guides.</h1><p class="lede">Clear explanations, examples and worksheets for the decisions around your website. Written for service businesses in Buffalo, Erie County and across ${e(serviceCoverage().region)}.</p></header><nav class="page-jump" aria-label="Guide topics">${groups.map(g=>'<a href="#'+g.id+'">'+g.title+'</a>').join('')}</nav>${groups.map(g=>'<section class="journal-group" id="'+g.id+'"><h2>'+g.title+'</h2><div class="journal-index-list">'+items.filter(item=>g.paths.some(slug=>item.path==='/guides/'+slug+'/')).map(item=>{const card=journalCard(item,{headingLevel:3,layout:'index',eager:firstCard});firstCard=false;return card;}).join('')+'</div></section>').join('')}`;}
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
 const paths=relatedGuidePaths[item.path.split('/').filter(Boolean).at(-1)];
 if(!paths)throw Error(`Missing related guides for ${item.path}`);
 return paths.map(slug=>available.find(page=>page.path===`/guides/${slug}/`)).filter(Boolean);
};
export function journalArticle(item,offers,available){
 const sections=journalSections(item.path,offers).map(section=>({...section,body:accessibleGuideTables(contextualizeGuideBody(section.body,item.path))}));
 const download=guideDownload(item.path);
 if(download&&!sections.some(x=>x.body.includes(download)))sections.push({id:'take-away',title:'Keep a checklist for your project',body:`<p><a href="${download}" download>${e(guideDownloadLabel(item.path))} (${download.endsWith('.csv')?'CSV':'TXT'})</a> and fill it with your actual business facts.</p>`});
 const words=(item.description+' '+guideDecision(item.path,offers)+' '+sections.map(x=>x.title+' '+x.body).join(' ')).replace(/<[^>]+>/g,' ').split(/\s+/).filter(Boolean).length;
 const minutes=Math.max(1,Math.ceil(words/220));
 return `<article class="journal-article"><header class="journal-header"><p class="eyebrow">${item.category} / ${minutes} min read</p><h1>${e(item.title)}</h1><p class="lede">${e(item.description)}</p><p class="journal-byline">By <a href="/about/">Wonder and Method</a> <span class="byline-date">Published <time datetime="${item.datePublished}">${readableDate(item.datePublished)}</time></span>${item.dateModified!==item.datePublished?` <span class="byline-date">Updated <time datetime="${item.dateModified}">${readableDate(item.dateModified)}</time></span>`:''} <a class="byline-correction" href="/contact/?request_kind=question#inquiry">Suggest a correction</a></p>${guideDecision(item.path,offers)}${guideAction(item,{compact:true})}</header><div class="journal-layout"><details class="journal-toc"><summary>In this guide</summary><nav aria-label="In this guide"><ol>${sections.map(x=>`<li><a href="#${x.id}">${e(x.title.replace(/^\d+[.)]\s*/,''))}</a></li>`).join('')}</ol></nav></details><div class="journal-prose">${sections.map(x=>`<section id="${x.id}"><h2>${e(x.title)}</h2>${x.body}</section>`).join('')}<details class="journal-visual"><summary>View the illustrated explanation</summary>${articleFigure(item)}</details>${guideAction(item)}</div></div></article><section class="journal-related"><p class="eyebrow">Keep exploring</p><h2>Related guides</h2><div class="journal-grid">${relatedGuides(item,available).map(item=>journalCard(item)).join('')}</div><a class="text-link" href="/guides/">All guides</a></section>`;
}
