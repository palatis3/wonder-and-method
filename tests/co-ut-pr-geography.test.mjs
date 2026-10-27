import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {coUtPrGeography,coUtPrAreaInventory} from '../src/co-ut-pr-geography.mjs';
import {serviceStates,countyDirectory,countySearchText,countyAreaName} from '../src/service-area-directory.mjs';
import {parseCountyQuery,countyMatch,normalizeCountyQuery} from '../src/assets/county-directory.js';
import {serviceStateInfo,serviceRegionLabel} from '../src/assets/service-state-info.js';
import {escapeHtml} from '../src/shared.mjs';
import expected from './fixtures/co-ut-pr-geography.json' with {type:'json'};
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const digest=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const entities=g=>[...g.municipalityDetails,...g.communities,...g.administrativeDistricts];
const states=serviceStates.filter(s=>['colorado','utah','puerto-rico'].includes(s.id));
const cards=states.flatMap(s=>s.counties.map(c=>({state:s.id,slug:c.slug,terms:countySearchText(c,s,s.regions.find(r=>r.slugs.includes(c.slug))).split('|')})));
const matches=q=>cards.filter(c=>countyMatch(c,parseCountyQuery(q)).score).map(c=>c.state+'/'+c.slug).sort();

test('CO/UT/PR retain every approved geographic object and distinguish states from territory',()=>{
 assert.equal(coUtPrAreaInventory.length,171);assert.equal(new Set(coUtPrAreaInventory.map(c=>c.fips)).size,171);
 assert.deepEqual(states.map(s=>[s.id,s.counties.length]),[['colorado',64],['utah',29],['puerto-rico',78]]);
 assert.equal(serviceStateInfo.filter(s=>s.kind==='state').length,47);assert.equal(serviceStateInfo.length,49);
 assert.equal(serviceRegionLabel,'47 states, Washington, DC, and Puerto Rico');
 for(const state of states){const distinct=new Map();let memberships=0;
  for(const c of coUtPrAreaInventory.filter(c=>c.stateId===state.id)){
   const g=coUtPrGeography[state.id][c.slug];assert.equal(digest(g),expected.areaDigests[state.id+'/'+c.slug]);
   for(const p of entities(g)){assert(p.countyFips.includes(c.fips));distinct.set(p.geoid,p);memberships++;}
  }
  assert.equal(distinct.size,expected.counts[state.id].entities);assert.equal(memberships,expected.counts[state.id].memberships);
 }
});

test('all legal and statistical typed-place queries preserve cross-area memberships',()=>{
 const types={'City':'city','Town':'town','Census-designated place':'cdp','Census county division':'ccd','Barrio':'barrio','Barrio-pueblo':'barrio pueblo','Subbarrio':'subbarrio'},queries=new Map();
 for(const state of states)for(const c of state.counties){
  const id=state.id+'/'+c.slug;
  assert.deepEqual(matches(c.name+' '+(state.id==='puerto-rico'?'municipio':'county')+' '+state.abbreviation),[id]);
  for(const p of entities(state.geography[c.slug]))for(const type of [types[p.type],...(p.censusPlaceSubtype?[p.censusPlaceSubtype.toLowerCase()]:[])]){
   assert(type,p.type);const q=normalizeCountyQuery(p.name)+' '+type+' '+state.abbreviation;
   if(!queries.has(q))queries.set(q,new Set());queries.get(q).add(id);
  }
 }
 assert.equal(queries.size,2513);for(const [q,ids]of queries)assert.deepEqual(matches(q),[...ids].sort(),q);
 assert.deepEqual(matches('Santurce barrio PR'),['puerto-rico/san-juan']);assert.deepEqual(matches('Santurce city PR'),[]);
 assert.deepEqual(matches('Miramar subbarrio PR'),['puerto-rico/arecibo','puerto-rico/san-juan']);assert.deepEqual(matches('Miramar barrio PR'),[]);
 assert.deepEqual(matches('Añasco county PR'),[]);assert.deepEqual(matches('Añasco municipio PR'),['puerto-rico/anasco']);
 assert.deepEqual(matches('City of Creede town CO'),['colorado/mineral']);assert.deepEqual(matches('City of Creede city CO'),[]);
});

test('regional HTML exposes every accepted place with unique anchors and correct PR headings',()=>{
 for(const state of states){
  const html=countyDirectory(state);assert.equal((html.match(/data-county-area/g)||[]).length,state.counties.length);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  for(const c of state.counties){const entry=html.slice(html.indexOf('id="'+c.slug+'"')).split('</details>')[0];for(const p of entities(state.geography[c.slug]))assert(entry.includes(escapeHtml(p.name)),c.slug+'/'+p.name);}
  if(state.id==='puerto-rico'){
   for(const heading of ['Barrios','Barrios-pueblo','Subbarrios','Zonas urbanas (Census-designated places)','Comunidades (Census-designated places)'])assert(html.includes('<h3>'+heading+'</h3>'));
   assert.doesNotMatch(html,/County directory\.|Añasco County/);
   for(const c of state.counties)assert.equal(countyAreaName(c),c.name+' Municipio');
  }
 }
});
