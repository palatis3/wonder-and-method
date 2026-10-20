import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderPages} from '../src/pages.mjs';
import {countyProfiles} from '../src/county-profiles.mjs';
import {countyPages} from '../src/service-counties.mjs';
import {countyGeography} from '../src/county-geography.mjs';
import {ongoingGuides} from '../src/ongoing-guides.mjs';
import {journalSections} from '../src/journal.mjs';
import {crawlFiles} from '../src/seo.mjs';
const json=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const [config,offers,map,geography,research]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json','tests/fixtures/county-geography.json'].map(json));
const render=(c=config,o=offers)=>renderPages({config:c,offers:o,map,geography});
const pages=render();

test('county routes expose reviewed geography, truthful delivery and a complete hierarchy',()=>{
 assert.deepEqual(countyProfiles.map(c=>c.name),research.order);
 const hub=pages.find(p=>p.path==='/areas/');assert.ok(hub);
 for(const county of countyProfiles){
  const path=`/areas/${county.slug}-county/`,page=pages.find(p=>p.path===path);assert.ok(page,path);
  assert.deepEqual(countyGeography[county.slug].municipalities,research.counties.find(c=>c.county===county.name).municipalities);
  const schema=JSON.parse(page.html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.deepEqual(schema.find(x=>x['@type']==='BreadcrumbList').itemListElement.map(x=>x.item),[config.origin+'/',config.origin+'/areas/',config.origin+path]);
  assert.equal(schema.find(x=>x['@type']==='Service').areaServed.name,county.name+' County, New York');
  assert.match(page.html,/Buffalo/);assert.match(page.html,/online/);assert.match(page.html,/Illustrative .* County example/);
  assert.ok(hub.html.includes(`href="${path}"`));assert.ok(page.html.includes('href="/areas/"'));
  assert.ok(page.html.includes(`name="robots" content="${county.slug==='niagara'?'index,follow':'noindex,follow'}"`));
 }
 const publicConfig={...config,searchIndexing:true},sitemap=crawlFiles(publicConfig,render(publicConfig)).sitemap;
 for(const county of countyProfiles)assert.equal(sitemap.includes(config.origin+`/areas/${county.slug}-county/`),county.slug==='niagara');
 assert.ok(sitemap.includes(config.origin+'/areas/erie-county/'));assert.ok(sitemap.includes(config.origin+'/areas/'));
 const held={...config,searchIndexing:false};assert.doesNotMatch(crawlFiles(held,render(held)).sitemap,/<loc>/);
});

test('all county and new-guide internal links and fragment targets resolve',()=>{
 const byPath=new Map(pages.map(p=>[p.path,p.html]));
 for(const {path,html} of pages.filter(p=>p.path.startsWith('/areas/')||ongoingGuides.some(g=>g.path===p.path))){
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1,path);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size,path+' duplicate ids');
  for(const [,href] of html.matchAll(/href="([^"\s]+)"/g)){
   if(!href.startsWith('/')&&!href.startsWith('#'))continue;
   const u=new URL(href,config.origin+path);if(u.pathname.startsWith('/assets/')||u.pathname==='/favicon.ico')continue;
   assert.ok(byPath.has(u.pathname),path+' -> '+href);
   if(u.hash)assert.ok(byPath.get(u.pathname).includes(`id="${u.hash.slice(1)}"`),path+' -> '+href);
  }
 }
});

test('supporting guide approvals gate every incoming link and retain distinct resources',async()=>{
 const routes=ongoingGuides.map(g=>g.path),hidden=render({...config,guideApprovals:config.guideApprovals.filter(a=>!routes.includes(a.path))});
 for(const route of routes){assert.ok(!hidden.some(p=>p.path===route));for(const page of hidden)assert.ok(!page.html.includes(`href="${route}"`),page.path+' -> '+route);}
 for(const guide of ongoingGuides){
  const page=pages.find(p=>p.path===guide.path);assert.ok(page);assert.ok(pages.find(p=>p.path==='/guides/').html.includes(`href="${guide.path}"`));
  const svg=await readFile(new URL(`../src/assets/guides/${guide.image}.svg`,import.meta.url),'utf8');assert.match(svg,/role="img" aria-labelledby="title desc"/);
  const png=await readFile(new URL(`../src/assets/guides/${guide.image}-social.png`,import.meta.url));assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
 }
 const maintenance=await readFile(new URL('../src/assets/guides/website-maintenance-log.csv',import.meta.url),'utf8');assert.match(maintenance,/"Result"/);assert.equal((maintenance.match(/"Untested"/g)||[]).length,5);assert.match(maintenance,/confirmation, inbox\/spam and reply/);
 const contractor=await readFile(new URL('../src/assets/guides/contractor-website-worksheet.csv',import.meta.url),'utf8');assert.match(contractor,/"Approved photos and facts"/);assert.match(contractor,/"Page and inquiry details needed"/);assert.match(contractor,/Example only:/);
});

test('county offer references and maintenance costs follow the commercial configuration',()=>{
 const changed=structuredClone(offers);changed.launch_site.public_price=1777;changed.focused_site.public_price=2777;changed.signature_site.public_price=4777;changed.audit_sprint.one_time_price=877;changed.plans.keep_running.monthly_price=177;
 for(const page of countyPages(changed)){
  for(const value of ['$1,777','$177'])assert.ok(page.body.includes(value),page.path+' '+value);
  assert.match(page.body,/href="\/pricing\/"/);
  if(page.path!=='/areas/')assert.ok(page.body.includes('$877'),page.path+' Sprint price');
 }
 assert.match(journalSections('/guides/website-maintenance-cost/',changed).map(s=>s.body).join(''),/\$177/);
});
