import {escapeHtml as e,inquiryChoices,inquiryOptionalFields,inquiryContextFields,inquiryRequestSummary,inquiryMessagePrompt,inquiryMessageHelp,publicInquiryContext,hasInquirySelection} from './shared.mjs';
import offers from '../config/offers.json' with {type:'json'};
import site from '../config/site.json' with {type:'json'};

export function inquiryFormMarkup(intake,{service='',checkout=false,value={},annualEnabled=offers.annual_enrollment_gate?.verified===true,recovery=false,errors={}}={}){
 const selected=checkout?service:value.service||service||'unsure';
 if(!inquiryChoices.some(([id])=>id===selected))throw Error('Unknown inquiry service');
 const values={...value,service:selected};
 // Never retain inactive annual enrollment or irrelevant concepts through raw values.
 for(const key of Object.keys(inquiryContextFields))delete values[key];
 Object.assign(values,publicInquiryContext({...value,service:selected},annualEnabled));
 values.request_kind=values.request_kind||(checkout?'checkout':'question');
 const question=values.request_kind==='question';
 const personal=(key,max)=>e(typeof values[key]==='string'?values[key].slice(0,max):'');
 const note=text=>`<span class="field-note">(${text})</span>`;
 const contextSelect=key=>{
  const field=inquiryContextFields[key];
  // Existing answers remain displayable; new visitors get a short, optional list.
  const publicSources=[['search','Google or another search engine'],['ai','AI assistant (ChatGPT, Copilot or similar)'],['referral','Recommended by someone'],['returning','Been here before'],['other','Other']];
  const options=key==='found_via'?publicSources:field.options;
  const legacy=field.options.find(([id])=>id===values[key]&&!options.some(([current])=>current===id));
  return `<div class="optional-choice" data-context-field="${key}"><label for="${key}">${field.label} ${note('optional')}</label><select id="${key}" name="${key}" aria-describedby="${key}-error"><option value="">${key==='found_via'?'Choose if you wish':'Not sure yet'}</option>${[...options,...(legacy?[legacy]:[])].map(([id,label])=>`<option value="${id}"${id===values[key]?' selected':''}>${e(label)}</option>`).join('')}</select><p class="error" id="${key}-error"></p></div>`;
 };
 const serviceControl=checkout?`<input type="hidden" id="service" name="service" value="${selected}">`
  :`<label for="service">Which plan? ${note('optional')}</label><select id="service" name="service" aria-describedby="service-error">${inquiryChoices.map(([id,label])=>`<option value="${id}"${id===selected?' selected':''}>${e(label)}</option>`).join('')}</select><p id="service-error" class="error"></p>`;
 let markup=`<form id="inquiry" tabindex="-1" data-mode="${intake.live?'live':'synthetic'}" data-annual-enabled="${annualEnabled?'true':'false'}" action="/api/inquiries" method="post"${checkout?` data-fixed-service="${selected}"`:''}>
 <div class="request-summary" role="group" aria-label="Selected request"${checkout||hasInquirySelection(values)?'':' hidden'}><div><h2 class="request-summary-heading">Your selected request</h2><p id="request-summary">${e(inquiryRequestSummary(values))}</p><p id="request-pack-link"></p><p><a href="#request_kind">Change what you're asking for</a>${checkout?' · <a href="/pricing/">Change service</a>':' · <a href="#service">Change service</a>'}</p></div></div>
 <label for="name">Your name ${note('required')}</label><input id="name" name="name" autocomplete="name" required maxlength="100" value="${personal('name',100)}" aria-describedby="name-error"><p id="name-error" class="error"></p>
 <label for="email">Email ${note('required')}</label><input id="email" name="email" type="email" pattern=".+@[^.]+(?:\\.[^.]+)+" title="Enter a full email, like name@business.com." autocomplete="email" required maxlength="254" value="${personal('email',254)}" aria-describedby="email-error email-hint"><p id="email-error" class="error"></p><p id="email-hint" class="hint" aria-live="polite"></p>
 <div class="request-type" data-context-field="request_kind"><label for="request_kind">What would you like to do?</label><select id="request_kind" name="request_kind" aria-describedby="request_kind-error"><option value="checkout"${question?'':' selected'}>Get a proposal</option><option value="question"${question?' selected':''}>Ask a question</option></select><p id="request_kind-error" class="error"></p></div>
 ${checkout?serviceControl:''}
 <label for="website">Website or social page ${note('optional')}</label><input id="website" name="website" type="text" autocomplete="url" placeholder="example.com or @yourbusiness" maxlength="500" value="${personal('website',500)}" aria-describedby="website-help website-error"><p id="website-help" class="hint">A link, social handle or short note is fine. Leave this blank if you do not have one.</p><p id="website-error" class="error"></p>
 <label for="message" data-request-label>${e(inquiryMessagePrompt(selected,values.request_kind))} ${note('required')}</label><textarea id="message" name="message" rows="5" required minlength="10" maxlength="3000" aria-describedby="message-help message-error">${personal('message',3000)}</textarea><p id="message-help" class="hint">${e(inquiryMessageHelp(selected,values.request_kind,values.goal))}</p><p id="message-error" class="error"></p>
 <details class="inquiry-extra"><summary>${checkout?'Add business details (optional)':'Add business details or choose a service (optional)'}</summary><p>Share what you know. You can leave these choices as they are.</p><label for="business">Business name ${note('optional')}</label><input id="business" name="business" autocomplete="organization" maxlength="160" value="${personal('business',160)}" aria-describedby="business-error"><p id="business-error" class="error"></p>${contextSelect('goal')}${checkout?'':serviceControl}</details>
 ${inquiryOptionalFields(values,true,annualEnabled)}${contextSelect('found_via')}
 <div class="honeypot" aria-hidden="true"><label for="_faxcheck">Leave empty</label><input id="_faxcheck" name="_faxcheck" tabindex="-1" autocomplete="off"></div><p>Details are used to review and respond to this request. <a href="/privacy/">${e(intake.privacyLink||'Privacy notice')}</a>.</p>
 ${checkout?`<p class="checkout-no-charge"${question?' hidden':''}><strong>No payment is taken here.</strong> We confirm scope and available dates first. You review the written scope before receiving a private Stripe payment link.</p>`:''}
 ${intake.live?`<p class="inquiry-response-time">${e(site.responseWindow)}</p>`:'<p class="inquiry-response-time">Synthetic test only. No email is sent and no reply is expected.</p>'}<p class="form-help">Need help sending this? Email <a href="mailto:support@wonderandmethod.com">support@wonderandmethod.com</a>.</p><div id="form-status" role="status" aria-live="polite" tabindex="-1"></div><button type="submit" data-request-submit>${question?'Send question':'Request a proposal'}</button>${recovery?'':'<noscript><p>You can submit without JavaScript. A confirmation page will show your reference.</p></noscript>'}</form>`;
 markup=markup.replace(/(<p\b[^>]*\bid="([a-z_]+)-error"[^>]*>)(<\/p>)/g,(_all,start,key,end)=>start+e(errors[key]||'')+end);
 return markup.replace(/<(?:input|select|textarea)\b[^>]*\bname="([a-z_]+)"[^>]*>/g,(tag,key)=>errors[key]&&!tag.includes('type="hidden"')?tag.slice(0,-1)+' aria-invalid="true">':tag);
}

export function inquiryForm(intake,options={}){
 return '<section id="inquiry-confirmation" class="inquiry-confirmation" hidden tabindex="-1" aria-labelledby="inquiry-confirmation-heading"></section>'+inquiryFormMarkup(intake,options);
}
