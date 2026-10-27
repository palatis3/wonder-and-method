import {money,escapeHtml as e} from './shared.mjs';
import {guideScopeNotes} from './guide-scope-notes.mjs';
import {guideDetails as researchGuideDetails} from './guide-details.mjs';
import {guideBuildTiming} from './research-guide-more.mjs';

const decisions={
 'website-repair-or-redesign':['Fix the specific problem before paying for a new site.','A button going to the wrong place or an unclear service description may only need a small fix. Consider a redesign when the business needs things the current site cannot sensibly do.'],
 'website-project-cost':['Budget for the build, the provider bills and any help you need afterward.','Compare quotes using the same page list, writing, features and editing requirements. The table below shows my fixed website fees; the worked example shows how to add continuing costs without counting them twice.'],
 'website-redesign-brief':['Name the customer action, page list and editing owner before asking for a price.','An illustrative local home-service business replaces “a modern site” with “explain which repairs we take, our actual service area and how to request an estimate.”'],
 'local-seo-profile-eligibility':['Describe the business as it operates; verify profile eligibility separately.','An online-only Buffalo consultant can describe the clients it serves on its website. It should not claim a staffed public office or create a Business Profile solely because it serves Buffalo.'],
 'seo-work-and-reporting':['Monthly SEO work should include research, an agreed website improvement, publication checks and a report of what was finished.','Agree on delivery dates for the work. Search results take longer to assess and have no guaranteed deadline; use comparable search and inquiry records to decide what to do next.'],
 'website-migration-checklist':['List your important old page addresses and where each should go on the new site.','For example, /lawn-care can move to /services/lawn-care/ when it answers the same need. Set up a permanent redirect, then test that old link and your contact form after launch.'],
 'custom-website-or-template':['Choose a template when its layout and features already fit your content and customer task. Choose custom design when adapting that structure would compromise what customers need to understand or do.','Test both with the same service details, project example and inquiry task. Separately compare who can edit the site, what can be exported and the ongoing costs. Custom design can use a CMS; a template can still require developer help.'],
 'website-care-versus-seo':['Care provides routine website checks and small text, photo or link changes you supply. SEO adds researched improvements to pages and search content.','Updating supplied hours or replacing a supplied link may fit care; repairs depend on the cause and agreed scope. Choose the work you need; monthly help is optional.'],
 'website-audit-checklist':['Try the task your customer came to do and write down where it fails.','On your phone, find a service, check whether your job fits and try the inquiry route. Record the page, expected result and what happened. Use that record to agree on a review or a small fix, then repeat the same check.'],
};
export function guideDecision(path,o){
 const slug=path.split('/').filter(Boolean).at(-1);
 const extra={
 'website-not-showing-on-google':['Start by opening the page and searching for your business name. Then check the exact page in Search Console.','A page that is not indexed needs a different investigation from one that is indexed but missing for a particular search. A missing Maps listing is a separate eligibility question.'],
 'contact-form-not-working':['Send one labeled test, then check spam and the notification recipient.','If your platform saves submissions, look for the test there too. A success message on the website does not prove the email reached your inbox.'],
 'service-area-pages':['Start with a complete service explanation and honest coverage.','A separate area page should add useful advice, evidence or service detail for its visitor. Changing the place name or citing a local business is not enough.'],
 'website-maintenance-cost':[`My care plans start at ${money(o.plans.keep_running.monthly_price)}/month; hosting, domain and tools are billed by your providers.`,'Add the work you need and your actual provider renewals to make a yearly budget. The example below shows each cost separately.'],
 'website-maintenance-checklist':['Check your contact path, key pages, business details and account access.','Give a named person responsibility for each check and record the next review date. Decide which checks you will own and which need a web person. Keep technical updates and recovery responsibilities in the agreement.'],
 'website-launch-checklist':['Approve the content, test the phone experience and send a form test before launch.','Confirm who controls the accounts. Your developer should check redirects, search settings and a way to restore the previous version.'],
 'ai-website-or-custom':['Choose an AI builder when its tested features and editing limits fit your needs; choose custom help for the design, content or functions it cannot provide.','Try the actual customer task before deciding. Check claims, image permissions, forms, phone layout, editing and export, then price the remaining work.'],
 'contractor-website-checklist':['Show the jobs you accept, your service area and how to request an estimate.','Use real project photos with permission. Tell customers what information to send, and test the inquiry path on a phone before adding more pages.']
 };
 const added=researchGuideDetails[slug];
 const [answer,detail]=added?[added.answer,slug==='website-redesign-timeline'?guideBuildTiming(o)+'. '+added.detail:added.detail]:extra[slug]||decisions[slug]||[];
 if(!answer)throw Error(`Missing guide answer: ${path}`);
 return `<div class="guide-decision"><h2>The short answer</h2><p>${answer}</p><p>${detail}</p>${guideScopeNotes[slug]?`<p class="guide-scope"><strong>Using this guide:</strong> ${e(guideScopeNotes[slug])}</p>`:''}</div>`;
}

export function guideDownload(path){
 const slug=path.split('/').filter(Boolean).at(-1);
 const special={'seo-work-and-reporting':'/assets/guides/seo-provider-questions.txt','website-repair-or-redesign':'/assets/guides/website-repair-or-redesign-worksheet.csv','website-care-versus-seo':'/assets/guides/website-care-versus-seo-worksheet.csv','website-audit-checklist':'/assets/guides/website-audit-checklist.csv','website-migration-checklist':'/assets/downloads/website-url-map.csv','website-redesign-brief':'/assets/guides/website-redesign-brief.txt',
  'website-maintenance-cost':'/assets/guides/website-maintenance-budget.csv','website-launch-checklist':'/assets/guides/website-launch-checklist.csv','ai-website-or-custom':'/assets/guides/website-approach.csv','website-not-showing-on-google':'/assets/guides/google-visibility-flow-worksheet.txt','contact-form-not-working':'/assets/guides/contact-form-flow-worksheet.txt','service-area-pages':'/assets/guides/service-area-decision-worksheet.txt','website-maintenance-checklist':'/assets/guides/website-maintenance-log.csv','contractor-website-checklist':'/assets/guides/contractor-website-worksheet.csv'};
 return researchGuideDetails[slug]?.download||special[slug]||(decisions[slug]?`/assets/audit-implementation/${slug}-checklist.txt`:null);
}

export function guideDownloadLabel(path){
 const slug=path.split('/').filter(Boolean).at(-1);
 const labels={
  'website-maintenance-cost':'Download the website maintenance budget',
  'website-launch-checklist':'Download the website launch checklist',
  'ai-website-or-custom':'Download the website approach worksheet',
  'website-not-showing-on-google':'Download the search-visibility worksheet',
  'contact-form-not-working':'Download the form test checklist',
  'service-area-pages':'Download the service-area planning worksheet',
  'website-maintenance-checklist':'Download the website maintenance log',
  'contractor-website-checklist':'Download the contractor website worksheet',
  'website-project-cost':'Download the website budget checklist',
  'website-redesign-brief':'Download the redesign brief',
  'local-seo-profile-eligibility':'Download the local-search checklist',
  'seo-work-and-reporting':'Download the SEO provider questions',
  'website-migration-checklist':'Download the URL map worksheet',
  'custom-website-or-template':'Download the website approach checklist',
  'website-care-versus-seo':'Download the care and SEO decision worksheet',
  'website-audit-checklist':'Download the website audit checklist',
  'website-repair-or-redesign':'Download the repair or redesign worksheet'
 };
 const label=researchGuideDetails[slug]?.downloadLabel||labels[slug];
 if(!label)throw Error(`Missing guide download label: ${path}`);
 return label.replace(/\bfaq\b/g,'FAQ');
}
