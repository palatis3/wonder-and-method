// Ephemeral demonstration only: no networking, persistence or real intake.
export function validateDemo(values){
 const errors={};
 if(!String(values.name||'').trim())errors.name='Enter a sample name, or use the sample details button.';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values.email||'').trim()))errors.email='Enter a sample email such as sample@example.test.';
 if(values.concept!=='hearthside'&&String(values.message||'').trim().length<10)errors.message='Add at least 10 characters describing the example request.';
 if(values.concept==='hearthside'&&(!Number.isInteger(Number(values.quantity))||Number(values.quantity)<1||Number(values.quantity)>8))errors.quantity='Choose a whole quantity from 1 to 8.';
 return errors;
}
export function demoOrderTotal(service,quantity){const price=service.startsWith('Classic cheese')?16:service.startsWith('Pepperoni')?19:18;return '$'+(price*Number(quantity)).toFixed(2);}
export function resolveDemoService(concept,requested,options){
 const aliases={'Kitchen remodeling conversation':'Kitchen remodeling','Bathroom remodeling conversation':'Bathroom remodeling','Interior layout conversation':'Interior layout changes'};
 const choice=concept==='northline'&&Object.hasOwn(aliases,requested)?aliases[requested]:requested;
 if(options.includes(choice))return choice;
 const pizza=concept==='hearthside'&&['Classic cheese','Pepperoni','Garden'].find(name=>choice?.startsWith(name));
 return pizza?options.find(option=>option.startsWith(pizza))||null:null;
}
export function bindConceptDemo(form,doc=globalThis.document){
 const confirmation=form.parentElement.querySelector('.concept-confirmation');
 if(!confirmation)return;
 const fields=form.elements;
 const extraNames=(form.dataset.concept==='hearthside'?['quantity','time']:['area','timing']).filter(key=>fields.namedItem(key));
 const names=['name','email','service','message',...extraNames];
 const errorNames=['name','email','message',...(extraNames.includes('quantity')?['quantity']:[])];
 const requested=new URLSearchParams(globalThis.location?.search||'').get('service');
 const options=[...fields.namedItem('service').options];
 const selected=resolveDemoService(form.dataset.concept,requested,options.map(option=>option.value));
 const restoreChoice=()=>{if([...fields.namedItem('service').options].some(o=>o.value===selected))fields.namedItem('service').value=selected;};
 const clearErrors=()=>{for(const key of errorNames){fields.namedItem(key).removeAttribute('aria-invalid');doc.getElementById(`concept-${key}-error`).textContent='';}};
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const values=Object.fromEntries(names.map(key=>[key,fields.namedItem(key).value.trim()]));
  clearErrors();const errors=validateDemo({...values,concept:form.dataset.concept});
  if(Object.keys(errors).length){for(const [key,message]of Object.entries(errors)){fields.namedItem(key).setAttribute('aria-invalid','true');doc.getElementById(`concept-${key}-error`).textContent=message;}fields.namedItem(Object.keys(errors)[0]).focus();return;}
  for(const key of names)confirmation.querySelector(`[data-demo-${key}]`).textContent=values[key]||'Not specified';
  if(form.dataset.concept==='hearthside')confirmation.querySelector('[data-demo-total]').textContent=demoOrderTotal(values.service,values.quantity);
  form.hidden=true;confirmation.hidden=false;confirmation.focus();
 });
 form.querySelector('.concept-sample').addEventListener('click',()=>{
  fields.namedItem('name').value=form.dataset.concept==='hearthside'?'Sample Guest':'Sample Homeowner';fields.namedItem('email').value='sample@example.test';
  const messages={fieldwork:'Our fictional front garden has become overgrown. I would like a simpler planting plan and seasonal care.',northline:'Our fictional kitchen needs more preparation space and better storage. I would like to discuss what the layout could change.',hearthside:'One sample pizza for this fictional order preview. No real order or pickup is requested.'};
  fields.namedItem('message').value=messages[form.dataset.concept]||'This is a fictional request used to explore the demonstration.';
  if(fields.namedItem('area'))fields.namedItem('area').value='North Buffalo (example)';
  if(fields.namedItem('quantity'))fields.namedItem('quantity').value='1';
  clearErrors();fields.namedItem('service').focus();
 });
 confirmation.querySelector('[data-demo-reset]').addEventListener('click',()=>{
  form.reset();restoreChoice();clearErrors();for(const key of names)confirmation.querySelector(`[data-demo-${key}]`).textContent='';
  if(form.dataset.concept==='hearthside')confirmation.querySelector('[data-demo-total]').textContent='';
  confirmation.hidden=true;form.hidden=false;form.querySelector('.concept-sample').focus();
 });
 restoreChoice();
 // Enable only after the submit handler is installed; a script failure leaves no usable native form.
 form.querySelector('fieldset').disabled=false;
}
if(typeof document!=='undefined')for(const form of document.querySelectorAll('.concept-demo-form'))bindConceptDemo(form);
