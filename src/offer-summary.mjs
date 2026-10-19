import {escapeHtml as e,money} from './shared.mjs';

export const buildIds=['launch_site','focused_site','signature_site'];
export const monthlyIds=['keep_running','improve','grow'];
export function offerSummary(o,id){
 const build=buildIds.includes(id),monthly=monthlyIds.includes(id);
 const p=build?o[id]:monthly?o.plans[id]:id==='website_baseline'?o.baseline:id==='audit_fix_sprint'?o.audit_sprint:null;
 if(!p)throw Error('Unknown offer summary: '+id);
 let points;
 if(build){
  const articles=p.launch_content.articles,graphics=p.graphic_counts.total,photos=p.graphic_counts.supplied_photo_edits;
  points=[`Up to ${p.marketing_page_cap} custom pages, with complete writing and search setup${articles?`; ${articles} articles or guides count within that total`:''}.`,
   `${graphics} original graphic${graphics===1?'':'s'}${photos?` and ${photos} photo edits`:''}${id==='launch_site'?', plus a simple style guide':', a brand sheet and existing-logo exports'}.`,
   `${p.forms} contact form${p.forms===1?'':'s'} and up to ${p.external_connection_limit} links or embeds for booking or newsletters.`];
  points.push(id==='signature_site'?`An original animated hero or 3D centerpiece, plus up to ${p.search_research.content_idea_limit} ideas in a written 90-day plan; later work is separate.`:id==='focused_site'?`A social avatar and up to ${p.search_research.content_idea_limit} ideas for future content.`:'A clear explanation of your services and an easy way to contact you.');
 }else if(monthly){
  points=id==='keep_running'?['Website and contact-form checks, with automated availability monitoring.','One round of small text, photo or link edits a month.','A monthly report and a quarterly check of the agreed website areas.']:id==='improve'?['Everything in Keep Running.','Research into one customer topic and one finished improvement a month.','A new or improved page, guide, or agreed technical or contact-form fix, including writing and publication.','A monthly report and a 20-minute call or written review.']:['Everything in Improve, with two improvements a month instead of one.','Research into two topics and up to 3 competitors, with a rolling 90-day content plan.','One extra social graphic with a caption, or a short newsletter excerpt.','A monthly report and a 30-minute call or written review.'];
 }else points=id==='website_baseline'?[`Review one website with up to ${p.page_cap} marketing pages.`,'An ordered fix list and one small fix if it is safe and practical.','One feedback round and clear notes on what changed.']:[`The Website Baseline review, with up to ${p.page_cap} marketing pages.`,'Up to two agreed small fixes in total, including any Baseline fix.','One feedback round, retesting and before-and-after notes.'];
 const fits={launch_site:'A focused website for a clear service',focused_site:'Several services that need their own pages',signature_site:'A larger website with distinctive motion',keep_running:'Keep your website working and current',improve:'Improve one part of your website each month',grow:'Build a connected content plan',website_baseline:'Find out what needs attention',audit_fix_sprint:'Review the site and finish small repairs'};
 return {id,name:p.public_name,build,monthly,price:build?p.public_price:monthly?p.monthly_price:p.one_time_price,fit:fits[id],points,offer:p};
}
export function offerCards(o,ids,{anchors=false}={}){
 return `<div class="compact-comparison" role="group" aria-label="Service options">${ids.map(id=>{const s=offerSummary(o,id),short=s.name.replace(' Website','');return `<article class="compact-offer"${anchors?` id="offer-${id}"`:''}><h3>${e(s.name)}</h3><p class="compact-price">${money(s.price)} <span>${s.monthly?'/ month':'fixed fee'}</span></p><p class="offer-fit"><strong>Good for:</strong> ${e(s.fit)}.</p>${s.build?`<p class="offer-timing">Average delivery: ${e(s.offer.delivery_average)}.</p>`:''}<ul>${s.points.map(t=>`<li>${e(t)}</li>`).join('')}</ul><div class="offer-purchase-actions"><a class="button" href="/checkout/${id.replaceAll('_','-')}/${s.monthly?'?billing=monthly':''}">Request ${e(short)}</a><a class="text-link" href="/assets/buyer-packs/${id}">${e(short)}: what’s included</a></div></article>`;}).join('')}</div>`;
}
export function offerQuestions(ids){const offer=ids.length===1?ids[0]:'unsure';return `<p class="offer-question"><a href="/contact/?offer=${offer}&amp;request_kind=question#inquiry">Ask about these ${ids.every(id=>buildIds.includes(id))?'packages':'services'}</a></p>`;}
export function editingNote(){return '<p class="editing-model"><strong>Future updates:</strong> these websites do not include a drag-and-drop editor. Changes require coding skills, a developer or optional monthly care. Tell me before booking if you want to edit pages yourself often. <a href="/work/source-handoff/#code-editing">How updates work</a>.</p>';}
export function baselineNote(o){return `<p class="baseline-note"><strong>Starting monthly help:</strong> an existing website may need the ${money(o.baseline.one_time_price)} Website Baseline first, covering up to ${o.baseline.page_cap} marketing pages. I check whether a previous Website Baseline, studio build or Sprint already provides the review I need, so you do not pay for it twice. Larger websites need an agreed review price. A new studio website includes this review.</p>`;}
export function timingNote(o,id){
 const ranges=buildIds.map(key=>o[key].public_name.replace(' Website','')+' '+o[key].delivery_average);
 const text=id?o[id].delivery_target:`Average delivery: ${ranges[0]}, ${ranges[1]} and ${ranges[2]}. ${o.delivery_conditions}`;
 return `<p class="delivery-target">${e(text)}</p>`;
}
export function careBoundary(){return '<p class="care-boundary"><strong>Care limits:</strong> software, plugin and theme updates, backups, restores and malware cleanup are separate. Monitoring is automated; care does not include 24/7 staffing or a guaranteed repair time.</p>';}
export function supportedSiteNote(){return '<p>A <strong>supported website</strong> is one whose technology, account access and recovery options let me safely do the agreed work. I check this before payment; no platform is automatically covered.</p>';}
