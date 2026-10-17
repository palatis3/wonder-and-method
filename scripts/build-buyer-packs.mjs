import siteConfig from '../config/site.json' with {type:'json'};
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {buyerPacks,packBody} from '../src/buyer-packs.mjs';
import {escapeHtml as e,moneyExact} from '../src/shared.mjs';
export async function writeBuyerPacks(output,offers){
 const folder=resolve(output,'assets/buyer-packs');await mkdir(folder,{recursive:true});
 const packs=buyerPacks(offers);
 for(const pack of packs){
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${e(siteConfig.origin)}/assets/buyer-packs/${pack.id}"><meta name="description" content="${e(pack.name)} decision pack: review pricing, included work, limits, responsibilities and acceptance checks before requesting a scoped proposal."><title>${e(pack.name)} decision pack | Wonder and Method</title><link rel="stylesheet" href="/assets/style.css"><link rel="stylesheet" href="/assets/premium.css"><link rel="stylesheet" href="/assets/site-refresh.css"></head><body class="studio-site studio-inner"><header class="site-header"><a href="/" class="wordmark">Wonder &amp; Method</a></header><main class="buyer-pack-document"><p><a href="/pricing/#buyer-packs">All offer packs</a> · <a href="${pack.id}.txt" download>Plain text</a></p><header class="page-intro"><p class="eyebrow">Decision and acceptance pack · ${e(offers.as_of)}</p><h1>${e(pack.name)}</h1><p class="price">${moneyExact(pack.price)} <span>${e(pack.priceLabel)}</span></p>${pack.annual?`<p>Annual option: ${moneyExact(pack.annual.upfront_price)} prepaid for twelve cycles; ${moneyExact(pack.annual.monthly_equivalent)}/month equivalent, not monthly billing.</p>`:''}</header>${packBody(pack)}</main></body></html>`;
  const txt=[pack.name.toUpperCase()+' / DECISION AND ACCEPTANCE PACK',offers.as_of,`${moneyExact(pack.price)} ${pack.priceLabel}`,pack.scopeStatus,...pack.sections.flatMap(s=>['',s.title.toUpperCase(),...s.items.filter(Boolean).map(x=>'- '+x)]),'','NEXT ACTION: Request '+pack.name+'. Return to the website that supplied this pack: '+pack.request,'No booking or payment is made by this request.'].join('\n');
  await writeFile(resolve(folder,pack.id+'.html'),html);await writeFile(resolve(folder,pack.id+'.txt'),txt);
 }
 await writeFile(resolve(folder,'index.json'),JSON.stringify(packs.map(p=>({id:p.id,name:p.name,price:p.price,priceLabel:p.priceLabel,summary:p.sections[0].items[0],request:p.request,annual:p.annual||null,baselineFee:p.annual?offers.baseline.one_time_price:null})),null,2)+'\n');
}
