import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {routeIndexEligible} from '../src/index-policy.mjs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {resolve,relative,dirname} from 'node:path';
import {productionOperator} from '../deployment/production-operator.mjs';
import {verifyWorkerVersion} from '../src/release-verification.mjs';
const root=resolve(import.meta.dirname,'..');
const expectedWorkerVersion=process.argv[2];
const runtime=await productionOperator(['status']);
const workerVersion=verifyWorkerVersion(expectedWorkerVersion,runtime.runtimeVersion);
const origin='https://wonderandmethod.com';
const build=JSON.parse(await readFile(resolve(root,'evidence/build.json'),'utf8'));
const pages=[],assets=[],privateRoutes=[];
for(const route of build.routes){
 const response=await fetch(origin+route),html=await response.text();
 assert.equal(response.status,route==='/404/'?404:200,route);
 const eligible=routeIndexEligible(route);
 assert.equal(/noindex/.test(response.headers.get('x-robots-tag')||''),!eligible,route);
 assert.equal(/<meta name="robots" content="[^"]*noindex/.test(html),!eligible,route);
 // Error pages deliberately have no canonical; all real pages retain theirs.
 if(route==='/404/')assert.ok(!html.includes('rel="canonical"'),route);
 else assert.ok(html.includes(`rel="canonical" href="${origin}${route}"`),route);
 assert.match(response.headers.get('content-security-policy')||'',/form-action 'self'/);
 assert.ok(!html.includes('static.cloudflareinsights.com/beacon'),'No unexpected analytics injection');
 assert.ok(!/Public critique preview|Editorial draft — approval pending|This is a read-only preview/.test(html));
 const expected=await readFile(resolve(root,'dist','.'+route,'index.html'),'utf8');
 assert.equal(html,expected,`Deployed HTML matches build: ${route}`);
 const styles=[...expected.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match=>`<${match[1]}>; rel=preload; as=style`);
 assert.equal(response.headers.get('Link'),['/404/','/payments/'].includes(route)?null:styles.join(', '),`Deployed CSS hints match page: ${route}`);
 pages.push({route,status:response.status,indexEligible:eligible,canonical:route!=='/404/',htmlMatches:true});
}
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);if(entry.isDirectory())await walk(path);else assets.push(path);}}
await walk(resolve(root,'dist/assets'));
for(let i=0;i<assets.length;i+=6)await Promise.all(assets.slice(i,i+6).map(async path=>{
 const url='/'+relative(resolve(root,'dist'),path).replaceAll('\\','/');
 const response=await fetch(origin+url);assert.equal(response.status,200,url);
 assert.equal(/noindex/.test(response.headers.get('x-robots-tag')||''),!routeIndexEligible(url),url);
 const revalidates=/\.(?:html|txt|csv|json)$/i.test(url)||url.startsWith('/assets/buyer-packs/');
 assert.equal(response.headers.get('cache-control'),revalidates?'no-cache':'public, max-age=3600, must-revalidate',url);
 const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(await readFile(path)),url);
}));
for(const route of ['/review/','/authority/v5/offers.json','/operations/weekly-board.json','/config/site.json','/.runtime/credentials/cloudflare-production.dpapi','/missing-release-check/']){
 const response=await fetch(origin+route);assert.equal(response.status,404,route);assert.match(response.headers.get('x-robots-tag')||'',/noindex/);privateRoutes.push({route,status:response.status});
}
const unauthorized=await fetch(origin+'/api/operator/inquiries');assert.equal(unauthorized.status,401);assert.match(unauthorized.headers.get('x-robots-tag')||'',/noindex/);
const rejected=await fetch(origin+'/api/inquiries',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example'},body:'{}'});assert.equal(rejected.status,403);assert.match(rejected.headers.get('x-robots-tag')||'',/noindex/);
const www=await fetch('https://www.wonderandmethod.com/guides/',{redirect:'manual'});assert.ok([301,308].includes(www.status),'Canonical host redirect is permanent');assert.equal(www.headers.get('location'),origin+'/guides/');
const robots=await(await fetch(origin+'/robots.txt')).text(),sitemap=await(await fetch(origin+'/sitemap.xml')).text();assert.match(robots,/Allow: \//);assert.equal(sitemap,await readFile(resolve(root,'dist/sitemap.xml'),'utf8'));
assert.equal(robots,await readFile(resolve(root,'dist/robots.txt'),'utf8'));
const versionResponse=await fetch(origin+'/version.json');assert.equal(versionResponse.status,404);assert.match(versionResponse.headers.get('x-robots-tag')||'',/noindex/);
assert.deepEqual(runtime.release,JSON.parse(await readFile(resolve(root,'dist/version.json'),'utf8')),'Authenticated release metadata matches the local artifact');
const result={checkedAt:new Date().toISOString(),origin,worker:'wonder-method-production',version:workerVersion.observedWorkerVersion,workerVersion,pages,assets:{count:assets.length,sha256:'all match local dist'},privateRoutes,operatorUnauthenticated:401,crossOriginSubmission:403,www:www.status,search:{eligibleRoutes:pages.filter(p=>p.indexEligible).length,privatePagesNoindex:true,sitemapMatches:true,submissionPerformed:false},limits:'Noindex is a crawler directive, not authentication or a guarantee about third-party search systems. The live inquiry path is verified separately in finished-site-inquiry.json.'};
const output=resolve(root,process.argv[3]||'evidence/finished-site-live-http.json');
await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(result,null,2)+'\n');
console.log(`Verified ${pages.length} deployed HTML routes, ${assets.length} asset hashes, private exclusions, canonical redirect and route-specific indexing.`);
