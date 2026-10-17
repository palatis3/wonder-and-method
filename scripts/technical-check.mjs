import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..');
const read=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
const site=await read('config/site.json'),deployment=await read('deployment/wrangler.production.jsonc');
assert.equal(site.origin,`https://${site.productionDomain}`,'Canonical production origin');
assert.equal(site.searchIndexing===true,deployment.vars.SEARCH_INDEXING==='true','Search policy agrees');
assert.equal(site.formMode,'live','Public build uses the live intake');
assert.equal(site.privacyReviewed,true,'Published privacy review');
// These are website checks. Business enrollment and provider recovery gates
// remain separately enforced by release:check; this command cannot approve them.
const steps=[['scripts/build.mjs'],['--test','tests/*.test.mjs'],['scripts/verify.mjs'],['node_modules/wrangler/bin/wrangler.js','deploy','--config','wrangler.production.jsonc','--dry-run','--outdir','dry-run-technical']];
for(const [i,args] of steps.entries()){
 const result=spawnSync(process.execPath,args,{cwd:i===3?resolve(root,'deployment'):root,stdio:'inherit',env:process.env});
 if(result.status!==0)process.exit(result.status||1);
}
console.log('Website technical checks passed. Business readiness is a separate gate.');
