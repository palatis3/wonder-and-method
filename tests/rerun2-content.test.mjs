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

test('all 17 guides preserve existing bookmarks and downloadable resources',()=>{
 assert.equal(journal.length,17);
 assert.deepEqual(new Set(journal.map(x=>x.path)),new Set(before.map(x=>x.path)));
 for(const item of before){
  const html=journalArticle(journal.find(x=>x.path===item.path),offers,journal),found=ids(html);
  assert.equal(found.length,new Set(found).size,item.path+' duplicate ids');
  for(const id of item.ids)assert.ok(found.includes(id),item.path+' missing #'+id);
  for(const download of item.downloads)assert.ok(hrefs(html).includes(download),item.path+' missing '+download);
  for(const target of hrefs(html).filter(x=>x.startsWith('#')))assert.ok(found.includes(target.slice(1)),item.path+' broken '+target);
  assert.equal((html.match(/class="journal-callout guide-ending"/g)||[]).length,1);
  assert.match(html,/href="#next-decision">Get help with this decision/);
 }
});

test('download labels are explicit and existing files remain available',()=>{
 for(const item of journal){
  const download=guideDownload(item.path);
  if(!download)continue;
  const label=guideDownloadLabel(item.path);
  assert.match(label,/^Download the /);assert.doesNotMatch(label,/[?:]/);
  assert.ok(existsSync(new URL('../src'+download,import.meta.url))||existsSync(new URL('../public'+download,import.meta.url)),download);
 }
 assert.match(article('website-project-cost'),/Download the website budget checklist \(TXT\)/);
 assert.match(article('local-seo-profile-eligibility'),/Download the local-search checklist \(TXT\)/);
 assert.match(article('website-care-versus-seo'),/work-receipt-template\.txt/);
});

test('review choices preserve prices, caps and distinct inquiry preselection',()=>{
 for(const html of [article('contact-form-not-working'),article('website-audit-checklist'),article('website-repair-or-redesign'),redesignPage(offers).body]){
  const targets=hrefs(html).filter(x=>x.startsWith('/contact/')).map(x=>new URL(x,'https://wonderandmethod.com'));
  for(const offer of ['website_baseline','audit_fix_sprint'])assert.ok(targets.some(x=>x.searchParams.get('offer')===offer&&x.searchParams.get('goal')==='fix'&&x.searchParams.get('request_kind')==='question'&&x.hash==='#inquiry'),offer);
  assert.match(html,/\$399/);assert.match(html,/\$750/);assert.match(html,/up to 12 marketing pages/);
  assert.match(html,/up to two agreed small fixes in total/);assert.match(html,/safe and practical/);
 }
 assert.match(redesignPage(offers).body,/50% at booking, 30% at written design acceptance and 20%/);
});

test('form and search guides start with owner checks and preserve the deeper diagnosis',()=>{
 const form=article('contact-form-not-working');
 assert.ok(form.indexOf('id="five-minute-check"')<form.indexOf('id="platform-settings"'));
 assert.ok(form.indexOf('id="review-options"')<form.indexOf('id="specific-form-checks"'));
 assert.match(form,/Email Notifications/);assert.match(form,/site owner is the default recipient/);assert.match(form,/choose <strong>Apply/);
 assert.match(form,/Some WordPress plugins and custom forms do not save/);
 assert.match(form,/<details><summary>Receiving-system, email-delivery and technical checks/);
 const search=journalSections('/guides/website-not-showing-on-google/',offers);
 assert.deepEqual(search.slice(0,3).map(x=>x.id),['intent','discovery','inspection-steps']);
 assert.match(search.map(x=>x.body).join(''),/Test live URL/);assert.match(search.map(x=>x.body).join(''),/Request indexing/);
 assert.match(search.map(x=>x.body).join(''),/Blocking crawling and instructing a search engine not to index are different/);
});

test('budget and maintenance wording keeps current allowances and provider assumptions',()=>{
 assert.doesNotMatch(guideDecision('/guides/website-project-cost/',offers),/\$1,400|\$2,350|\$3,700/);
 assert.equal((article('website-project-cost').match(/<caption>Current studio website prices<\/caption>/g)||[]).length,1);
 assert.match(article('website-project-cost'),/Worked example — assumed costs, not a provider quote/);
 assert.match(article('seo-work-and-reporting'),/2 connected improvements in total, instead of Improve’s one/);
 assert.match(article('website-maintenance-checklist'),/software, plugin and theme updates, backups, restores and malware cleanup are separate/);
 assert.match(article('website-maintenance-checklist'),/24\/7 staffing or a guaranteed repair time/);
 assert.match(seoServiceContent(offers),/Keep Running care, available separately at \$150\/month/);
 assert.match(seoServiceContent(offers),/Accepted work delayed by the studio remains owed/);
});

test('all ten counties retain distinct examples, worksheets and readable official sources',()=>{
 const pages=countyPages(offers),counties=pages.filter(x=>x.path!=='/areas/');
 assert.equal(counties.length,9);assert.equal(new Set(counties.map(x=>x.path)).size,9);
 for(const page of counties){
  const slug=page.path.split('/')[2].replace('-county',''),g=countyGeography[slug];
  assert.ok(page.body.includes('/assets/county-briefs/'+slug+'.txt'));
  assert.match(page.body,/href="\/services\/website-care\/"/);assert.match(page.body,/href="\/services\/seo\/"/);
  for(const url of [...g.sources,...g.communities.map(x=>x.source)])assert.ok(hrefs(page.body).includes(url),slug+' missing source');
  assert.doesNotMatch(page.body,/reference \d+|undefined|qualification path|expiry rule/);
  assert.match(page.body,/Official sources for these places/);
 }
 const erie=countyCoverage(geography,config,offers);
 assert.match(erie,/\/assets\/county-briefs\/erie\.txt/);assert.match(erie,/Erie County page topics/);assert.match(erie,/North Tonawanda/);
 assert.equal(new Set(counties.map(x=>x.body.match(/<section class="studio-section county-buyer-task"[\s\S]*?<h2>(.*?)<\/h2>/)[1])).size,9);
});

test('worksheets, contractor scope and source handoff agree with the pages',()=>{
 assert.match(read('src/assets/downloads/audit-launch-checklist.csv').split('\n')[0],/pass, fail, not applicable or blocked/);
 assert.match(read('src/assets/downloads/audit-website-approach.csv').split('\n')[0],/Option A result.*Option B result/);
 assert.doesNotMatch(read('src/assets/guides/website-repair-or-redesign-worksheet.csv').split('\n')[0],/’/);
 assert.match(read('src/assets/guides/contact-form-flow-worksheet.txt'),/Saved record, if your platform keeps one/);
 assert.match(read('src/assets/guides/contact-form-flow.svg'),/Some forms do not save it/);
 const contractor=contractorService(offers,config);
 assert.match(contractor,/sample total to nine of the 15 pages/);assert.match(contractor,/File uploads, dispatch tools and new custom integrations are separate scope/);
 assert.ok(hrefs(contractor).some(x=>x.includes('request_kind=question#inquiry')));
 assert.match(article('contractor-website-checklist'),/href="\/services\/contractor-websites\/"/);
 assert.match(sourceHandoff(),/<h1>Your website files\.<\/h1>/);assert.match(sourceHandoff(),/There is no drag-and-drop editor/);
 assert.match(sourceHandoff(),/five business days after paid completion or settled cancellation/);
});

test('guide hub keeps all routes with concise copy and original article titles',()=>{
 const hub=journalIndex(journal);
 for(const item of journal){
  assert.ok(hrefs(hub).includes(item.path));
  assert.ok(journalArticle(item,offers,journal).includes('<h1>'+item.title.replaceAll('&','&amp;')+'</h1>'));
 }
 const descriptions=[...hub.matchAll(/class="journal-card-description">([^<]+)<\/p>/g)].map(x=>x[1]);
 assert.equal(descriptions.length,17);
 for(const text of descriptions)assert.ok(text.split(/\s+/).length<=14,text);
});
