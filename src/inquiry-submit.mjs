import {validateInquiry,inquiryFieldMessage,inquiryChoiceErrorKeys,inquiryValidationMessage} from './inquiry.mjs';
import {inquiryConfirmationHtml} from './inquiry-confirmation.mjs';
import {selectedInquiryContext} from './shared.mjs';

export function emailTypoSuggestion(email=''){
  const split=String(email).trim().split('@');if(split.length!==2||!split[0])return '';
  const domain=split[1].toLowerCase(),known={'gmail.con':'gmail.com','gmail.cmo':'gmail.com','gmial.com':'gmail.com','gamil.com':'gmail.com','yahoo.con':'yahoo.com','yahoo.cmo':'yahoo.com','outlook.con':'outlook.com','outlook.cmo':'outlook.com','hotmail.con':'hotmail.com','hotmail.cmo':'hotmail.com'};
  return known[domain]?split[0]+'@'+known[domain]:'';
}

export function bindInquirySubmission(form, {countJourney=()=>{}, document=globalThis.document, fetch=globalThis.fetch, FormData=globalThis.FormData}={}) {
  const status=document.querySelector('#form-status');
  const confirmation=document.querySelector('#inquiry-confirmation');
  const button=form.querySelector('[type=submit]');
  const email=form.elements.namedItem('email'),emailHint=document.getElementById('email-hint');
  const showEmailHint=()=>{if(emailHint){const suggestion=emailTypoSuggestion(email?.value);emailHint.textContent=suggestion?'Did you mean '+suggestion+'? You can change the address above, or keep it as entered.':'';}};
  email?.addEventListener?.('input',showEmailHint);
  email?.addEventListener?.('blur',showEmailHint);
  const message=form.elements.namedItem('message'),counter=document.getElementById('message-counter');
  const showMessageCount=()=>{if(counter&&message){const remaining=3000-message.value.length;counter.hidden=remaining>500;counter.textContent=remaining>=0?`${remaining.toLocaleString('en-US')} characters remaining. Email longer notes to support@wonderandmethod.com.`:'Message is too long. Email longer notes to support@wonderandmethod.com.';}};
  message?.addEventListener?.('input',showMessageCount);
  message?.addEventListener?.('paste',event=>{
   const text=event.clipboardData?.getData('text');if(typeof text!=='string')return;
   const selected=(message.selectionEnd||0)-(message.selectionStart||0);
   if(message.value.length-selected+text.length<=3000)return;
   event.preventDefault();
   const error=document.getElementById('message-error');
   if(error)error.textContent='That paste would exceed 3,000 characters, so I have kept your existing text. Email the longer notes to support@wonderandmethod.com.';
  });
  showMessageCount();
  let pending=false;
  const preference=form.elements.namedItem('reply_preference'),phone=form.elements.namedItem('callback_phone'),phoneWrap=form.querySelector('[data-callback-number]');
  const syncCallback=()=>{if(!phone)return;const requested=preference?.value==='callback';phone.disabled=!requested;phone.required=requested;if(phoneWrap)phoneWrap.hidden=!requested;};
  preference?.addEventListener?.('change',syncCallback);syncCallback();
  const review=form.querySelector('[data-review-inquiry-choices]');
  let choiceReviewPending=false;
  review?.addEventListener?.('click',()=>{if(!pending&&!form.hidden)form.submit();});
  const editable=input=>Boolean(input&&!input.disabled&&input.type!=='hidden'&&!input.closest?.('[hidden]'));
  const offerChoiceReview=errors=>{
    const needed=Object.keys(errors||{}).some(key=>inquiryChoiceErrorKeys.has(key)&&(!editable(fieldControl(key))||!document.getElementById(key+'-error')));
    if(needed&&review){review.hidden=false;choiceReviewPending=true;}
    return needed;
  };
  const validationContext=(key,data)=>key==='website'?`${data.service}:${data.request_kind}`:key==='callback_phone'?data.reply_preference||'email':'';
  const focusInvalid=input=>{let details=input.closest?.('details');while(details){details.open=true;details=details.parentElement?.closest('details');}input.focus();};
  const errorFor=input=>document.getElementById((input.name||input.id)+'-error');
  const fieldControl=key=>{const input=form.elements.namedItem(key);return input?.focus?input:input?.[0];};
  const fields=[...form.querySelectorAll('[aria-describedby]')].filter(input=>errorFor(input)).filter((input,index,all)=>all.findIndex(other=>(other.name||other.id)===(input.name||input.id))===index);
  const touched=new Set(),serverErrors=new Map();
  let validationStatus=false;
  const values=()=>Object.fromEntries(new FormData(form));
  const renderField=(input,message='')=>{
    errorFor(input).textContent=message;
    input.setAttribute('aria-invalid',String(Boolean(message)));
  };
  const syncValidationStatus=()=>{
    const count=fields.filter(input=>errorFor(input).textContent).length;
    if(count){status.textContent=`Please correct ${count===1?'the highlighted field':`the ${count} highlighted fields`}.`;validationStatus=true;}
    else if(validationStatus){status.textContent='';validationStatus=false;}
  };
  const validateField=(input,data=values())=>{
    const key=input.name||input.id,server=serverErrors.get(key);
    if(!editable(input)){serverErrors.delete(key);renderField(input,'');return;}
    // Preserve a server rejection until this value actually changes.
    const context=validationContext(key,data);
    if(server&&server.value===data[key]&&server.context===context){renderField(input,server.message);return;}
    serverErrors.delete(key);
    const error=input.checkValidity()?validateInquiry(data).errors[key]:inquiryFieldMessage(key,input.validity);
    renderField(input,error);
  };
  for(const input of fields){
    if(errorFor(input).textContent)touched.add(input);
    input.addEventListener?.('blur',event=>{
      if(pending||form.hidden)return;
      touched.add(input);
      // Submit validates all fields. Inserting an error between pointer down
      // and up can move that button and swallow the visitor's first click.
      if(event?.relatedTarget===button)return;
      validateField(input);syncValidationStatus();
    });
    const onEdit=()=>{
      if(pending||form.hidden)return;
      // Recheck an existing error while typing; do not announce new errors on
      // each keystroke in a field that has not yet been left or submitted.
      if(touched.has(input)&&errorFor(input).textContent){validateField(input);syncValidationStatus();}
    };
    input.addEventListener?.('input',onEdit);
    input.addEventListener?.('change',onEdit);
  }
  form.addEventListener('change',event=>{
    if(pending||form.hidden||!['service','goal','reply_preference'].includes(event.target?.name))return;
    // This form listener runs after client.js updates dependent requirements.
    // Recheck visible errors only, retaining unrelated server rejections.
    const data=values();
    for(const input of fields)if(errorFor(input).textContent)validateField(input,data);
    syncValidationStatus();
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(pending||form.hidden)return;
    let first;
    serverErrors.clear();
    const data=values();
    for(const input of fields){
      touched.add(input);validateField(input,data);
      if(errorFor(input).textContent&&!first)first=input;
    }
    if(first){syncValidationStatus();focusInvalid(first);return;}
    showEmailHint();
    const validation=validateInquiry(data);
    for(const [key,message] of Object.entries(validation.errors)){
      const input=fieldControl(key),error=document.getElementById(key+'-error');
      if(editable(input)&&error){error.textContent=message;input.setAttribute('aria-invalid','true');first??=input;}
    }
    if(Object.keys(validation.errors).length){const reviewNeeded=offerChoiceReview(validation.errors);status.textContent=inquiryValidationMessage(validation.errors)+(reviewNeeded?' Use Review current choices to keep your entries and review a corrected form.':'');if(first)focusInvalid(first);else if(reviewNeeded)review.focus();else status.focus();return;}
    const submitted=validation.value;
    const label=button.textContent;
    pending=true;
    validationStatus=false;
    button.disabled=true;
    button.textContent='Sending…';
    form.setAttribute('aria-busy','true');
    status.textContent='Sending your request. Please keep this page open…';
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(form.action,{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(submitted)});
      let result;
      try{result=await response.json();}catch{throw new Error('I couldn’t confirm that your message was saved. Your entries are kept here. Please try again, or email support@wonderandmethod.com.');}
      if(!response.ok){
        for(const [key,message] of Object.entries(result?.errors||{})){
          const input=fieldControl(key),error=document.getElementById(key+'-error');
          if(editable(input)&&error){error.textContent=message;input.setAttribute('aria-invalid','true');serverErrors.set(key,{value:data[key],message,context:validationContext(key,data)});validationStatus=true;first??=input;}
        }
        const reviewNeeded=offerChoiceReview(result?.errors);
        if(reviewNeeded)throw new Error('Some service choices need to be reviewed. Your message has not been saved. Use Review current choices to keep your entries and review a corrected form.');
        throw new Error(result?.message||'I couldn’t save your message. Your entries are kept here. Please try again, or email support@wonderandmethod.com.');
      }
      if(typeof result?.reference!=='string'||!result.reference.trim()||typeof result.synthetic!=='boolean')throw new Error('I couldn’t confirm that your message was saved. Your entries are kept here. Please email support@wonderandmethod.com before sending again.');
      const realSaved=form.dataset.mode==='live'&&result.synthetic===false&&!/synthetic/i.test(result.message||'');
      confirmation.innerHTML=inquiryConfirmationHtml({reference:result.reference,synthetic:!realSaved,email:submitted.email,service:submitted.service,reply_preference:submitted.reply_preference,email_receipt:submitted.email_receipt,...selectedInquiryContext(submitted)});
      confirmation.hidden=false;
      form.hidden=true;
      form.reset();
      confirmation.focus({preventScroll:true});
      confirmation.scrollIntoView({behavior:'instant',block:'start'});
      // Measurement must never interrupt a receipt that is already confirmed.
      if(realSaved){try{countJourney(submitted.request_kind==='question'?'question_saved':'inquiry_saved',submitted.service);}catch{}}
    }catch(error){
      status.textContent=error.name==='AbortError'?'I couldn’t confirm your message before the connection timed out. Your entries are kept here. Please try again, or email support@wonderandmethod.com.':error instanceof TypeError?'I couldn’t confirm that your message was saved because the connection was interrupted. Your entries are kept here. Please try again, or email support@wonderandmethod.com.':error.message;
      if(!status.textContent.includes('support@wonderandmethod.com'))status.textContent+=' For help, email support@wonderandmethod.com.';
      if(first)focusInvalid(first);else if(choiceReviewPending&&review)review.focus();else status.focus();
    }finally{
      clearTimeout(timeout);
      pending=false;
      button.disabled=false;
      button.textContent=label;
      form.setAttribute('aria-busy','false');
    }
  });
  // Leave native browser validation enabled until the enhanced handler exists.
  form.noValidate=true;
}
