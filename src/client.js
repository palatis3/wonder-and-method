// Optional measurement must never prevent the form handler from loading.
let measurement;
const countJourney=(...args)=>{measurement??=import('./journey-counts.js').catch(()=>null);measurement.then(module=>module?.countJourney(...args)).catch(()=>{});};
import {bindInquirySubmission} from './inquiry-submit.mjs';
import {resolveServiceId,inquiryChoices,inquiryContextFields,publicInquiryContext,selectedInquiryContext,inquiryRequestSummary,inquiryMessagePrompt,inquiryMessageHelp,hasInquirySelection,inquiryNeedsWebsite} from './shared.mjs';
const form=document.querySelector('form#inquiry');
if(form){
 const field=key=>form.elements.namedItem(key);
 const annualEnabled=form.dataset.annualEnabled==='true';
 const params=new URLSearchParams(location.search),requested=resolveServiceId(params.get('offer'));
 if(!form.dataset.fixedService&&inquiryChoices.some(([id])=>id===requested))field('service').value=requested;
 const initial={service:field('service').value,...Object.fromEntries(new FormData(form))};
 for(const key of Object.keys(inquiryContextFields))if(params.has(key))initial[key]=params.get(key);
 const context=publicInquiryContext(initial,annualEnabled);
 const neutral=form.dataset.neutralMessage==='true'&&!['question','checkout'].includes(params.get('request_kind'));
 for(const key of Object.keys(inquiryContextFields)){
  const input=field(key);if(!input)continue;
  // Server prefill preserves valid historical source answers. Direct static previews
 // can only select choices actually present; they never insert arbitrary URL text.
  if(input.options){if(context[key]&&[...input.options].some(option=>option.value===context[key]))input.value=context[key];}
  else input.value=context[key]||'';
 }
 const updateRequestSummary=()=>{
  const service=field('service').value,question=field('request_kind').value==='question';
  const values={service,...Object.fromEntries(new FormData(form))};
  const context=publicInquiryContext(values,annualEnabled);
  for(const key of Object.keys(inquiryContextFields)){
   const input=field(key);if(input?.type==='hidden'){input.value=context[key]||'';}
  }
  const current={service,...context,request_kind:question?'question':'checkout'};
  const website=field('website'),websiteRequired=inquiryNeedsWebsite(current);
  website.required=websiteRequired;website.placeholder=websiteRequired?'example.com':'example.com or @yourbusiness';
  form.querySelector('#website-help').textContent=websiteRequired?'Use a website address, such as example.com. It can be offline or broken; I do not need passwords.':'A link, social handle or short note is fine. Leave blank if you do not have one.';
  const websiteLabel=form.querySelector('label[for=website]'),websiteNote=websiteLabel?.querySelector('.field-note');if(websiteLabel&&websiteNote){websiteNote.textContent=websiteRequired?'(required)':'(optional)';websiteLabel.replaceChildren(document.createTextNode(websiteRequired?'Website to review ':'Website or social page '),websiteNote);}
  const label=form.querySelector('[data-request-label]');
  label.replaceChildren(document.createTextNode(inquiryMessagePrompt(service,current.request_kind,neutral)+' '));
  const required=document.createElement('span');required.className='field-note';required.textContent='(required)';label.append(required);
  document.querySelector('#message-help').textContent=inquiryMessageHelp(service,current.request_kind,context.goal,neutral);
  form.querySelector('[data-request-submit]').textContent='Send message';
  const nextStep=form.querySelector('[data-request-next]');if(nextStep)nextStep.textContent=neutral?'I read your message and reply by email.':question?'I read your question and reply by email.':'I review your project and email you about the work, price and available dates.';
  const wrapper=form.querySelector('.request-summary');if(wrapper)wrapper.hidden=!hasInquirySelection(current);
  const summary=document.querySelector('#request-summary');
  const next=inquiryRequestSummary(current);if(summary&&summary.textContent!==next)summary.textContent=next;
  for(const questionLink of document.querySelectorAll('[data-checkout-question]')){
   const query=new URLSearchParams({offer:service,...selectedInquiryContext(current),request_kind:'question'});
   questionLink.href='/contact/?'+query.toString()+'#inquiry';
  }
 };
 form.addEventListener('input',()=>{if(form.dataset.mode==='live')countJourney(field('request_kind').value==='question'?'question_start':'request_start',field('service').value);});
 form.addEventListener('change',event=>{if(Object.hasOwn(inquiryContextFields,event.target.name)||event.target.name==='service')updateRequestSummary();});
 updateRequestSummary();
 bindInquirySubmission(form,{countJourney});
}

// Anchor navigation preserves the visible form and gives keyboard users a real starting point.
document.querySelectorAll('[data-inquiry-jump]').forEach(link=>link.addEventListener('click',()=>{requestAnimationFrame(()=>{const first=document.querySelector('#inquiry #name');first?.focus({preventScroll:true});});}));
if(location.hash==='#inquiry')requestAnimationFrame(()=>document.querySelector('#inquiry')?.focus({preventScroll:true}));
