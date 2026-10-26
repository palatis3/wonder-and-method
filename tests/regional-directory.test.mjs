import {gzipSync} from 'node:zlib';
import {locationServicePages} from '../src/location-service-pages.mjs';
import historicCountyRoutes from './fixtures/historic-county-routes.json' with {type:'json'};
import {countyLocalNotes} from '../src/county-local-notes.mjs';
import {retiredCountyRoutes} from '../deployment/retired-county-routes.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import offers from '../config/offers.json' with {type:'json'};
import {escapeHtml as e} from '../src/shared.mjs';
import {regionalProfiles} from '../src/regional-content.mjs';
import {countyPages} from '../src/service-counties.mjs';
import {serviceStates,countyPath,countyServicePath,countyDirectory,countySearchText} from '../src/service-area-directory.mjs';
import {normalizeCountyQuery,parseCountyQuery,countyMatchScore,packCountyNames,unpackCountyNames,packCountySearch,unpackCountySearch} from '../src/assets/county-directory.js';

const states=serviceStates.filter(state=>regionalProfiles[state.id]);
const pages=countyPages(offers),byPath=new Map(pages.map(page=>[page.path,page]));
const servicesByPath=new Map(locationServicePages(offers).map(page=>[page.path,page]));
const directories=new Map(states.map(state=>[state.id,countyDirectory(state)]));
const cards=serviceStates.flatMap(state=>state.counties.map(county=>({state:state.id,slug:county.slug,terms:countySearchText(county,state,state.regions.find(region=>region.slugs.includes(county.slug))).split('|')})));
const matches=query=>cards.filter(card=>countyMatchScore(card,parseCountyQuery(query))).map(card=>card.state+'/'+card.slug).sort();

test('thirty expansion hubs expose 2504 entries within 43 public directory pages and preserve 333 original areas',()=>{
 assert.equal(states.length,30);assert.equal(pages.length,43);assert.equal(byPath.size,43);
 assert.deepEqual(states.map(state=>[state.id,state.counties.length]),[['virginia',133],['west-virginia',55],['michigan',83],['district-of-columbia',1],['indiana',92],['kentucky',120],['tennessee',95],['north-carolina',100],['florida',67],['south-carolina',46],['georgia',159],['mississippi',82],['alabama',67],['wisconsin',72],['illinois',102],['louisiana',64],['arkansas',75],['texas',254],['missouri',115],['iowa',99],['minnesota',87],['oklahoma',77],['kansas',105],['nebraska',93],['north-dakota',53],['south-dakota',66],['california',58],['new-mexico',33],['arizona',15],['oregon',36]]);
 assert.equal(cards.length,2837);
 assert.equal(serviceStates.filter(state=>!regionalProfiles[state.id]).reduce((count,state)=>count+state.counties.length,0),333);
 const combined=countyDirectory();
 assert.equal((combined.match(/data-cs=/g)||[]).length,2837);
 assert.equal((combined.match(/data-county-area/g)||[]).length,0,'the combined finder does not repeat all detailed place lists');
 for(const state of states){
  assert.ok(byPath.has(state.path),state.path);
  assert.equal(pages.filter(page=>page.path.startsWith(state.path)&&page.path!==state.path).length,0,'no separate new county articles');
  const html=directories.get(state.id),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length,state.id+' has unique fragment IDs');
  assert.equal((html.match(/data-county-area/g)||[]).length,state.counties.length,state.id);
  for(const county of state.counties){
   const target=countyPath(county,state);
   assert.equal(target,state.path+'#'+county.slug);
   assert.ok(combined.includes(`href="${countyServicePath(county,state)}"`),target+' has direct service or directory destination');
   assert.ok(html.includes(`id="${county.slug}"`),target+' has a real native-disclosure target');
   assert.ok(html.includes(`href="${target}"`),target+' can be shared');
  }
  for(const match of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(match[1]),state.id+' #'+match[1]);
  assert.match(html,/<noscript>.*Open the lists below to browse every service area/s);
  assert.doesNotMatch(byPath.get(state.path).body,/Each guide offers|Every guide includes fictional|have separate guides|worksheet to decide/);
 }
});

test('hub entries expose every recorded place and distinct government type with their source references',()=>{
 for(const state of states){
  const html=directories.get(state.id);
  for(const county of state.counties){
   const g=state.geography[county.slug];
   const entry=html.slice(html.indexOf(`id="${county.slug}"`)).split('</details>')[0];
   for(const place of [...(g.municipalityDetails||[]),...(g.communities||[]),...(g.administrativeDistricts||[])]){
    assert.ok(entry.includes(e(place.name)),`${state.id}/${county.slug}: ${place.name}`);
    if(place.note||place.governmentStatus)assert.ok(entry.includes(e(place.note||place.governmentStatus)),place.name+' keeps its status');
   }
   assert.match(entry,/href="#geography-reference-\d+"/);
   for(const url of g.sources)assert.ok(html.includes(`href="${e(url)}"`),state.id+' source '+url);
   const shared=Object.values(state.geography).find(other=>other.directoryNote&&g.directoryNote.startsWith(other.directoryNote+' '));
   assert.ok(html.includes(e(g.directoryNote))||(shared&&html.includes(e(shared.directoryNote))&&html.includes(e(g.directoryNote.slice(shared.directoryNote.length+1)))),state.id+' complete place definitions, with a shared prefix printed once');
  }
 }
 assert.match(directories.get('michigan'),/>Charter townships<\/h3>/);
 assert.match(directories.get('kentucky'),/>Urban county governments<\/h3>/);
 assert.match(directories.get('tennessee'),/>Metropolitan governments<\/h3>/);
 const dc=directories.get('district-of-columbia');
 assert.match(dc,/>Selected neighborhoods<\/h3>/);assert.match(dc,/>Council wards<\/h3>/);
 assert.match(dc,/no neighborhood-to-ward assignment is implied/);
 assert.match(dc,/no separate city government/);
});

test('typed geography searches resolve shared cities, cross-county places, charter townships and DC wards',()=>{
 for(const [query,expected] of [
  ['Richmond city VA',['virginia/richmond-city']],
  ['Richmond county VA',['virginia/richmond']],
  ['Richmond independent city VA',['virginia/richmond-city']],
  ['Belle Haven town VA',['virginia/accomack','virginia/northampton']],
  ['Ranson corporation WV',['west-virginia/jefferson']],
  ['Bloomfield charter township MI',['michigan/oakland']],
  ['Bloomfield township MI',['michigan/huron','michigan/missaukee','michigan/oakland']],
  ['Georgetown neighborhood DC',['district-of-columbia/district-of-columbia']],
  ['Ward 3 DC',['district-of-columbia/district-of-columbia']],
  ['Louisville municipality KY',['kentucky/jefferson']],
  ['Lexington municipality KY',['kentucky/fayette']],
  ['Nashville municipality TN',['tennessee/davidson']],
  ['Atlantic CDP VA',['virginia/accomack']],
  ['Richmond county WV',[]],['Ward 9 DC',[]],['14221',[]]
 ])assert.deepEqual(matches(query),expected,query);
 for(const state of states)for(const county of state.counties){
  const card=cards.find(item=>item.state===state.id&&item.slug===county.slug),g=state.geography[county.slug];
  const records=[...Object.values(g.municipalities).flat(),...g.communities.map(place=>place.name),...(g.administrativeDistricts||[]).map(place=>place.name)];
  for(const name of records)assert.ok(card.terms.some(term=>term.endsWith(':'+normalizeCountyQuery(name))),`${state.id}/${county.slug}: ${name} is indexed`);
  assert.ok(matches(`${county.name} ${county.areaType} ${state.abbreviation}`).includes(state.id+'/'+county.slug),state.id+'/'+county.slug);
 }
});

test('compact page-local search data round-trips and bounded hubs do not repeat source payloads',()=>{
 const names=[...new Set(cards.flatMap(card=>card.terms.map(term=>term.slice(term.indexOf(':')+1))))].sort();
 const dictionary={names,indices:new Map(names.map((name,index)=>[name,index]))};
 assert.deepEqual(unpackCountyNames(packCountyNames(names)),names);
 assert.deepEqual(unpackCountyNames('0:athens|1:tlanta'),['athens','atlanta'],'older name payloads remain readable');
 const longNames=['a'.repeat(36)+' one','a'.repeat(36)+' two'];
 assert.deepEqual(unpackCountyNames(packCountyNames(longNames)),longNames,'long common prefixes retain every character');
 for(const card of cards)assert.deepEqual(unpackCountySearch(packCountySearch(card.terms.join('|'),dictionary),names),card.terms,card.state+'/'+card.slug);
 const combined=countyDirectory();
 assert.ok(Buffer.byteLength(combined)<450_000,'all-area search stays under 450 KB uncompressed');
 assert.ok(gzipSync(combined).length<195_000,'all-area search stays under 195 KB gzip');
 for(const [state,html] of directories){
  assert.ok(Buffer.byteLength(html)<(state==='texas'?375_000:200_000),state+' directory stays within its reviewed uncompressed budget');
  if(state==='texas')assert.ok(gzipSync(html).length<60_000,'Texas directory stays under 60 KB gzip');
  const sources=[...html.matchAll(/href="(https?:[^\"]+)"/g)].map(match=>match[1]);
  assert.equal(sources.length,new Set(sources).size,state+' cites each source URL once');
 }
});

test('the original 333 areas preserve their facts in state hubs, alongside approved service pages and 2 redirects',()=>{
 const originalStates=serviceStates.filter(state=>!regionalProfiles[state.id]);assert.equal(originalStates.length,12);
 let count=0;
 for(const state of originalStates){
  const page=byPath.get(state.path);assert.ok(page,state.path);
  assert.doesNotMatch(page.body,/class="county-general-guidance"|class="county-buyer-task"|class="county-planning-details"/);
  assert.match(page.body,/Place types and official sources/);
  for(const county of state.counties){
   count++;
   const start=page.body.indexOf(`id="${county.slug}"`);assert.ok(start>=0,state.id+'/'+county.slug);
   const entry=page.body.slice(start).split('</details>')[0],g=state.geography[county.slug];
   const note=countyLocalNotes[state.id+'/'+county.slug]||county.geographyNote;if(note)assert.ok(entry.includes(e(note)),state.id+'/'+county.slug+' retained fact');
   for(const name of [...Object.values(g.municipalities).flat(),...g.communities.map(place=>place.name)])assert.ok(entry.includes(e(name)),state.id+'/'+county.slug+': '+name);
   assert.match(entry,/href="#geography-reference-\d+"/);
   const destination=countyPath(county,state);
   if(state.id==='new-york'&&county.slug==='erie'){assert.equal(destination,'/areas/erie-county/');assert.ok(!retiredCountyRoutes[destination]);}
   else {assert.equal(destination,state.path+'#'+county.slug);assert.equal(Object.values(historicCountyRoutes).filter(value=>value===destination).length,1,destination);}
  }
  for(const route of ['/services/','/pricing/'])assert.ok(page.body.includes(`href="${route}"`),state.path+' '+route);
  assert.ok(page.title.length<=60,state.path);assert.ok(page.description.length<=160,state.path);
 }
 assert.equal(count,333);assert.equal(Object.keys(retiredCountyRoutes).length,2);
 for(const [retired,destination] of Object.entries(retiredCountyRoutes)){assert.ok(!byPath.has(retired)&&!servicesByPath.has(retired),retired);const [hub,slug]=destination.split('#'),target=byPath.get(hub)||servicesByPath.get(hub);assert.ok(target,destination);if(slug)assert.ok(target.body.includes(`id="${slug}"`),destination);}
 const altered=structuredClone(offers);altered.launch_site.public_price=1777;altered.baseline.one_time_price=477;altered.plans.keep_running.monthly_price=177;
 const changed=countyPages(altered);assert.equal(changed.length,43);
 for(const page of changed)for(const price of ['$1,777','$477','$177/month','$654'])assert.ok(page.body.includes(price),page.path+' dynamic price '+price);
});
