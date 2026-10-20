// Filter the visible county directory locally. Search text is never transmitted.
export const normalizeCountyQuery=value=>String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\bsaint\b/g,'st').replace(/[^a-z0-9]+/g,' ').trim();

export function bindCountyDirectory(root=document){
 const directory=root.querySelector('[data-county-directory]');
 if(!directory)return;
 const controls=root.querySelector('[data-county-filter-controls]');
 const input=controls?.querySelector('input');
 const clear=controls?.querySelector('button');
 const status=controls?.querySelector('[role="status"]');
 const empty=root.querySelector('[data-county-empty]');
 const navigation=root.querySelector('[data-county-region-nav]');
 const stateFilter=controls?.querySelector('[data-county-state-filter]');
 if(!controls||!input||!clear||!status||!empty)return;
 const cards=[...directory.querySelectorAll('[data-county-search]')].map(element=>({element,state:element.dataset.countyState,terms:element.dataset.countySearch.split('|').map(normalizeCountyQuery)}));
 const sections=[...directory.querySelectorAll('.county-section')];
 const update=()=>{
  const query=normalizeCountyQuery(input.value);
  const state=stateFilter?.value||'';
  // An explicit place type identifies the named place; unqualified searches
  // still include partial names such as Bethlehem and New Bethlehem.
  const qualified=/\b(?:city|village|borough|town|township|county)(?: (?:ny|pa|oh|new york|pennsylvania|ohio))?$/.test(query);
  const exact=qualified&&cards.some(card=>(!state||card.state===state)&&card.terms.includes(query));
  let count=0;
  for(const card of cards){
   card.element.hidden=!(exact?card.terms.includes(query):card.terms.some(term=>term.includes(query)))||Boolean(state&&card.state!==state);
   if(!card.element.hidden)count++;
  }
  for(const section of sections)section.hidden=![...section.querySelectorAll('[data-county-search]')].some(card=>!card.hidden);
  empty.hidden=count!==0;
  clear.disabled=!input.value&&!state;
  if(navigation)navigation.hidden=query.length>0||Boolean(state);
  const stateName=state?stateFilter.selectedOptions[0].textContent:'';
  status.textContent=query?`${count} county ${count===1?'guide matches':'guides match'} your search${stateName?' in '+stateName:''}.`:stateName?`Showing ${count} ${stateName} county guides.`:`Showing all ${cards.length} county guides.`;
 };
 input.addEventListener('input',update);
 stateFilter?.addEventListener('change',update);
 clear.addEventListener('click',()=>{input.value='';if(stateFilter)stateFilter.value='';update();input.focus();});
 controls.hidden=false;
 update();
}

bindCountyDirectory();
