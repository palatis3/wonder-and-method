import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFragment} from 'parse5';
import {serviceStates,countyDirectory} from '../src/service-area-directory.mjs';
import {countyPages} from '../src/service-counties.mjs';
import offers from '../config/offers.json' with {type:'json'};
import {escapeHtml} from '../src/shared.mjs';
const rendered=new Map(serviceStates.map(state=>[state.id,countyDirectory(state)]));
const walk=(node,predicate)=>[...(predicate(node)?[node]:[]),...(node.childNodes||[]).flatMap(child=>walk(child,predicate))];
const attr=(node,name)=>node.attrs?.find(a=>a.name===name)?.value;

test('every directory keeps its entries, place memberships and source destinations',()=>{
 for(const state of serviceStates){
  const html=rendered.get(state.id),dom=parseFragment(html);
  const entries=walk(dom,n=>n.tagName==='details'&&n.attrs?.some(a=>a.name==='data-county-area'));
  assert.equal(entries.length,state.counties.length,state.id);
  for(const county of state.counties){
   const entry=entries.find(n=>attr(n,'id')===county.slug);assert.ok(entry,county.slug);
   const g=state.geography[county.slug];
   const municipalities=g.municipalityDetails?.length?g.municipalityDetails:Object.values(g.municipalities||{}).flat().map(name=>({name}));
   const records=[...municipalities,...g.communities||[],...g.administrativeDistricts||[]];
   const lists=walk(entry,n=>n.tagName==='ul'&&attr(n,'class')==='county-place-list');
   const items=lists.flatMap(list=>list.childNodes.filter(n=>n.tagName==='li'));
   assert.equal(items.length,records.length,state.id+'/'+county.slug);
   const names=items.map(item=>item.childNodes.filter(n=>n.nodeName==='#text').map(n=>n.value).join('').trim()).sort();
   assert.deepEqual(names,records.map(p=>p.name.trim()).sort(),state.id+'/'+county.slug);
   const urls=[...g.sources||[],...records.flatMap(p=>[p.source,...p.sources||[],...p.additionalSources||[],...p.governmentTypeSources||[]])].filter(u=>typeof u==='string'&&/^https?:/.test(u));
   for(const url of urls)assert.ok(html.includes('href="'+escapeHtml(url)+'"'),state.id+' '+url);
  }
 }
});

test('boroughs, repeated subbarrio names and inactive records remain distinguishable',()=>{
 const ny=rendered.get('new-york');
 for(const borough of ['Manhattan','Queens','Bronx','Brooklyn','Staten Island']){assert.ok(ny.includes('In the borough of '+borough+'.'));assert.ok(!ny.includes('In the Town of '+borough+'.'));}
 const pr=rendered.get('puerto-rico');assert.ok(pr.includes('Within Hato Rey Norte barrio.'));assert.ok(pr.includes('Within Santurce barrio.'));
 assert.ok(rendered.get('ohio').includes('Incorporated village with inactive governmental status.'));
 assert.ok(rendered.get('new-mexico').includes('Los Alamos has a consolidated county government.'));
});

test('typed lists sort numbers naturally and search labels match unusual jurisdictions',()=>{
 for(const id of ['arkansas','illinois','kansas','louisiana','nebraska']){
  const lists=walk(parseFragment(rendered.get(id)),n=>n.tagName==='ul'&&attr(n,'class')==='county-place-list');
  for(const list of lists){const names=list.childNodes.filter(n=>n.tagName==='li').map(n=>n.childNodes[0].value.trim());assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b,'en',{numeric:true})));}
 }
 assert.match(rendered.get('district-of-columbia'),/<label for="county-search">Ward or neighborhood<\/label>/);
 assert.match(rendered.get('louisiana'),/<label for="county-search">Parish, city, town, village or district<\/label>/);
 for(const html of rendered.values())assert.doesNotMatch(html,/\(1 (?:counties|service areas|parishes|municipios)\)/);
 const texas=countyPages(offers).find(p=>p.path==='/areas/texas/').body;
 assert.match(texas,/Place types and search help/);assert.match(texas,/Browse all 254 counties/);
});

test('source notes share definitions while keeping named county exceptions and dated status evidence',()=>{
 const ohio=rendered.get('ohio'),hawaii=rendered.get('hawaii'),pa=rendered.get('pennsylvania');
 assert.equal(ohio.split('Place list from the U.S. Census Bureau, checked October 2026.').length-1,1);
 assert.match(ohio,/<h3>Delaware County<\/h3><p>Washington Township/);
 assert.match(ohio,/<h3>Franklin County<\/h3><p>Washington Township/);
 assert.equal(hawaii.split('Hawaii has no Census-recognized incorporated places.').length-1,1);
 assert.equal(hawaii.split('Honolulu city and county are governmentally consolidated').length-1,1);
 assert.match(hawaii,/Kalawao County is a distinct Census county, dependent on Hawaii state government and administered by the Department of Health/);
 assert.match(hawaii,/Act 171 \(2026\), sections 2, 24 and 28/);
 assert.match(pa,/<h3>Berks County<\/h3><p>Municipalities shared with another county: Adamstown/);
 assert.match(pa,/<h3>Lancaster County<\/h3><p>Municipalities shared with another county: Adamstown/);
 assert.match(rendered.get('kentucky'),/The Monterey final dissolution order from Kentucky DLG was signed December 4, 2023/);
 assert.match(rendered.get('north-carolina'),/effective July 1, 2026/);
 assert.match(rendered.get('north-carolina'),/Eureka’s statutory charter suspension expired June 30, 2024/);
 assert.doesNotMatch(rendered.get('north-carolina'),/neither is counted as an active municipal government\. The charter remains suspended/);
 for(const html of rendered.values())assert.doesNotMatch(html,/General place definitions|Representative-place population ranking is incomplete|geographic relationship records membership relationships/);
});

test('record annotations and source labels explain their meaning without changing names',()=>{
 assert.doesNotMatch(rendered.get('michigan'),/Normalized spelling\/abbreviation of source name\.|retain the generic Township type/);
 assert.match(rendered.get('michigan'),/Howard: status evidence and unresolved check/);
 assert.match(rendered.get('michigan'),/Cass Lake: Census record detail/);
 assert.doesNotMatch(rendered.get('connecticut'),/is one of Connecticut’s nine current Census county-equivalent planning regions/);
 assert.match(rendered.get('minnesota'),/Numeric names below are the territory identifiers recorded by the source/);
 assert.match(rendered.get('nebraska'),/precinct abbreviations below are the recorded source labels/);
 assert.match(rendered.get('vermont'),/Jericho <span class="county-place-note">Inactive Incorporated entity retained in Census records\./);
 assert.match(rendered.get('nevada'),/These counties have no incorporated municipality in the January 2026 Census inventory: Douglas County, Esmeralda County, Eureka County, Lander County, Mineral County, Nye County, Storey County/);
 assert.match(rendered.get('indiana'),/Indiana: 2025 township population estimates/);
 assert.match(rendered.get('california'),/2025 county population estimates \(CSV\)/);
 assert.match(rendered.get('wisconsin'),/what “MCD” \(minor civil division\) means/);
 assert.match(rendered.get('alaska'),/2020 Census place records \(data query\)/);
 assert.doesNotMatch(rendered.get('new-jersey'),/New Jersey: 2 —/);
});

test('opening help and search recovery use the applicable place types',()=>{
 const index=countyDirectory(undefined,{compact:true});
 assert.doesNotMatch(index,/place name: place/);assert.match(index,/Try another place name, or choose a different state, district or territory/);
 assert.match(rendered.get('district-of-columbia'),/Browse the Washington, DC guide below\./);
 assert.doesNotMatch(rendered.get('district-of-columbia'),/Browse all 1 district guide/);
 const pages=countyPages(offers);
 assert.match(pages.find(p=>p.path==='/areas/texas/').body,/Incorporated cities, towns and villages/);
 assert.match(pages.find(p=>p.path==='/areas/pennsylvania/').body,/Selected communities are not a complete neighborhood or village inventory/);
});
