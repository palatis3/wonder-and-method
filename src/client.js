import {inquiryNextStep} from './inquiry-next-step.mjs';
// Optional measurement must never prevent the form handler from loading.
let measurement;
const countJourney=(...args)=>{measurement??=import('./journey-counts.js').catch(()=>null);measurement.then(module=>module?.countJourney(...args)).catch(()=>{});};
import {addonBuildPayments} from './addon-content.mjs';
import {addonSelectionFromQuery,normalizeAddonSelection,priceAddons} from './addons.mjs';
import {money} from './shared.mjs';
import {bindInquirySubmission} from './inquiry-submit.mjs';
import {resolveServiceId,inquiryChoices,inquiryContextFields,publicInquiryContext,selectedInquiryContext,inquiryRequestSummary,inquiryMessagePrompt,inquiryMessageHelp,hasInquirySelection,inquiryWebsiteField,inquirySubmitLabel,inquiryOffer,inquiryAllowsMonthlyInterest} from './shared.mjs';
const form=document.querySelector('form#inquiry');
if(form){
 const field=key=>form.elements.namedItem(key);
 const annualEnabled=form.dataset.annualEnabled==='true';
 const params=new URLSearchParams(location.search),requested=resolveServiceId(params.get('offer'));
 if(!form.dataset.fixedService&&inquiryChoices.some(([id])=>id===requested))field('service').value=requested;
 if(params.has('addons')){
  let selected=[];try{if(params.getAll('addons').length===1)selected=addonSelectionFromQuery(params.get('addons'));}catch{}
  for(const input of form.querySelectorAll('input[name^="addon_"]')){
   input.checked=selected.includes(input.name.slice(6));
   if(input.hasAttribute('data-retained-addon-input')){input.disabled=!input.checked;const row=input.closest('[data-retained-addon]');if(row)row.hidden=!input.checked;}
  }
  const retained=form.querySelector('[data-retained-addons]');if(retained)retained.hidden=!selected.length;
 }
 const initial={service:field('service').value,...Object.fromEntries(new FormData(form))};
 for(const key of Object.keys(inquiryContextFields))if(params.has(key))initial[key]=params.get(key);
 const context=publicInquiryContext(initial,annualEnabled);
 for(const key of Object.keys(inquiryContextFields)){
  const input=field(key);if(!input)continue;
  // Server prefill preserves valid historical source answers. Direct static previews
 // can only select choices actually present; they never insert arbitrary URL text.
  if(input.options){if(context[key]&&[...input.options].some(option=>option.value===context[key]))input.value=context[key];}
  else input.value=context[key]||(key==='request_kind'&&form.dataset.fixedService?'checkout':'');
 }
 const neutral=!form.dataset.fixedService&&!field('request_kind').value;
 const updateRequestSummary=()=>{
  const service=field('service').value,question=field('request_kind').value==='question';
  const values={service,...Object.fromEntries(new FormData(form))};
  const context=publicInquiryContext(values,annualEnabled);
  for(const key of Object.keys(inquiryContextFields)){
   const input=field(key);if(input?.type==='hidden'){input.value=context[key]||'';}
  }
  const current={service,...context};
  const additions=priceAddons(normalizeAddonSelection(values));
  const isBuild=['launch_site','focused_site','signature_site'].includes(service);
  const interest=field('care_interest'),interestPanel=form.querySelector('[data-care-interest]'),allowInterest=inquiryAllowsMonthlyInterest(values);
  if(interest){interest.value=context.care_interest||'';interest.disabled=!allowInterest;}
  if(interestPanel)interestPanel.hidden=!allowInterest;
  const picker=form.querySelector('[data-inquiry-addons]');if(picker){picker.hidden=!(isBuild&&!question||additions.ids.length);const catalogue=picker.querySelector?.('[data-addon-picker]');if(catalogue)catalogue.hidden=!(isBuild&&!question||!form.dataset.fixedService&&additions.ids.length);}
  const alternative=form.querySelector('[data-addon-alternative]');if(alternative)alternative.hidden=isBuild&&!question;
  const addonSummary=form.querySelector('[data-addon-summary]');
  if(addonSummary){
   addonSummary.hidden=!additions.ids.length;
   addonSummary.querySelector('[data-addon-names]').textContent=additions.lines.map(item=>item.public_name).join('; ');
   addonSummary.querySelector('[data-addon-total]').textContent=money(additions.total);
   const removalList=addonSummary.querySelector('[data-addon-removals]');
   if(removalList){
    removalList.replaceChildren(...additions.lines.map(item=>{
     const button=document.createElement('button');button.type='button';button.dataset.addonRemove=item.id;button.textContent='Remove '+item.public_name;return button;
    }));
   }
   const project=addonSummary.querySelector('[data-addon-project-total]'),payments=addonSummary.querySelector('[data-addon-payments]'),base=inquiryOffer(service);
   if(project)project.textContent=additions.ids.length&&isBuild?'Package + selected additions: '+money(base.price+additions.total)+' in one-time studio fees.':'';
   if(payments)payments.textContent=additions.ids.length&&isBuild?addonBuildPayments(base.price+additions.total):'';
  }
  const website=field('website'),websiteDetails=inquiryWebsiteField(current);
  website.required=websiteDetails.required;website.placeholder=websiteDetails.placeholder;
  form.querySelector('#website-help').textContent=websiteDetails.help;
  const websiteLabel=form.querySelector('label[for=website]'),websiteNote=websiteLabel?.querySelector('.field-note');if(websiteLabel&&websiteNote){websiteNote.textContent='('+websiteDetails.note+')';websiteLabel.replaceChildren(document.createTextNode(websiteDetails.label+' '),websiteNote);}
  const label=form.querySelector('[data-request-label]');
  label.replaceChildren(document.createTextNode(inquiryMessagePrompt(service,current.request_kind,neutral)+' '));
  const required=document.createElement('span');required.className='field-note';required.textContent='(required)';label.append(required);
  document.querySelector('#message-help').textContent=inquiryMessageHelp(service,current.request_kind,context.goal,neutral);
  form.querySelector('[data-request-submit]').textContent=inquirySubmitLabel(service,Boolean(form.dataset.fixedService),current.request_kind);
  const nextStep=form.querySelector('[data-request-next]');if(nextStep)nextStep.textContent=inquiryNextStep(service,current.request_kind);
  const wrapper=form.querySelector('.request-summary');if(wrapper)wrapper.hidden=!hasInquirySelection({...current,goal:form.querySelector('[data-goal-choices]')?'':current.goal});
  const summary=document.querySelector('#request-summary');
  const next=inquiryRequestSummary(current,undefined,{includeGoal:!form.querySelector('[data-goal-choices]')});if(summary&&summary.textContent!==next)summary.textContent=next;
  const changeService=form.querySelector('[data-change-service]');if(changeService)changeService.hidden=service==='unsure';
  const clearAddons=form.querySelector('[data-clear-addons]');if(clearAddons)clearAddons.hidden=!additions.ids.length;
  for(const questionLink of document.querySelectorAll('[data-checkout-question]')){
   const {add_ons=[],...linkContext}=selectedInquiryContext(current);
   const query=new URLSearchParams({offer:service,...linkContext,...(add_ons.length?{addons:add_ons.join(',')}:{}),request_kind:'question'});
   questionLink.href='/contact/?'+query.toString()+'#inquiry';
  }
 };
 form.querySelector('[data-change-service]')?.addEventListener('click',()=>{const choices=form.querySelector('#package-choice');if(choices)choices.open=true;field('service').focus();});
 form.querySelector('[data-clear-addons]')?.addEventListener('click',event=>{
  event.preventDefault();for(const input of form.querySelectorAll('input[name^="addon_"]'))input.checked=false;
  updateRequestSummary();const choices=form.querySelector('#package-choice');if(choices)choices.open=true;field('service').focus();
 });
 form.addEventListener('click',event=>{
  const remove=event.target.closest?.('[data-addon-remove]');if(!remove||!form.contains(remove))return;
  const input=field('addon_'+remove.dataset.addonRemove);if(!input)return;
  input.checked=false;updateRequestSummary();
  const next=form.querySelector('[data-addon-remove]')||form.querySelector('[data-inquiry-addons]:not([hidden]) [data-addon-picker]:not([hidden]) summary')||(form.dataset.fixedService?field('name'):field('service'));next?.focus();
 });
 form.addEventListener('input',()=>{if(form.dataset.mode==='live')countJourney(field('request_kind').value==='question'?'question_start':'request_start',field('service').value);});
 form.addEventListener('change',event=>{if(Object.hasOwn(inquiryContextFields,event.target.name)||event.target.name==='service'||event.target.name.startsWith('addon_'))updateRequestSummary();});
 updateRequestSummary();
 bindInquirySubmission(form,{countJourney});
}

// Anchor navigation preserves the visible form and gives keyboard users a real starting point.
document.querySelectorAll('[data-inquiry-jump]').forEach(link=>link.addEventListener('click',()=>{requestAnimationFrame(()=>{const first=document.querySelector('#inquiry #name');first?.focus({preventScroll:true});});}));
if(location.hash==='#inquiry')requestAnimationFrame(()=>document.querySelector('#inquiry')?.focus({preventScroll:true}));
