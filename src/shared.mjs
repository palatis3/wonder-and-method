export function escapeHtml(value='') { return String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:Number.isInteger(value)?0:2,maximumFractionDigits:2}).format(value);
export const moneyExact=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
const cents=value=>{const n=Math.round((value+Number.EPSILON)*100);if(!Number.isSafeInteger(n))throw new Error('Invalid cost inputs');return n;};
export const inquiryChoices=[['launch_site','Launch Website'],['focused_site','Focused Website'],['signature_site','Signature Website'],['keep_running','Keep Running — website care'],['improve','Improve — monthly SEO and website improvement'],['grow','Grow — SEO and growth campaigns'],['audit_fix_sprint','Audit & Fix Sprint'],['website_baseline','Website Baseline'],['unsure','Help me choose']];
const serviceAliases={care:'keep_running',search_plan:'improve',search_sprint:'audit_fix_sprint'};
export const resolveServiceId=value=>typeof value==='string'&&Object.hasOwn(serviceAliases,value)?serviceAliases[value]:value;
export const inquiryContextFields={
 concept:{label:'A studio concept you liked',services:inquiryChoices.map(([id])=>id),options:[['fieldwork','Fieldwork — landscaping'],['northline','Northline — remodeling'],['hearthside','Hearthside — menu and order preview']]},
 goal:{label:'Main goal',services:inquiryChoices.map(([id])=>id),options:[['new_website','Build a new website'],['redesign','Improve or replace my website'],['fix','Fix something that is broken'],['search','Help customers find my business'],['care','Get ongoing website help'],['unsure','Help me choose']]},
 found_via:{label:'How did you find us?',services:inquiryChoices.map(([id])=>id),options:[['google','Google Search'],['search','Another search engine'],['maps','Google Maps / Business Profile'],['ai','AI assistant (ChatGPT, Copilot or similar)'],['referral','Personal recommendation'],['social','Social media'],['directory','Business directory'],['returning','I have visited before'],['other','Another way']]},
 request_kind:{label:'Request type',services:inquiryChoices.map(([id])=>id),options:[['checkout','Proposal request'],['question','Ask a question']]},
 booking_choice:{label:'A booking or newsletter connection',services:['launch_site','focused_site','signature_site'],options:[['booking','Ready booking link/embed'],['newsletter','Ready newsletter link/embed'],['decide','Choose after fit review']]},
 priority:{label:'First monthly improvement',services:['improve','grow'],options:[['page','Improve a service page or supported enquiry path'],['article','Research and write an article or customer guide'],['gbp','Update an eligible business profile'],['graphic','Promotional graphic'],['email','Prepare a newsletter draft or setup'],['decide','Choose after review']]},
 priority_two:{label:'Second connected Grow improvement',services:['grow'],options:[['page','Improve a service page or supported enquiry path'],['article','Research and write an article or customer guide'],['gbp','Update an eligible business profile'],['graphic','Promotional graphic'],['email','Prepare a newsletter draft or setup'],['decide','Choose after review']]},
 baseline_status:{label:'Existing baseline',services:['keep_running','improve','grow','website_baseline','audit_fix_sprint'],options:[['new_build','Recent paid studio build'],['sprint','Usable prior Sprint'],['needed','No usable baseline'],['unknown','Needs review']]},
 billing:{label:'Service billing',services:['keep_running','improve','grow'],options:[['monthly','Monthly'],['annual','Annual prepaid — twelve cycles']]}
};
export function selectedInquiryContext(value={}){const result={};const service=resolveServiceId(value.service);for(const [key,field] of Object.entries(inquiryContextFields))if(field.services.includes(service)&&field.options.some(([id])=>id===value[key]))result[key]=value[key];return result;}
export function inquiryContextSummary(value={}){return Object.entries(selectedInquiryContext(value)).map(([key,id])=>inquiryContextFields[key].label+': '+inquiryContextFields[key].options.find(([v])=>v===id)[1]);}
export function inquiryRequestSummary(value={},pack){
 const question=value.request_kind==='question';
 const context=selectedInquiryContext(value);
 const choice=inquiryChoices.find(([id])=>id===value.service);
 let headline=value.service==='unsure'?'Not sure yet: Terry will recommend a plan':choice?.[1]||'Not sure yet: Terry will recommend a plan';
 if(!question&&pack){
  const annual=value.billing==='annual'&&pack.annual;
  const fee=annual?pack.annual.upfront_price:pack.price;
  headline+=' — '+money(fee)+(annual?' prepaid for 12 service cycles':' '+pack.priceLabel);
  if(pack.baselineFee)headline+=`; first payment for an existing site ${money(fee+pack.baselineFee)} including ${money(pack.baselineFee)} setup, or ${money(fee)} when a usable studio build or Sprint covers setup`;
 }
 const visible=question?Object.fromEntries(Object.entries(context).filter(([key])=>['goal','concept'].includes(key))):context;
 return [headline,...inquiryContextSummary({service:value.service,...visible}),question?'Question only. No booking or payment.':'Proposal request only. Scope, provider costs and dates are confirmed before payment.'].join(' · ');
}
export const priceList=o=>({launch:o.launch_site.public_price,focused:o.focused_site.public_price,signature:o.signature_site.public_price,keep_running:o.plans.keep_running.monthly_price,improve:o.plans.improve.monthly_price,grow:o.plans.grow.monthly_price,baseline:o.baseline.one_time_price,sprint:o.audit_sprint.one_time_price,annual:Object.fromEntries(Object.entries(o.plans).map(([id,p])=>[id,p.annual.upfront_price])),...(o.provider_policy?{commercial_version:o.version,provider_model:o.provider_policy.model}:{hosting_credit:{monthly_cap:o.hosting_credit.cap_per_month,launch:o.launch_site.hosting_credit.months,focused:o.focused_site.hosting_credit.months,signature:o.signature_site.hosting_credit.months}})});
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
export function calculateCost(prices,{build='launch',plan='none',baseline=false,sprint=false,cycles=(build==='existing'?12:11),external=null,hostingMonthly=null,hostingMonths=12,billing='monthly'}={}) {
 if(prices.provider_model!=='client_owned_direct_billing')throw new Error('Use the explicit legacy calculator with a saved historical snapshot');
 if(!['launch','focused','signature','existing'].includes(build)||!['none','keep_running','improve','grow'].includes(plan)||!Number.isInteger(cycles)||cycles<0||cycles>120||!Number.isInteger(hostingMonths)||hostingMonths<0||hostingMonths>120||[external,hostingMonthly].some(n=>n!==null&&(!Number.isFinite(n)||n<0)))throw new Error('Invalid cost inputs');
 if(!['monthly','annual'].includes(billing)||billing==='annual'&&(plan==='none'||cycles!==12))throw new Error('Annual billing requires one plan and twelve cycles');
 if(plan!=='none'&&cycles>hostingMonths)throw new Error('Hosting period must include all monthly service months');
 const buildFee=build==='existing'?0:prices[build],annualUpfront=billing==='annual'?prices.annual?.[plan]:null,monthly=plan==='none'?0:billing==='annual'?annualUpfront/12:prices[plan];
 const baselineFee=baseline&&build==='existing'&&!sprint?prices.baseline:0;
 const onceCents=cents(buildFee)+cents(sprint?prices.sprint:0)+cents(baselineFee),serviceCents=onceCents+(billing==='annual'?cents(annualUpfront):cents(monthly)*cycles);
 const externalCents=external===null?null:cents(external),grossCents=hostingMonthly===null?null:cents(hostingMonthly)*hostingMonths,totalCents=externalCents===null||grossCents===null?null:serviceCents+grossCents+externalCents;
 if(!Number.isFinite(monthly)||[onceCents,serviceCents,grossCents,totalCents].some(n=>n!==null&&!Number.isSafeInteger(n)))throw new Error('Invalid cost inputs');
 return {once:onceCents/100,monthly,annualUpfront,billing,baselineFee,serviceTotal:serviceCents/100,total:totalCents===null?null:totalCents/100,cycles,hostingMonths,grossHosting:grossCents===null?null:grossCents/100};
}

export function annualRefund(prices,{plan,completedCycles}){if(!Object.hasOwn(prices.annual,plan)||!Number.isInteger(completedCycles)||completedCycles<0||completedCycles>12)throw new Error('Invalid annual refund inputs');return cents(prices.annual[plan])*(12-completedCycles)/12/100;}

export function inquiryOptionalFields(value={},onlyApplicable=false){return Object.entries(inquiryContextFields).filter(([key,field])=>key!=='request_kind'&&(onlyApplicable||key!=='baseline_status')&&(onlyApplicable||!['goal','found_via'].includes(key))&&(!onlyApplicable||field.services.includes(value.service))).map(([key,field])=>`<div class="optional-choice" data-context-field="${key}"><label for="${key}">${escapeHtml(field.label)} <span>(optional)</span></label><select id="${key}" name="${key}" aria-describedby="${key}-error"><option value="">Decide during fit review</option>${field.options.filter(([id])=>key!=='billing'||id!=='annual'||value.billing==='annual').map(([id,label])=>`<option value="${id}"${value[key]===id?' selected':''}>${escapeHtml(label)}</option>`).join('')}</select><p class="error" id="${key}-error"></p></div>`).join('');}
