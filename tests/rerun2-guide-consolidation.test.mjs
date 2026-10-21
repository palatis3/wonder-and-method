import test from 'node:test';
import assert from 'node:assert/strict';
import offers from '../config/offers.json' with {type:'json'};
import {journal,journalSections,journalArticle} from '../src/journal.mjs';
import {guideContentSections} from '../src/guide-content.mjs';
import {money} from '../src/shared.mjs';

const path=slug=>`/guides/${slug}/`;
const sections=(slug,values=offers)=>journalSections(path(slug),values);
const body=(slug,values=offers)=>sections(slug,values).map(section=>section.body).join('');
const article=slug=>journalArticle(journal.find(item=>item.path===path(slug)),offers,journal);

test('every guide has an ordered section definition and unique rendered bookmarks',()=>{
 assert.equal(journal.length,23);
 for(const item of journal){
  const content=journalSections(item.path,offers);
  assert.ok(content.length,item.path);
  assert.deepEqual(content,guideContentSections(item.path,offers),item.path);
  const ids=[...journalArticle(item,offers,journal).matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length,item.path);
  for(const section of content){
   assert.ok(ids.includes(section.id),`${item.path}#${section.id}`);
   assert.ok(section.title&&section.body,`${item.path}#${section.id}`);
  }
 }
 assert.deepEqual(journalSections('/guides/not-a-guide/',offers),[]);
});

test('consolidation keeps historical section bookmarks at their final reading positions',()=>{
 assert.equal(sections('website-project-cost')[0].id,'dated-price-example');
 assert.match(sections('website-project-cost')[0].body,/^<span id="start-with-scope"><\/span>/);
 assert.deepEqual(sections('website-not-showing-on-google').slice(0,3).map(section=>section.id),['define','plain-search-terms','inspection-steps']);
 assert.match(sections('website-not-showing-on-google').find(section=>section.id==='inspection-steps').body,/^<span id="index"><\/span><span id="intent"><\/span>/);
 assert.match(sections('website-not-showing-on-google').find(section=>section.id==='define').body,/^<span id="discovery"><\/span>/);
 assert.deepEqual(sections('contact-form-not-working').slice(0,5).map(section=>section.id),['five-minute-check','page','platform-settings','verify','review-options']);
 assert.match(sections('contact-form-not-working')[0].body,/^<span id="trace"><\/span><span id="inbox"><\/span>/);
 const technical=sections('contact-form-not-working').at(-1);
 assert.equal(technical.id,'specific-form-checks');
 for(const id of ['receipt','notification'])assert.ok(technical.body.includes(`<div id="${id}">`));
 assert.match(sections('website-launch-checklist')[0].body,/^<span id="launch-check-tools"><\/span>/);
 const migration=sections('website-migration-checklist').map(section=>section.id);
 assert.equal(migration.indexOf('redirect-example')+1,migration.indexOf('before'));
});

test('guide renders do not share mutable section objects or mutate offer inputs',()=>{
 const originalOffers=structuredClone(offers);
 for(const item of journal){
  const first=journalSections(item.path,offers);
  const expected=structuredClone(first);
  first[0].body='Changed by a consumer';
  first.reverse();
  assert.deepEqual(journalSections(item.path,offers),expected,item.path);
 }
 assert.deepEqual(offers,originalOffers);
});

test('build prices, scope names, page limits and payment amounts stay dynamic',()=>{
 const changed=structuredClone(offers);
 for(const [index,id] of ['launch_site','focused_site','signature_site'].entries()){
  changed[id].public_price=2111+index*1337;
  changed[id].marketing_page_cap=9+index*11;
  changed[id].public_name=`Probe ${id}`;
 }
 const original=body('website-project-cost');
 const revised=body('website-project-cost',changed);
 for(const id of ['launch_site','focused_site','signature_site']){
  assert.ok(revised.includes(money(changed[id].public_price)),id);
  assert.ok(revised.includes(changed[id].public_name),id);
  assert.ok(revised.includes(`Up to ${changed[id].marketing_page_cap} pages`),id);
 }
 for(const portion of [.5,.3,.2])assert.ok(revised.includes(money(changed.launch_site.public_price*portion)));
 assert.notEqual(revised,original);
 assert.equal(body('website-project-cost'),original);
});

test('review and monthly plan prices and pluralization use each render’s configuration',()=>{
 const changed=structuredClone(offers);
 changed.baseline.one_time_price=383;
 changed.audit_sprint.one_time_price=887;
 changed.baseline.page_cap=13;
 for(const [index,id] of ['keep_running','improve','grow'].entries())changed.plans[id].monthly_price=177+index*226;
 changed.plans.improve.priorities=3;
 changed.plans.grow.priorities=4;
 for(const slug of ['website-maintenance-cost','website-care-versus-seo','seo-work-and-reporting']){
  const revised=body(slug,changed);
  for(const id of ['keep_running','improve','grow'])assert.ok(revised.includes(money(changed.plans[id].monthly_price)),`${slug}: ${id}`);
 }
 const review=body('contact-form-not-working',changed);
 for(const price of [383,887])assert.ok(review.includes(money(price)));
 assert.ok(review.includes('13 agreed main pages'));
 assert.match(body('website-care-versus-seo',changed),/no automatic \$177 care charge/);
 assert.ok(body('seo-work-and-reporting',changed).includes('3 completed improvements'));
 changed.plans.improve.priorities=1;
 const single=sections('seo-work-and-reporting',changed).find(section=>section.id==='scope').body;
 assert.ok(single.includes('1 completed improvement'));
 assert.ok(!single.includes('1 completed improvements'));
});

test('article download links retain download behavior and file type labels',()=>{
 let downloads=0;
 for(const item of journal){
  const html=article(item.path.split('/').filter(Boolean).at(-1));
  for(const match of html.matchAll(/<a\b([^>]*href="[^"]+\.(csv|txt)"[^>]*)>([^<]*)<\/a>/gi)){
   downloads++;
   assert.match(match[1],/\bdownload(?:[=>\s]|$)/i,item.path);
   assert.match(match[3],match[2].toLowerCase()==='csv'?/spreadsheet/:/text file/,item.path);
  }
 }
 assert.ok(downloads>=17,'All existing guide downloads remain reachable');
});
