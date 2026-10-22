import {serviceStateInfo} from './service-state-info.js';
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
// Sorted names share their common prefix; all delimiters are excluded by normalization.
export function packCountyNames(names){
 let previous='';
 return names.map(name=>{let prefix=0;while(prefix<previous.length&&prefix<name.length&&previous[prefix]===name[prefix])prefix++;
  const packed=prefix.toString(36)+':'+name.slice(prefix);previous=name;return packed;
 }).join('|');
}
export function unpackCountyNames(value){
 let previous='';
 return value.split('|').map(packed=>{const colon=packed.indexOf(':');previous=previous.slice(0,parseInt(packed.slice(0,colon),36))+packed.slice(colon+1);return previous;});
}
const placeTypes={city:'c',town:'t',village:'v',borough:'b',township:'s',county:'y','planning region':'r','independent city':'i',plantation:'l',municipality:'m'};
const stateNames=Object.fromEntries(serviceStateInfo.flatMap(state=>[[state.name.toLowerCase(),state.id],[state.abbreviation.toLowerCase(),state.id]]));
export function parseCountyQuery(value){
 let query=normalizeCountyQuery(value),state='',type='';
 for(const [name,id] of Object.entries(stateNames)){
  if(query===name){state=id;query='';break;}
  if(query.endsWith(' '+name)&&!query.endsWith(' of '+name)){state=id;query=query.slice(0,-name.length).trim();break;}
 }
 // City is part of this shared borough-region name, not a place-type suffix.
 if(query==='new york city')return {query,state,type};
 const prefix=query.match(/^(city|town|village|borough|township|county|planning region|independent city|plantation|municipality) of (.+)$/);
 const suffix=query.match(/^(.+) (independent city)$/)||query.match(/^(.+) (city|town|village|borough|township|county|planning region|plantation|municipality)$/);
 if(prefix){type=prefix[1];query=prefix[2];}
 else if(suffix){type=suffix[2];query=suffix[1];}
 return {query,state,type};
}
export function countyMatchScore(card,search,selectedState=''){
 return countyMatch(card,search,selectedState).score;
}
const typeLabels={y:'county',r:'planning region',i:'independent city',c:'city',t:'town',v:'village',b:'borough',s:'township',l:'plantation',m:'municipality',a:'place',p:'place or region'};
export function countyMatch(card,search,selectedState=''){
 if((selectedState&&card.state!==selectedState)||(search.state&&card.state!==search.state))return {score:0};
 if(!search.query)return {score:1,name:'',type:'state'};
 let result={score:0};
 for(const entry of card.terms){
  const colon=entry.indexOf(':'),type=colon<0?'p':entry.slice(0,colon),name=colon<0?entry:entry.slice(colon+1);
  if(search.type&&!type.includes(placeTypes[search.type]))continue;
  // A typed name identifies the complete place; unqualified input can match
  // the start of any word, so Erie cannot accidentally match Deferiet.
  const exact=name===search.query;
  const match=exact||(!search.type&&(name.startsWith(search.query)||name.includes(' '+search.query)));
  const isArea=/[yri]/.test(type);
  const score=match?(exact?(isArea?6:type.includes('a')?5:type.includes('c')?4:3):isArea||type.includes('a')?2:1):0;
  if(score>result.score)result={score,name,type:search.type||typeLabels[Object.keys(typeLabels).find(key=>type.includes(key))]||'place'};
 }
 return result;
}
export function bindCountyDirectory(root=document){
 const directory=root.querySelector('[data-county-directory]');
 if(!directory)return;
 const controls=root.querySelector('[data-county-filter-controls]');
 const input=controls?.querySelector('input'),clear=controls?.querySelector('button'),status=controls?.querySelector('[role="status"]');
 const empty=root.querySelector('[data-county-empty]'),navigation=root.querySelector('[data-county-region-nav]'),stateFilter=controls?.querySelector('[data-county-state-filter]');
 if(!controls||!input||!clear||!status||!empty)return;
 const nameData=root.querySelector('[data-county-place-names]');
 const names=nameData?unpackCountyNames(JSON.parse(nameData.textContent)):undefined;
 const cards=[...directory.querySelectorAll('[data-county-search]')].map((element,index)=>({element,index,state:element.closest('[data-county-state]').dataset.countyState,terms:unpackCountySearch(element.dataset.countySearch,names)}));
 const sections=[...directory.querySelectorAll('.county-section')];
 const results=root.querySelector('[data-county-results]');
 const bestList=results?.querySelector('[data-county-best]'),moreList=results?.querySelector('[data-county-more]');
 const moreDetails=moreList?.closest('details');
 const stateLabels=Object.fromEntries(serviceStateInfo.map(state=>[state.id,state.name]));
 const areaPlural=controls.dataset.areaPlural||'areas';
 const makeResult=card=>{
  const row=root.createElement('li'),link=card.element.querySelector('a').cloneNode(true),why=root.createElement('p');
  link.removeAttribute('aria-hidden');
  why.className='county-match-reason';
  why.textContent=stateLabels[card.state]+(card.match.name?' · Matched '+card.match.type+': '+card.match.name: ' · Service area in this state');
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
   if(list)for(const card of localCards.sort((a,b)=>active?b.score-a.score||a.index-b.index:a.index-b.index))list.append(card.element);
  }
  filtering=active;empty.hidden=count!==0;clear.disabled=!active;
  if(results&&bestList&&moreList){
   const ordered=cards.filter(card=>card.score).sort((a,b)=>b.score-a.score||a.index-b.index);
   const best=ordered.filter(card=>card.score===ordered[0]?.score),more=ordered.filter(card=>card.score!==ordered[0]?.score);
   bestList.replaceChildren(...(active?best.map(makeResult):[]));moreList.replaceChildren(...(active?more.map(makeResult):[]));
   results.hidden=!active||!count;directory.hidden=active;
   if(moreDetails){moreDetails.hidden=!more.length;moreDetails.querySelector('summary').textContent='Other matching '+areaPlural+' ('+more.length+')';if(!active)moreDetails.open=false;}
  }
  if(navigation)navigation.hidden=active||!navigation.children.length;
  const stateName=state?stateFilter.selectedOptions[0].textContent:'';
  const selectedPlural=serviceStateInfo.find(item=>item.id===state)?.areaPlural||areaPlural;
  status.textContent=input.value.trim()?`${count} ${count===1?'area matches':'areas match'} your search${stateName?' in '+stateName:''}.`:stateName?`Showing ${count} ${stateName} ${selectedPlural}.`:`Showing all ${cards.length} ${areaPlural}.`;
 };
 input.addEventListener('input',update);stateFilter?.addEventListener('change',update);
 clear.addEventListener('click',()=>{input.value='';if(stateFilter)stateFilter.value='';update();input.focus();});
 // In-page region links also expand the native disclosure they point to.
 const openTarget=()=>{const id=root.defaultView?.location.hash.slice(1);const section=sections.find(item=>item.id===id);if(section)section.open=true;};
 navigation?.addEventListener('click',event=>{const link=event.target.closest('a');const section=sections.find(item=>'#'+item.id===link?.getAttribute('href'));if(section)section.open=true;});
 root.defaultView?.addEventListener('hashchange',openTarget);
 input.disabled=false;if(stateFilter)stateFilter.disabled=false;controls.hidden=false;update();openTarget();
}
if(typeof document!=='undefined')bindCountyDirectory();
