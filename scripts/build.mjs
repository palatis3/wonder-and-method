import {execFileSync} from 'node:child_process';
import {assertPageDates} from './page-dates.mjs';
import {verifyLocalReferences} from './verify-local-references.mjs';
import {writeBuyerPacks} from './build-buyer-packs.mjs';
import {supportChatCsp} from '../src/support-chat.mjs';
import {writeOwnedProof} from './build-owned-proof.mjs';
import {versionPublicDocumentLinks} from './version-public-documents.mjs';
import {priceList} from '../src/shared.mjs';
import {civicAssetState,copyCivicAssets} from './build-civic-assets.mjs';
import {readFile,writeFile,mkdir,cp,readdir,rm,stat} from 'node:fs/promises';
import {resolve,dirname,basename,extname,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {assertSiteOrigin,crawlFiles} from '../src/seo.mjs';
import {privateRoute} from '../src/index-policy.mjs';
import {releaseFingerprint} from '../src/release.mjs';
import {renderPages} from '../src/pages.mjs';
import {transform,build as bundle} from 'esbuild';
const root=resolve(import.meta.dirname,'..');
const readJSON=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));

export async function buildCssBundles(assets,{includeChat=false}={}){
 const readStyles=async names=>(await Promise.all(names.map(name=>readFile(resolve(assets,name),'utf8')))).join('\n');
 const minify=async css=>(await transform(css,{loader:'css',minify:true,target:['chrome110','safari16']})).code;
 const shared=await readStyles(['brand.css','style.css','premium.css','site-refresh.css','layout-components.css',...(includeChat?['support-chat.css']:[])]);
 const guides=await readStyles(['journal.css']);
 const plans=await readStyles(['package-visuals.css']);
 return {shared:await minify(shared),plans:await minify(plans),guides:await minify(guides)};
}

export function applyCssBundles(html,boot){
 const plans=html.includes('href="/assets/package-visuals.css"');
 const guides=html.includes('href="/assets/journal.css"');
 html=html.replace('<script src="/assets/boot.js"></script>',`<script>${boot}</script>`)
  .replace(/<link rel="stylesheet" href="\/assets\/(?:brand|style|journal|premium|site-refresh|layout-components|support-chat)\.css">/g,'');
 if(plans)html=html.replace(/<link rel="stylesheet" href="\/assets\/(?:brand|package-visuals)\.css">/g,'');
 // Package selectors do not target the identity. Brand rules now lead the shared
 // cascade, preserving their position before the general layout overrides.
 // The shared bundle has the same URL on plan and non-plan pages for cache reuse.
 return html.replace('</head>',`${plans?'<link rel="stylesheet" href="/assets/site-plans.css">':''}${guides?'<link rel="stylesheet" href="/assets/site-guides.css">':''}<link rel="stylesheet" href="/assets/site.css"></head>`);
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
 {file:'assets/audit-implementation/illustrative-url-map.csv',dynamic:[]},
 ...['motion-1280.mp4','still-1536.webp','still-960.webp','still-640.webp'].map(name=>({file:`assets/editions/buffalo-dusk/${name}`,dynamic:['buffalo-dusk','editions/']})),
 {file:'assets/package-visuals/feature-guides.json',dynamic:['feature-guides']},
 {file:'assets/package-visuals/manifest.json',dynamic:['package-visuals/manifest']},
 ...['brand.css','boot.js','journey-counts.js','fonts.css','journal.css','package-visuals.css','support-chat.css','style.css','premium.css','site-refresh.css','layout-components.css','site-plans.css','waterfront.css','film.js','premium.js','study-controls.js'].map(name=>({file:`assets/${name}`,dynamic:[]}))
];
export async function pruneObsoleteBuildAssets(output){
 const outputRoot=resolve(output),files=[];
 async function walk(directory){for(const entry of await readdir(directory,{withFileTypes:true})){
  const file=resolve(directory,entry.name);
  if(entry.isDirectory())await walk(file);else if(entry.isFile())files.push(file);
 }}
 await walk(outputRoot);
 // These dated exports have been replaced by current cards/bundles. Only prune
 // their emitted copies, and still require no reference in any emitted document.
 const retiredPatterns=/^assets\/(?:editorial\/[^/]+\.webp|fonts\/font-[12]\.woff2|guides\/[^/]+(?:-card-240\.webp|-(?:thumb|social)\.png)|audit-implementation\/studio-(?:desktop|phone)\.webp|waterfront\/(?:hero-mobile(?:-450)?|concrete-detail(?:-180|-360)?|water-detail(?:-180|-360)?|grain-model|film-poster-portrait)\.webp)$/;
 const candidates=[...obsoleteBuildAssets,...files.map(file=>relative(outputRoot,file).split(sep).join('/')).filter(file=>retiredPatterns.test(file)).map(file=>({file,dynamic:[]}))];
 const documents=await Promise.all(files.filter(file=>!['media-sizes.json','responsive-images.json'].includes(basename(file))&&['.html','.css','.js','.mjs','.json','.svg','.xml','.txt'].includes(extname(file).toLowerCase())).map(async file=>({file,text:(await readFile(file,'utf8')).replace(/\\\//g,'/').replace(/\\u([\da-f]{4})|\\x([\da-f]{2})/gi,(_match,unicode,hex)=>String.fromCharCode(parseInt(unicode||hex,16)))})));
 const removed=[],retained=[];
 for(const candidate of candidates){
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

// Complete plan posters are preserved in source as a dated design archive.
// Current sales pages use live HTML scope. Do not publish stale, unlinked offers.
export async function pruneRetiredPlanArtwork(output){
 const root=resolve(output),folder=resolve(root,'assets/package-visuals');
 if(!folder.startsWith(resolve(root,'assets')+sep))throw Error('Invalid retired artwork path');
 const outside=[],archived=[];
 async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){
  const file=resolve(dir,entry.name);
  if(entry.isDirectory())await walk(file);
  else if(file.startsWith(folder+sep))archived.push(file);
  else if(['.html','.css','.js','.mjs','.json','.svg','.xml','.txt'].includes(extname(file)))outside.push(file);
 }}
 await walk(root);
 for(const file of outside)if((await readFile(file,'utf8')).includes('/assets/package-visuals/'))throw Error('Retired plan artwork still referenced by '+relative(root,file));
 const removed=[];
 for(const file of archived){const bytes=(await stat(file)).size;await rm(file);removed.push({file:relative(root,file).split(sep).join('/'),bytes});}
 return removed;
}

export async function buildSite(){
const config=await readJSON('config/site.json');
const captures=await readJSON('src/portfolio-captures.json');
for(const [file,sha] of Object.entries(captures.sourceHashes))if(createHash('sha256').update(await readFile(resolve(root,file))).digest('hex')!==sha)console.warn('Portfolio homepage screenshot may be stale: '+file+' changed since '+captures.capturedAt+'.');
const chatCsp=supportChatCsp(config);
const offers=await readJSON('config/offers.json');
const map=await readJSON('authority/v5/site-map.json');
const tokens=await readJSON('authority/v5/design-tokens.json');
const geography=await readJSON('authority/v5/geography.json');
Object.assign(config,await civicAssetState(root,config));
assertSiteOrigin(config);
const pages=renderPages({config,offers,map,tokens,geography});
assertPageDates(pages,await readJSON('config/page-dates.json'));
const output=resolve(root,'dist');
if(output!==resolve(root,'dist')) throw new Error('Invalid output');
await mkdir(output,{recursive:true});
for(const name of await readdir(output)){const target=resolve(output,name);if(!target.startsWith(output+'\\')&&!target.startsWith(output+'/'))throw Error('Invalid build child');await rm(target,{recursive:true,force:true});}
await cp(resolve(root,'src/assets'),resolve(output,'assets'),{recursive:true});
const workbenchStateVersion=createHash('sha256').update(await readFile(resolve(output,'assets/lead-workbench-state.js'))).digest('hex').slice(0,12);
const workbenchScript=resolve(output,'assets/lead-workbench.js');
await writeFile(workbenchScript,(await readFile(workbenchScript,'utf8')).replace(/lead-workbench-state\.js\?v=[^'"]+/,`lead-workbench-state.js?v=${workbenchStateVersion}`));
// Retired unaffiliated siteaudit verification file is retained in source history only.
await cp(resolve(root,'src/assets/brand/favicon.ico'),resolve(output,'favicon.ico'));
const browserBundles=await buildBrowserBundles(root,config);
await writeFile(resolve(output,'assets/client.js'),browserBundles.client);
await writeFile(resolve(output,'assets/calculator.js'),browserBundles.calculator);
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
await writeFile(resolve(output,'assets/site-guides.css'),css.guides);
for(const page of pages)page.html=applyCssBundles(page.html,boot);
const prices=priceList(offers);
await writeFile(resolve(output,'assets/prices.json'),JSON.stringify(prices));
await writeBuyerPacks(output,offers);
await writeOwnedProof(root,output,offers);
const documentVersions=new Map();
for(const name of await readdir(resolve(output,'assets/buyer-packs'))){
 if(!name.endsWith('.html'))continue;
 const path='/assets/buyer-packs/'+name,file=resolve(output,'.'+path);
 await writeFile(file,await versionPublicDocumentLinks(await readFile(file,'utf8'),output,path,documentVersions));
}
const assetVersions=new Map();
for(const page of pages)for(const match of page.html.matchAll(/(?:src|href)="(\/assets\/[^"?]+\.(?:css|js))"/g))if(!assetVersions.has(match[1]))assetVersions.set(match[1],createHash('sha256').update(await readFile(resolve(output,'.'+match[1]))).digest('hex').slice(0,12));
for(const page of pages){const file=resolve(output,`.${page.path}index.html`);await mkdir(dirname(file),{recursive:true});const html=page.html.replace(/((?:src|href)=")(\/assets\/[^"?]+\.(?:css|js))"/g,(_match,prefix,asset)=>`${prefix}${asset}?v=${assetVersions.get(asset)}"`);await writeFile(file,await versionPublicDocumentLinks(html,output,page.path,documentVersions));}
const crawl=crawlFiles(config,pages);
await writeFile(resolve(output,'sitemap.xml'),crawl.sitemap);
await writeFile(resolve(output,'robots.txt'),crawl.robots);
await writeFile(resolve(output,'llms.txt'),crawl.llms);
await mkdir(resolve(output,'.well-known'),{recursive:true});
await writeFile(resolve(output,'.well-known/security.txt'),'Contact: mailto:support@wonderandmethod.com\nExpires: 2027-04-17T00:00:00Z\nPreferred-Languages: en\nCanonical: https://wonderandmethod.com/.well-known/security.txt\n');
await cp(resolve(output,'404/index.html'),resolve(output,'404.html'));
// Static CSS hints only; no private, API, error or payment response is hinted.
const earlyHints=pages.filter(page=>!privateRoute(page.path)&&!['/404/','/payments/'].includes(page.path)).map(page=>{const styles=[...page.html.matchAll(/<link rel="stylesheet" href="(\/assets\/[^"?]+\.css)"/g)].map(([,asset])=>`<${asset}?v=${assetVersions.get(asset)}>; rel=preload; as=style`);return styles.length?`${page.path}\n  Link: ${styles.join(', ')}\n`:'';}).join('\n');
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

/assets/buyer-packs/*
  ! Cache-Control
  Cache-Control: no-cache

/assets/*.json
  ! Cache-Control
  Cache-Control: no-cache

/assets/*.csv
  ! Cache-Control
  Cache-Control: no-cache

/assets/*.txt
  ! Cache-Control
  Cache-Control: no-cache

${earlyHints}`);
const inventory=[];
const {sourceSha256}=await releaseFingerprint(root);
let commit=null,dirty=true;try{commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();dirty=Boolean(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim());}catch{}
await writeFile(resolve(output,'version.json'),JSON.stringify({site:'wonder-and-method',sourceSha256,commit,dirty,routes:pages.length},null,2)+'\n');
// Scan all emitted documents, including generated buyer packs, before pruning.
const assetPruning=await pruneObsoleteBuildAssets(output);
const retiredPlanArtwork=await pruneRetiredPlanArtwork(output);
// Inventories describe the finished artifact; they must not retain their own
// otherwise unused variants or advertise deleted videos.
const mediaSizes={};
for(const file of await readdir(resolve(output,'assets'),{recursive:true}))if(file.endsWith('.mp4'))mediaSizes['/assets/'+file.replaceAll('\\','/')]=(await stat(resolve(output,'assets',file))).size;
await writeFile(resolve(output,'assets/media-sizes.json'),JSON.stringify(mediaSizes));
const responsiveIndex=JSON.parse(await readFile(resolve(output,'assets/responsive-images.json'),'utf8'));
const exists=async path=>stat(resolve(output,'.'+path)).then(item=>item.isFile()).catch(()=>false);
for(const [path,entry] of Object.entries(responsiveIndex)){
 if(!await exists(path)){delete responsiveIndex[path];continue;}
 entry.variants=(await Promise.all(entry.variants.map(async variant=>await exists(variant.path)?variant:null))).filter(Boolean);
}
await writeFile(resolve(output,'assets/responsive-images.json'),JSON.stringify(responsiveIndex,null,2)+'\n');
// Validate the finished, pruned artifact, including social cards and srcsets.
await verifyLocalReferences(output,pages.map(page=>'.'+page.path+'index.html'));
for(const name of await readdir(resolve(root,'authority/v5'))){const bytes=await readFile(resolve(root,'authority/v5',name)); inventory.push({file:name,sha256:createHash('sha256').update(bytes).digest('hex')});}
await mkdir(resolve(root,'evidence'),{recursive:true});
await writeFile(resolve(root,'evidence/authority-hashes.json'),JSON.stringify(inventory,null,2));
await writeFile(resolve(root,'evidence/build.json'),JSON.stringify({builtAt:new Date().toISOString(),mode:config.mode,routes:pages.map(p=>p.path),pageDates:Object.fromEntries(pages.filter(p=>p.modifiedAt).map(p=>[p.path,p.modifiedAt])),prices,source:'config/offers.json',gated:['/services/website-care/',...map.pages.filter(p=>p.stage==='launch_if_evidence_ready').map(p=>p.url)].filter(path=>!pages.some(p=>p.path===path)),guideReason:config.guideApprovals?.length?'Dated editorial review and owner publication instruction recorded in config/site.json':'Dated editorial evidence review required before publication',careReason:config.careReady?'Actual coverage and review recorded':'Actual staffed coverage, recipient and escalation must be agreed before enrollment'},null,2));
console.log(`Built ${pages.length} HTML routes (${config.mode}); source plan and operating records excluded from dist.`);
console.log(`Removed ${assetPruning.removed.length} unreferenced build assets (${assetPruning.bytesRemoved} bytes); retained ${assetPruning.retained.length} referenced candidates.`);
return {routes:pages.length,assetPruning,retiredPlanArtwork,cssBytes:{shared:Buffer.byteLength(css.shared),plans:Buffer.byteLength(css.plans)}};
}

if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename))await buildSite();
