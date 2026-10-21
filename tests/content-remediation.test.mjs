import {researchGuideDetails} from '../src/research-guides.mjs';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import offers from '../config/offers.json' with {type:'json'};
import config from '../config/site.json' with {type:'json'};
import {journal,journalArticle,journalSections,journalIndex,journalCard} from '../src/journal.mjs';
import {countyPages} from '../src/service-counties.mjs';
import {commercialOffers,offersForService} from '../src/schema.mjs';
import {privateRoute,routeIndexEligible} from '../src/index-policy.mjs';
import {guideIllustrationAlt} from '../src/guide-art.mjs';

test('all 23 guides lead their prose with an answer, show useful contents and full art, and keep one ending action',()=>{
 assert.equal(journal.length,23);
 for(const item of journal){
  const html=journalArticle(item,offers,journal);
  assert.match(html,/<div class="journal-prose"><div class="guide-decision"><h2>The short answer<\/h2>/,item.path);
  assert.ok(html.indexOf('The short answer')<html.indexOf('<figure class="journal-hero'),item.path);
  assert.equal((html.match(/class="journal-toc"/g)||[]).length,journalSections(item.path,offers).length>=6?1:0,item.path);
  assert.equal((html.match(/<figure class="journal-hero/g)||[]).length,1,item.path);
  assert.doesNotMatch(html,/class="journal-visual"/,item.path+' illustration is visible, not a disclosure');
  assert.equal((html.match(/class="journal-callout guide-ending"/g)||[]).length,1,item.path);
  const ids=[...html.matchAll(/ id="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length,item.path);
  for(const match of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(match[1]),item.path+' '+match[1]);
  assert.ok(!html.includes('undefined'),item.path);
  assert.ok(html.includes(' min read'),item.path);
 }
});

test('owner checks come first and diagnostic offers preserve correct intent',()=>{
 const form=journalSections('/guides/contact-form-not-working/',offers);
 assert.deepEqual(form.slice(0,5).map(x=>x.id),['five-minute-check','page','platform-settings','verify','review-options']);
 const body=form.map(x=>x.body).join('');assert.match(body,/A site may not store a separate inquiry record/);assert.match(body,/WordPress:.*identify the form plugin/);assert.match(body,/SPF, DKIM and DMARC/);
 const rendered=journalArticle(journal.find(item=>item.path==='/guides/contact-form-not-working/'),offers,journal);
 assert.match(rendered,/offer=website_baseline&amp;goal=fix&amp;request_kind=question#inquiry/);assert.match(body,/Audit &amp; Fix Sprint.*up to two small fixes in total/);
 const search=journalSections('/guides/website-not-showing-on-google/',offers);assert.deepEqual(search.slice(0,3).map(s=>s.id),['plain-search-terms','inspection-steps','specific-index-checks']);assert.match(search.find(s=>s.id==='inspection-steps').body,/Search Console/);
 const launch=journalSections('/guides/website-launch-checklist/',offers).map(x=>x.body).join('');assert.match(launch,/rollback/);assert.match(launch,/Not checked, Works, Needs fixing, Need access, Not applicable or Blocked/);assert.match(launch,/Explain any blocked check and who can resolve it/);assert.match(launch,/does not guarantee indexing/);
});

test('county services precede optional worksheet and hub keeps one link per county',()=>{
 const pages=countyPages(offers),hub=pages.find(p=>p.path==='/areas/').body;
 for(const page of pages.filter(p=>/-county\/$/.test(p.path))){
  assert.ok(page.body.indexOf('id="services"')<page.body.indexOf('id="buyer-task"'),page.path);
  assert.match(page.body,/href="\/pricing\/"/);assert.match(page.body,/href="\/services\/web-design\/"/);
 }
 assert.equal((hub.match(/href="\/areas\/[^"]+-county\/"/g)||[]).length,217);
 assert.ok(hub.indexOf('/areas/erie-county/')<hub.indexOf('/areas/niagara-county/'));
 assert.match(pages.find(p=>p.path==='/areas/orange-county/').body,/Tuxedo Park remains a separate village/);
 assert.match(pages.find(p=>p.path==='/areas/albany-county/').body,/Green Island is a coterminous town and village/);
});

test('catalog monthly entities match their services; public payment information and inquiry forms are indexable',()=>{
 const monthly=commercialOffers(config,offers).filter(x=>x.priceSpecification);
 assert.deepEqual(monthly.map(x=>new URL(x.itemOffered['@id']).pathname),['/services/website-care/','/services/seo/','/services/seo/']);
 assert.equal(offersForService(config,offers,'/services/website-care/').length,1);
 assert.equal(offersForService(config,offers,'/services/seo/').length,2);
 assert.equal(privateRoute('/payments/'),false);assert.equal(routeIndexEligible('/payments/'),true);
 assert.equal(privateRoute('/checkout/'),false);assert.equal(privateRoute('/api/inquiries'),true);
 assert.doesNotMatch(guideIllustrationAlt({path:'/guides/website-redesign-brief/'}),/\?\./);
});

test('guide index is text-only while related cards use responsive WebP derivatives',async()=>{
 const index=journalIndex(journal);
 assert.equal((index.match(/class="journal-card journal-card-text"/g)||[]).length,23);
 assert.doesNotMatch(index,/<img\b/);for(const item of journal)assert.ok(index.includes('href="'+item.path+'"'));
 const media=new Set();
 for(const item of journal){
  const card=journalCard(item);
  assert.match(card,/sizes="\(max-width:767px\) calc\(100vw - 40px\), 406px"/);
  assert.match(card,/alt="" loading="lazy"/);
  assert.doesNotMatch(card,/-thumb\.png|-illustration-640\.webp/);
  const description=card.match(/class="journal-card-description">([^<]+)</)?.[1];
  assert.ok(description?.endsWith('.'),item.path+' summary must be a complete sentence');
  assert.notEqual(description,item.description,item.path+' uses its concise card summary');
  for(const match of card.matchAll(/(?:src|srcset)="([^"]+)"/g))for(const candidate of match[1].split(','))media.add(candidate.trim().split(/\s+/)[0]);
 }
 assert.equal(media.size,69);
 for(const path of media){
  assert.match(path,/-card-(480|720|1080)\.webp$/);
  const bytes=await readFile(new URL('../src'+path,import.meta.url));
  assert.equal(bytes.toString('ascii',0,4),'RIFF',path);assert.equal(bytes.toString('ascii',8,12),'WEBP',path);
 }
});

test('diagram alternatives retain the decisions and limitations without duplicate captions',()=>{
 const required={
  'google-visibility-flow':['private pages','discovery, indexing and relevance','Maps eligibility','not guaranteed'],
  'contact-form-flow':['authorized test','receipt, notification, inbox and reply','does not prove delivery'],
  'service-area-decision':['Confirm coverage','existing page','separate page'],
  'maintenance-cycle':['record results','corrections and retest','responsibilities'],
  'contractor-inquiry':['real evidence','confirm coverage','not a quote'],
  'care-versus-seo':['Care keeps the site working','search work','not promised growth'],
  'audit-checklist':['evidence','retest','missing account access'],
  'repair-or-redesign':['Keep what works','small problem','Missing access pauses']
 };
 for(const item of journal.filter(x=>x.diagram)){
  const html=journalArticle(item,offers,journal),figure=html.match(/<figure class="journal-hero journal-diagram">(.*?)<\/figure>/s)?.[1];
  assert.ok(figure,item.path);assert.doesNotMatch(figure,/<figcaption>/);
  assert.ok(figure.includes(`/assets/guides/${item.image}.svg`));
  const alt=figure.match(/alt="([^"]+)"/)?.[1];
  for(const phrase of (required[item.image]||researchGuideDetails[item.path.split('/').at(-2)].steps.flat()))assert.ok(alt?.includes(phrase),item.path+' '+phrase);
 }
});
