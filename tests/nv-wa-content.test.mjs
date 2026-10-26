import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {locationServices} from '../src/location-service-index.mjs';
import faqs from '../src/service-faqs.json' with {type:'json'};
import approved from './fixtures/nv-wa-approved-paths.json' with {type:'json'};
import preservation from './fixtures/nv-wa-preservation.json' with {type:'json'};
import decisions from '../operations/nv-wa-expansion-20261026/county-decisions.json' with {type:'json'};
import {renderPages} from '../src/pages.mjs';
import config from '../config/site.json' with {type:'json'};
import offers from '../config/offers.json' with {type:'json'};
import map from '../authority/v5/site-map.json' with {type:'json'};
import geography from '../authority/v5/geography.json' with {type:'json'};
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const byPath=new Map(locationServices.map(x=>[x.path,x]));
const pages=new Map(renderPages({config,offers,map,geography}).map(p=>[p.path,p.html]));

test('Nevada/Washington preserve all 1983 prior records and all FAQs with exactly 50 reviewed additions',()=>{
 assert.equal(Object.keys(preservation.services).length,1983);assert.equal(Object.keys(preservation.newServices).length,50);
 assert.equal(locationServices.length,2033);assert.equal(approved.length,52);
 assert.deepEqual([...approved.slice(2)].sort(),Object.keys(preservation.newServices).sort());
 for(const group of [preservation.services,preservation.newServices])for(const [path,hash]of Object.entries(group))assert.equal(digest(byPath.get(path)),hash,path);
 assert.deepEqual(Object.keys(faqs).sort(),Object.keys(preservation.faqs).sort());
 for(const [path,hash]of Object.entries(preservation.faqs))assert.equal(digest(faqs[path]),hash,path);
 assert.equal(Object.keys(faqs).length,205);assert.equal(Object.values(faqs).flat().length,275);
 assert.deepEqual(['nevada','washington'].map(state=>locationServices.filter(x=>x.areaId.startsWith(state+'/')).length),[14,36]);
});
test('all 56 areas retain directory destinations and the six no-addition decisions remain directory-only',()=>{
 assert.equal(pages.size,2183);assert.equal(decisions.counties.length,56);
 const noAdd=decisions.counties.filter(x=>x.serviceDecision==='NO_ADDITION');assert.equal(noAdd.length,6);
 assert.deepEqual(noAdd.map(x=>x.areaId).sort(),['nevada/eureka','nevada/lander','nevada/nye','washington/columbia','washington/cowlitz','washington/pierce']);
 for(const entry of decisions.counties){
  const [route,fragment]=entry.directoryPath.split('#');assert(pages.get(route).includes(`id="${fragment}"`),entry.areaId);
  if(entry.servicePath){assert(byPath.has(entry.servicePath));assert(pages.get(route).includes(`href="${entry.servicePath}"`));}
  else{assert.equal(entry.servicePath,null);assert(!locationServices.some(x=>x.areaIds.includes(entry.areaId)));}
 }
});
test('new briefs have actionable scopes, valid directory links and online-provider schema',()=>{
 for(const path of approved.slice(2)){
  const entry=byPath.get(path),html=pages.get(path);assert(html,path);
  assert(entry.scopes.length>=1,path);assert(entry.scopes.every(s=>s.request&&s.supplies&&s.check&&s.pages.length),path);
  for(const link of entry.directoryLinks){const [route,id]=link.path.split('#');assert(pages.get(route).includes(`id="${id}"`));assert(pages.get(route).includes(`href="${path}"`));}
  assert.match(html,/online from Buffalo/);assert.match(html,/not studio projects, clients or endorsements/);
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(schema.filter(x=>x['@type']==='Service').length,1);assert(!schema.some(x=>x['@type']==='LocalBusiness'));
  assert.equal(schema.find(x=>x['@type']==='Organization').location.address.addressLocality,'Buffalo');
 }
 const carson=byPath.get('/areas/nevada/carson-city/');assert(carson);assert.doesNotMatch(carson.title,/Carson City County|Carson City City/);
});
