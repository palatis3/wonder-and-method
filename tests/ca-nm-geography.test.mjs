import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {caNmGeography,caNmAreaInventory} from '../src/ca-nm-geography.mjs';
import {serviceStates,countyDirectory,countySearchText} from '../src/service-area-directory.mjs';
import {parseCountyQuery,countyMatch} from '../src/assets/county-directory.js';
import {escapeHtml} from '../src/shared.mjs';
import expected from './fixtures/ca-nm-geography.json' with {type:'json'};
import config from '../config/site.json' with {type:'json'};
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const digest=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const entities=g=>[...g.municipalityDetails,...g.communities,...g.administrativeDistricts];
const states=serviceStates.filter(s=>['california','new-mexico'].includes(s.id));
const cards=states.flatMap(s=>s.counties.map(c=>({state:s.id,slug:c.slug,terms:countySearchText(c,s,s.regions.find(r=>r.slugs.includes(c.slug))).split('|')})));
const matches=q=>cards.filter(c=>countyMatch(c,parseCountyQuery(q)).score).map(c=>c.state+'/'+c.slug).sort();

test('California and New Mexico retain every reviewed county and typed membership',()=>{
 assert.equal(caNmAreaInventory.length,91);assert.equal(new Set(caNmAreaInventory.map(c=>c.fips)).size,91);
 assert.deepEqual(states.map(s=>[s.id,s.counties.length]),[['california',58],['new-mexico',33]]);
 const distinct=new Map();let memberships=0;
 for(const c of caNmAreaInventory){
  const g=caNmGeography[c.stateId][c.slug];assert.equal(digest(g),expected.countyDigests[c.stateId+'/'+c.slug],c.fips);
  assert.equal(c.name,g.name);assert.equal(c.areaType,'County');
  assert.equal(g.censusFunctionalStatus,c.slug==='san-francisco'?'C':'A');
  for(const p of entities(g)){assert.ok(p.countyFips.includes(c.fips));distinct.set(p.geoid,p);memberships++;}
 }
 assert.equal(distinct.size,2684);assert.equal(memberships,2702);
 const ccds=[...distinct.values()].filter(p=>p.type==='Census county division');assert.equal(ccds.length,534);
 for(const p of ccds){assert.equal(p.censusFunctionalStatus,'S');assert.match(p.governmentStatus,/statistical/i);}
 for(const name of ['California','New Mexico']){assert.ok(config.serviceCoverage.regions.includes(name));assert.ok(config.serviceCoverage.region.includes(name));}
});

test('statistical fallback and genuine zero county shares remain explicit',()=>{
 assert.deepEqual(expected.populationMissing,[]);
 for(const id of ['california/alpine','california/mariposa','california/trinity','new-mexico/los-alamos']){
  const [s,slug]=id.split('/'),g=caNmGeography[s][slug];assert.equal(g.municipalityDetails.length,0);
  assert.match(g.representativeSelection,/alphabetical.*not population-ranked/i);
  for(const p of g.representativePlaces){assert.equal(p.type,'Census-designated place');assert.equal(p.countyPartPopulation2025,null);}
 }
 const zero=expected.crossCountyPlaces.flatMap(p=>Object.entries(p.countyPartPopulation2025||{}).filter(([,pop])=>pop===0).map(([fips])=>({p,fips})));
 assert.equal(zero.length,2);
 for(const {p,fips} of zero){const c=caNmAreaInventory.find(c=>c.fips===fips);assert.ok(entities(caNmGeography[c.stateId][c.slug]).some(e=>e.geoid===p.geoid));}
});

test('CA and NM typed searches preserve all county and cross-county matches',()=>{
 for(const c of caNmAreaInventory)assert.deepEqual(matches(c.name+' county '+(c.stateId==='california'?'CA':'NM')),[c.stateId+'/'+c.slug]);
 for(const p of expected.crossCountyPlaces){
  const ids=p.countyFips.map(f=>caNmAreaInventory.find(c=>c.fips===f)).map(c=>c.stateId+'/'+c.slug).sort();
  assert.deepEqual(matches(p.name+' '+p.type+' '+(p.stateId==='california'?'CA':'NM')),ids,p.name);
 }
 assert.equal(matches('CA').length,58);assert.equal(matches('NM').length,33);
 assert.deepEqual(matches('dona ana county NM'),['new-mexico/dona-ana']);
});

test('CA and NM directories render every name and statistical headings with unique anchors',()=>{
 for(const state of states){
  const html=countyDirectory(state);assert.equal((html.match(/data-county-area/g)||[]).length,state.counties.length);
  for(const c of state.counties){const entry=html.slice(html.indexOf('id="'+c.slug+'"')).split('</details>')[0];for(const p of entities(state.geography[c.slug]))assert.ok(entry.includes(escapeHtml(p.name)),c.slug+'/'+p.name);}
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  assert.match(html,/Census county divisions \(statistical\)/);
 }
});
