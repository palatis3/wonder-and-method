import {beforeReviewedUxCopyEdits,beforeReviewedUxFaqEdits} from './fixtures/reviewed-ux-copy-edits.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {locationServices} from '../src/location-service-index.mjs';
import faqs from '../src/service-faqs.json' with {type:'json'};
import {beforeReviewedHumanQualityFaqCollection} from './fixtures/reviewed-human-quality-edits.mjs';
const historicalFaqs=beforeReviewedHumanQualityFaqCollection(faqs);
import approved from './fixtures/wy-hi-ak-approved-paths.json' with {type:'json'};
import preservation from './fixtures/wy-hi-ak-preservation.json' with {type:'json'};
import decisions from './fixtures/wy-hi-ak-decisions.json' with {type:'json'};
import releaseDecisions from '../operations/wy-hi-ak-expansion-20261026/area-decisions.json' with {type:'json'};
import {renderPages} from '../src/pages.mjs';
import {crawlFiles} from '../src/seo.mjs';
import config from '../config/site.json' with {type:'json'};
import offers from '../config/offers.json' with {type:'json'};
import map from '../authority/v5/site-map.json' with {type:'json'};
import geography from '../authority/v5/geography.json' with {type:'json'};
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const byPath=new Map(locationServices.map(x=>[x.path,x]));
const rendered=renderPages({config,offers,map,geography});const pages=new Map(rendered.map(p=>[p.path,p.html]));

test('WY/HI/AK preserve all 2215 prior services and 278 FAQ pairs while adding exactly 51 approved services',()=>{
 assert.equal(Object.keys(preservation.services).length,2215);assert.equal(Object.keys(preservation.newServices).length,51);
 assert.equal(locationServices.length,2266);assert.equal(approved.length,54);
 assert.deepEqual(approved.slice(3).sort(),Object.keys(preservation.newServices).sort());
 assert.deepEqual([...byPath.keys()].sort(),[...Object.keys(preservation.services),...Object.keys(preservation.newServices)].sort());
 for(const group of [preservation.services,preservation.newServices])for(const [p,h]of Object.entries(group))assert.equal(digest(beforeReviewedUxCopyEdits(byPath.get(p))),h,p);
 assert.deepEqual(Object.keys(historicalFaqs).sort(),Object.keys(preservation.faqs).sort());
 for(const [p,h]of Object.entries(preservation.faqs))assert.equal(digest(beforeReviewedUxFaqEdits(p,faqs[p])),h,p);
 assert.equal(Object.keys(historicalFaqs).length,208);assert.equal(Object.values(historicalFaqs).flat().length,278);
 assert.equal(pages.size,2424);assert.equal((crawlFiles(config,rendered).sitemap.match(/<loc>/g)||[]).length,2412);
 assert.equal([...pages.keys()].filter(p=>/^\/guides\/[^/]+\/$/.test(p)).length,65);
});

test('all 58 county equivalents retain native destinations and seven no-addition areas stay directory-only',()=>{
 assert.equal(decisions.areas.length,58);assert.equal(decisions.areas.filter(x=>!x.servicePath).length,7);
 assert.equal(releaseDecisions.areas.length,58);assert.equal(releaseDecisions.faqPairs,0);assert.equal(releaseDecisions.guides,0);
 assert.deepEqual(['wyoming','hawaii','alaska'].map(s=>decisions.areas.filter(x=>x.stateId===s&&x.servicePath).length),[19,4,28]);
 for(const c of decisions.areas){
  const released=releaseDecisions.areas.find(x=>x.areaId===c.areaId);assert(released,c.areaId);for(const key of ['fips','areaType','directoryPath','servicePath'])assert.equal(released[key],c[key],c.areaId+'/'+key);
  const [route,id]=c.directoryPath.split('#');assert(pages.get(route).includes(`id="${id}"`));
  if(c.servicePath){
   const suffix=c.areaType.toLowerCase().replaceAll(' ','-');assert.equal(c.servicePath,`/areas/${c.stateId}/${c.slug}-${suffix}/`);
   const service=byPath.get(c.servicePath);assert(service);assert(service.areaIds.includes(c.areaId));assert(pages.get(route).includes(`href="${c.servicePath}"`));
  }else assert(!locationServices.some(x=>x.areaIds.includes(c.areaId)),c.areaId);
 }
 assert.equal(decisions.areas.find(x=>x.areaId==='hawaii/kalawao').servicePath,null);
});

test('new briefs preserve complete scopes, valid sources and links without inventing local providers or FAQs',()=>{
 for(const path of approved.slice(3)){
  const entry=byPath.get(path),html=pages.get(path);assert(entry.scopes.length>=1);assert(entry.scopes.every(s=>s.request&&s.supplies&&s.check&&s.pages.length));
  for(const link of [...entry.directoryLinks,...entry.relatedGuides]){
   assert.equal(typeof link.path,'string');assert.equal(typeof link.label,'string');const [route,id]=link.path.split('#');assert(pages.has(route),link.path);if(id)assert(pages.get(route).includes(`id="${id}"`));assert(html.includes(`href="${link.path}"`));
  }
  assert.doesNotMatch(html,/href="undefined"|\[object Object\]/);assert.match(html,/online from Buffalo/);assert.match(html,/not studio projects, clients or endorsements/);
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);assert.equal(schema.filter(x=>x['@type']==='Service').length,1);
  assert(!schema.some(x=>x['@type']==='LocalBusiness'));assert.equal(schema.find(x=>x['@type']==='Organization').location.address.addressLocality,'Buffalo');assert(!schema.some(x=>x['@type']==='FAQPage'));assert.equal(faqs[path],undefined);
 }
});

