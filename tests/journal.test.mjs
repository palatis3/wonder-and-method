import {socialCardPath} from '../src/social-cards.mjs';
import {guideIllustration} from '../src/guide-art.mjs';
import pageDates from '../config/page-dates.json' with {type:'json'};
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderPages} from '../src/pages.mjs';
import {crawlFiles} from '../src/seo.mjs';
import {journal,journalImage,journalSections} from '../src/journal.mjs';
import {buyerPacks} from '../src/buyer-packs.mjs';
import worker from '../deployment/worker.mjs';
const json=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const [config,offers,map,geography]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json'].map(json));
const pages=renderPages({config,offers,map,geography});
function assertArticleOutsideDisclosures(html,label){
  assert.match(html,/<\/nav><\/details><div class="journal-prose">/,label+' article must sit outside collapsed contents');
  const disclosures=[];for(const tag of html.matchAll(/<\/?details\b[^>]*>|<div class="journal-prose">/g)){
   if(tag[0]==='<div class="journal-prose">')assert.equal(disclosures.length,0,label+' article hidden in disclosure');
   else if(tag[0].startsWith('</'))assert.ok(disclosures.pop(),label+' unexpected details close');
   else disclosures.push(tag[0]);
  }assert.equal(disclosures.length,0,label+' unclosed details');
}

test('published guides have unique metadata, visible authorship and matching article schema',()=>{
 const titles=new Set();
 for(const guide of journal){const page=pages.find(x=>x.path===guide.path);assert.ok(page,guide.path);const html=page.html;
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1);assert.ok(!titles.has(guide.title));titles.add(guide.title);
  const data=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  const article=data.find(x=>x['@type']==='Article');assert.equal(article.headline,guide.title);assert.equal(article.mainEntityOfPage,config.origin+guide.path);assert.equal(article.author['@id'],config.origin+'/#studio');assert.equal(article.datePublished,guide.datePublished);assert.equal(article.dateModified,guide.dateModified);
  const newGuide=['google-visibility-flow','contact-form-flow','service-area-decision','maintenance-cycle','contractor-inquiry'].includes(guide.image);
  const auditGuide=['/guides/website-maintenance-cost/','/guides/website-launch-checklist/','/guides/ai-website-or-custom/'].includes(guide.path);
  const revised=auditGuide||['/guides/website-project-cost/','/guides/contact-form-not-working/','/guides/website-not-showing-on-google/'].includes(guide.path);
  assert.equal(guide.datePublished,auditGuide?'2026-10-17':newGuide?'2026-10-16':guide.diagram?'2026-10-15':'2026-10-14');
  assert.equal(guide.dateModified,pageDates[guide.path].modifiedAt);
  assert.ok(html.includes(`Published <time datetime="${guide.datePublished}">`));
  if(guide.datePublished===guide.dateModified)assert.doesNotMatch(html,/ · Updated/);else assert.ok(html.includes('Updated <time datetime="'+guide.dateModified+'">'));
  if(guide.diagram){assert.ok(html.includes(`/assets/guides/${guide.image}.svg`));const figure=html.match(/<figure class="journal-hero journal-diagram">(.*?)<\/figure>/s)?.[1];assert.ok(figure);assert.match(figure,/alt="[^"]+"/);assert.doesNotMatch(figure,/<figcaption>|alt="Decision diagram:/);}
  else{assert.match(html,/<figure class="journal-hero"><img[^>]+width="1200" height="800"[^>]+alt="[^"]+"[^>]+loading="lazy"[^>]*><\/figure>/);assert.ok(html.includes(`${guideIllustration(guide)}-640.webp 640w`));}
  const image=config.origin+journalImage(guide);assert.deepEqual(article.image,guide.diagram?[image]:['square','4x3','16x9'].map(ratio=>config.origin+guideIllustration(guide)+'-'+ratio+'.png'));assert.ok(html.includes(`property="og:image" content="${image}"`));
  const crumbs=data.find(x=>x['@type']==='BreadcrumbList').itemListElement;assert.equal(crumbs.at(-1).item,article.mainEntityOfPage);assert.equal(crumbs[1].item,config.origin+'/guides/');
  assertArticleOutsideDisclosures(html,guide.path);
  assert.match(html,/aria-label="In this guide"/);assert.match(html,/class="journal-byline"/);
  for(const match of html.matchAll(/href="#([^"]+)"/g))assert.ok(html.includes(`id="${match[1]}"`),match[1]);
 }
});

test('new guides keep publication gates, distinct downloads and reciprocal service links',async()=>{
 const comparison='/guides/website-care-versus-seo/',audit='/guides/website-audit-checklist/';
 assert.equal(journal.length,17);assert.equal(pages.length,83);assert.ok(pages.some(page=>page.path==='/services/'));assert.ok(pages.some(page=>page.path==='/payments/'));
 const gated=renderPages({config:{...config,guideApprovals:config.guideApprovals.filter(x=>![comparison,audit].includes(x.path))},offers,map,geography});
 assert.ok(!gated.some(x=>[comparison,audit].includes(x.path)));for(const page of gated)for(const target of [comparison,audit])assert.ok(!page.html.includes(`href="${target}"`),page.path+' -> held '+target);
 for(const path of ['/services/website-care/','/services/seo/'])assert.ok(pages.find(x=>x.path===path).html.includes(`href="${comparison}"`),path);
 assert.ok(pages.find(x=>x.path==='/services/website-audit/').html.includes(`href="${audit}"`));
 const cost=pages.find(x=>x.path===comparison).html,checklist=pages.find(x=>x.path===audit).html;
 for(const target of ['/services/website-care/','/services/seo/','/services/website-audit/','/pricing/#after-launch','/guides/seo-work-and-reporting/'])assert.ok(cost.includes(`href="${target}"`),target);
 for(const target of ['/services/website-audit/','/work/','/services/seo/','/guides/website-redesign-brief/','/contact/'])assert.ok(checklist.includes(`href="${target}"`),target);
 for(const slug of ['care-versus-seo','audit-checklist']){
  const svg=await readFile(new URL(`../src/assets/guides/${slug}.svg`,import.meta.url),'utf8');assert.match(svg,/role="img" aria-labelledby="title desc"/);assert.match(svg,/<title id="title">/);assert.match(svg,/<desc id="desc">/);
  const png=await readFile(new URL(`../src/assets/guides/${slug}-social.png`,import.meta.url));assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
 }
 const worksheet=await readFile(new URL('../src/assets/guides/website-care-versus-seo-worksheet.csv',import.meta.url),'utf8');
 for(const field of ['Problem','Facts or evidence','Care task','Search or content task','Who / agreed month','How to check it'])assert.ok(worksheet.split('\n')[0].includes(`"${field}"`));
 assert.equal((worksheet.match(/"Example only:/g)||[]).length,3);assert.match(worksheet,/do not count the same work twice/);assert.doesNotMatch(worksheet,/Actual owned content-change record/);
 const csv=await readFile(new URL('../src/assets/guides/website-audit-checklist.csv',import.meta.url),'utf8');
 for(const field of ['What to check','What should happen','Result','Evidence (link and date)','Fix needed / who','Next check'])assert.ok(csv.split('\n')[0].includes(`"${field}"`));
 assert.equal((csv.match(/"Untested"/g)||[]).length,16);assert.match(csv,/check confirmation, any saved record, inbox or spam, and your reply separately/);
 assert.doesNotMatch(checklist,/CA-01|CA-04/);assert.match(checklist,/confirm receipt and inbox arrival/);assert.match(checklist,/hypothetical/);assert.doesNotMatch(checklist,/97\/100|100\/100|Lighthouse score/);
});

test('repair-or-redesign guide supports the earlier decision with bounded owned evidence and a distinct worksheet',async()=>{
 const path='/guides/website-repair-or-redesign/',html=pages.find(page=>page.path===path)?.html;assert.ok(html);
 const hidden=renderPages({config:{...config,guideApprovals:config.guideApprovals.filter(x=>x.path!==path)},offers,map,geography});assert.ok(!hidden.some(page=>page.path===path));
 for(const target of ['/services/website-audit/','/services/web-design/','/guides/website-audit-checklist/','/guides/website-redesign-brief/','/guides/website-project-cost/','/work/','/assets/buyer-packs/owned-audit-two-fixes'])assert.ok(html.includes(`href="${target}"`),target);
 for(const source of ['/services/website-audit/','/services/web-design/','/guides/website-audit-checklist/','/guides/website-redesign-brief/'])assert.ok(pages.find(page=>page.path===source).html.includes(`href="${path}"`),source);
 assert.match(html,/No new project is a valid decision/);assert.match(html,/Hypothetical scenario — not a client project/);assert.match(html,/does not report client outcomes/);assert.doesNotMatch(html,/CA-03/);
 const revised=structuredClone(offers);revised.audit_sprint.one_time_price=775;assert.match(journalSections(path,revised).map(x=>x.body).join(''),/\$775/);
 const csv=await readFile(new URL('../src/assets/guides/website-repair-or-redesign-worksheet.csv',import.meta.url),'utf8');
 for(const field of ['What is going wrong','Evidence (link and date)','Useful content and accounts to keep','Platform and access check','Small fix to try and how to check it','Keep, fix or rebuild?'])assert.ok(csv.split('\n')[0].includes(`"${field}"`),field);
 assert.match(csv,/Example only:/);assert.match(csv,/No client result claimed/);assert.match(csv,/Try a small fix before deciding on a rebuild/);assert.doesNotMatch(csv,/Actual owned correction/);
 for(const row of csv.trim().split(/\r?\n/))assert.equal((row.match(/"(?:[^"]|"")*"/g)||[]).length,6,'Six usable worksheet fields on every row');
 const svg=await readFile(new URL('../src/assets/guides/repair-or-redesign.svg',import.meta.url),'utf8');assert.match(svg,/role="img" aria-labelledby="title desc"/);assert.match(svg,/record gaps and obtain authorized access/);assert.match(svg,/keep the useful site/);assert.match(svg,/fix and retest/);
 const png=await readFile(new URL('../src/assets/guides/repair-or-redesign-social.png',import.meta.url));assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
 const seo=pages.find(page=>page.path==='/services/seo/').html;assert.match(seo,/https:\/\/developers.google.com\/search\/docs\/fundamentals\/ai-optimization-guide/);assert.match(seo,/must be indexed and able to show a search snippet/);assert.match(seo,/No special AI file or extra schema guarantees visibility/);assert.match(seo,/relevant Search Console inclusion setting/);
});

test('care comparison uses current configured service fees and finite units',()=>{
 const revised=structuredClone(offers);revised.plans.keep_running.monthly_price=207;revised.plans.improve.priorities=3;
 const html=journalSections('/guides/website-care-versus-seo/',revised).map(x=>x.body).join('');
 assert.match(html,/Keep Running is \$207/);assert.match(html,/3 complete improvements/);assert.match(html,/billing and cancellation terms/);assert.doesNotMatch(html,/base-hosting credit/);
 assert.match(html,/it is still one correction/);assert.match(html,/next invoice pauses/);
 const terms=JSON.stringify(buyerPacks(revised).find(pack=>pack.id==='improve').sections);assert.match(terms,/same work is never counted twice/i);assert.match(terms,/Accepted work delayed by me remains owed/);
});

test('only pages containing Civic artwork load Civic styles and alternate hero code stays absent',()=>{
 for(const page of pages){
  assert.equal(page.html.includes('href="/assets/civic-sculpture-preview.css"'),page.html.includes('data-edition="civic-sculpture"'),page.path);
  assert.ok(!page.html.includes('src="/assets/premium.js"'),page.path);
 }
});
test('approved public launch has indexed editorial pages and excluded utility pages',()=>{
 assert.equal(config.mode,'production');assert.equal(config.formMode,'live');assert.equal(config.searchIndexing,true);
 assert.ok(pages.find(x=>x.path==='/').html.includes('name="robots" content="index,follow"'));
 assert.ok(pages.find(x=>x.path==='/privacy/').html.includes('name="robots" content="index,follow"'));
 assert.ok(pages.every(x=>!x.html.includes('class="preview-label"')));
 const crawl=crawlFiles(config,pages);assert.equal(crawl.robots,`User-agent: *\nAllow: /\nSitemap: ${config.origin}/sitemap.xml\n`);assert.equal((crawl.sitemap.match(/<loc>/g)||[]).length,pages.length-1);
 const contact=pages.find(x=>x.path==='/contact/').html;assert.match(contact,/data-mode="live"/);assert.ok(!/<(?:input|select|textarea)[^>]*disabled/.test(contact));
});
test('edge noindex covers public assets, rejected API requests and unavailable storage',async()=>{
 const env={ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',SEARCH_INDEXING:'false',ASSETS:{fetch:async()=>new Response('public asset')}};
 for(const request of [new Request('https://example.test/'),new Request('https://example.test/api/operator/inquiries'),new Request('https://example.test/api/inquiries',{method:'POST',headers:{Origin:'https://example.test'}})]){
  const result=await worker.fetch(request,env,{waitUntil(){}});assert.match(result.headers.get('X-Robots-Tag'),/noindex/);
 }
 env.ASSETS.fetch=async()=>{throw Error('simulated outage');};const failure=await worker.fetch(new Request('https://example.test/'),env,{});assert.equal(failure.status,503);assert.match(failure.headers.get('X-Robots-Tag'),/noindex/);
});


test('the cost-guide examples distinguish pages and creative scope with source-code handoff',()=>{
 const html=pages.find(page=>page.path==='/guides/website-project-cost/').html;
 assert.match(html,/Focused adds more service detail, two forms, two original guides and up to two ready connections/);
 assert.match(html,/Signature adds a larger page plan, four original guides and an original animated hero or 3D centerpiece/);
 assert.match(html,/Every studio website package includes.*source files and a written handoff/);assert.doesNotMatch(html,/browser CMS|publishing dashboard/);
 assert.doesNotMatch(html,/the first scope might|the second could/);
});

test('guide structure verifier rejects a missing contents-disclosure closing tag',()=>{
 const html=pages.find(page=>page.path==='/guides/contact-form-not-working/').html;
 assertArticleOutsideDisclosures(html,'intact guide');
 const broken=html.replace('</nav></details><div class="journal-prose">','</nav><div class="journal-prose">');
 assert.notEqual(broken,html,'mutation must remove the contents closing tag');
 assert.throws(()=>assertArticleOutsideDisclosures(broken,'broken guide'),/article must sit outside collapsed contents/);
});

test('guide publication retains approval gates',()=>{
 assert.ok(pages.some(page=>page.path==='/guides/website-care-versus-seo/'));
 const held=renderPages({config:{...config,guideApprovals:config.guideApprovals.filter(x=>x.path!=='/guides/website-care-versus-seo/')},offers,map,geography});
 assert.ok(!held.some(page=>page.path==='/guides/website-care-versus-seo/'));assert.ok(!held.find(page=>page.path==='/pricing/').html.includes('href="/guides/website-care-versus-seo/"'));
});
