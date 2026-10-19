// Optional measurement must never prevent the form handler from loading.
let measurement;
const countJourney=(...args)=>{measurement??=import('./journey-counts.js').catch(()=>null);measurement.then(module=>module?.countJourney(...args)).catch(()=>{});};
import {bindInquirySubmission} from './inquiry-submit.mjs';
import {resolveServiceId,inquiryChoices,inquiryContextFields,publicInquiryContext,selectedInquiryContext,inquiryRequestSummary,inquiryMessagePrompt,inquiryMessageHelp,hasInquirySelection} from './shared.mjs';
const form=document.querySelector('form#inquiry');
if(form){
 const field=key=>form.elements.namedItem(key);
 const annualEnabled=form.dataset.annualEnabled==='true';
 const params=new URLSearchParams(location.search),requested=resolveServiceId(params.get('offer'));
 if(!form.dataset.fixedService&&inquiryChoices.some(([id])=>id===requested))field('service').value=requested;
 const initial={service:field('service').value,...Object.fromEntries(new FormData(form))};
 for(const key of Object.keys(inquiryContextFields))if(params.has(key))initial[key]=params.get(key);
 const context=publicInquiryContext(initial,annualEnabled);
 for(const key of Object.keys(inquiryContextFields)){
  const input=field(key);if(!input)continue;
  // Server prefill preserves valid historical source answers. Direct static previews
 // can only select choices actually present; they never insert arbitrary URL text.
  if(input.options){if(context[key]&&[...input.options].some(option=>option.value===context[key]))input.value=context[key];}
  else input.value=context[key]||'';
 }
 let packIndex=[];
 const updateRequestSummary=()=>{
  const service=field('service').value,question=field('request_kind').value==='question';
  const values={service,...Object.fromEntries(new FormData(form))};
  const context=publicInquiryContext(values,annualEnabled);
  for(const key of Object.keys(inquiryContextFields)){
   const input=field(key);if(input?.type==='hidden'){input.value=context[key]||'';}
  }
  const current={service,...context,request_kind:question?'question':'checkout'};
  const label=form.querySelector('[data-request-label]');
  label.replaceChildren(document.createTextNode(inquiryMessagePrompt(service,current.request_kind)+' '));
  const required=document.createElement('span');required.className='field-note';required.textContent='(required)';label.append(required);
  document.querySelector('#message-help').textContent=inquiryMessageHelp(service,current.request_kind,context.goal);
  form.querySelector('[data-request-submit]').textContent=question?'Send question':'Request a proposal';
  const noCharge=form.querySelector('.checkout-no-charge');if(noCharge)noCharge.hidden=question;
  const wrapper=form.querySelector('.request-summary');wrapper.hidden=!form.dataset.fixedService&&!hasInquirySelection(current);
  const pack=packIndex.find(p=>p.id===service),summary=document.querySelector('#request-summary');
  const next=inquiryRequestSummary(current);if(summary.textContent!==next)summary.textContent=next;
  for(const questionLink of document.querySelectorAll('[data-checkout-question]')){
   const query=new URLSearchParams({offer:service,...selectedInquiryContext(current),request_kind:'question'});
   questionLink.href='/contact/?'+query.toString()+'#inquiry';
  }
  const place=document.querySelector('#request-pack-link');place.replaceChildren();
  if(pack&&!question){const a=document.createElement('a');a.href='/assets/buyer-packs/'+pack.id;a.textContent='Full details';place.append(a);}
 };
 form.addEventListener('input',()=>{if(form.dataset.mode==='live')countJourney(field('request_kind').value==='question'?'question_start':'request_start',field('service').value);});
 form.addEventListener('change',event=>{if(Object.hasOwn(inquiryContextFields,event.target.name)||event.target.name==='service')updateRequestSummary();});
 updateRequestSummary();
 fetch('/assets/buyer-packs/index.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(packs=>{packIndex=packs;updateRequestSummary();}).catch(()=>{});
 bindInquirySubmission(form,{countJourney});
}

// Anchor navigation preserves the visible form and gives keyboard users a real starting point.
document.querySelectorAll('[data-inquiry-jump]').forEach(link=>link.addEventListener('click',()=>{requestAnimationFrame(()=>{const first=document.querySelector('#inquiry #name');first?.focus({preventScroll:true});});}));
if(location.hash==='#inquiry')requestAnimationFrame(()=>document.querySelector('#inquiry')?.focus({preventScroll:true}));
