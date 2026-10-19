import {money} from './shared.mjs';

const decisions={
 'website-repair-or-redesign':['Choose the smallest change that resolves a confirmed visitor problem.','A missing label or a lost service choice may need a contained correction. A changed publishing requirement may call for broader work. Confirm the current task, system and access before choosing.'],
 'website-project-cost':['Choose the smallest scope that answers the customer’s real question.','A consultant may need Launch’s clear presence and one ready service connection. A firm explaining several services may need Focused’s expanded pages and creative assets. A larger marketing website may suit Signature’s original animated centerpiece and expanded creative kit. The packages include up to 6, 15 and 30 marketing pages respectively. Writing is included; domain, hosting and paid tools cost extra.'],
 'website-redesign-brief':['Name the customer action, page list and editing owner before asking for a price.','An illustrative local home-service business replaces “a modern site” with “explain which repairs we take, our actual service area and how to request an estimate.”'],
 'local-seo-profile-eligibility':['Describe the business as it operates; verify profile eligibility separately.','An online-only Buffalo consultant can describe the clients it serves on its website. It should not claim a staffed public office or create a Business Profile solely because it serves Buffalo.'],
 'seo-work-and-reporting':['Agree a useful improvement and ask for a record of the completed work.','A remodeler gets repeated questions about whether it handles small bathroom projects. An agreed monthly task could clarify the accepted jobs on that service page, connect the estimate form and record the checks. Later search and inquiry data can inform the next change.'],
 'website-migration-checklist':['Map useful old URLs and verify inquiry delivery before changing the public site.','Illustrative mapping: an old /our-services page becomes /services/ only if the new page answers the same intent. Record a one-to-one redirect, then check the destination and contact path after release.'],
 'custom-website-or-template':['Let content, update frequency and ownership decide the platform.','A firm changing service copy twice a year and a team posting weekly need different update routines. Our website plans include source code and a written handoff. Before booking, agree who will make changes, check them and publish, and how often help will be needed.'],
 'website-care-versus-seo':['Name the task before choosing care, search work or a finite project.','Illustrative comparison: supplied contact-hour changes belong in a maintenance batch; an unclear service explanation may need an agreed content priority. Neither task automatically requires a recurring campaign.'],
 'website-audit-checklist':['Document one important failing visitor task, then agree a small fix with an agreed scope and retest.','Illustrative starting point: follow a service question to its inquiry action on a phone. Record where the task fails, the expected behavior and the access needed before deciding what to change.'],
};
export function guideDecision(path,o){
 const slug=path.split('/').filter(Boolean).at(-1);
 const extra={
 'website-not-showing-on-google':['Check the exact page in Google Search Console first.','A page that is not indexed needs a different investigation from one that is indexed but missing for a particular search. A missing Maps listing is a separate eligibility question.'],
 'contact-form-not-working':['Send one labeled test, then check spam and the notification recipient.','If your platform saves submissions, look for the test there too. A success message on the website does not prove the email reached your inbox.'],
 'service-area-pages':['Start with one clear service page and honest coverage information.','Add an area page only when a distinct customer question and real local facts justify it. Swapping town names into the same copy does not create a useful page.'],
 'website-maintenance-cost':['Separate provider bills from the work of maintaining the site.',`Optional studio plans start at ${money(o.plans.keep_running.monthly_price)}/month. An existing site without a usable baseline needs the ${money(o.baseline.one_time_price)} setup review first; a suitable current baseline may avoid that charge.`],
 'website-maintenance-checklist':['Check your contact path, key pages, business details and account access.','Give a named person responsibility for each check and record the next review date. Ask your maintainer to handle backups, releases and technical failures.'],
 'website-launch-checklist':['Approve the content, test the phone experience and send a form test before launch.','Confirm who controls the accounts. Your developer should check redirects, search settings and a way to restore the previous version.'],
 'ai-website-or-custom':['Use an AI draft to try an idea, then test what it actually does.','Check every claim, image permission, form, phone layout and editing or export limit. Pay for help with the work the draft has not solved.'],
 'contractor-website-checklist':['Show the jobs you accept, your service area and how to request an estimate.','Use real project photos with permission. Tell customers what information to send, and test the inquiry path on a phone before adding more pages.']
 };
 const [answer,detail]=extra[slug]||decisions[slug]||[];
 if(!answer)throw Error(`Missing guide answer: ${path}`);
 return `<div class="guide-decision"><h2>The short answer</h2><p>${answer}</p><p>${detail}</p></div>`;
}

export function guideDownload(path){
 const slug=path.split('/').filter(Boolean).at(-1);
 const special={'website-repair-or-redesign':'/assets/guides/website-repair-or-redesign-worksheet.csv','website-care-versus-seo':'/assets/guides/website-care-versus-seo-worksheet.csv','website-audit-checklist':'/assets/guides/website-audit-checklist.csv','website-migration-checklist':'/assets/downloads/website-url-map.csv','website-redesign-brief':'/assets/downloads/website-redesign-brief.txt'};
 return special[slug]||(decisions[slug]?`/assets/audit-implementation/${slug}-checklist.txt`:null);
}
