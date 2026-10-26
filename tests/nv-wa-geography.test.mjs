import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nvWaGeography,nvWaAreaInventory} from '../src/nv-wa-geography.mjs';
import {serviceStates,countyDirectory,countySearchText,countyAreaName} from '../src/service-area-directory.mjs';
import {parseCountyQuery,countyMatch} from '../src/assets/county-directory.js';
import {escapeHtml} from '../src/shared.mjs';
import expected from './fixtures/nv-wa-geography.json' with {type:'json'};
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const digest=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const entities=g=>[...g.municipalityDetails,...g.communities,...g.administrativeDistricts];
const states=serviceStates.filter(s=>['nevada','washington'].includes(s.id));
const cards=states.flatMap(s=>s.counties.map(c=>({state:s.id,slug:c.slug,terms:countySearchText(c,s,s.regions.find(r=>r.slugs.includes(c.slug))).split('|')})));
const matches=q=>cards.filter(c=>countyMatch(c,parseCountyQuery(q)).score).map(c=>c.state+'/'+c.slug).sort();

test('Nevada and Washington preserve all reviewed geography and statistical memberships',()=>{
 assert.equal(nvWaAreaInventory.length,56);assert.equal(new Set(nvWaAreaInventory.map(c=>c.fips)).size,56);
 assert.deepEqual(states.map(s=>[s.id,s.counties.length]),[['nevada',17],['washington',39]]);
 const distinct=new Map();let memberships=0;
 for(const c of nvWaAreaInventory){
  const g=nvWaGeography[c.stateId][c.slug];assert.equal(digest(g),expected.countyDigests[c.stateId+'/'+c.slug],c.fips);
  assert.equal(c.name,g.name);assert.equal(g.censusFunctionalStatus,c.slug==='carson-city'?'F':'A');
  for(const p of entities(g)){assert.ok(p.countyFips.includes(c.fips));distinct.set(p.geoid,p);memberships++;}
 }
 assert.equal(distinct.size,1090);assert.equal(memberships,1099);
 const ccds=[...distinct.values()].filter(p=>p.type==='Census county division');assert.equal(ccds.length,313);
 for(const p of ccds){assert.equal(p.censusFunctionalStatus,'S');assert.match(p.governmentStatus,/statistical/i);}
});

test('Carson City remains an independent city and zero-population county parts remain included',()=>{
 assert.deepEqual(expected.populationMissing,[]);
 const carson=nvWaGeography.nevada['carson-city'];assert.equal(carson.areaType,'Independent city');assert.equal(countyAreaName(carson),'Carson City');
 assert.equal(carson.municipalityDetails[0].name,'Carson City');assert.equal(carson.municipalityDetails[0].type,'City');
 const zero=expected.crossCountyPlaces.flatMap(p=>Object.entries(p.countyPartPopulation2025||{}).filter(([,pop])=>pop===0).map(([fips])=>({p,fips})));
 assert.deepEqual(zero.map(({p,fips})=>p.name+'/'+fips).sort(),['Coulee Dam/53025','Enumclaw/53053']);
 for(const {p,fips}of zero){const c=nvWaAreaInventory.find(c=>c.fips===fips);assert.ok(entities(nvWaGeography[c.stateId][c.slug]).some(e=>e.geoid===p.geoid));}
});

test('NV and WA typed search retains all areas, all cross-county places and statistical distinctions',()=>{
 for(const c of nvWaAreaInventory)assert.deepEqual(matches(c.name+' '+(c.slug==='carson-city'?'independent city':'county')+' '+(c.stateId==='nevada'?'NV':'WA')),[c.stateId+'/'+c.slug]);
 assert.equal(expected.crossCountyPlaces.length,8);
 for(const p of expected.crossCountyPlaces){const ids=p.countyFips.map(f=>nvWaAreaInventory.find(c=>c.fips===f)).map(c=>c.stateId+'/'+c.slug).sort();assert.deepEqual(matches(p.name+' '+p.type+' WA'),ids,p.name);}
 assert.deepEqual(matches('Fallon Station CDP NV'),['nevada/churchill']);assert.deepEqual(matches('Fallon Station city NV'),[]);
 assert.equal(matches('NV').length,17);assert.equal(matches('WA').length,39);
});

test('NV and WA directories render every accepted place name and unique anchors',()=>{
 for(const state of states){
  const html=countyDirectory(state);assert.equal((html.match(/data-county-area/g)||[]).length,state.counties.length);
  for(const c of state.counties){const entry=html.slice(html.indexOf('id="'+c.slug+'"')).split('</details>')[0];for(const p of entities(state.geography[c.slug]))assert.ok(entry.includes(escapeHtml(p.name)),c.slug+'/'+p.name);}
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);assert.match(html,/Census county divisions \(statistical\)/);
  if(state.id==='nevada'){assert.ok(!/Carson City (?:County|City)/.test(html));assert.ok(html.includes('<summary>Carson City</summary>'));}
 }
});
