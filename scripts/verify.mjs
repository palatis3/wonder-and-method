import {readFile,readdir,stat,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {robotsDirective,crawlFiles} from '../src/seo.mjs';
import {verifyLocalReferences} from './verify-local-references.mjs';
import {initialRouteAssets,deferredMotionImages} from './initial-route-assets.mjs';
import {checkSeo} from './check-seo.mjs';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..');
const json=async p=>JSON.parse(await readFile(join(root,p),'utf8'));
const build=await json('evidence/build.json'),map=await json('authority/v5/site-map.json'),tokens=await json('authority/v5/design-tokens.json');
const config=await json('config/site.json');
const identity=await json('config/identity.json');
await checkSeo(root);
assert.equal(build.mode,config.mode,'Build mode matches current configuration');
const crawl=crawlFiles(config,build.routes.map(path=>({path,modifiedAt:build.pageDates?.[path]})));
assert.equal(await readFile(join(root,'dist/robots.txt'),'utf8'),crawl.robots);
assert.equal(await readFile(join(root,'dist/sitemap.xml'),'utf8'),crawl.sitemap);
const routes=new Set(build.routes),results=[];
const localReferences=await verifyLocalReferences(join(root,'dist'),build.routes.map(route=>'.'+route+'index.html'));
for(const p of map.pages.filter(p=>['launch','launch_utility'].includes(p.stage)))assert.ok(routes.has(p.url),p.url);
for(const route of routes){const html=await readFile(join(root,'dist',route,'index.html'),'utf8');assert.equal((html.match(/<h1[ >]/g)||[]).length,1,route);assert.ok(html.includes('name="description"'));assert.equal(html.includes('rel="canonical"'),route!='/404/');assert.ok(html.includes(`name="robots" content="${robotsDirective(config,route)}"`));assert.equal(html.includes(`rel="canonical" href="${config.origin}${route}"`),route!='/404/');assert.equal(html.includes(`property="og:url" content="${config.origin}${route}"`),route!='/404/');for(const match of html.matchAll(/href="([^"?#]+)[^\"]*"/g)){const href=match[1];if(!href.startsWith('/'))continue;if(href.startsWith('/assets/')||['/favicon.ico','/sitemap.xml','/robots.txt'].includes(href)){try{await stat(join(root,'dist',href));}catch{assert.ok(!/\.[^/]+$/.test(href));await stat(join(root,'dist',href+'.html'));}continue;}assert.ok(routes.has(href),`${route} links to absent ${href}`);}for(const gated of build.gated)assert.ok(!html.includes(`href="${gated}"`),gated);for(const match of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs))JSON.parse(match[1]);results.push({route,htmlBytes:Buffer.byteLength(html),links:'pass',metadata:'pass'});}
const luminance=h=>{const a=h.match(/[0-9a-f]{2}/gi).map(x=>parseInt(x,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722;};
const contrast=tokens.contrast_pairs.filter(p=>p.palette==='wonder_method_ink').map(p=>{const a=luminance(p.foreground),b=luminance(p.background),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert.ok(ratio>=4.5,p.id);return {pair:p.id,ratio};});
const selectedContrast=identity.contrastPairs.map(p=>{const a=luminance(p.foreground),b=luminance(p.background),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert.ok(ratio>=4.5,p.name);return {pair:p.name,ratio};});
const inventory=[];async function walk(dir){for(const name of await readdir(dir)){const path=join(dir,name),info=await stat(path);if(info.isDirectory())await walk(path);else inventory.push({path:path.slice(join(root,'dist').length),bytes:info.size});}}await walk(join(root,'dist'));
assert.ok(!inventory.some(x=>/operations|authority|sqlite|\.env/.test(x.path)));
// Homepage and Work films have no eager source; script selects the appropriate
// format with preload=none and plays only near the section or on request.
const homeHtml=await readFile(join(root,'dist/index.html'),'utf8');
assert.ok(/<video\b[^>]*preload="none"/.test(homeHtml),'Homepage film must be deferred');
assert.ok(!/<(?:video|source)\b[^>]*\ssrc=/.test(homeHtml),'Homepage must not have an eager video source');
for(const route of routes){
 const html=await readFile(join(root,'dist',route,'index.html'),'utf8');
 if(html.includes('id="waterfront-film"')){
  assert.ok(/src="\/assets\/film\.js(?:\?v=[a-f0-9]+)?"/.test(html),`${route} film requires its playback controller`);
  assert.ok(html.includes('id="waterfront-film-play"'),`${route} film requires a manual playback control`);
  assert.ok(!/<(?:video|source)\b[^>]*\ssrc=/.test(html),`${route} film source must be assigned only on approach or request`);
 }
}
const deferredFilmBytes=inventory.filter(x=>/\.mp4$/.test(x.path)).reduce((sum,x)=>sum+x.bytes,0);
// Parse actual resource attributes. Data-only previews wait for playback, and
// a native-lazy picture includes its source candidates in that same deferral.
const homeAssets=initialRouteAssets(homeHtml);
// Conservatively count every responsive hero candidate and referenced dependency.
for(const asset of homeAssets){
 if(!/\.(?:css|js|mjs)$/.test(asset))continue;
 const content=await readFile(join(root,'dist',asset),'utf8');
 for(const match of content.matchAll(/['"](\/assets\/[^'"?]+)(?:\?[^'"]*)?['"]/g))if(!/\.mp4$/.test(match[1]))homeAssets.add(match[1]);
 for(const match of content.matchAll(/from\s*['"]\.\/([^'"]+)['"]/g))homeAssets.add(asset.slice(0,asset.lastIndexOf('/')+1)+match[1]);
}
const homeInventory=inventory.filter(x=>{const p=x.path.replaceAll('\\','/');return !/\.mp4$/.test(p)&&homeAssets.has(p);});
const payload=homeInventory.reduce((s,x)=>s+x.bytes,0)+results[0].htmlBytes;
const motionImages=deferredMotionImages(homeHtml);
const deferredMotionImageBytes=inventory.filter(x=>motionImages.has(x.path.replaceAll('\\','/'))&&!homeAssets.has(x.path.replaceAll('\\','/'))).reduce((sum,x)=>sum+x.bytes,0);
const totalLocalAssetBytes=inventory.filter(x=>/assets/.test(x.path)).reduce((s,x)=>s+x.bytes,0);
assert.ok(payload<1024000,'Initial route conservative payload');
const output={checkedAt:new Date().toISOString(),routes:results,localReferences,contrast,selectedContrast,conservativeInitialBytes:payload,totalLocalAssetBytes,deferredFilmBytes,deferredMotionImageBytes,staticBudgets:'pass',privateDataExcluded:'pass',inventory,limits:'Conservative static homepage bytes include eager resource attributes, all responsive hero candidates and referenced local code/fonts. Native-lazy images and their picture sources are excluded from this static base. Data-only motion images are reported separately: ordinary desktop autoplay may fetch them immediately, while phone first visits and reduced motion wait. Article-only assets remain in totalLocalAssetBytes. Films are separate. This static inventory does not establish total desktop-autoplay transfer, field performance, screen-reader behavior or live provider delivery.'};
await writeFile(join(root,'evidence/static-verification.json'),JSON.stringify(output,null,2));console.log(`${results.length} routes checked; internal links, metadata, original and selected identity contrast pairs, private data exclusion and payload passed (${payload} bytes conservative initial payload).`);
