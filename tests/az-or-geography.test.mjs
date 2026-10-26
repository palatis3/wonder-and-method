import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {azOrGeography,azOrAreaInventory} from '../src/az-or-geography.mjs';
import {serviceStates,countyDirectory,countySearchText} from '../src/service-area-directory.mjs';
import {parseCountyQuery,countyMatch} from '../src/assets/county-directory.js';
import {escapeHtml} from '../src/shared.mjs';
import expected from './fixtures/az-or-geography.json' with {type:'json'};
import config from '../config/site.json' with {type:'json'};
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const digest=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const entities=g=>[...g.municipalityDetails,...g.communities,...g.administrativeDistricts];
const states=serviceStates.filter(s=>['arizona','oregon'].includes(s.id));
const cards=states.flatMap(s=>s.counties.map(c=>({state:s.id,slug:c.slug,terms:countySearchText(c,s,s.regions.find(r=>r.slugs.includes(c.slug))).split('|')})));
const matches=q=>cards.filter(c=>countyMatch(c,parseCountyQuery(q)).score).map(c=>c.state+'/'+c.slug).sort();

test('Arizona and Oregon retain every independently reviewed county and typed membership',()=>{
 assert.equal(azOrAreaInventory.length,51);assert.equal(new Set(azOrAreaInventory.map(c=>c.fips)).size,51);
 assert.deepEqual(states.map(s=>[s.id,s.counties.length]),[['arizona',15],['oregon',36]]);
 const distinct=new Map();let memberships=0;
 for(const c of azOrAreaInventory){
  const g=azOrGeography[c.stateId][c.slug];assert.equal(digest(g),expected.countyDigests[c.stateId+'/'+c.slug],c.fips);
  assert.equal(c.name,g.name);assert.equal(c.areaType,'County');assert.equal(g.censusFunctionalStatus,'A');
  for(const p of entities(g)){assert.ok(p.countyFips.includes(c.fips));distinct.set(p.geoid,p);memberships++;}
 }
 assert.equal(distinct.size,1185);assert.equal(memberships,1218);
 const ccds=[...distinct.values()].filter(p=>p.type==='Census county division');assert.equal(ccds.length,292);
 for(const p of ccds){assert.equal(p.censusFunctionalStatus,'S');assert.match(p.governmentStatus,/statistical/i);}
 for(const name of ['Arizona','Oregon']){assert.ok(config.serviceCoverage.regions.includes(name));assert.ok(config.serviceCoverage.region.includes(name));}
});

test('new incorporation, inactive cross-county city and zero population shares remain truthful',()=>{
 assert.equal(expected.populationMissing.length,3);
 const pinal=azOrGeography.arizona.pinal,town=pinal.municipalityDetails.find(p=>p.geoid==='0464210');
 assert.equal(town.name,'San Tan Valley');assert.equal(town.type,'Town');assert.equal(town.censusFunctionalStatus,'A');
 assert.equal(pinal.representativeRankingComplete,false);assert.deepEqual(pinal.representativePopulationMissingGeoids,['0464210']);
 assert.ok(!pinal.representativePlaces.some(p=>p.geoid===town.geoid));assert.match(pinal.representativeSelection,/Incomplete ranking/);
 for(const slug of ['baker','grant']){
  const g=azOrGeography.oregon[slug],p=g.municipalityDetails.find(p=>p.geoid==='4131050');
  assert.equal(p.censusFunctionalStatus,'I');assert.equal(p.censusClassCode,'C9');assert.match(p.governmentStatus,/Inactive/);
  assert.ok(!g.representativePlaces.some(x=>x.geoid===p.geoid));
 }
 const zero=expected.crossCountyPlaces.flatMap(p=>Object.entries(p.countyPartPopulation2025||{}).filter(([,pop])=>pop===0).map(([fips])=>({p,fips})));
 assert.deepEqual(zero.map(({p,fips})=>p.name+'/'+fips).sort(),['Hayden/04021','Marana/04021','Milwaukie/41051','Peoria/04025']);
 for(const {p,fips} of zero){const c=azOrAreaInventory.find(c=>c.fips===fips);assert.ok(entities(azOrGeography[c.stateId][c.slug]).some(e=>e.geoid===p.geoid));}
});

test('AZ and OR typed searches preserve all county and cross-county matches',()=>{
 for(const c of azOrAreaInventory)assert.deepEqual(matches(c.name+' county '+(c.stateId==='arizona'?'AZ':'OR')),[c.stateId+'/'+c.slug]);
 assert.equal(expected.crossCountyPlaces.length,31);
 for(const p of expected.crossCountyPlaces){
  const ids=p.countyFips.map(f=>azOrAreaInventory.find(c=>c.fips===f)).map(c=>c.stateId+'/'+c.slug).sort();
  assert.deepEqual(matches(p.name+' '+p.type+' '+(p.stateId==='arizona'?'AZ':'OR')),ids,p.name);
 }
 assert.equal(matches('AZ').length,15);assert.equal(matches('OR').length,36);
 assert.deepEqual(matches('San Tan Valley town AZ'),['arizona/pinal']);assert.deepEqual(matches('San Tan Valley CDP AZ'),[]);
});

test('AZ and OR directories render every name and statistical heading with unique anchors',()=>{
 for(const state of states){
  const html=countyDirectory(state);assert.equal((html.match(/data-county-area/g)||[]).length,state.counties.length);
  for(const c of state.counties){const entry=html.slice(html.indexOf('id="'+c.slug+'"')).split('</details>')[0];for(const p of entities(state.geography[c.slug]))assert.ok(entry.includes(escapeHtml(p.name)),c.slug+'/'+p.name);}
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  assert.match(html,/Census county divisions \(statistical\)/);
 }
});
