import excluded from './fixtures/search-excluded-public-paths.json' with {type:'json'};
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderPages} from '../src/pages.mjs';
import {crawlFiles} from '../src/seo.mjs';
import {evaluateRelease} from '../src/release.mjs';
import {searchMetadata,searchSupplement} from '../src/search-content.mjs';
import worker from '../deployment/worker.mjs';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const [config,offers,map,geography,deployment]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json','deployment/wrangler.production.jsonc'].map(read));
const newGuides=['website-not-showing-on-google','contact-form-not-working','service-area-pages'].map(x=>`/guides/${x}/`);
test('new guide publication gates remove pages and all dangling guide links',()=>{
 const pages=renderPages({config:{...config,guideApprovals:config.guideApprovals.filter(x=>!newGuides.includes(x.path))},offers,map,geography});
 for(const target of newGuides){assert.ok(!pages.some(x=>x.path===target));for(const page of pages)assert.ok(!page.html.includes(`href="${target}"`),page.path+' -> '+target);}
});
test('approved indexing includes public routes and an explicit hold still excludes all routes',()=>{
 assert.equal(config.searchIndexing,true);assert.equal(deployment.vars.SEARCH_INDEXING,'true');
 const held={...config,searchIndexing:false},pages=renderPages({config:held,offers,map,geography});
 assert.ok(pages.every(x=>x.html.includes('noindex,nofollow')));assert.doesNotMatch(crawlFiles(held,pages).sitemap,/<loc>/);
 const enabled={...config,searchIndexing:true},livePages=renderPages({config:enabled,offers,map,geography}),crawl=crawlFiles(enabled,livePages);
 for(const route of [...newGuides,'/services/','/services/website-redesign/','/services/website-addons/'])assert.ok(crawl.sitemap.includes(config.origin+route));
 assert.equal((crawl.sitemap.match(/<loc>/g)||[]).length,livePages.length-1-excluded.length);assert.doesNotMatch(crawl.sitemap,/\/api\/|\/assets\/|\/404\//);
 const evidence={gates:{},approvedVersion:{}},current={};
 assert.ok(evaluateRelease({release_gates:[]},evidence,current,held,deployment).missing.some(x=>x.gate==='indexing_consistency'));
 assert.ok(!evaluateRelease({release_gates:[]},evidence,current,config,deployment).missing.some(x=>x.gate==='indexing_consistency'));
});
test('future public indexing keeps APIs errors and downloadable decision records excluded',async()=>{
 const env={ENVIRONMENT:'production',RELEASE_APPROVED:'true',SEARCH_INDEXING:'true',ASSETS:{fetch:async()=>new Response('test')}};
 for(const route of ['/api/inquiries','/api/missing','/assets/buyer-packs/launch_site.txt','/assets/buyer-packs/owned-audit-two-fix-record.json','/404/','/404.html']){
  const res=await worker.fetch(new Request('https://example.test'+route),env,{});assert.match(res.headers.get('X-Robots-Tag'),/noindex/,route);
 }
 const publicPage=await worker.fetch(new Request('https://example.test/services/web-design/'),env,{});assert.equal(publicPage.headers.get('X-Robots-Tag'),null);
 const errorEnv={...env,ASSETS:{fetch:async()=>new Response('missing',{status:404})}};
 assert.match((await worker.fetch(new Request('https://example.test/missing/'),errorEnv,{})).headers.get('X-Robots-Tag'),/noindex/);
});
test('canonical asset redirects become permanent without changing query or unrelated destinations',async()=>{
 for(const [route,clean] of [['/pricing','/pricing/'],['/pricing/index.html','/pricing/'],['/assets/buyer-packs/focused_site.html','/assets/buyer-packs/focused_site']]){
  const destination='https://example.test'+clean+'?source=test';
  const env={ENVIRONMENT:'production',RELEASE_APPROVED:'true',SEARCH_INDEXING:'false',ASSETS:{fetch:async()=>Response.redirect(destination,307)}};
  const response=await worker.fetch(new Request('https://example.test'+route+'?source=test'),env,{});
  assert.equal(response.status,308);assert.equal(response.headers.get('Location'),destination);
  env.ASSETS.fetch=async()=>Response.redirect('https://example.test/different/',307);
  // Known page variants are normalized before ASSETS; unrelated destinations
  // still pass through unchanged for paths outside the public-page allowlist.
  assert.equal((await worker.fetch(new Request('https://example.test'+(route.startsWith('/assets/')?route:'/unmapped-page')),env,{})).status,307);
 }
});
test('search descriptions derive from current prices and supplements link to diagnosis',()=>{
 const revised=structuredClone(offers);revised.launch_site.public_price=1625;revised.audit_sprint.one_time_price=775;revised.plans.improve.monthly_price=150;revised.baseline.one_time_price=425;
 assert.ok(searchMetadata['/services/web-design/'].description(revised).includes('from $1,625.'));
 assert.ok(searchMetadata['/services/website-audit/'].description(revised).includes('Website Baseline $425'));assert.ok(searchMetadata['/services/website-audit/'].description(revised).includes('Audit & Fix Sprint $775'));
 assert.ok(searchMetadata['/services/seo/'].description(revised).includes('Improve $150/month'));assert.doesNotMatch(searchMetadata['/services/website-care/'].description(revised),/Grow|SEO|growth/);for(const target of newGuides.filter(path=>!path.includes('contact-form')))assert.ok(searchSupplement('/services/seo/',revised).includes(`href="${target}"`));
});

test('HTTPS-only transport policy includes subdomains on live redirects and failures without affecting other hosts',async()=>{
 const env={ENVIRONMENT:'production',RELEASE_APPROVED:'true',PUBLIC_ORIGIN:'https://wonderandmethod.com',ASSETS:{fetch:async()=>new Response('ok')}};
 for(const host of ['wonderandmethod.com','www.wonderandmethod.com']){
  const res=await worker.fetch(new Request('https://'+host+'/'),env,{});
  assert.equal(res.headers.get('Strict-Transport-Security'),'max-age=31536000; includeSubDomains');
 }
 const failed=await worker.fetch(new Request('https://wonderandmethod.com/'),{...env,ASSETS:{fetch:async()=>{throw Error('fixture');}}},{});
 assert.equal(failed.status,503);assert.equal(failed.headers.get('Strict-Transport-Security'),'max-age=31536000; includeSubDomains');
 for(const url of ['http://wonderandmethod.com/','https://preview.example.test/'])assert.equal((await worker.fetch(new Request(url),env,{})).headers.get('Strict-Transport-Security'),null);
 assert.equal((await worker.fetch(new Request('https://wonderandmethod.com/'),{...env,ENVIRONMENT:'staging'},{})).headers.get('Strict-Transport-Security'),null);
});
