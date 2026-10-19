import {publicDocumentStyles,publicDocumentHeader} from './public-document-shell.mjs';
import siteConfig from '../config/site.json' with {type:'json'};
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {buyerPacks,packBody} from '../src/buyer-packs.mjs';
import {escapeHtml as e,moneyExact} from '../src/shared.mjs';
export async function writeBuyerPacks(output,offers){
 const documentStyles=await publicDocumentStyles(output);
 const folder=resolve(output,'assets/buyer-packs');await mkdir(folder,{recursive:true});
 const packs=buyerPacks(offers);
 for(const pack of packs){
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${e(siteConfig.origin)}/assets/buyer-packs/${pack.id}"><meta name="description" content="${e(pack.name)} decision pack: review pricing, included work, limits, responsibilities and acceptance checks before requesting a scoped proposal."><title>${e(pack.name)} decision pack | Wonder and Method</title>${documentStyles}</head><body class="studio-site studio-inner buyer-pack-page">${publicDocumentHeader()}<main id="main" tabindex="-1" class="buyer-pack-document"><p><a href="/pricing/#buyer-packs">All decision packs</a> · <a href="${pack.id}.txt" download>Plain text</a></p><header class="page-intro"><p class="eyebrow">Decision pack · Version ${e(offers.document_version||offers.version)} · ${e(offers.as_of)}</p><h1>${e(pack.name)}</h1><p class="price">${moneyExact(pack.price)} <span>${e(pack.priceLabel)}</span></p>${pack.annual?`<p>Annual option: ${moneyExact(pack.annual.upfront_price)} prepaid for twelve cycles; ${moneyExact(pack.annual.monthly_equivalent)}/month equivalent, not monthly billing.</p>`:''}</header>${packBody(pack)}<p><a href="${e(siteConfig.origin)}/privacy/">Privacy notice</a> · <a href="${e(siteConfig.origin)}/terms/">Website terms</a></p></main></body></html>`;
  const txt=['WONDER AND METHOD',siteConfig.origin+'/',pack.name.toUpperCase()+' / DECISION PACK','Version '+(offers.document_version||offers.version)+' · '+offers.as_of,'Source: '+siteConfig.origin+'/assets/buyer-packs/'+pack.id,`${moneyExact(pack.price)} ${pack.priceLabel}`,pack.scopeStatus,...pack.sections.flatMap(s=>['',s.title.toUpperCase(),...s.items.filter(Boolean).map(x=>'- '+x)]),'','NEXT ACTION: Request '+pack.name+'. Return to the website that supplied this pack: '+siteConfig.origin+pack.request,'No booking or payment is made by this request.','Privacy: '+siteConfig.origin+'/privacy/','Website terms: '+siteConfig.origin+'/terms/'].join('\n');
  await writeFile(resolve(folder,pack.id+'.html'),html);await writeFile(resolve(folder,pack.id+'.txt'),txt);
 }
 await writeFile(resolve(folder,'index.json'),JSON.stringify(packs.map(p=>({id:p.id,name:p.name,price:p.price,priceLabel:p.priceLabel,summary:p.sections[0].items[0],request:p.request,annual:p.annual||null,baselineFee:p.annual?offers.baseline.one_time_price:null})),null,2)+'\n');
}
