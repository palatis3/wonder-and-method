import {spawnSync,execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile,rename,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {releaseFingerprint} from '../src/release.mjs';
import {technicalChecks} from '../src/release-verification.mjs';
import {ciContext,assertContext,saveJson} from './ci-contract.mjs';
const root=resolve(import.meta.dirname,'..');
const mode=process.argv[2]||'all';
assert.ok(['all','core'].includes(mode),'Use technical:check or technical:check core.');
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
const steps=[
 {name:'build',args:['scripts/build.mjs']},
 {name:'tests',args:['--test','tests/*.test.mjs']},
 {name:'site-quality',args:['scripts/check-site-quality.mjs']},
 {name:'static-verification',args:['scripts/verify.mjs']},
 {name:'seo-editorial',args:['scripts/check-editorial.mjs']},
 {name:'content-preservation',args:['scripts/site-contract.mjs']},
 {name:'browser-journeys',args:['node_modules/@playwright/test/cli.js','test']},
 {name:'reading-accessibility',args:['node_modules/@playwright/test/cli.js','test','--config=playwright.reading.config.mjs']},
 {name:'worker-dry-run',args:['node_modules/wrangler/bin/wrangler.js','deploy','--config','wrangler.production.jsonc','--dry-run','--outdir','dry-run-technical'],cwd:resolve(root,'deployment')}
];
assert.deepEqual(steps.map(step=>step.name),technicalChecks,'Every required gate must have an executable step.');
let verifiedInput,verifiedCiContext;
const selected=mode==='core'?steps.filter(step=>!['browser-journeys','seo-editorial','reading-accessibility'].includes(step.name)):steps;
for(const step of selected){
 const result=spawnSync(process.execPath,step.args,{cwd:step.cwd||root,stdio:'inherit',env:process.env});
 if(result.status!==0)process.exit(result.status||1);
 if(step.name==='build'){verifiedInput={...await releaseFingerprint(root),commit:git('rev-parse','HEAD'),dirty:!!git('status','--porcelain')};verifiedCiContext=await ciContext(root);}
}
const finalInput={...await releaseFingerprint(root),commit:git('rev-parse','HEAD'),dirty:!!git('status','--porcelain')};
assert.deepEqual(finalInput,verifiedInput,'Source or built artifact changed during technical verification.');
assertContext(await ciContext(root),verifiedCiContext);
if(mode==='core'){
 await saveJson(resolve(root,'output/ci/core/manifest.json'),{schemaVersion:1,kind:'website-technical-core',checkedAt:new Date().toISOString(),context:await ciContext(root),checks:selected.map(step=>step.name)});
 console.log('Core checks passed. Browser, editorial and reading-accessibility gates are still required; this partial evidence cannot authorize a release.');
 process.exit(0);
}
const manifest={schemaVersion:1,kind:'website-technical',checkedAt:new Date().toISOString(),...finalInput,checks:technicalChecks};
await mkdir(resolve(root,'evidence'),{recursive:true});
await writeFile(manifestPath+'.tmp',JSON.stringify(manifest,null,2)+'\n');
await rename(manifestPath+'.tmp',manifestPath);
console.log('Website technical checks passed; source and tested-artifact manifest saved. Business readiness is a separate gate.');
