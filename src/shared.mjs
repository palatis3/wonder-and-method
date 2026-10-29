import {normalizeOfferCatalog,countWords,offerRecord,buildOfferIds,monthlyOfferIds} from './offer-catalog.mjs';
import {normalizeAddonSelection,priceAddons} from './addons.mjs';
import offers from '../config/offers.json' with {type:'json'};
import {serviceAreaContextOptions as countyContextOptions} from './inquiry-area-context.mjs';

export function escapeHtml(value='') { return String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:Number.isInteger(value)?0:2,maximumFractionDigits:2}).format(value);
export const moneyExact=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
export function inquiryNeedsWebsite(value={}){return value.request_kind==='checkout'&&['website_baseline','audit_fix_sprint'].includes(resolveServiceId(value.service));}
export function inquiryWebsiteField(value={}){
 const required=inquiryNeedsWebsite(value),monthly=['keep_running','improve','local_focus','grow'].includes(resolveServiceId(value.service));
 return required?{label:'Website to review',note:'required',required,placeholder:'example.com',help:'Use a website address, such as example.com. It can be offline or broken; I do not need passwords.'}
 :monthly?{label:'Your website',note:'if you have one',required,placeholder:'example.com',help:'No website yet, or I’m building your site? Leave blank and say so in your message.'}
  :{label:'Website or social page',note:'optional',required,placeholder:'example.com or @yourbusiness',help:'A link, social handle or short note is fine. Leave blank if you do not have one.'};
}
export function inquiryFieldNames(value={}){return {name:'Your name',email:'Email',reply_preference:'Reply preference',callback_phone:'Callback number',email_receipt:'Email reference',business:'Business name',business_location:'Business location',website:inquiryWebsiteField(value).label,service:'Package or service',add_ons:'Website add-ons',message:'Your message'};}
export function shortInquiryReference(reference){
 if(typeof reference!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(reference))return reference||'';
 return 'WM-'+reference.replaceAll('-','').slice(0,12).toUpperCase().match(/.{4}/g).join('-');
}
const cents=value=>{const n=Math.round((value+Number.EPSILON)*100);if(!Number.isSafeInteger(n))throw new Error('Invalid cost inputs');return n;};
export const inquiryChoices=[...offers.service_menu.map(p=>[p.id,p.name]),['unsure','Help me choose']];
const serviceAliases={care:'keep_running',search_plan:'improve',search_sprint:'audit_fix_sprint'};
export const resolveServiceId=value=>typeof value==='string'&&Object.hasOwn(serviceAliases,value)?serviceAliases[value]:value;
// The browser build projects offers.json to these public names and prices only.
export function inquiryOffer(service,o=offers,context={}){
 const id=resolveServiceId(service),monthly=['keep_running','improve','local_focus','grow'].includes(id);
 const offer=offerRecord(o,id);
 const variant=offer?.variants?.[context.care_variant],from=Boolean(offer?.variants?.production&&!variant);
 return offer?{id,name:offer.public_name,price:monthly?(variant?.price??offer.variants?.production?.price??offer.monthly_price):offer.public_price??offer.one_time_price,monthly,from,...(variant?{variant:variant.name}: {})}:null;
}
export function inquiryChoiceLabel(service,o=offers){
 const offer=inquiryOffer(service,o);if(!offer)return 'Not sure — help me choose';
 if(o.catalog_format===3)return `${offer.name} — ${offer.from?'from ':''}${money(offer.price)}${offer.monthly?'/month':''}`;
 const monthly={keep_running:'website care',improve:`${countWords(o.plans.improve.priorities)} SEO improvement${o.plans.improve.priorities===1?'':'s'} a month`,grow:`${countWords(o.plans.grow.priorities)} SEO improvement${o.plans.grow.priorities===1?'':'s'} a month`};
 return offer.monthly?`${offer.name} — ${monthly[offer.id]} (${money(offer.price)}/mo)`:`${offer.name} — ${money(offer.price)}${offer.id==='website_baseline'?' review':''}`;
}
export function inquirySubmitLabel(service='',checkout=false,requestKind='',o=offers){
 if(!checkout)return 'Send message';
 const offer=inquiryOffer(service,o);if(!offer)return 'Request my proposal';
 if(requestKind==='question')return `Send my ${offer.name} question`;
 return offer.monthly?`Request ${/^[aeiou]/i.test(offer.name)?'an':'a'} ${offer.name} proposal`:offer.id==='website_baseline'?`Request my ${offer.name}`:offer.id==='audit_fix_sprint'?`Request my ${offer.name.replace(' Sprint','')} proposal`:`Request my ${offer.name.replace(' Website','')} proposal`;
}
export function inquiryMessagePrompt(service='',requestKind='checkout',neutral=false){
 return 'Your message';
}
export function inquiryMessageHelp(service='',requestKind='checkout',goal='',neutral=false,catalog=offers){
 const id=resolveServiceId(service);
 let hint=goal==='fix'?'Which page or tool is affected? Include its address if you can, what happened, when you tested it, the platform and any checks you tried.'
  :requestKind==='question'?'Ask about the service, costs or next steps.'
  :goal==='new_website'?'What do you do, who should the website help and what should visitors be able to do?'
  :goal==='redesign'?'What needs to change on your current website? Share its address if you can.'
  :goal==='search'?'Which services or customer questions would you like people to find online?'
  :goal==='care'?'What ongoing help would be useful for your website?'
  :id==='website_baseline'?`Tell me what seems wrong, or what you want the ${catalog.baseline.public_name} review to help you decide.`
  :id==='audit_fix_sprint'?'Include the page address, what goes wrong and what should happen instead.'
  :['keep_running','improve','local_focus','grow'].includes(id)?'What would you like help with each month?'
  :['launch_site','focused_site','business_site','signature_site'].includes(id)?'What do you do, where do you work and what should your new website help people do? Add a deadline if you have one.'
  :neutral?'Ask a question, or tell me what you’d like to change.':'Tell me what you need and any important dates.';
 return hint+(requestKind==='checkout'?' Questions are welcome here too.':'')+' No passwords, payment details or sensitive information. Use 10–3,000 characters.';
}
export const inquiryContextFields={
 care_variant:{label:'Monthly service option',services:['keep_running','improve','local_focus','grow'],options:[['production','Production only — maintenance handled elsewhere'],['brochure','With Brochure Care'],['commerce','With Commerce Care']]},
 workflow_variant:{label:'Automation route',services:['workflow'],options:[['simple','Up to five simple native automations'],['complex','One more complex workflow']]},
 county:{label:'Service-area page you came from (not your business address)',services:inquiryChoices.map(([id])=>id),options:countyContextOptions},
 concept:{label:'A studio concept you liked',services:inquiryChoices.map(([id])=>id),options:[['fieldwork','Fieldwork — landscaping'],['northline','Northline — remodeling'],['hearthside','Hearthside — pizzeria website']]},
 goal:{label:'Main goal',services:inquiryChoices.map(([id])=>id),options:[['new_website','Build a new website'],['redesign','Improve or replace my website'],['fix','Fix something that is broken'],['search','Help customers find my business'],['care','Get ongoing website help'],['unsure','Help me choose']]},
 found_via:{label:'How did you find me?',services:inquiryChoices.map(([id])=>id),options:[['google','Google Search'],['search','Google or another search engine'],['maps','Google Maps / Business Profile'],['ai','AI assistant (ChatGPT, Copilot or similar)'],['referral','Personal recommendation'],['social','Social media'],['directory','Business directory'],['returning','I have visited before'],['other','Another way']]},
 request_kind:{label:'Request type',services:inquiryChoices.map(([id])=>id),options:[['checkout','Proposal request'],['question','Ask a question']]},
 care_interest:{label:'Monthly help to discuss after launch (not enrolled)',services:['launch_site','focused_site','business_site','signature_site','unsure'],options:[['keep_running',offers.plans.keep_running.public_name+' website care'],['improve',offers.plans.improve.public_name],['local_focus',offers.plans.local_focus.public_name],['grow',offers.plans.grow.public_name],['discuss','Help me compare the options']]},
 booking_choice:{label:'A booking or newsletter connection',services:['launch_site','focused_site','business_site','signature_site'],options:[['booking','Ready booking link/embed'],['newsletter','Ready newsletter link/embed'],['decide','Choose after fit review']]},
 priority:{label:'First monthly improvement',services:['improve','grow'],options:[['page','Improve a service page or supported inquiry path'],['article','Research and write an article or customer guide'],['gbp','Update an eligible business profile'],['graphic','Promotional graphic'],['email','Prepare a newsletter draft or setup'],['decide','Choose after review']]},
 priority_two:{label:'Second connected Grow improvement',services:['grow'],options:[['page','Improve a service page or supported inquiry path'],['article','Research and write an article or customer guide'],['gbp','Update an eligible business profile'],['graphic','Promotional graphic'],['email','Prepare a newsletter draft or setup'],['decide','Choose after review']]},
 baseline_status:{label:'Existing baseline',services:['keep_running','improve','grow','website_baseline','audit_fix_sprint'],options:[['new_build','Recent paid studio build'],['sprint','Usable prior Sprint'],['needed','No usable baseline'],['unknown','Needs review']]},
 billing:{label:'Service billing',services:['keep_running','improve','local_focus','grow'],options:[['monthly','Monthly'],['annual','Annual prepaid — twelve cycles']]}
};
export function inquiryAllowsMonthlyInterest(value={}){const service=resolveServiceId(value.service);return ['launch_site','focused_site','business_site','signature_site'].includes(service)||service==='unsure'&&['new_website','redesign'].includes(value.goal);}
export function selectedInquiryContext(value={}){const result={};const service=resolveServiceId(value.service);for(const [key,field] of Object.entries(inquiryContextFields))if(field.services.includes(service)&&(key!=='care_interest'||inquiryAllowsMonthlyInterest(value))&&!(key==='care_variant'&&service==='keep_running'&&value[key]==='production')&&field.options.some(([id])=>id===value[key]))result[key]=value[key];try{const ids=normalizeAddonSelection(value);if(ids.length)result.add_ons=ids;}catch{/* Invalid selections are rejected by inquiry validation. */}return result;}
// Public forms keep useful link context, without offering inactive annual enrollment.
// The broader validator/receipt allowlist remains compatible with historical records.
export function publicInquiryContext(value={},annualEnabled=false){
 const result=selectedInquiryContext(value);
 if(!annualEnabled&&result.billing==='annual')delete result.billing;
 if(!['launch_site','focused_site','business_site','signature_site','unsure'].includes(resolveServiceId(value.service))||['fix','care'].includes(result.goal))delete result.concept;
 return result;
}
export function hasInquirySelection(value={}){return Boolean(value.service&&value.service!=='unsure'||value.goal&&value.goal!=='unsure'||value.concept||value.county||value.add_ons?.length);}
export function inquiryContextSummary(value={}){const {add_ons=[],...context}=selectedInquiryContext(value);const additions=priceAddons(add_ons);return [...Object.entries(context).map(([key,id])=>inquiryContextFields[key].label+': '+inquiryContextFields[key].options.find(([v])=>v===id)[1]),...additions.lines.map(item=>'Addition requested: '+item.public_name+' — '+money(item.public_price)),...(additions.ids.length?['One-time additions subtotal: '+money(additions.total)+'; subject to fit and a written proposal.']:[])];}
export function inquiryRequestSummary(value={},o=offers,{includeGoal=true}={}){
 const context=selectedInquiryContext(value),offer=inquiryOffer(value.service,o,context);
 const parts=[];
 if(offer)parts.push(`${offer.name}${offer.variant?' — '+offer.variant:''} (${offer.from?'from ':''}${money(offer.price)}${offer.monthly?'/month':offer.id==='website_baseline'?', paid only after I confirm fit':''})`);
 if(context.workflow_variant)parts.push(inquiryContextFields.workflow_variant.options.find(([id])=>id===context.workflow_variant)[1]);
 for(const key of [ ...(includeGoal?['goal']:[]),'concept','county'])if(context[key]&&context[key]!=='unsure')parts.push((key==='county'?'From service-area page: ':'')+inquiryContextFields[key].options.find(([id])=>id===context[key])[1]);
 if(context.add_ons?.length)parts.push(priceAddons(context.add_ons,o.add_ons).lines.map(item=>`${item.public_name} (${money(item.public_price)} extra)`).join(', '));
 return (context.add_ons?.length&&!offer?'Asking about: ':'')+parts.join(' · ');
}
export const priceList=input=>{const o=input.provider_policy?normalizeOfferCatalog(input):input;if(o.catalog_format===3)return {catalog_format:3,catalog_revision:o.catalog_revision,monthly_variants:Object.fromEntries(Object.entries(o.plans).map(([id,p])=>[id,p.variants])),add_ons:o.add_ons.map(({id,public_name,public_price})=>({id,public_name,public_price})),launch:o.launch_site.public_price,focused:o.focused_site.public_price,business:o.business_site.public_price,signature:o.signature_site.public_price,...Object.fromEntries(['brand_message','storefront','local_presence','workflow','systems'].map(id=>[id,o[id].public_price])),...Object.fromEntries(Object.entries(o.plans).map(([id,p])=>[id,p.monthly_price])),baseline:o.baseline.one_time_price,sprint:o.audit_sprint.one_time_price,care_variants:o.care_variants,annual_available:false,annual:Object.fromEntries(Object.entries(o.plans).map(([id,p])=>[id,p.annual.upfront_price])),commercial_version:o.version,provider_model:o.provider_policy.model};return ({add_ons:(o.add_ons||[]).map(({id,public_name,public_price})=>({id,public_name,public_price})),launch:o.launch_site.public_price,focused:o.focused_site.public_price,signature:o.signature_site.public_price,keep_running:o.plans.keep_running.monthly_price,improve:o.plans.improve.monthly_price,grow:o.plans.grow.monthly_price,baseline:o.baseline.one_time_price,sprint:o.audit_sprint.one_time_price,annual_available:o.annual_enrollment_gate?.verified===true,annual:Object.fromEntries(Object.entries(o.plans).map(([id,p])=>[id,p.annual.upfront_price])),...(o.provider_policy?{commercial_version:o.version,provider_model:o.provider_policy.model}:{hosting_credit:{monthly_cap:o.hosting_credit.cap_per_month,launch:o.launch_site.hosting_credit.months,focused:o.focused_site.hosting_credit.months,signature:o.signature_site.hosting_credit.months}})});};
// Saved historical terms only; never infer legacy benefits from current prices.
export function calculateLegacyCost(prices,{build='launch',plan='none',baseline=false,sprint=false,cycles=11,external=null,hostingMonthly=null,hostingMonths=12,serviceStart=1,billing='monthly'}={}) {
 if(!prices.hosting_credit||prices.provider_model)throw new Error('Legacy calculation requires a saved hosting-credit snapshot');
 if(!['launch','focused','signature','existing'].includes(build)||!['none','keep_running','improve','grow'].includes(plan)||!Number.isInteger(cycles)||cycles<0||cycles>120||!Number.isInteger(hostingMonths)||hostingMonths<0||hostingMonths>120||!Number.isInteger(serviceStart)||serviceStart<1||serviceStart>121||[external,hostingMonthly].some(n=>n!==null&&(!Number.isFinite(n)||n<0)))throw new Error('Invalid cost inputs');
 if(!['monthly','annual'].includes(billing)||billing==='annual'&&(plan==='none'||cycles!==12))throw new Error('Annual billing requires one plan and twelve cycles');
 if(plan!=='none'&&cycles>0&&serviceStart+cycles-1>hostingMonths)throw new Error('Hosting period must include all monthly service months');
 const buildFee=build==='existing'?0:prices[build],annualUpfront=billing==='annual'?prices.annual?.[plan]:null,monthly=plan==='none'?0:billing==='annual'?annualUpfront/12:prices[plan];
 const baselineFee=baseline&&build==='existing'&&(prices.catalog_format===3||!sprint)?prices.baseline:0;
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

// Current prospective terms; historical credits use the separate saved-snapshot calculator.
export function calculateCost(prices,{build='launch',plan='none',baseline=false,sprint=false,cycles=12,external=null,hostingMonthly=null,hostingMonths=12,billing='monthly',add_ons=[],careVariant='brochure',onboarding='none',hostingEligible=false}={}) {
 if(prices.provider_model!=='client_owned_direct_billing')throw new Error('Use the explicit legacy calculator with a saved historical snapshot');
 if(!['launch','focused',...(prices.catalog_format===3?['business','brand_message','storefront','local_presence','workflow','systems']:[]),'signature','existing'].includes(build)||!['none','keep_running','improve',...(prices.catalog_format===3?['local_focus']:[]),'grow'].includes(plan)||!Number.isInteger(cycles)||cycles<0||cycles>120||!Number.isInteger(hostingMonths)||hostingMonths<0||hostingMonths>120||[external,hostingMonthly].some(n=>n!==null&&(!Number.isFinite(n)||n<0)))throw new Error('Invalid cost inputs');
 if(!['monthly','annual'].includes(billing)||billing==='annual'&&(plan==='none'||cycles!==12))throw new Error('Annual billing requires one plan and twelve cycles');
 if(plan!=='none'&&cycles<1)throw new Error('Monthly plans require at least one month');
 if(hostingMonthly!==null&&plan!=='none'&&cycles>hostingMonths)throw new Error('Hosting period must include all monthly service months');
 const v4=prices.catalog_revision===4;
 if(!(v4?['production','brochure','commerce']:['brochure','commerce']).includes(careVariant)||!['none','brochure','commerce'].includes(onboarding)||careVariant==='commerce'&&!(v4?['none','keep_running','improve','local_focus','grow']:['none','keep_running','improve']).includes(plan)||careVariant==='production'&&!['none','improve','local_focus','grow'].includes(plan))throw Error('Choose a supported care variant');
 if(typeof hostingEligible!=='boolean')throw Error('Confirm eligible hosting with a boolean');
 if(v4&&careVariant==='production'&&onboarding!=='none')throw Error('Production-only plans have no Care onboarding fee');
 if(prices.catalog_format===3&&billing==='annual')throw Error('Annual enrollment is unavailable');
 const variantMonthly=v4&&plan!=='none'?prices.monthly_variants?.[plan]?.[careVariant]?.price:careVariant==='commerce'?(plan==='keep_running'?prices.care_variants?.commerce.price:plan==='improve'?prices.improve+prices.care_variants?.improvement_commerce_supplement:0):prices[plan];
 const onboardingFee=onboarding==='none'?0:prices.care_variants?.[onboarding]?.onboarding;
 if(onboarding!=='none'&&add_ons.includes('care_onboarding'))throw Error('Choose onboarding only once');
 const buildFee=build==='existing'?0:prices[build],annualUpfront=billing==='annual'?prices.annual?.[plan]:null,monthly=plan==='none'?0:billing==='annual'?annualUpfront/12:variantMonthly;
 const baselineFee=baseline&&build==='existing'&&(prices.catalog_format===3||!sprint)?prices.baseline:0;
 const additions=priceAddons(add_ons,prices.add_ons||[]);
 const onceCents=cents(buildFee)+cents(sprint?prices.sprint:0)+cents(baselineFee)+cents(additions.total)+cents(onboardingFee),serviceCents=onceCents+(billing==='annual'?cents(annualUpfront):cents(monthly)*cycles);
 const offsetApplies=v4&&plan!=='none'&&careVariant==='brochure'&&hostingEligible;
 const hostingOffsetCents=offsetApplies&&hostingMonthly!==null?Math.min(cents(hostingMonthly),cents(prices.care_variants.brochure.hosting_offset_cap))*cycles:0;
 const netServiceCents=serviceCents-hostingOffsetCents;
 const externalCents=external===null?null:cents(external),grossCents=hostingMonthly===null?null:cents(hostingMonthly)*hostingMonths,totalCents=externalCents===null||grossCents===null?null:netServiceCents+grossCents+externalCents;
 const knownSubtotalCents=netServiceCents+(grossCents??0)+(externalCents??0),missingComponents=[...(grossCents===null?['hosting']:[]),...(externalCents===null?['external']:[])];
 if(!Number.isFinite(monthly)||[onceCents,serviceCents,grossCents,totalCents,knownSubtotalCents].some(n=>n!==null&&!Number.isSafeInteger(n)))throw new Error('Invalid cost inputs');
 return {onboardingFee,careVariant,hostingOffset:hostingOffsetCents/100,offsetPending:offsetApplies&&hostingMonthly===null,netServiceTotal:netServiceCents/100,once:onceCents/100,addonTotal:additions.total,addonLines:additions.lines,monthly,annualUpfront,billing,baselineFee,serviceTotal:serviceCents/100,total:totalCents===null?null:totalCents/100,knownSubtotal:knownSubtotalCents/100,missingComponents,complete:missingComponents.length===0,cycles,hostingMonths,grossHosting:grossCents===null?null:grossCents/100};
}

export function costEstimateCopy(v,{plan='none',prices={},external=null}={}){
 const empty=v.once===0&&plan==='none'&&v.grossHosting===null&&external===null;
 const missing=v.missingComponents.map(key=>key==='hosting'?'hosting':'domain, email and other paid tools');
 const total=empty?'Choose work or enter provider costs to estimate a total.':`${v.complete?'Estimated total':'Your estimate so far'}: ${money(v.knownSubtotal)}`;
 const onceDetails=[...(v.onboardingFee?['care onboarding: '+money(v.onboardingFee)]:[]),...(v.addonTotal?['selected additions: '+money(v.addonTotal)]:[]),...(v.baselineFee&&v.baselineFee!==v.once?['website review: '+money(v.baselineFee)]:[])];
 const breakdown=empty?'':`${money(v.once)} one-time${onceDetails.length?' (including '+onceDetails.join('; ')+')':''}`+(plan==='none'?'.':v.billing==='annual'?` + ${money(v.annualUpfront)} paid upfront for 12 months. The same 12 months billed monthly cost ${money(prices[plan]*12)}; annual savings ${money(prices[plan]*12-v.annualUpfront)}. Subject to written approval.`:` + ${v.cycles} monthly payment${v.cycles===1?'':'s'} of ${money(v.monthly)}.`)+(v.grossHosting===null?'':` Direct hosting (${v.hostingMonths} month${v.hostingMonths===1?'':'s'}): ${money(v.grossHosting)}.`)+(external===null?'':` Domain, email and tools: ${money(external)}.`);
 const note=(missing.length?`Still to add: ${missing.join('; ')}. `:'')+'Tax, unselected items and work beyond the listed allowances are extra. '+(prices.catalog_format===3?'This estimate uses listed fees before scope credits. Included onboarding and reusable setup are credited in your written proposal; overlapping work is never billed twice.':'');
 return {total,breakdown:breakdown+(v.hostingOffset?` Eligible hosting offset: −${money(v.hostingOffset)} from the W&M invoices; net studio fees ${money(v.netServiceTotal)}.`:''),note:note+(prices.catalog_revision===4?' '+(v.offsetPending?'The eligible hosting offset is still unknown. ':'')+'Brochure Care offsets documented eligible hosting by up to $25 per paid month; Commerce and production-only plans have no offset. A period longer than three paid cycles assumes the current fee continues; later rate changes require at least 30 days written notice.':'')};
}

export function annualRefund(prices,{plan,completedCycles}){if(!Object.hasOwn(prices.annual,plan)||!Number.isInteger(completedCycles)||completedCycles<0||completedCycles>12)throw new Error('Invalid annual refund inputs');return cents(prices.annual[plan])*(12-completedCycles)/12/100;}

export function inquiryOptionalFields(value={},_onlyApplicable=false,annualEnabled=false){
 const context=publicInquiryContext(value,annualEnabled);
 return Object.keys(inquiryContextFields).filter(key=>!['request_kind','goal','found_via','care_interest','care_variant','workflow_variant'].includes(key)).map(key=>`<input type="hidden" id="${key}" name="${key}" value="${escapeHtml(context[key]||'')}">`).join('');
}
