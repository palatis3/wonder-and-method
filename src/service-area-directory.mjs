import {escapeHtml as e} from './shared.mjs';
import {normalizeCountyQuery} from './assets/county-directory.js';
import {countyProfiles} from './county-profiles.mjs';
import {countyGeography} from './county-geography.mjs';
import {countyRegions} from './county-regions.mjs';
import {pennsylvaniaProfiles} from './pennsylvania-content.mjs';
import {pennsylvaniaGeography} from './pennsylvania-geography.mjs';
import {pennsylvaniaRegions} from './pennsylvania-regions.mjs';
import {ohioProfiles} from './ohio-content.mjs';
import {ohioGeography} from './ohio-geography.mjs';
import {ohioRegions} from './ohio-regions.mjs';

export const serviceStates=[
 {id:'new-york',name:'New York',abbreviation:'NY',path:'/areas/new-york/',counties:[{slug:'erie',name:'Erie',anchor:'Buffalo',displayName:'Buffalo & Erie County'},...countyProfiles],geography:countyGeography,regions:countyRegions},
 {id:'pennsylvania',name:'Pennsylvania',abbreviation:'PA',path:'/areas/pennsylvania/',counties:pennsylvaniaProfiles,geography:pennsylvaniaGeography,regions:pennsylvaniaRegions},
 {id:'ohio',name:'Ohio',abbreviation:'OH',path:'/areas/ohio/',counties:ohioProfiles,geography:ohioGeography,regions:ohioRegions}
];
export const countyPath=(county,state=serviceStates[0])=>`/areas/${state.id==='new-york'?'':state.id+'/'}${county.slug}-county/`;
export const countyLabel=county=>county.boroughLabel?`${county.boroughLabel} · ${county.name} County`:({kings:'Brooklyn · Kings County','new-york':'Manhattan · New York County',richmond:'Staten Island · Richmond County'})[county.slug]||`${county.name} County`;
export const regionCounties=(state,region)=>region.slugs.map(slug=>state.counties.find(county=>county.slug===slug)).filter(Boolean);
export function serviceAreaDataForPath(path){
 for(const state of serviceStates){const county=state.counties.find(item=>countyPath(item,state)===path);if(county)return {state,county};}
 return null;
}
const a=(path,label)=>`<a href="${e(path)}">${e(label)}</a>`;
export function countySearchText(county,state,region){
 const g=state.geography[county.slug];
 const types={cities:'c',towns:'t',villages:'v',boroughs:'b',townships:'s'};
 const terms=new Map();
 const add=(name,type)=>{const value=normalizeCountyQuery(name||'');if(value)terms.set(value,[...new Set((terms.get(value)||'')+type)].join(''));};
 add(county.name,'y');
 for(const [group,names] of Object.entries(g?.municipalities||{}))for(const name of names)add(name,types[group]||'p');
 for(const anchor of (county.anchor||'').split(/\s*(?:,|&)\s*/))add(anchor,'a');
 for(const place of [county.displayName,county.anchor,region?.name,...(g?.communities||[]).map(item=>item.name)]){
  const value=normalizeCountyQuery(place||'');if(value&&!terms.has(value))add(value,'p');
 }
 return [...terms].map(([name,types])=>`${types}:${name}`).join('|');
}
function cards(state,counties){
 return `<ul class="county-hub-grid">${counties.map(county=>{
  const region=state.regions.find(item=>item.slugs.includes(county.slug));
  const anchor=county.anchor&&county.anchor!==county.name?` <span class="county-anchor">(${e(county.anchor)})</span>`:'';
  return `<li data-county-state="${state.id}" data-county-search="${e(countySearchText(county,state,region))}"><a class="county-hub-link" href="${countyPath(county,state)}">${e(county.name)} County${anchor}</a></li>`;
 }).join('')}</ul>`;
}
export function directoryControls(state){
 const count=state?state.counties.length:serviceStates.reduce((total,item)=>total+item.counties.length,0);
 return `<div class="county-filter" data-county-filter-controls><label for="county-search">Search counties or towns</label><p id="county-search-help">Type a county, city or town; ZIP codes aren't supported.${state?'':' Add NY, PA or OH when a name is shared.'} Shared names may match more than one county.</p>${state?'':`<div class="county-state-filter"><label for="county-state">State</label><select id="county-state" data-county-state-filter aria-controls="counties" disabled><option value="">All three states</option>${serviceStates.map(item=>`<option value="${item.id}">${item.name}</option>`).join('')}</select></div>`}<div class="county-filter-row"><input id="county-search" type="search" maxlength="100" autocomplete="off" placeholder="${state?.id==='pennsylvania'?'For example, Harrisburg or State College':state?.id==='ohio'?'For example, Toledo or Yellow Springs':state?'For example, Ithaca or St. Lawrence':'For example, Erie OH or Ithaca'}" aria-describedby="county-search-help" aria-controls="counties" disabled><button type="button" class="button button-secondary" disabled>Clear</button></div><p class="county-filter-status" role="status" aria-live="polite" aria-atomic="true">Browse all ${count} counties below.</p><noscript><p>Search needs JavaScript. Open the lists below to browse every county.</p></noscript></div>`;
}
export function countyDirectory(state){
 const states=state?[state]:serviceStates;
 const navigation=state?state.regions.map(region=>a('#'+region.id,region.name)):states.map(item=>a('#'+item.id,item.name));
 const sections=state?state.regions.map(region=>({id:region.id,name:region.name,count:region.slugs.length,html:cards(state,regionCounties(state,region))})):states.map(item=>({id:item.id,name:item.name,count:item.counties.length,html:cards(item,[...item.counties].sort((a,b)=>a.name.localeCompare(b.name)))}));
 return directoryControls(state)+`<nav class="page-jump county-region-nav" data-county-region-nav aria-label="${state?e(state.name)+' service regions':'Service states'}">${navigation.join('')}</nav><div id="counties" data-county-directory>${sections.map(section=>`<details class="county-region county-section" id="${section.id}"><summary>${e(section.name)} (${section.count} counties)</summary>${section.html}</details>`).join('')}</div><div class="county-search-empty" data-county-empty hidden><p><strong>No counties match that search.</strong></p><p>Try a county name or a nearby community${state?'':', or choose a different state'}. ZIP codes aren't supported. Clear the search to browse ${state?'the '+state.name:'all three states’'} counties.</p></div>`;
}
export function serviceStateCards(){
 return `<div class="state-area-cards">${serviceStates.map(state=>`<article><p class="eyebrow">${state.counties.length} counties</p><h2>${e(state.name)}</h2><p>${({'new-york':'From Buffalo and the Finger Lakes to the Hudson Valley, New York City and Long Island.',pennsylvania:'From Erie and Pittsburgh to central Pennsylvania, the Lehigh Valley and Philadelphia.',ohio:'From Cleveland and Toledo to Columbus, Cincinnati, Dayton and communities across Ohio.'})[state.id]}</p><p>${a(state.path,'Explore '+state.name)}</p></article>`).join('')}</div>`;
}
