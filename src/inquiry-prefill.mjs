import {escapeHtml,inquiryChoices,inquiryContextFields,inquiryRequestSummary,resolveServiceId,selectedInquiryContext,inquiryMessagePrompt} from './shared.mjs';

export function hasInquiryQuery(url){
 return /^\/(?:contact(?:\/|\.html)?|checkout\/[^/]+\/?)$/.test(url.pathname)&&['offer',...Object.keys(inquiryContextFields)].some(key=>url.searchParams.has(key));
}

// Only known option IDs enter HTML. Personal fields are never read from URLs.
export function prefillInquiryHtml(html,url){
 if(!hasInquiryQuery(url))return html;
 return html.replace(/<form id="inquiry"[\s\S]*?<\/form>/,form=>{
  const serviceSelect=form.match(/<select id="service"[^>]*>[\s\S]*?<\/select>/)?.[0];
  if(!serviceSelect)return form;
  const fixed=form.match(/data-fixed-service="([a-z_]+)"/)?.[1];
  const requested=resolveServiceId(url.searchParams.get('offer'));
  const current=serviceSelect.match(/<option value="([a-z_]+)" selected>/)?.[1]||'unsure';
  const service=fixed||(inquiryChoices.some(([id])=>id===requested)?requested:current);
  const kind=form.match(/<select id="request_kind"[^>]*>([\s\S]*?)<\/select>/)?.[1].match(/<option value="(checkout|question)" selected>/)?.[1]||(fixed?'checkout':'question');
  const values={service,request_kind:kind,...selectedInquiryContext({service,...Object.fromEntries([...url.searchParams].filter(([key])=>Object.hasOwn(inquiryContextFields,key)))})};
  for(const [key,value] of Object.entries(values)){
   const options=form.match(new RegExp('<select id="'+key+'"[^>]*>([\\s\\S]*?)<\\/select>'))?.[1];
   if(!options?.includes(`<option value="${value}"`)){delete values[key];continue;}
   const pattern=new RegExp('(<select id="'+key+'"[^>]*>)([\\s\\S]*?)(<\\/select>)');
   form=form.replace(pattern,(_all,start,options,end)=>start+options.replace(/ selected(?:="selected")?/g,'').replace(`<option value="${value}">`,`<option value="${value}" selected>`)+end);
  }
  const summary=inquiryRequestSummary(values);
  form=form.replace(/(<p id="request-summary">)[\s\S]*?(<\/p>)/,(_all,start,end)=>start+escapeHtml(summary)+end);
  const question=values.request_kind==='question';
  const messageLabel=inquiryMessagePrompt(service,values.request_kind);
  form=form.replace(/(<label for="message" data-request-label>)[\s\S]*?(<\/label>)/,(_all,start,end)=>start+messageLabel+' <span>(required)</span>'+end).replace(/(<button type="submit" data-request-submit>)[\s\S]*?(<\/button>)/,(_all,start,end)=>start+(question?'Send question':'Request a proposal')+end);
  return form;
 });
}
