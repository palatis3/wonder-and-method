import {serviceStateInfo} from './service-state-info.js';
import {countyCityPopulations} from './county-city-populations.js';
// data-cs and data-cl keep repeated search-card markup compact; visible names and links remain complete.
// Search stays in this browser; names are stored once per official place type.
export const normalizeCountyQuery=value=>String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\bsaint\b/g,'st').replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
// Consecutive names of the same type share one prefix in the HTML payload.
// Normalized place names contain no commas, pipes or colons.
export function packCountySearch(value,dictionary){
 const groups=[];let previous='',lastIndex=0;
 for(const term of value.split('|')){
  const colon=term.indexOf(':'),type=term.slice(0,colon);let name=term.slice(colon+1);
  if(dictionary){
   if(!dictionary.indices.has(name)){dictionary.indices.set(name,dictionary.names.length);dictionary.names.push(name);}
   const index=dictionary.indices.get(name);name=(index-lastIndex).toString(36);lastIndex=index;
  }
  if(type===previous)groups[groups.length-1]+=','+name;
  else {groups.push(type+':'+name);previous=type;}
 }
 return groups.join('|');
}
export function unpackCountySearch(value,names){
 let index=0;
 return value.split('|').flatMap(group=>{
  const colon=group.indexOf(':'),type=group.slice(0,colon);
  return group.slice(colon+1).split(',').map(name=>{if(names){index+=parseInt(name,36);name=names[index];}return type+':'+name;});
 });
}
// Sorted names share their common prefix. One base-36 character encodes the
// usual prefix length; unusually long prefixes use a ~length: escape.
export function packCountyNames(names){
 let previous='';
 return names.map(name=>{let prefix=0;while(prefix<previous.length&&prefix<name.length&&previous[prefix]===name[prefix])prefix++;
  const packed=(prefix<36?prefix.toString(36):'~'+prefix.toString(36)+':')+name.slice(prefix);previous=name;return packed;
 }).join('|');
}
export function unpackCountyNames(value){
 let previous='';const legacy=value.startsWith('0:');
 return value.split('|').map(packed=>{const extended=packed[0]==='~',colon=legacy||extended?packed.indexOf(':'):-1;
  const prefix=parseInt(colon<0?packed[0]:packed.slice(extended?1:0,colon),36);
  previous=previous.slice(0,prefix)+packed.slice(colon<0?1:colon+1);return previous;
 });
}
// Large dictionaries travel compressed within the same HTML. The visible county
// links stay server-rendered and usable without JavaScript or decompression.
async function decodeCountyPayload(payload){
 if(typeof payload==='string')return payload;
 if(payload?.encoding!=='gzip-base64')throw new Error('Unsupported county search payload');
 const bytes=Uint8Array.from(atob(payload.data),character=>character.charCodeAt(0));
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
 return new Response(stream).text();
}
export async function decodeCountyNames(payload){
 return unpackCountyNames(await decodeCountyPayload(payload));
}
export async function decodeCountySearchCards(payload,names){
 return (await decodeCountyPayload(payload)).split('\n').map(value=>unpackCountySearch(value,names));
}
const placeTypes={parish:'u',district:'j',city:'c',town:'t',village:'v',borough:'b',township:'s','charter township':'h',county:'y','planning region':'r','independent city':'i',plantation:'l',municipality:'m',corporation:'m','consolidated city county government':'m','urban county government':'m','metropolitan government':'m',neighborhood:'n',ward:'w',precinct:'q','election precinct':'e','federal district':'d','census designated place':'x',cdp:'x','census county division':'z',ccd:'z'};
const typePattern=Object.keys(placeTypes).sort((a,b)=>b.length-a.length).join('|');
const typedPrefix=new RegExp('^('+typePattern+') of (.+)$'),typedSuffix=new RegExp('^(.+?) ('+typePattern+')$');
const stateNames=Object.fromEntries(serviceStateInfo.flatMap(state=>[state.name,state.abbreviation,...(state.aliases||[])].map(name=>[normalizeCountyQuery(name),state.id])).sort((a,b)=>b[0].length-a[0].length));
export function parseCountyQuery(value){
 let query=normalizeCountyQuery(value),state='',type='',literalName='';
 for(const [name,id] of Object.entries(stateNames)){
  if(query===name){state=id;query='';break;}
  if(query.endsWith(' '+name)&&!query.endsWith(' of '+name)){state=id;query=query.slice(0,-name.length).trim();break;}
 }
 // City is part of this shared borough-region name, not a place-type suffix.
 if(query==='new york city')return {query,state,type};
 // District of Columbia is the name, not a "District of" type prefix.
 if(query==='district of columbia federal district')return {query:'district of columbia',state,type:'federal district'};
 const prefix=query.match(typedPrefix);
 const barePrefix=query.match(/^(census county division|ccd|election precinct|precinct|ward|district|township) (.+)$/);
 const suffix=query.match(typedSuffix);
 // Preserve names ending in a place type, such as City of Traverse City.
 if(prefix){type=prefix[1];query=prefix[2];}
 // Explicit CCD prefixes keep names such as Rio Grande City intact.
 // Other suffixes disambiguate District Heights city and Ward County.
 else if(barePrefix&&placeTypes[barePrefix[1]]==='z'){type=barePrefix[1];query=barePrefix[2];}
 else if(suffix){literalName=query;type=suffix[2];query=suffix[1];}
 else if(barePrefix){type=barePrefix[1];query=barePrefix[2];}
 return {query,state,type,...(literalName?{literalName}:{})};
}
export function countyMatchScore(card,search,selectedState=''){
 return countyMatch(card,search,selectedState).score;
}
export const compareCountyMatches=(a,b)=>b.score-a.score||(b.population||0)-(a.population||0);
const typeLabels={u:'parish',j:'district',y:'county',r:'planning region',i:'independent city',d:'federal district',c:'city',t:'town',v:'village',b:'borough',h:'charter township',s:'township',l:'plantation',m:'municipality',n:'neighborhood',w:'ward',q:'precinct',e:'election precinct',x:'Census-designated place',z:'Census county division (statistical)',a:'place',p:'place or region'};
export function countyMatch(card,search,selectedState=''){
 if((selectedState&&card.state!==selectedState)||(search.state&&card.state!==search.state))return {score:0};
 if(!search.query)return {score:1,name:'',type:'state'};
 let result={score:0};
 for(const entry of card.terms){
  const colon=entry.indexOf(':'),type=colon<0?'p':entry.slice(0,colon),name=colon<0?entry:entry.slice(colon+1);
  // County can be part of a consolidated government's legal name. Preserve
  // that exact name without making an ordinary city match a county query.
  const countyInMunicipalName=search.type==='county'&&type.includes('m')&&name===search.query+' county';
  if(search.type&&!type.includes(placeTypes[search.type])&&!countyInMunicipalName)continue;
  // A typed name identifies the complete place; unqualified input can match
  // the start of any word, so Erie cannot accidentally match Deferiet.
  // A natural suffix query may itself be the complete legal name, e.g.
  // Texas City. Keep this fallback exact and subject to the type filter;
  // explicit prefixes such as City of Texas do not use it.
  const exact=name===search.query||name===search.literalName||countyInMunicipalName;
  const match=exact||(!search.type&&(name.startsWith(search.query)||name.includes(' '+search.query)));
  // A merged name may identify both a county and its same-named city. Rank
  // explicit queries by the requested type, without the other type's bonus.
  const matchType=search.type?(countyInMunicipalName?'m':placeTypes[search.type]):type;
  const isArea=/[uyrid]/.test(matchType);
  // An unqualified city name should not disappear behind an identically named
  // county. Explicit type/state restrictions above still take precedence.
  // Keep other exact names ahead of partial matches and retain every match.
  const city=matchType.includes('c')||matchType.includes('i');
  const score=match?(exact?(city?8:matchType.includes('a')?7:isArea?6:5):isArea||matchType.includes('a')?2:1):0;
  const label=city?(type.includes('i')?'independent city':'city'):typeLabels[Object.keys(typeLabels).find(key=>type.includes(key))]||'place';
  const population=exact&&city?countyCityPopulations[card.state+'/'+name]||0:0;
  if(score>result.score)result={score,name,population,type:countyInMunicipalName?'municipality':placeTypes[search.type]==='z'?typeLabels.z:search.type||label};
 }
 return result;
}
export async function bindCountyDirectory(root=document){
 const directory=root.querySelector('[data-county-directory]');
 if(!directory)return;
 const controls=root.querySelector('[data-county-filter-controls]');
 const input=controls?.querySelector('input'),clear=controls?.querySelector('button'),status=controls?.querySelector('[role="status"]');
 const empty=root.querySelector('[data-county-empty]'),navigation=root.querySelector('[data-county-region-nav]'),stateFilter=controls?.querySelector('[data-county-state-filter]');
 if(!controls||!input||!clear||!status||!empty)return;
 const nameData=root.querySelector('[data-county-place-names]');
 const cardData=root.querySelector('[data-county-search-cards]');
 let names,cards;
 try {
  names=nameData?await decodeCountyNames(JSON.parse(nameData.textContent)):undefined;
  const entries=cardData?await decodeCountySearchCards(JSON.parse(cardData.textContent),names):null;
  const elements=[...directory.querySelectorAll('[data-cs]')];
  if(entries&&entries.length!==elements.length)throw new Error('County card count mismatch');
  cards=elements.map((element,index)=>{
   const terms=entries?entries[Number(element.dataset.cs)]:unpackCountySearch(element.dataset.cs,names);
   if(!terms)throw new Error('Missing county search terms');
   return {element,index,state:element.closest('[data-county-state]').dataset.countyState,terms};
  });
 }
 catch {status.textContent='Search is unavailable. Browse the service areas below.';return;}
 const sections=[...directory.querySelectorAll('.county-section')];
 const results=root.querySelector('[data-county-results]');
 const bestList=results?.querySelector('[data-county-best]'),moreList=results?.querySelector('[data-county-more]');
 const moreDetails=moreList?.closest('details');
 const stateLabels=Object.fromEntries(serviceStateInfo.map(state=>[state.id,state.name]));
 const areaPlural=controls.dataset.areaPlural||'areas';
 const browseAll=root.querySelector('[data-county-browse-all]'),stateLinks=root.querySelector('[data-state-directory-links]');
 const makeResult=card=>{
  const row=root.createElement('li'),link=card.element.querySelector('[data-cl]').cloneNode(true),why=root.createElement('p');
  link.removeAttribute('aria-hidden');
  why.className='county-match-reason';
  why.textContent=stateLabels[card.state]+(card.match.name?' · Matched '+card.match.type+': '+card.match.name: ' · Service area');
  row.append(link,why);return row;
 };
 let filtering=false,openBeforeSearch=new Set();
 const update=()=>{
  const search=parseCountyQuery(input.value),state=stateFilter?.value||'',active=Boolean(input.value.trim()||state);
  if(active&&!filtering)openBeforeSearch=new Set(sections.filter(section=>section.open));
  let count=0;
  for(const card of cards){card.match=countyMatch(card,search,state);card.score=card.match.score;card.element.hidden=!card.score;if(card.score)count++;}
  for(const section of sections){
   const localCards=cards.filter(card=>section.contains(card.element));
   section.hidden=!localCards.some(card=>card.score);
   if(active)section.open=!section.hidden;
   else if(filtering)section.open=openBeforeSearch.has(section);
   const list=section.querySelector('.county-hub-grid');
   if(list)for(const card of localCards.sort((a,b)=>active?compareCountyMatches(a.match,b.match)||a.index-b.index:a.index-b.index))list.append(card.element);
  }
  filtering=active;empty.hidden=count!==0;clear.disabled=!active;
  if(results&&bestList&&moreList){
   const ordered=cards.filter(card=>card.score).sort((a,b)=>compareCountyMatches(a.match,b.match)||a.index-b.index);
   const best=ordered.filter(card=>card.score===ordered[0]?.score),more=ordered.filter(card=>card.score!==ordered[0]?.score);
   bestList.replaceChildren(...(active?best.map(makeResult):[]));moreList.replaceChildren(...(active?more.map(makeResult):[]));
   results.hidden=!active||!count;directory.hidden=active;
   if(moreDetails){moreDetails.hidden=!more.length;moreDetails.querySelector('summary').textContent='Other matching '+areaPlural+' ('+more.length+')';if(!active)moreDetails.open=false;}
  }
  if(navigation)navigation.hidden=active||!navigation.children.length;
  if(browseAll)browseAll.hidden=active;
  if(stateLinks)stateLinks.hidden=active;
  const stateName=state?stateFilter.selectedOptions[0].textContent:'';
  const selectedPlural=serviceStateInfo.find(item=>item.id===state)?.areaPlural||areaPlural;
  status.textContent=input.value.trim()?`${count} ${count===1?'area matches':'areas match'} your search${stateName?' in '+stateName:''}.`:stateName?`Showing ${count} ${stateName} ${selectedPlural}.`:`Showing all ${cards.length} ${areaPlural}.`;
 };
 input.addEventListener('input',update);stateFilter?.addEventListener('change',update);
 clear.addEventListener('click',()=>{input.value='';if(stateFilter)stateFilter.value='';update();input.focus();});
 // Result links and saved fragments reveal both the area and its enclosing
 // browse group. Clear filtering before navigating to a now-hidden source card.
 const openTarget=(hash=root.defaultView?.location.hash,focus=false)=>{
  let id;try{id=decodeURIComponent((hash||'').slice(1));}catch{return;}
  const target=id&&root.getElementById(id);if(!target)return;
  if(directory.contains(target)&&filtering){input.value='';if(stateFilter)stateFilter.value='';update();}
  for(let element=target;element;element=element.parentElement)if(element.matches?.('details'))element.open=true;
  if(focus){
   const control=target.querySelector?.(':scope > summary,a[href]')||target;
   if(!control.matches('a[href],summary,button,input,select,textarea,[tabindex]'))control.tabIndex=-1;
   control.focus({preventScroll:true});
  }
  target.scrollIntoView({block:'start'});
 };
 root.addEventListener('click',event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const link=event.target.closest('a[href]');if(!link)return;
  const url=new URL(link.href,root.defaultView.location.href),location=root.defaultView.location;
  if(url.origin===location.origin&&url.pathname===location.pathname&&url.hash){
   let target;try{target=root.getElementById(decodeURIComponent(url.hash.slice(1)));}catch{return;}
   // Ordinary anchors (including the skip link) keep browser-native focus.
   if(!target||(!directory.contains(target)&&!target.closest('.county-reference-library')))return;
   // Native fragment navigation can move focus back from the summary after
   // filtering removes the clicked result. Complete this same-page navigation
   // ourselves so keyboard users arrive at the opened county or source entry.
   event.preventDefault();
   if(url.href!==location.href)root.defaultView.history.pushState(null,'',url.href);
   openTarget(url.hash,true);
  }
 });
 root.defaultView?.addEventListener('hashchange',()=>openTarget());
 input.disabled=false;if(stateFilter)stateFilter.disabled=false;controls.hidden=false;update();openTarget();
}
if(typeof document!=='undefined')bindCountyDirectory();
