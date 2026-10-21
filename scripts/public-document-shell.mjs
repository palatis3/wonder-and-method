import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {brand,brandWordmark} from '../src/brand.mjs';
import {escapeHtml as e} from '../src/shared.mjs';

// Standalone scope and evidence documents share the site's identity and cascade.
// Keep their reading layout simple and their sharing metadata consistent.
export function publicDocumentSocial(config,{name,path,description}){
 return `<meta property="og:type" content="website"><meta property="og:title" content="${e(name)} | Wonder and Method"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${e(config.origin+path)}"><meta property="og:image" content="${e(config.origin+brand.social)}"><meta property="og:image:width" content="${brand.socialWidth}"><meta property="og:image:height" content="${brand.socialHeight}"><meta property="og:image:alt" content="${e(brand.socialAlt)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${e(name)} | Wonder and Method"><meta name="twitter:description" content="${e(description)}"><meta name="twitter:image" content="${e(config.origin+brand.social)}"><meta name="twitter:image:alt" content="${e(brand.socialAlt)}">`;
}
export async function publicDocumentStyles(output){
 const links=[];
 for(const file of ['site.css']){
  const hash=createHash('sha256').update(await readFile(resolve(output,'assets',file))).digest('hex').slice(0,12);
  links.push(`<link rel="stylesheet" href="/assets/${file}?v=${hash}">`);
 }
 return links.join('');
}
export function publicDocumentHeader(){
 return `<a class="skip" href="#main">Skip to content</a><header class="site-header"><a href="/" class="wordmark brand-lockup" aria-label="Wonder &amp; Method home">${brandWordmark()}</a></header>`;
}
