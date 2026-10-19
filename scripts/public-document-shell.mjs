import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {brandWordmark} from '../src/brand.mjs';

// Standalone scope and evidence documents share the site's identity and cascade.
// Keep their reading layout simple, with no scripted menu or floating controls.
export async function publicDocumentStyles(output){
 const links=[];
 for(const file of ['brand.css','site.css']){
  const hash=createHash('sha256').update(await readFile(resolve(output,'assets',file))).digest('hex').slice(0,12);
  links.push(`<link rel="stylesheet" href="/assets/${file}?v=${hash}">`);
 }
 return links.join('');
}
export function publicDocumentHeader(){
 return `<a class="skip" href="#main">Skip to content</a><header class="site-header"><a href="/" class="wordmark brand-lockup" aria-label="Wonder &amp; Method home">${brandWordmark()}</a></header>`;
}
