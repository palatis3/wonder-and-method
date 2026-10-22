import {retiredCountyRoutes} from '../deployment/retired-county-routes.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {searchMetadata} from '../src/search-content.mjs';
import {organizationSchema,serviceAreas} from '../src/schema.mjs';
import {renderPages} from '../src/pages.mjs';
import {crawlFiles} from '../src/seo.mjs';

const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const [config,offers,map,geography]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json'].map(read));
const description=(path,o=offers)=>typeof searchMetadata[path].description==='function'?searchMetadata[path].description(o,config):searchMetadata[path].description;
const pages=renderPages({config,offers,map,geography});
const page=path=>pages.find(item=>item.path===path);
const schema=path=>JSON.parse(page(path).html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);

test('home, Buffalo web design and service navigation describe distinct visitor needs',()=>{
 const paths=['/','/services/web-design/','/services/'];
 assert.equal(new Set(paths.map(path=>searchMetadata[path].title)).size,3);
 assert.match(searchMetadata['/'].title,/Small Businesses/);assert.match(description('/'),/Buffalo.*19 states.*DC/);
 assert.match(searchMetadata['/services/web-design/'].title,/Small Business Web Design/);assert.match(description('/services/web-design/'),/writing, research, SEO and original graphics/);
 assert.match(description('/services/'),/^Compare .*Find the right service/);
 for(const path of paths){assert.equal(page(path).title,searchMetadata[path].title);assert.equal(page(path).description,description(path));}
});

test('search descriptions stay concise and derive prices and page allowances from current offers',()=>{
 for(const path of Object.keys(searchMetadata)){const text=description(path);assert.ok(text.length<=160,path+': '+text.length);assert.doesNotMatch(text,/without (?:promising|inventing)|scoped SEO|Label demonstrations/i,path);}
 const revised=structuredClone(offers);revised.launch_site.public_price=1625;revised.launch_site.marketing_page_cap=7;revised.focused_site.marketing_page_cap=16;revised.signature_site.marketing_page_cap=31;revised.plans.improve.monthly_price=425;revised.plans.grow.monthly_price=850;
 assert.match(description('/',revised),/from \$1,625/);assert.match(description('/services/web-design/',revised),/from \$1,625\./);assert.match(description('/services/web-design/',revised),/7-, 16- or 31-page/);
 assert.match(description('/services/seo/',revised),/Improve \$425\/month; Grow \$850\/month/);assert.match(description('/areas/erie-county/',revised),/from \$1,625/);
});

test('Erie metadata stays specific while same-named counties in Pennsylvania and Ohio resolve to separate state entries',()=>{
 assert.match(page('/areas/erie-county/').title,/Buffalo & Erie County, NY/);assert.match(page('/areas/erie-county/').description,/Buffalo and Erie County, NY/);
 const erie=schema('/areas/erie-county/').find(node=>node['@type']==='Service');
 assert.deepEqual(erie.areaServed,{'@type':'AdministrativeArea',name:'Erie County, New York'});
 assert.match(erie.name,/Buffalo & Erie County, NY/);
 for(const [state,name] of [['pennsylvania','Pennsylvania'],['ohio','Ohio']]){
  const route=`/areas/${state}/`,retired=route+'erie-county/';
  assert.equal(retiredCountyRoutes[retired],route+'#erie');assert.ok(!page(retired));
  assert.ok(page(route).html.includes('id="erie"'));assert.ok(page(route).title.includes(name));
  assert.ok(page(route).html.includes(`rel="canonical" href="${config.origin+route}"`));
 }
});

test('broad service coverage has 19 states and a federal district and preserves the studio identity',()=>{
 const states=['New York','Pennsylvania','Ohio','New Jersey','Connecticut','Rhode Island','Massachusetts','Delaware','Vermont','New Hampshire','Maine','Maryland','Virginia','West Virginia','Michigan','Washington, DC','Indiana','Kentucky','Tennessee','North Carolina'].map(name=>({'@type':name==='Washington, DC'?'AdministrativeArea':'State',name}));
 assert.deepEqual(serviceAreas(),states);assert.deepEqual(serviceAreas(config),states);
 const org=organizationSchema(config,'/assets/brand/emblem.svg');assert.deepEqual(org.areaServed,states);assert.equal(org.location.address.addressLocality,'Buffalo');assert.equal(org.location.address.addressRegion,'NY');assert.equal(org.legalName,config.businessIdentity);assert.equal(org.founder['@id'],config.origin+'/about/#terry');
 for(const item of pages){const graph=JSON.parse(item.html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);assert.deepEqual(graph.find(node=>node['@type']==='Organization').areaServed,states,item.path);}
 for(const path of ['/services/web-design/','/services/website-redesign/','/services/seo/','/services/website-care/','/services/website-audit/','/services/contractor-websites/','/services/website-addons/'])assert.deepEqual(schema(path).find(node=>node['@type']==='Service').areaServed,states,path);
 assert.deepEqual(serviceAreas({...config,serviceCoverage:{...config.serviceCoverage,regions:['Ohio']}}),[{'@type':'State',name:'Ohio'}]);
});

test('metadata and sitemap cover 91 public pages while retired county URLs resolve to their state entries',()=>{
 const sitemap=crawlFiles(config,pages).sitemap;
 assert.equal(pages.length,91);assert.equal((sitemap.match(/<loc>/g)||[]).length,90);
 assert.equal(pages.filter(item=>/^\/guides\/[^/]+\/$/.test(item.path)).length,27);
 assert.deepEqual(pages.filter(item=>/^\/areas\/(?:[a-z-]+\/)?[^/]+-(?:county|planning-region)\/$/.test(item.path)||item.path==='/areas/maryland/baltimore-city/').map(item=>item.path),['/areas/erie-county/']);
 assert.equal(pages.filter(item=>item.path.startsWith('/areas/')).length,22);
 for(const [retired,destination] of Object.entries(retiredCountyRoutes)){
  assert.ok(!page(retired));assert.ok(!sitemap.includes(`<loc>${config.origin+retired}</loc>`));
  const [hub,slug]=destination.split('#');assert.ok(page(hub).html.includes(`id="${slug}"`));
  assert.ok(sitemap.includes(`<loc>${config.origin+hub}</loc>`));
 }
 assert.equal(new Set(pages.map(item=>item.path)).size,91);
});

test('public descriptions stay within the editorial budget without removing county context',()=>{
 for(const item of pages.filter(item=>item.path!=='/404/'))assert.ok(item.description.length<=160,item.path+': '+item.description.length);
 for(const path of ['/guides/one-page-website-seo/','/guides/website-handover-checklist/'])assert.equal(schema(path).find(node=>node['@type']==='Article').description,page(path).description,path);
 const timeline=page('/guides/website-redesign-timeline/');assert.equal(timeline.title,'Website redesign timeline and common delays');assert.equal(schema(timeline.path).find(node=>node['@type']==='Article').headline,timeline.title);assert.match(timeline.html,/<h1>Website redesign timeline and common delays<\/h1>/);
});

test('Work ItemList points to seven existing pages while the visible video and studio section remain',()=>{
 const collection=schema('/work/').find(node=>node['@type']==='CollectionPage'),items=collection.mainEntity.itemListElement;
 assert.equal(items.length,7);
 for(const [index,item]of items.entries()){
  const url=new URL(item.url);assert.equal(url.origin,config.origin);assert.equal(url.hash,'');assert.equal(url.search,'');assert.ok(page(url.pathname),item.url);assert.equal(item.position,index+1);
 }
 assert.match(page('/work/').html,/id="website-decisions"/);assert.match(page('/work/').html,/\/assets\/waterfront\/film-landscape\.mp4/);
});
