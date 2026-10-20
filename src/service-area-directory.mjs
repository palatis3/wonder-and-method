import {escapeHtml as e} from './shared.mjs';
import {countyProfiles} from './county-profiles.mjs';
import {countyGeography} from './county-geography.mjs';
import {countyRegions} from './county-regions.mjs';
import {pennsylvaniaProfiles} from './pennsylvania-content.mjs';
import {pennsylvaniaGeography} from './pennsylvania-geography.mjs';
import {pennsylvaniaRegions} from './pennsylvania-regions.mjs';

export const serviceStates=[
 {id:'new-york',name:'New York',abbreviation:'NY',path:'/areas/new-york/',counties:[{slug:'erie',name:'Erie',anchor:'Buffalo',displayName:'Buffalo & Erie County'},...countyProfiles],geography:countyGeography,regions:countyRegions},
 {id:'pennsylvania',name:'Pennsylvania',abbreviation:'PA',path:'/areas/pennsylvania/',counties:pennsylvaniaProfiles,geography:pennsylvaniaGeography,regions:pennsylvaniaRegions}
];
export const countyPath=(county,state=serviceStates[0])=>`/areas/${state.id==='pennsylvania'?'pennsylvania/':''}${county.slug}-county/`;
export const countyLabel=county=>county.boroughLabel?`${county.boroughLabel} · ${county.name} County`:({kings:'Brooklyn · Kings County','new-york':'Manhattan · New York County',richmond:'Staten Island · Richmond County'})[county.slug]||`${county.name} County`;
export const regionCounties=(state,region)=>region.slugs.map(slug=>state.counties.find(county=>county.slug===slug)).filter(Boolean);
export function serviceAreaDataForPath(path){
 for(const state of serviceStates){const county=state.counties.find(item=>countyPath(item,state)===path);if(county)return {state,county};}
 return null;
}
const a=(path,label)=>`<a href="${e(path)}">${e(label)}</a>`;
function searchText(county,state,region){
 const g=state.geography[county.slug];
 const types={cities:'City',towns:'Town',villages:'Village',boroughs:'Borough',townships:'Township'};
 const municipalities=Object.entries(g?.municipalities||{}).flatMap(([group,names])=>names.flatMap(name=>[name,`${name} ${types[group]}`,`${types[group]} of ${name}`]));
 const places=[county.name,`${county.name} County`,county.displayName||'',county.anchor,...municipalities,...(g?.communities||[]).map(place=>place.name)];
 return [state.name,state.abbreviation,region?.name||'',...places.flatMap(place=>[place,`${place} ${state.abbreviation}`,`${place} ${state.name}`])].join(' | ');
}
function cards(state,counties){
 return `<div class="county-hub-grid">${counties.map(county=>{
  const region=state.regions.find(item=>item.slugs.includes(county.slug));
  return `<article data-county-state="${state.id}" data-county-search="${e(searchText(county,state,region))}"><a class="county-hub-link" href="${countyPath(county,state)}"><span class="eyebrow">${e(state.name)}</span><h3>${e(county.slug==='erie'&&state.id==='new-york'?'Buffalo & Erie County':countyLabel(county))}</h3><p>${e(county.anchor)}</p></a></article>`;
 }).join('')}</div>`;
}
export function directoryControls(state){
 const count=state?state.counties.length:serviceStates.reduce((total,item)=>total+item.counties.length,0);
 return `<div class="county-filter" data-county-filter-controls hidden><label for="county-search">Find a county or community</label><p id="county-search-help">${state?.id==='pennsylvania'?'Try a county, city, borough, township or community.':state?'Try a county, city, town, village or region.':'Try a county or community; add NY or PA when a name is shared.'} Shared place names may match more than one guide.</p>${state?'':`<div class="county-state-filter"><label for="county-state">Filter by state</label><select id="county-state" data-county-state-filter aria-controls="counties"><option value="">New York and Pennsylvania</option>${serviceStates.map(item=>`<option value="${item.id}">${item.name}</option>`).join('')}</select></div>`}<div class="county-filter-row"><input id="county-search" type="search" maxlength="100" autocomplete="off" placeholder="${state?.id==='pennsylvania'?'For example, Harrisburg or State College':state?'For example, Ithaca or St. Lawrence':'For example, Erie PA or Ithaca'}" aria-describedby="county-search-help" aria-controls="counties"><button type="button" class="button button-secondary" disabled>Clear search</button></div><p class="county-filter-status" role="status" aria-live="polite" aria-atomic="true">Showing all ${count} county guides.</p></div>`;
}
export function countyDirectory(state){
 const states=state?[state]:serviceStates;
 const navigation=state?state.regions.map(region=>a('#'+region.id,region.name)):states.map(item=>a('#'+item.id,item.name));
 const sections=state?state.regions.map(region=>({id:region.id,label:'Find your area',name:region.name,html:cards(state,regionCounties(state,region))})):states.map(item=>({id:item.id,label:`${item.counties.length} county guides`,name:item.name,html:cards(item,[...item.counties].sort((a,b)=>a.name.localeCompare(b.name)))}));
 return directoryControls(state)+`<nav class="page-jump county-region-nav" data-county-region-nav aria-label="${state?e(state.name)+' service regions':'Service states'}">${navigation.join('')}</nav><div id="counties" data-county-directory>${sections.map(section=>`<section class="section county-section" id="${section.id}"><div class="section-heading"><p class="eyebrow">${e(section.label)}</p><h2>${e(section.name)}</h2></div>${section.html}</section>`).join('')}</div><div class="county-search-empty" data-county-empty hidden><h2>No county guides match that search.</h2><p>Try a county name or a nearby community${state?'':', or choose a different state'}. Clear the search to browse ${state?'the '+state.name:'both states’'} county guides.</p></div>`;
}
export function serviceStateCards(){
 return `<div class="state-area-cards">${serviceStates.map(state=>`<article><p class="eyebrow">${state.counties.length} county guides</p><h2>${a(state.path,state.name)}</h2><p>${state.id==='new-york'?'From Buffalo and the Finger Lakes to the Hudson Valley, New York City and Long Island.':'From Erie and Pittsburgh to central Pennsylvania, the Lehigh Valley and Philadelphia.'}</p><p>${a(state.path,'Explore '+state.name)}</p></article>`).join('')}</div>`;
}
