import approvedLocationPaths from './fixtures/current-location-paths.mjs';
import {retiredCountyRoutes} from '../deployment/retired-county-routes.mjs';
import {countyLocalNotes} from '../src/county-local-notes.mjs';
import {escapeHtml} from '../src/shared.mjs';
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

test('retired New York county routes resolve to reviewed place entries within the state hierarchy',()=>{
 assert.deepEqual(countyProfiles.slice(0,research.order.length).map(c=>c.name),research.order);
 assert.equal(countyProfiles.length,61);
 const hub=pages.find(p=>p.path==='/areas/'),state=pages.find(p=>p.path==='/areas/new-york/');assert.ok(hub);assert.ok(state);
 const schema=JSON.parse(state.html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
 assert.deepEqual(schema.find(x=>x['@type']==='BreadcrumbList').itemListElement.map(x=>x.item),['/','/areas/','/areas/new-york/'].map(path=>config.origin+path));
 const organization=schema.find(x=>x['@type']==='Organization');assert.equal(organization.location.address.addressLocality,'Buffalo');assert.equal(organization.location.address.addressRegion,'NY');
 assert.ok(!schema.some(x=>x['@type']==='LocalBusiness'));
 assert.match(state.html,/Buffalo/);assert.match(state.html,/online/);assert.match(state.html,/Place types and official sources/);
 assert.ok(state.html.includes('name="robots" content="index,follow"'));assert.ok(state.html.includes('href="/areas/"'));
 for(const county of countyProfiles){
  const retired=`/areas/${county.slug}-county/`,destination=state.path+'#'+county.slug;
  if(approvedLocationPaths.includes(retired))assert.ok(pages.some(page=>page.path===retired),retired);else {assert.equal(retiredCountyRoutes[retired],destination);assert.ok(!pages.some(page=>page.path===retired),retired);}
  const original=research.counties.find(c=>c.county===county.name);
  if(original)assert.deepEqual(countyGeography[county.slug].municipalities,original.municipalities);
  assert.ok(state.html.includes(`id="${county.slug}"`),destination);
  for(const sentence of factualLocalSentences(countyLocalNotes['new-york/'+county.slug]||county.geographyNote))assert.ok(state.html.includes(escapeHtml(sentence)),county.slug+' '+sentence);
  assert.ok(hub.html.includes(`href="${approvedLocationPaths.includes(retired)?retired:destination}"`));
 }
 const publicConfig={...config,searchIndexing:true},sitemap=crawlFiles(publicConfig,render(publicConfig)).sitemap;
 for(const county of countyProfiles){const path=`/areas/${county.slug}-county/`;assert.equal(sitemap.includes(`<loc>${config.origin+path}</loc>`),approvedLocationPaths.includes(path),path);}
 for(const route of ['/areas/new-york/','/areas/erie-county/','/areas/'])assert.ok(sitemap.includes(`<loc>${config.origin+route}</loc>`));
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
 const maintenance=await readFile(new URL('../src/assets/guides/website-maintenance-log.csv',import.meta.url),'utf8');assert.match(maintenance,/Status: Not checked \/ Works \/ Needs fixing \/ Need access/);assert.equal((maintenance.match(/"Not checked"/g)||[]).length,6);assert.match(maintenance,/The test reaches the right person and a reply arrives/);
 const contractor=await readFile(new URL('../src/assets/guides/contractor-website-worksheet.csv',import.meta.url),'utf8');assert.match(contractor,/"Approved photos and facts"/);assert.match(contractor,/"Page and inquiry details needed"/);assert.match(contractor,/Example only:/);
});

test('county offer references and maintenance costs follow the commercial configuration',()=>{
 const changed=structuredClone(offers);changed.launch_site.public_price=1777;changed.focused_site.public_price=2777;changed.signature_site.public_price=4777;changed.audit_sprint.one_time_price=877;changed.plans.keep_running.monthly_price=177;
 for(const page of countyPages(changed)){
  for(const value of ['$1,777','$177'])assert.ok(page.body.includes(value),page.path+' '+value);
  assert.match(page.body,/href="\/pricing\/"/);
  if(/-county\/$/.test(page.path))assert.ok(page.body.includes('$877'),page.path+' Sprint price');
 }
 assert.match(journalSections('/guides/website-maintenance-cost/',changed).map(s=>s.body).join(''),/\$177/);
});

// Address reminders are editorial guidance; every declarative local distinction remains required.
const factualLocalSentences=note=>(note||'').split(/(?<=\.)\s+/).filter(sentence=>! /^(?:Use |Confirm |Keep |A city named in service coverage )/.test(sentence));
