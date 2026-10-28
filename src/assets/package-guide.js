const form=document.querySelector('[data-package-guide]');
if(form){
 const packages=JSON.parse(form.dataset.packages);
 const result=form.querySelector('[data-guide-result]');
 form.hidden=false;
 form.addEventListener('change',()=>{result.hidden=true;});
 form.addEventListener('submit',event=>{
  event.preventDefault();const values=Object.fromEntries(new FormData(form));
  let id='launch_site',reason='A compact site for one main service fits within the smallest page allowance.';
  if(values.services==='several'||values.pages==='medium'){id='focused_site';reason='Several service explanations or a larger page plan make Focused a useful starting point.';}
  if(values.pages==='large'||values.motion==='yes'){id='signature_site';reason=values.motion==='yes'?'You selected an original animated or 3D homepage feature, which is included in Signature.':'Your estimated page count is above the Focused allowance.';}
  if(values.pages==='unsure'||values.services==='unsure'){id='unsure';reason='Clarify the service range and page plan before choosing a package. You do not need those answers to ask a question.';}
  if(values.pages==='more'){id='unsure';reason='Your page estimate exceeds the largest listed package. Discuss the scope before choosing a package.';}
  if(values.editing==='visual'){id='unsure';reason='The listed builds do not include a visual editor. Discuss your editing needs before choosing; a different approach may be more suitable.';}
  const p=packages[id];
  form.querySelector('[data-guide-title]').textContent=p?`${p.name} · ${p.price}`:'Start with a scope conversation';
  form.querySelector('[data-guide-reason]').textContent=reason;
  form.querySelector('[data-guide-boundary]').textContent=(p?`Up to ${p.pages} pages, including guides. `:'')+(values.editing==='care'?'Monthly help is optional and needs a separate agreement. ':'')+'This suggestion does not confirm feature fit, dates or final scope. Outside bills, tax and approved extras cost separately.';
  form.querySelector('[data-guide-inquiry]').href='/contact/?'+new URLSearchParams({offer:id,goal:'new_website',request_kind:'question'})+'#inquiry';
  result.hidden=false;result.focus();
 });
}
