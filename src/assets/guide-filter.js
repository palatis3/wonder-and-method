const form=document.querySelector('[data-guide-filters]');
if(form){
 const search=form.querySelector('#guide-search'),category=form.querySelector('#guide-category'),status=form.querySelector('[data-guide-count]');
 const groups=[...document.querySelectorAll('[data-guide-group]')].map(element=>({element,cards:[...element.querySelectorAll('.journal-card')].map(element=>({element,text:element.textContent.toLocaleLowerCase('en-US')}))}));
 const examples=document.querySelector('.guide-examples'),total=groups.reduce((sum,group)=>sum+group.cards.length,0);
 const extraGroups=[...document.querySelectorAll('[data-guide-more]')].map(element=>({element,beforeOpen:element.open,summary:element.querySelector('summary'),originalLabel:element.querySelector('summary').textContent}));
 let beforeSearchOpen=examples?.open??false,wasActive=false;
 const update=()=>{
  const words=search.value.trim().toLocaleLowerCase('en-US').split(/\s+/).filter(Boolean),active=words.length>0||!!category.value;
  if(active&&!wasActive){beforeSearchOpen=examples?.open??false;for(const extra of extraGroups)extra.beforeOpen=extra.element.open;}
  let count=0;
  for(const group of groups){let matches=0;for(const card of group.cards){const match=(!category.value||category.value===group.element.id)&&words.every(word=>card.text.includes(word));card.element.hidden=!match;if(match){matches++;count++;}}group.element.hidden=matches===0;}
  if(examples){const hasMatches=groups.some(group=>examples.contains(group.element)&&!group.element.hidden);examples.hidden=!hasMatches;if(active)examples.open=hasMatches;else if(wasActive)examples.open=beforeSearchOpen;}
  for(const extra of extraGroups){const hasMatches=[...extra.element.querySelectorAll('.journal-card')].some(card=>!card.hidden);extra.element.hidden=!hasMatches;extra.summary.textContent=active?'Matching guides in this topic':extra.originalLabel;if(active)extra.element.open=hasMatches;else if(wasActive)extra.element.open=extra.beforeOpen;}
  status.textContent=active?`${count} of ${total} guides match.`+(count===0?' Try another keyword or reset the filters.':''):`${total} guides available. Choose a topic or search for a question.`;
  wasActive=active;
 };
 form.addEventListener('submit',event=>{event.preventDefault();update();});
 search.addEventListener('input',update);category.addEventListener('change',update);
 // A native reset applies field defaults after the reset event. Wait until the
 // next task so the result list reads those values, including with AX clicks.
 form.addEventListener('reset',()=>{setTimeout(()=>{update();search.focus();},0);});
 // Topic jumps also clear a conflicting filter, so their targets stay reachable.
 document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',()=>{if(wasActive&&[...groups.map(group=>'#'+group.element.id),'#examples'].includes(link.getAttribute('href'))){search.value='';category.value='';update();}}));
 form.hidden=false;update();
}
