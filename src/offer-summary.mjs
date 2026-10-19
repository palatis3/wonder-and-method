import {escapeHtml as e,money} from './shared.mjs';

export const buildIds=['launch_site','focused_site','signature_site'];
export const monthlyIds=['keep_running','improve','grow'];
export function offerSummary(o,id){
 const build=buildIds.includes(id),monthly=monthlyIds.includes(id);
 const p=build?o[id]:monthly?o.plans[id]:id==='website_baseline'?o.baseline:id==='audit_fix_sprint'?o.audit_sprint:null;
 if(!p)throw Error('Unknown offer summary: '+id);
 let points;
 if(build){
  const articles=p.launch_content.articles,graphics={launch_site:1,focused_site:6,signature_site:12}[id],photos={launch_site:0,focused_site:6,signature_site:12}[id];
  points=[`Up to ${p.marketing_page_cap} custom marketing pages, with complete writing, keyword research and on-site SEO.`,
   articles?`${articles} original customer articles or guides, included within the page total.`:'Essential FAQs and one clear route to get in touch.',
   `${graphics} distinct finished graphic${graphics===1?'':'s'}${photos?`, plus ${photos} supplied-photo edits`:''}.`,
   `${p.forms} contact form${p.forms===1?'':'s'} and up to ${p.forms} ready booking or newsletter connection${p.forms===1?'':'s'}.`];
  if(id==='focused_site')points.push('Practical brand sheet, existing-logo exports, social avatar and five next content ideas.');
  if(id==='signature_site')points.push('Custom animated hero or 3D centerpiece, brand sheet, existing-logo exports, social avatar and a 90-day content plan.');
 }else if(monthly){
  points=id==='keep_running'?['Monthly website, form and search-health checks, with automated availability monitoring.','One related set of supplied text, image or link edits.','Quarterly status review and a monthly report with the next practical step.']:id==='improve'?['All Keep Running care and supplied edits.','Monthly keyword research and one completed improvement: a page, guide or agreed search, technical or contact-path fix.','Writing, publication, one feedback round and checks for the agreed work.','A monthly report and a 20-minute call or written review.']:['All Keep Running care and supplied edits.','Deeper keyword and competitor research, with a rolling 90-day plan.','Two connected improvements, including writing, publication, one feedback round and checks each.','One extra reuse task: a simple graphic and caption or a short newsletter excerpt from approved content.','A monthly report and a 30-minute call or written review.'];
 }else points=id==='website_baseline'?[`Review one supported site with up to ${p.page_cap} marketing pages.`,'Website and access checks, an ordered fix list, and a first small fix if safe and feasible.','One feedback round, checks and handoff notes. The review and list are included even if no safe fix fits.']:[`Review one supported site with up to ${p.page_cap} marketing pages.`,'The Website Baseline and up to two agreed small fixes in total.','One feedback round, retesting, before-and-after notes and the remaining fix list.'];
 return {id,name:p.public_name,build,monthly,price:build?p.public_price:monthly?p.monthly_price:p.one_time_price,fit:build||monthly?p.buyer_summary.fit:id==='website_baseline'?'Understand the site and the next fix':'Review the site and finish small repairs',points,offer:p};
}
export function offerCards(o,ids,{anchors=false}={}){
 return `<div class="compact-comparison" role="group" aria-label="Service options">${ids.map(id=>{const s=offerSummary(o,id);return `<article class="compact-offer"${anchors?` id="offer-${id}"`:''}><p class="eyebrow">${e(s.fit)}</p><h3>${e(s.name)}</h3><p class="compact-price">${money(s.price)} <span>${s.monthly?'/ month':'fixed fee'} · USD</span></p>${s.build?`<p class="offer-timing">Average delivery: ${e(s.offer.delivery_average)}.</p>`:''}<ul>${s.points.map(t=>`<li>${e(t)}</li>`).join('')}</ul><div class="offer-purchase-actions"><a class="button" href="/checkout/${id.replaceAll('_','-')}/${s.monthly?'?billing=monthly':''}">Request ${e(s.name.replace(' Website',''))}</a><p><a href="/contact/?offer=${id}&amp;request_kind=question#inquiry">Ask a question</a> · <a href="/assets/buyer-packs/${id}">Full details</a></p></div></article>`;}).join('')}</div>`;
}
export function editingNote(){return '<p class="editing-model"><strong>Future updates:</strong> edit the delivered source code yourself, ask a developer or choose optional studio care. A drag-and-drop editor is not included. <a href="/work/source-handoff/#code-editing">See how updates work</a>.</p>';}
export function baselineNote(o){return `<p class="baseline-note"><strong>Starting care on an existing website:</strong> the ${money(o.baseline.one_time_price)} Website Baseline reviews a supported site with up to ${o.baseline.page_cap} marketing pages. A current, usable review from a previous studio build or Sprint avoids this charge; I check before payment. Larger existing sites need a separately agreed review scope. New studio builds include their baseline.</p>`;}
export function timingNote(o,id){
 const ranges=buildIds.map(key=>o[key].public_name.replace(' Website','')+' '+o[key].delivery_average);
 const text=id?o[id].delivery_target:`Average delivery: ${ranges[0]}, ${ranges[1]} and ${ranges[2]}. ${o.delivery_conditions}`;
 return `<p class="delivery-target">${e(text)}</p>`;
}
export function careBoundary(){return '<p class="care-boundary"><strong>Care limits:</strong> standard care excludes CMS, plugin and theme updates, backups/restores and malware cleanup. These need a separate suitability assessment or a specialist. Monitoring does not mean 24/7 staffing or a guaranteed repair time.</p>';}
