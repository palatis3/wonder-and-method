import {createHash} from 'node:crypto';
import {quotedOffer} from './commercial.mjs';

export const paymentAccounts={test:'acct_1UQHQMLt5KTaVn9K',live:'acct_1UQHQFLjuTLH94aN'};
export const offerIds=['launch_site','focused_site','signature_site','keep_running','improve','grow','website_baseline','audit_fix_sprint'];
const labels={launch_site:'Launch website',focused_site:'Focused website',signature_site:'Signature website',keep_running:'Keep Running',improve:'Improve',grow:'Grow',website_baseline:'Website baseline',audit_fix_sprint:'Audit & Fix Sprint'};
const requireValue=(condition,message)=>{if(!condition)throw Error(message);};
const nonempty=value=>typeof value==='string'&&value.trim().length>0;
const dated=value=>nonempty(value)&&/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value));
export const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function cents(value){requireValue(Number.isFinite(value)&&value>0&&Math.abs(value*100-Math.round(value*100))<0.00001,'Price must be a positive amount with at most two decimal places.');return Math.round(value*100);}

export function paymentCatalog(offers){
 return offerIds.map(id=>{
  const recurring=Object.hasOwn(offers.plans,id),offer=quotedOffer(offers,id);
  const prices=recurring?['monthly','annual'].map(billing=>({key:billing,amount:cents(quotedOffer(offers,id,billing).public_price),label:billing==='annual'?'Twelve prepaid cycles; manual renewal only':'One agreed monthly service cycle'})):offer.payment_schedule.map((milestone,index)=>({key:`milestone-${index+1}`,amount:cents(milestone.amount),label:milestone.event}));
  return {id,name:labels[id],version:offers.version,currency:'usd',prices:prices.map(price=>({...price,lookup_key:`wm_${id}_${price.key}_${digest([offers.version,price.amount]).slice(0,12)}`}))};
 });
}

// All amounts and promises come from the accepted snapshot, never today's mutable catalog.
export function prepareInvoice(scope,billing,milestoneIndex,{now=new Date()}={}){
 const snapshot=scope.commercial_snapshot,confirmation=scope.buyer_confirmation||{};
 requireValue(snapshot?.version===scope.commercial_version&&snapshot?.offer_id===scope.offer_id&&snapshot?.offer,'A matching versioned commercial snapshot is required.');
 requireValue(offerIds.includes(scope.offer_id)&&Number.isInteger(scope.version)&&scope.version>0,'Known offer and positive scope version required.');
 requireValue(/^[a-z0-9][a-z0-9-]{0,60}$/.test(scope.client_id||''),'A nonpersonal client ID is required.');
 requireValue(confirmation.accepted_version===scope.version&&dated(confirmation.accepted_at)&&Date.parse(confirmation.accepted_at)<=+now&&nonempty(confirmation.written_acceptance_reference)&&nonempty(scope.named_approver),'Written acceptance of this exact scope version and named approver required.');
 for(const key of ['page_copy_limits','self_editing_understood','required_optional_bills','approvals','ownership_and_exit','questions_resolved'])requireValue(confirmation[key]===true,`Buyer confirmation missing: ${key}.`);
 requireValue(nonempty(scope.schedule?.booked_start),'Agreed start date required.');
 for(const key of ['fit_reference','capacity_reference','cash_reference','agreement_reference'])requireValue(nonempty(billing[key]),`Billing prerequisite missing: ${key}.`);
 requireValue(['test','live'].includes(billing.mode)&&billing.account_id===paymentAccounts[billing.mode],'Billing mode and expected account must match.');
 requireValue(/^cus_[A-Za-z0-9]+$/.test(billing.customer_id||''),'Existing Stripe customer reference required.');
 requireValue(billing.scope_version===scope.version,'Billing record must name this accepted scope version.');
 requireValue(dated(billing.due_at)&&Date.parse(billing.due_at)>+now,'A future invoice due timestamp with UTC offset is required.');
 requireValue(nonempty(billing.tax?.review_reference)&&['no_tax','stripe_rates'].includes(billing.tax?.treatment),'Record reviewed tax treatment; absence of a tax setting does not mean tax-free.');
 const taxRates=billing.tax.rate_ids||[];
 requireValue(Array.isArray(taxRates)&&taxRates.every(id=>/^txr_[A-Za-z0-9]+$/.test(id))&&(billing.tax.treatment==='no_tax'?taxRates.length===0:taxRates.length>0),'Tax treatment and Stripe rate references disagree.');
 const original=snapshot.offer.payment_schedule;
 requireValue(Array.isArray(original)&&original.length===scope.milestones?.length&&original.every((m,i)=>m.amount===scope.milestones[i].amount&&m.percent===scope.milestones[i].percent&&m.event===scope.milestones[i].event),'Milestones differ from the accepted commercial snapshot.');
 requireValue(scope.fixed_price===snapshot.offer.public_price&&Math.round(original.reduce((sum,m)=>sum+m.amount,0)*100)===cents(scope.fixed_price),'Milestone amounts must sum to the accepted price.');
 requireValue(Number.isInteger(milestoneIndex)&&milestoneIndex>=0&&milestoneIndex<original.length,'Choose an existing milestone.');
 const milestone=scope.milestones[milestoneIndex];
 requireValue(nonempty(milestone.approval_reference),'Record written milestone approval; silence never triggers billing.');
 const plan=['keep_running','improve','grow'].includes(scope.offer_id);
 if(plan){
  const period=scope.service_period;
  requireValue(['monthly','annual'].includes(scope.billing_option)&&snapshot.billing===scope.billing_option,'Service billing must match the accepted snapshot.');
  requireValue(dated(period?.start)&&dated(period?.end)&&Date.parse(period.end)>Date.parse(period.start)&&period.cycles===(scope.billing_option==='annual'?12:1)&&nonempty(period.timezone),'Exact paid service period, timezone and cycle count required.');
  try{new Intl.DateTimeFormat('en',{timeZone:period.timezone});}catch{throw Error('Valid service timezone required.');}
  requireValue(nonempty(billing.cancellation_route)&&nonempty(billing.coverage_reference)&&nonempty(billing.cycle_approval_reference),'Record cancellation route, actual service coverage and approved cycle work/inputs.');
  if(scope.billing_option==='annual')requireValue(nonempty(billing.annual_reserve_reference)&&billing.manual_annual_renewal===true,'Annual unearned-balance reserve and manual renewal confirmation required.');
 }
 const immutable={client_id:scope.client_id,scope_version:scope.version,commercial_version:scope.commercial_version,scope_hash:digest(scope),milestone:milestoneIndex+1,mode:billing.mode,account:billing.account_id,customer:billing.customer_id,amount:cents(milestone.amount),currency:'usd',due_date:Math.floor(Date.parse(billing.due_at)/1000),tax_rates:taxRates,service_period:plan?scope.service_period:null};
 return {...immutable,id:`wm-${digest(immutable).slice(0,40)}`,obligation:`wm-${digest([scope.client_id,milestoneIndex+1,plan?scope.service_period.start:null]).slice(0,40)}`,description:`${labels[scope.offer_id]} — ${milestone.event}`,offer_id:scope.offer_id,approval_reference:milestone.approval_reference,prior_milestones:original.slice(0,milestoneIndex).map((previous,index)=>({milestone:index+1,amount:cents(previous.amount),obligation:`wm-${digest([scope.client_id,index+1,null]).slice(0,40)}`})),manual_collection:true};
}

export function assertInvoiceMatches(invoice,plan,{finalizing=false}={}){
 requireValue(invoice.customer===plan.customer&&invoice.livemode===(plan.mode==='live')&&invoice.currency===plan.currency,'Invoice customer, environment or currency mismatch.');
 requireValue(invoice.metadata?.wm_request===plan.id&&invoice.metadata?.wm_scope_hash===plan.scope_hash,'Invoice does not belong to this accepted request.');
 requireValue(invoice.collection_method==='send_invoice'&&invoice.auto_advance===false,'Only manual hosted-invoice collection is permitted.');
 requireValue(invoice.automatic_tax?.enabled===false,'Automatic tax was not approved for this invoice.');
 requireValue(invoice.subtotal===plan.amount&&invoice.lines?.data?.length===1&&!invoice.lines.has_more&&invoice.lines.data[0].amount===plan.amount,'Invoice lines differ from the accepted milestone.');
 requireValue((invoice.discounts||[]).length===0&&(invoice.total_discount_amounts||[]).length===0&&!invoice.shipping_cost,'Unexpected invoice discount or shipping cost.');
 requireValue(invoice.due_date===plan.due_date,'Invoice due date differs from the agreed request.');
 requireValue(JSON.stringify((invoice.default_tax_rates||[]).map(rate=>typeof rate==='string'?rate:rate.id).sort())===JSON.stringify([...plan.tax_rates].sort()),'Invoice tax rates differ from the reviewed request.');
 const line=invoice.lines.data[0],lineTaxes=line.taxes||[],totalTaxes=invoice.total_taxes||[];
 const taxShape=tax=>({id:typeof tax.tax_rate_details?.tax_rate==='string'?tax.tax_rate_details.tax_rate:tax.tax_rate_details?.tax_rate?.id,amount:tax.amount,behavior:tax.tax_behavior,type:tax.type});
 for(const tax of [...lineTaxes,...totalTaxes].map(taxShape))requireValue(tax.type==='tax_rate_details'&&plan.tax_rates.includes(tax.id)&&Number.isSafeInteger(tax.amount)&&tax.amount>=0&&['inclusive','exclusive'].includes(tax.behavior),'Unapproved effective invoice tax.');
 const sortedTaxes=taxes=>taxes.map(taxShape).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 requireValue(JSON.stringify(sortedTaxes(lineTaxes))===JSON.stringify(sortedTaxes(totalTaxes)),'Line and invoice tax calculations disagree.');
 requireValue(JSON.stringify([...new Set(lineTaxes.map(tax=>taxShape(tax).id))].sort())===JSON.stringify([...plan.tax_rates].sort()),'Effective tax rates must match the reviewed rates.');
 requireValue(invoice.total===plan.amount+totalTaxes.filter(tax=>tax.tax_behavior==='exclusive').reduce((sum,tax)=>sum+tax.amount,0),'Invoice total differs from the approved amount and taxes.');
 requireValue((line.discount_amounts||[]).every(discount=>discount.amount===0),'Unapproved line discount.');
 if(finalizing)requireValue(invoice.status==='draft'&&invoice.amount_due===invoice.total&&invoice.starting_balance===0,'Finalize requires an unchanged draft with no customer balance adjustment.');
 return invoice;
}

export function fullyPaid(invoice){
 return invoice.status==='paid'&&invoice.amount_remaining===0&&Number.isSafeInteger(invoice.total)&&invoice.total>0&&invoice.amount_paid===invoice.total&&(invoice.pre_payment_credit_notes_amount||0)===0&&(invoice.post_payment_credit_notes_amount||0)===0&&invoice.starting_balance===0;
}
export function paymentSummary(invoice){
 return {invoice_id:invoice.id,status:invoice.status,mode:invoice.livemode?'live':'test',amount_due:invoice.amount_due,amount_paid:invoice.amount_paid,amount_remaining:invoice.amount_remaining,payment_confirmed:fullyPaid(invoice),credit_note_adjustments:(invoice.pre_payment_credit_notes_amount||0)+(invoice.post_payment_credit_notes_amount||0),checked_at:new Date().toISOString(),hosted_invoice_url:invoice.hosted_invoice_url||null,invoice_pdf:invoice.invoice_pdf||null};
}
