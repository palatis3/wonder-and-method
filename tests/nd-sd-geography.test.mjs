import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ndSdGeography,ndSdAreaInventory} from '../src/nd-sd-geography.mjs';
import {serviceStates,countyDirectory,countySearchText} from '../src/service-area-directory.mjs';
import {parseCountyQuery,countyMatch} from '../src/assets/county-directory.js';
import {escapeHtml} from '../src/shared.mjs';
import expected from './fixtures/nd-sd-geography.json' with {type:'json'};
import config from '../config/site.json' with {type:'json'};
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const digest=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const entities=g=>[...g.municipalityDetails,...g.communities,...g.administrativeDistricts];
const states=serviceStates.filter(s=>['north-dakota','south-dakota'].includes(s.id));
const cards=states.flatMap(s=>s.counties.map(c=>({state:s.id,slug:c.slug,terms:countySearchText(c,s,s.regions.find(r=>r.slugs.includes(c.slug))).split('|')})));
const matches=q=>cards.filter(c=>countyMatch(c,parseCountyQuery(q)).score).map(c=>c.state+'/'+c.slug).sort();

test('Dakota directories retain all reviewed county, place and subdivision memberships',()=>{
 assert.equal(ndSdAreaInventory.length,119);assert.equal(new Set(ndSdAreaInventory.map(c=>c.fips)).size,119);
 assert.deepEqual(states.map(s=>[s.id,s.counties.length]),[['north-dakota',53],['south-dakota',66]]);
 const distinct=new Map();let memberships=0;
 for(const c of ndSdAreaInventory){
  const g=ndSdGeography[c.stateId][c.slug];assert.equal(digest(g),expected.countyDigests[c.stateId+'/'+c.slug],c.fips);
  assert.equal(c.name,g.name);assert.equal(c.areaType,'County');assert.equal(g.censusFunctionalStatus,'A');
  for(const p of entities(g)){assert.ok(p.countyFips.includes(c.fips));distinct.set(p.geoid,p);memberships++;}
 }
 assert.equal(distinct.size,3297);assert.equal(memberships,3316);
 assert.equal([...distinct.values()].filter(p=>p.type==='Township'&&p.censusFunctionalStatus==='I').length,5);
 assert.equal([...distinct.values()].filter(p=>p.type==='Unorganized territory').length,198);
 for(const p of distinct.values()){
  assert.notEqual(p.censusFunctionalStatus,'F');
  if(p.censusFunctionalStatus==='I')assert.match(p.governmentStatus,/Inactive/);
  if(p.type==='Unorganized territory'){assert.equal(p.censusFunctionalStatus,'S');assert.match(p.governmentStatus,/statistical/i);}
 }
 for(const name of ['North Dakota','South Dakota']){assert.ok(config.serviceCoverage.regions.includes(name));assert.ok(config.serviceCoverage.region.includes(name));}
});

test('zero population county parts and Buffalo statistical communities remain explicit',()=>{
 assert.deepEqual(expected.populationMissing,[]);
 const buffalo=ndSdGeography['south-dakota'].buffalo;
 assert.equal(buffalo.municipalityDetails.length,0);
 assert.deepEqual(buffalo.representativePlaces.map(p=>[p.name,p.type]),[['Fort Thompson','Census-designated place'],['Gann Valley','Census-designated place']]);
 assert.match(buffalo.representativeSelection,/alphabetical order, not population-ranked/);
 for(const p of buffalo.representativePlaces)assert.equal(p.population,undefined);
 const zero=expected.crossCountyPlaces.flatMap(p=>Object.entries(p.countyPartPopulation2025||{}).filter(([,pop])=>pop===0).map(([fips])=>({p,fips})));
 assert.equal(zero.length,3);
 for(const {p,fips} of zero){const c=ndSdAreaInventory.find(c=>c.fips===fips);assert.ok(entities(ndSdGeography[c.stateId][c.slug]).some(e=>e.geoid===p.geoid));}
});

test('typed Dakota queries preserve counties and all cross-county place matches',()=>{
 for(const c of ndSdAreaInventory)assert.deepEqual(matches(c.name+' county '+(c.stateId==='north-dakota'?'ND':'SD')),[c.stateId+'/'+c.slug]);
 for(const p of expected.crossCountyPlaces){
  const ids=p.countyFips.map(f=>ndSdAreaInventory.find(c=>c.fips===f)).map(c=>c.stateId+'/'+c.slug).sort();
  assert.deepEqual(matches(p.name+' '+p.type+' '+(p.stateId==='north-dakota'?'ND':'SD')),ids,p.name);
 }
 assert.deepEqual(matches('Grandin city ND'),['north-dakota/cass','north-dakota/traill']);
 assert.equal(matches('ND').length,53);assert.equal(matches('SD').length,66);
});

test('Dakota directories render every name with unique anchors and status qualifications',()=>{
 for(const state of states){
  const html=countyDirectory(state);assert.equal((html.match(/data-county-area/g)||[]).length,state.counties.length);
  for(const c of state.counties){const entry=html.slice(html.indexOf('id="'+c.slug+'"')).split('</details>')[0];for(const p of entities(state.geography[c.slug]))assert.ok(entry.includes(escapeHtml(p.name)),c.slug+'/'+p.name);}
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  assert.match(html,/Inactive/);assert.match(html,/Unorganized territories \(statistical\)/);
 }
});
