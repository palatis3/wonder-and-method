import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import offers from '../config/offers.json' with {type:'json'};
import {journal,journalArticle,journalIndex,journalSections} from '../src/journal.mjs';
import {guideDecision} from '../src/guide-decisions.mjs';
import {guideInquiry} from '../src/guide-inquiry-actions.mjs';
import {money} from '../src/shared.mjs';
import {normalizeOfferCatalog} from '../src/offer-catalog.mjs';

// Public guide routes and bookmarks recorded before the October 21 clarity pass.
const historic={
 "/guides/website-not-generating-leads/": [
  "define-the-problem",
  "measurement",
  "find-the-bottleneck",
  "page-decision",
  "worked-example",
  "lead-record",
  "one-change",
  "next-decision"
 ],
 "/guides/how-to-choose-a-web-designer/": [
  "same-brief",
  "provider-fit",
  "work-evidence",
  "questions",
  "compare-quotes",
  "acceptance",
  "next-decision"
 ],
 "/guides/website-content-template/": [
  "facts",
  "page-purpose",
  "homepage",
  "service",
  "about",
  "contact",
  "review",
  "next-decision"
 ],
 "/guides/website-redesign-timeline/": [
  "start",
  "ready",
  "sequence",
  "example",
  "reviews",
  "studio",
  "next-decision"
 ],
 "/guides/one-page-website-seo/": [
  "decision",
  "compare",
  "example-one",
  "example-many",
  "implementation",
  "change",
  "next-decision"
 ],
 "/guides/website-handover-checklist/": [
  "meaning",
  "accounts",
  "files",
  "register",
  "verification",
  "example",
  "next-decision"
 ],
 "/guides/website-maintenance-cost/": [
  "three-bills",
  "platform-cost",
  "studio-plans",
  "first-year",
  "checks",
  "choose-care",
  "next-decision"
 ],
 "/guides/website-launch-checklist/": [
  "release-record",
  "launch-check-tools",
  "content-approval",
  "customer-journey",
  "accounts-search",
  "recovery",
  "live-check",
  "next-decision"
 ],
 "/guides/ai-website-or-custom/": [
  "choose-the-job",
  "comparison",
  "trial",
  "review-ai-copy",
  "ai-search",
  "custom-fit",
  "next-decision"
 ],
 "/guides/website-not-showing-on-google/": [
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
 "/guides/contact-form-not-working/": [
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
 "/guides/service-area-pages/": [
  "question",
  "facts",
  "choose",
  "example",
  "build",
  "maintain",
  "next-decision"
 ],
 "/guides/website-maintenance-checklist/": [
  "start",
  "schedule",
  "forms",
  "content",
  "recovery",
  "receipt",
  "monthly-record",
  "next-decision"
 ],
 "/guides/contractor-website-checklist/": [
  "job",
  "services",
  "evidence",
  "coverage",
  "inquiry",
  "search",
  "annotated-examples",
  "local-seo-workflow",
  "next-decision"
 ],
 "/guides/website-project-cost/": [
  "start-with-scope",
  "dated-price-example",
  "two-budgets",
  "optional-additions",
  "ongoing-costs",
  "annual-choice",
  "scope-changers",
  "compare-quotes",
  "redesign-budget",
  "take-away",
  "next-decision"
 ],
 "/guides/website-redesign-brief/": [
  "before-a-redesign",
  "decision",
  "business",
  "content",
  "editing",
  "acceptance",
  "rfp",
  "next-decision"
 ],
 "/guides/local-seo-profile-eligibility/": [
  "two-surfaces",
  "eligibility",
  "pages",
  "sequence",
  "expectations",
  "local-profile-actions",
  "take-away",
  "next-decision"
 ],
 "/guides/seo-work-and-reporting/": [
  "work",
  "keyword-opportunities",
  "receipt",
  "metrics",
  "scope",
  "campaigns",
  "time",
  "provider-questions",
  "worthwhile",
  "timing-and-ai",
  "take-away",
  "next-decision"
 ],
 "/guides/website-migration-checklist/": [
  "inventory",
  "map",
  "redirect-example",
  "before",
  "launch",
  "after",
  "redesign-help",
  "redesign-seo-checklist",
  "next-decision"
 ],
 "/guides/custom-website-or-template/": [
  "fit",
  "compare",
  "template",
  "custom",
  "quality",
  "website-or-social",
  "take-away",
  "next-decision"
 ],
 "/guides/website-care-versus-seo/": [
  "short-answer",
  "compare",
  "situations",
  "owned-change",
  "plans",
  "costs",
  "before-buying",
  "next-decision"
 ],
 "/guides/website-audit-checklist/": [
  "start",
  "checklist",
  "priority",
  "owned-fixes",
  "access",
  "finish",
  "next-decision"
 ],
 "/guides/website-repair-or-redesign/": [
  "start",
  "keep",
  "contained",
  "owned",
  "rework",
  "compare",
  "worksheet",
  "next-decision"
 ]
};
const existingDownloads=[
 "/assets/audit-implementation/custom-website-or-template-checklist.txt",
 "/assets/audit-implementation/illustrative-completed-brief.txt",
 "/assets/audit-implementation/local-seo-profile-eligibility-checklist.txt",
 "/assets/audit-implementation/seo-work-and-reporting-checklist.txt",
 "/assets/audit-implementation/website-project-cost-checklist.txt",
 "/assets/audit-implementation/work-receipt-template.txt",
 "/assets/downloads/audit-launch-checklist.csv",
 "/assets/downloads/audit-maintenance-budget.csv",
 "/assets/downloads/audit-website-approach.csv",
 "/assets/downloads/website-redesign-brief.txt",
 "/assets/downloads/website-url-map.csv",
 "/assets/guides/contact-form-flow-worksheet.txt",
 "/assets/guides/contractor-website-worksheet.csv",
 "/assets/guides/google-visibility-flow-worksheet.txt",
 "/assets/guides/monthly-seo-opportunity-worksheet.csv",
 "/assets/guides/monthly-website-care-log.csv",
 "/assets/guides/seo-provider-questions.txt",
 "/assets/guides/service-area-decision-worksheet.txt",
 "/assets/guides/web-designer-comparison.csv",
 "/assets/guides/website-audit-checklist.csv",
 "/assets/guides/website-care-versus-seo-worksheet.csv",
 "/assets/guides/website-content-template.txt",
 "/assets/guides/website-handover-checklist.csv",
 "/assets/guides/website-lead-diagnosis.csv",
 "/assets/guides/website-maintenance-log.csv",
 "/assets/guides/website-page-plan.csv",
 "/assets/guides/website-redesign-schedule.csv",
 "/assets/guides/website-repair-or-redesign-worksheet.csv",
 "/assets/guides/website-rfp-template.txt"
];
const path=slug=>`/guides/${slug}/`;
const sections=(slug,o=offers)=>journalSections(path(slug),o);
const body=(slug,o=offers)=>sections(slug,o).map(x=>x.body).join('');
const article=(slug,o=offers)=>journalArticle(journal.find(x=>x.path===path(slug)),o,journal);
const file=url=>new URL('../src'+url,import.meta.url);
const csvRows=text=>text.trim().split(/\r?\n/).filter(Boolean).map(line=>[...line.matchAll(/(?:^|,)"((?:[^"]|"")*)"/g)].map(match=>match[1].replaceAll('""','"')));

test('all 23 guides, historical bookmarks and existing download files survive',()=>{
 assert.deepEqual(journal.filter(x=>historic[x.path]).map(x=>x.path).sort(),Object.keys(historic).sort());
 for(const item of journal){
  const html=journalArticle(item,offers,journal);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length,`${item.path}: duplicate bookmark`);
  for(const id of historic[item.path]||[])assert.ok(ids.includes(id),`${item.path}#${id}`);
  for(const match of html.matchAll(/<a\b([^>]*href="(\/assets\/[^"?]+\.(csv|txt))"[^>]*)>([^<]*)<\/a>/gi)){
   assert.ok(existsSync(file(match[2])),match[2]);
   assert.match(match[1],/\bdownload(?:[=>\s]|$)/i,item.path);
   assert.match(match[4],match[3].toLowerCase()==='csv'?/spreadsheet/:/text file/);
  }
 }
 for(const url of existingDownloads)assert.ok(existsSync(file(url)),url);
});

test('form troubleshooting finishes owner checks before help and points to the Baseline',()=>{
 const ids=sections('contact-form-not-working').map(x=>x.id);
 assert.deepEqual(ids.slice(0,5),['five-minute-check','page','platform-settings','verify','review-options']);
 const html=article('contact-form-not-working');
 assert.equal((html.match(/passwords/gi)||[]).length,1);
 assert.match(body('contact-form-not-working'),/site dashboard, open Automations/);
 assert.match(body('contact-form-not-working'),/Log out and send another test/);
 assert.doesNotMatch(body('contact-form-not-working'),/applicable agreement|additional contact-form scope|quarantine|approved retention/);
 assert.match(html,/\$399 Website Baseline/);assert.equal((html.match(/class="journal-callout guide-ending"/g)||[]).length,1);assert.match(html,/That fix can be the form if the diagnosed problem fits; a repair is not guaranteed/);assert.doesNotMatch(html,/web person/);
 assert.match(guideInquiry(path('contact-form-not-working')).href,/offer=website_baseline&amp;goal=fix/);
 assert.match(sections('contact-form-not-working').find(x=>x.id==='review-options').body,/href="\/services\/website-audit\/#offer-website_baseline"/);
 assert.match(sections('contact-form-not-working').at(-1).body,/^<details>/);
});

test('Google diagnosis defines terms, gives the first check, and keeps server detail closed',()=>{
 const content=sections('website-not-showing-on-google');
 assert.deepEqual(content.slice(0,3).map(x=>x.id),['define','plain-search-terms','inspection-steps']);
 assert.match(content[0].body,/page.*search.*date/i);assert.match(content.find(x=>x.id==='plain-search-terms').body,/Google’s free tool/);
 assert.match(content.find(x=>x.id==='inspection-steps').body,/leave it hidden/);
 assert.doesNotMatch(content.slice(0,-1).map(x=>x.body).join(''),/X-Robots-Tag|HTML robots directive/);
 assert.match(content.at(-1).body,/^<details><summary>/);
 assert.match(content.at(-1).body,/X-Robots-Tag/);
 assert.match(sections('website-launch-checklist').at(-1).body,/^<details><summary>/);
 assert.match(body('one-page-website-seo'),/<details><summary>For your web person<\/summary>/);
});

test('prices and payment examples recalculate from the supplied offers',()=>{
 const raw=structuredClone(offers);
 raw.launch_site.public_price=2000;
 raw.focused_site.public_price=3000;
 raw.signature_site.public_price=4500;
 raw.plans.keep_running.monthly_price=200;
 raw.baseline.one_time_price=450;
 const changed=normalizeOfferCatalog(raw);
 const cost=body('website-project-cost',changed);
 for(const price of [2000,3000,4500,1000,600,400,5760])assert.ok(cost.includes(money(price)),String(price));
 assert.match(cost,/10 simple old-to-new redirects/);
 assert.match(cost,/assumed \$20 × 12 months/);
 assert.match(cost,/assumed yearly total/);
 assert.ok(body('website-maintenance-cost',changed).includes(money(3210)));
 assert.ok(body('contact-form-not-working',changed).includes(money(450)));
 assert.ok(article('contact-form-not-working',changed).includes('$450 Website Baseline'));assert.ok(article('contact-form-not-working',changed).includes('Get help fixing your form'));
});

test('timeline uses configuration, names both review windows, and preserves the handoff trigger',()=>{
 const changed=structuredClone(offers);
 changed.launch_site.delivery_target='Build-time target: 11–14 business days.';
 for(const content of [guideDecision(path('website-redesign-timeline'),changed),body('website-redesign-timeline',changed)]){
  assert.match(content,/11–14 business days/);
  assert.match(content,/two review rounds|two review/);
  assert.match(content,/five business days/);
 }
 const handover=body('website-handover-checklist');
 assert.match(handover,/within five business days after the paid work is finished/);
 assert.match(handover,/canceled account is settled/);
 assert.doesNotMatch(handover,/five business days (?:of|after) final payment/);
 const stages=sections('website-redesign-timeline').find(x=>x.id==='sequence').body;
 const rows=csvRows(readFileSync(file('/assets/guides/website-redesign-schedule.csv'),'utf8'));
 assert.equal(rows.length,9);
 for(const row of rows.slice(1))for(const cell of row.slice(0,3))assert.ok(stages.includes(cell),cell);
});

test('monthly care retains exclusions, the current review requirement and written pause choice',()=>{
 for(const slug of ['website-maintenance-cost','website-care-versus-seo','website-project-cost']){
  const text=body(slug);
  assert.match(text,/previous Website Baseline, studio build or Audit &amp; Fix Sprint/);
  assert.match(text,/current, usable review/);
 }
 for(const slug of ['website-maintenance-cost','website-care-versus-seo']){
  assert.match(body(slug),/plugin/);
  assert.match(body(slug),/theme/);
  assert.match(body(slug),/backup/);
  assert.match(body(slug),/restore/);
  assert.match(body(slug),/malware/);
 }
 assert.match(body('website-care-versus-seo'),/Keep Running’s checks continue/);
 assert.match(body('website-care-versus-seo'),/agree in writing whether care/);
 assert.match(body('website-care-versus-seo'),/no automatic \$150 care charge/);
 assert.doesNotMatch(body('website-care-versus-seo'),/Historic prepaid rights/);
});

test('guide figures remain fully present, short answers align with prose, and navigation is focused',()=>{
 for(const item of journal){
  const html=journalArticle(item,offers,journal);
  assert.ok(html.indexOf('class="guide-decision"')<html.indexOf('<section id="'));
  for(const marker of ['<figure class="journal-hero','<ol class="guide-steps'])if(html.includes(marker))assert.ok(html.indexOf(marker)>html.indexOf('</section>'),item.path+' owner step precedes the supporting visual');
  assert.doesNotMatch(html,/journal-visual|Get help with this decision/);
  assert.equal(html.includes('class="journal-toc"'),journalSections(item.path,offers).length>=6,item.path);
  assert.equal((html.match(/<article class="journal-card journal-card-text">/g)||[]).length,2,item.path);
  assert.match(item.category,/Fix a problem|Plan a website|Search visibility|Ongoing care|Business workflows|Local website cases/);
 }
 const index=journalIndex(journal);
 assert.match(index,/href="#planning-tools">Planning tool/);
 for(const item of journal)assert.ok(index.includes('href="'+item.path+'"'),item.path);
});

test('guide worksheets remain rectangular and use understandable statuses and headers',()=>{
 const dir=new URL('../src/assets/guides/',import.meta.url);
 for(const name of readdirSync(dir).filter(x=>x.endsWith('.csv'))){
  const rows=csvRows(readFileSync(new URL(name,dir),'utf8'));
  for(const row of rows)assert.equal(row.length,rows[0].length,name);
 }
 for(const name of ['seo-provider-questions.txt','website-rfp-template.txt','contact-form-flow-worksheet.txt']){
  const text=readFileSync(new URL(name,dir),'utf8');
  assert.match(text,/^WONDER AND METHOD/);
  assert.match(text,/Updated October 21, 2026/);
  assert.doesNotMatch(text,/Version 2026|approved retention practice|Authorized maintainer/);
 }
 const form=readFileSync(new URL('contact-form-flow-worksheet.txt',dir),'utf8');
 assert.equal((form.match(/^\d\. /gm)||[]).length,5);
 assert.match(form,/Not checked \/ Works \/ Needs fixing \/ Need access/);
 const brief=readFileSync(new URL('website-redesign-brief.txt',dir),'utf8');
 assert.match(brief,/ASK EACH DESIGNER TO RETURN/);
 assert.match(brief,/illustrative-completed-brief.txt/);
});
