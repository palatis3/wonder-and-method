import {escapeHtml,inquiryChoices,inquiryContextFields,inquiryContextSummary,resolveServiceId,selectedInquiryContext} from './shared.mjs';

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
  const values={service,...selectedInquiryContext({service,...Object.fromEntries([...url.searchParams].filter(([key])=>Object.hasOwn(inquiryContextFields,key)))})};
  for(const [key,value] of Object.entries(values)){
   const pattern=new RegExp('(<select id="'+key+'"[^>]*>)([\\s\\S]*?)(<\\/select>)');
   form=form.replace(pattern,(_all,start,options,end)=>start+options.replace(/ selected(?:="selected")?/g,'').replace(`<option value="${value}">`,`<option value="${value}" selected>`)+end);
  }
  form=form.replace('<details class="inquiry-extra">','<details class="inquiry-extra" open>');
  const summary=[inquiryChoices.find(([id])=>id===service)[1],...inquiryContextSummary(values),values.request_kind==='question'?'Question only; no booking or payment.':'Proposal request; scope, dates and costs are confirmed before payment.'].join(' · ');
  form=form.replace(/(<p id="request-summary">)[\s\S]*?(<\/p>)/,(_all,start,end)=>start+escapeHtml(summary)+end);
  if(values.request_kind==='question')form=form.replace(/(<label for="message" data-request-label>)[\s\S]*?(<\/label>)/,'$1Your question about this service <span>(required)</span>$2').replace(/(<button type="submit" data-request-submit>)[\s\S]*?(<\/button>)/,'$1Send question ↗$2');
  return form;
 });
}
