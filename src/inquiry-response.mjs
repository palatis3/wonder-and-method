import {escapeHtml as e, inquiryChoices, resolveServiceId, selectedInquiryContext, inquiryContextSummary, inquiryContextFields,publicInquiryContext,inquiryFieldNames} from './shared.mjs';
import {inquiryChoiceErrorKeys} from './inquiry.mjs';
import config from '../config/site.json' with {type:'json'};
import {inquiryConfirmationHtml} from './inquiry-confirmation.mjs';
import {inquiryFormMarkup,inquiryFormWebsiteField} from './inquiry-form.mjs';

export function inquiryResponseHtml(data) {
 const {message,reference,errors,service,retry}=data;
 const resolved=resolveServiceId(service),choice=inquiryChoices.find(([id])=>id===resolved),selected=choice?resolved:'unsure';
 const context=selectedInquiryContext({...data,service:selected});
 const publicContext=publicInquiryContext({...context,service:selected});
 const {add_ons,...queryContext}=publicContext;
 const query=new URLSearchParams(choice?{offer:selected,...queryContext}:{});
 if(choice&&add_ons?.length)query.set('addons',add_ons.join(','));
 const returnPath=choice?'/contact/?'+query.toString():'/contact/';
 const summary=inquiryContextSummary({...context,service:selected});
 const saved=Boolean(reference)&&!errors;
 const synthetic=data.synthetic===true||/synthetic/i.test(message||'');
 const canRetry=retry&&typeof retry==='object';
 const fieldNames={...inquiryFieldNames({service:selected,...context}),...(canRetry?{website:inquiryFormWebsiteField({service:selected,...context}).label}:{}),...Object.fromEntries(Object.entries(inquiryContextFields).map(([key,value])=>[key,value.label]))};
 const clearedChoices=canRetry&&Object.keys(errors||{}).some(key=>inquiryChoiceErrorKeys.has(key));
 const correctionErrors=Object.fromEntries(Object.entries(errors||{}).filter(([key])=>!inquiryChoiceErrorKeys.has(key)));
 const correction=canRetry?`<section class="native-retry"><h2>${errors?'Check your details':'Try again here'}</h2><p>Your entries are kept below. Review them before sending again. No booking or payment is made.</p>${clearedChoices?'<p>Unavailable or invalid choices have been cleared below. Check the current service and options before sending again; nothing has been saved or booked.</p>':''}${inquiryFormMarkup({live:data.live===true,privacyLink:'Privacy notice'},{service:selected,value:{...retry,service:selected,...publicContext},recovery:true,errors:correctionErrors})}</section>`:'';
 const errorHeading=data.status===405?'Use the contact form':errors?'Please check these details':data.status===503?'Your message is not confirmed yet':'Your message wasn’t sent yet';
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Inquiry status | Wonder and Method</title><link rel="stylesheet" href="/assets/site.css"></head><body class="studio-site studio-response"><a class="skip" href="#main">Skip to content</a><header class="site-header"><a class="wordmark" href="/">Wonder &amp; Method</a><a href="/contact/">Contact the studio</a></header><main id="main" tabindex="-1">${saved?`<section class="inquiry-confirmation" aria-labelledby="inquiry-confirmation-heading">${inquiryConfirmationHtml({...data,service:selected,synthetic}, {heading:'h1'})}</section>`:`<header class="page-intro"><p class="eyebrow">Your inquiry</p><h1>${errorHeading}</h1><p class="lede">${e(message)}</p></header>${errors?`<ul class="error-summary">${Object.entries(errors).map(([key,value])=>`<li>${e(fieldNames[key]||'Selection')}: ${e(value)}</li>`).join('')}</ul>`:''}${correction}${!correction&&summary.length?`<details><summary>Your selected details</summary><ul>${summary.map(line=>`<li>${e(line)}</li>`).join('')}</ul></details>`:''}<p><a class="button" href="${e(returnPath)}">Return to inquiry</a></p><p>Need help? Email <a href="mailto:${e(config.contactEmail)}">${e(config.contactEmail)}</a>.</p>`}</main><footer><p>Wonder &amp; Method · ${e(config.businessIdentity)} · Buffalo, New York</p><p><a href="/privacy/">Privacy</a> · <a href="/pricing/">Services &amp; pricing</a></p></footer></body></html>`;
}
