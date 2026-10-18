import {compactComparison} from './buyer-journey.mjs';
import {offerActions} from './checkout-content.mjs';
import {createHash} from 'node:crypto';
import manifest from './assets/package-visuals/manifest.json' with {type:'json'};
import guides from './assets/package-visuals/feature-guides.json' with {type:'json'};
import {escapeHtml as e,money} from './shared.mjs';
import {publicReviewAreas} from './review-content.mjs';
import {packageArtSource} from './package-art-source.mjs';
const kinds=['website','monthly','existing'];
const fits={launch_site:'A polished presence with complete writing, research and design.',focused_site:'A richer service story with original guides and finished graphics.',signature_site:'Your fullest story, with deeper research and original animation.',keep_running:'Care checks and supplied updates. No recurring keyword campaign or main improvement.',improve:'Monthly keyword research and one complete website improvement.',grow:'A connected SEO campaign, two improvements and a small promotional reuse task.',website_baseline:'Find out what needs attention and make a first safe fix when appropriate.',audit_fix_sprint:'Review the site and complete up to two agreed fixes.'};
export const packageVisualScopeHash=o=>createHash('sha256').update(JSON.stringify(packageArtSource(o))).digest('hex');

// Printed prices and scope must not silently drift from the configured offers.
export function assertPackageVisualOffers(o){
 for(const item of manifest.website.offers){const offer=o[item.key];if(offer?.public_name!==item.configuredName||offer.public_price!==item.price||offer.marketing_page_cap!==item.pages)throw Error(`Regenerate package comparison image and manifest for ${item.key}: configured name, price or page limit changed.`);}
 for(const item of manifest.monthly.offers){const offer=o.plans[item.key];if(offer?.public_name!==item.name||offer.monthly_price!==item.price||offer.priorities!==item.priorities)throw Error(`Regenerate package comparison image and manifest for ${item.key}: configured name, price or priority count changed.`);}
 for(const item of manifest.existing.offers){const offer=o[item.configKey];if(offer?.public_name!==item.name||offer.one_time_price!==item.price||(item.pages!==undefined&&offer.page_cap!==item.pages))throw Error(`Regenerate package comparison image and manifest for ${item.key}: configured name, price or page limit changed.`);}
 if(manifest.scopeSha256&&packageVisualScopeHash(o)!==manifest.scopeSha256)throw Error('Regenerate package comparison images and feature guides: configured offer scope changed.');
}

function featureList(p){
 return p.sections.map(section=>`<section class="package-feature-section"><h4>${e(section.title)}</h4><ul>${section.features.map(id=>{const f=p.features.find(f=>f.id===id);if(!f)throw Error('Missing feature '+id);return `<li data-feature="${e(id)}">${e(f.plain)}</li>`;}).join('')}</ul></section>`).join('');
}

function quickComparison(o,kind){
 if(kind==='existing')return '';
 const rows=kind==='website'?[
  ['Launch',`Up to ${o.launch_site.marketing_page_cap} marketing pages; one ready service connection and source-code handoff.`],
  ['Focused',`Up to ${o.focused_site.marketing_page_cap} marketing pages including two launch guides; six finished graphics and deeper research.`],
  ['Signature',`Up to ${o.signature_site.marketing_page_cap} marketing pages including four launch guides; twelve finished graphics and an original animated centerpiece.`]
 ]:Object.values(o.plans).map(plan=>[plan.public_name,plan.buyer_summary.outcomes.join(' ')]);
 return `<dl class="package-quick-comparison" aria-label="${kind==='website'?'Website':'Monthly'} plan differences">${rows.map(([name,copy])=>`<div><dt>${e(name)}</dt><dd>${e(copy)}</dd></div>`).join('')}</dl>`;
}

export function packageVisualCards(o,{kind='website',anchors=false,comparison=true}={}){
 assertPackageVisualOffers(o);
 if(!kinds.includes(kind))throw Error('Unknown package comparison');
 const monthly=kind==='monthly',existing=kind==='existing',group=manifest[kind];
 const terms=monthly?`Optional monthly studio fees, in USD. Hosting, domains, tools, taxes and approved additions are extra. Supported sites only; <a href="/services/website-care/">existing-site setup is ${money(o.baseline.one_time_price)} once</a>, included after a usable build or Audit &amp; Fix Sprint. Bundled launch work is not charged again. <a href="/services/website-care/#care-terms">Read coverage, cancellation and annual options</a>.`:existing?'One-time studio fees, in USD. Provider bills, taxes and separately approved work are extra. Monthly care is optional. A usable build or Sprint covers the same setup; you are not charged twice for a usable baseline. <a href="/services/website-audit/#one-off-terms">Read payment, acceptance, correction and exit terms</a>.':'Fixed studio fees, in USD. Hosting, domains, tools, taxes and approved additions are extra. Exact pages, source handoff, ready connections and dates are agreed before booking. <a href="/pricing/#payments">Read payment and project terms</a>.';
 const lead=existing?'Choose a starting review or a review with two agreed fixes.':monthly?'Choose website care, monthly SEO improvement or a connected growth campaign.':'Choose the pages and creative scope your website needs.';
 return `<div class="package-visual-common"><p class="package-visual-common-label"><strong>${lead}</strong></p></div>${comparison?compactComparison(o,kind):''}<p class="package-art-intro">Explore each complete plan image below, or open its features as text.${existing?'':' Higher-plan limits replace lower-plan limits; quantities do not add together.'}</p><div class="package-visual-grid${group.offers.length===2?' package-visual-grid--two':''}" data-comparison="${kind}">${group.offers.map(item=>{
  const p=guides.products.find(p=>p.id===item.key);if(!p)throw Error('Missing feature guide '+item.key);
  const art=item.poster||p.poster,src=`/assets/package-visuals/${art.file}?v=${manifest.revision}`;
  const previewSrcset=[360,720].map(width=>`/assets/package-visuals/${art.file.replace('.webp',`-${width}.webp`)}?v=${manifest.revision} ${width}w`).join(', ');
  return `<article class="package-visual-card"${anchors?` id="${item.key.replace('_site','')}"`: ''}><header class="package-visual-heading"><p class="package-name">${e(item.name)}</p><p class="package-visual-price">${money(item.price)} <span>${monthly?'/ month':existing?'one-time':'fixed project'}</span></p><p>${fits[item.key]}</p>${p.poster.inheritance?`<p class="package-inheritance"><strong>${e(p.poster.inheritance)}</strong></p>`:''}</header><a class="package-visual-art" href="${src}"><img src="${src}" srcset="${previewSrcset}" sizes="(max-width: 767px) calc(90vw - 1.75rem), (max-width: 1440px) calc(30vw - 2.75rem), 390px" width="${art.width}" height="${art.height}" loading="lazy" decoding="async" alt=""><span>Enlarge the ${e(item.name)} image</span></a><details class="package-visual-details"><summary>Read all ${e(item.name)} features</summary><div>${p.poster.inheritance?'<p>This list includes inherited features as well as the upgrades.</p>':''}${kind==='website'?`<p class="package-page-limits">${e(o[item.key].page_scope)}</p>`:''}${featureList(p)}<p>${kind==='website'?`<a href="/pricing/#${item.key.replace('_site','')}">Compare the ${e(item.name)} website plan</a> · `:''}<a href="/assets/buyer-packs/${item.key}">Exact scope, limits and acceptance for ${e(item.name)}</a></p></div></details>${offerActions(item.key,item.name,{monthly})}</article>`;
 }).join('')}</div><p class="package-visual-terms">${terms}</p>`;
}

export function packageRelationship(){return `<div class="package-relationship"><div><h3>Your website explains.</h3><p>A clear place to understand your business and take the next step.</p></div><div><h3>Search work helps people find it.</h3><p>Useful pages shaped around the questions your customers ask.</p></div><p>Every build includes keyword and competitor research, complete writing and on-site SEO. Focused adds two original launch guides; Signature adds four and a 90-day content plan. Guides count within each page total. Later delivery and monitoring are separately agreed. Monthly work is optional: Keep Running provides care; Improve adds monthly opportunity research and one complete improvement; Grow adds deeper research, two connected improvements, a rolling 90-day plan and a small promotional reuse task. Rankings, traffic and inquiries are not guaranteed.</p></div>`;}

export function packageVisualCallout(o,{kind='website'}={}){return `<details class="package-visual-callout"><summary>${kind==='website'?'Compare website plans and every included feature':kind==='monthly'?'Compare monthly plans and every included feature':'Compare the baseline and Audit &amp; Fix Sprint'}</summary><div>${packageVisualCards(o,{kind})}</div></details>`;}
