import historicCountyRoutes from './fixtures/historic-county-routes.json' with {type:'json'};
import {retiredCountyRoutes} from '../deployment/retired-county-routes.mjs';
import {serviceStates,countyPath} from '../src/service-area-directory.mjs';
import {countyLocalNotes} from '../src/county-local-notes.mjs';
import {countyBuyerTasks} from '../src/county-buyer-tasks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import offers from '../config/offers.json' with {type:'json'};
import config from '../config/site.json' with {type:'json'};
import geography from '../authority/v5/geography.json' with {type:'json'};
import {journal,journalArticle,journalSections,journalIndex} from '../src/journal.mjs';
import {guideDecision,guideDownload,guideDownloadLabel} from '../src/guide-decisions.mjs';
import {countyPages} from '../src/service-counties.mjs';
import {countyCoverage} from '../src/erie-content.mjs';
import {countyGeography} from '../src/county-geography.mjs';
import {redesignPage} from '../src/search-guides.mjs';
import {contractorService} from '../src/audit-guide-updates.mjs';
import {seoServiceContent} from '../src/seo-service-content.mjs';
import {sourceHandoff} from '../src/source-handoff.mjs';
import {guideInquiry} from '../src/guide-inquiry-actions.mjs';
import {auditContent,careContent} from '../src/service-content.mjs';
import {escapeHtml as e} from '../src/shared.mjs';
const before=[
 {
  "path": "/guides/website-maintenance-cost/",
  "ids": [
   "three-bills",
   "platform-cost",
   "studio-plans",
   "first-year",
   "checks",
   "choose-care",
   "next-decision"
  ],
  "downloads": []
 },
 {
  "path": "/guides/website-launch-checklist/",
  "ids": [
   "release-record",
   "launch-check-tools",
   "content-approval",
   "customer-journey",
   "accounts-search",
   "recovery",
   "live-check",
   "next-decision"
  ],
  "downloads": []
 },
 {
  "path": "/guides/ai-website-or-custom/",
  "ids": [
   "choose-the-job",
   "comparison",
   "trial",
   "review-ai-copy",
   "ai-search",
   "custom-fit",
   "next-decision"
  ],
  "downloads": []
 },
 {
  "path": "/guides/website-not-showing-on-google/",
  "ids": [
   "intent",
   "discovery",
   "inspection-steps",
   "index",
   "define",
   "relevance",
   "maps",
   "specific-index-checks",
   "plain-search-terms",
   "next-decision"
  ],
  "downloads": []
 },
 {
  "path": "/guides/contact-form-not-working/",
  "ids": [
   "five-minute-check",
   "trace",
   "inbox",
   "platform-settings",
   "review-options",
   "page",
   "verify",
   "specific-form-checks",
   "receipt",
   "notification",
   "next-decision"
  ],
  "downloads": []
 },
 {
  "path": "/guides/service-area-pages/",
  "ids": [
   "question",
   "facts",
   "choose",
   "example",
   "build",
   "maintain",
   "next-decision"
  ],
  "downloads": []
 },
 {
  "path": "/guides/website-maintenance-checklist/",
  "ids": [
   "start",
   "schedule",
   "forms",
   "content",
   "recovery",
   "receipt",
   "next-decision"
  ],
  "downloads": []
 },
 {
  "path": "/guides/contractor-website-checklist/",
  "ids": [
   "job",
   "services",
   "evidence",
   "coverage",
   "inquiry",
   "search",
   "next-decision"
  ],
  "downloads": []
 },
 {
  "path": "/guides/website-project-cost/",
  "ids": [
   "start-with-scope",
   "dated-price-example",
   "two-budgets",
   "ongoing-costs",
   "annual-choice",
   "scope-changers",
   "compare-quotes",
   "take-away",
   "next-decision"
  ],
  "downloads": []
 },
 {
  "path": "/guides/website-redesign-brief/",
  "ids": [
   "before-a-redesign",
   "decision",
   "business",
   "content",
   "editing",
   "acceptance",
   "next-decision"
  ],
  "downloads": []
 },
 {
  "path": "/guides/local-seo-profile-eligibility/",
  "ids": [
   "two-surfaces",
   "eligibility",
   "pages",
   "sequence",
   "expectations",
   "local-profile-actions",
   "take-away",
   "next-decision"
  ],
  "downloads": []
 },
 {
  "path": "/guides/seo-work-and-reporting/",
  "ids": [
   "work",
   "keyword-opportunities",
   "receipt",
   "metrics",
   "scope",
   "campaigns",
   "time",
   "take-away",
   "next-decision"
  ],
  "downloads": []
 },
 {
  "path": "/guides/website-migration-checklist/",
  "ids": [
   "inventory",
   "map",
   "redirect-example",
   "before",
   "launch",
   "after",
   "redesign-help",
   "next-decision"
  ],
  "downloads": []
 },
 {
  "path": "/guides/custom-website-or-template/",
  "ids": [
   "fit",
   "compare",
   "template",
   "custom",
   "quality",
   "website-or-social",
   "take-away",
   "next-decision"
  ],
  "downloads": []
 },
 {
  "path": "/guides/website-care-versus-seo/",
  "ids": [
   "short-answer",
   "compare",
   "situations",
   "owned-change",
   "plans",
   "costs",
   "before-buying",
   "next-decision"
  ],
  "downloads": []
 },
 {
  "path": "/guides/website-audit-checklist/",
  "ids": [
   "start",
   "checklist",
   "priority",
   "owned-fixes",
   "access",
   "finish",
   "next-decision"
  ],
  "downloads": []
 },
 {
  "path": "/guides/website-repair-or-redesign/",
  "ids": [
   "start",
   "keep",
   "contained",
   "owned",
   "rework",
   "compare",
   "worksheet",
   "next-decision"
  ],
  "downloads": []
 }
];
const article=slug=>journalArticle(journal.find(x=>x.path==='/guides/'+slug+'/'),offers,journal);
const ids=html=>[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
const hrefs=html=>[...html.matchAll(/href="([^"]+)"/g)].map(x=>x[1].replaceAll('&amp;','&'));
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const historicalDownloads=[
 '/assets/audit-implementation/custom-website-or-template-checklist.txt',
 '/assets/audit-implementation/illustrative-completed-brief.txt',
 '/assets/audit-implementation/local-seo-profile-eligibility-checklist.txt',
 '/assets/audit-implementation/seo-work-and-reporting-checklist.txt',
 '/assets/audit-implementation/website-project-cost-checklist.txt',
 '/assets/audit-implementation/work-receipt-template.txt',
 '/assets/downloads/audit-launch-checklist.csv',
 '/assets/downloads/audit-maintenance-budget.csv',
 '/assets/downloads/audit-website-approach.csv',
 '/assets/downloads/website-redesign-brief.txt',
 '/assets/downloads/website-url-map.csv',
 '/assets/guides/contact-form-flow-worksheet.txt',
 '/assets/guides/contractor-website-worksheet.csv',
 '/assets/guides/google-visibility-flow-worksheet.txt',
 '/assets/guides/monthly-seo-opportunity-worksheet.csv',
 '/assets/guides/monthly-website-care-log.csv',
 '/assets/guides/seo-provider-questions.txt',
 '/assets/guides/service-area-decision-worksheet.txt',
 '/assets/guides/web-designer-comparison.csv',
 '/assets/guides/website-audit-checklist.csv',
 '/assets/guides/website-care-versus-seo-worksheet.csv',
 '/assets/guides/website-content-template.txt',
 '/assets/guides/website-handover-checklist.csv',
 '/assets/guides/website-lead-diagnosis.csv',
 '/assets/guides/website-maintenance-log.csv',
 '/assets/guides/website-page-plan.csv',
 '/assets/guides/website-redesign-schedule.csv',
 '/assets/guides/website-repair-or-redesign-worksheet.csv',
 '/assets/guides/website-rfp-template.txt'
];

test('all published guides preserve existing bookmarks and downloadable resources',()=>{
 assert.equal(journal.length,65);
 assert.ok(before.every(old=>journal.some(item=>item.path===old.path)),'Every historical guide remains published');
 for(const item of before){
  const html=journalArticle(journal.find(x=>x.path===item.path),offers,journal),found=ids(html);
  assert.equal(found.length,new Set(found).size,item.path+' duplicate ids');
  for(const id of item.ids)assert.ok(found.includes(id),item.path+' missing #'+id);
  for(const download of item.downloads)assert.ok(hrefs(html).includes(download),item.path+' missing '+download);
  for(const target of hrefs(html).filter(x=>x.startsWith('#')))assert.ok(found.includes(target.slice(1)),item.path+' broken '+target);
  assert.equal((html.match(/class="journal-callout guide-ending"/g)||[]).length,1);
  assert.ok(html.includes('id="next-decision"'),item.path+' existing ending bookmark');assert.ok(html.includes(guideInquiry(item.path).href),item.path+' contextual inquiry destination');
 }
});

test('download labels are explicit and existing files remain available',()=>{
 for(const download of historicalDownloads){
  assert.ok(existsSync(new URL('../src'+download,import.meta.url)),download);
  assert.ok(read('src'+download).trim().length>0,download+' remains a usable file');
 }
 for(const item of journal){
  const html=journalArticle(item,offers,journal);
  for(const match of html.matchAll(/<a\b([^>]*href="(\/assets\/[^"?]+\.(csv|txt))"[^>]*)>([^<]*)<\/a>/gi)){
   assert.ok(existsSync(new URL('../src'+match[2],import.meta.url)),match[2]);
   assert.match(match[1],/\bdownload(?:[=>\s]|$)/i,item.path);
   assert.match(match[4],match[3].toLowerCase()==='csv'?/spreadsheet/:/text file/,item.path);
  }
  const download=guideDownload(item.path);
  if(!download)continue;
  const label=guideDownloadLabel(item.path);
  assert.match(label,/^Download the /);assert.doesNotMatch(label,/[?:]/);
  assert.ok(existsSync(new URL('../src'+download,import.meta.url))||existsSync(new URL('../public'+download,import.meta.url)),download);
 }
 for(const [slug,download] of [['website-launch-checklist','/assets/guides/website-launch-checklist.csv'],['website-maintenance-cost','/assets/guides/website-maintenance-budget.csv'],['ai-website-or-custom','/assets/guides/website-approach.csv'],['website-redesign-brief','/assets/guides/website-redesign-brief.txt']])assert.ok(hrefs(article(slug)).includes(download),slug+' links its canonical download');
 assert.match(article('website-project-cost'),/Download the website budget checklist \(text file\)/);
 assert.match(article('local-seo-profile-eligibility'),/Download the local-search checklist \(text file\)/);
 assert.ok(hrefs(article('website-care-versus-seo')).includes('/assets/guides/website-care-versus-seo-worksheet.csv'));
 assert.match(seoServiceContent(offers),/href="\/assets\/guides\/sample-monthly-report\.txt" download/);
 assert.ok(read('src/assets/guides/sample-monthly-report.txt').length>300);
});

test('review choices preserve prices, caps, a full service comparison and contextual inquiry preselection',()=>{
 for(const [html,offer,goal] of [[article('contact-form-not-working'),'website_baseline','fix'],[article('website-audit-checklist'),'unsure','fix'],[article('website-repair-or-redesign'),'unsure','unsure'],[redesignPage(offers).body,'unsure','redesign']]){
  const targets=hrefs(html).filter(x=>x.startsWith('/contact/')).map(x=>new URL(x,'https://wonderandmethod.com'));
  assert.ok(targets.some(x=>x.searchParams.get('offer')===offer&&x.searchParams.get('goal')===goal&&x.searchParams.get('request_kind')==='question'&&x.hash==='#inquiry'),offer+' / '+goal);
  assert.ok(hrefs(html).some(url=>url.split('#')[0]==='/services/website-audit/'),'Full review comparison remains reachable');
  assert.match(html,/\$399/);assert.match(html,/\$750/);assert.match(html,/up to 12 agreed main pages/);
  assert.match(html,/up to two small fixes in total/);assert.match(html,/safe and practical/);
 }
 const choices=hrefs(auditContent(offers));
 for(const offer of ['website-baseline','audit-fix-sprint'])assert.ok(choices.includes(`/checkout/${offer}/`),offer+' keeps a distinct request at the service comparison');
 assert.match(redesignPage(offers).body,/50% at booking, 30% at written design acceptance and 20%/);
});

test('form and search guides start with owner checks and preserve the deeper diagnosis',()=>{
 const form=article('contact-form-not-working');
 assert.ok(form.indexOf('id="five-minute-check"')<form.indexOf('id="platform-settings"'));
 assert.ok(form.indexOf('id="review-options"')<form.indexOf('id="specific-form-checks"'));
 assert.match(form,/site dashboard, open Automations/);assert.match(form,/look at its email history/);assert.match(form,/Add anyone outside your site collaborators as a Wix contact/);assert.match(form,/Changing your account email may not change an existing automation’s recipient/);assert.match(form,/Log out and send another test/);
 assert.match(form,/A site may not store a separate inquiry record/);
 assert.match(form,/<details><summary>Trace receiving-system and email-delivery failures/);
 const search=journalSections('/guides/website-not-showing-on-google/',offers);
 assert.deepEqual(search.slice(0,3).map(x=>x.id),['define','plain-search-terms','inspection-steps']);
 assert.match(search.map(x=>x.body).join(''),/Test live URL/);assert.match(search.map(x=>x.body).join(''),/Request indexing/);
 assert.match(search.map(x=>x.body).join(''),/Distinguish robots.txt crawling restrictions from noindex/);assert.match(search.map(x=>x.body).join(''),/Preserve private-preview controls/);
});

test('budget and maintenance wording keeps current allowances and provider assumptions',()=>{
 assert.doesNotMatch(guideDecision('/guides/website-project-cost/',offers),/\$1,400|\$2,350|\$3,700/);
 assert.equal((article('website-project-cost').match(/<caption>Current studio website prices<\/caption>/g)||[]).length,1);
 assert.match(article('website-project-cost'),/Illustrative first-year budget — replace the provider assumptions/);assert.match(article('website-project-cost'),/Replace \$20\/month hosting and \$120\/year other bills with your actual renewal prices/);
 const scope=journalSections('/guides/seo-work-and-reporting/',offers).find(section=>section.id==='scope').body;
 assert.match(scope,/Improve — \$400\/month:.*1 completed improvement each month/);assert.match(scope,/Grow — \$800\/month:.*2 connected improvements/);
 assert.match(article('website-maintenance-checklist'),/plans exclude updates to a content management system \(CMS\), its plugins or themes, as well as backups, restores and malware cleanup/);assert.match(article('website-maintenance-checklist'),/Monitoring is automated and is not staffed 24\/7/);assert.ok(hrefs(article('website-maintenance-checklist')).includes('/services/website-care/'));
 assert.match(careContent(offers),/no 24\/7 staffing or guaranteed repair time/);
 assert.match(seoServiceContent(offers),/href="\/services\/website-care\/">Keep Running/);assert.match(careContent(offers),/Keep Running is \$150\/month/);
 assert.match(seoServiceContent(offers),/accepted work I delay remains owed, with a new date or refund/);
});

test('all sixty-two New York entries retain complete place lists, applicable sources and general-planning worksheets',()=>{
 const pages=countyPages(offers),state=serviceStates.find(state=>state.id==='new-york'),hub=pages.find(page=>page.path===state.path).body;
 assert.equal(pages.length,53);assert.equal(state.counties.length,62);
 const ids=[...hub.matchAll(/class="county-area-detail" id="([^"]+)"/g)].map(match=>match[1]);
 assert.equal(ids.length,62);assert.equal(new Set(ids).size,62);assert.deepEqual(ids.slice().sort(),state.counties.map(county=>county.slug).sort());
 const sources=new Map([...hub.matchAll(/<li id="(geography-source-\d+)"><a href="([^"]+)">([^<]+)<\/a>/g)].map(([,id,url,label])=>[url.replaceAll('&amp;','&'),{id,label}]));
 assert.ok(sources.size>0);
 const titles=new Set();
 for(const county of state.counties){
  const {slug}=county,g=countyGeography[slug],entry=hub.slice(hub.indexOf(`id="${slug}"`)).split('</details>')[0],task=countyBuyerTasks[slug];
  const note=countyLocalNotes['new-york/'+slug]||county.geographyNote;if(note)assert.ok(entry.includes(e(note)),slug+' local distinction');
  for(const name of [...Object.values(g.municipalities).flat(),...g.communities.map(place=>place.name)])assert.ok(entry.includes(e(name)),slug+' place '+name);
  const reference=entry.match(/href="#(geography-reference-\d+)"/);assert.ok(reference,slug+' source reference');
  const referenceEntry=hub.slice(hub.indexOf(`id="${reference[1]}"`)).split('</li>')[0];
  for(const url of [...g.sources,...g.communities.map(place=>place.source)].filter(Boolean)){
   const source=sources.get(url);assert.ok(source,slug+' source '+url);
   assert.ok(source.label.trim());assert.doesNotMatch(source.label,/^https?:\/\//);
   assert.ok(referenceEntry.includes(`href="#${source.id}"`),slug+' applicable source '+url);
  }
  const destination=countyPath(county,state),worksheet=read('src/assets/county-briefs/'+slug+'.txt');
  assert.ok(worksheet.includes(config.origin+destination),slug+' worksheet destination');
  assert.match(worksheet,/General website planning with a fictional example/);assert.match(worksheet,/EXAMPLE \(MADE UP\)/);
  assert.match(worksheet,/Official place sources are linked from the area directory/);
  for(const text of [task.title,task.scenario,task.decision,task.output,task.check,...task.questions])assert.ok(worksheet.includes(text),slug+' authored worksheet content');
  titles.add(task.title);
  if(slug==='erie')assert.equal(destination,'/areas/erie-county/');else assert.equal(historicCountyRoutes[`/areas/${slug}-county/`],destination);
 }
 assert.equal(titles.size,62);assert.doesNotMatch(hub,/undefined|qualification path|expiry rule/);assert.match(hub,/Place types and official sources/);
 const erie=countyCoverage(geography,config,offers);
 assert.match(erie,/\/assets\/county-briefs\/erie\.txt/);assert.match(erie,/Erie County page topics/);assert.match(erie,/North Tonawanda/);
});

test('worksheets, contractor scope and source handoff agree with the pages',()=>{
 assert.match(read('src/assets/downloads/audit-launch-checklist.csv').split('\n')[0],/pass, fail, not applicable or blocked/);
 assert.match(read('src/assets/downloads/audit-website-approach.csv').split('\n')[0],/Option A result.*Option B result/);
 assert.match(read('src/assets/guides/website-launch-checklist.csv').split('\n')[0],/Not checked \/ Works \/ Needs fixing \/ Need access \/ Not applicable \/ Blocked/);
 assert.match(read('src/assets/guides/website-approach.csv').split('\n')[0],/Option A result.*Option B result/);
 assert.doesNotMatch(read('src/assets/guides/website-repair-or-redesign-worksheet.csv').split('\n')[0],/’/);
 assert.match(read('src/assets/guides/contact-form-flow-worksheet.txt'),/Find the saved message if your form tool keeps one/);
 assert.match(read('src/assets/guides/contact-form-flow.svg'),/Some forms do not save it/);
 const contractor=contractorService(offers,config);
 assert.match(contractor,/seven pages plus Focused Website’s 2 included guides use 9 of its 15 pages/);assert.match(contractor,/six-page Launch Website plan/);assert.match(contractor,/Photo uploads, dispatch tools and custom integrations need a separate agreement on the work and price/);
 assert.ok(hrefs(contractor).some(x=>x.includes('request_kind=question#inquiry')));
 assert.match(article('contractor-website-checklist'),/href="\/services\/contractor-websites\/"/);
 assert.match(sourceHandoff(),/<h1>Sample website files\.<\/h1>/);assert.match(sourceHandoff(),/There is no drag-and-drop editor/);
 assert.match(sourceHandoff(),/within five business days after the paid work is finished, or after settling the account if the project stops early/);
});

test('guide hub keeps all routes with concise copy and original article titles',()=>{
 const hub=journalIndex(journal);
 for(const item of journal){
  assert.ok(hrefs(hub).includes(item.path));
  assert.ok(journalArticle(item,offers,journal).includes('<h1>'+item.title.replaceAll('&','&amp;')+'</h1>'));
 }
 const descriptions=[...hub.matchAll(/class="journal-card-description">([^<]+)<\/p>/g)].map(x=>x[1]);
 assert.equal(descriptions.length,65);
 for(const text of descriptions)assert.ok(text.split(/\s+/).length<=14,text);
});
