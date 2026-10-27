import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {escapeHtml} from '../src/shared.mjs';
import {mnOkGeography,mnOkAreaInventory} from '../src/mn-ok-geography.mjs';
import {serviceStates,countyDirectory,countySearchText} from '../src/service-area-directory.mjs';
import {parseCountyQuery,countyMatch,decodeCountyNames,unpackCountySearch} from '../src/assets/county-directory.js';
import expected from './fixtures/mn-ok-geography-digests.json' with {type:'json'};
import exceptions from './fixtures/mn-ok-population-exceptions.json' with {type:'json'};
import config from '../config/site.json' with {type:'json'};

// Fixtures are from an independent reconstruction of the retained Census sources.
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const entities=g=>[...g.municipalityDetails,...g.communities,...g.administrativeDistricts];
const states=serviceStates.filter(s=>['minnesota','oklahoma'].includes(s.id));
const cards=states.flatMap(s=>s.counties.map(c=>({state:s.id,slug:c.slug,terms:countySearchText(c,s,s.regions.find(r=>r.slugs.includes(c.slug))).split('|')})));
const matches=query=>cards.filter(c=>countyMatch(c,parseCountyQuery(query)).score).map(c=>c.state+'/'+c.slug).sort();

test('Minnesota and Oklahoma preserve every independently reconstructed county record',()=>{
 assert.equal(mnOkAreaInventory.length,164);assert.equal(new Set(mnOkAreaInventory.map(c=>c.fips)).size,164);
 assert.deepEqual(states.map(s=>[s.id,s.counties.length]),[['minnesota',87],['oklahoma',77]]);
 const distinct=new Map();let memberships=0;
 for(const c of mnOkAreaInventory){
  const g=mnOkGeography[c.stateId][c.slug];assert.equal(digest(g),expected[c.stateId+'/'+c.slug],c.fips);
  assert.equal(c.areaType,'County');assert.equal(c.name,g.name);
  for(const e of entities(g)){assert.ok(e.countyFips.includes(c.fips));distinct.set(e.geoid,e);memberships++;}
 }
 assert.equal(distinct.size,3925);assert.equal(memberships,4034);
 assert.equal([...distinct.values()].filter(e=>e.countyFips.length>1).length,101);
 for(const name of ['Minnesota','Oklahoma'])assert.ok(config.serviceCoverage.regions.includes(name));
});

test('legal townships and inactive towns remain distinct from statistical areas',()=>{
 const distinct=new Map(states.flatMap(s=>s.counties.flatMap(c=>entities(s.geography[c.slug]).map(e=>[e.geoid,e]))));
 const all=[...distinct.values()];
 assert.equal(all.filter(e=>e.type==='Township'&&e.censusFunctionalStatus==='N').length,23);
 assert.equal(all.filter(e=>e.type==='Town'&&e.censusFunctionalStatus==='I').length,8);
 assert.equal(all.filter(e=>e.type==='Unorganized territory').length,59);
 assert.equal(all.filter(e=>e.type==='Census county division').length,305);
 for(const e of all){
  assert.notEqual(e.censusFunctionalStatus,'F');
  if(e.censusFunctionalStatus==='N')assert.match(e.governmentStatus,/Nonfunctioning legal/);
  if(e.censusFunctionalStatus==='I')assert.match(e.governmentStatus,/Inactive/);
  if(['Census-designated place','Unorganized territory','Census county division'].includes(e.type))assert.equal(e.censusFunctionalStatus,'S');
 }
});

test('missing estimates and zero-population county parts retain their legal memberships',()=>{
 assert.equal(exceptions.missing.length,10);assert.equal(exceptions.zeroPopulationParts.length,20);
 for(const row of [...exceptions.missing,...exceptions.zeroPopulationParts]){
  const c=mnOkAreaInventory.find(c=>c.fips===row.countyFips),g=mnOkGeography[c.stateId][c.slug];
  assert.ok(g.municipalityDetails.some(e=>e.geoid===row.geoid),row.geoid);
 }
 for(const c of mnOkAreaInventory){
  const g=mnOkGeography[c.stateId][c.slug],missing=exceptions.missing.filter(e=>e.countyFips===c.fips).map(e=>e.geoid).sort();
  assert.equal(g.representativeRankingComplete,missing.length===0);assert.deepEqual(g.representativePopulationMissingGeoids.slice().sort(),missing);
  if(missing.length){assert.match(g.directoryNote,/ranking is incomplete/);assert.ok(g.representativePlaces.every(e=>!missing.includes(e.geoid)));}
 }
});

test('typed county and city searches retain the complete cross-county relationships',()=>{
 for(const c of mnOkAreaInventory)assert.deepEqual(matches(c.name+' county '+(c.stateId==='minnesota'?'MN':'OK')),[c.stateId+'/'+c.slug]);
 assert.deepEqual(matches('Oklahoma City city OK'),['oklahoma/canadian','oklahoma/cleveland','oklahoma/oklahoma','oklahoma/pottawatomie']);
 assert.deepEqual(matches('Tulsa city OK'),['oklahoma/osage','oklahoma/rogers','oklahoma/tulsa','oklahoma/wagoner']);
 assert.deepEqual(matches('Cannon Falls city MN'),['minnesota/dakota','minnesota/goodhue']);
 assert.deepEqual(matches('Northwest Aitkin unorganized territory MN'),['minnesota/aitkin']);
 assert.deepEqual(matches('Northwest Aitkin township MN'),[]);
 assert.equal(matches('MN').length,87);assert.equal(matches('OK').length,77);
});

test('both directories render every entity and preserve encoded search content',async()=>{
 for(const state of states){
  const html=countyDirectory(state);assert.equal((html.match(/data-county-area/g)||[]).length,state.counties.length);
  for(const c of state.counties){
   const entry=html.slice(html.indexOf('id="'+c.slug+'"')).split('</details>')[0];
   for(const e of entities(state.geography[c.slug]))assert.ok(entry.includes(escapeHtml(e.name)),c.slug+'/'+e.name);
  }
  if(state.id==='minnesota')assert.match(html,/Unorganized territories \(statistical\)/);
  assert.doesNotMatch(html,/Representative-place population ranking|ranked by population/);
  const alphabeticalGroups=[...html.matchAll(/<ul class="county-place-list">([\s\S]*?)<\/ul>/g)];assert.ok(alphabeticalGroups.length>0,'rendered place groups');
  for(const group of alphabeticalGroups){const names=[...group[1].matchAll(/<li>([^<]+)/g)].map(m=>m[1].trim());assert.ok(names.length>0,'nonempty place group');assert.deepEqual(names,names.toSorted((a,b)=>a.localeCompare(b,'en',{numeric:true})),'place groups are alphabetical, not population rankings');}
  const names=await decodeCountyNames(JSON.parse(html.match(/data-county-place-names>(.*?)<\/script>/s)[1]));
  const decoded=[...html.matchAll(/data-cs="([^"]+)"/g)].map(m=>unpackCountySearch(m[1],names));
  assert.deepEqual(decoded,state.regions.flatMap(r=>r.slugs.map(slug=>cards.find(c=>c.state===state.id&&c.slug===slug).terms)));
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 }
});
