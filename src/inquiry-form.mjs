import {escapeHtml as e,money,inquiryChoices,inquiryChoiceLabel,inquiryOptionalFields,inquiryContextFields,inquiryRequestSummary,inquiryMessagePrompt,inquiryMessageHelp,publicInquiryContext,hasInquirySelection,inquiryWebsiteField,inquirySubmitLabel} from './shared.mjs';
import {addonPicker} from './addon-content.mjs';
import offers from '../config/offers.json' with {type:'json'};
import site from '../config/site.json' with {type:'json'};

export function inquiryFormMarkup(intake,{service='',checkout=false,value={},annualEnabled=offers.annual_enrollment_gate?.verified===true,recovery=false,errors={},headingLevel=checkout?3:2}={}){
 const selected=checkout?service:value.service||service||'unsure';
 if(!inquiryChoices.some(([id])=>id===selected))throw Error('Unknown inquiry service');
 if(![2,3].includes(headingLevel))throw Error('Unsupported inquiry heading level');
 const values={...value,service:selected};
 // Never retain inactive annual enrollment or irrelevant concepts through raw values.
 for(const key of Object.keys(inquiryContextFields))delete values[key];
 const publicContext=publicInquiryContext({...value,service:selected},annualEnabled);
 Object.assign(values,publicContext);
 values.request_kind=values.request_kind||(checkout?'checkout':'');
 const neutral=!checkout&&!values.request_kind,question=values.request_kind==='question';
 const website=inquiryWebsiteField(values),addonIds=publicContext.add_ons||[];
 const build=['launch_site','focused_site','signature_site'].includes(selected);
 const showAddonPicker=build||!checkout&&addonIds.length>0;
 const personal=(key,max)=>e(typeof values[key]==='string'?values[key].slice(0,max):'');
 const note=text=>`<span class="field-note">(${text})</span>`;
 const contextSelect=key=>{
  const field=inquiryContextFields[key];
  // Keep historical answers displayable without adding them to the short new list.
  const publicSources=[['search','Google search'],['maps','Google Maps'],['ai','AI assistant (ChatGPT, Copilot or similar)'],['referral','Recommended by someone'],['social','Social media'],['other','Other']];
  const options=key==='found_via'?publicSources:field.options;
  const legacy=field.options.find(([id])=>id===values[key]&&!options.some(([current])=>current===id));
  return `<div class="optional-choice" data-context-field="${key}"><label for="${key}">${field.label} ${note('optional')}</label><select id="${key}" name="${key}" aria-describedby="${key}-error"><option value="">${key==='found_via'?'Choose if you wish':'Not sure yet'}</option>${[...options,...(legacy?[legacy]:[])].map(([id,label])=>`<option value="${id}"${id===values[key]?' selected':''}>${e(label)}</option>`).join('')}</select><p class="error" id="${key}-error"></p></div>`;
 };
 const serviceControl=checkout?`<input type="hidden" id="service" name="service" value="${selected}">`
  :`<label for="service">What do you need help with? ${note('optional')}</label><select id="service" name="service" aria-describedby="service-error">${inquiryChoices.map(([id])=>`<option value="${id}"${id===selected?' selected':''}>${e(inquiryChoiceLabel(id))}</option>`).join('')}</select><p id="service-error" class="error"></p>`;
 const {add_ons,...clearContext}=publicInquiryContext(values,annualEnabled);
 const clearQuery=new URLSearchParams({...(selected!=='unsure'?{offer:selected}:{}),...clearContext});
 const clearHref='/contact/'+(clearQuery.size?'?'+clearQuery.toString():'')+'#inquiry';
 // Non-build checkouts keep explicitly selected extras without offering all twelve.
 // Hidden, disabled rows also let a static preview safely hydrate a valid query.
 const retainedAddons=checkout&&!build?`<fieldset data-retained-addons${addonIds.length?'':' hidden'}><legend>Selected additional work</legend>${offers.add_ons.map(item=>`<label data-retained-addon${addonIds.includes(item.id)?'':' hidden'} for="inquiry-addon-${item.id}"><input type="checkbox" data-retained-addon-input name="addon_${item.id}" id="inquiry-addon-${item.id}" value="1"${addonIds.includes(item.id)?' checked':' disabled'}>${e(item.public_name)} — ${money(item.public_price)} extra</label>`).join('')}<p class="hint">These additions are separate one-time work. Your written proposal confirms the work and price.</p></fieldset><p class="error" id="add_ons-error" role="alert"></p>`:'';
 const addons=!checkout||build?`<div data-inquiry-addons${showAddonPicker?'':' hidden'}>${addonPicker(offers,{ids:addonIds,service:selected})}</div>`:retainedAddons;
 const nextStep=neutral?'I read your message and reply by email.':question?'I read your question and reply by email.':'I review your project and email you about the work, price and available dates.';
 let markup=`<form id="inquiry" tabindex="-1" data-neutral-message="${neutral}" data-mode="${intake.live?'live':'synthetic'}" data-annual-enabled="${annualEnabled?'true':'false'}" data-heading-level="${headingLevel}" action="/api/inquiries" method="post"${checkout?` data-fixed-service="${selected}"`:''}>
 ${checkout?'':`<div class="request-summary" role="group" aria-label="Selected request"${hasInquirySelection(values)?'':' hidden'}><p id="request-summary">${e(inquiryRequestSummary(values))}</p><p><a data-change-service href="#service"${selected==='unsure'?' hidden':''}>Change service</a><a data-clear-addons href="${e(clearHref)}"${addonIds.length?'':' hidden'}>Remove additions</a></p></div>`}
 <label for="name">Your name ${note('required')}</label><input id="name" name="name" autocomplete="name" required maxlength="100" value="${personal('name',100)}" aria-describedby="name-error"><p id="name-error" class="error"></p>
 <label for="email">Email ${note('required')}</label><input id="email" name="email" type="email" pattern=".+@[^.]+(?:\\.[^.]+)+" title="Enter a full email, like name@business.com." autocomplete="email" required maxlength="254" value="${personal('email',254)}" aria-describedby="email-error email-hint"><p id="email-error" class="error"></p><p id="email-hint" class="hint" aria-live="polite"></p>
 ${serviceControl}<input type="hidden" id="request_kind" name="request_kind" value="${e(values.request_kind)}">
 <label for="website">${website.label} ${note(website.note)}</label><input id="website" name="website" type="text"${website.required?' required':''} autocomplete="url" placeholder="${website.placeholder}" maxlength="500" value="${personal('website',500)}" aria-describedby="website-help website-error"><p id="website-help" class="hint">${e(website.help)}</p><p id="website-error" class="error"></p>
 <label for="message" data-request-label>${e(inquiryMessagePrompt(selected,values.request_kind,neutral))} ${note('required')}</label><p id="message-help" class="hint">${e(inquiryMessageHelp(selected,values.request_kind,values.goal,neutral))}</p><textarea id="message" name="message" rows="5" required minlength="10" maxlength="3000" aria-describedby="message-help message-error message-counter">${personal('message',3000)}</textarea><p id="message-counter" class="hint" aria-live="off" hidden></p><p id="message-error" class="error"></p>
 <details class="inquiry-extra"><summary>Business name (optional)</summary><label for="business">Business name ${note('optional')}</label><input id="business" name="business" autocomplete="organization" maxlength="160" value="${personal('business',160)}" aria-describedby="business-error"><p id="business-error" class="error"></p></details><input type="hidden" id="goal" name="goal" value="${e(values.goal||'')}">
 ${inquiryOptionalFields(values,true,annualEnabled)}${addons}
 <p data-addon-alternative${showAddonPicker?' hidden':''}>Need extra pages or tools? Mention them in your message. <a href="/services/website-addons/">See the options and prices</a>.</p>
 ${contextSelect('found_via')}
 <div class="honeypot" aria-hidden="true"><label for="_wm_note">Leave empty</label><input id="_wm_note" name="_wm_note" tabindex="-1" autocomplete="off" data-1p-ignore data-lpignore="true" data-bwignore></div><p>Details are used to review and respond to this request. <a href="/privacy/">${e(intake.privacyLink||'Privacy notice')}</a>.</p>
 <div class="inquiry-next"><h${headingLevel}>What happens next</h${headingLevel}><p data-request-next>${nextStep}</p>${checkout?'':`<p>Nothing is booked or charged when you send this.</p>${intake.live?`<p class="inquiry-response-time">${e(site.responseWindow)}</p>`:''}`}${intake.live?'':'<p class="inquiry-response-time">Synthetic test only. No email is sent and no reply is expected.</p>'}</div><div id="form-status" role="status" aria-live="polite" tabindex="-1"></div><button type="submit" data-request-submit>${e(inquirySubmitLabel(selected,checkout,values.request_kind))}</button><p class="form-help">Trouble sending? Email <a href="mailto:support@wonderandmethod.com">support@wonderandmethod.com</a>.</p>${recovery?'':'<noscript><p>You can submit without JavaScript. A confirmation page will show your reference.</p></noscript>'}</form>`;
 markup=markup.replace(/(<p\b[^>]*\bid="([a-z_]+)-error"[^>]*>)(<\/p>)/g,(_all,start,key,end)=>start+e(errors[key]||'')+end);
 return markup.replace(/<(?:input|select|textarea)\b[^>]*\bname="([a-z_]+)"[^>]*>/g,(tag,key)=>errors[key]&&!tag.includes('type="hidden"')?tag.slice(0,-1)+' aria-invalid="true">':tag);
}

export function inquiryForm(intake,options={}){
 return '<section id="inquiry-confirmation" class="inquiry-confirmation" hidden tabindex="-1" aria-labelledby="inquiry-confirmation-heading"></section>'+inquiryFormMarkup(intake,options);
}
