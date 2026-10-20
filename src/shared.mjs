export function escapeHtml(value='') { return String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:Number.isInteger(value)?0:2,maximumFractionDigits:2}).format(value);
export const moneyExact=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
export function inquiryNeedsWebsite(value){return value.goal==='fix'&&!['launch_site','focused_site','signature_site'].includes(value.service)||value.request_kind==='checkout'&&['website_baseline','audit_fix_sprint','keep_running','improve','grow'].includes(value.service);}
export function shortInquiryReference(reference){
 if(typeof reference!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(reference))return reference||'';
 return 'WM-'+reference.replaceAll('-','').slice(0,12).toUpperCase().match(/.{4}/g).join('-');
}
const cents=value=>{const n=Math.round((value+Number.EPSILON)*100);if(!Number.isSafeInteger(n))throw new Error('Invalid cost inputs');return n;};
export const inquiryChoices=[['launch_site','Launch Website'],['focused_site','Focused Website'],['signature_site','Signature Website'],['keep_running','Keep Running — website care'],['improve','Improve — monthly SEO and website improvement'],['grow','Grow — monthly SEO and website improvements'],['audit_fix_sprint','Audit & Fix Sprint'],['website_baseline','Website Baseline'],['unsure','Help me choose']];
const serviceAliases={care:'keep_running',search_plan:'improve',search_sprint:'audit_fix_sprint'};
export const resolveServiceId=value=>typeof value==='string'&&Object.hasOwn(serviceAliases,value)?serviceAliases[value]:value;
export function inquiryMessagePrompt(service='',requestKind='checkout',neutral=false){
 return 'Your message';
}
export function inquiryMessageHelp(service='',requestKind='checkout',goal='',neutral=false){
 const id=resolveServiceId(service);
 let hint=goal==='fix'?'Tell me what is broken, which platform your website uses (such as Wix, Squarespace or WordPress), and what you have already checked.':neutral?'Tell me what your business does and what you want to change, or ask a question.':requestKind==='question'?'Ask what you need to know about the service, scope, costs or next steps.'
  :id==='website_baseline'?'Tell me what seems wrong, or what you want the Website Baseline review to help you decide.'
  :id==='audit_fix_sprint'||goal==='fix'?'Include the page address, what goes wrong and what should happen instead.'
  :['keep_running','improve','grow'].includes(id)?'Share your website address above and what you would like help with each month.'
  :['launch_site','focused_site','signature_site'].includes(id)?'For example: what you do, the area you serve, the pages you need and any deadline.'
  :'Tell me a little about your business, what you need and any important dates.';
 if(['launch_site','focused_site','signature_site'].includes(id)&&requestKind!=='question')hint+=' You can also mention monthly help after launch.';
 return hint+' Use 10–3,000 characters. No passwords, payment details or sensitive information.';
}
export const inquiryContextFields={
 concept:{label:'A studio concept you liked',services:inquiryChoices.map(([id])=>id),options:[['fieldwork','Fieldwork — landscaping'],['northline','Northline — remodeling'],['hearthside','Hearthside — menu and order preview']]},
 goal:{label:'Main goal',services:inquiryChoices.map(([id])=>id),options:[['new_website','Build a new website'],['redesign','Improve or replace my website'],['fix','Fix something that is broken'],['search','Help customers find my business'],['care','Get ongoing website help'],['unsure','Help me choose']]},
 found_via:{label:'How did you find me?',services:inquiryChoices.map(([id])=>id),options:[['google','Google Search'],['search','Google or another search engine'],['maps','Google Maps / Business Profile'],['ai','AI assistant (ChatGPT, Copilot or similar)'],['referral','Personal recommendation'],['social','Social media'],['directory','Business directory'],['returning','I have visited before'],['other','Another way']]},
 request_kind:{label:'Request type',services:inquiryChoices.map(([id])=>id),options:[['checkout','Proposal request'],['question','Ask a question']]},
 booking_choice:{label:'A booking or newsletter connection',services:['launch_site','focused_site','signature_site'],options:[['booking','Ready booking link/embed'],['newsletter','Ready newsletter link/embed'],['decide','Choose after fit review']]},
 priority:{label:'First monthly improvement',services:['improve','grow'],options:[['page','Improve a service page or supported inquiry path'],['article','Research and write an article or customer guide'],['gbp','Update an eligible business profile'],['graphic','Promotional graphic'],['email','Prepare a newsletter draft or setup'],['decide','Choose after review']]},
 priority_two:{label:'Second connected Grow improvement',services:['grow'],options:[['page','Improve a service page or supported inquiry path'],['article','Research and write an article or customer guide'],['gbp','Update an eligible business profile'],['graphic','Promotional graphic'],['email','Prepare a newsletter draft or setup'],['decide','Choose after review']]},
 baseline_status:{label:'Existing baseline',services:['keep_running','improve','grow','website_baseline','audit_fix_sprint'],options:[['new_build','Recent paid studio build'],['sprint','Usable prior Sprint'],['needed','No usable baseline'],['unknown','Needs review']]},
 billing:{label:'Service billing',services:['keep_running','improve','grow'],options:[['monthly','Monthly'],['annual','Annual prepaid — twelve cycles']]}
};
export function selectedInquiryContext(value={}){const result={};const service=resolveServiceId(value.service);for(const [key,field] of Object.entries(inquiryContextFields))if(field.services.includes(service)&&field.options.some(([id])=>id===value[key]))result[key]=value[key];return result;}
// Public forms keep useful link context, without offering inactive annual enrollment.
// The broader validator/receipt allowlist remains compatible with historical records.
export function publicInquiryContext(value={},annualEnabled=false){
 const result=selectedInquiryContext(value);
 if(!annualEnabled&&result.billing==='annual')delete result.billing;
 if(!['launch_site','focused_site','signature_site','unsure'].includes(resolveServiceId(value.service))||['fix','care'].includes(result.goal))delete result.concept;
 return result;
}
export function hasInquirySelection(value={}){return Boolean(value.service&&value.service!=='unsure'||value.goal&&value.goal!=='unsure'||value.concept);}
export function inquiryContextSummary(value={}){return Object.entries(selectedInquiryContext(value)).map(([key,id])=>inquiryContextFields[key].label+': '+inquiryContextFields[key].options.find(([v])=>v===id)[1]);}
export function inquiryRequestSummary(value={}){
 const context=selectedInquiryContext(value),choice=inquiryChoices.find(([id])=>id===value.service);
 const parts=[];
 if(choice&&choice[0]!=='unsure')parts.push(choice[1]);
 for(const key of ['goal','concept'])if(context[key]&&context[key]!=='unsure')parts.push(inquiryContextFields[key].options.find(([id])=>id===context[key])[1]);
 return parts.join(' · ');
}
export const priceList=o=>({launch:o.launch_site.public_price,focused:o.focused_site.public_price,signature:o.signature_site.public_price,keep_running:o.plans.keep_running.monthly_price,improve:o.plans.improve.monthly_price,grow:o.plans.grow.monthly_price,baseline:o.baseline.one_time_price,sprint:o.audit_sprint.one_time_price,annual_available:o.annual_enrollment_gate?.verified===true,annual:Object.fromEntries(Object.entries(o.plans).map(([id,p])=>[id,p.annual.upfront_price])),...(o.provider_policy?{commercial_version:o.version,provider_model:o.provider_policy.model}:{hosting_credit:{monthly_cap:o.hosting_credit.cap_per_month,launch:o.launch_site.hosting_credit.months,focused:o.focused_site.hosting_credit.months,signature:o.signature_site.hosting_credit.months}})});
// Saved historical terms only; never infer legacy benefits from current prices.
export function calculateLegacyCost(prices,{build='launch',plan='none',baseline=false,sprint=false,cycles=11,external=null,hostingMonthly=null,hostingMonths=12,serviceStart=1,billing='monthly'}={}) {
 if(!prices.hosting_credit||prices.provider_model)throw new Error('Legacy calculation requires a saved hosting-credit snapshot');
 if(!['launch','focused','signature','existing'].includes(build)||!['none','keep_running','improve','grow'].includes(plan)||!Number.isInteger(cycles)||cycles<0||cycles>120||!Number.isInteger(hostingMonths)||hostingMonths<0||hostingMonths>120||!Number.isInteger(serviceStart)||serviceStart<1||serviceStart>121||[external,hostingMonthly].some(n=>n!==null&&(!Number.isFinite(n)||n<0)))throw new Error('Invalid cost inputs');
 if(!['monthly','annual'].includes(billing)||billing==='annual'&&(plan==='none'||cycles!==12))throw new Error('Annual billing requires one plan and twelve cycles');
 if(plan!=='none'&&cycles>0&&serviceStart+cycles-1>hostingMonths)throw new Error('Hosting period must include all monthly service months');
 const buildFee=build==='existing'?0:prices[build],annualUpfront=billing==='annual'?prices.annual?.[plan]:null,monthly=plan==='none'?0:billing==='annual'?annualUpfront/12:prices[plan];
 const baselineFee=baseline&&build==='existing'&&!sprint?prices.baseline:0;
 const once=buildFee+(sprint?prices.sprint:0)+baselineFee,serviceTotal=once+(billing==='annual'?annualUpfront:monthly*cycles);
 if(!Number.isFinite(once)||!Number.isFinite(monthly))throw new Error('Missing service price');
 const buildMonths=build==='existing'?0:Math.min(hostingMonths,prices.hosting_credit?.[build]??0);
 const overlapMonths=plan==='none'?0:Math.max(0,Math.min(serviceStart+cycles-1,buildMonths)-serviceStart+1);
 const planOnlyMonths=plan==='none'?0:cycles-overlapMonths;
 // Normalize each entered currency amount to cents, then add/subtract integers.
 const hostingCents=hostingMonthly===null?null:cents(hostingMonthly);
 const eligibleCents=hostingCents===null?null:Math.min(hostingCents,cents(prices.hosting_credit?.monthly_cap??25));
 const buildCreditCents=eligibleCents===null?null:eligibleCents*buildMonths;
 const monthlyCreditCents=eligibleCents===null?null:eligibleCents*planOnlyMonths;
 const overlapCents=eligibleCents===null?null:eligibleCents*overlapMonths;
 const grossCents=hostingCents===null?null:hostingCents*hostingMonths;
 const totalCents=external===null||hostingCents===null?null:cents(serviceTotal)+grossCents+cents(external)-buildCreditCents-monthlyCreditCents-overlapCents;
 if([buildCreditCents,monthlyCreditCents,overlapCents,grossCents,totalCents].some(n=>n!==null&&!Number.isSafeInteger(n)))throw new Error('Invalid cost inputs');
 const [buildHostingCredit,monthlyHostingCredit,planOverlapDiscount,grossHosting,total]=[buildCreditCents,monthlyCreditCents,overlapCents,grossCents,totalCents].map(n=>n===null?null:n/100);
 return {once,monthly,annualUpfront,billing,baselineFee,serviceTotal,total,cycles,hostingMonths,serviceStart,buildHostingCredit,monthlyHostingCredit,planOverlapDiscount,grossHosting,overlapMonths};
}

// Current prospective terms: studio work plus directly paid provider costs, without subsidies.
export function calculateCost(prices,{build='launch',plan='none',baseline=false,sprint=false,cycles=12,external=null,hostingMonthly=null,hostingMonths=12,billing='monthly'}={}) {
 if(prices.provider_model!=='client_owned_direct_billing')throw new Error('Use the explicit legacy calculator with a saved historical snapshot');
 if(!['launch','focused','signature','existing'].includes(build)||!['none','keep_running','improve','grow'].includes(plan)||!Number.isInteger(cycles)||cycles<0||cycles>120||!Number.isInteger(hostingMonths)||hostingMonths<0||hostingMonths>120||[external,hostingMonthly].some(n=>n!==null&&(!Number.isFinite(n)||n<0)))throw new Error('Invalid cost inputs');
 if(!['monthly','annual'].includes(billing)||billing==='annual'&&(plan==='none'||cycles!==12))throw new Error('Annual billing requires one plan and twelve cycles');
 if(hostingMonthly!==null&&plan!=='none'&&cycles>hostingMonths)throw new Error('Hosting period must include all monthly service months');
 const buildFee=build==='existing'?0:prices[build],annualUpfront=billing==='annual'?prices.annual?.[plan]:null,monthly=plan==='none'?0:billing==='annual'?annualUpfront/12:prices[plan];
 const baselineFee=baseline&&build==='existing'&&!sprint?prices.baseline:0;
 const onceCents=cents(buildFee)+cents(sprint?prices.sprint:0)+cents(baselineFee),serviceCents=onceCents+(billing==='annual'?cents(annualUpfront):cents(monthly)*cycles);
 const externalCents=external===null?null:cents(external),grossCents=hostingMonthly===null?null:cents(hostingMonthly)*hostingMonths,totalCents=externalCents===null||grossCents===null?null:serviceCents+grossCents+externalCents;
 const knownSubtotalCents=serviceCents+(grossCents??0)+(externalCents??0),missingComponents=[...(grossCents===null?['hosting']:[]),...(externalCents===null?['external']:[])];
 if(!Number.isFinite(monthly)||[onceCents,serviceCents,grossCents,totalCents,knownSubtotalCents].some(n=>n!==null&&!Number.isSafeInteger(n)))throw new Error('Invalid cost inputs');
 return {once:onceCents/100,monthly,annualUpfront,billing,baselineFee,serviceTotal:serviceCents/100,total:totalCents===null?null:totalCents/100,knownSubtotal:knownSubtotalCents/100,missingComponents,complete:missingComponents.length===0,cycles,hostingMonths,grossHosting:grossCents===null?null:grossCents/100};
}

export function annualRefund(prices,{plan,completedCycles}){if(!Object.hasOwn(prices.annual,plan)||!Number.isInteger(completedCycles)||completedCycles<0||completedCycles>12)throw new Error('Invalid annual refund inputs');return cents(prices.annual[plan])*(12-completedCycles)/12/100;}

export function inquiryOptionalFields(value={},_onlyApplicable=false,annualEnabled=false){
 const context=publicInquiryContext(value,annualEnabled);
 return Object.keys(inquiryContextFields).filter(key=>!['request_kind','goal','found_via'].includes(key)).map(key=>`<input type="hidden" id="${key}" name="${key}" value="${escapeHtml(context[key]||'')}">`).join('');
}
