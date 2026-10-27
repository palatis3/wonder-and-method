import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {escapeHtml as e} from './shared.mjs';
import {normalizeCountyQuery,parseCountyQuery,packCountySearch,packCountyNames,packCountySearchCards,packCountyBase91} from './assets/county-directory.js';
import {countyProfiles} from './county-profiles.mjs';
import {countyGeography} from './county-geography.mjs';
import {countyRegions} from './county-regions.mjs';
import {pennsylvaniaProfiles} from './pennsylvania-content.mjs';
import {pennsylvaniaGeography} from './pennsylvania-geography.mjs';
import {pennsylvaniaRegions} from './pennsylvania-regions.mjs';
import {ohioProfiles} from './ohio-content.mjs';
import {ohioGeography} from './ohio-geography.mjs';
import {ohioRegions} from './ohio-regions.mjs';
import {serviceStateInfo,serviceRegionLabel} from './assets/service-state-info.js';
import {northeastProfiles} from './northeast-content.mjs';
import {northeastGeography} from './northeast-geography.mjs';
import {northernExpansionGeography} from './northern-expansion-geography.mjs';
import {regionalProfiles,regionalGeography} from './regional-content.mjs';
import {countyLocalNotes} from './county-local-notes.mjs';
import {areaGuideLinks} from './area-guide-links.mjs';
import {locationServiceForArea} from './location-service-index.mjs';
import reviewedWorksheets from './location-worksheet-links.json' with {type:'json'};
const additionalProfiles={...northeastProfiles,...regionalProfiles};

// Alphabetical browse groups are navigation, not additional geographic entities.
const browseGroups=counties=>Array.from({length:Math.ceil(counties.length/6)},(_,index)=>{
 const group=counties.slice(index*6,(index+1)*6);
 return {id:'browse-'+(index+1),name:group.length===1?group[0].name:group[0].name+' – '+group.at(-1).name,slugs:group.map(c=>c.slug)};
});

export const serviceStates=[
 {id:'new-york',name:'New York',abbreviation:'NY',path:'/areas/new-york/',counties:[{slug:'erie',name:'Erie',anchor:'Buffalo',displayName:'Buffalo & Erie County'},...countyProfiles],geography:countyGeography,regions:countyRegions},
 {id:'pennsylvania',name:'Pennsylvania',abbreviation:'PA',path:'/areas/pennsylvania/',counties:pennsylvaniaProfiles,geography:pennsylvaniaGeography,regions:pennsylvaniaRegions},
 {id:'ohio',name:'Ohio',abbreviation:'OH',path:'/areas/ohio/',counties:ohioProfiles,geography:ohioGeography,regions:ohioRegions},
 ...serviceStateInfo.slice(3).map(state=>({...state,counties:additionalProfiles[state.id],geography:northeastGeography[state.id]||northernExpansionGeography[state.id]||regionalGeography[state.id],regions:browseGroups(additionalProfiles[state.id])}))
].map(state=>({...serviceStateInfo.find(item=>item.id===state.id),...state}));
export const countyPath=(county,state=serviceStates[0])=>state.id==='new-york'&&county.slug==='erie'?'/areas/erie-county/':state.path+'#'+county.slug;
export const countyServicePath=(county,state=serviceStates[0])=>locationServiceForArea(state.id+'/'+county.slug)?.path||countyPath(county,state);
const isIndependentCity=county=>county.areaType?.toLowerCase()==='independent city';
export const countyAreaName=county=>county.areaType==='Federal District'?'Washington, DC':isIndependentCity(county)?(/\bcity$/i.test(county.name)?county.name:`${county.name} City`):`${county.name} ${county.areaType||'County'}`;
export const countyLabel=(county,state=serviceStates[0])=>county.boroughLabel?`${county.boroughLabel} · ${county.name} County`:(state.id==='new-york'?({kings:'Brooklyn · Kings County','new-york':'Manhattan · New York County',richmond:'Staten Island · Richmond County'})[county.slug]:null)||countyAreaName(county);
export const regionCounties=(state,region)=>region.slugs.map(slug=>state.counties.find(county=>county.slug===slug)).filter(Boolean);
export function serviceAreaDataForPath(path){
 for(const state of serviceStates){const county=state.counties.find(item=>countyPath(item,state)===path);if(county)return {state,county};}
 return null;
}
const a=(path,label)=>`<a href="${e(path)}">${e(label)}</a>`;
const placeTypeLabels={'Consolidated city-county':'Consolidated city-county governments','Consolidated city balance':'Consolidated city balances (statistical)',Barrio:'Barrios','Barrio-pueblo':'Barrios-pueblo',Subbarrio:'Subbarrios','Zona urbana':'Zonas urbanas (Census-designated places)',Comunidad:'Comunidades (Census-designated places)',District:'Districts',City:'Cities',Town:'Towns',Village:'Villages',Borough:'Boroughs',Township:'Townships','Charter township':'Charter townships',Corporation:'Corporations','Consolidated city-county government':'Consolidated city-county governments','Urban county government':'Urban county governments','Metropolitan government':'Metropolitan governments','Inactive incorporated town':'Inactive incorporated towns','Town with suspended charter':'Towns with suspended charters','Census-designated place':'Census-designated places',Neighborhood:'Selected neighborhoods','Council ward':'Council wards',Precinct:'Precincts','Election precinct':'Election precincts','Census county division':'Census county divisions (statistical)'};
const sourceUrls=g=>[...new Set([...(g.sources||[]),...(g.communities||[]).flatMap(item=>[item.source,...(item.sources||[]),...(item.additionalSources||[])]),...(g.administrativeDistricts||[]).map(item=>item.source),...(g.municipalityDetails||[]).flatMap(item=>[item.source,...(item.sources||[]),...(item.additionalSources||[]),...(item.governmentTypeSources||[])])].filter(url=>typeof url==='string'&&/^https?:\/\//.test(url)))];
function sourceLabel(url,context){
 const parsed=new URL(url);
 if(url.includes('tigerweb_acs26_county_'))return 'U.S. Census: counties and equivalents';
 if(url.includes('tigerweb_acs26_incplace_'))return 'U.S. Census: incorporated places';
 if(url.includes('tigerweb_acs26_cdp_'))return 'U.S. Census: Census-designated places';
 if(url.includes('tigerweb_acs26_concity_'))return 'U.S. Census: consolidated cities';
 if(url.includes('tigerweb_acs26_cousub_'))return 'U.S. Census: county subdivisions';
 if(url.includes('public_grfc_cur26_'))return 'U.S. Census: 2026 place/county relationships';
 if(url.includes('DCGIS_DATA/Administrative_Other_Boundaries'))return 'DC GIS: Council ward records';
 return context+': place and government reference — '+parsed.hostname.replace(/^www\./,'');
}
// Each distinct set of source records and definitions is printed once per hub.
// Area entries link to their own reference set; no external requests power search.
function hubReferences(state){
 const sources=[],notes=[],sets=[],areaSets=new Map(),sourceAreas=new Map();
 const index=(values,value)=>{let i=values.indexOf(value);if(i<0)i=values.push(value)-1;return i+1;};
 for(const county of state.counties){
  const g=state.geography[county.slug],note=index(notes,g.directoryNote||(g.borough?'These are neighborhoods within New York City, not separate municipalities.':'Town and village names can overlap. Communities are listed separately from municipalities; use the actual address when a boundary matters.')),sourceIds=sourceUrls(g).map(url=>index(sources,url));
  for(const url of sourceUrls(g)){if(!sourceAreas.has(url))sourceAreas.set(url,[]);sourceAreas.get(url).push(countyAreaName(county));}
  const value=JSON.stringify({note,sourceIds}),id=index(sets,value);areaSets.set(county.slug,id);
 }
 const noteMarkup=notes.map((note,i)=>{
  const base=notes.findIndex((other,j)=>j<i&&note.startsWith(other+' '));
  const text=base<0?e(note):`${a('#geography-note-'+(base+1),'General place definitions')}. ${e(note.slice(notes[base].length+1))}`;
  return `<p id="geography-note-${i+1}">${text}</p>`;
 }).join('');
 const html=`<section class="county-reference-library" id="directory-sources"><h2>Place types and official sources</h2><p>Place lists follow the cited geography records and documented local updates. They are a reference for finding an area; they do not establish a business address or a travel boundary.</p>${noteMarkup}<details class="county-source-index"><summary>Source records (${sources.length})</summary><ol>${sources.map((url,i)=>`<li id="geography-source-${i+1}">${a(url,sourceLabel(url,sourceAreas.get(url).length<=2?sourceAreas.get(url).join(' and '):state.name))}</li>`).join('')}</ol></details><details class="county-reference-sets"><summary>References by directory entry</summary><ul>${sets.map((value,i)=>{const set=JSON.parse(value);return `<li id="geography-reference-${i+1}">Reference ${i+1}: ${a('#geography-note-'+set.note,'place definitions')} · ${set.sourceIds.map(id=>a('#geography-source-'+id,'source '+id)).join(', ')}</li>`;}).join('')}</ul></details></section>`;
 return {areaSets,html};
}
function areaDetails(county,state,references){
 const g=state.geography[county.slug],groups=new Map();
 const add=(type,place)=>{if(!groups.has(type))groups.set(type,[]);groups.get(type).push(place);};
 for(const place of g.municipalityDetails||[])add(place.type,place);
 if(!g.municipalityDetails?.length)for(const [group,values] of Object.entries(g.municipalities||{}))for(const name of values)add(({cities:'City',towns:'Town',villages:'Village',boroughs:'Borough',townships:'Township',plantations:'Plantation',other:'Municipality'})[group]||group,{name});
 for(const place of g.communities||[]){const type=place.censusPlaceSubtype||place.type||'Community';add(type[0].toUpperCase()+type.slice(1),place);}
 for(const place of g.administrativeDistricts||[])add(place.type||'Ward',place);
 const lists=[...groups].map(([type,places])=>{
  // A shared status describes this entire typed list. Mixed statuses and
  // place-specific notes stay next to the individual names.
  const sharedStatus=places.length>1&&places[0].governmentStatus&&places.every(place=>place.governmentStatus===places[0].governmentStatus)?places[0].governmentStatus:'';
  const heading=type==='Unorganized territory'&&['iowa','minnesota','north-dakota','south-dakota'].includes(state.id)?'Unorganized territories (statistical)':placeTypeLabels[type]||type;
  return `<div><h3>${e(heading)}</h3>${sharedStatus?`<p class="county-place-note">All places in this list: ${e(sharedStatus)}</p>`:''}<ul class="county-place-list">${places.map(place=>{const notes=[...new Set([place.note,sharedStatus?'':place.governmentStatus,place.town?'In the Town of '+place.town+'.':null].filter(Boolean))];return `<li>${e(place.name)}${notes.length?` <span class="county-place-note">${e(notes.join(' '))}</span>`:''}</li>`;}).join('')}</ul></div>`;
 }).join('');
 const aliases=(g.aliases||[]).filter(alias=>alias.note).map(alias=>`<li>${e(alias.name)}${alias.type?' ('+e(alias.type)+')':''}: ${e(alias.note)}</li>`).join('');
 const area=countyAreaName(county),type=isIndependentCity(county)?'Independent city; separate from surrounding counties.':county.areaType==='Federal District'?'Federal district and Census county equivalent. Wards and neighborhoods are separate categories below.':county.areaType==='Municipio'?'Municipio directory. A municipio is a county equivalent in Puerto Rico. Barrios and subbarrios are subdivisions; Census-designated places are statistical areas, not separate municipal governments.':county.areaType==='Parish'?'Parish directory. Places crossing a parish boundary may appear in more than one entry.':county.areaType==='Planning Region'?'Planning region and current Census county equivalent; distinct from the former county boundaries.':'County directory. Places crossing a county boundary may appear in more than one entry.';
 const note=countyLocalNotes[state.id+'/'+county.slug]||county.geographyNote;
 const localNote=note?`<p class="county-geography-note">${e(note)}</p>`:'';
 const guides=areaGuideLinks[state.id+'/'+county.slug]||[];
 const service=locationServiceForArea(state.id+'/'+county.slug);
 const commercialPath=service?.path||(state.id==='new-york'&&county.slug==='erie'?'/areas/erie-county/':null);
 const serviceLink=commercialPath?`<p class="county-commercial-link"><a data-cl href="${e(commercialPath)}">Website design for ${e(area)}</a> — project choices, prices and working with the studio.</p>`:'';
 const guideLinks=guides.length?`<div class="county-guide-links"><h3>Related planning guides</h3><ul>${guides.map(guide=>`<li>${a(guide.path,guide.title)}</li>`).join('')}</ul></div>`:'';
 const worksheetUrl=reviewedWorksheets[state.id+'/'+county.slug];
 const worksheet=county.directoryOnly||!worksheetUrl?'':`<p><a href="${e(worksheetUrl)}" download>General website-planning worksheet (TXT)</a>. Optional fictional example; the planning principles apply in many places.</p>`;
 return `<details class="county-area-detail" id="${e(county.slug)}" data-county-area><summary>${e(countyLabel(county,state))}</summary><div class="county-area-content">${serviceLink}<p>${e(type)}</p>${localNote}${lists?`<div class="county-directory">${lists}</div>`:'<p>No incorporated municipalities or Census-designated places are listed in the cited records.</p>'}${aliases?`<div class="county-alias-notes"><h3>Other names and status notes</h3><ul>${aliases}</ul></div>`:''}<p>${a('#geography-reference-'+references.areaSets.get(county.slug),'Place definitions and sources')} · <a${commercialPath?'':' data-cl'} href="${e(state.path+'#'+county.slug)}">${commercialPath?'Link to this directory entry':e(area)+' places and sources'}</a></p>${guideLinks}${worksheet}</div></details>`;
}
export function countySearchText(county,state,region){
 const g=state.geography[county.slug];
 const types={cities:'c',towns:'t',villages:'v',boroughs:'b',townships:'s',plantations:'l',other:'m'};
 const terms=new Map();
 const add=(name,type)=>{const value=normalizeCountyQuery(name||'');if(value)terms.set(value,[...new Set((terms.get(value)||'')+type)].join(''));};
 add(county.name,county.areaType==='Federal District'?'d':county.areaType==='Parish'?'u':county.areaType==='Planning Region'?'r':county.areaType==='Municipio'?'A':isIndependentCity(county)?'i':'y');
 for(const alias of g?.aliases||[]){
  const type=({city:'c',town:'t',village:'v',borough:'b',township:'s',plantation:'l',municipality:'m','municipality name variant':'m',district:'d',neighborhood:'n',ward:'w'})[alias.type?.toLowerCase()]||'p';
  add(alias.name,type);
  // A historical alias may include the same type words the query parser removes.
  // Keep its searchable name as well as the complete, source-qualified alias.
  const parsed=parseCountyQuery(alias.name);if(parsed.type)add(parsed.query,type);
 }
 for(const [group,names] of Object.entries(g?.municipalities||{}))for(const name of names)add(name,types[group]||'p');
 for(const place of g?.municipalityDetails||[])if(place.type==='Charter township')add(place.name,'h');
 for(const place of g?.communities||[]){
  const subtype=({'Zona urbana':'E',Comunidad:'F'})[place.censusPlaceSubtype]||'';
  add(place.name,place.type==='Neighborhood'?'n':place.type==='Census-designated place'?'x'+subtype:place.type==='Consolidated city balance'?'G':'p');
 }
 for(const district of g?.administrativeDistricts||[]){
  const type=({Barrio:'B','Barrio-pueblo':'C',Subbarrio:'D','Census county division':'z','Unorganized territory':'o','Election precinct':'e',Precinct:'q',District:'j',Township:'s',Ward:'w','Council ward':'w'})[district.type];
  if(!type)throw Error('Unknown administrative place type: '+district.type);
  add(district.name,type);if(type==='w')add(district.name.replace(/^Ward\s+/i,''),type);
 }
 for(const anchor of (county.anchor||'').split(/\s*(?:,|&)\s*/))add(anchor,'a');
 for(const place of [county.displayName,county.anchor,region?.name]){
  const value=normalizeCountyQuery(place||'');if(value&&!terms.has(value))add(value,'p');
 }
 return [...terms].map(([name,types])=>`${types}:${name}`).join('|');
}
function cards(state,counties,dictionary,references,searchCards){
 return `<ul class="county-hub-grid${references?' county-area-grid':''}" data-county-state="${state.id}">${counties.map(county=>{
  const region=state.regions.find(item=>item.slugs.includes(county.slug));
  const anchor=county.anchor&&county.anchor!==county.name?` <span>(${e(county.anchor)})</span>`:'';
  const packed=searchCards?'':packCountySearch(countySearchText(county,state,region),dictionary);
  const search=searchCards?'':packed;
  // Combined cards use DOM order. HTML permits the li end tag to be omitted
  // before the next li or the end of its ul; the parsed list stays identical.
  return `<li data-cs="${e(search)}">${references?areaDetails(county,state,references):`<a data-cl href="${e(countyServicePath(county,state))}">${e(countyAreaName(county))}${anchor}</a>`}${searchCards?'':'</li>'}`;
 }).join('')}</ul>`;
}
export function directoryControls(state){
 const count=state?state.counties.length:serviceStates.reduce((total,item)=>total+item.counties.length,0);
 const plural=state?.areaPlural||'service areas';
 const example=({idaho:'Boise city or Ada county',montana:'Billings city or Silver Bow county',colorado:'Denver or Boulder county',utah:'Salt Lake City or Utah county','puerto-rico':'Añasco municipio or Santurce barrio',texas:'Dallas, Travis County, or El Paso',louisiana:'Lafayette parish or Houma city',arkansas:'Little Rock or Springdale city',wisconsin:'Brookfield city or Brookfield town',illinois:'Naperville or Cicero township',mississippi:'Jackson or Oxford',alabama:'Huntsville or Fairhope',georgia:'Atlanta or Athens', 'south-carolina':'Charleston or Summerville',florida:'Miami or Longboat Key','new-york':'Ithaca or St. Lawrence',pennsylvania:'Harrisburg or State College',ohio:'Toledo or Yellow Springs','new-jersey':'Princeton or Paramus',connecticut:'Hartford or Groton','rhode-island':'Warwick or Bristol',massachusetts:'Boston or Amherst',delaware:'Newark or Smyrna',vermont:'Burlington or St. Albans','new-hampshire':'Concord or Coös',maine:'Portland or Bangor',maryland:'Baltimore city or Towson',virginia:'Richmond city or Fairfax county','west-virginia':'Charleston or Harpers Ferry',michigan:'Detroit or Bloomfield township','district-of-columbia':'Georgetown or Ward 3',indiana:'Indianapolis or Bloomington',kentucky:'Louisville or Lexington',tennessee:'Nashville or Knoxville','north-carolina':'Charlotte or Asheville'})[state?.id]||'Newark DE or Burlington VT';
 return `<div class="county-filter" data-area-plural="${plural}" data-county-filter-controls><p id="county-search-help">Search a place name; ZIP codes are not supported.${state?'':' Choose a state, district or territory to narrow the results.'}</p>${state?'':`<div class="county-state-filter"><label for="county-state">State, district or territory</label><select id="county-state" data-county-state-filter aria-controls="counties" disabled><option value="">All ${serviceRegionLabel}</option>${serviceStates.toSorted((a,b)=>a.name.localeCompare(b.name,'en')).map(item=>`<option value="${item.id}">${item.name}</option>`).join('')}</select></div>`}<div class="county-search-control"><label for="county-search">County, parish, municipio, region or community</label><div class="county-filter-row"><input id="county-search" type="search" maxlength="100" autocomplete="off" placeholder="For example, ${example}" aria-describedby="county-search-help" aria-controls="counties" disabled><button type="button" class="button button-secondary" disabled>Clear</button></div></div><p class="county-filter-status" role="status" aria-live="polite" aria-atomic="true">Browse all ${count} ${plural} below.</p><noscript><p>Search needs JavaScript. Open the lists below to browse every service area.</p></noscript></div>`;
}
function compressSearchPayload(value,{dense=false}={}){
 const compressed=gzipSync(value,{level:9});
 // RFC 1952 OS=255 (unknown) removes host metadata from identical builds.
 compressed[9]=255;
 return dense?{encoding:'gzip-base91',data:packCountyBase91(compressed)}:{encoding:'gzip-base64',data:compressed.toString('base64')};
}
let combinedSearchAsset;
// One content-addressed static file carries the same dictionary and ordered
// columns as the former inline payload. It is fetched only when search is used.
export function countySearchAsset(){
 if(combinedSearchAsset)return combinedSearchAsset;
 const states=serviceStates.toSorted((a,b)=>a.name.localeCompare(b.name,'en'));
 const terms=states.flatMap(state=>state.counties.toSorted((a,b)=>a.name.localeCompare(b.name)).map(county=>countySearchText(county,state,state.regions.find(region=>region.slugs.includes(county.slug)))));
 const names=[...new Set(terms.flatMap(card=>card.split('|').map(term=>term.slice(term.indexOf(':')+1))))].sort();
 const dictionary={names,indices:new Map(names.map((name,index)=>[name,index]))};
 const nameBytes=Buffer.from(packCountyNames(names)),header=Buffer.alloc(4);header.writeUInt32LE(nameBytes.length);
 const columns=packCountySearchCards(terms.map(card=>packCountySearch(card,dictionary)),{relative:true});
 const bytes=gzipSync(Buffer.concat([header,nameBytes,columns]),{level:9});bytes[9]=255;
 const path='/assets/county-search-'+createHash('sha256').update(bytes).digest('hex').slice(0,20)+'.bin';
 return combinedSearchAsset={path,bytes};
}
export function countyDirectory(state,{compact=false}={}){
 const states=state?[state]:serviceStates.toSorted((a,b)=>a.name.localeCompare(b.name,'en'));
 const references=state?hubReferences(state):null;
 // Repeated place names across counties share a page-local dictionary. The
 // visible links remain ordinary HTML, including when JavaScript is disabled.
 const placeNames=state?[...new Set(states.flatMap(item=>item.counties.flatMap(county=>countySearchText(county,item,item.regions.find(region=>region.slugs.includes(county.slug))).split('|').map(term=>term.slice(term.indexOf(':')+1)))))].sort():[];
 const dictionary={names:placeNames,indices:new Map(placeNames.map((name,index)=>[name,index]))};
 const packedNames=packCountyNames(dictionary.names);
 const namePayload=packedNames.length>20_000?compressSearchPayload(packedNames,{dense:!state}):packedNames;
 // The combined finder shares one compressed term stream in native card order;
 // all visible links remain ordinary, browsable HTML.
 const searchCards=!state;
 const sections=state?state.regions.map(region=>({id:region.id,name:region.name,count:region.slugs.length,plural:state.areaPlural,html:cards(state,regionCounties(state,region),dictionary,references)})):states.map(item=>({id:item.id,name:item.name,count:item.counties.length,plural:item.areaPlural,html:cards(item,[...item.counties].sort((a,b)=>a.name.localeCompare(b.name)),dictionary,undefined,searchCards)}));
 const foldBrowse=compact||!!state;
 const alphabet=state&&state.counties.length>30?[...new Map([...state.counties].sort((a,b)=>a.name.localeCompare(b.name,'en')).map(county=>[county.name.charAt(0).toUpperCase(),county]).reverse()).entries()].reverse():[];
 const alphabetLinks=alphabet.length?`<nav class="county-alphabet" aria-label="Browse ${e(state.name)} areas by letter">${alphabet.map(([letter,county])=>`<a href="#${e(county.slug)}">${e(letter)}</a>`).join('')}</nav>`:'';
 const cardPayload=searchCards?`<script type="application/json" data-county-search-asset>${JSON.stringify({path:countySearchAsset().path,format:'columns-delta-v1'})}</script>`:'';
 return directoryControls(state)+cardPayload+(state?`<script type="application/json" data-county-place-names>${JSON.stringify(namePayload)}</script>`:'')+`<section class="county-search-results" data-county-results hidden aria-label="Service area search results"><h2>Best matches</h2><p data-county-multiple hidden>Some places extend into more than one county or municipio; other places share a name. Check each matching area and use the actual address when a boundary matters.</p><ul class="county-result-list" data-county-best></ul><details hidden><summary>Other matching areas</summary><ul class="county-result-list" data-county-more></ul></details></section>${compact?serviceStateCards():''}${alphabetLinks}${foldBrowse?'<details class="county-browse-all" data-county-browse-all><summary>Browse all service areas</summary>':''}<div id="counties" data-county-directory>${sections.map(section=>`<details class="county-region county-section" id="${section.id}"><summary>${e(section.name)} (${section.count} ${section.plural})</summary>${section.html}</details>`).join('')}</div>${foldBrowse?'</details>':''}<div class="county-search-empty" data-county-empty hidden><p><strong>No service areas match that search.</strong></p><p>Try a county, municipio, region or community name${state?'':', or choose a different state, district or territory'}. ZIP codes aren't supported. Clear the search to browse ${state?'the '+state.name+' '+state.areaPlural:'all service areas'}.</p></div>`+(references?.html||'');
}
export function serviceStateCards(){
 return `<nav class="state-area-links" aria-label="State, district and territory directories" data-state-directory-links><h2>Browse by state or territory</h2><ul>${serviceStates.toSorted((a,b)=>a.name.localeCompare(b.name,'en')).map(state=>`<li><a href="${e(state.path)}"><span>${e(state.name)}</span><small>${state.counties.length} ${e(state.areaPlural)}</small></a></li>`).join('')}</ul></nav>`;
}
