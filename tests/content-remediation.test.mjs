import {retiredCountyRoutes} from '../deployment/retired-county-routes.mjs';
import {serviceStates,countyPath} from '../src/service-area-directory.mjs';
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

test('all 27 guides lead their prose with an answer, show useful contents and full art, and keep one ending action',()=>{
 assert.equal(journal.length,59);
 for(const item of journal){
  const html=journalArticle(item,offers,journal);
  assert.match(html,/<div class="journal-prose"><div class="guide-decision"><h2>The short answer<\/h2>/,item.path);
  assert.ok(html.indexOf('The short answer')<html.indexOf('<section id="'),item.path);
  assert.equal((html.match(/class="journal-toc"/g)||[]).length,journalSections(item.path,offers).length>=6?1:0,item.path);
  assert.equal((html.match(/<figure class="journal-hero/g)||[]).length,item.image==='repair-or-redesign'?1:0,item.path);
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
 const search=journalSections('/guides/website-not-showing-on-google/',offers);assert.deepEqual(search.slice(0,3).map(s=>s.id),['define','plain-search-terms','inspection-steps']);assert.match(search.find(s=>s.id==='inspection-steps').body,/Search Console/);
 const launch=journalSections('/guides/website-launch-checklist/',offers).map(x=>x.body).join('');assert.match(launch,/restore the previous version/);assert.match(launch,/Not checked, Works, Needs fixing, Need access, Not applicable or Blocked/);assert.match(launch,/Explain any blocked check and who can resolve it/);assert.match(launch,/does not guarantee indexing/);
});

test('state directories lead with places, retain service links and give each of 1079 areas one destination',()=>{
 const pages=countyPages(offers),hub=pages.find(p=>p.path==='/areas/').body;
 assert.equal(pages.length,22);
 for(const page of pages){
  assert.ok(page.body.indexOf('id="counties"')>=0,page.path);
  assert.ok(page.body.indexOf('id="counties"')<page.body.indexOf('id="scope"'),page.path);
  for(const route of ['/pricing/','/services/'])assert.ok(page.body.includes(`href="${route}"`),page.path+' '+route);
  assert.match(page.body,/href="\/contact\/\?request_kind=question#inquiry"/);
  assert.doesNotMatch(page.body,/class="county-buyer-task"|class="county-planning-details"/);
 }
 const destinations=[...hub.matchAll(/data-county-link href="([^"]+)"/g)].map(match=>match[1]);
 assert.equal(destinations.length,1079);assert.equal(new Set(destinations).size,1079);
 assert.deepEqual(destinations.slice().sort(),serviceStates.flatMap(state=>state.counties.map(county=>countyPath(county,state))).sort());
 assert.equal(Object.keys(retiredCountyRoutes).length,332);
 for(const [retired,destination] of Object.entries(retiredCountyRoutes)){assert.ok(!destinations.includes(retired),retired);assert.ok(destinations.includes(destination),destination);}
 assert.ok(destinations.indexOf('/areas/erie-county/')<destinations.indexOf('/areas/new-york/#niagara'));
 const ny=pages.find(p=>p.path==='/areas/new-york/').body;
 assert.match(ny.slice(ny.indexOf('id="orange"')).split('</details>')[0],/Tuxedo Park remains a separate village/);
 assert.match(ny.slice(ny.indexOf('id="albany"')).split('</details>')[0],/Green Island is a coterminous town and village/);
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
 assert.equal((index.match(/class="journal-card journal-card-text"/g)||[]).length,59);
 assert.doesNotMatch(index,/<img\b/);for(const item of journal)assert.ok(index.includes('href="'+item.path+'"'));
 for(const item of journal){
  const card=journalCard(item);
  assert.doesNotMatch(card,/<img|srcset=/,item.path+' related reading remains text-first');
  assert.ok(card.includes('href="'+item.path+'"'));
  const description=card.match(/class="journal-card-description">([^<]+)</)?.[1];
  assert.ok(description?.endsWith('.'),item.path+' summary is a complete sentence');
 }
});

test('responsive guide steps retain every decision, and the branching diagram keeps its description',()=>{
 for(const item of journal){
  const html=journalArticle(item,offers,journal),details=researchGuideDetails[item.path.split('/').filter(Boolean).at(-1)];
  if(details){
   const steps=html.match(/<ol class="guide-steps"[^>]*>([\s\S]*?)<\/ol>/)?.[1];assert.ok(steps,item.path);
   for(const phrase of details.steps.flat())assert.ok(steps.includes(phrase.replaceAll('&','&amp;')),item.path+' '+phrase);
   assert.ok(html.indexOf('class="guide-steps"')>html.indexOf('</section>'));
  }else if(item.image==='repair-or-redesign'){
   assert.match(html,/<figure class="journal-hero journal-diagram">/);assert.match(html,/alt="[^"]*Keep what works/);assert.match(html,/<figcaption>/);
  }else assert.doesNotMatch(html,/<figure class="journal-hero/,item.path+' redundant figure omitted');
 }
});
