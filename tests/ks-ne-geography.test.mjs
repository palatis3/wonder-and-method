import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ksNeGeography,ksNeAreaInventory} from '../src/ks-ne-geography.mjs';
import {serviceStates,countyDirectory,countySearchText} from '../src/service-area-directory.mjs';
import {parseCountyQuery,countyMatch} from '../src/assets/county-directory.js';
import {escapeHtml} from '../src/shared.mjs';
import expected from './fixtures/ks-ne-geography.json' with {type:'json'};
import config from '../config/site.json' with {type:'json'};

const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const entities=g=>[...g.municipalityDetails,...g.communities,...g.administrativeDistricts];
const states=serviceStates.filter(s=>['kansas','nebraska'].includes(s.id));
const cards=states.flatMap(s=>s.counties.map(c=>({state:s.id,slug:c.slug,terms:countySearchText(c,s,s.regions.find(r=>r.slugs.includes(c.slug))).split('|')})));
const matches=q=>cards.filter(c=>countyMatch(c,parseCountyQuery(q)).score).map(c=>c.state+'/'+c.slug).sort();

test('Kansas and Nebraska retain every independently reviewed county and legal-place membership',()=>{
 assert.equal(ksNeAreaInventory.length,198);
 assert.equal(new Set(ksNeAreaInventory.map(c=>c.fips)).size,198);
 assert.deepEqual(states.map(s=>[s.id,s.counties.length]),[['kansas',105],['nebraska',93]]);
 const distinct=new Map();let memberships=0;
 for(const c of ksNeAreaInventory){
  const g=ksNeGeography[c.stateId][c.slug];assert.equal(digest(g),expected.countyDigests[c.stateId+'/'+c.slug],c.fips);
  assert.equal(c.name,g.name);assert.equal(c.areaType,'County');
  for(const e of entities(g)){assert.ok(e.countyFips.includes(c.fips));distinct.set(e.geoid,e);memberships++;}
 }
 assert.equal(distinct.size,3830);assert.equal(memberships,3865);
 for(const name of ['Kansas','Nebraska'])assert.ok(config.serviceCoverage.regions.includes(name));
 for(const e of distinct.values()){
  assert.notEqual(e.censusFunctionalStatus,'F');
  if(e.censusFunctionalStatus==='I')assert.match(e.governmentStatus,/Inactive/);
  if(e.censusFunctionalStatus==='N')assert.match(e.governmentStatus,/Nonfunctioning|no functioning separate city government/);
  if(['Election precinct','District'].includes(e.type))assert.equal(e.censusFunctionalStatus,'N');
 }
 assert.equal([...distinct.values()].filter(e=>e.type==='Election precinct').length,680);
 assert.equal([...distinct.values()].filter(e=>e.type==='District').length,15);
 assert.equal([...distinct.values()].filter(e=>e.type==='Township'&&e.censusFunctionalStatus==='I').length,226);
 assert.equal(ksNeGeography.kansas.greeley.censusFunctionalStatus,'C');
 assert.equal(ksNeGeography.kansas.wyandotte.censusFunctionalStatus,'C');
 assert.equal(distinct.get('2024550').censusFunctionalStatus,'I');
 assert.equal(distinct.get('2071450').censusFunctionalStatus,'N');
 assert.ok(!distinct.has('2028412'));
});

test('missing estimates, CDP fallbacks and zero-population county parts remain explicit',()=>{
 assert.deepEqual(expected.populationMissing.map(r=>[r.geoid,r.countyFips]),[['2024550','20159']]);
 const rice=ksNeGeography.kansas.rice;
 assert.equal(rice.representativeRankingComplete,false);
 assert.deepEqual(rice.representativePopulationMissingGeoids,['2024550']);
 assert.ok(rice.municipalityDetails.some(e=>e.geoid==='2024550'));
 assert.match(rice.directoryNote,/ranking is incomplete/);
 for(const [slug,name] of [['banner','Harrisburg'],['mcpherson','Tryon']]){
  const g=ksNeGeography.nebraska[slug];assert.equal(g.municipalityDetails.length,0);
  assert.deepEqual(g.representativePlaces.map(p=>[p.name,p.type]),[[name,'Census-designated place']]);
 }
 const zero=expected.crossCountyPlaces.flatMap(p=>Object.entries(p.countyPartPopulation2025).filter(([,pop])=>pop===0).map(([fips])=>({p,fips})));
 assert.equal(zero.length,9);
 for(const {p,fips} of zero){const county=ksNeAreaInventory.find(c=>c.fips===fips);assert.ok(entities(ksNeGeography[county.stateId][county.slug]).some(e=>e.geoid===p.geoid));}
});

test('typed queries preserve all county and cross-county city matches',()=>{
 for(const c of ksNeAreaInventory)assert.deepEqual(matches(c.name+' county '+(c.stateId==='kansas'?'KS':'NE')),[c.stateId+'/'+c.slug]);
 for(const p of expected.crossCountyPlaces){
  const ids=p.countyFips.map(f=>ksNeAreaInventory.find(c=>c.fips===f)).map(c=>c.stateId+'/'+c.slug).sort();
  assert.deepEqual(matches(p.name+' '+p.type+' '+(p.stateId==='kansas'?'KS':'NE')),ids,p.name);
 }
 assert.deepEqual(matches('Bonner Springs city KS'),['kansas/johnson','kansas/leavenworth','kansas/wyandotte']);
 assert.deepEqual(matches('Oakley city KS'),['kansas/gove','kansas/logan','kansas/thomas']);
 assert.equal(matches('KS').length,105);assert.equal(matches('NE').length,93);
});

test('state directories display every entity with unique anchors and source qualifications',()=>{
 for(const state of states){
  const html=countyDirectory(state);
  assert.equal((html.match(/data-county-area/g)||[]).length,state.counties.length);
  for(const c of state.counties){
   const entry=html.slice(html.indexOf('id="'+c.slug+'"')).split('</details>')[0];
   for(const e of entities(state.geography[c.slug]))assert.ok(entry.includes(escapeHtml(e.name)),c.slug+'/'+e.name);
  }
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  assert.match(html,/Inactive/);
  if(state.id==='nebraska')assert.match(html,/Election precincts/);
 }
});
