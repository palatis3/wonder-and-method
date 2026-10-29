import {inquiryNextStep} from './inquiry-next-step.mjs';
import {escapeHtml as e,money,inquiryChoices,inquiryChoiceLabel,inquiryOptionalFields,inquiryContextFields,inquiryRequestSummary,inquiryMessagePrompt,inquiryMessageHelp,publicInquiryContext,hasInquirySelection,inquiryWebsiteField,inquirySubmitLabel} from './shared.mjs';
import {addonPicker} from './addon-content.mjs';
import defaultOffers from '../config/offers.json' with {type:'json'};
import site from '../config/site.json' with {type:'json'};

export function inquiryFormWebsiteField(value={},checkout=false,offers=defaultOffers){
 // Editable native forms cannot change a required attribute when the service
 // changes. The server checks the selected service; enhancement updates the field.
 if(!checkout&&value.request_kind==='checkout')return {
  label:'Website or social page',note:'required only for review proposals',required:false,placeholder:'example.com or @yourbusiness',
  help:`For a ${offers.baseline.public_name} or ${offers.audit_sprint.public_name} proposal, add the public website address to review. For other services, a website or social page is optional. Leave blank if you do not have one.`
 };
 return inquiryWebsiteField(value);
}

export function inquiryFormMarkup(intake,{service='',checkout=false,value={},offers=defaultOffers,annualEnabled=offers.annual_enrollment_gate?.verified===true,recovery=false,errors={},headingLevel=checkout?3:2}={}){
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
 const website=inquiryFormWebsiteField(values,checkout,offers),addonIds=publicContext.add_ons||[];
 const build=['launch_site','focused_site','business_site','signature_site','storefront'].includes(selected);
 const showAddonPicker=build&&!question||!checkout&&addonIds.length>0;
 const personal=(key,max)=>e(typeof values[key]==='string'?values[key].slice(0,max):'');
 const note=text=>`<span class="field-note">(${text})</span>`;
 const contextSelect=key=>{
  const field=inquiryContextFields[key];
  // Keep historical answers displayable without adding them to the short new list.
  const publicSources=[['search','Google or another search engine'],['maps','Google Maps'],['ai','AI assistant (ChatGPT, Copilot or similar)'],['referral','Recommended by someone'],['social','Social media'],['other','Other']];
  const options=key==='found_via'?publicSources:field.options;
  const legacy=field.options.find(([id])=>id===values[key]&&!options.some(([current])=>current===id));
  return `<div class="optional-choice" data-context-field="${key}"><label for="${key}">${field.label} ${note('optional')}</label><select id="${key}" name="${key}" aria-describedby="${key}-error"><option value="">${key==='found_via'?'Choose if you wish':'Not sure yet'}</option>${[...options,...(legacy?[legacy]:[])].map(([id,label])=>`<option value="${id}"${id===values[key]?' selected':''}>${e(label)}</option>`).join('')}</select><p class="error" id="${key}-error"></p></div>`;
 };
 const serviceControl=checkout?`<input type="hidden" id="service" name="service" value="${selected}">`
  :`<label for="service">Package or service ${note('optional')}</label><select id="service" name="service" aria-describedby="service-error">${inquiryChoices.map(([id])=>`<option value="${id}"${id===selected?' selected':''}>${e(inquiryChoiceLabel(id,offers))}</option>`).join('')}</select><p id="service-error" class="error"></p>`;
 const goalLabels={new_website:'A new website',redesign:'Improve my website',fix:'Fix a problem',search:'Get found in search',care:'Ongoing help',unsure:'Help me choose'};
 const goalControl=checkout?`<input type="hidden" id="goal" name="goal" value="${e(values.goal||'')}">`:`<fieldset class="inquiry-goals" data-goal-choices><legend>What do you need? ${note('optional')}</legend><div class="inquiry-goal-grid">${inquiryContextFields.goal.options.map(([id,label])=>`<label class="inquiry-goal" for="goal-${id}"><input type="radio" id="goal-${id}" name="goal" value="${id}"${values.goal===id?' checked':''} aria-describedby="goal-error"><span>${e(goalLabels[id]||label)}</span></label>`).join('')}</div><p id="goal-error" class="error"></p></fieldset>`;
 const packageControl=checkout?serviceControl:`<details class="inquiry-package-choice" id="package-choice"${errors.service?' open':''}><summary>Already have a package in mind? (optional)</summary><p class="hint">Otherwise, leave this as “Not sure” and tell me what you need in your message.</p>${serviceControl}</details>`;
 const careInterest=(!checkout||build)?`<details class="inquiry-extra monthly-interest" data-care-interest${values.care_interest||errors.care_interest?' open':''}><summary>Monthly help after launch (optional)</summary><label for="care_interest">Would you like to discuss a monthly plan?</label><select id="care_interest" name="care_interest" aria-describedby="care_interest-help care_interest-error"><option value="">No monthly plan selected</option>${['keep_running','improve','local_focus','grow'].map(id=>`<option value="${id}"${values.care_interest===id?' selected':''}>${e(offers.plans[id].public_name)} — ${money(offers.plans[id].monthly_price)}/month</option>`).join('')}<option value="discuss"${values.care_interest==='discuss'?' selected':''}>Help me compare the options</option></select><p id="care_interest-help" class="hint">For a website build, this records interest only. Monthly work, price and start date need a separate agreement. Nothing is added to the website price or enrolled automatically. <a href="/pricing/#after-launch">See monthly plans and what they cover</a>.</p><p id="care_interest-error" class="error"></p></details>`:'';
 const {add_ons,...clearContext}=publicInquiryContext(values,annualEnabled);
 const clearQuery=new URLSearchParams({...(selected!=='unsure'?{offer:selected}:{}),...clearContext});
 const clearHref='/contact/'+(clearQuery.size?'?'+clearQuery.toString():'')+'#inquiry';
 // Non-build checkouts keep explicitly selected extras without offering all twelve.
 // Hidden, disabled rows also let a static preview safely hydrate a valid query.
 const retainedAddons=checkout&&!build?`<fieldset data-retained-addons${addonIds.length?'':' hidden'}><legend>Selected additional work</legend>${offers.add_ons.map(item=>`<label data-retained-addon${addonIds.includes(item.id)?'':' hidden'} for="inquiry-addon-${item.id}"><input type="checkbox" data-retained-addon-input name="addon_${item.id}" id="inquiry-addon-${item.id}" value="1"${addonIds.includes(item.id)?' checked':' disabled'}>${e(item.public_name)} — ${money(item.public_price)} extra</label>`).join('')}<p class="hint">These additions are separate one-time work. Your written proposal confirms the work and price.</p></fieldset><p class="error" id="add_ons-error" role="alert"></p>`:'';
 const pickerMarkup=addonPicker(offers,{ids:addonIds,service:selected}).replace('data-addon-picker>','data-addon-picker'+(showAddonPicker?'':' hidden')+'>');
 const addons=!checkout||build?`<div data-inquiry-addons${showAddonPicker||addonIds.length?'':' hidden'}>${pickerMarkup}</div>`:retainedAddons;
 const nextStep=inquiryNextStep(selected,values.request_kind);
 let markup=`<form id="inquiry" tabindex="-1" data-neutral-message="${neutral}" data-mode="${intake.live?'live':'synthetic'}" data-annual-enabled="${annualEnabled?'true':'false'}" data-heading-level="${headingLevel}" action="/api/inquiries" method="post"${checkout?` data-fixed-service="${selected}"`:''}>
 <div class="inquiry-expectation"><p class="inquiry-response-time">${intake.live?e(site.responseWindow):'Synthetic test only. No email is sent and no reply is expected.'}</p><p>A question is free. Nothing is booked or charged by sending this form.</p></div>
 ${checkout?'':`<div class="request-summary" role="group" aria-label="Selected request"${hasInquirySelection({...values,goal:''})?'':' hidden'}><p class="request-summary-heading">Your selection</p><p id="request-summary">${e(inquiryRequestSummary(values,offers,{includeGoal:false}))}</p><p><a data-change-service href="#service"${selected==='unsure'?' hidden':''}>Change service</a><a data-clear-addons href="${e(clearHref)}"${addonIds.length?'':' hidden'}>Remove additions</a></p></div>`}
 <label for="name">Your name ${note('required')}</label><input id="name" name="name" autocomplete="name" required maxlength="100" value="${personal('name',100)}" aria-describedby="name-error"><p id="name-error" class="error"></p>
 <label for="email">Email ${note('required')}</label><input id="email" name="email" type="email" pattern=".+@[^.]+(?:\\.[^.]+)+" title="Enter a full email, like name@business.com." autocomplete="email" required maxlength="254" value="${personal('email',254)}" aria-describedby="email-error email-hint"><p id="email-error" class="error"></p><p id="email-hint" class="hint" aria-live="polite"></p>
 <label for="message" data-request-label>${e(inquiryMessagePrompt(selected,values.request_kind,neutral))} ${note('required')}</label><p id="message-help" class="hint">${e(inquiryMessageHelp(selected,values.request_kind,values.goal,neutral,offers))}</p><textarea id="message" name="message" rows="5" required minlength="10" maxlength="3000" aria-describedby="message-help message-error message-counter">${personal('message',3000)}</textarea><p id="message-counter" class="hint" aria-live="off" hidden></p><p id="message-error" class="error"></p>
 ${goalControl}${packageControl}
 <details class="inquiry-extra" data-callback-choice${values.reply_preference==='callback'||errors.reply_preference||errors.callback_phone?' open':''}><summary>Request a callback (optional)</summary><label for="reply_preference">How would you prefer to hear from me?</label><select id="reply_preference" name="reply_preference" aria-describedby="reply_preference-help reply_preference-error"><option value="email"${values.reply_preference!=='callback'?' selected':''}>Email me</option><option value="callback"${values.reply_preference==='callback'?' selected':''}>I'd prefer a callback</option></select><p id="reply_preference-error" class="error"></p><p id="reply_preference-help" class="hint">Email stays available. A callback is a request, not an immediate call or an appointment; I may email first to arrange a time.</p><div data-callback-number><label for="callback_phone">Phone number ${note('only for a requested callback')}</label><input id="callback_phone" name="callback_phone" type="tel" autocomplete="tel" maxlength="40" value="${values.reply_preference==='callback'?personal('callback_phone',40):''}" aria-describedby="callback_phone-help callback_phone-error"><p id="callback_phone-help" class="hint">Include a country code if needed. This number is used only to respond to your request.</p><p id="callback_phone-error" class="error"></p></div></details>
 <input type="hidden" id="request_kind" name="request_kind" value="${e(values.request_kind)}">
 <details class="inquiry-extra" data-project-details${website.required||values.website||values.business||values.business_location||values.found_via||errors.website||errors.business||errors.business_location||errors.found_via?' open':''}><summary>Website and business details${website.required?' (website required for this review)':' (optional)'}</summary>
 <label for="website">${website.label} ${note(website.note)}</label><input id="website" name="website" type="text"${website.required?' required':''} autocomplete="url" placeholder="${website.placeholder}" maxlength="500" value="${personal('website',500)}" aria-describedby="website-help website-error"><p id="website-help" class="hint">${e(website.help)}</p><p id="website-error" class="error"></p>

 <label for="business">Business name ${note('optional')}</label><input id="business" name="business" autocomplete="organization" maxlength="160" value="${personal('business',160)}" aria-describedby="business-error"><p id="business-error" class="error"></p>
 <label for="business_location">Business location <span class="field-note">(optional)</span></label><input id="business_location" name="business_location" autocomplete="address-level2" maxlength="160" value="${personal('business_location',160)}" aria-describedby="business_location-help business_location-error"><p id="business_location-help" class="hint">Your town, city or service area, if useful.</p><p id="business_location-error" class="error"></p>
 ${contextSelect('found_via')}</details>
 ${careInterest}
 ${inquiryOptionalFields(values,true,annualEnabled)}${addons}
 <p data-addon-alternative${showAddonPicker?' hidden':''}>Need extra pages or tools? Mention them in your message. <a href="/services/website-addons/">See the options and prices</a>.</p>
 <label class="inquiry-receipt-choice" for="email_receipt"><input id="email_receipt" name="email_receipt" type="checkbox" value="requested"${values.email_receipt==='requested'?' checked':''} aria-describedby="email_receipt-help email_receipt-error">Email me my reference (optional)</label><p id="email_receipt-help" class="hint">Your on-screen reference is the primary confirmation that the inquiry was saved. This optional email is a backup copy. Email delivery is not guaranteed; this is not a booking or payment confirmation.</p><p id="email_receipt-error" class="error"></p><div class="honeypot" aria-hidden="true"><label for="_wm_note">Leave empty</label><input id="_wm_note" name="_wm_note" tabindex="-1" autocomplete="off" data-1p-ignore data-lpignore="true" data-bwignore></div><p>Details are used to review and respond to this request. <a href="/privacy/">${e(intake.privacyLink||'Privacy notice')}</a>.</p>
 <div class="inquiry-next"><h${headingLevel}>What happens next</h${headingLevel}><p data-request-next>${nextStep}</p><p>Nothing is booked or charged when you send this. You approve the written proposal, including work, price and dates, before payment.</p></div><div id="form-status" role="status" aria-live="polite" tabindex="-1"></div><button type="button" data-review-inquiry-choices hidden>Review current choices</button><button type="submit" data-request-submit>${e(inquirySubmitLabel(selected,checkout,values.request_kind,offers))}</button><p class="form-help">Trouble sending? Email <a href="mailto:support@wonderandmethod.com">support@wonderandmethod.com</a>.</p>${recovery?'':'<noscript><p>You can submit without JavaScript. A confirmation page will show your reference.</p></noscript>'}</form>`;
 markup=markup.replace(/(<p\b[^>]*\bid="([a-z_]+)-error"[^>]*>)(<\/p>)/g,(_all,start,key,end)=>start+e(errors[key]||'')+end);
 return markup.replace(/<(?:input|select|textarea)\b[^>]*\bname="([a-z_]+)"[^>]*>/g,(tag,key)=>errors[key]&&!tag.includes('type="hidden"')?tag.slice(0,-1)+' aria-invalid="true">':tag);
}

export function inquiryForm(intake,options={}){
 return '<section id="inquiry-confirmation" class="inquiry-confirmation" hidden tabindex="-1" aria-labelledby="inquiry-confirmation-heading"></section>'+inquiryFormMarkup(intake,options);
}
