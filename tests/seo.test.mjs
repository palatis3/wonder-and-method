import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assertSiteOrigin,crawlFiles} from '../src/seo.mjs';
import {renderPages} from '../src/pages.mjs';
const read=async p=>JSON.parse(await readFile(new URL(p,import.meta.url),'utf8'));
const [saved,offers,map,geography]=await Promise.all(['../config/site.json','../config/offers.json','../authority/v5/site-map.json','../authority/v5/geography.json'].map(read));
// Synthetic fixture only: these values do not authorize production or privacy.
const production={...saved,analytics:null,supportChat:{enabled:false},guideApprovals:[],searchIndexing:true,mode:'production',origin:'https://studio.example.com',productionDomain:'studio.example.com',formMode:'live',privacyReviewed:true,contactVerified:true,businessIdentity:'Synthetic Studio',contactEmail:'test@example.com',responseWindow:'Synthetic fixture',privacy:{processors:[{name:'Example',purpose:'Synthetic fixture',policyUrl:'https://example.com/privacy'}],purpose:'Test',retention:'Test',access:'Test',rights:'Test',contact:'test@example.com',reviewedAt:'2026-10-14'}};
const render=config=>renderPages({config,offers,map,geography});
test('production refuses preview, foreign, HTTP, port and path origins',()=>{
 for(const origin of ['http://127.0.0.1:4183','http://studio.example.com','https://foreign.example.com','https://studio.example.com:8443','https://studio.example.com/','https://studio.example.com/path','https://user:pass@studio.example.com','https://studio.example.com?draft=1'])assert.throws(()=>assertSiteOrigin({...production,origin}),/origin/i,origin);
 assert.equal(assertSiteOrigin(production),'https://studio.example.com');
});
test('production output has coherent canonical, OG, schema and crawl metadata',()=>{
 const pages=render(production),titles=new Set(),descriptions=new Set();
 for(const {path,html} of pages){
  assert.ok(html.includes(`rel="canonical" href="${production.origin}${path}"`));
  assert.ok(html.includes(`property="og:url" content="${production.origin}${path}"`));
  assert.ok(html.includes(`name="robots" content="${(path==='/404/'||(path.startsWith('/checkout/')||/^\/work\/(fieldwork|northline|hearthside)\//.test(path))||['/payments/','/privacy/','/terms/','/accessibility/','/work/lead-workbench/','/work/content-editor/'].includes(path))?'noindex,nofollow,noarchive,noimageindex':'index,follow'}"`));
  const title=html.match(/<title>(.*?)<\/title>/)[1],description=html.match(/name="description" content="([^"]+)"/)[1];
  assert.ok(!titles.has(title));assert.ok(!descriptions.has(description));titles.add(title);descriptions.add(description);
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(schema[0].url,production.origin);if(!['/','/404/'].includes(path))assert.equal(schema.find(x=>x['@type']==='BreadcrumbList').itemListElement.at(-1).item,production.origin+path);
 }
 const crawl=crawlFiles(production,pages);
 assert.match(crawl.robots,/Allow: \/\nSitemap: https:\/\/studio.example.com\/sitemap.xml/);
 assert.equal((crawl.sitemap.match(/<loc>/g)||[]).length,pages.length-24);
 assert.ok(!crawl.sitemap.includes('/404/'));assert.ok(!crawl.sitemap.includes('/concepts/'));assert.ok(!crawl.sitemap.includes('/guides/'));
 assert.ok(!pages.some(page=>page.html.includes('127.0.0.1')));
});
test('staging remains excluded and guides only gain links when present',()=>{
 const staging={...saved,mode:'staging',formMode:'synthetic',guideApprovals:[]};const pages=render(staging),crawl=crawlFiles(staging,pages);
 assert.ok(pages.every(page=>page.html.includes('noindex,nofollow')));assert.match(crawl.robots,/Disallow: \//);assert.ok(!crawl.sitemap.includes('<loc>'));
 const guide='/guides/website-redesign-brief/';
 assert.ok(!pages.find(p=>p.path==='/services/web-design/').html.includes(`href="${guide}"`));
 const approved=render({...saved,guideApprovals:[{path:guide,reviewedAt:'2026-10-14',reviewedBy:'Synthetic test',evidenceReference:'Synthetic test only'}]});
 assert.ok(approved.some(p=>p.path===guide));
 assert.ok(approved.find(p=>p.path==='/services/web-design/').html.includes(`href="${guide}"`));
});
