import wyHiAkPaths from './fixtures/wy-hi-ak-approved-paths.json' with {type:'json'};
import idMtPaths from './fixtures/id-mt-approved-paths.json' with {type:'json'};
import coUtPrPaths from './fixtures/co-ut-pr-approved-paths.json' with {type:'json'};
import nvWaPaths from './fixtures/nv-wa-approved-paths.json' with {type:'json'};
import azOrPaths from './fixtures/az-or-approved-paths.json' with {type:'json'};
import caNmPaths from './fixtures/ca-nm-approved-paths.json' with {type:'json'};
import ksNePaths from './fixtures/ks-ne-approved-paths.json' with {type:'json'};
import ndSdPaths from './fixtures/nd-sd-approved-paths.json' with {type:'json'};
import mnOkPaths from './fixtures/mn-ok-approved-paths.json' with {type:'json'};
import {beforeReviewedLocationEdits} from './fixtures/reviewed-location-edits.mjs';
import excluded from './fixtures/search-excluded-public-paths.json' with {type:'json'};
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import preservation from './fixtures/ms-al-preservation.json' with {type:'json'};
import records from '../src/location-service-data.json' with {type:'json'};
import {msAlGeography,msAlAreaInventory} from '../src/ms-al-geography.mjs';
import {serviceStates,countyDirectory,countySearchText} from '../src/service-area-directory.mjs';
import {parseCountyQuery,countyMatchScore} from '../src/assets/county-directory.js';
import approvedPaths from './fixtures/ms-al-approved-paths.json' with {type:'json'};
import {renderPages} from '../src/pages.mjs';
import {crawlFiles} from '../src/seo.mjs';
import config from '../config/site.json' with {type:'json'};
import offers from '../config/offers.json' with {type:'json'};
import map from '../authority/v5/site-map.json' with {type:'json'};
import erieGeography from '../authority/v5/geography.json' with {type:'json'};
import dates from '../config/page-dates.json' with {type:'json'};

const mnOkStates=[...ksNePaths,...caNmPaths,...azOrPaths,...nvWaPaths,...coUtPrPaths,...idMtPaths,...wyHiAkPaths,...ndSdPaths,...mnOkPaths].filter(path=>/^\/areas\/[^/]+\/$/.test(path)).map(path=>path.split('/')[2]);

const states=['mississippi','alabama'];
const laterStates=['wisconsin','illinois','louisiana','arkansas','texas','missouri','iowa',...mnOkStates];
const isLater=path=>laterStates.some(state=>path.startsWith('/areas/'+state+'/'));
const isAddition=path=>states.some(state=>path.startsWith('/areas/'+state+'/'));

test('MS and AL preserve all 1088 earlier records and 1284 earlier area identities',()=>{
 const prior=records.filter(record=>!isAddition(record.path)&&!isLater(record.path));
 assert.equal(prior.length,1088);
 assert.deepEqual(prior.map(record=>record.path).sort(),preservation.recordPaths);
 assert.equal(createHash('sha256').update(JSON.stringify(prior.map(beforeReviewedLocationEdits))).digest('hex'),preservation.recordsArraySha256);
 assert.deepEqual(serviceStates.filter(region=>!states.includes(region.id)&&!laterStates.includes(region.id)).flatMap(region=>region.counties.map(county=>region.id+'/'+county.slug)).sort(),preservation.identities);
});

test('MS and AL add only two hubs and five reviewed commercial pages, preserving all earlier routes',()=>{
 const pages=renderPages({config,offers,map,geography:erieGeography});
 const routes=pages.map(page=>page.path).filter(path=>!isLater(path)).sort();
 assert.equal(preservation.renderedRoutes.length,1217);
 assert.equal(approvedPaths.length,7);
 assert.deepEqual(routes,['/work/assetrounds/',...preservation.renderedRoutes,...approvedPaths].sort());
 assert.deepEqual(Object.keys(dates).filter(path=>!isLater(path)).sort(),['/work/assetrounds/',...preservation.dateRoutes,...approvedPaths].sort());
 const indexed=[...crawlFiles(config,pages).sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>new URL(match[1]).pathname).filter(path=>!isLater(path)).sort();
 assert.deepEqual(indexed,routes.filter(path=>path!=='/404/'&&!excluded.includes(path)));
 assert.deepEqual(records.filter(record=>isAddition(record.path)).map(record=>record.path).sort(),approvedPaths.filter(path=>!states.some(state=>path==='/areas/'+state+'/')).sort());
});

test('MS and AL retain all 149 counties and 1022 distinct places with independently verified classifications',()=>{
 assert.equal(msAlAreaInventory.length,149);
 assert.equal(new Set(msAlAreaInventory.map(area=>area.fips)).size,149);
 for(const [stateId,count,municipalEntities,municipalMemberships,cdpEntities,cdpMemberships,types] of [
  ['mississippi',82,300,320,127,129,{'City':113,'Town':166,'Village':20,'Inactive incorporated town':1}],
  ['alabama',67,465,518,130,133,{'City':187,'Town':278}]
 ]){
  const geography=msAlGeography[stateId],entries=Object.values(geography);
  assert.equal(entries.length,count);
  assert.equal(serviceStates.find(state=>state.id===stateId).counties.length,count);
  const municipalities=entries.flatMap(area=>area.municipalityDetails),communities=entries.flatMap(area=>area.communities);
  assert.equal(municipalities.length,municipalMemberships);
  assert.equal(new Set(municipalities.map(place=>place.geoid)).size,municipalEntities);
  assert.equal(communities.length,cdpMemberships);
  assert.equal(new Set(communities.map(place=>place.geoid)).size,cdpEntities);
  assert.ok(communities.every(place=>place.type==='Census-designated place'));
  for(const [type,n] of Object.entries(types))assert.equal(new Set(municipalities.filter(place=>place.type===type).map(place=>place.geoid)).size,n,type);
  for(const area of msAlAreaInventory.filter(area=>area.stateId===stateId)){
   const entry=geography[area.slug];
   assert.ok(entry.representativePlaces.length>0&&entry.representativePlaces.length<=3,area.slug);
   assert.ok([...entry.municipalityDetails,...entry.communities].every(place=>place.countyFips.includes(area.fips)),area.slug);
  }
 }
 const inactive=msAlGeography.mississippi.yalobusha.municipalityDetails.find(place=>place.name==='Tillatoba');
 assert.equal(inactive.type,'Inactive incorporated town');
 assert.equal(inactive.censusFunctionalStatus,'I');
 const html=countyDirectory(serviceStates.find(state=>state.id==='mississippi'));
 assert.ok(html.includes('Inactive incorporated towns'));
});

test('MS and AL place searches preserve cross-county memberships and distinguish place types',()=>{
 const cards=serviceStates.flatMap(state=>state.counties.map(county=>({state:state.id,slug:county.slug,terms:countySearchText(county,state,state.regions.find(region=>region.slugs.includes(county.slug))).split('|')})));
 const matches=query=>cards.filter(card=>countyMatchScore(card,parseCountyQuery(query))).map(card=>card.state+'/'+card.slug).sort();
 for(const [query,expected] of [
  ['Jackson city MS',['mississippi/hinds','mississippi/madison','mississippi/rankin']],
  ['Hattiesburg city MS',['mississippi/forrest','mississippi/lamar']],
  ['Huntsville city AL',['alabama/limestone','alabama/madison','alabama/marshall','alabama/morgan']],
  ['Birmingham city AL',['alabama/jefferson','alabama/shelby']],
  ['Tillatoba MS',['mississippi/yalobusha']],
  ['Huntsville county AL',[]]
 ])assert.deepEqual(matches(query),expected,query);
 for(const [stateId,abbr,count] of [['mississippi','MS',82],['alabama','AL',67]]){
  assert.equal(matches(abbr).length,count);
  for(const county of serviceStates.find(state=>state.id===stateId).counties)assert.ok(matches(county.name+' county '+abbr).includes(stateId+'/'+county.slug));
 }
});
