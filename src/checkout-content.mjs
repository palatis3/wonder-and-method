import {escapeHtml as e,money,inquiryChoices} from './shared.mjs';
import {buyerPacks} from './buyer-packs.mjs';
import {inquiryForm} from './inquiry-form.mjs';
import {firstConversation} from './buyer-experience.mjs';
export const checkoutPath=id=>'/checkout/'+id.replaceAll('_','-')+'/';
export function offerActions(id,name,{monthly=false,compact=false}={}){
 if(!inquiryChoices.some(([key])=>key===id)||id==='unsure')throw Error('Unknown offer action');
 if(id==='website_baseline')name='Website Baseline';
 return `<div class="offer-purchase-actions"><a class="button" href="${checkoutPath(id)}${monthly?'?billing=monthly':''}">Request ${e(name)}</a><a class="text-link" href="/contact/?offer=${id}&amp;request_kind=question#inquiry">Ask about ${e(name)}</a>${compact?'':'<p>Fit and scope approval before payment.</p>'}</div>`;
}
export function checkoutPages(o,intake,config={}){return buyerPacks(o).map(pack=>{
 const id=pack.id,build=id.endsWith('_site'),monthly=Object.hasOwn(o.plans,id),offer=build?o[id]:monthly?o.plans[id]:id==='audit_fix_sprint'?o.audit_sprint:o.baseline;
 const schedule=monthly?[[money(o.baseline.one_time_price+offer.monthly_price),`First payment for an existing site: ${money(o.baseline.one_time_price)} setup + ${money(offer.monthly_price)} first cycle`],[money(offer.monthly_price),'First cycle when a usable studio build or Sprint already covers setup; each later cycle'],[money(offer.annual.upfront_price),'Annual prepayment available on request after fit, capacity and refund-reserve checks; twelve cycles, manual renewal']]:offer.payment_schedule.map(m=>[money(m.amount),m.event]);
 const scope=pack.sections.find(section=>section.title===(monthly?'Monthly units and advice':build?'What the fee buys':'Included units'));
 const body=`<header class="page-intro checkout-intro"><p class="eyebrow">Your proposal request</p><h1>${e(pack.name)}.</h1><p class="lede">Tell me what you need. I confirm fit, scope and dates before you pay.</p><a class="text-link" data-inquiry-jump href="#inquiry">Go to the request form ↓</a></header>
 <div class="contact-layout checkout-layout"><aside class="checkout-summary"><p class="eyebrow">Your selected service</p><h2>${e(pack.name)}</h2><p class="price">${money(pack.price)} <span>${monthly?'/month':'fixed fee'} · USD</span></p><p>Written scope before payment. Your domain, hosting, paid tools, tax and approved additions are separate.</p>
 ${monthly?`<p class="checkout-baseline">Existing-site first payment: ${money(o.baseline.one_time_price+offer.monthly_price)}, including ${money(o.baseline.one_time_price)} setup. A usable prior studio build or Sprint removes that setup charge.</p>`:''}
 <details class="checkout-detail"><summary>Payment stages, included scope &amp; terms</summary><h3>Payment after approval</h3><dl class="checkout-schedule">${schedule.map(([amount,event])=>`<div><dt>${e(event)}</dt><dd>${amount}</dd></div>`).join('')}</dl>
 ${monthly?'<p>The one-time setup also applies to annual enrollment unless a usable studio build or Sprint covers it. Monthly service is optional, with no minimum term. I check supported tools, any usable baseline and useful work before enrollment.</p>':'<p>A request does not reserve a start date. We agree the work and responsibilities before sending the payment link.</p>'}
 ${id==='website_baseline'||id==='audit_fix_sprint'?'<p>A usable studio build or Sprint already includes the baseline. I check for this before quoting, so the same review is not charged twice.</p>':''}
 <h3>Included scope</h3><ul>${(build?[offer.page_scope,offer.policy_page,offer.redirect_limit,offer.form_limit,offer.revisions,...offer.buyer_summary.outcomes.filter(item=>!/pages? |policy|contact form|review rounds|redirect/i.test(item))]:scope?.items||[]).filter(Boolean).map(item=>`<li>${e(item)}</li>`).join('')}</ul><p><a href="/assets/buyer-packs/${id}">Read the complete scope, acceptance and cancellation terms</a></p><p><a href="/payments/">Already approved? Find help with your invoice.</a></p></details>
 <p class="checkout-alternatives"><a data-checkout-question href="/contact/?offer=${id}&amp;request_kind=question#inquiry">Ask about ${e(pack.name)}</a> · <a href="/pricing/">Change service</a></p></aside>
 <section aria-labelledby="checkout-request-heading"><h2 id="checkout-request-heading">About your project.</h2>${firstConversation(config,{includeResponseWindow:true})}${!intake.live?`<p class="notice">${intake.notice}</p>`:""}${inquiryForm(intake,{service:id,checkout:true})}</section></div>`;
 return {path:checkoutPath(id),title:`Request ${pack.name}`,description:`Review ${pack.name} scope and payments. Request a written proposal confirming fit, scope and dates before booking.`,body};
});}
