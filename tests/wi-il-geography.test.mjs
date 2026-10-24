import approvedPaths from './fixtures/wi-il-approved-paths.json' with {type:'json'};
import {renderPages} from '../src/pages.mjs';
import {crawlFiles} from '../src/seo.mjs';
import config from '../config/site.json' with {type:'json'};
import offers from '../config/offers.json' with {type:'json'};
import map from '../authority/v5/site-map.json' with {type:'json'};
import erieGeography from '../authority/v5/geography.json' with {type:'json'};
import dates from '../config/page-dates.json' with {type:'json'};
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import expected from './fixtures/wi-il-geography.json' with {type:'json'};
import preservation from './fixtures/wi-il-preservation.json' with {type:'json'};
import records from '../src/location-service-data.json' with {type:'json'};
import faqs from '../src/service-faqs.json' with {type:'json'};
import {wiIlGeography,wiIlAreaInventory} from '../src/wi-il-geography.mjs';
import {serviceStates,countyDirectory,countySearchText} from '../src/service-area-directory.mjs';
import {parseCountyQuery,countyMatch,decodeCountyNames,unpackCountySearch} from '../src/assets/county-directory.js';

const additions=['wisconsin','illinois'];
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
test('WI/IL preserve every earlier commercial record, FAQ and directory identity',()=>{
 const prior=records.filter(record=>!additions.some(state=>record.path.startsWith('/areas/'+state+'/')));
 assert.equal(prior.length,1093);
 assert.deepEqual(prior.map(record=>record.path).sort(),preservation.recordPaths);
 assert.equal(hash(prior),preservation.recordsArraySha256);
 for(const record of prior)assert.equal(hash(record),preservation.recordHashes[record.path],record.path);
 assert.deepEqual(serviceStates.filter(state=>!additions.includes(state.id)).flatMap(state=>state.counties.map(county=>state.id+'/'+county.slug)).sort(),preservation.identities);
 for(const [path,answers] of Object.entries(preservation.faqs))assert.deepEqual(faqs[path],answers,path);
});

test('all 174 counties and 5402 memberships match the independent raw-source reconstruction',()=>{
 assert.equal(wiIlAreaInventory.length,174);
 assert.equal(new Set(wiIlAreaInventory.map(area=>area.fips)).size,174);
 let memberships=0;
 for(const area of wiIlAreaInventory){
  const id=area.stateId+'/'+area.slug,g=wiIlGeography[area.stateId][area.slug],fixture=expected.counties[id];
  assert.equal(area.fips,fixture.fips,id);
  const entities=[...g.municipalityDetails,...g.communities,...g.administrativeDistricts];
  const signatures=entities.map(p=>[p.geoid,p.name,p.type,p.censusFunctionalStatus,p.censusLSAD,p.censusName,p.countyFips]).sort((a,b)=>a[0].localeCompare(b[0]));
  assert.deepEqual(signatures,fixture.entities.map(row=>[...row.slice(0,6),Array.isArray(row[6])?row[6]:[row[6]]]),id);
  assert.deepEqual(g.representativePlaces,fixture.representatives,id+' representatives');
  assert.ok(entities.every(p=>p.countyFips.includes(area.fips)&&p.censusFunctionalStatus!=='F'),id);
  assert.ok(g.administrativeDistricts.every(p=>p.censusFunctionalStatus==='N'&&['Precinct','Election precinct'].includes(p.type)),id);
  assert.ok(g.municipalityDetails.every(p=>['A','B','C'].includes(p.censusFunctionalStatus)),id);
  memberships+=entities.length;
 }
 assert.equal(memberships,5402);
 assert.deepEqual(wiIlGeography.wisconsin.menominee.representativePlaces,[{name:'Menominee',type:'Town',geoid:'5507850975'}]);
 assert.ok(wiIlGeography.wisconsin.florence.representativePlaces.every(p=>p.type==='Town'));
 const cicero=wiIlGeography.illinois.cook.municipalityDetails.filter(p=>p.name==='Cicero');
 assert.deepEqual(cicero.map(p=>[p.type,p.censusFunctionalStatus]).sort(),[['Town','A'],['Township','C']]);
});

test('new typed searches retain cross-county places and distinguish towns, townships and precincts',()=>{
 const cards=serviceStates.flatMap(state=>state.counties.map(county=>({state:state.id,slug:county.slug,terms:countySearchText(county,state,state.regions.find(region=>region.slugs.includes(county.slug))).split('|')})));
 const matches=query=>cards.filter(card=>countyMatch(card,parseCountyQuery(query)).score).map(card=>card.state+'/'+card.slug).sort();
 for(const [query,results] of [
  ['Wisconsin Dells city WI',['wisconsin/adams','wisconsin/columbia','wisconsin/juneau','wisconsin/sauk']],
  ['Brookfield town WI',['wisconsin/waukesha']],
  ['Brookfield city WI',['wisconsin/waukesha']],
  ['Madison town WI',[]],
  ['Menominee town WI',['wisconsin/menominee']],
  ['Keshena CDP WI',['wisconsin/menominee']],
  ['Aurora city IL',['illinois/dupage','illinois/kane','illinois/kendall','illinois/will']],
  ['Aurora township IL',['illinois/kane']],
  ['Naperville city IL',['illinois/dupage','illinois/will']],
  ['Cicero town IL',['illinois/cook']],
  ['Cicero township IL',['illinois/cook']],
  ['Cache precinct IL',['illinois/alexander','illinois/johnson']],
  ['Cache ward IL',[]],
  ['Precinct Cache IL',['illinois/alexander','illinois/johnson']],
  ['Election precinct 1 IL',['illinois/monroe']],
  ['1 election precinct IL',['illinois/monroe']]
 ])assert.deepEqual(matches(query),results,query);
 assert.equal(matches('WI').length,72);assert.equal(matches('IL').length,102);
 const precinctCard=cards.find(card=>card.state==='illinois'&&card.slug==='alexander');
 assert.equal(countyMatch(precinctCard,parseCountyQuery('Cache precinct IL')).type,'precinct');
 const html=countyDirectory(serviceStates.find(state=>state.id==='illinois'));
 assert.match(html,/>Precincts<\/h3>/);assert.match(html,/>Election precincts<\/h3>/);
});

test('compressed dictionary preserves every term while keeping the existing payload budget',async()=>{
 const html=countyDirectory(),payload=JSON.parse(html.match(/data-county-place-names>(.*?)<\/script>/s)[1]);
 assert.equal(payload.encoding,'gzip-base64');
 const names=await decodeCountyNames(payload);
 const expectedTerms=serviceStates.flatMap(state=>[...state.counties].sort((a,b)=>a.name.localeCompare(b.name)).map(county=>countySearchText(county,state,state.regions.find(region=>region.slugs.includes(county.slug))).split('|')));
 const actual=[...html.matchAll(/data-cs="([^"]+)"/g)].map(match=>unpackCountySearch(match[1],names));
 assert.deepEqual(actual,expectedTerms);
 assert.equal(actual.length,1607);
 assert.ok(Buffer.byteLength(html)<375_000);
 for(const state of serviceStates.slice(-2))assert.ok(Buffer.byteLength(countyDirectory(state))<200_000,state.id);
});


test('WI/IL add exactly two hubs and three approved pages while preserving prior routes',()=>{
 const pages=renderPages({config,offers,map,geography:erieGeography}),routes=pages.map(page=>page.path).sort();
 assert.equal(preservation.renderedRoutes.length,1224);assert.equal(approvedPaths.length,5);
 assert.deepEqual(routes,[...preservation.renderedRoutes,...approvedPaths].sort());
 assert.deepEqual(Object.keys(dates).sort(),[...preservation.dateRoutes,...approvedPaths].sort());
 const indexed=[...crawlFiles(config,pages).sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>new URL(match[1]).pathname).sort();
 assert.deepEqual(indexed,routes.filter(path=>path!=='/404/'));
 assert.deepEqual(records.filter(record=>additions.some(state=>record.path.startsWith('/areas/'+state+'/'))).map(record=>record.path).sort(),approvedPaths.slice(2).sort());
});
