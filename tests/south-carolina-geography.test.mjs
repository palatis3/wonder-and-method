import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {serviceStates,countySearchText} from '../src/service-area-directory.mjs';
import {parseCountyQuery,countyMatchScore} from '../src/assets/county-directory.js';
import {locationServices} from '../src/location-service-index.mjs';
import baseline from './fixtures/south-carolina-preservation.json' with {type:'json'};
import dates from '../config/page-dates.json' with {type:'json'};
import paths from './fixtures/south-carolina-approved-paths.json' with {type:'json'};
const identities=serviceStates.flatMap(s=>s.counties.map(c=>s.id+'/'+c.slug));
test('SC adds exactly 46 identities while retaining every historical identity and service record',()=>{
 assert.equal(identities.length,1125);assert.equal(new Set(identities).size,1125);
 assert.deepEqual(identities.filter(id=>!id.startsWith('south-carolina/')).sort(),baseline.identities);
 const existing=locationServices.filter(x=>!x.path.startsWith('/areas/south-carolina/'));
 assert.deepEqual(existing.map(row=>row.path).sort(),baseline.recordPaths);
 assert.deepEqual(Object.keys(baseline.recordHashes).sort(),baseline.recordPaths);
 for(const row of existing)assert.equal(createHash('sha256').update(JSON.stringify(row)).digest('hex'),baseline.recordHashes[row.path],row.path+' unchanged record');
 assert.equal(serviceStates.length,22);assert.equal(serviceStates.filter(s=>s.kind==='district').length,1);
 assert.deepEqual(Object.keys(dates).filter(p=>!paths.includes(p)).sort(),baseline.routes);
});
test('SC search indexes every county and distinguishes cross-county Summerville from a wrong state',()=>{
 const cards=serviceStates.flatMap(state=>state.counties.map(county=>({state:state.id,slug:county.slug,terms:countySearchText(county,state,state.regions.find(r=>r.slugs.includes(county.slug))).split('|')})));
 const matches=q=>cards.filter(c=>countyMatchScore(c,parseCountyQuery(q))).map(c=>c.state+'/'+c.slug).sort();
 assert.deepEqual(matches('Summerville town SC'),['south-carolina/berkeley','south-carolina/charleston','south-carolina/dorchester']);
 assert.deepEqual(matches('Charleston county SC'),['south-carolina/charleston']);
 assert.deepEqual(matches('Dorchester county FL'),[]);
 for(const c of serviceStates.find(s=>s.id==='south-carolina').counties)assert.ok(matches(c.name+' county SC').includes('south-carolina/'+c.slug));
});
