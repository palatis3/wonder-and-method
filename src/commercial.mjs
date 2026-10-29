import {normalizeOfferCatalog} from './offer-catalog.mjs';
import {normalizeAddonSelection,priceAddons} from './addons.mjs';

const builds=['launch_site','focused_site','business_site','signature_site','storefront'];
const requireValue=(condition,message)=>{if(!condition)throw Error(message);};
const toCents=value=>{
 requireValue(Number.isFinite(value)&&value>=0&&Number.isSafeInteger(Math.round(value*100))&&Math.abs(value*100-Math.round(value*100))<0.000001,'Commercial prices must be nonnegative amounts in whole cents.');
 return Math.round(value*100);
};
export function canonicalCommercialJson(value){
 if(Array.isArray(value))return '['+value.map(canonicalCommercialJson).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().filter(key=>value[key]!==undefined).map(key=>JSON.stringify(key)+':'+canonicalCommercialJson(value[key])).join(',')+'}';
 return JSON.stringify(value);
}
const same=(a,b)=>canonicalCommercialJson(a)===canonicalCommercialJson(b);

export function validateAddonPaymentSchedule(schedule,total){
 const totalCents=toCents(total);
 requireValue(totalCents>0&&Array.isArray(schedule)&&schedule.length>0&&schedule.length<=12,'Standalone additions require an explicit agreed payment schedule.');
 let allocated=0,percent=0;
 const result=schedule.map((stage,index)=>{
  requireValue(stage&&typeof stage==='object'&&!Array.isArray(stage)&&typeof stage.event==='string'&&stage.event.trim().length>0&&stage.event.length<=500&&!/[\u0000-\u001f]/.test(stage.event),'Each payment stage needs a written approval event.');
  requireValue(Number.isFinite(stage.percent)&&stage.percent>0&&stage.percent<=100&&Math.abs(stage.percent*100-Math.round(stage.percent*100))<0.000001,'Payment percentages must be positive and have at most two decimal places.');
  const amount=toCents(stage.amount),expected=index===schedule.length-1?totalCents-allocated:Math.round(totalCents*stage.percent/100);
  requireValue(amount>0&&amount===expected,'Payment stage amounts must match their percentages and the agreed total.');
  allocated+=amount;percent+=stage.percent;
  return {event:stage.event,percent:stage.percent,amount:amount/100};
 });
 requireValue(Math.abs(percent-100)<0.000001&&allocated===totalCents,'Payment stages must total 100% of the agreed price.');
 return result;
}

function composeAddons(offers,id,base,ids,paymentSchedule,adjustments=[],onboardingVariant='brochure'){
 requireValue(['brochure','commerce'].includes(onboardingVariant),'Choose brochure or commerce onboarding.');
 requireValue(onboardingVariant==='brochure'||offers.catalog_format===3&&ids.includes('care_onboarding'),'Commerce onboarding requires the current onboarding addition.');
 const addonCatalog=offers.add_ons.map(item=>item.id==='care_onboarding'&&onboardingVariant==='commerce'?{...item,public_name:item.public_name+' — Commerce',public_price:offers.care_variants.commerce.onboarding,scope:'Commerce onboarding for one supported store. '+item.scope}:item);
 requireValue(Array.isArray(adjustments)&&adjustments.length<=ids.length,'Provide one reviewed credit per selected addition.');
 const credits=new Map();
 for(const item of adjustments){
  requireValue(item&&Object.keys(item).sort().join(',')==='credit,id,reason'&&ids.includes(item.id)&&!credits.has(item.id),'Each reviewed credit must identify one selected addition.');
  const listed=addonCatalog.find(line=>line.id===item.id);
  requireValue(Number.isFinite(item.credit)&&item.credit>0&&Number.isInteger(item.credit*100)&&item.credit<listed.public_price&&typeof item.reason==='string'&&item.reason.trim().length>=10&&item.reason.length<=1000&&!/[\u0000-\u001f]/.test(item.reason),'Record a positive credit below the listed fee and its written scope reason. Fully included work must be removed from the additions.');
  credits.set(item.id,{listed_price:listed.public_price,credit:item.credit,reason:item.reason.trim()});
 }
 if(offers.catalog_format===3&&builds.includes(id)){
  requireValue(!ids.includes('care_onboarding'),'Care onboarding is included with a new website; remove this addition.');
  for(const addon of ids.filter(item=>item==='guided_quote_form'||item==='reporting_dashboard'&&(id!=='launch_site'||offers.catalog_revision===4)))requireValue(credits.has(addon),'This addition overlaps included work. Record a reviewed incremental-scope credit before creating its quote.');
 }
 const priced=priceAddons(ids,addonCatalog.map(item=>credits.has(item.id)?{...item,public_price:(toCents(item.public_price)-toCents(credits.get(item.id).credit))/100}:item));
 if(credits.size)for(const line of priced.lines)if(credits.has(line.id))line.scope_credit=credits.get(line.id);
 if(!priced.ids.length){
  requireValue(id!=='website_additions','Choose at least one add-on for a standalone additions project.');
  requireValue(paymentSchedule===undefined,'A separate payment schedule is only available for a standalone additions project.');
  return base;
 }
 const standalone=id==='website_additions';
 requireValue(standalone||builds.includes(id),'One-time add-ons require a website build or a separate website_additions project.');
 requireValue(offers.add_on_terms&&typeof offers.add_on_terms.version==='string','Versioned add-on terms are required.');
 const basePrice=standalone?0:base.public_price,total=(toCents(basePrice)+toCents(priced.total))/100;
 let schedule;
 if(standalone)schedule=validateAddonPaymentSchedule(paymentSchedule,total);
 else{
  requireValue(paymentSchedule===undefined,'Build additions follow the catalog version’s approval schedule.');
  requireValue(same(base.payment_schedule?.map(stage=>stage.percent),offers.catalog_format===3?[40,30,30]:[50,30,20]),'The build payment schedule requires review.');
  let remaining=toCents(total);
  schedule=base.payment_schedule.map((stage,index)=>{
   const amount=index===2?remaining:Math.round(toCents(total)*stage.percent/100);remaining-=amount;
   return {...stage,amount:amount/100};
  });
 }
 return {...base,public_price:total,payment_schedule:schedule,add_on_quote:{
  schema_version:1,catalog_version:offers.add_on_terms.version,selection:priced.ids,
  base_price:basePrice,base_payment_schedule:standalone?[]:structuredClone(base.payment_schedule),
  lines:priced.lines,add_ons_total:priced.total,project_total:total,
  payment_rule:standalone?'agreed_standalone':offers.catalog_format===3?'build_40_30_30':'build_50_30_20',terms:structuredClone(offers.add_on_terms)
 }};
}

export function quotedOffer(offers,id,billing='monthly',{add_ons=[],payment_schedule,add_on_credits=[],care_variant='brochure',onboarding_variant='brochure',workflow_variant='simple'}={}){
 offers=normalizeOfferCatalog(offers);
 const v4=offers.catalog_revision===4;
 requireValue((v4?['production','brochure','commerce']:['brochure','commerce']).includes(care_variant),'Choose a supported production or Care variant.');
 requireValue(care_variant==='brochure'||(v4?Boolean(offers.plans[id]?.variants?.[care_variant]):offers.catalog_format===3&&['keep_running','improve'].includes(id)),'This service does not offer the selected Care variant.');
 requireValue(['simple','complex'].includes(workflow_variant)&& (workflow_variant==='simple'||v4&&id==='workflow'),'Choose a supported workflow route.');
 const ids=normalizeAddonSelection({add_ons},offers.add_ons||[]);
 if(id==='website_additions'){
  requireValue(billing!=='annual','Standalone additions are one-time work, not an annual plan.');
  const terms=offers.add_on_terms||{};
  return composeAddons(offers,id,{public_name:'Website additions',scope:'The individually listed website additions and their agreed acceptance checks.',acceptance:'Approve each selected addition against the agreed work and checks. Silence is not approval.',refinement:terms.support,exclusions:[terms.providers||'Provider costs are separate.', 'Additional units, changes of direction and unlisted work require a separate written agreement.']},ids,payment_schedule,add_on_credits,onboarding_variant);
 }
 requireValue(!ids.length||builds.includes(id),'One-time add-ons require a separate website_additions project for this service.');
 if(offers.plans[id]){
  requireValue(!add_on_credits.length,'Credits require selected one-time additions.');
  requireValue(onboarding_variant==='brochure','Quote onboarding as a separate one-time addition.');
  if(!['monthly','annual'].includes(billing))throw Error('Choose monthly or annual billing.');
  if(offers.catalog_format===3&&billing==='annual')throw Error('New annual enrollment is unavailable; accepted agreements retain their saved terms.');
  const p=offers.plans[id],monthly=v4?p.variants[care_variant].price:care_variant==='commerce'?(id==='keep_running'?offers.care_variants.commerce.price:p.monthly_price+offers.care_variants.improvement_commerce_supplement):p.monthly_price,price=billing==='annual'?p.annual.upfront_price:monthly;
  const v3=p.v3?structuredClone(p.v3):undefined;
  if(v3&&v4){
   const selected=p.variants[care_variant],care=offers.plans.keep_running.v3;
   const careScope=care.includes.filter(line=>!/^Brochure Care:|^Commerce Care:|^Brochure Care,/.test(line)&&!(care_variant==='commerce'&&line.startsWith('Brochure scope')));
   const siteScope=care_variant==='commerce'?'One supported store, up to 100 products, one checkout and three ordinary inquiry journeys.':'One supported brochure/service website, up to 30 marketing pages and three ordinary inquiry journeys.';
   v3.includes=[`${selected.name}: ${monthly} USD per month. ${id==='keep_running'?siteScope:'One supported site; up to 30 marketing pages for production. Store work covers service/information pages, not product/category ecommerce SEO.'}${['local_focus','grow'].includes(id)?' One business location and one primary service area.':''}`,...(id==='keep_running'?careScope:p.v3.includes.filter((line,index)=>index>0&&!line.startsWith('When Brochure Care')&&!line.startsWith('For the first three approved'))),...(id!=='keep_running'&&selected.care?[`Included Care: ${siteScope}`,...careScope]:[]),selected.care?'Care maintenance, recovery tests, 60 minutes of supplied edits and response obligations are included once.':'Production only: maintenance, incident response, recovery tests and the Care edit allowance are not included. Keep a supported maintenance arrangement in place.',care_variant==='brochure'?offers.hosting_offset_terms:'No hosting offset applies to this variant.',...(id==='keep_running'?[]:[offers.first_cycle_measurement]),offers.introductory_terms];
  }else if(v3&&care_variant==='commerce'){
   if(id==='keep_running')v3.includes=v3.includes.filter(line=>!line.startsWith('Brochure Care:'));
   else v3.includes[0]=`Commerce Care is included once for a supported store; the monthly fee includes the ${offers.care_variants.improvement_commerce_supplement} USD commerce supplement. No separate Care charge applies to the same site.`;
  }
  return {...p,...(v3?{v3,care_variant,deliverables:v3.includes}:{}),...(v4?{selected_variant:structuredClone(p.variants[care_variant]),hosting_offset_terms:care_variant==='brochure'?offers.hosting_offset_terms:'No hosting offset.',onboarding_terms:offers.monthly_onboarding_terms,introductory_terms:offers.introductory_terms}:{}),monthly_price:monthly,public_price:price,payment_schedule:[{event:billing==='annual'?'after fit and written twelve-cycle scope/dates, before service starts':'after fit and written first-cycle scope/dates, before service starts',percent:100,amount:price}],exclusions:offers.catalog_format===3?p.v3.excludes:offers.monthly_terms.excluded};
 }
 const p=offers[id]||(id==='audit_fix_sprint'?offers.audit_sprint:id==='website_baseline'?offers.baseline:null);
 if(!p)throw Error('Choose a current build, monthly plan, Sprint or baseline.');
 if(billing==='annual')throw Error('Annual billing is only available for the three ongoing plans.');
 let selected=p;
 if(v4&&id==='workflow'){
  const route=p.workflow_variants[workflow_variant],v3={...structuredClone(p.v3),includes:[...(route.scope??route.includes)],acceptance:[...route.acceptance],timeline:route.timeline};
  if(workflow_variant==='simple')v3.includes[0]='Up to five distinct simple native automations for one related business process. The alternative complex route is not included.';
  selected={...p,v3,workflow_variant,scope:v3.includes.join(' '),acceptance:v3.acceptance,delivery_average:v3.timeline};
 }
 return composeAddons(offers,id,{...selected,public_price:p.public_price??p.one_time_price,exclusions:p.exclusions||[offers.audit_sprint.boundaries,offers.one_off_terms.extra_costs]},ids,payment_schedule,add_on_credits,onboarding_variant);
}

// Validate against the frozen composition, never the current catalog. This keeps
// accepted historical scopes stable when a price or catalog entry later changes.
export function assertAddonCommercialSnapshot(scope){
 const snapshot=scope.commercial_snapshot,quote=snapshot?.add_on_quote;
 if(!quote){
  requireValue(scope.add_ons===undefined&&snapshot?.offer?.add_on_quote===undefined&&scope.commercial_boundaries?.add_ons===undefined&&scope.commercial_boundaries?.add_on_terms===undefined&&scope.buyer_confirmation?.accepted_commercial_digest===undefined&&scope.buyer_confirmation?.add_ons_and_total_understood===undefined&&scope.offer_id!=='website_additions','Selected add-ons require their saved commercial composition.');
  return null;
 }
 requireValue(quote.schema_version===1&&typeof quote.catalog_version==='string'&&quote.catalog_version.length>0&&quote.terms?.version===quote.catalog_version,'A valid versioned add-on composition is required.');
 requireValue(snapshot.offer_id===scope.offer_id&&snapshot.version===scope.commercial_version,'Add-on scope and snapshot identity must match.');
 requireValue(Array.isArray(quote.lines)&&quote.lines.every(line=>typeof line.scope==='string'&&line.scope.trim()&&['acceptance','exclusions'].every(key=>Array.isArray(line[key])&&line[key].length&&line[key].every(text=>typeof text==='string'&&text.trim()))),'Frozen add-on scope, exclusions and acceptance checks are required.');
 const priced=priceAddons(quote.selection,quote.lines);
 for(const line of quote.lines)if(line.scope_credit){
  const c=line.scope_credit;
  requireValue(Object.keys(c).sort().join(',')==='credit,listed_price,reason'&&Number.isFinite(c.listed_price)&&Number.isFinite(c.credit)&&c.credit>0&&c.credit<c.listed_price&&toCents(c.listed_price)-toCents(c.credit)===toCents(line.public_price)&&typeof c.reason==='string'&&c.reason.trim().length>=10,'Frozen scope credits must reconcile to the accepted line price and written reason.');
  priced.lines.find(item=>item.id===line.id).scope_credit=structuredClone(c);
 }
 requireValue(priced.ids.length>0&&same(priced.ids,quote.selection)&&same(priced.ids,scope.add_ons)&&same(priced.lines,quote.lines),'Selected add-ons differ from their frozen line items.');
 const standalone=scope.offer_id==='website_additions';
 requireValue(standalone||builds.includes(scope.offer_id),'One-time additions cannot be included in a recurring or review invoice.');
 const total=(toCents(quote.base_price)+toCents(priced.total))/100;
 requireValue(quote.add_ons_total===priced.total&&quote.project_total===total&&snapshot.offer.public_price===total&&scope.fixed_price===total,'Add-on totals differ from the accepted composition.');
 let expected;
 if(standalone){
  requireValue(quote.base_price===0&&same(quote.base_payment_schedule,[])&&quote.payment_rule==='agreed_standalone','Standalone additions must have their own explicit schedule.');
  expected=validateAddonPaymentSchedule(snapshot.offer.payment_schedule,total);
 }else{
  const expectedPercentages=quote.payment_rule==='build_50_30_20'?[50,30,20]:quote.payment_rule==='build_40_30_30'?[40,30,30]:null;
  requireValue(quote.base_price>0&&expectedPercentages&&same(quote.base_payment_schedule?.map(stage=>stage.percent),expectedPercentages),'Build additions require the preserved base price and a recognized approval schedule.');
  validateAddonPaymentSchedule(quote.base_payment_schedule,quote.base_price);
  let remaining=toCents(total);
  expected=quote.base_payment_schedule.map((stage,index)=>{const amount=index===2?remaining:Math.round(toCents(total)*stage.percent/100);remaining-=amount;return {event:stage.event,percent:stage.percent,amount:amount/100};});
 }
 requireValue(same(snapshot.offer.payment_schedule,expected)&&same(scope.milestones?.map(({event,percent,amount})=>({event,percent,amount})),expected),'Payment stages differ from the frozen add-on composition.');
 if(scope.commercial_boundaries?.add_ons!==undefined)requireValue(same(scope.commercial_boundaries.add_ons,quote.lines),'Add-on boundaries differ from their frozen line items.');
 if(scope.commercial_boundaries?.add_on_terms!==undefined)requireValue(same(scope.commercial_boundaries.add_on_terms,quote.terms),'Add-on terms differ from their frozen composition.');
 return quote;
}
