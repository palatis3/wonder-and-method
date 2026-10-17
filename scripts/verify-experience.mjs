import {readFile,readdir,stat,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {civicAssetState} from './build-civic-assets.mjs';
import {verifyLocalReferences} from './verify-local-references.mjs';
import {renderPages} from '../src/pages.mjs';
import {selectedEdition} from '../src/editions.mjs';
import {priceList,money} from '../src/shared.mjs';

const root=resolve(import.meta.dirname,'..'),site=resolve(root,'.runtime/experience-review');
const json=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
const [config,offers,map,tokens,geography]=await Promise.all(['config/site.json','config/offers.json','authority/v5/site-map.json','authority/v5/design-tokens.json','authority/v5/geography.json'].map(json));
Object.assign(config,await civicAssetState(root,config));
const preview={...config,mode:'staging',formMode:'synthetic',reviewOnly:false,searchIndexing:false};
const expected=renderPages({config:preview,offers,map,tokens,geography}),routes=expected.map(p=>p.path);
const observed=(await readdir(site,{recursive:true})).filter(p=>/(?:^|[\\/])index\.html$/.test(p)&&!p.replaceAll('\\','/').startsWith('assets/')).map(p=>'/'+p.replaceAll('\\','/').replace(/index\.html$/,''));
assert.deepEqual(observed.sort(),[...routes].sort(),'Preview has exactly the current rendered routes');
const references=await verifyLocalReferences(site,routes.map(p=>'.'+p+'index.html'));
for(const page of expected){
 const html=await readFile(resolve(site,'.'+page.path,'index.html'),'utf8');
 assert.equal(html,page.html,`Preview matches current source: ${page.path}`);
 assert.equal((html.match(/<h1[ >]/g)||[]).length,1,page.path);
 assert.match(html,/name="robots" content="noindex,nofollow,noarchive,noimageindex"/,page.path);
 assert.ok(html.includes(`rel="canonical" href="${config.origin}${page.path}"`),page.path);
}
assert.equal(await readFile(resolve(site,'robots.txt'),'utf8'),'User-agent: *\nDisallow: /\n');
assert.deepEqual(await json('.runtime/experience-review/assets/prices.json'),priceList(offers));
const pricing=await readFile(resolve(site,'pricing/index.html'),'utf8');
for(const id of ['launch_site','focused_site','signature_site'])assert.ok(pricing.includes(money(offers[id].public_price)),id);
const contact=await readFile(resolve(site,'contact/index.html'),'utf8');
assert.match(contact,/data-mode="synthetic"/);assert.match(contact,/Submit synthetic inquiry/);
const html=await readFile(resolve(site,'index.html'),'utf8'),art=selectedEdition(config);
assert.ok(html.includes(`data-edition="${art.id}"`));assert.ok(html.includes(`src="${art.still}"`),'Complete still remains available');
assert.doesNotMatch(html,/<(?:video|source)\b[^>]*\ssrc=/,'Video is deferred, never eagerly sourced');
for(const video of html.matchAll(/<video\b[^>]*>/g)){assert.match(video[0],/preload="none"/);assert.match(video[0],/\bmuted\b/);assert.match(video[0],/\bplaysinline\b/);}
const media=[];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
if(art.id==='civic-sculpture'){
 assert.match(html,/id="civic-motion"/);assert.match(html,/class="civic-toggle"/);assert.match(html,/class="civic-replay"/);assert.match(html,/src="\/assets\/civic-sculpture-preview\.js/);
 if(config.civicMotionReady){assert.ok(html.includes(`data-src="${art.motion}"`));if(art.mobileMotion)assert.ok(html.includes(`data-mobile-src="${art.mobileMotion}"`));}
 if(config.civicAmbientReady){assert.match(html,/id="civic-ambient"/);assert.ok(html.includes(`data-src="${art.ambientMotion}"`));if(art.mobileAmbientMotion)assert.ok(html.includes(`data-mobile-src="${art.mobileAmbientMotion}"`));}
 for(const source of config.civicAssetFiles){const asset='assets/'+source.slice('public/'.length),bytes=await readFile(resolve(site,asset));assert.ok(bytes.length>0,asset);assert.equal(hash(bytes),hash(await readFile(resolve(root,source))),asset);media.push({asset,bytes:bytes.length,sha256:hash(bytes)});}
 for(const extension of ['css','js'])assert.equal(hash(await readFile(resolve(site,`assets/civic-sculpture-preview.${extension}`))),hash(await readFile(resolve(root,`motion/civic-sculpture-preview.${extension}`))),'Current motion controller/styles');
}else{
 assert.ok(html.includes(`data-src="${art.motion}"`));assert.match(html,/class="motion-toggle"/);
 for(const asset of [art.still,art.motion])assert.ok((await stat(resolve(site,'.'+asset))).size>0,asset);
}
const sourceHashes={};for(const p of ['config/offers.json','src/premium-site.mjs','src/service-content.mjs','src/audit-content.mjs','src/assets/premium.css','src/editions.mjs','src/client.js','src/shared.mjs','scripts/build-experience.mjs','scripts/verify-experience.mjs','scripts/build-civic-assets.mjs'])sourceHashes[p]=hash(await readFile(resolve(root,p)));
const evidence={checkedAt:new Date().toISOString(),scope:'Current premium experience artifact; static parity, routes, references and motion assets',routeCount:routes.length,references,edition:art.id,pricingSource:'config/offers.json',commercialVersion:offers.version,noindex:true,inquiry:'synthetic preview; no inquiry or email sent',motion:{readiness:config.civicReadiness??null,deferredSource:true,stillAndControls:true,media},sourceHashes,limits:'Static verification does not prove browser playback, physical-device behavior, inbox delivery, or client results. Motion behavior has separate automated and browser checks.'};
const out=resolve(root,'evidence/experience-verification.json');await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(evidence,null,2)+'\n');
console.log(`Experience verified: ${routes.length} current routes, ${references.references} local references, configured prices, exact noindex, synthetic inquiry and ${media.length} verified ${art.id} media assets.`);
