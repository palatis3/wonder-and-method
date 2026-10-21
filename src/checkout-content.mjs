import {escapeHtml as e,money,inquiryChoices} from './shared.mjs';
import {buyerPacks} from './buyer-packs.mjs';
import {inquiryForm} from './inquiry-form.mjs';
import {offerSummary,careBoundary,timingNote} from './offer-summary.mjs';
import site from '../config/site.json' with {type:'json'};
export const checkoutPath=id=>'/checkout/'+id.replaceAll('_','-')+'/';
export function offerActions(id,name,{monthly=false,compact=false}={}){
 if(!inquiryChoices.some(([key])=>key===id)||id==='unsure')throw Error('Unknown offer action');
 return `<div class="offer-purchase-actions"><a class="button" href="${checkoutPath(id)}${monthly?'?billing=monthly':''}">Request ${e(name)}</a><a class="text-link" href="/contact/?offer=${id}&amp;request_kind=question#inquiry">Ask about ${e(name)}</a>${compact?'':'<p>I confirm the work and price before payment.</p>'}</div>`;
}
export function checkoutPages(o,intake,config=site){return buyerPacks(o).map(pack=>{
 const s=offerSummary(o,pack.id),{id,offer,monthly,build}=s;
 const paymentSteps=build?[
  ['50% to book, after written scope approval',offer.payment_schedule[0].amount],
  ['30% after your written design approval',offer.payment_schedule[1].amount],
  ['20% after your written approval of the working site, before launch',offer.payment_schedule[2].amount]
 ]:id==='website_baseline'?[["Once I confirm I can work on your site, before I start",offer.payment_schedule[0].amount]]:id==='audit_fix_sprint'?[
  ['Once I confirm I can work on your site, before I start',offer.payment_schedule[0].amount],
  ['After you approve the finished work in writing',offer.payment_schedule[1].amount]
 ]:[];
 const payments=monthly?'<p class="checkout-payment-line">Paid monthly in advance. No minimum term; cancel before renewal to stop the next invoice.</p>':`<ol class="checkout-payment-steps">${paymentSteps.map(([label,amount])=>`<li>${e(label)} — <strong>${money(amount)}</strong></li>`).join('')}</ol>`;
 const firstPayment=monthly?`<p class="checkout-first-payment">First month: ${money(offer.monthly_price)}, or ${money(o.baseline.one_time_price+offer.monthly_price)} if a ${money(o.baseline.one_time_price)} Website Baseline is needed. I check whether a previous Website Baseline, studio build or Sprint already provides a usable review, so you do not pay for it twice. New studio websites include this review.</p>`:'';
 const pricingAnchor=build?'website-packages':monthly?'after-launch':'audit-sprint';
 const more=build?`${timingNote(o,id)}<p>A drag-and-drop editor is not included. Future edits require coding skills, a developer or optional monthly care.</p><ul>${s.points.map(point=>`<li>${e(point)}</li>`).join('')}</ul><p>Privacy or terms pages you supply do not count toward your page limit. Two feedback rounds are included. Each contact form can ask up to 6 agreed questions, sends to one inbox and has one confirmation. External account setup is separate.</p><p>I correct faults in the agreed website for 30 calendar days after launch. New requests and changes by outside providers are separate.</p><p>Domain, hosting, paid tools and approved extras cost separately.</p>`
  :monthly?`<ul>${s.points.map(point=>`<li>${e(point)}</li>`).join('')}</ul><p>The starting review covers up to ${o.baseline.page_cap} marketing pages; larger websites need an agreed review price. I check technology, access and safe recovery before accepting a website for care.</p><p>Required provider fees and separately agreed work are extra. You keep control of your accounts and paid work when care ends.</p>`
  :'<p>I check your website’s technology, access and safe recovery options before payment. I correct faults I caused in the agreed work for 30 calendar days after you approve its completion in writing. New requests and changes by other providers are separate.</p>';
 const assurance=intake.live?`<p class="checkout-reassurance">Nothing is booked or charged until you approve the written proposal, including work, price and dates. ${e(config.responseWindow)}</p>`:'<p class="checkout-reassurance">This preview does not book work or take payment.</p>';
 const body=`<header class="page-intro checkout-intro"><p class="eyebrow">No payment yet</p><h1>Request ${e(s.name)}</h1><p class="compact-price checkout-price">${money(s.price)} <span>${monthly?'/ month':'fixed fee'} · US dollars</span></p>${payments}${firstPayment}<p class="checkout-tax">Tax is added if it applies.${build?' These are the base-package payments; selected additions and their combined total appear below.':''}</p>${assurance}</header><div class="contact-layout checkout-layout"><aside class="checkout-summary"><h2>What you get</h2><ul class="checkout-highlights">${s.briefPoints.map(point=>`<li>${e(point)}</li>`).join('')}</ul>${monthly?careBoundary():''}<details class="checkout-detail"><summary>More about this package</summary>${more}<nav class="related-links" aria-label="${e(s.name)} help"><a href="/assets/buyer-packs/${id}">${e(s.name)}: full details</a><a href="/pricing/#${pricingAnchor}">Compare ${build?'website packages':monthly?'monthly plans':'review options'}</a><a href="/payments/">Payments and cancellation</a></nav></details></aside><section class="checkout-request" aria-labelledby="checkout-request-heading"><h2 id="checkout-request-heading">About your project</h2>${!intake.live?`<p class="notice">${intake.notice}</p>`:''}${inquiryForm(intake,{service:id,checkout:true,headingLevel:3})}</section></div>`;
 const searchName=monthly?s.name+(id==='keep_running'?' website care':' monthly SEO plan'):s.name;
 return {path:checkoutPath(id),title:`Request ${searchName} (${money(s.price)}${monthly?'/month':''})`,description:`${s.name} at ${money(s.price)}${monthly?'/month':''}. Ask for a written proposal confirming work, payments and dates before booking.`,body};
});}
