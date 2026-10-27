import {beforeReviewedUxFaqEdits} from './fixtures/reviewed-ux-copy-edits.mjs';
import {beforeReviewedCaNmCopyEdits} from './fixtures/reviewed-ca-nm-copy-edits.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {locationServices} from '../src/location-service-index.mjs';
import faqs from '../src/service-faqs.json' with {type:'json'};
import {beforeReviewedHumanQualityFaqCollection} from './fixtures/reviewed-human-quality-edits.mjs';
const historicalFaqs=beforeReviewedHumanQualityFaqCollection(faqs);
import approved from './fixtures/ca-nm-approved-paths.json' with {type:'json'};
import preservation from './fixtures/ca-nm-preservation.json' with {type:'json'};
import decisions from '../operations/ca-nm-expansion-20261026/county-decisions.json' with {type:'json'};
import {renderPages} from '../src/pages.mjs';
import config from '../config/site.json' with {type:'json'};
import offers from '../config/offers.json' with {type:'json'};
import map from '../authority/v5/site-map.json' with {type:'json'};
import geography from '../authority/v5/geography.json' with {type:'json'};
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const byPath=new Map(locationServices.map(x=>[x.path,x]));

test('California/New Mexico preserve all 1853 prior service records and FAQs with exactly 82 reviewed additions',()=>{
 assert.equal(Object.keys(preservation.services).length,1853);
 assert.equal(Object.keys(preservation.newServices).length,82);
 assert.equal(locationServices.length,2266);assert.equal(approved.length,84);
 assert.deepEqual(approved.slice(2).sort(),Object.keys(preservation.newServices).sort());
 for(const group of [preservation.services,preservation.newServices])for(const [path,hash]of Object.entries(group))assert.equal(digest(beforeReviewedCaNmCopyEdits(byPath.get(path))),hash,path);
 for(const group of [preservation.faqs,preservation.newFaqs])for(const [path,hash]of Object.entries(group))assert.equal(digest(beforeReviewedUxFaqEdits(path,faqs[path])),hash,path);
 assert.equal(Object.keys(historicalFaqs).length,208);
 assert.equal(Object.keys(preservation.newFaqs).length,5);
 assert.equal(Object.keys(preservation.newFaqs).reduce((n,path)=>n+historicalFaqs[path].length,0),5);
 assert.deepEqual(['california','new-mexico'].map(state=>locationServices.filter(x=>x.areaId.startsWith(state+'/')).length),[54, 28]);
});

test('all 91 assessed counties remain browseable while the 9 no-addition entries do not acquire service pages',()=>{
 const pages=new Map(renderPages({config,offers,map,geography}).map(p=>[p.path,p.html]));
 assert.equal(pages.size,2424);assert.equal(decisions.counties.length,91);
 const noAdd=decisions.counties.filter(x=>x.serviceDecision==='NO_ADDITION');assert.equal(noAdd.length,9);
 for(const entry of decisions.counties){
  const [route,fragment]=entry.directoryPath.split('#');assert(pages.get(route).includes(`id="${fragment}"`),entry.areaId);
  if(entry.servicePath){assert(byPath.has(entry.servicePath));assert(pages.get(route).includes(`href="${entry.servicePath}"`));}
  else{assert.equal(entry.servicePath,null);assert(!pages.has(`/areas/${entry.areaId}-county/`));}
 }
});

test('every new brief has useful scope fields, valid directory links and truthful online-provider schema',()=>{
 const pages=new Map(renderPages({config,offers,map,geography}).map(p=>[p.path,p.html]));
 for(const path of approved.slice(2)){
  const entry=byPath.get(path),html=pages.get(path);assert(html,path);
  assert(entry.scopes.length>=1,path);assert(entry.scopes.every(s=>s.request&&s.supplies&&s.check&&s.pages.length),path);
  for(const link of entry.directoryLinks){const [route,id]=link.path.split('#');assert(pages.get(route).includes(`id="${id}"`));assert(pages.get(route).includes(`href="${path}"`));}
  assert.match(html,/online from Buffalo/);assert.match(html,/not studio projects, clients or endorsements/);
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(schema.filter(x=>x['@type']==='Service').length,1);assert(!schema.some(x=>x['@type']==='LocalBusiness'));
  assert.equal(schema.find(x=>x['@type']==='Organization').location.address.addressLocality,'Buffalo');
 }
});

