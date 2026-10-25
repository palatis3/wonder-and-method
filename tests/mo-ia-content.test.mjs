import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {locationServices} from '../src/location-service-index.mjs';
import faqs from '../src/service-faqs.json' with {type:'json'};
import approved from './fixtures/mo-ia-approved-paths.json' with {type:'json'};
import preservation from './fixtures/mo-ia-preservation.json' with {type:'json'};
import {renderPages} from '../src/pages.mjs';
import config from '../config/site.json' with {type:'json'};
import offers from '../config/offers.json' with {type:'json'};
import map from '../authority/v5/site-map.json' with {type:'json'};
import geography from '../authority/v5/geography.json' with {type:'json'};
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const byPath=new Map(locationServices.map(x=>[x.path,x]));

test('Missouri/Iowa retain every prior service and FAQ and exactly the independently reviewed additions',()=>{
 assert.equal(Object.keys(preservation.services).length,1340);
 assert.equal(Object.keys(preservation.newServices).length,166);
 assert.equal(locationServices.length,1506);assert.equal(approved.length,168);
 assert.deepEqual(approved.slice(2).sort(),Object.keys(preservation.newServices).sort());
 for(const group of [preservation.services,preservation.newServices])for(const [path,hash]of Object.entries(group))assert.equal(digest(byPath.get(path)),hash,path);
 for(const group of [preservation.faqs,preservation.newFaqs])for(const [path,hash]of Object.entries(group))assert.equal(digest(faqs[path]),hash,path);
 assert.equal(Object.keys(faqs).length,Object.keys(preservation.faqs).length+6);
 assert.equal(Object.values(preservation.newFaqs).length,6);
 const counts=['missouri','iowa'].map(state=>locationServices.filter(x=>x.areaId.startsWith(state+'/')).length);
 assert.deepEqual(counts,[85,81]);
});

test('all 166 new briefs have discoverable directory links, concrete scopes and truthful provider schema',()=>{
 const pages=new Map(renderPages({config,offers,map,geography}).map(p=>[p.path,p.html]));
 assert.equal(pages.size,1644);
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
