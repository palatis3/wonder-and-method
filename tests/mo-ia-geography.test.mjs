import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {escapeHtml} from '../src/shared.mjs';
import {moIaGeography,moIaAreaInventory} from '../src/mo-ia-geography.mjs';
import {serviceStates,countyDirectory,countySearchText,countyAreaName} from '../src/service-area-directory.mjs';
import {parseCountyQuery,countyMatch,decodeCountyNames,unpackCountySearch} from '../src/assets/county-directory.js';
import expected from './fixtures/mo-ia-geography-digests.json' with {type:'json'};
import exceptions from './fixtures/mo-ia-population-exceptions.json' with {type:'json'};
import config from '../config/site.json' with {type:'json'};

// Expected digests come from a second reconstruction of the raw Census tables,
// full GRFC memberships and direct county-part estimates, not the public module.
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const fields=['name','type','geoid','censusName','censusLSAD','censusFunctionalStatus','censusNationalStandardCode','censusClassCode','countyFips','geographyKind'];
const entities=g=>[...g.municipalityDetails,...g.communities,...g.administrativeDistricts];
const states=serviceStates.filter(s=>['missouri','iowa'].includes(s.id));
const cards=states.flatMap(s=>s.counties.map(c=>({state:s.id,slug:c.slug,terms:countySearchText(c,s,s.regions.find(r=>r.slugs.includes(c.slug))).split('|')})));
const matches=query=>cards.filter(c=>countyMatch(c,parseCountyQuery(query)).score).map(c=>c.state+'/'+c.slug).sort();

test('Missouri and Iowa preserve every independently reconstructed identity, entity and representative',()=>{
 assert.equal(moIaAreaInventory.length,214);assert.equal(new Set(moIaAreaInventory.map(c=>c.fips)).size,214);
 assert.deepEqual(states.map(s=>[s.id,s.counties.length]),[['missouri',115],['iowa',99]]);
 const distinct=new Map();let memberships=0,representatives=0;
 for(const c of moIaAreaInventory){
  const g=moIaGeography[c.stateId][c.slug],fixed=expected.find(e=>e.areaId===c.stateId+'/'+c.slug);
  assert.ok(fixed,c.fips);assert.equal(digest(c),fixed.identityDigest,c.fips+' identity');
  const rows=entities(g).map(e=>Object.fromEntries(fields.map(k=>[k,e[k]]))).sort((a,b)=>a.geoid.localeCompare(b.geoid));
  assert.equal(digest(rows),fixed.entityDigest,c.fips+' entities');assert.equal(digest(g.representativePlaces),fixed.representativeDigest,c.fips+' representatives');
  assert.equal(g.representativeRankingComplete,fixed.rankingComplete);
  assert.deepEqual(g.representativePopulationMissingGeoids.slice().sort(),fixed.missingPopulationGeoids);
  for(const e of entities(g)){assert.ok(e.countyFips.includes(c.fips));distinct.set(e.geoid,e);memberships++;}
  assert.ok(g.representativePlaces.length>0&&g.representativePlaces.length<=3);representatives+=g.representativePlaces.length;
 }
 assert.equal(distinct.size,5101);assert.equal(memberships,5247);assert.equal(representatives,636);
 assert.equal([...distinct.values()].filter(e=>e.countyFips.length>1).length,135);
 assert.ok(config.serviceCoverage.regions.includes('Missouri'));assert.ok(config.serviceCoverage.regions.includes('Iowa'));
});

test('St. Louis city remains independent from St. Louis County and fictitious subdivisions are absent',()=>{
 const city=moIaAreaInventory.find(c=>c.fips==='29510'),county=moIaAreaInventory.find(c=>c.fips==='29189');
 assert.equal(city.slug,'st-louis-city');assert.equal(city.areaType,'Independent City');assert.equal(countyAreaName(city),'St. Louis City');
 assert.equal(county.slug,'st-louis');assert.equal(countyAreaName(county),'St. Louis County');
 assert.equal(moIaGeography.missouri['st-louis-city'].administrativeDistricts.length,0);
 assert.ok(moIaGeography.missouri['st-louis-city'].municipalityDetails.some(e=>e.geoid==='2965000'&&e.censusFunctionalStatus==='A'));
 assert.ok(!entities(moIaGeography.missouri['st-louis']).some(e=>e.geoid==='2965000'));
 for(const state of Object.values(moIaGeography))for(const g of Object.values(state)){
  assert.ok(!g.administrativeDistricts.some(e=>e.censusFunctionalStatus==='F'));
  assert.ok(g.communities.every(e=>e.type==='Census-designated place'&&e.censusFunctionalStatus==='S'));
  assert.ok(g.municipalityDetails.every(e=>['City','Town','Village'].includes(e.type)));
 }
});

test('township government status and statistical territory remain distinct',()=>{
 const meanings={A:/primary general-purpose/,B:/partially consolidated/,G:/subordinate/,I:/Inactive/,N:/Nonfunctioning legal/,S:/Statistical/};
 const counts={};
 for(const state of Object.values(moIaGeography))for(const g of Object.values(state))for(const e of g.administrativeDistricts){
  assert.match(e.governmentStatus,meanings[e.censusFunctionalStatus],e.geoid);counts[e.censusFunctionalStatus]=(counts[e.censusFunctionalStatus]||0)+1;
 }
 assert.deepEqual(counts,{N:1096,A:282,B:1,I:16,G:1598,S:1});
 const territory=moIaGeography.iowa.polk.administrativeDistricts.find(e=>e.geoid==='1915393762');
 assert.equal(territory.type,'Unorganized territory');assert.equal(territory.censusFunctionalStatus,'S');
 for(const query of ['Saylorville Reservoir unorganized territory IA','Unorganized territory of Saylorville Reservoir IA','Unorganized territory Saylorville Reservoir IA']){
  assert.deepEqual(matches(query),['iowa/polk'],query);
  assert.equal(countyMatch(cards.find(c=>c.state==='iowa'&&c.slug==='polk'),parseCountyQuery(query)).type,'unorganized territory (statistical)');
 }
 for(const type of ['township','city','CCD'])assert.deepEqual(matches(`Saylorville Reservoir ${type} IA`),[]);
});

test('unavailable estimates remain incomplete and all zero-population county parts survive',()=>{
 assert.equal(exceptions.missing.length,11);assert.equal(exceptions.zero.length,31);
 for(const row of [...exceptions.missing,...exceptions.zero]){
  const c=moIaAreaInventory.find(c=>c.fips===row.countyFips),g=moIaGeography[c.stateId][c.slug];
  assert.ok(g.municipalityDetails.some(e=>e.geoid===row.geoid),row.geoid);
 }
 for(const c of moIaAreaInventory){
  const g=moIaGeography[c.stateId][c.slug],missing=exceptions.missing.filter(e=>e.countyFips===c.fips).map(e=>e.geoid).sort();
  assert.equal(g.representativeRankingComplete,missing.length===0);assert.deepEqual(g.representativePopulationMissingGeoids.slice().sort(),missing);
  if(missing.length){assert.match(g.directoryNote,/ranking is incomplete/);assert.match(g.representativeSelection,/Incomplete ranking/);assert.ok(g.representativePlaces.every(e=>!missing.includes(e.geoid)));}
 }
});

test('typed queries preserve county identity and complete cross-county city membership',()=>{
 for(const c of moIaAreaInventory){const query=c.name+(c.areaType==='Independent City'?' independent city':' county')+' '+(c.stateId==='iowa'?'IA':'MO');assert.deepEqual(matches(query),[c.stateId+'/'+c.slug],query);}
 for(const [query,ids] of [
  ['St. Louis city MO',['missouri/st-louis-city']],['St. Louis county MO',['missouri/st-louis']],
  ['Kansas City city MO',['missouri/cass','missouri/clay','missouri/jackson','missouri/platte']],
  ['Des Moines city IA',['iowa/polk','iowa/warren']],['West Des Moines city IA',['iowa/dallas','iowa/madison','iowa/polk','iowa/warren']]
 ])assert.deepEqual(matches(query),ids,query);
 assert.equal(matches('MO').length,115);assert.equal(matches('IA').length,99);
});

test('both directories render all reviewed entities and preserve packed search semantics',async()=>{
 for(const state of states){
  const html=countyDirectory(state);assert.equal((html.match(/data-county-area/g)||[]).length,state.counties.length);
  for(const c of state.counties){
   const entry=html.slice(html.indexOf('id="'+c.slug+'"')).split('</details>')[0];
   for(const e of entities(state.geography[c.slug]))assert.ok(entry.includes(escapeHtml(e.name)),c.slug+'/'+e.name);
  }
  if(state.id==='iowa'){assert.match(html,/Unorganized territories \(statistical\)/);assert.match(html,/Statistical entity; not a township government/);}
  if(state.id==='missouri'){assert.match(html,/Independent city; separate from surrounding counties/);assert.doesNotMatch(html,/Representative-place population ranking|ranked by population/);
  const alphabeticalGroups=[...html.matchAll(/<ul class="county-place-list">([\s\S]*?)<\/ul>/g)];assert.ok(alphabeticalGroups.length>0,'rendered place groups');
  for(const group of alphabeticalGroups){const names=[...group[1].matchAll(/<li>([^<]+)/g)].map(m=>m[1].trim());assert.ok(names.length>0,'nonempty place group');assert.deepEqual(names,names.toSorted((a,b)=>a.localeCompare(b,'en',{numeric:true})),'place groups are alphabetical, not population rankings');}}
  const names=await decodeCountyNames(JSON.parse(html.match(/data-county-place-names>(.*?)<\/script>/s)[1]));
  const decoded=[...html.matchAll(/data-cs="([^"]+)"/g)].map(m=>unpackCountySearch(m[1],names));
  assert.deepEqual(decoded,state.regions.flatMap(r=>r.slugs.map(slug=>cards.find(c=>c.state===state.id&&c.slug===slug).terms)));
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 }
});
