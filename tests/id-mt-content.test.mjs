import {beforeReviewedUxCopyEdits,beforeReviewedUxFaqEdits} from './fixtures/reviewed-ux-copy-edits.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {locationServices} from '../src/location-service-index.mjs';
import faqs from '../src/service-faqs.json' with {type:'json'};
import approved from './fixtures/id-mt-approved-paths.json' with {type:'json'};
import preservation from './fixtures/id-mt-preservation.json' with {type:'json'};
import decisions from '../operations/id-mt-expansion-20261026/area-decisions.json' with {type:'json'};
import {renderPages} from '../src/pages.mjs';
import config from '../config/site.json' with {type:'json'};
import offers from '../config/offers.json' with {type:'json'};
import map from '../authority/v5/site-map.json' with {type:'json'};
import geography from '../authority/v5/geography.json' with {type:'json'};
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const byPath=new Map(locationServices.map(x=>[x.path,x]));
const pages=new Map(renderPages({config,offers,map,geography}).map(p=>[p.path,p.html]));

test('ID/MT preserve 2146 prior services and 278 FAQ pairs with exactly 69 services and no FAQs added',()=>{
 assert.equal(Object.keys(preservation.services).length,2146);assert.equal(Object.keys(preservation.newServices).length,69);
 assert.equal(locationServices.length,2266);assert.equal(approved.length,71);
 assert.deepEqual([...approved.slice(2)].sort(),Object.keys(preservation.newServices).sort());
 for(const group of [preservation.services,preservation.newServices])for(const [path,hash]of Object.entries(group))assert.equal(digest(beforeReviewedUxCopyEdits(byPath.get(path))),hash,path);
 assert.deepEqual(Object.keys(faqs).sort(),[...Object.keys(preservation.faqs),...Object.keys(preservation.newFaqs)].sort());
 for(const group of [preservation.faqs,preservation.newFaqs])for(const [path,hash]of Object.entries(group))assert.equal(digest(beforeReviewedUxFaqEdits(path,faqs[path])),hash,path);
 assert.equal(Object.keys(faqs).length,208);assert.equal(Object.values(faqs).flat().length,278);
});

test('all 100 areas retain directory destinations and 31 no-additions remain directory-only',()=>{
 assert.equal(pages.size,2424);assert.equal(decisions.areas.length,100);
 assert.equal(decisions.areas.filter(x=>x.serviceDecision==='NO_ADDITION').length,31);
 for(const entry of decisions.areas){
  const [route,id]=entry.directoryPath.split('#');assert(pages.get(route).includes(`id="${id}"`));
  if(entry.servicePath){assert(byPath.has(entry.servicePath));assert(pages.get(route).includes(`href="${entry.servicePath}"`));}
  else{assert.equal(entry.servicePath,null);assert(!locationServices.some(x=>x.areaIds.includes(entry.areaId)));}
 }
});

test('new briefs retain useful scope, resolvable guide links, FAQs and truthful provider schema',()=>{
 for(const path of approved.slice(2)){
  const entry=byPath.get(path),html=pages.get(path);assert(entry.scopes.length>=1);assert(entry.scopes.every(s=>s.request&&s.supplies&&s.check&&s.pages.length));
  for(const link of [...entry.directoryLinks,...entry.relatedGuides]){
   assert.equal(typeof link.path,'string');assert.equal(typeof link.label,'string');
   const [route,id]=link.path.split('#');assert(pages.has(route),link.path);if(id)assert(pages.get(route).includes(`id="${id}"`));assert(html.includes(`href="${link.path}"`));
  }
  assert.doesNotMatch(html,/href="undefined"|\[object Object\]/);assert.match(html,/online from Buffalo/);assert.match(html,/not studio projects, clients or endorsements/);
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(schema.filter(x=>x['@type']==='Service').length,1);assert(!schema.some(x=>x['@type']==='LocalBusiness'));
  assert.equal(schema.find(x=>x['@type']==='Organization').location.address.addressLocality,'Buffalo');
  assert(!schema.some(x=>x['@type']==='FAQPage'));assert.equal(faqs[path],undefined);
 }
});
