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
 if(!controls||!input||!clear||!status||!empty)return;
 const cards=[...directory.querySelectorAll('[data-county-search]')].map(element=>({element,text:normalizeCountyQuery(element.dataset.countySearch)}));
 const sections=[...directory.querySelectorAll('.county-section')];
 const update=()=>{
  const query=normalizeCountyQuery(input.value);
  let count=0;
  for(const card of cards){
   card.element.hidden=!card.text.includes(query);
   if(!card.element.hidden)count++;
  }
  for(const section of sections)section.hidden=![...section.querySelectorAll('[data-county-search]')].some(card=>!card.hidden);
  empty.hidden=count!==0;
  clear.disabled=!input.value;
  if(navigation)navigation.hidden=query.length>0;
  status.textContent=query?`${count} county ${count===1?'guide matches':'guides match'} your search.`:`Showing all ${cards.length} county guides.`;
 };
 input.addEventListener('input',update);
 clear.addEventListener('click',()=>{input.value='';update();input.focus();});
 controls.hidden=false;
 update();
}

bindCountyDirectory();
