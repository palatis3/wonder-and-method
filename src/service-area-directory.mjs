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
import {directorySourceLabel,directoryReadableNote,directorySentences,sharedDirectoryDefinition,directoryTechnicalSentence,directoryLocalNote,directoryPlaceNote,directoryAliasNote} from './directory-editorial-notes.mjs';
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
const placeTypeLabels={'City and Borough':'City-and-borough governments','Census subarea':'Census subareas (statistical)','Consolidated city-county':'Consolidated city-county governments','Consolidated city balance':'Consolidated city balances (statistical)',Barrio:'Barrios','Barrio-pueblo':'Barrios-pueblo',Subbarrio:'Subbarrios','Zona urbana':'Zonas urbanas (Census-designated places)',Comunidad:'Comunidades (Census-designated places)',District:'Districts',City:'Cities',Town:'Towns',Village:'Villages',Borough:'Boroughs',Township:'Townships','Charter township':'Charter townships',Corporation:'Corporations','Consolidated city-county government':'Consolidated city-county governments','Urban county government':'Urban county governments','Metropolitan government':'Metropolitan governments','Inactive incorporated town':'Inactive incorporated towns','Town with suspended charter':'Towns with suspended charters','Census-designated place':'Census-designated places',Neighborhood:'Selected neighborhoods','Council ward':'Council wards',Precinct:'Precincts','Election precinct':'Election precincts','Census county division':'Census county divisions (statistical)'};
const countLabel=(count,plural)=>count===1?({'counties':'county','service areas':'service area','parishes':'parish','municipios':'municipio','planning regions':'planning region'}[plural]||plural):plural;
const searchLabel=state=>({alaska:'Borough, census area, city or community','district-of-columbia':'Ward or neighborhood','puerto-rico':'Municipio, barrio, subbarrio or community',louisiana:'Parish, city, town, village or district',connecticut:'Town, city, borough or planning region',hawaii:'County or community',idaho:'County, city or community',kentucky:'County, city or community',maine:'County, town, city, plantation or community','new-jersey':'County, municipality or community',michigan:'County, city, village or township',indiana:'County, city, town or township',arkansas:'County, city, town or township',iowa:'County, city or township',minnesota:'County, city or township',kansas:'County, city or township',nebraska:'County, city, village or township','north-dakota':'County, city or township','south-dakota':'County, city, town or township',missouri:'County, city, town or township',wisconsin:'County, town, city, village or community','new-york':'County, city, town, village, borough or community',delaware:'County, city, town, village or community',mississippi:'County, city, town, village or community','west-virginia':'County, city, town, village or community'})[state?.id]||(state?'County, city, town or community':'Place');
// Preserve the full recorded status in the reference library, while keeping
// repeated list annotations readable and retaining distinct legal statuses.
const readableStatus=status=>(status||'')
 .replace(/ \(Census (?:functional )?status [A-Z]\)/g,'')
 .replace('Statistical census county division (CCD), Census functional status S and class Z5; not a municipal government or an active administrative district.','Statistical county division; not a municipal government or active administrative district.')
 .replace(' County-layer functional status C and class H6 coexist with active city-layer status A/C1.','')
 .replace('Census F/C8, not a separate municipal government.','not a separate municipal government.')
 .replace('Legal subdivision with no functioning separate government; not a municipality. Barrios and barrios-pueblo divide municipios; subbarrios divide barrios or barrios-pueblo.','Legal subdivision; no separate municipal government.')
 .replace('Statistical Census-designated place; not a municipal government. A zona urbana represents a municipio governmental center; a comunidad represents another settlement.','Statistical place; not a municipal government.')
 .replace('Active government providing primary general-purpose functions.','Active government.')
 .replace('Active government subordinate to another unit of government.','Active; subordinate to another government.')
 .replace('Statistical CCD with no legal function; not a municipal government or active administrative district.','Statistical county division; no municipal government.')
 .replace('Active consolidated city-borough government, coextensive with the named county-equivalent; duplicate geographic layers must not be added together.','One active consolidated city-borough government; the city and county-equivalent Census records cover the same area.')
 .replace('; these overlapping layers must not be added together.','. These are overlapping Census areas.')
 .replace('Inactive governmental unit; not represented as an active township government.','Inactive township government.')
 .replace('Nonfunctioning legal entity; not an active township government.','Legal subdivision; no active township government.');
const sourceUrls=g=>[...new Set([...(g.sources||[]),...(g.communities||[]).flatMap(item=>[item.source,...(item.sources||[]),...(item.additionalSources||[])]),...(g.administrativeDistricts||[]).map(item=>item.source),...(g.municipalityDetails||[]).flatMap(item=>[item.source,...(item.sources||[]),...(item.additionalSources||[]),...(item.governmentTypeSources||[])])].filter(url=>typeof url==='string'&&/^https?:\/\//.test(url)))];
function sourceLabel(url,context,state){
 const editorial=directorySourceLabel(url,context,state);if(editorial)return editorial;
 const parsed=new URL(url);
 if(url.includes('tigerweb_acs26_county_'))return 'U.S. Census: counties and equivalents';
 if(url.includes('tigerweb_acs26_incplace_'))return 'U.S. Census: incorporated places';
 if(url.includes('tigerweb_acs26_cdp_'))return 'U.S. Census: Census-designated places';
 if(url.includes('tigerweb_acs26_concity_'))return 'U.S. Census: consolidated cities';
 if(url.includes('tigerweb_acs26_cousub_'))return 'U.S. Census: county subdivisions';
 if(url.includes('public_grfc_cur26_'))return 'U.S. Census: 2026 place/county relationships';
 if(url.includes('DCGIS_DATA/Administrative_Other_Boundaries'))return 'DC GIS: Council ward records';
 const filename=decodeURIComponent(parsed.pathname.split('/').filter(Boolean).at(-1)||'').replace(/\.(?:html?|pdf|aspx)$/i,'').replace(/[-_]+/g,' ');
 return context+': '+(filename&&filename.length<100?filename+' — ':'place and government reference — ')+parsed.hostname.replace(/^www\./,'');
}
const noteParagraphs=(note,state,summary='Source methodology and record limitations')=>{
 const sentences=directorySentences(directoryReadableNote(note,state)),technical=[],plain=[];
 for(const sentence of sentences)(directoryTechnicalSentence(sentence)?technical:plain).push(sentence);
 const paragraphs=plain.reduce((groups,sentence)=>{if(!groups.length||groups.at(-1).length>420)groups.push(sentence);else groups[groups.length-1]+=' '+sentence;return groups;},[]).map(paragraph=>`<p>${e(paragraph)}</p>`).join('');
 return paragraphs+(technical.length?`<details><summary>${e(summary)}</summary>${technical.map(sentence=>`<p>${e(sentence)}</p>`).join('')}</details>`:'');
};
// Each distinct set of source records and definitions is printed once per hub.
// Area entries link to their own reference set; no external requests power search.
function hubReferences(state){
 const sources=[],notes=[],sets=[],areaSets=new Map(),sourceAreas=new Map(),sourceTitles=new Map();
 const index=(values,value)=>{let i=values.indexOf(value);if(i<0)i=values.push(value)-1;return i+1;};
 for(const county of state.counties){
  const g=state.geography[county.slug],note=index(notes,g.directoryNote||(g.borough?'These are neighborhoods within New York City, not separate municipalities.':'Town and village names can overlap. Communities are listed separately from municipalities; use the actual address when a boundary matters.')),sourceIds=sourceUrls(g).map(url=>index(sources,url));
  for(const [i,url] of (g.sources||[]).entries())if(g.sourceNames?.[i]&&!sourceTitles.has(url))sourceTitles.set(url,g.sourceNames[i]);
  for(const url of sourceUrls(g)){if(!sourceAreas.has(url))sourceAreas.set(url,[]);sourceAreas.get(url).push(countyAreaName(county));}
  const value=JSON.stringify({note,sourceIds}),id=index(sets,value);areaSets.set(county.slug,id);
 }
 const seenSentences=new Set();
 const noteMarkup=notes.map((note,i)=>{
  const covered=state.counties.filter(county=>{const id=areaSets.get(county.slug);return JSON.parse(sets[id-1]).note===i+1;}).map(county=>countyAreaName(county));
  let text=directoryReadableNote(note,state).replace('This county has no incorporated municipality in the January 2026 Census inventory;',covered.length===1?covered[0]+' has no incorporated municipality in the January 2026 Census inventory;':'These counties have no incorporated municipality in the January 2026 Census inventory: '+covered.join(', ')+';')
   .replace('This census area has no county-equivalent municipal government.','These census areas have no county-equivalent municipal government: '+covered.join(', ')+'.');
  const sentences=directorySentences(text).filter(sentence=>{if(sharedDirectoryDefinition(sentence)&&seenSentences.has(sentence))return false;seenSentences.add(sentence);return true;});
  if(!sentences.length)return `<span id="geography-note-${i+1}"></span>`;
  const namedEvidence=state.id==='kentucky'&&covered.length===1&&covered[0]==='Owen County'?'Monterey: dissolution evidence':state.id==='north-carolina'&&covered.length===1?({'Edgecombe County':'Speed: transition evidence','Gaston County':'Dellview and Spencer Mountain: government-status evidence','Wayne County':'Eureka: restored-status evidence'}[covered[0]]):null;
  if(namedEvidence)return `<div id="geography-note-${i+1}"><details><summary>${e(namedEvidence+' — '+covered[0])}</summary>${sentences.map(sentence=>`<p>${e(sentence)}</p>`).join('')}</details></div>`;
  const title=i===0?'Directory scope and place definitions':note.includes('This county has no incorporated municipality')?'Counties without incorporated municipalities':note.includes('This census area has no county-equivalent municipal government')?'Census-area government status':covered.length<=7?covered.join(', '):'Additional geography notes';
  return `<div id="geography-note-${i+1}"><h3>${e(title)}</h3>${noteParagraphs(sentences.join(' '),state,covered.length<=7?title+': record details':'Geography record details')}</div>`;
 }).join('');
 const statuses=[...new Set(state.counties.flatMap(county=>{const g=state.geography[county.slug];return [...g.municipalityDetails||[],...g.communities||[],...g.administrativeDistricts||[]].map(place=>place.governmentStatus).filter(status=>status&&readableStatus(status)!==status);} ))];
 const statusNotes=statuses.length?`<details><summary>Full recorded status definitions</summary><ul>${statuses.map(status=>`<li>${e(status)}</li>`).join('')}</ul></details>`:'';
 const aliasHelp=state.id==='michigan'?'<p>Michigan name variants preserve recorded spellings and abbreviations. Charter-township labels follow the cited local-government evidence rather than a generic Census township suffix; unresolved subtypes are identified beside the place.</p>':'';
 const html=`<section class="county-reference-library" id="directory-sources"><h2>Place types and official sources</h2><p>Place lists follow the cited geography records and documented local updates. Selected neighborhoods and informal communities are not an exhaustive address list. They are a reference for finding an area; they do not establish a business address or a travel boundary.</p>${aliasHelp}${noteMarkup}${statusNotes}<details class="county-source-index"><summary>Source records (${sources.length})</summary><ol>${sources.map((url,i)=>`<li id="geography-source-${i+1}">${a(url,sourceTitles.get(url)||sourceLabel(url,sourceAreas.get(url).length<=2?sourceAreas.get(url).join(' and '):state.name,state))}</li>`).join('')}</ol></details><details class="county-reference-sets"><summary>References by directory entry</summary><ul>${sets.map((value,i)=>{const set=JSON.parse(value);return `<li id="geography-reference-${i+1}">${e(state.counties.filter(county=>areaSets.get(county.slug)===i+1).map(county=>countyAreaName(county)).join(', '))}: ${a('#geography-note-'+set.note,'place definitions')} · ${set.sourceIds.map(id=>a('#geography-source-'+id,'source '+id)).join(', ')}</li>`;}).join('')}</ul></details></section>`;
 return {areaSets,html};
}
function areaDetails(county,state,references){
 const g=state.geography[county.slug],groups=new Map();
 const add=(type,place)=>{if(!groups.has(type))groups.set(type,[]);groups.get(type).push(place);};
 for(const place of g.municipalityDetails||[])add(place.type,place);
 if(!g.municipalityDetails?.length)for(const [group,values] of Object.entries(g.municipalities||{}))for(const name of values)add(({cities:'City',towns:'Town',villages:'Village',boroughs:'Borough',townships:'Township',plantations:'Plantation',other:'Municipality'})[group]||group,{name});
 for(const place of g.communities||[]){const type=place.censusPlaceSubtype||place.type||'Community';add(type[0].toUpperCase()+type.slice(1),place);}
 for(const place of g.administrativeDistricts||[])add(place.type||'Ward',place);
 const lists=[...groups].map(([type,originalPlaces])=>{
  const places=originalPlaces.toSorted((a,b)=>a.name.localeCompare(b.name,'en',{numeric:true}));
  // A shared status describes this entire typed list. Mixed statuses and
  // place-specific notes stay next to the individual names.
  const statuses=new Map();for(const place of places)if(place.governmentStatus)statuses.set(place.governmentStatus,(statuses.get(place.governmentStatus)||0)+1);
  const frequent=[...statuses].sort((a,b)=>b[1]-a[1])[0];
  const sharedStatus=state.id!=='vermont'&&frequent?.[1]>1&&places.every(place=>place.governmentStatus)?frequent[0]:'';
  const mixedStatus=sharedStatus&&places.some(place=>place.governmentStatus!==sharedStatus);
  const heading=type==='Unorganized territory'&&['iowa','minnesota','north-dakota','south-dakota'].includes(state.id)?'Unorganized territories (statistical)':placeTypeLabels[type]||type;
  const identifierHelp=state.id==='minnesota'&&county.slug==='itasca'&&type==='Unorganized territory'?'<p>Numeric names below are the territory identifiers recorded by the source.</p>':state.id==='nebraska'&&county.slug==='stanton'&&/precinct/i.test(type)?'<p>The precinct abbreviations below are the recorded source labels; expanded names have not been verified here.</p>':'';
  return `<div><h3>${e(heading)}</h3>${identifierHelp}${sharedStatus?`<p class="county-place-note">${mixedStatus?'Unless marked otherwise: ':''}${e(readableStatus(sharedStatus))}</p>`:''}<ul class="county-place-list">${places.map(place=>{
   let note=directoryPlaceNote(place,state,county);
   if(state.id==='new-jersey')note=note.replace('Census supplies no legal suffix.','').trim();
   const status=place.governmentStatus===sharedStatus?'':readableStatus(place.governmentStatus);
   const annotations=state.id==='vermont'?[status,note]:[note,status];
   const notes=[...new Set([...annotations,state.id==='ohio'&&county.slug==='perry'&&place.name==='Rendville'?'Incorporated village with inactive governmental status.':null,place.town?(g.borough?'In the borough of ':'In the Town of ')+place.town+'.':null,place.parentSubdivisionName?'Within '+place.parentSubdivisionName+'.':null].filter(Boolean))];return `<li>${e(place.name)}${notes.length?` <span class="county-place-note">${e(notes.join(' '))}</span>`:''}</li>`;}).join('')}</ul></div>`;
 }).join('');
 const researchNotes=(g.municipalityDetails||[]).map(place=>{
  if(state.id==='michigan'&&county.slug==='cass'&&place.name==='Howard')return '<details><summary>Howard: status evidence and unresolved check</summary><p>Howard appears in the charter roster. A county-published August 2026 ballot proposed disincorporation; its county-linked result application was unavailable during the recorded review. August and September township minutes still use Charter Township. Filing and effective status remain unconfirmed, so this directory identifies Township without asserting a current charter or general-law subtype; the historical charter alias remains available.</p></details>';
  if(state.id==='michigan'&&place.name==='Cass Lake')return '<details><summary>Cass Lake: Census record detail</summary><p>No Census geographic identifier is assigned in this directory’s source record; the dated village organization evidence supplies the entry.</p></details>';
  if(state.id==='new-jersey'&&place.note?.includes('Census supplies no legal suffix.'))return `<details><summary>${e(place.name)}: Census naming detail</summary><p>Census supplies no legal suffix; the municipality and government form are identified from the cited records.</p></details>`;
  return '';
 }).join('');
 const aliases=(g.aliases||[]).filter(alias=>alias.note).map(alias=>`<li>${e(alias.name)}${alias.type&&!alias.name.toLowerCase().endsWith(' '+alias.type.toLowerCase())?' ('+e(alias.type)+')':''}: ${e(directoryAliasNote(alias.note,state))}</li>`).join('');
 const area=countyAreaName(county),type=county.areaType==='Census Area'?'Statistical census area and Alaska county equivalent; not an organized borough government.':county.areaType==='Borough'?'Borough directory and Alaska county equivalent. Borough government is distinct from the incorporated cities and statistical communities listed below.':county.areaType==='City and Borough'?'City and borough: an Alaska county equivalent. The government and any Census place layers are identified separately below.':county.areaType==='Municipality'?'Municipality and Alaska county equivalent. Census-designated communities below are statistical places, not separate municipal governments.':isIndependentCity(county)?'Independent city; separate from surrounding counties.':county.areaType==='Federal District'?'Federal district and Census county equivalent. Wards and neighborhoods are separate categories below.':county.areaType==='Municipio'?'Municipio directory. A municipio is a county equivalent in Puerto Rico. Barrios and subbarrios are subdivisions; Census-designated places are statistical areas, not separate municipal governments.':county.areaType==='Parish'?'Parish directory. Places crossing a parish boundary may appear in more than one entry.':county.areaType==='Planning Region'?'Planning region and current Census county equivalent; distinct from the former county boundaries.':'County directory. Places crossing a county boundary may appear in more than one entry.';
 const originalNote=countyLocalNotes[state.id+'/'+county.slug]||county.geographyNote;
 const note=directoryLocalNote(originalNote?.replace(/^[^.]+ is a (?:city|town|village|borough|township); [^.]+ is a (?:city|town|village|borough|township) in [^.]+\.\s*/,'').replace(/\s*(?:Confirm the actual shipment address|Use the actual class address in arrival instructions|Confirm the actual delivery address)\./g,''),state);
 const specialNote=state.id==='new-mexico'&&county.slug==='los-alamos'?'Los Alamos has a consolidated county government. Los Alamos and White Rock below are statistical communities, not separate municipal governments.':state.id==='hawaii'&&county.slug==='kalawao'?'No incorporated place or Census-designated place is recorded here. The statistical county subdivision is listed separately.':'';
 const localNote=(specialNote?`<p class="county-geography-note">${e(specialNote)}</p>`:'')+(note?`<div class="county-geography-note">${noteParagraphs(note,state,countyAreaName(county)+': record details')}</div>`:'');
 const guides=areaGuideLinks[state.id+'/'+county.slug]||[];
 const service=locationServiceForArea(state.id+'/'+county.slug);
 const commercialPath=service?.path||(state.id==='new-york'&&county.slug==='erie'?'/areas/erie-county/':null);
 const serviceLink=commercialPath?`<p class="county-commercial-link"><a data-cl href="${e(commercialPath)}">Website design for ${e(area)}</a> — project choices, prices and working with the studio.</p>`:'';
 const transferableGuide=['north-carolina/wake','virginia/arlington','massachusetts/suffolk'].includes(state.id+'/'+county.slug)?'<p>These examples come from other places. Use their inquiry and approval steps as a planning model; local requirements must be checked separately.</p>':'';
 const guideLinks=guides.length?`<div class="county-guide-links"><h3>Related planning guides</h3>${transferableGuide}<ul>${guides.map(guide=>`<li>${a(guide.path,guide.title)}</li>`).join('')}</ul></div>`:'';
 const worksheetUrl=reviewedWorksheets[state.id+'/'+county.slug];
 const worksheet=county.directoryOnly||!worksheetUrl?'':`<p><a href="${e(worksheetUrl)}" download>General website-planning worksheet (TXT)</a>. Optional fictional example; the planning principles apply in many places.</p>`;
 return `<details class="county-area-detail" id="${e(county.slug)}" data-county-area><summary>${e(countyLabel(county,state))}</summary><div class="county-area-content">${serviceLink}${state.id==='connecticut'?'':`<p>${e(type)}</p>`}${localNote}${lists?`<div class="county-directory">${lists}</div>`:'<p>No incorporated municipalities or Census-designated places are listed in the cited records.</p>'}${researchNotes}${aliases?`<div class="county-alias-notes"><h3>Other names and status notes</h3><ul>${aliases}</ul></div>`:''}<p>${a('#geography-reference-'+references.areaSets.get(county.slug),'Place definitions and sources')} · <a${commercialPath?'':' data-cl'} href="${e(state.path+'#'+county.slug)}">${commercialPath?'Link to this directory entry':e(area)+' places and sources'}</a></p>${guideLinks}${worksheet}</div></details>`;
}
export function countySearchText(county,state,region){
 const g=state.geography[county.slug];
 const types={cities:'c',towns:'t',villages:'v',boroughs:'b',townships:'s',plantations:'l',other:'m'};
 const terms=new Map();
 const add=(name,type)=>{const value=normalizeCountyQuery(name||'');if(value)terms.set(value,[...new Set((terms.get(value)||'')+type)].join(''));};
 add(county.name,county.areaType==='Borough'?'b':county.areaType==='Census Area'?'I':county.areaType==='City and Borough'?'H':county.areaType==='Municipality'?'m':county.areaType==='Federal District'?'d':county.areaType==='Parish'?'u':county.areaType==='Planning Region'?'r':county.areaType==='Municipio'?'A':isIndependentCity(county)?'i':'y');
 for(const alias of g?.aliases||[]){
  const type=({city:'c',town:'t',village:'v',borough:'b',township:'s',plantation:'l',municipality:'m','municipality name variant':'m',district:'d',neighborhood:'n',ward:'w'})[alias.type?.toLowerCase()]||'p';
  add(alias.name,type);
  // A historical alias may include the same type words the query parser removes.
  // Keep its searchable name as well as the complete, source-qualified alias.
  const parsed=parseCountyQuery(alias.name);if(parsed.type)add(parsed.query,type);
 }
 for(const [group,names] of Object.entries(g?.municipalities||{}))for(const name of names)add(name,types[group]||'p');
 for(const place of g?.municipalityDetails||[]){if(place.type==='Charter township')add(place.name,'h');if(place.type==='City and Borough')add(place.name,'H');}
 for(const place of g?.communities||[]){
  const subtype=({'Zona urbana':'E',Comunidad:'F'})[place.censusPlaceSubtype]||'';
  add(place.name,place.type==='Neighborhood'?'n':place.type==='Census-designated place'?'x'+subtype:place.type==='Consolidated city balance'?'G':'p');
 }
 for(const district of g?.administrativeDistricts||[]){
  const type=({Barrio:'B','Barrio-pueblo':'C',Subbarrio:'D','Census county division':'z','Census subarea':'J','Unorganized territory':'o','Election precinct':'e',Precinct:'q',District:'j',Township:'s',Ward:'w','Council ward':'w'})[district.type];
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
 const example=({wyoming:'Cheyenne city or Laramie county',hawaii:'Hilo CDP or Hawaii county',alaska:'Bethel city or Bethel census area',idaho:'Boise city or Ada county',montana:'Billings city or Silver Bow county',colorado:'Denver or Boulder county',utah:'Salt Lake City or Utah county','puerto-rico':'Añasco municipio or Santurce barrio',texas:'Dallas, Travis County, or El Paso',louisiana:'Lafayette parish or Houma city',arkansas:'Little Rock or Springdale city',wisconsin:'Brookfield city or Brookfield town',illinois:'Naperville or Cicero township',mississippi:'Jackson or Oxford',alabama:'Huntsville or Fairhope',georgia:'Atlanta or Athens', 'south-carolina':'Charleston or Summerville',florida:'Miami or Longboat Key','new-york':'Ithaca or St. Lawrence',pennsylvania:'Harrisburg or State College',ohio:'Toledo or Yellow Springs','new-jersey':'Princeton or Paramus',connecticut:'Hartford or Groton','rhode-island':'Warwick or Bristol',massachusetts:'Boston or Amherst',delaware:'Newark or Smyrna',vermont:'Burlington or St. Albans','new-hampshire':'Concord or Coös',maine:'Portland or Bangor',maryland:'Baltimore city or Towson',virginia:'Richmond city or Fairfax county','west-virginia':'Charleston or Harpers Ferry',michigan:'Detroit or Bloomfield township','district-of-columbia':'Georgetown or Ward 3',indiana:'Indianapolis or Bloomington',kentucky:'Louisville or Lexington',tennessee:'Nashville or Knoxville','north-carolina':'Charlotte or Asheville'})[state?.id]||'Newark DE or Burlington VT';
 return `<div class="county-filter" data-area-plural="${plural}" data-county-filter-controls><p id="county-search-help">Search a place name; ZIP codes are not supported.${state?'':' Choose a state, district or territory to narrow the results.'}</p>${state?'':`<div class="county-state-filter"><label for="county-state">State, district or territory</label><select id="county-state" data-county-state-filter aria-controls="counties" disabled><option value="">All ${serviceRegionLabel}</option>${serviceStates.toSorted((a,b)=>a.name.localeCompare(b.name,'en')).map(item=>`<option value="${item.id}">${item.name}</option>`).join('')}</select></div>`}<div class="county-search-control"><label for="county-search">${e(searchLabel(state))}</label><div class="county-filter-row"><input id="county-search" type="search" maxlength="100" autocomplete="off" placeholder="For example, ${example}" aria-describedby="county-search-help" aria-controls="counties" disabled><button type="button" class="button button-secondary" disabled>Clear</button></div></div><p class="county-filter-status" role="status" aria-live="polite" aria-atomic="true">${state?.id==='district-of-columbia'?'Browse the Washington, DC guide below.':`Browse all ${count} ${countLabel(count,plural)} below.`}</p><noscript><p>Search needs JavaScript. Open the lists below to browse every service area.</p></noscript></div>`;
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
 return directoryControls(state)+cardPayload+(state?`<script type="application/json" data-county-place-names>${JSON.stringify(namePayload)}</script>`:'')+`<section class="county-search-results" data-county-results hidden aria-label="Service area search results"><h2>Best matches</h2><p data-county-multiple hidden>${state?.id==='district-of-columbia'?'Matching wards and neighborhoods open the Washington, DC guide. Neighborhood boundaries may vary by source.':'Some places extend into more than one directory area; other places share a name. Check each matching area and use the actual address when a boundary matters.'}</p><ul class="county-result-list" data-county-best></ul><details hidden><summary>Other matching areas</summary><ul class="county-result-list" data-county-more></ul></details></section>${compact?serviceStateCards():''}${alphabetLinks}${foldBrowse?`<details class="county-browse-all" data-county-browse-all><summary>${state?.id==='district-of-columbia'?'Browse the Washington, DC guide':'Browse all service areas'}</summary>`:''}<div id="counties" data-county-directory>${sections.map(section=>`<details class="county-region county-section" id="${section.id}"><summary>${e(section.name)} (${section.count} ${countLabel(section.count,section.plural)})</summary>${section.html}</details>`).join('')}</div>${foldBrowse?'</details>':''}<div class="county-search-empty" data-county-empty hidden><p><strong>No service areas match that search.</strong></p><p>Try another place name${state?'':', or choose a different state, district or territory'}. ZIP codes aren't supported. Clear the search to browse ${state?'the '+state.name+' '+state.areaPlural:'all service areas'}.</p></div>`+(references?.html||'');
}
export function serviceStateCards(){
 return `<nav class="state-area-links" aria-label="State, district and territory directories" data-state-directory-links><h2>Browse by state, district or territory</h2><ul>${serviceStates.toSorted((a,b)=>a.name.localeCompare(b.name,'en')).map(state=>`<li><a href="${e(state.path)}"><span>${e(state.name)}</span><small>${state.counties.length} ${e(countLabel(state.counties.length,state.areaPlural))}</small></a></li>`).join('')}</ul></nav>`;
}
