import {spawnSync,execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile,rename,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {releaseFingerprint} from '../src/release.mjs';
import {technicalChecks} from '../src/release-verification.mjs';
const root=resolve(import.meta.dirname,'..');
const manifestPath=resolve(root,'evidence/technical-check.json');
await rm(manifestPath,{force:true});
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
const read=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
const site=await read('config/site.json'),deployment=await read('deployment/wrangler.production.jsonc');
assert.equal(site.origin,`https://${site.productionDomain}`,'Canonical production origin');
assert.equal(site.searchIndexing===true,deployment.vars.SEARCH_INDEXING==='true','Search policy agrees');
assert.equal(site.formMode,'live','Public build uses the live intake');
assert.equal(site.privacyReviewed,true,'Published privacy review');
// These are website checks. Business enrollment and provider recovery gates
// remain separately enforced by release:check; this command cannot approve them.
const steps=[['scripts/build.mjs'],['--test','tests/*.test.mjs'],['scripts/verify.mjs'],['node_modules/@playwright/test/cli.js','test'],['node_modules/wrangler/bin/wrangler.js','deploy','--config','wrangler.production.jsonc','--dry-run','--outdir','dry-run-technical']];
let verifiedInput;
for(const [i,args] of steps.entries()){
 const result=spawnSync(process.execPath,args,{cwd:i===4?resolve(root,'deployment'):root,stdio:'inherit',env:process.env});
 if(result.status!==0)process.exit(result.status||1);
 if(i===0)verifiedInput={...await releaseFingerprint(root),commit:git('rev-parse','HEAD'),dirty:!!git('status','--porcelain')};
}
const finalInput={...await releaseFingerprint(root),commit:git('rev-parse','HEAD'),dirty:!!git('status','--porcelain')};
assert.deepEqual(finalInput,verifiedInput,'Source or built artifact changed during technical verification.');
const manifest={schemaVersion:1,kind:'website-technical',checkedAt:new Date().toISOString(),...finalInput,checks:technicalChecks};
await mkdir(resolve(root,'evidence'),{recursive:true});
await writeFile(manifestPath+'.tmp',JSON.stringify(manifest,null,2)+'\n');
await rename(manifestPath+'.tmp',manifestPath);
console.log('Website technical checks passed; source and tested-artifact manifest saved. Business readiness is a separate gate.');
