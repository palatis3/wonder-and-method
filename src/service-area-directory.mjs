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
import {serviceStateInfo} from './assets/service-state-info.js';
import {northeastProfiles} from './northeast-content.mjs';
import {northeastGeography} from './northeast-geography.mjs';
import {northernExpansionGeography} from './northern-expansion-geography.mjs';

// Alphabetical browse groups are navigation, not additional geographic entities.
const browseGroups=counties=>Array.from({length:Math.ceil(counties.length/6)},(_,index)=>{
 const group=counties.slice(index*6,(index+1)*6);
 return {id:'browse-'+(index+1),name:group.length===1?group[0].name:group[0].name+' – '+group.at(-1).name,slugs:group.map(c=>c.slug)};
});

export const serviceStates=[
 {id:'new-york',name:'New York',abbreviation:'NY',path:'/areas/new-york/',counties:[{slug:'erie',name:'Erie',anchor:'Buffalo',displayName:'Buffalo & Erie County'},...countyProfiles],geography:countyGeography,regions:countyRegions},
 {id:'pennsylvania',name:'Pennsylvania',abbreviation:'PA',path:'/areas/pennsylvania/',counties:pennsylvaniaProfiles,geography:pennsylvaniaGeography,regions:pennsylvaniaRegions},
 {id:'ohio',name:'Ohio',abbreviation:'OH',path:'/areas/ohio/',counties:ohioProfiles,geography:ohioGeography,regions:ohioRegions},
 ...serviceStateInfo.slice(3).map(state=>({...state,counties:northeastProfiles[state.id],geography:northeastGeography[state.id]||northernExpansionGeography[state.id],regions:browseGroups(northeastProfiles[state.id])}))
].map(state=>({...serviceStateInfo.find(item=>item.id===state.id),...state}));
export const countyPath=(county,state=serviceStates[0])=>`/areas/${state.id==='new-york'?'':state.id+'/'}${county.slug}${county.areaType==='Independent City'?'':county.areaType==='Planning Region'?'-planning-region':'-county'}/`;
export const countyAreaName=county=>county.areaType==='Independent City'?`${county.name} City`:`${county.name} ${county.areaType||'County'}`;
export const countyLabel=county=>county.boroughLabel?`${county.boroughLabel} · ${county.name} County`:({kings:'Brooklyn · Kings County','new-york':'Manhattan · New York County',richmond:'Staten Island · Richmond County'})[county.slug]||countyAreaName(county);
export const regionCounties=(state,region)=>region.slugs.map(slug=>state.counties.find(county=>county.slug===slug)).filter(Boolean);
export function serviceAreaDataForPath(path){
 for(const state of serviceStates){const county=state.counties.find(item=>countyPath(item,state)===path);if(county)return {state,county};}
 return null;
}
const a=(path,label)=>`<a href="${e(path)}">${e(label)}</a>`;
export function countySearchText(county,state,region){
 const g=state.geography[county.slug];
 const types={cities:'c',towns:'t',villages:'v',boroughs:'b',townships:'s',plantations:'l',other:'m'};
 const terms=new Map();
 const add=(name,type)=>{const value=normalizeCountyQuery(name||'');if(value)terms.set(value,[...new Set((terms.get(value)||'')+type)].join(''));};
 add(county.name,county.areaType==='Planning Region'?'r':county.areaType==='Independent City'?'i':'y');
 for(const alias of g?.aliases||[]){
  const type=({city:'c',town:'t',village:'v',borough:'b',township:'s',plantation:'l',municipality:'m'})[alias.type]||'p';
  add(alias.name,type);
  // A historical alias may include the same type words the query parser removes.
  // Keep its searchable name as well as the complete, source-qualified alias.
  const parsed=parseCountyQuery(alias.name);if(parsed.type)add(parsed.query,type);
 }
 for(const [group,names] of Object.entries(g?.municipalities||{}))for(const name of names)add(name,types[group]||'p');
 for(const anchor of (county.anchor||'').split(/\s*(?:,|&)\s*/))add(anchor,'a');
 for(const place of [county.displayName,county.anchor,region?.name,...(g?.communities||[]).map(item=>item.name)]){
  const value=normalizeCountyQuery(place||'');if(value&&!terms.has(value))add(value,'p');
 }
 return [...terms].map(([name,types])=>`${types}:${name}`).join('|');
}
function cards(state,counties,dictionary){
 return `<ul class="county-hub-grid" data-county-state="${state.id}">${counties.map(county=>{
  const region=state.regions.find(item=>item.slugs.includes(county.slug));
  const anchor=county.anchor&&county.anchor!==county.name?` <span>(${e(county.anchor)})</span>`:'';
  return `<li data-county-search="${e(packCountySearch(countySearchText(county,state,region),dictionary))}"><a class="county-link" href="${countyPath(county,state)}">${e(countyAreaName(county))}${anchor}</a></li>`;
 }).join('')}</ul>`;
}
export function directoryControls(state){
 const count=state?state.counties.length:serviceStates.reduce((total,item)=>total+item.counties.length,0);
 const plural=state?.areaPlural||'service areas';
 const example=({'new-york':'Ithaca or St. Lawrence',pennsylvania:'Harrisburg or State College',ohio:'Toledo or Yellow Springs','new-jersey':'Princeton or Paramus',connecticut:'Hartford or Groton','rhode-island':'Warwick or Bristol',massachusetts:'Boston or Amherst',delaware:'Newark or Smyrna',vermont:'Burlington or St. Albans','new-hampshire':'Concord or Coös',maine:'Portland or Bangor',maryland:'Baltimore city or Towson'})[state?.id]||'Newark DE or Burlington VT';
 return `<div class="county-filter" data-area-plural="${plural}" data-county-filter-controls><p id="county-search-help">Search a county, planning region, city or town; ZIP codes are not supported.${state?'':' Add a state name or abbreviation to narrow a shared name.'}</p>${state?'':`<div class="county-state-filter"><label for="county-state">State</label><select id="county-state" data-county-state-filter aria-controls="counties" disabled><option value="">All ${serviceStates.length} states</option>${serviceStates.map(item=>`<option value="${item.id}">${item.name}</option>`).join('')}</select></div>`}<div class="county-search-control"><label for="county-search">County, region, city or town</label><div class="county-filter-row"><input id="county-search" type="search" maxlength="100" autocomplete="off" placeholder="For example, ${example}" aria-describedby="county-search-help" aria-controls="counties" disabled><button type="button" class="button button-secondary" disabled>Clear</button></div></div><p class="county-filter-status" role="status" aria-live="polite" aria-atomic="true">Browse all ${count} ${plural} below.</p><noscript><p>Search needs JavaScript. Open the lists below to browse every service area.</p></noscript></div>`;
}
export function countyDirectory(state){
 const states=state?[state]:serviceStates;
 // Repeated place names across counties share a page-local dictionary. The
 // visible links remain ordinary HTML, including when JavaScript is disabled.
 const placeNames=[...new Set(states.flatMap(item=>item.counties.flatMap(county=>countySearchText(county,item,item.regions.find(region=>region.slugs.includes(county.slug))).split('|').map(term=>term.slice(term.indexOf(':')+1)))))].sort();
 const dictionary={names:placeNames,indices:new Map(placeNames.map((name,index)=>[name,index]))};
 const sections=state?state.regions.map(region=>({id:region.id,name:region.name,count:region.slugs.length,plural:state.areaPlural,html:cards(state,regionCounties(state,region),dictionary)})):states.map(item=>({id:item.id,name:item.name,count:item.counties.length,plural:item.areaPlural,html:cards(item,[...item.counties].sort((a,b)=>a.name.localeCompare(b.name)),dictionary)}));
 return directoryControls(state)+`<script type="application/json" data-county-place-names>${JSON.stringify(packCountyNames(dictionary.names))}</script><section class="county-search-results" data-county-results hidden aria-label="Service area search results"><h2>Best matches</h2><ul class="county-result-list" data-county-best></ul><details hidden><summary>Other matching areas</summary><ul class="county-result-list" data-county-more></ul></details></section><div id="counties" data-county-directory>${sections.map(section=>`<details class="county-region county-section" id="${section.id}"><summary>${e(section.name)} (${section.count} ${section.plural})</summary>${section.html}</details>`).join('')}</div><div class="county-search-empty" data-county-empty hidden><p><strong>No service areas match that search.</strong></p><p>Try a county, region or community name${state?'':', or choose a different state'}. ZIP codes aren't supported. Clear the search to browse ${state?'the '+state.name+' '+state.areaPlural:'all service areas'}.</p></div>`;
}
export function serviceStateCards(){
 return `<div class="state-area-cards">${serviceStates.map(state=>`<article><p class="eyebrow">${state.counties.length} ${state.areaPlural}</p><h2>${e(state.name)}</h2><p>${({'new-york':'From Buffalo and the Finger Lakes to the Hudson Valley, New York City and Long Island.',pennsylvania:'From Erie and Pittsburgh to central Pennsylvania, the Lehigh Valley and Philadelphia.',ohio:'From Cleveland and Toledo to Columbus, Cincinnati, Dayton and communities across Ohio.','new-jersey':'Find a county guide for communities from Newark and Jersey City to Trenton, Vineland and Cape May.',connecticut:'Find your town or city within the nine current planning regions, including Hartford, New Haven and Stamford.','rhode-island':'Browse the five counties and their cities and towns, including Providence, Warwick and Newport.',massachusetts:'Find cities and towns across the 14 counties, including Boston, Worcester, Springfield and the islands.',delaware:'Browse New Castle, Kent and Sussex counties, including municipalities that cross county lines.',vermont:'Find a county guide for cities, towns and villages, including Burlington, Rutland and Montpelier.','new-hampshire':'Browse ten county guides for cities, towns and unincorporated places, including Manchester, Concord and Portsmouth.',maine:'Browse 16 county guides with cities, towns, plantations and other places, including Portland, Bangor and Augusta.',maryland:'Browse 23 county guides and a separate Baltimore City guide, with incorporated municipalities and other communities.'})[state.id]}</p><p>${a(state.path,'Explore '+state.name)}</p></article>`).join('')}</div>`;
}
