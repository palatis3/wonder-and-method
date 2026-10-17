import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {verifyLocalReferences} from './verify-local-references.mjs';
const root=resolve(import.meta.dirname,'..'),output=resolve(root,'.runtime/editorial-review');
const manifest=JSON.parse(await readFile(resolve(output,'review-manifest.json'),'utf8'));
const routes=manifest.routes;
assert.equal(routes.filter(path=>path.startsWith('/concepts/')).length,5);
for(const route of routes){const html=await readFile(resolve(output,'.'+route+'index.html'),'utf8');assert.match(html,/name="robots" content="noindex,nofollow"/);assert.equal((html.match(/<h1[ >]/g)||[]).length,1,route);}
const result=await verifyLocalReferences(output,routes.map(path=>'.'+path+'index.html'));
const build=JSON.parse(await readFile(resolve(root,'evidence/build.json'),'utf8'));
assert.ok(!build.routes.some(route=>route.startsWith('/concepts/')));
await writeFile(resolve(root,'evidence/showcase-static.json'),JSON.stringify({checkedAt:new Date().toISOString(),...result,routes,privateOnly:true,publicConceptRoutes:0,limits:'Static local references and indexing directives only; separate browser evidence covers interaction and responsive checks.'},null,2));
console.log(`Private preview: ${result.documents} routes, ${result.references} local references passed. No concepts in public build.`);
