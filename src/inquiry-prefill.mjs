import {inquiryChoices,inquiryContextFields,resolveServiceId,publicInquiryContext} from './shared.mjs';
import {inquiryFormMarkup} from './inquiry-form.mjs';

export function hasInquiryQuery(url){
 return /^\/(?:contact(?:\/|\.html)?|checkout\/[^/]+\/?)$/.test(url.pathname)&&['offer',...Object.keys(inquiryContextFields)].some(key=>url.searchParams.has(key));
}

// Regenerate only the inquiry form from allowlisted intent. Never read personal URL fields.
export function prefillInquiryHtml(html,url){
 if(!hasInquiryQuery(url))return html;
 return html.replace(/<form id="inquiry"[\s\S]*?<\/form>/,form=>{
  const fixed=form.match(/data-fixed-service="([a-z_]+)"/)?.[1];
  const requested=resolveServiceId(url.searchParams.get('offer'));
  const service=fixed||(inquiryChoices.some(([id])=>id===requested)?requested:'unsure');
  const annualEnabled=form.includes('data-annual-enabled="true"');
  // URLSearchParams.get uses the first occurrence, matching the enhanced client
  // and the offer lookup above. Repeated parameters cannot switch native intent.
  const queryContext=Object.fromEntries(Object.keys(inquiryContextFields).filter(key=>url.searchParams.has(key)).map(key=>[key,url.searchParams.get(key)]));
  const value={service,...publicInquiryContext({service,...queryContext},annualEnabled)};
  return inquiryFormMarkup({live:form.includes('data-mode="live"'),privacyLink:'Privacy notice'},{checkout:Boolean(fixed),service,value,annualEnabled});
 });
}
