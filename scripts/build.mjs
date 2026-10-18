import {writeBuyerPacks} from './build-buyer-packs.mjs';
import {supportChatCsp} from '../src/support-chat.mjs';
import {writeOwnedProof} from './build-owned-proof.mjs';
import {priceList} from '../src/shared.mjs';
import {civicAssetState,copyCivicAssets} from './build-civic-assets.mjs';
import {readFile,writeFile,mkdir,cp,readdir,rm} from 'node:fs/promises';
import {resolve,dirname,basename,extname,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {assertSiteOrigin,crawlFiles} from '../src/seo.mjs';
import {routeIndexEligible} from '../src/index-policy.mjs';
import {releaseFingerprint} from '../src/release.mjs';
import {renderPages} from '../src/pages.mjs';
import {transform,build as bundle} from 'esbuild';
const root=resolve(import.meta.dirname,'..');
const readJSON=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));

export async function buildCssBundles(assets,{includeChat=false}={}){
 const readStyles=async names=>(await Promise.all(names.map(name=>readFile(resolve(assets,name),'utf8')))).join('\n');
 const minify=async css=>(await transform(css,{loader:'css',minify:true,target:['chrome110','safari16']})).code;
 const shared=await readStyles(['style.css','journal.css','premium.css','site-refresh.css','layout-components.css',...(includeChat?['support-chat.css']:[])]);
 const plans=await readStyles(['brand.css','package-visuals.css']);
 return {shared:await minify(shared),plans:await minify(plans)};
}

export function applyCssBundles(html,boot){
 const plans=html.includes('href="/assets/package-visuals.css"');
 html=html.replace('<script src="/assets/boot.js"></script>',`<script>${boot}</script>`)
  .replace(/<link rel="stylesheet" href="\/assets\/(?:style|journal|premium|site-refresh|layout-components|support-chat)\.css">/g,'');
 if(plans)html=html.replace(/<link rel="stylesheet" href="\/assets\/(?:brand|package-visuals)\.css">/g,'');
 // Keep the original plan cascade: route styles, brand/package rules, shared rules.
 // The shared bundle has the same URL on plan and non-plan pages for cache reuse.
 return html.replace('</head>',`${plans?'<link rel="stylesheet" href="/assets/site-plans.css">':''}<link rel="stylesheet" href="/assets/site.css"></head>`);
}

export async function buildBrowserBundles(root,config){
 const journeyVersion=createHash('sha256').update(await readFile(resolve(root,'src/assets/journey-counts.js'))).digest('hex').slice(0,12);
 const client=await bundle({entryPoints:[resolve(root,'src/client.js')],bundle:true,write:false,format:'esm',minify:true,target:['chrome110','safari16'],plugins:[{name:'client-public-inputs',setup(build){
  // Match the HTML script URL exactly so there is one module instance and one
  // aggregate event deduplication set on pages with an inquiry form.
  build.onResolve({filter:/^\.\/journey-counts\.js$/},()=>({path:`/assets/journey-counts.js?v=${journeyVersion}`,external:true}));
  build.onLoad({filter:/[\\/]config[\\/]site\.json$/},()=>({loader:'json',contents:JSON.stringify({responseWindow:config.responseWindow,contactEmail:config.contactEmail})}));
 }}]});
 const calculator=await bundle({entryPoints:[resolve(root,'src/calculator.js')],bundle:true,write:false,format:'esm',minify:true,target:['chrome110','safari16']});
 return {client:client.outputFiles[0].contents,calculator:calculator.outputFiles[0].contents,journeyVersion};
}

// Explicit build-only candidates, not a general unused-asset sweep. Artwork used
// by work archives, poster variants, downloads, fonts and buyer packs stay intact.
const obsoleteBuildAssets=[
 ...['motion-1280.mp4','still-1536.webp','still-960.webp','still-640.webp'].map(name=>({file:`assets/editions/buffalo-dusk/${name}`,dynamic:['buffalo-dusk','editions/']})),
 {file:'assets/package-visuals/feature-guides.json',dynamic:['feature-guides']},
 {file:'assets/package-visuals/manifest.json',dynamic:['package-visuals/manifest']},
 ...['boot.js','journey-counts.js','fonts.css','journal.css','package-visuals.css','support-chat.css'].map(name=>({file:`assets/${name}`,dynamic:[]}))
];
export async function pruneObsoleteBuildAssets(output){
 const outputRoot=resolve(output),files=[];
 async function walk(directory){for(const entry of await readdir(directory,{withFileTypes:true})){
  const file=resolve(directory,entry.name);
  if(entry.isDirectory())await walk(file);else if(entry.isFile())files.push(file);
 }}
 await walk(outputRoot);
 const documents=await Promise.all(files.filter(file=>['.html','.css','.js','.mjs','.json','.svg','.xml','.txt'].includes(extname(file).toLowerCase())).map(async file=>({file,text:(await readFile(file,'utf8')).replace(/\\\//g,'/').replace(/\\u([\da-f]{4})|\\x([\da-f]{2})/gi,(_match,unicode,hex)=>String.fromCharCode(parseInt(unicode||hex,16)))})));
 const removed=[],retained=[];
 for(const candidate of obsoleteBuildAssets){
  const target=resolve(outputRoot,candidate.file);
  if(!target.startsWith(resolve(outputRoot,'assets')+sep))throw Error('Invalid obsolete asset path');
  if(!files.includes(target))continue;
  // A basename also catches relative URLs. Directory/stem guards retain dormant
  // edition/data candidates when a generated script could construct their URL.
  const tokens=[basename(target),candidate.file,...candidate.dynamic];
  const references=documents.filter(document=>document.file!==target&&tokens.some(token=>document.text.includes(token)));
  if(references.length){retained.push({file:candidate.file,referencedBy:references.map(document=>relative(outputRoot,document.file).split(sep).join('/'))});continue;}
  const bytes=(await readFile(target)).byteLength;
  await rm(target);removed.push({file:candidate.file,bytes});
 }
 return {removed,retained,bytesRemoved:removed.reduce((sum,item)=>sum+item.bytes,0)};
}

export async function buildSite(){
const config=await readJSON('config/site.json');
const chatCsp=supportChatCsp(config);
const offers=await readJSON('config/offers.json');
const map=await readJSON('authority/v5/site-map.json');
const tokens=await readJSON('authority/v5/design-tokens.json');
const geography=await readJSON('authority/v5/geography.json');
Object.assign(config,await civicAssetState(root,config));
assertSiteOrigin(config);
const pages=renderPages({config,offers,map,tokens,geography});
const output=resolve(root,'dist');
if(output!==resolve(root,'dist')) throw new Error('Invalid output');
await mkdir(output,{recursive:true});
for(const name of await readdir(output)){const target=resolve(output,name);if(!target.startsWith(output+'\\')&&!target.startsWith(output+'/'))throw Error('Invalid build child');await rm(target,{recursive:true,force:true});}
await cp(resolve(root,'src/assets'),resolve(output,'assets'),{recursive:true});
await cp(resolve(root,'src/siteaudit-NTlhNWVhZD.txt'),resolve(output,'siteaudit-NTlhNWVhZD.txt'));
await cp(resolve(root,'src/assets/brand/favicon.ico'),resolve(output,'favicon.ico'));
const browserBundles=await buildBrowserBundles(root,config);
await writeFile(resolve(output,'assets/client.js'),browserBundles.client);
await writeFile(resolve(output,'assets/calculator.js'),browserBundles.calculator);
await cp(resolve(root,'src/shared.mjs'),resolve(output,'assets/shared.mjs'));
await copyCivicAssets(root,output,config);
if(config.homeEdition==='civic-sculpture'){
 const civicScript=resolve(output,'assets/civic-sculpture-preview.js');
 await writeFile(civicScript,(await transform(await readFile(civicScript,'utf8'),{loader:'js',minify:true,target:['chrome110','safari16']})).code);
}
const boot=(await readFile(resolve(root,'src/assets/boot.js'),'utf8')).trim();
const bootHash=createHash('sha256').update(boot).digest('base64');
const css=await buildCssBundles(resolve(root,'src/assets'),{includeChat:Boolean(chatCsp)});
await writeFile(resolve(output,'assets/site.css'),css.shared);
await writeFile(resolve(output,'assets/site-plans.css'),css.plans);
for(const page of pages)page.html=applyCssBundles(page.html,boot);
const prices=priceList(offers);
await writeFile(resolve(output,'assets/prices.json'),JSON.stringify(prices));
await writeBuyerPacks(output,offers);
await writeOwnedProof(root,output,offers);
const assetVersions=new Map();
for(const page of pages)for(const match of page.html.matchAll(/(?:src|href)="(\/assets\/[^"?]+\.(?:css|js))"/g))if(!assetVersions.has(match[1]))assetVersions.set(match[1],createHash('sha256').update(await readFile(resolve(output,'.'+match[1]))).digest('hex').slice(0,12));
for(const page of pages){const file=resolve(output,`.${page.path}index.html`);await mkdir(dirname(file),{recursive:true});const html=page.html.replace(/((?:src|href)=")(\/assets\/[^"?]+\.(?:css|js))"/g,(_match,prefix,asset)=>`${prefix}${asset}?v=${assetVersions.get(asset)}"`);await writeFile(file,html);}
const crawl=crawlFiles(config,pages);
await writeFile(resolve(output,'sitemap.xml'),crawl.sitemap);
await writeFile(resolve(output,'robots.txt'),crawl.robots);
await mkdir(resolve(output,'.well-known'),{recursive:true});
await writeFile(resolve(output,'.well-known/security.txt'),'Contact: mailto:support@wonderandmethod.com\nExpires: 2027-04-17T00:00:00Z\nPreferred-Languages: en\nCanonical: https://wonderandmethod.com/.well-known/security.txt\n');
await cp(resolve(output,'404/index.html'),resolve(output,'404.html'));
// Static CSS hints only; no private, API, error or payment response is hinted.
const earlyHints=pages.filter(page=>routeIndexEligible(page.path)).map(page=>{const styles=[...page.html.matchAll(/<link rel="stylesheet" href="(\/assets\/[^"?]+\.css)"/g)].map(([,asset])=>`<${asset}?v=${assetVersions.get(asset)}>; rel=preload; as=style`);return styles.length?`${page.path}\n  Link: ${styles.join(', ')}\n`:'';}).join('\n');
await writeFile(resolve(output,'_headers'),`/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-${bootHash}'${chatCsp?' '+chatCsp.script:''}; style-src 'self'${chatCsp?' '+chatCsp.style:''}; img-src 'self' data:${chatCsp?' '+chatCsp.image:''}; font-src 'self'${chatCsp?' '+chatCsp.font:''}; connect-src 'self'${chatCsp?' '+chatCsp.connect:''}; frame-src ${chatCsp?chatCsp.frame:"'none'"}; media-src 'self'${chatCsp?' '+chatCsp.media:''}; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'
  Cache-Control: no-cache
${config.searchIndexing!==true?'  X-Robots-Tag: noindex, nofollow, noarchive, noimageindex\n':''}
/assets/*
  ! Cache-Control
  Cache-Control: public, max-age=3600, must-revalidate

${earlyHints}`);
const inventory=[];
const {sourceSha256}=await releaseFingerprint(root);
await writeFile(resolve(output,'version.json'),JSON.stringify({site:'wonder-and-method',sourceSha256,routes:pages.length},null,2)+'\n');
// Scan all emitted documents, including generated buyer packs, before pruning.
const assetPruning=await pruneObsoleteBuildAssets(output);
for(const name of await readdir(resolve(root,'authority/v5'))){const bytes=await readFile(resolve(root,'authority/v5',name)); inventory.push({file:name,sha256:createHash('sha256').update(bytes).digest('hex')});}
await mkdir(resolve(root,'evidence'),{recursive:true});
await writeFile(resolve(root,'evidence/authority-hashes.json'),JSON.stringify(inventory,null,2));
await writeFile(resolve(root,'evidence/build.json'),JSON.stringify({builtAt:new Date().toISOString(),mode:config.mode,routes:pages.map(p=>p.path),pageDates:Object.fromEntries(pages.filter(p=>p.modifiedAt).map(p=>[p.path,p.modifiedAt])),prices,source:'config/offers.json',gated:['/services/website-care/',...map.pages.filter(p=>p.stage==='launch_if_evidence_ready').map(p=>p.url)].filter(path=>!pages.some(p=>p.path===path)),guideReason:config.guideApprovals?.length?'Dated editorial review and owner publication instruction recorded in config/site.json':'Dated editorial evidence review required before publication',careReason:config.careReady?'Actual coverage and review recorded':'Actual staffed coverage, recipient and escalation must be agreed before enrollment'},null,2));
console.log(`Built ${pages.length} HTML routes (${config.mode}); source plan and operating records excluded from dist.`);
console.log(`Removed ${assetPruning.removed.length} unreferenced build assets (${assetPruning.bytesRemoved} bytes); retained ${assetPruning.retained.length} referenced candidates.`);
return {routes:pages.length,assetPruning,cssBytes:{shared:Buffer.byteLength(css.shared),plans:Buffer.byteLength(css.plans)}};
}

if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename))await buildSite();
