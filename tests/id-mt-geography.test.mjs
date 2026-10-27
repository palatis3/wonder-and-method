import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {idMtGeography,idMtAreaInventory} from '../src/id-mt-geography.mjs';
import {serviceStates,countyDirectory,countySearchText} from '../src/service-area-directory.mjs';
import {parseCountyQuery,countyMatch,normalizeCountyQuery} from '../src/assets/county-directory.js';
import {serviceStateInfo,serviceRegionLabel} from '../src/assets/service-state-info.js';
import {escapeHtml} from '../src/shared.mjs';
import expected from './fixtures/id-mt-geography.json' with {type:'json'};
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const digest=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const entities=g=>[...g.municipalityDetails,...g.communities,...g.administrativeDistricts];
const states=serviceStates.filter(s=>['idaho','montana'].includes(s.id));
const cards=states.flatMap(s=>s.counties.map(c=>({state:s.id,slug:c.slug,terms:countySearchText(c,s,s.regions.find(r=>r.slugs.includes(c.slug))).split('|')})));
const matches=q=>cards.filter(c=>countyMatch(c,parseCountyQuery(q)).score).map(c=>c.state+'/'+c.slug).sort();

test('ID/MT preserve all independently reviewed geographic objects and 100 county identities',()=>{
 assert.equal(idMtAreaInventory.length,100);assert.equal(new Set(idMtAreaInventory.map(c=>c.fips)).size,100);
 assert.deepEqual(states.map(s=>[s.id,s.counties.length]),[['idaho',44],['montana',56]]);
 assert.equal(serviceStateInfo.filter(s=>s.kind==='state').length,47);assert.equal(serviceStateInfo.length,49);
 assert.equal(serviceRegionLabel,'47 states, Washington, DC, and Puerto Rico');
 for(const state of states){const distinct=new Map();let memberships=0;
  for(const c of idMtAreaInventory.filter(c=>c.stateId===state.id)){
   const g=idMtGeography[state.id][c.slug];assert.equal(digest(g),expected.areaDigests[state.id+'/'+c.slug]);
   for(const p of entities(g)){assert(p.countyFips.includes(c.fips));distinct.set(p.geoid,p);memberships++;}
  }
  assert.equal(distinct.size,expected.counts[state.id].entities);assert.equal(memberships,expected.counts[state.id].memberships);
 }
});

test('legal and statistical place searches preserve membership and consolidated-city distinctions',()=>{
 const types={City:'city',Town:'town','Consolidated city-county':'consolidated city county','Consolidated city balance':'consolidated city balance','Census-designated place':'cdp','Census county division':'ccd'},queries=new Map();let memberships=0;
 for(const state of states)for(const c of state.counties){
  const id=state.id+'/'+c.slug;assert.deepEqual(matches(c.name+' county '+state.abbreviation),[id]);
  for(const p of entities(state.geography[c.slug])){
   memberships++;assert(types[p.type],p.type);const q=normalizeCountyQuery(p.name)+' '+types[p.type]+' '+state.abbreviation;
   if(!queries.has(q))queries.set(q,new Set());queries.get(q).add(id);
  }
 }
 assert.equal(memberships,1108);assert.equal(queries.size,1082);
 for(const [q,ids]of queries)assert.deepEqual(matches(q),[...ids].sort(),q);
 for(const [q,ids]of [
  ['consolidated city balance of Butte-Silver Bow MT',['montana/silver-bow']],
  ['consolidated city of Butte-Silver Bow MT',['montana/silver-bow']],
  ['Walkerville town MT',['montana/silver-bow']],['Walkerville city MT',[]],
  ['Butte-Silver Bow city MT',[]],['Butte-Silver Bow (balance) municipality MT',[]],
  ['Butte-Silver Bow (balance) cdp MT',[]],
  ['Anaconda-Deer Lodge county MT',['montana/deer-lodge']],['Deer Lodge city MT',['montana/powell']],
  ['Lost River city ID',['idaho/custer']],['Lost River town ID',[]]
 ])assert.deepEqual(matches(q),ids,q);
 const silver=cards.find(c=>c.state==='montana'&&c.slug==='silver-bow');
 assert.equal(countyMatch(silver,parseCountyQuery('Butte-Silver Bow (balance) MT')).type,'consolidated city balance (statistical)');
 assert.equal(countyMatch(silver,parseCountyQuery('Butte-Silver Bow MT')).type,'municipality');
});

test('native county entries retain every place and explain inactive and consolidated statistical identities',()=>{
 for(const state of states){
  const html=countyDirectory(state);assert.equal((html.match(/data-county-area/g)||[]).length,state.counties.length);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  for(const c of state.counties){const entry=html.slice(html.indexOf('id="'+c.slug+'"')).split('</details>')[0];for(const p of entities(state.geography[c.slug]))assert(entry.includes(escapeHtml(p.name)),c.slug+'/'+p.name);}
  if(state.id==='montana'){
   for(const heading of ['Consolidated city-county governments','Consolidated city balances (statistical)','Census-designated places','Census county divisions (statistical)'])assert(html.includes('<h3>'+heading+'</h3>'));
   assert(html.includes('not a separate municipal government.'));assert(html.includes('separately incorporated Walkerville'));
  }else assert(html.includes('Inactive legal incorporated place; not an active municipal government.'));
 }
});
