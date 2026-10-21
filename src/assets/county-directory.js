// Search stays in this browser; names are stored once per official place type.
export const normalizeCountyQuery=value=>String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\bsaint\b/g,'st').replace(/[^a-z0-9]+/g,' ').trim();
const placeTypes={city:'c',town:'t',village:'v',borough:'b',township:'s',county:'y'};
const stateNames={'new york':'new-york',ny:'new-york',pennsylvania:'pennsylvania',pa:'pennsylvania',ohio:'ohio',oh:'ohio'};
export function parseCountyQuery(value){
 let query=normalizeCountyQuery(value),state='',type='';
 for(const [name,id] of Object.entries(stateNames)){
  if(query===name){state=id;query='';break;}
  if(query.endsWith(' '+name)&&!query.endsWith(' of '+name)){state=id;query=query.slice(0,-name.length).trim();break;}
 }
 // City is part of this shared borough-region name, not a place-type suffix.
 if(query==='new york city')return {query,state,type};
 const prefix=query.match(/^(city|town|village|borough|township|county) of (.+)$/);
 const suffix=query.match(/^(.+) (city|town|village|borough|township|county)$/);
 if(prefix){type=prefix[1];query=prefix[2];}
 else if(suffix){type=suffix[2];query=suffix[1];}
 return {query,state,type};
}
export function countyMatchScore(card,search,selectedState=''){
 if((selectedState&&card.state!==selectedState)||(search.state&&card.state!==search.state))return 0;
 if(!search.query)return 1;
 let score=0;
 for(const entry of card.terms){
  const colon=entry.indexOf(':'),type=colon<0?'p':entry.slice(0,colon),name=colon<0?entry:entry.slice(colon+1);
  if(search.type&&!type.includes(placeTypes[search.type]))continue;
  // A typed name identifies the complete place; unqualified input can match
  // the start of any word, so Erie cannot accidentally match Deferiet.
  const exact=name===search.query;
  const match=exact||(!search.type&&(name.startsWith(search.query)||name.includes(' '+search.query)));
  if(match)score=Math.max(score,exact?(type.includes('y')?6:type.includes('a')?5:type.includes('c')?4:3):type.includes('y')||type.includes('a')?2:1);
 }
 return score;
}
export function bindCountyDirectory(root=document){
 const directory=root.querySelector('[data-county-directory]');
 if(!directory)return;
 const controls=root.querySelector('[data-county-filter-controls]');
 const input=controls?.querySelector('input'),clear=controls?.querySelector('button'),status=controls?.querySelector('[role="status"]');
 const empty=root.querySelector('[data-county-empty]'),navigation=root.querySelector('[data-county-region-nav]'),stateFilter=controls?.querySelector('[data-county-state-filter]');
 if(!controls||!input||!clear||!status||!empty)return;
 const cards=[...directory.querySelectorAll('[data-county-search]')].map((element,index)=>({element,index,state:element.dataset.countyState,terms:element.dataset.countySearch.split('|')}));
 const sections=[...directory.querySelectorAll('.county-section')];
 let filtering=false,openBeforeSearch=new Set();
 const update=()=>{
  const search=parseCountyQuery(input.value),state=stateFilter?.value||'',active=Boolean(input.value.trim()||state);
  if(active&&!filtering)openBeforeSearch=new Set(sections.filter(section=>section.open));
  let count=0;
  for(const card of cards){card.score=countyMatchScore(card,search,state);card.element.hidden=!card.score;if(card.score)count++;}
  for(const section of sections){
   const localCards=cards.filter(card=>section.contains(card.element));
   section.hidden=!localCards.some(card=>card.score);
   if(active)section.open=!section.hidden;
   else if(filtering)section.open=openBeforeSearch.has(section);
   const list=section.querySelector('.county-hub-grid');
   if(list)for(const card of localCards.sort((a,b)=>active?b.score-a.score||a.index-b.index:a.index-b.index))list.append(card.element);
  }
  filtering=active;empty.hidden=count!==0;clear.disabled=!active;
  if(navigation)navigation.hidden=active;
  const stateName=state?stateFilter.selectedOptions[0].textContent:'';
  status.textContent=input.value.trim()?`${count} ${count===1?'county matches':'counties match'} your search${stateName?' in '+stateName:''}.`:stateName?`Showing ${count} ${stateName} counties.`:`Showing all ${cards.length} counties.`;
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
