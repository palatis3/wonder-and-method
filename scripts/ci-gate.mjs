import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {readFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {checkEditorial} from './check-editorial.mjs';
import {ciContext,assertContext,digest,readJson,saveJson,verifyBrowserRecord} from './ci-contract.mjs';

const root=resolve(import.meta.dirname,'..'),name=process.argv[2];
assert.ok(['seo-editorial','reading-accessibility'].includes(name),'Choose a supported CI gate');
const core=await readJson(resolve(root,'output/ci/core/manifest.json'));
assert.equal(core.kind,'website-technical-core');assertContext(await ciContext(root),core.context);
const folder=resolve(root,'output/ci/gates',name),file=resolve(folder,'report.json');
await rm(resolve(folder,'receipt.json'),{force:true});
if(name==='seo-editorial'){
 const result=await checkEditorial(root);
 await saveJson(file,{schemaVersion:1,name,checkedAt:new Date().toISOString(),...result});
}else{
 const cli=resolve(root,'node_modules/@playwright/test/cli.js'),reporter=resolve(root,'scripts/ci-browser-reporter.mjs');
 const run=(extra,env)=>{const result=spawnSync(process.execPath,[cli,'test','--config=playwright.reading.config.mjs','--workers=1','--forbid-only','--retries=0','--repeat-each=1',...extra],{cwd:root,stdio:'inherit',windowsHide:true,env:{...process.env,...env}});assert.equal(result.status,0,'Reading-accessibility check failed; inspect retained results');};
 const inventoryFile=resolve(folder,'inventory.json');await rm(inventoryFile,{force:true});await rm(file,{force:true});
 run(['--list',`--reporter=${reporter}`],{WM_CI_REPORT:inventoryFile,WM_CI_DISCOVERY:'1'});
 const discovered=await readJson(inventoryFile);assert.equal(discovered.status,'passed');assert.deepEqual(discovered.errors,[]);
 run([`--add-reporter=${reporter}`],{WM_CI_REPORT:file,WM_CI_DISCOVERY:'0'});
 const result=await readJson(file);const counts=verifyBrowserRecord(result,discovered.inventory,[]);assert.equal(counts.skipped,0);
}
assertContext(await ciContext(root),core.context);
await saveJson(resolve(folder,'receipt.json'),{schemaVersion:1,kind:'ci-gate',name,status:'passed',context:core.context,reportSha256:digest(await readFile(file)),checkedAt:new Date().toISOString()});
console.log(`${name}: complete, with source and artifact bindings.`);
