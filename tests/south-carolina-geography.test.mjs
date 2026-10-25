import {beforeReviewedLocationEdits} from './fixtures/reviewed-location-edits.mjs';
import semrushGuidePaths from './fixtures/semrush-guide-paths.json' with {type:'json'};
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {serviceStates,countySearchText} from '../src/service-area-directory.mjs';
import {parseCountyQuery,countyMatchScore} from '../src/assets/county-directory.js';
import {locationServices} from '../src/location-service-index.mjs';
import baseline from './fixtures/south-carolina-preservation.json' with {type:'json'};
import dates from '../config/page-dates.json' with {type:'json'};
import paths from './fixtures/south-carolina-approved-paths.json' with {type:'json'};
import linkCorrections from '../operations/ci-checks-20261023/source-link-corrections.json' with {type:'json'};
import {publicRouteRedirect} from '../deployment/public-route-canonical.mjs';
// Keep this historical release contract scoped to its original regions; later
// Georgia additions have their own independent geography/preservation checks.
const historicalStates=serviceStates.filter(state=>!['georgia','mississippi','alabama','wisconsin','illinois','louisiana','arkansas'].includes(state.id));
const identities=historicalStates.flatMap(s=>s.counties.map(c=>s.id+'/'+c.slug));
test('SC adds exactly 46 identities while retaining every historical identity and service record',()=>{
 assert.equal(identities.length,1125);assert.equal(new Set(identities).size,1125);
 assert.deepEqual(identities.filter(id=>!id.startsWith('south-carolina/')).sort(),baseline.identities);
 const existing=locationServices.filter(x=>!x.path.startsWith('/areas/south-carolina/')&&!['georgia','mississippi','alabama','wisconsin','illinois','louisiana','arkansas'].some(state=>x.path.startsWith('/areas/'+state+'/')));
 assert.deepEqual(existing.map(row=>row.path).sort(),baseline.recordPaths);
 assert.deepEqual(Object.keys(baseline.recordHashes).sort(),baseline.recordPaths);
 // Keep the historical baseline immutable. Replay only the separately reviewed
 // source-link corrections, checking both their exact new fields and old hash.
 for(const current of existing){
  const row=beforeReviewedLocationEdits(current);
  const correction=linkCorrections.records.find(record=>record.path===row.path),restored=structuredClone(row);
  if(correction){
   assert.equal(createHash('sha256').update(JSON.stringify(row)).digest('hex'),correction.afterSha256,row.path+' reviewed correction');
   assert.equal(correction.beforeSha256,baseline.recordHashes[row.path]);
   for(const edit of correction.edits){let target=restored;for(const key of edit.path.slice(0,-1))target=target[key];const key=edit.path.at(-1);assert.equal(target[key],edit.after);target[key]=edit.before;}
  }
  assert.equal(createHash('sha256').update(JSON.stringify(restored)).digest('hex'),baseline.recordHashes[row.path],row.path+' preserved outside reviewed corrections');
 }
 assert.equal(historicalStates.length,22);assert.equal(historicalStates.filter(s=>s.kind==='district').length,1);
 for(const route of semrushGuidePaths)assert.ok(Object.hasOwn(dates,route),'Approved subsequent guide '+route);
 const retiredRequests=['fieldwork','northline','hearthside'].map(id=>`/work/${id}/request/`);
 for(const path of retiredRequests){assert.ok(baseline.routes.includes(path));assert.ok(!Object.hasOwn(dates,path));assert.equal(publicRouteRedirect(new URL(path,'https://wonderandmethod.com'),'GET'),'https://wonderandmethod.com'+path.replace('request/',''));}
 assert.deepEqual([...Object.keys(dates).filter(p=>!['georgia','mississippi','alabama','wisconsin','illinois','louisiana','arkansas'].some(state=>p.startsWith('/areas/'+state+'/'))&&!paths.includes(p)&&!semrushGuidePaths.includes(p)),...retiredRequests].sort(),baseline.routes);
});
test('SC search indexes every county and distinguishes cross-county Summerville from a wrong state',()=>{
 const cards=serviceStates.flatMap(state=>state.counties.map(county=>({state:state.id,slug:county.slug,terms:countySearchText(county,state,state.regions.find(r=>r.slugs.includes(county.slug))).split('|')})));
 const matches=q=>cards.filter(c=>countyMatchScore(c,parseCountyQuery(q))).map(c=>c.state+'/'+c.slug).sort();
 assert.deepEqual(matches('Summerville town SC'),['south-carolina/berkeley','south-carolina/charleston','south-carolina/dorchester']);
 assert.deepEqual(matches('Charleston county SC'),['south-carolina/charleston']);
 assert.deepEqual(matches('Dorchester county FL'),[]);
 for(const c of serviceStates.find(s=>s.id==='south-carolina').counties)assert.ok(matches(c.name+' county SC').includes('south-carolina/'+c.slug));
});
