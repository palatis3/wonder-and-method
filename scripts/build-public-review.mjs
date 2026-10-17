import {writeBuyerPacks} from './build-buyer-packs.mjs';
import {writeOwnedProof} from './build-owned-proof.mjs';
import {priceList} from '../src/shared.mjs';
import {civicAssetState,copyCivicAssets} from './build-civic-assets.mjs';
import {readFile,writeFile,mkdir,cp,rm,readdir,stat} from 'node:fs/promises';
import {resolve,dirname,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {renderPages} from '../src/pages.mjs';
import {bundleWaterfront} from './bundle-waterfront.mjs';
import {bundleExperience} from './bundle-experience.mjs';
import {verifyLocalReferences} from './verify-local-references.mjs';

const root=resolve(import.meta.dirname,'..');
const output=resolve(root,'.runtime/public-review');
const origin='https://wonderandmethod.com';
const json=async file=>JSON.parse(await readFile(resolve(root,file),'utf8'));
const [saved,offers,map,geography]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/geography.json'].map(json));
const config={...saved,mode:'staging',formMode:'synthetic',reviewOnly:true,origin};
Object.assign(config,await civicAssetState(root,config));
const pages=renderPages({config,offers,map,geography});
if(output!==resolve(root,'.runtime','public-review'))throw Error('Unexpected review output directory');
await mkdir(output,{recursive:true});
// Keep the output directory itself available to the Windows dev-server watcher.
for(const name of await readdir(output)){
 const target=resolve(output,name);if(!target.startsWith(output+sep))throw Error('Unexpected cleanup target');
 await rm(target,{recursive:true,force:true});
}
await cp(resolve(root,'src/assets'),resolve(output,'assets'),{recursive:true});
await cp(resolve(root,'src/client.js'),resolve(output,'assets/client.js'));
await cp(resolve(root,'src/shared.mjs'),resolve(output,'assets/shared.mjs'));
await copyCivicAssets(root,output,config);
await bundleWaterfront(output);
await bundleExperience(output);
await writeFile(resolve(output,'assets/prices.json'),JSON.stringify(priceList(offers)));
await writeBuyerPacks(output,offers);
await writeOwnedProof(root,output,offers);
for(const page of pages){
 let html=page.html.replace('Private build preview · Synthetic inquiries only · Not open for booking','Design preview · Open for critique · Inquiry submissions disabled');
 html=html.replace('name="robots" content="noindex,nofollow"','name="robots" content="noindex,nofollow,noarchive,noimageindex"');
 if(page.path==='/contact/')html=html.replace(/<(input|textarea|select)\b/g,'<$1 disabled').replace('<button type="submit">','<button type="submit" disabled>').replace('<noscript><p>The local server returns an HTML confirmation or error when JavaScript is unavailable.</p></noscript>','');
 html=html.replace('This is a private design review; production release is a separate approval.','This is a public design preview with inquiry submissions disabled.');
 html=html.replace('exercise the synthetic inquiry path','review the proposed inquiry form').replace('in this private preview.','in this design preview.');
 html=html.replace('Separate staging delivery and recovery rehearsals are recorded in the private operating review; this page makes no production-readiness or client-results claim.','This preview demonstrates design and implementation; no client results or production-readiness claim is made.');
 if(/href="\/review\//.test(html))throw Error('Private operating review link in public output');
 if(/private operating review|\/review\/privacy/.test(html))throw Error('Private operating review reference in public output');
 if(!/<meta name="robots" content="noindex,nofollow,noarchive,noimageindex">/.test(html))throw Error('Missing public-review noindex directive: '+page.path);
 if(html.includes('Private build preview')||html.includes('Synthetic inquiries only'))throw Error('Unconverted private-preview disclosure: '+page.path);
 if(page.path==='/contact/'){
   const controls=[...html.matchAll(/<(?:input|textarea|select)\b[^>]*>/g)];
   if(!controls.length||controls.some(match=>! /\bdisabled\b/.test(match[0]))||!/<button type="submit" disabled>/.test(html))throw Error('Review contact controls must all be disabled');
 }
 const file=resolve(output,'.'+page.path+'index.html');await mkdir(dirname(file),{recursive:true});await writeFile(file,html);
}
await cp(resolve(output,'404/index.html'),resolve(output,'404.html'));
// Crawlers must be allowed to read the noindex directive. This is not access control.
await writeFile(resolve(output,'robots.txt'),'User-agent: *\nAllow: /\n');
await writeFile(resolve(output,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
await writeFile(resolve(output,'_headers'),`/*
  X-Robots-Tag: noindex, nofollow, noarchive, noimageindex
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src https://my.spline.design; form-action 'none'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'
  Cache-Control: no-cache
`);
const refs=await verifyLocalReferences(output,pages.map(page=>'.'+page.path+'index.html'));
const inventory=[];async function walk(dir){for(const name of await readdir(dir)){const path=resolve(dir,name);if((await stat(path)).isDirectory())await walk(path);else{const bytes=await readFile(path);inventory.push({file:relative(output,path).replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}
await walk(output);
if(inventory.some(item=>/^(authority|operations|config|evidence|review)\/|\.(sqlite|dpapi|env)$/.test(item.file)))throw Error('Private file in review output');
await writeFile(resolve(root,'evidence/public-review-build.json'),JSON.stringify({builtAt:new Date().toISOString(),origin,scope:'Public critique preview only; no inquiry handling or production launch',routes:pages.map(page=>page.path),noindex:true,inquirySubmission:false,localReferences:refs,inventory},null,2));
console.log(`Prepared ${pages.length} critique routes at ${output}; ${refs.references} local references verified.`);
