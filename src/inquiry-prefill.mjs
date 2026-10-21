import {addonSelectionFromQuery} from './addons.mjs';
import {escapeHtml as e,inquiryChoices,inquiryContextFields,resolveServiceId,publicInquiryContext} from './shared.mjs';
import {inquiryFormMarkup} from './inquiry-form.mjs';

export function hasInquiryQuery(url){
 return /^\/(?:contact(?:\/|\.html)?|checkout\/[^/]+\/?)$/.test(url.pathname)&&['offer','addons',...Object.keys(inquiryContextFields)].some(key=>url.searchParams.has(key));
}

// Regenerate only the inquiry form from allowlisted intent. Never read personal URL fields.
export function prefillInquiryHtml(html,url){
 if(!hasInquiryQuery(url))return html;
 let questionHref;
 const markup=html.replace(/<form id="inquiry"[\s\S]*?<\/form>/,form=>{
  const fixed=form.match(/data-fixed-service="([a-z_]+)"/)?.[1];
  const requested=resolveServiceId(url.searchParams.get('offer'));
  const service=fixed||(inquiryChoices.some(([id])=>id===requested)?requested:'unsure');
  const annualEnabled=form.includes('data-annual-enabled="true"');
  // URLSearchParams.get uses the first occurrence, matching the enhanced client
  // and the offer lookup above. Repeated parameters cannot switch native intent.
  const queryContext=Object.fromEntries(Object.keys(inquiryContextFields).filter(key=>url.searchParams.has(key)).map(key=>[key,url.searchParams.get(key)]));
  let add_ons=[];try{if(url.searchParams.getAll('addons').length===1)add_ons=addonSelectionFromQuery(url.searchParams.get('addons'));}catch{}
  const value={service,...publicInquiryContext({service,...queryContext,...(add_ons.length?{add_ons}:{})},annualEnabled)};
  const {add_ons:questionAddons=[],...questionContext}=publicInquiryContext(value,annualEnabled);
  const query=new URLSearchParams({offer:service,...questionContext,request_kind:'question',...(questionAddons.length?{addons:questionAddons.join(',')}:{})});
  questionHref='/contact/?'+query.toString()+'#inquiry';
  const headingLevel=Number(form.match(/data-heading-level="([23])"/)?.[1]||(fixed?3:2));
  return inquiryFormMarkup({live:form.includes('data-mode="live"'),privacyLink:'Privacy notice'},{checkout:Boolean(fixed),service,value,annualEnabled,headingLevel});
 });
 return questionHref?markup.replace(/<a\b[^>]*\bdata-checkout-question\b[^>]*>/g,tag=>tag.replace(/\bhref="[^"]*"/,()=>`href="${e(questionHref)}"`)):markup;
}
