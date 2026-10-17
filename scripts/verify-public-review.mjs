import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const origin=process.argv[2]||'http://127.0.0.1:4195';
const evidence=process.argv[3]||'evidence/public-review-http-local.json';
const build=JSON.parse(await readFile(new URL('../evidence/public-review-build.json',import.meta.url),'utf8'));
const checks=[];
for(const route of build.routes){
 const response=await fetch(origin+route);const html=await response.text();
 assert.equal(response.status,200,route);
 assert.match(response.headers.get('x-robots-tag')||'',/noindex/);
 assert.match(response.headers.get('content-security-policy')||'',/form-action 'none'/);
 assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive,noimageindex">/);
 assert.ok(html.includes(`rel="canonical" href="${build.origin}${route}"`));
 if(route==='/contact/')assert.ok([...html.matchAll(/<(?:input|textarea|select)\b[^>]*>/g)].every(m=>/\bdisabled\b/.test(m[0])));
 checks.push({route,status:response.status,noindex:true,formAction:'none'});
}
for(const route of ['/review/','/authority/v5/offers.json','/operations/weekly-board.json','/api/inquiries']){
 const response=await fetch(origin+route);assert.equal(response.status,404,route);checks.push({route,status:response.status});
}
const post=await fetch(origin+'/api/inquiries',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
assert.ok([404,405].includes(post.status),'POST must not be accepted');checks.push({route:'/api/inquiries',method:'POST',status:post.status});
const assets=build.inventory.filter(item=>item.file.startsWith('assets/'));
for(let i=0;i<assets.length;i+=8){await Promise.all(assets.slice(i,i+8).map(async item=>{
 const response=await fetch(origin+'/'+item.file);assert.equal(response.status,200,item.file);
 const bytes=Buffer.from(await response.arrayBuffer());assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256,item.file);
 assert.match(response.headers.get('x-robots-tag')||'',/noindex/);
}));}
const result={checkedAt:new Date().toISOString(),origin,checks,assets:{count:assets.length,sha256:'all match prepared build'},limits:'Noindex is a crawler directive, not authentication or a guarantee about third-party search systems. This is a public design preview with no inquiry handler.'};
await writeFile(new URL('../'+evidence,import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(`Verified ${build.routes.length} routes, ${assets.length} asset hashes, search headers, disabled inquiry boundary and private-route exclusions at ${origin}.`);
