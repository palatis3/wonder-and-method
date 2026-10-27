import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {wyHiAkGeography,wyHiAkAreaInventory} from '../src/wy-hi-ak-geography.mjs';
import {serviceStates,countyDirectory,countySearchText} from '../src/service-area-directory.mjs';
import {parseCountyQuery,countyMatch,normalizeCountyQuery} from '../src/assets/county-directory.js';
import {serviceStateInfo,serviceRegionLabel} from '../src/assets/service-state-info.js';
import {escapeHtml} from '../src/shared.mjs';
import expected from './fixtures/wy-hi-ak-geography.json' with {type:'json'};
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const digest=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const entities=g=>[...g.municipalityDetails,...g.communities,...g.administrativeDistricts];
const states=serviceStates.filter(s=>['wyoming','hawaii','alaska'].includes(s.id));
const cards=serviceStates.flatMap(s=>s.counties.map(c=>({state:s.id,slug:c.slug,terms:countySearchText(c,s,s.regions.find(r=>r.slugs.includes(c.slug))).split('|')})));
const matches=q=>{const parsed=parseCountyQuery(q);return cards.filter(c=>countyMatch(c,parsed).score).map(c=>c.state+'/'+c.slug).sort();};

test('WY/HI/AK retain 58 reviewed identities, 875 entities and 876 memberships across all 50 states plus DC and PR',()=>{
 assert.equal(wyHiAkAreaInventory.length,58);assert.equal(new Set(wyHiAkAreaInventory.map(c=>c.fips)).size,58);
 assert.equal(serviceStateInfo.filter(s=>s.kind==='state').length,50);assert.equal(serviceStateInfo.length,52);
 assert.equal(serviceRegionLabel,'50 states, Washington, DC, and Puerto Rico');assert.equal(cards.length,3222);
 assert.deepEqual(states.map(s=>[s.id,s.counties.length]),[['wyoming',23],['hawaii',5],['alaska',30]]);
 let total=0,memberships=0;
 for(const state of states){const unique=new Set();let count=0;
  for(const c of wyHiAkAreaInventory.filter(c=>c.stateId===state.id)){
   const identity=expected.inventory.find(x=>x.fips===c.fips);
   assert.deepEqual(c,{stateId:identity.stateId,slug:identity.slug,name:identity.name,areaType:identity.areaType,fips:identity.fips,officialId:identity.fips});
   const g=wyHiAkGeography[state.id][c.slug];assert.equal(digest(g),expected.areaDigests[state.id+'/'+c.slug]);
   for(const p of entities(g)){assert(p.countyFips.includes(c.fips));unique.add(p.geoid);count++;}
  }
  assert.equal(unique.size,expected.counts[state.id].entities);assert.equal(count,expected.counts[state.id].memberships);total+=unique.size;memberships+=count;
 }
 assert.equal(total,875);assert.equal(memberships,876);
});

test('all 871 typed entity queries preserve county membership and government/statistical distinctions',()=>{
 const types={City:'city',Town:'town','City and Borough':'city and borough',Municipality:'municipality','Census-designated place':'cdp','Census county division':'ccd','Census subarea':'census subarea'},queries=new Map();
 for(const state of states)for(const c of state.counties){
  const id=state.id+'/'+c.slug;assert.deepEqual(matches(c.name+' '+c.areaType+' '+state.abbreviation),[id]);
  for(const p of entities(state.geography[c.slug])){
   assert(types[p.type],p.type);const q=normalizeCountyQuery(p.name)+' '+types[p.type]+' '+state.abbreviation;
   if(!queries.has(q))queries.set(q,new Set());queries.get(q).add(id);
  }
 }
 assert.equal(queries.size,871);for(const [q,ids]of queries)assert.deepEqual(matches(q),[...ids].sort(),q);
 for(const [q,ids]of [
  ['Kenai Peninsula borough AK',['alaska/kenai-peninsula']],['Kenai Peninsula county AK',[]],
  ['census area of Bethel AK',['alaska/bethel']],['Bethel city AK',['alaska/bethel']],['Bethel borough AK',[]],
  ['Anchorage municipality AK',['alaska/anchorage']],['Anchorage city AK',[]],['Anchorage census subarea AK',['alaska/anchorage']],
  ['Juneau city and borough AK',['alaska/juneau']],['Juneau city AK',[]],['Yakutat CDP AK',['alaska/yakutat']],['Yakutat city AK',[]],
  ['Haines borough AK',['alaska/haines']],['Haines CDP AK',['alaska/haines']],['Haines city AK',[]],
  ['Urban Honolulu CDP HI',['hawaii/honolulu']],['Urban Honolulu city HI',[]],['Honolulu county HI',['hawaii/honolulu']],
  ['Kalawao county HI',['hawaii/kalawao']],['Kalawao CCD HI',['hawaii/kalawao']],['Kalaupapa CDP HI',[]],
  ['Frannie town WY',['wyoming/big-horn','wyoming/park']],['Frannie city WY',[]],['Laramie city WY',['wyoming/albany']],['Laramie county WY',['wyoming/laramie']]
 ])assert.deepEqual(matches(q),ids,q);
 const bethel=cards.find(c=>c.state==='alaska'&&c.slug==='bethel');assert.equal(countyMatch(bethel,parseCountyQuery('Bethel census area AK')).type,'census area (statistical)');
});

test('new state tokens cannot consume existing literal place names in typed-prefix searches',()=>{
 for(const [q,id,state]of [['borough of valley hi','pennsylvania/fulton','PA'],['borough of west wyoming','pennsylvania/luzerne','PA'],['village of valley hi','ohio/logan','OH'],['cdp of so hi','arizona/mohave','AZ']]){
  assert.deepEqual(matches(q),[id]);assert.deepEqual(matches(q+' '+state),[id]);assert.equal(parseCountyQuery(q).state,'');assert.equal(parseCountyQuery(q+' Hawaii').state,'hawaii');assert.deepEqual(matches(q+' Hawaii'),[]);
 }
 for(const [q,state]of [['WY','wyoming'],['Hawaii','hawaii'],['AK','alaska']])assert.deepEqual(parseCountyQuery(q),{query:'',state,type:''});
});

test('Kalawao is retained without an invented city or CDP and population vintages stay separate',()=>{
 const k=wyHiAkGeography.hawaii.kalawao;
 assert.deepEqual(k.municipalityDetails,[]);assert.deepEqual(k.communities,[]);assert.deepEqual(k.representativePlaces,[]);
 assert.equal(k.administrativeDistricts.length,1);assert.equal(k.administrativeDistricts[0].type,'Census county division');
 assert.equal(states.find(s=>s.id==='hawaii').counties.find(c=>c.slug==='kalawao').anchor,'');
 assert.match(k.directoryNote,/one year after the passing/);assert.match(k.directoryNote,/conditional change is not applied to the January 2026 inventory/);
 for(const state of states)for(const c of state.counties){const g=state.geography[c.slug];
  const years=new Set(g.representativePlaces.map(p=>p.rankingPopulationYear));assert(years.size<=1);
  for(const p of g.representativePlaces){
   if(p.type==='Census-designated place'){assert.equal(p.rankingPopulationYear,2020);assert.equal(typeof p.wholePlacePopulation2020,'number');assert.match(p.populationLabel,/2020.*whole-place/);}
   else{assert.equal(p.rankingPopulationYear,2025);assert.equal(typeof p.countyPartPopulation2025,'number');assert.match(p.populationLabel,/2025.*county-part/);}
  }
 }
 for(const g of Object.values(wyHiAkGeography.hawaii))assert.equal(g.municipalityDetails.length,0);
 assert.equal(Object.values(wyHiAkGeography.alaska).filter(g=>g.areaType==='Census Area'&&g.censusFunctionalStatus==='S').length,11);
});

test('native directories retain every typed place, unique IDs and Alaska county-equivalent labels',()=>{
 for(const state of states){const html=countyDirectory(state);
  assert.equal((html.match(/data-county-area/g)||[]).length,state.counties.length);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  for(const c of state.counties){const entry=html.slice(html.indexOf('id="'+c.slug+'"')).split('</details>')[0];for(const p of entities(state.geography[c.slug]))assert(entry.includes(escapeHtml(p.name)),c.slug+'/'+p.name);}
  if(state.id==='alaska'){assert(!html.includes('County directory.'));assert(html.includes('Census subareas (statistical)'));assert(html.includes('not an organized borough government.'));}
  if(state.id==='hawaii')assert(!html.includes('<h3>Cities</h3>'));
 }
});
