import {escapeHtml as e} from './shared.mjs';
import {normalizeCountyQuery,parseCountyQuery,packCountySearch,packCountyNames} from './assets/county-directory.js';
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
export const countyAreaName=county=>county.areaType==='Federal District'?'Washington, DC':county.areaType==='Independent City'?`${county.name} City`:`${county.name} ${county.areaType||'County'}`;
export const countyLabel=county=>county.boroughLabel?`${county.boroughLabel} · ${county.name} County`:({kings:'Brooklyn · Kings County','new-york':'Manhattan · New York County',richmond:'Staten Island · Richmond County'})[county.slug]||countyAreaName(county);
export const regionCounties=(state,region)=>region.slugs.map(slug=>state.counties.find(county=>county.slug===slug)).filter(Boolean);
export function serviceAreaDataForPath(path){
 for(const state of serviceStates){const county=state.counties.find(item=>countyPath(item,state)===path);if(county)return {state,county};}
 return null;
}
const a=(path,label)=>`<a href="${e(path)}">${e(label)}</a>`;
const placeTypeLabels={City:'Cities',Town:'Towns',Village:'Villages',Borough:'Boroughs',Township:'Townships','Charter township':'Charter townships',Corporation:'Corporations','Consolidated city-county government':'Consolidated city-county governments','Urban county government':'Urban county governments','Metropolitan government':'Metropolitan governments','Inactive incorporated town':'Inactive incorporated towns','Town with suspended charter':'Towns with suspended charters','Census-designated place':'Census-designated places',Neighborhood:'Selected neighborhoods','Council ward':'Council wards'};
const sourceUrls=g=>[...new Set([...(g.sources||[]),...(g.communities||[]).flatMap(item=>[item.source,...(item.sources||[]),...(item.additionalSources||[])]),...(g.administrativeDistricts||[]).map(item=>item.source),...(g.municipalityDetails||[]).flatMap(item=>[item.source,...(item.sources||[]),...(item.additionalSources||[]),...(item.governmentTypeSources||[])])].filter(url=>typeof url==='string'&&/^https?:\/\//.test(url)))];
function sourceLabel(url){
 const parsed=new URL(url),name=decodeURIComponent(parsed.pathname.split('/').filter(Boolean).at(-1)||'');
 if(url.includes('tigerweb_acs26_county_'))return 'U.S. Census: counties and equivalents';
 if(url.includes('tigerweb_acs26_incplace_'))return 'U.S. Census: incorporated places';
 if(url.includes('tigerweb_acs26_cdp_'))return 'U.S. Census: Census-designated places';
 if(url.includes('tigerweb_acs26_cousub_'))return 'U.S. Census: county subdivisions';
 if(url.includes('public_grfc_cur26_'))return 'U.S. Census: 2026 place/county relationships';
 if(url.includes('DCGIS_DATA/Administrative_Other_Boundaries'))return 'DC GIS: Council ward records';
 return parsed.hostname.replace(/^www\./,'')+(name?' — '+name.replace(/[-_]/g,' ').replace(/\.(?:html?|aspx?|pdf)$/i,''):'');
}
// Each distinct set of source records and definitions is printed once per hub.
// Area entries link to their own reference set; no external requests power search.
function hubReferences(state){
 const sources=[],notes=[],sets=[],areaSets=new Map();
 const index=(values,value)=>{let i=values.indexOf(value);if(i<0)i=values.push(value)-1;return i+1;};
 for(const county of state.counties){
  const g=state.geography[county.slug],note=index(notes,g.directoryNote||(g.borough?'These are neighborhoods within New York City, not separate municipalities.':'Town and village names can overlap. Communities are listed separately from municipalities; use the actual address when a boundary matters.')),sourceIds=sourceUrls(g).map(url=>index(sources,url));
  const value=JSON.stringify({note,sourceIds}),id=index(sets,value);areaSets.set(county.slug,id);
 }
 const noteMarkup=notes.map((note,i)=>{
  const base=notes.findIndex((other,j)=>j<i&&note.startsWith(other+' '));
  const text=base<0?e(note):`${a('#geography-note-'+(base+1),'General place definitions')}. ${e(note.slice(notes[base].length+1))}`;
  return `<p id="geography-note-${i+1}">${text}</p>`;
 }).join('');
 const html=`<section class="county-reference-library" id="directory-sources"><h2>Place types and official sources</h2><p>Place lists follow the cited geography records and documented local updates. They are a reference for finding an area; they do not establish a business address or a travel boundary.</p>${noteMarkup}<details class="county-source-index"><summary>Source records (${sources.length})</summary><ol>${sources.map((url,i)=>`<li id="geography-source-${i+1}">${a(url,sourceLabel(url))}</li>`).join('')}</ol></details><details class="county-reference-sets"><summary>References by directory entry</summary><ul>${sets.map((value,i)=>{const set=JSON.parse(value);return `<li id="geography-reference-${i+1}">Reference ${i+1}: ${a('#geography-note-'+set.note,'place definitions')} · ${set.sourceIds.map(id=>a('#geography-source-'+id,'source '+id)).join(', ')}</li>`;}).join('')}</ul></details></section>`;
 return {areaSets,html};
}
function areaDetails(county,state,references){
 const g=state.geography[county.slug],groups=new Map();
 const add=(type,place)=>{if(!groups.has(type))groups.set(type,[]);groups.get(type).push(place);};
 for(const place of g.municipalityDetails||[])add(place.type,place);
 if(!g.municipalityDetails?.length)for(const [group,values] of Object.entries(g.municipalities||{}))for(const name of values)add(({cities:'City',towns:'Town',villages:'Village',boroughs:'Borough',townships:'Township',plantations:'Plantation',other:'Municipality'})[group]||group,{name});
 for(const place of g.communities||[]){const type=place.type||'Community';add(type[0].toUpperCase()+type.slice(1),place);}
 for(const place of g.administrativeDistricts||[])add(place.type||'Ward',place);
 const lists=[...groups].map(([type,places])=>`<div><h3>${e(placeTypeLabels[type]||type)}</h3><ul class="county-place-list">${places.map(place=>{const notes=[...new Set([place.note,place.governmentStatus,place.town?'In the Town of '+place.town+'.':null].filter(Boolean))];return `<li>${e(place.name)}${notes.length?` <span class="county-place-note">${e(notes.join(' '))}</span>`:''}</li>`;}).join('')}</ul></div>`).join('');
 const aliases=(g.aliases||[]).filter(alias=>alias.note).map(alias=>`<li>${e(alias.name)}${alias.type?' ('+e(alias.type)+')':''}: ${e(alias.note)}</li>`).join('');
 const area=countyAreaName(county),type=county.areaType==='Independent City'?'Independent city; separate from surrounding counties.':county.areaType==='Federal District'?'Federal district and Census county equivalent. Wards and neighborhoods are separate categories below.':county.areaType==='Planning Region'?'Planning region and current Census county equivalent; distinct from the former county boundaries.':'County directory. Places crossing a county boundary may appear in more than one entry.';
 const note=countyLocalNotes[state.id+'/'+county.slug]||county.geographyNote;
 const localNote=note?`<p class="county-geography-note">${e(note)}</p>`:'';
 const guides=areaGuideLinks[state.id+'/'+county.slug]||[];
 const service=locationServiceForArea(state.id+'/'+county.slug);
 const serviceLink=service?`<p class="county-commercial-link">${a(service.path,'Website design for '+service.market)} — project choices, prices and working with the studio.</p>`:'';
 const guideLinks=serviceLink+(guides.length?`<div class="county-guide-links"><h3>Website planning with local examples</h3><ul>${guides.map(guide=>`<li>${a(guide.path,guide.title)}</li>`).join('')}</ul></div>`:'');
 const isErie=state.id==='new-york'&&county.slug==='erie';
 const worksheet=county.directoryOnly?'':`<p><a href="/assets/county-briefs/${state.id==='new-york'?'':state.id+'-'}${e(county.slug)}.txt" download>General website-planning worksheet (TXT)</a>. Optional fictional example; the planning principles apply in many places.</p>`;
 return `<details class="county-area-detail" id="${e(county.slug)}" data-county-area><summary>${e(countyLabel(county))}</summary><div class="county-area-content"><p>${e(type)}</p>${localNote}${lists?`<div class="county-directory">${lists}</div>`:'<p>No incorporated municipalities or Census-designated places are listed in the cited records.</p>'}${aliases?`<div class="county-alias-notes"><h3>Other names and status notes</h3><ul>${aliases}</ul></div>`:''}<p>${a('#geography-reference-'+references.areaSets.get(county.slug),'Place definitions and sources')} · <a class="county-link" data-county-link href="${e(countyPath(county,state))}">${e(area)}</a> <span>(${isErie?'Buffalo studio and local services':'link to this entry'})</span></p>${guideLinks}${worksheet}</div></details>`;
}
export function countySearchText(county,state,region){
 const g=state.geography[county.slug];
 const types={cities:'c',towns:'t',villages:'v',boroughs:'b',townships:'s',plantations:'l',other:'m'};
 const terms=new Map();
 const add=(name,type)=>{const value=normalizeCountyQuery(name||'');if(value)terms.set(value,[...new Set((terms.get(value)||'')+type)].join(''));};
 add(county.name,county.areaType==='Federal District'?'d':county.areaType==='Planning Region'?'r':county.areaType==='Independent City'?'i':'y');
 for(const alias of g?.aliases||[]){
  const type=({city:'c',town:'t',village:'v',borough:'b',township:'s',plantation:'l',municipality:'m','municipality name variant':'m',district:'d',neighborhood:'n',ward:'w'})[alias.type?.toLowerCase()]||'p';
  add(alias.name,type);
  // A historical alias may include the same type words the query parser removes.
  // Keep its searchable name as well as the complete, source-qualified alias.
  const parsed=parseCountyQuery(alias.name);if(parsed.type)add(parsed.query,type);
 }
 for(const [group,names] of Object.entries(g?.municipalities||{}))for(const name of names)add(name,types[group]||'p');
 for(const place of g?.municipalityDetails||[])if(place.type==='Charter township')add(place.name,'h');
 for(const place of g?.communities||[])add(place.name,place.type==='Neighborhood'?'n':place.type==='Census-designated place'?'x':'p');
 for(const district of g?.administrativeDistricts||[]){add(district.name,'w');add(district.name.replace(/^Ward\s+/i,''),'w');}
 for(const anchor of (county.anchor||'').split(/\s*(?:,|&)\s*/))add(anchor,'a');
 for(const place of [county.displayName,county.anchor,region?.name]){
  const value=normalizeCountyQuery(place||'');if(value&&!terms.has(value))add(value,'p');
 }
 return [...terms].map(([name,types])=>`${types}:${name}`).join('|');
}
function cards(state,counties,dictionary,references){
 return `<ul class="county-hub-grid${references?' county-area-grid':''}" data-county-state="${state.id}">${counties.map(county=>{
  const region=state.regions.find(item=>item.slugs.includes(county.slug));
  const anchor=county.anchor&&county.anchor!==county.name?` <span>(${e(county.anchor)})</span>`:'';
  return `<li data-county-search="${e(packCountySearch(countySearchText(county,state,region),dictionary))}">${references?areaDetails(county,state,references):`<a class="county-link" data-county-link href="${e(countyPath(county,state))}">${e(countyAreaName(county))}${anchor}</a>`}</li>`;
 }).join('')}</ul>`;
}
export function directoryControls(state){
 const count=state?state.counties.length:serviceStates.reduce((total,item)=>total+item.counties.length,0);
 const plural=state?.areaPlural||'service areas';
 const example=({florida:'Miami or Longboat Key','new-york':'Ithaca or St. Lawrence',pennsylvania:'Harrisburg or State College',ohio:'Toledo or Yellow Springs','new-jersey':'Princeton or Paramus',connecticut:'Hartford or Groton','rhode-island':'Warwick or Bristol',massachusetts:'Boston or Amherst',delaware:'Newark or Smyrna',vermont:'Burlington or St. Albans','new-hampshire':'Concord or Coös',maine:'Portland or Bangor',maryland:'Baltimore city or Towson',virginia:'Richmond city or Fairfax county','west-virginia':'Charleston or Harpers Ferry',michigan:'Detroit or Bloomfield township','district-of-columbia':'Georgetown or Ward 3',indiana:'Indianapolis or Bloomington',kentucky:'Louisville or Lexington',tennessee:'Nashville or Knoxville','north-carolina':'Charlotte or Asheville'})[state?.id]||'Newark DE or Burlington VT';
 return `<div class="county-filter" data-area-plural="${plural}" data-county-filter-controls><p id="county-search-help">Search a county, planning region, city, township or community; ZIP codes are not supported.${state?'':' Add a state name or abbreviation, or DC, to narrow a shared name.'}</p>${state?'':`<div class="county-state-filter"><label for="county-state">State or district</label><select id="county-state" data-county-state-filter aria-controls="counties" disabled><option value="">All ${serviceRegionLabel}</option>${serviceStates.map(item=>`<option value="${item.id}">${item.name}</option>`).join('')}</select></div>`}<div class="county-search-control"><label for="county-search">County, region or community</label><div class="county-filter-row"><input id="county-search" type="search" maxlength="100" autocomplete="off" placeholder="For example, ${example}" aria-describedby="county-search-help" aria-controls="counties" disabled><button type="button" class="button button-secondary" disabled>Clear</button></div></div><p class="county-filter-status" role="status" aria-live="polite" aria-atomic="true">Browse all ${count} ${plural} below.</p><noscript><p>Search needs JavaScript. Open the lists below to browse every service area.</p></noscript></div>`;
}
export function countyDirectory(state){
 const states=state?[state]:serviceStates;
 const references=state?hubReferences(state):null;
 // Repeated place names across counties share a page-local dictionary. The
 // visible links remain ordinary HTML, including when JavaScript is disabled.
 const placeNames=[...new Set(states.flatMap(item=>item.counties.flatMap(county=>countySearchText(county,item,item.regions.find(region=>region.slugs.includes(county.slug))).split('|').map(term=>term.slice(term.indexOf(':')+1)))))].sort();
 const dictionary={names:placeNames,indices:new Map(placeNames.map((name,index)=>[name,index]))};
 const sections=state?state.regions.map(region=>({id:region.id,name:region.name,count:region.slugs.length,plural:state.areaPlural,html:cards(state,regionCounties(state,region),dictionary,references)})):states.map(item=>({id:item.id,name:item.name,count:item.counties.length,plural:item.areaPlural,html:cards(item,[...item.counties].sort((a,b)=>a.name.localeCompare(b.name)),dictionary)}));
 return directoryControls(state)+`<script type="application/json" data-county-place-names>${JSON.stringify(packCountyNames(dictionary.names))}</script><section class="county-search-results" data-county-results hidden aria-label="Service area search results"><h2>Best matches</h2><ul class="county-result-list" data-county-best></ul><details hidden><summary>Other matching areas</summary><ul class="county-result-list" data-county-more></ul></details></section><div id="counties" data-county-directory>${sections.map(section=>`<details class="county-region county-section" id="${section.id}"><summary>${e(section.name)} (${section.count} ${section.plural})</summary>${section.html}</details>`).join('')}</div><div class="county-search-empty" data-county-empty hidden><p><strong>No service areas match that search.</strong></p><p>Try a county, region or community name${state?'':', or choose a different state or district'}. ZIP codes aren't supported. Clear the search to browse ${state?'the '+state.name+' '+state.areaPlural:'all service areas'}.</p></div>`+(references?.html||'');
}
export function serviceStateCards(){
 return `<div class="state-area-cards">${serviceStates.map(state=>`<article><p class="eyebrow">${state.counties.length} ${state.areaPlural}</p><h2>${e(state.name)}</h2><p>${({'new-york':'From Buffalo and the Finger Lakes to the Hudson Valley, New York City and Long Island.',pennsylvania:'From Erie and Pittsburgh to central Pennsylvania, the Lehigh Valley and Philadelphia.',ohio:'From Cleveland and Toledo to Columbus, Cincinnati, Dayton and communities across Ohio.','new-jersey':'Find a county entry for communities from Newark and Jersey City to Trenton, Vineland and Cape May.',connecticut:'Find your town or city within the nine current planning regions, including Hartford, New Haven and Stamford.','rhode-island':'Browse the five counties and their cities and towns, including Providence, Warwick and Newport.',massachusetts:'Find cities and towns across the 14 counties, including Boston, Worcester, Springfield and the islands.',delaware:'Browse New Castle, Kent and Sussex counties, including municipalities that cross county lines.',vermont:'Find a county entry for cities, towns and villages, including Burlington, Rutland and Montpelier.','new-hampshire':'Browse ten county entries for cities, towns and unincorporated places, including Manchester, Concord and Portsmouth.',maine:'Browse 16 county entries with cities, towns, plantations and other places, including Portland, Bangor and Augusta.',maryland:'Browse 23 county entries and a separate Baltimore City entry, with incorporated municipalities and other communities.',virginia:'Browse 95 counties and 38 independent cities, including Richmond, Norfolk, Roanoke and communities across Virginia.','west-virginia':'Browse 55 county entries, including Charleston, Huntington, Morgantown and the Eastern Panhandle.',michigan:'Browse 83 counties with cities, villages and townships, from Detroit and Grand Rapids to the Upper Peninsula.','district-of-columbia':'Explore one Washington, DC directory with selected neighborhoods and the eight wards identified separately.',indiana:'Browse 92 county entries with cities, towns and townships, including Indianapolis, Fort Wayne and Evansville.',kentucky:'Browse 120 counties, including Louisville, Lexington, Bowling Green and communities across Kentucky.',tennessee:'Browse 95 county entries, including Memphis, Nashville, Knoxville and Chattanooga.','north-carolina':'Browse 100 counties, including Charlotte, Raleigh, Greensboro, Asheville and coastal communities.'})[state.id]}</p><p>${a(state.path,'Explore '+state.name)}</p></article>`).join('')}</div>`;
}
