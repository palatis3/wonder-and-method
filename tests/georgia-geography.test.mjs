import {beforeReviewedLocationEdits} from './fixtures/reviewed-location-edits.mjs';
import excluded from './fixtures/search-excluded-public-paths.json' with {type:'json'};
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import preservation from './fixtures/georgia-preservation.json' with {type:'json'};
import records from '../src/location-service-data.json' with {type:'json'};
import {georgiaGeography,georgiaAreaInventory} from '../src/georgia-geography.mjs';
import {serviceStates,countyDirectory,countyLabel,countySearchText} from '../src/service-area-directory.mjs';
import {parseCountyQuery,countyMatchScore} from '../src/assets/county-directory.js';
import approvedPaths from './fixtures/georgia-approved-paths.json' with {type:'json'};
import {renderPages} from '../src/pages.mjs';
import {crawlFiles} from '../src/seo.mjs';
import config from '../config/site.json' with {type:'json'};
import offers from '../config/offers.json' with {type:'json'};
import map from '../authority/v5/site-map.json' with {type:'json'};
import erieGeography from '../authority/v5/geography.json' with {type:'json'};
import dates from '../config/page-dates.json' with {type:'json'};

const geography=georgiaGeography.georgia;
const state=serviceStates.find(item=>item.id==='georgia');
const municipalities=Object.values(geography).flatMap(area=>area.municipalityDetails);
const communities=Object.values(geography).flatMap(area=>area.communities);

test('Georgia preserves all 1,082 existing service records and 1,125 existing area identities',()=>{
 const prior=records.filter(record=>!['georgia','mississippi','alabama','wisconsin','illinois','louisiana','arkansas'].some(state=>record.path.startsWith('/areas/'+state+'/')));
 assert.deepEqual(prior.map(record=>record.path).sort(),preservation.recordPaths);
 assert.equal(createHash('sha256').update(JSON.stringify(prior.map(beforeReviewedLocationEdits))).digest('hex'),preservation.recordsArraySha256);
 assert.deepEqual(serviceStates.filter(region=>!['georgia','mississippi','alabama','wisconsin','illinois','louisiana','arkansas'].includes(region.id)).flatMap(region=>region.counties.map(county=>region.id+'/'+county.slug)).sort(),preservation.identities);
});

test('Georgia adds only the seven approved routes, retaining every existing route and sitemap entry',()=>{
 const pages=renderPages({config,offers,map,geography:erieGeography});
 const routes=pages.map(page=>page.path).filter(path=>!/^\/areas\/(mississippi|alabama|wisconsin|illinois|louisiana|arkansas)\//.test(path)).sort();
 assert.equal(preservation.renderedRoutes.length,1210);
 assert.equal(approvedPaths.length,7);
 assert.deepEqual(routes,[...preservation.renderedRoutes,...approvedPaths].sort());
 assert.deepEqual(Object.keys(dates).filter(path=>!/^\/areas\/(mississippi|alabama|wisconsin|illinois|louisiana|arkansas)\//.test(path)).sort(),[...preservation.dateRoutes,...approvedPaths].sort());
 const sitemap=crawlFiles(config,pages).sitemap;
 const indexed=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>new URL(match[1]).pathname).filter(path=>!/^\/areas\/(mississippi|alabama|wisconsin|illinois|louisiana|arkansas)\//.test(path)).sort();
 assert.deepEqual(indexed,routes.filter(path=>path!=='/404/'&&!excluded.includes(path)));
 assert.deepEqual(records.filter(record=>record.path.startsWith('/areas/georgia/')).map(record=>record.path).sort(),approvedPaths.filter(path=>path!=='/areas/georgia/').sort());
});

test('Georgia covers all counties and retains separately typed municipal and statistical places',()=>{
 assert.equal(georgiaAreaInventory.length,159);
 assert.equal(state.counties.length,159);
 assert.equal(new Set(georgiaAreaInventory.map(area=>area.fips)).size,159);
 assert.equal(municipalities.length,598);
 assert.equal(new Set(municipalities.map(place=>place.geoid)).size,538);
 assert.equal(communities.length,141);
 assert.equal(new Set(communities.map(place=>place.geoid)).size,138);
 for(const [type,count] of [['City',429],['Town',101],['Consolidated city-county government',8]]){
  assert.equal(new Set(municipalities.filter(place=>place.type===type).map(place=>place.geoid)).size,count,type);
 }
 assert.ok(communities.every(place=>place.type==='Census-designated place'));
 assert.ok(municipalities.every(place=>!place.name.includes('(balance)')));
 for(const area of georgiaAreaInventory){
  const entry=geography[area.slug];
  assert.ok(entry.representativePlaces.length>0,area.slug);
  assert.ok(entry.municipalityDetails.every(place=>place.countyFips.includes(area.fips)),area.slug);
  assert.ok(entry.communities.every(place=>place.countyFips.includes(area.fips)),area.slug);
 }
});

test('Athens and Augusta use the full governments while retaining their statistical balance metadata and separate municipalities',()=>{
 for(const [county,governmentId,balanceId,others] of [
  ['clarke','1303436','1303440',['Bogart','Winterville']],
  ['richmond','1304200','1304204',['Blythe','Hephzibah']]
 ]){
  const entry=geography[county],government=entry.municipalityDetails.find(place=>place.geoid===governmentId);
  assert.equal(government.type,'Consolidated city-county government');
  assert.equal(government.statisticalBalance.geoid,balanceId);
  assert.ok(!entry.municipalityDetails.some(place=>place.geoid===balanceId));
  for(const name of others)assert.ok(entry.municipalityDetails.some(place=>place.name===name),name);
 }
});

test('Georgia searches preserve cross-county municipalities and familiar consolidated-government names',()=>{
 const cards=serviceStates.flatMap(s=>s.counties.map(county=>({state:s.id,slug:county.slug,terms:countySearchText(county,s,s.regions.find(region=>region.slugs.includes(county.slug))).split('|')})));
 const matches=query=>cards.filter(card=>countyMatchScore(card,parseCountyQuery(query))).map(card=>card.state+'/'+card.slug).sort();
 for(const [query,expected] of [
  ['Atlanta city GA',['georgia/dekalb','georgia/fulton']],
  ['Braselton town GA',['georgia/barrow','georgia/gwinnett','georgia/hall','georgia/jackson']],
  ['Buford city GA',['georgia/gwinnett','georgia/hall']],
  ['Mountain Park city GA',['georgia/cherokee','georgia/fulton']],
  ['Athens municipality GA',['georgia/clarke']],
  ['Augusta municipality GA',['georgia/richmond']],
  ['Macon municipality GA',['georgia/bibb']],
  ['Athens-Clarke County GA',['georgia/clarke']],
  ['Augusta-Richmond County GA',['georgia/richmond']],
  ['Macon-Bibb County GA',['georgia/bibb']],
  ['Cusseta-Chattahoochee County GA',['georgia/chattahoochee']],
  ['Georgetown-Quitman County GA',['georgia/quitman']],
  ['Winterville city GA',['georgia/clarke']],
  ['Hephzibah city GA',['georgia/richmond']],
  ['Winterville county GA',[]],
  ['Macon city GA',[]]
 ])assert.deepEqual(matches(query),expected,query);
 for(const county of state.counties)assert.ok(matches(county.name+' county GA').includes('georgia/'+county.slug));
 assert.equal(matches('GA').length,159);
});

test('New York borough aliases never relabel Richmond County in other states',()=>{
 for(const stateId of ['new-york','virginia','north-carolina','georgia']){
  const current=serviceStates.find(item=>item.id===stateId),county=current.counties.find(item=>item.slug==='richmond');
  const expected=stateId==='new-york'?'Staten Island · Richmond County':'Richmond County';
  assert.equal(countyLabel(county,current),expected);
  const html=countyDirectory(current),entry=html.slice(html.indexOf('id="richmond"')).split('</details>')[0];
  assert.ok(entry.includes('<summary>'+expected+'</summary>'),stateId);
  if(stateId!=='new-york')assert.ok(!entry.includes('Staten Island'),stateId);
 }
});
