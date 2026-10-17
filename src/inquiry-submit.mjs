import {inquiryConfirmationHtml} from './inquiry-confirmation.mjs';
import {selectedInquiryContext} from './shared.mjs';

export function bindInquirySubmission(form, {countJourney=()=>{}, document=globalThis.document, fetch=globalThis.fetch, FormData=globalThis.FormData}={}) {
  const status=document.querySelector('#form-status');
  const confirmation=document.querySelector('#inquiry-confirmation');
  const button=form.querySelector('[type=submit]');
  let pending=false;
  const focusInvalid=input=>{let details=input.closest?.('details');while(details){details.open=true;details=details.parentElement?.closest('details');}input.focus();};
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(pending||form.hidden)return;
    let first;
    for(const input of form.querySelectorAll('[aria-describedby]')){
      const error=document.getElementById(input.id+'-error');
      if(!error)continue;
      const valid=input.checkValidity();
      error.textContent=valid?'':`Error: ${input.validationMessage}`;
      input.setAttribute('aria-invalid',String(!valid));
      if(!valid&&!first)first=input;
    }
    if(first){focusInvalid(first);return;}
    const submitted=Object.fromEntries(new FormData(form));
    const label=button.textContent;
    pending=true;
    button.disabled=true;
    button.textContent='Sending…';
    form.setAttribute('aria-busy','true');
    status.textContent='Sending your request. Please keep this page open…';
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(form.action,{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(submitted)});
      let result;
      try{result=await response.json();}catch{throw new Error('We could not confirm this submission. Your entries remain here; please try again or contact the studio.');}
      if(!response.ok){
        for(const [key,message] of Object.entries(result?.errors||{})){
          const input=form.elements.namedItem(key),error=document.getElementById(key+'-error');
          if(input&&error){error.textContent='Error: '+message;input.setAttribute('aria-invalid','true');first??=input;}
        }
        throw new Error(result?.message||'The inquiry could not be saved. Your entries remain here; please try again.');
      }
      if(typeof result?.reference!=='string'||!result.reference.trim()||typeof result.synthetic!=='boolean')throw new Error('We could not confirm this submission. Your entries remain here; please contact the studio before sending again.');
      const realSaved=form.dataset.mode==='live'&&result.synthetic===false&&!/synthetic/i.test(result.message||'');
      confirmation.innerHTML=inquiryConfirmationHtml({reference:result.reference,synthetic:!realSaved,service:submitted.service,...selectedInquiryContext(submitted)});
      confirmation.hidden=false;
      form.hidden=true;
      form.reset();
      confirmation.focus({preventScroll:true});
      confirmation.scrollIntoView({behavior:'instant',block:'start'});
      // Measurement must never interrupt a receipt that is already confirmed.
      if(realSaved){try{countJourney(submitted.request_kind==='question'?'question_saved':'inquiry_saved',submitted.service);}catch{}}
    }catch(error){
      status.textContent=error.name==='AbortError'?'The connection took too long to confirm. Your entries remain here; please try again or contact the studio.':error instanceof TypeError?'Connection failed. Your entries are still here; please try again or email support@wonderandmethod.com.':error.message;
      if(first)focusInvalid(first);else status.focus();
    }finally{
      clearTimeout(timeout);
      pending=false;
      button.disabled=false;
      button.textContent=label;
      form.setAttribute('aria-busy','false');
    }
  });
}
