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
   `${graphics} original graphic${graphics===1?'':'s'}${photos?` and ${photos} photo edits`:''}${id==='launch_site'?', plus a simple color and type guide':', a color and type reference and usable files of your existing logo'}.`,
   `${p.forms} contact form${p.forms===1?'':'s'} and up to ${p.external_connection_limit} booking or newsletter connection${p.external_connection_limit===1?'':'s'} using a ready link or embedded tool.`];
  points.push(id==='signature_site'?`A social profile image, an original animated or 3D feature at the top of your home page, plus up to ${p.search_research.content_idea_limit} ideas in a written 90-day plan; later work is separate.`:id==='focused_site'?`A profile image for social accounts and up to ${p.search_research.content_idea_limit} ideas for future content.`:'A clear explanation of your services and an easy way to contact you.');
 }else if(monthly){
  points=id==='keep_running'?['Website and contact-form checks, with automated availability monitoring.','One set of small text, photo or link changes you send each month.','A monthly report and a quarterly check of the agreed website areas.']:id==='improve'?['Website checks, one set of small changes you send and a quarterly website check.','Research into one customer topic and one finished improvement a month.','A new or improved page, guide, or agreed technical or contact-form fix, including writing and publication.','A monthly report and a 20-minute call or written review.']:['Website checks, one set of small changes you send, a quarterly website check and two completed improvements a month.','Research into two topics and up to 3 competitors, with a rolling 90-day content plan.','One extra social graphic with a caption, or a newsletter excerpt.','A monthly report and a 30-minute call or written review, replacing Improve’s 20-minute review.'];
 }else points=id==='website_baseline'?[`Review one website with up to ${p.page_cap} agreed main pages.`,'An ordered fix list and one small fix if it is safe and practical.','One feedback round, checks and clear notes on what changed.']:[`The Website Baseline review, with up to ${p.page_cap} agreed main pages.`,'Up to two agreed small fixes in total, retested before you approve them.','One feedback round, before-and-after notes and a list of what remains.'];
 const fits={launch_site:'One main service, with up to 6 pages',focused_site:'Several services, each with its own page, up to 15 pages',signature_site:'A larger site, up to 30 pages, with a custom animated homepage',keep_running:'Monthly checks and small changes made for you',improve:'One researched improvement to your website or search presence each month',grow:'Two related improvements each month and a rolling 90-day plan',website_baseline:'A clear list of what to fix, with one small fix if practical',audit_fix_sprint:'A review and up to two small problems fixed'};
 const briefPoints=build?[
  `Up to ${p.marketing_page_cap} pages${p.launch_content.articles?`, including ${p.launch_content.articles} guides`:''}; complete writing and search setup.`,
  id==='signature_site'?`An animated or 3D homepage feature; ${p.graphic_counts.total} graphics, ${p.graphic_counts.supplied_photo_edits} photo edits, a color-and-font guide, clean files of your existing logo and a social profile picture.`:id==='focused_site'?`${p.graphic_counts.total} graphics, ${p.graphic_counts.supplied_photo_edits} photo edits, a color-and-font guide, clean files of your existing logo and a social profile picture.`:`${p.graphic_counts.total} original graphic and a simple color-and-font guide.`,
  `${p.forms} contact form${p.forms===1?'':'s'} and links or embeds for up to ${p.external_connection_limit} booking or email-signup tool${p.external_connection_limit===1?'':'s'} you already use.`
 ]:monthly?(id==='keep_running'?[
  'Automated monitoring and monthly website and form checks.',
  'One set of small text, photo or link changes you send each month.',
  'A monthly report and quarterly website check.'
 ]:id==='improve'?[
  'Website checks and one set of small changes you send.',
  'One researched, completed website improvement each month.',
  'A monthly report and 20-minute call or written review.'
 ]:[
  'Website checks, small changes you send and two completed improvements each month.',
  'Research into two topics, up to three competitors and a rolling 90-day plan.',
  'One extra social graphic or newsletter excerpt; a monthly report and 30-minute call or written review.'
 ]):points;
 return {id,name:p.public_name,build,monthly,price:build?p.public_price:monthly?p.monthly_price:p.one_time_price,fit:fits[id],points,briefPoints,offer:p};
}
export function offerCards(o,ids,{anchors=false,compact=!anchors,fullDetails=false}={}){
 return `<div class="compact-comparison${compact?' compact-comparison--summary':''}" role="group" aria-label="Service options">${ids.map(id=>{const s=offerSummary(o,id);return `<article class="compact-offer"${anchors?` id="offer-${id}"`:''}><h3>${e(s.name)}</h3><p class="compact-price">${money(s.price)} <span>${s.monthly?'/month':'fixed fee'}</span></p><p class="offer-fit"><strong>Choose this for:</strong> ${e(s.fit)}.</p>${s.build?`<p class="offer-timing">Build work: ${e(s.offer.delivery_average)}, plus your two review windows. <a href="/process/#project-calendar">How the dates work</a>.</p>`:''}${s.monthly?`<p class="offer-first-payment">First payment: ${money(s.price+o.baseline.one_time_price)} if your site needs the ${money(o.baseline.one_time_price)} Website Baseline; otherwise ${money(s.price)}.</p>`:''}<ul>${s.briefPoints.map(t=>`<li>${e(t)}</li>`).join('')}</ul><div class="offer-purchase-actions"><a class="button" href="/checkout/${id.replaceAll('_','-')}/${s.monthly?'?billing=monthly':''}">Request ${e(s.name)}</a><a class="text-link" href="${fullDetails?'/assets/buyer-packs/'+id:offerDetailsPath(id)}">${e(s.name)}: ${fullDetails?'complete details':'what’s included'}</a></div></article>`;}).join('')}</div>`;
}
export function offerDetailsPath(id){return buildIds.includes(id)?`/services/web-design/#offer-${id}`:monthlyIds.includes(id)?id==='keep_running'?'/services/website-care/#offer-keep_running':`/services/seo/#offer-${id}`:`/services/website-audit/#offer-${id}`;}
export function offerQuestions(ids){const offer=ids.length===1?ids[0]:'unsure';return `<p class="offer-question"><a href="/contact/?offer=${offer}&amp;request_kind=question#inquiry">Ask about these ${ids.every(id=>buildIds.includes(id))?'packages':'services'}</a></p>`;}
export function editingAnswer(){return 'There is no drag-and-drop editor to log into. Email me the changes for optional monthly care, or use any developer: you receive the website files. Tell me before booking if you need to edit pages yourself often.';}
export function editingNote(){return `<p class="editing-model"><strong>Hand-built websites, not WordPress:</strong> ${editingAnswer()} <a href="/work/source-handoff/#code-editing">How updates work</a>.</p>`;}
export function baselineNote(o){return `<p class="baseline-note"><strong>Have an existing website?</strong> Monthly help starts with a one-time ${money(o.baseline.one_time_price)} Website Baseline review of up to ${o.baseline.page_cap} agreed main pages. You skip the fee if a previous Website Baseline, a website I built or an Audit &amp; Fix Sprint still provides a usable review. I confirm this before payment; larger sites need a separate review price.</p>`;}
export function timingNote(o,id){
 const ranges=buildIds.map(key=>o[key].public_name.replace(' Website','')+' '+o[key].delivery_average);
 const text=id?`Planned build work: ${o[id].delivery_average} once your pages, facts, photos and access are ready. Add two review windows of up to five business days each. Your proposal confirms the launch date.`:`Planned build work: ${ranges[0]}, ${ranges[1]} and ${ranges[2]}. ${o.delivery_conditions}`;
 return `<p class="delivery-target">${e(text)}</p>`;
}
export function careBoundary(){return '<p class="care-boundary"><strong>Not included in monthly care:</strong> WordPress, plugin or theme updates, backups, restores and malware cleanup. Keep these with your host or specialist; I explain what your site needs before you pay. Monitoring is automated, with no 24/7 staffing or guaranteed repair time.</p>';}
export function supportedSiteNote(){return '<p>Before you pay, I check that I can safely access and change your website and that there is a way to recover it if needed. I check WordPress, Wix, Squarespace, Webflow and custom-code sites individually.</p>';}
