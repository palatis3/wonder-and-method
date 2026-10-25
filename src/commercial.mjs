import {normalizeOfferCatalog} from './offer-catalog.mjs';
import {normalizeAddonSelection,priceAddons} from './addons.mjs';

const builds=['launch_site','focused_site','signature_site'];
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

function composeAddons(offers,id,base,ids,paymentSchedule){
 const priced=priceAddons(ids,offers.add_ons);
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
  requireValue(paymentSchedule===undefined,'Build additions use the existing 50% / 30% / 20% approval schedule.');
  requireValue(same(base.payment_schedule?.map(stage=>stage.percent),[50,30,20]),'The build payment schedule requires review.');
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
  payment_rule:standalone?'agreed_standalone':'build_50_30_20',terms:structuredClone(offers.add_on_terms)
 }};
}

export function quotedOffer(offers,id,billing='monthly',{add_ons=[],payment_schedule}={}){
 offers=normalizeOfferCatalog(offers);
 const ids=normalizeAddonSelection({add_ons},offers.add_ons||[]);
 if(id==='website_additions'){
  requireValue(billing!=='annual','Standalone additions are one-time work, not an annual plan.');
  const terms=offers.add_on_terms||{};
  return composeAddons(offers,id,{public_name:'Website additions',scope:'The individually listed website additions and their agreed acceptance checks.',acceptance:'Approve each selected addition against the agreed work and checks. Silence is not approval.',refinement:terms.support,exclusions:[terms.providers||'Provider costs are separate.', 'Additional units, changes of direction and unlisted work require a separate written agreement.']},ids,payment_schedule);
 }
 requireValue(!ids.length||builds.includes(id),'One-time add-ons require a separate website_additions project for this service.');
 if(offers.plans[id]){
  if(!['monthly','annual'].includes(billing))throw Error('Choose monthly or annual billing.');
  const p=offers.plans[id],price=billing==='annual'?p.annual.upfront_price:p.monthly_price;
  return {...p,public_price:price,payment_schedule:[{event:billing==='annual'?'after fit and written twelve-cycle scope/dates, before service starts':'after fit and written first-cycle scope/dates, before service starts',percent:100,amount:price}],exclusions:offers.monthly_terms.excluded};
 }
 const p=offers[id]||(id==='audit_fix_sprint'?offers.audit_sprint:id==='website_baseline'?offers.baseline:null);
 if(!p)throw Error('Choose a current build, monthly plan, Sprint or baseline.');
 if(billing==='annual')throw Error('Annual billing is only available for the three ongoing plans.');
 return composeAddons(offers,id,{...p,public_price:p.public_price??p.one_time_price,exclusions:p.exclusions||[offers.audit_sprint.boundaries,offers.one_off_terms.extra_costs]},ids,payment_schedule);
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
  requireValue(quote.base_price>0&&quote.payment_rule==='build_50_30_20'&&same(quote.base_payment_schedule?.map(stage=>stage.percent),[50,30,20]),'Build additions require the preserved base price and 50% / 30% / 20% schedule.');
  validateAddonPaymentSchedule(quote.base_payment_schedule,quote.base_price);
  let remaining=toCents(total);
  expected=quote.base_payment_schedule.map((stage,index)=>{const amount=index===2?remaining:Math.round(toCents(total)*stage.percent/100);remaining-=amount;return {event:stage.event,percent:stage.percent,amount:amount/100};});
 }
 requireValue(same(snapshot.offer.payment_schedule,expected)&&same(scope.milestones?.map(({event,percent,amount})=>({event,percent,amount})),expected),'Payment stages differ from the frozen add-on composition.');
 if(scope.commercial_boundaries?.add_ons!==undefined)requireValue(same(scope.commercial_boundaries.add_ons,quote.lines),'Add-on boundaries differ from their frozen line items.');
 if(scope.commercial_boundaries?.add_on_terms!==undefined)requireValue(same(scope.commercial_boundaries.add_on_terms,quote.terms),'Add-on terms differ from their frozen composition.');
 return quote;
}
