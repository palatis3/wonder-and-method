// Ephemeral demonstration only: no networking, persistence or real intake.
export function validateDemo(values){
 const errors={};
 if(!String(values.name||'').trim())errors.name='Enter a sample name, or use the sample details button.';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values.email||'').trim()))errors.email='Enter a sample email such as sample@example.test.';
 if(String(values.message||'').trim().length<10)errors.message='Add at least 10 characters describing the example request.';
 return errors;
}
export function bindConceptDemo(form,doc=globalThis.document){
 const confirmation=form.parentElement.querySelector('.concept-confirmation');
 if(!confirmation)return;
 const fields=form.elements;
 const clearErrors=()=>{for(const key of ['name','email','message']){fields.namedItem(key).removeAttribute('aria-invalid');doc.getElementById(`concept-${key}-error`).textContent='';}};
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const values=Object.fromEntries(['name','email','service','message'].map(key=>[key,fields.namedItem(key).value.trim()]));
  clearErrors();const errors=validateDemo(values);
  if(Object.keys(errors).length){for(const [key,message]of Object.entries(errors)){fields.namedItem(key).setAttribute('aria-invalid','true');doc.getElementById(`concept-${key}-error`).textContent=message;}fields.namedItem(Object.keys(errors)[0]).focus();return;}
  for(const key of ['name','email','service','message'])confirmation.querySelector(`[data-demo-${key}]`).textContent=values[key];
  form.hidden=true;confirmation.hidden=false;confirmation.focus();
 });
 form.querySelector('.concept-sample').addEventListener('click',()=>{
  fields.namedItem('name').value='Sample Homeowner';fields.namedItem('email').value='sample@example.test';
  const messages={fieldwork:'Our fictional front garden has become overgrown. I would like a simpler planting plan and seasonal care.',northline:'Our fictional kitchen needs more preparation space and better storage. I would like to discuss what the layout could change.',hearthside:'One sample pizza for this fictional order preview. No real order or pickup is requested.'};
  fields.namedItem('message').value=messages[form.dataset.concept]||'This is a fictional request used to explore the demonstration.';
  clearErrors();fields.namedItem('service').focus();
 });
 confirmation.querySelector('[data-demo-reset]').addEventListener('click',()=>{
  form.reset();clearErrors();for(const key of ['name','email','service','message'])confirmation.querySelector(`[data-demo-${key}]`).textContent='';
  confirmation.hidden=true;form.hidden=false;form.querySelector('.concept-sample').focus();
 });
 const selected=new URLSearchParams(globalThis.location?.search||'').get('service');
 if([...fields.namedItem('service').options].some(o=>o.value===selected))fields.namedItem('service').value=selected;
 // Enable only after the submit handler is installed; a script failure leaves no usable native form.
 form.querySelector('fieldset').disabled=false;
}
if(typeof document!=='undefined')for(const form of document.querySelectorAll('.concept-demo-form'))bindConceptDemo(form);
