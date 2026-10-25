import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,rm,readdir,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {technicalChecks} from '../src/release-verification.mjs';
import {ciContext,assertContext,digest,jsonDigest,readJson,saveJson,assertSameInventory,partitionTests,verifyBrowserRecord,verifyShardSet,requirePrerequisites} from './ci-contract.mjs';

const root=resolve(import.meta.dirname,'..'),out=resolve(root,'output/ci');
const path=name=>resolve(out,name),reporter=resolve(root,'scripts/ci-browser-reporter.mjs');
const cli=resolve(root,'node_modules/@playwright/test/cli.js');
const testList=shard=>shard.tests.map(test=>{assert.ok(test.listEntry&&!/[\r\n]/.test(test.listEntry),'Missing exact Playwright selector');return test.listEntry;}).join('\n')+'\n';
const run=(args,env={})=>{const result=spawnSync(process.execPath,[cli,...args],{cwd:root,stdio:'inherit',env:{...process.env,...env},windowsHide:true});if(result.status!==0)throw Error(`Playwright failed (${result.status??result.signal}); inspect retained diagnostics.`);};
async function discover(name,args=[]){
 const file=path(name);await rm(file,{force:true});
 run(['test','--list','--forbid-only','--retries=0','--repeat-each=1',...args,`--reporter=${reporter}`],{WM_CI_DISCOVERY:'1',WM_CI_REPORT:file});
 const record=await readJson(file);assert.equal(record.mode,'list');assert.equal(record.status,'passed');assert.deepEqual(record.errors,[]);return record.inventory;
}
async function core(){
 const manifest=await readJson(path('core/manifest.json'));
 assert.equal(manifest.schemaVersion,1);assert.equal(manifest.kind,'website-technical-core');
 assert.deepEqual(manifest.checks,technicalChecks.filter(name=>!['browser-journeys','seo-editorial','reading-accessibility'].includes(name)));
 const current=await ciContext(root);assertContext(manifest.context,current);
 if(process.env.CI)assert.equal(current.dirty,false,'CI must use a clean checkout');
 return manifest;
}
async function approvedSkips(inventory){
 const policy=await readJson(resolve(root,'config/ci-browser-exclusions.json'));
 assert.equal(policy.schemaVersion,1);assert.equal(policy.status,'reviewed','Browser exclusions need independent review before CI activation');assert.ok(policy.reviewedBy&&Number.isFinite(Date.parse(policy.reviewedAt)),'Expected exclusions need recorded review');
 const ids=new Set(inventory.map(test=>test.identity));
 for(const item of policy.exclusions){
  assert.ok(ids.has(item.identity),`Stale browser exclusion: ${item.identity}`);
  assert.ok(item.reason,'Every intentional skip needs its existing reason');
  assert.ok(item.file.startsWith('tests/browser/')&&!item.file.includes('..'),'Invalid exclusion source');
  assert.equal(digest(await readFile(resolve(root,item.file))),policy.sourceFiles[item.file],`Review exclusions after changing ${item.file}`);
 }
 return policy.exclusions;
}
async function assertIndependentFiles(inventory){
 for(const file of new Set(inventory.map(test=>test.file))){
  const source=await readFile(resolve(root,file),'utf8');
  // This suite currently uses independent tests and beforeEach fixtures. Do not
  // silently split newly introduced shared/serial setup between machines.
  assert.ok(!/\.\s*(?:serial|beforeAll|afterAll)\s*\(|mode\s*:\s*['"]serial['"]/.test(source),`Shared or serial setup needs an explicit partition design: ${file}`);
 }
}
const stage=process.argv[2];
assert.ok(['plan','shard','aggregate','verify-build'].includes(stage),'Choose plan, shard, aggregate or verify-build');
const producer=await core();
if(stage==='verify-build'){
 console.log('Downloaded build, metadata, source, CI inputs and run attempt match the core producer.');
}else if(stage==='plan'){
 const inventory=await discover('inventory.json');await assertIndependentFiles(inventory);
 const skipPolicy=await approvedSkips(inventory);
 const hints=(await readJson(resolve(root,'config/ci-browser-timings.json'))).milliseconds;
 const effective={...hints};for(const item of skipPolicy)effective[item.identity]=1;
 const shards=partitionTests(inventory,effective,5);
 const plan={schemaVersion:1,context:producer.context,inventory,skipPolicy,shards};
 await saveJson(path('plan.json'),plan);
 for(const shard of shards){
  const list=path(`shard-${shard.index}.txt`);await writeFile(list,testList(shard));
  const selected=await discover(`selection-${shard.index}.json`,[`--test-list=${list}`]);assertSameInventory(selected,shard.tests);
 }
 console.log(JSON.stringify({tests:inventory.length,shards:shards.map(shard=>({index:shard.index,tests:shard.tests.length,estimatedMinutes:Math.round(shard.estimatedMs/600)/100})),timingsAreHints:true}));
}else if(stage==='shard'){
 const plan=await readJson(path('plan.json'));assertContext(plan.context,producer.context);
 const index=Number(process.argv[3]),shard=plan.shards.find(item=>item.index===index);assert.ok(shard,'Select a valid shard');
 const current=await discover(`current-inventory-${index}.json`);assertSameInventory(current,plan.inventory);await assertIndependentFiles(current);
 assert.deepEqual(await approvedSkips(current),plan.skipPolicy);
 const list=path(`shard-${index}.txt`);
 assert.equal(await readFile(list,'utf8'),testList(shard),'Partition list bytes changed');
 assertSameInventory(await discover(`resolved-shard-${index}.json`,[`--test-list=${list}`]),shard.tests);
 const folder=path(`shard-${index}`),recordFile=resolve(folder,'record.json');await mkdir(folder,{recursive:true});await rm(recordFile,{force:true});await rm(resolve(folder,'receipt.json'),{force:true});
 run(['test',`--test-list=${list}`,'--workers=1','--forbid-only','--retries=0','--repeat-each=1',`--output=${resolve(folder,'results')}`,`--reporter=line,blob,${reporter}`],
  {WM_CI_DISCOVERY:'0',WM_CI_REPORT:recordFile,PLAYWRIGHT_BLOB_OUTPUT_FILE:resolve(folder,`report-${index}.zip`)});
 const record=await readJson(recordFile);const counts=verifyBrowserRecord(record,shard.tests,plan.skipPolicy);
 assertContext(await ciContext(root),producer.context);
 await saveJson(resolve(folder,'receipt.json'),{schemaVersion:1,kind:'browser-shard',context:producer.context,index,total:5,planSha256:jsonDigest(plan),record,counts,blobSha256:digest(await readFile(resolve(folder,`report-${index}.zip`)))});
 console.log(JSON.stringify({shard:index,...counts}));
}else{
 // GitHub may treat skipped dependent checks as acceptable. This command runs
 // under if: always() and explicitly refuses every non-success prerequisite.
 const needs=JSON.parse(process.env.WM_CI_NEEDS||'null');
 requirePrerequisites(needs,['core','browser','seo-editorial','reading-accessibility']);
 const plan=await readJson(path('plan.json'));assertContext(plan.context,producer.context);
 const inventory=await discover('aggregate-inventory.json');assertSameInventory(inventory,plan.inventory);
 assert.deepEqual(await approvedSkips(inventory),plan.skipPolicy);
 const receipts=[];const blobDir=path('merged-blobs');await mkdir(blobDir,{recursive:true});
 const existingBlobs=await readdir(blobDir);assert.ok(existingBlobs.every(file=>/^report-[1-5]\.zip$/.test(file)),'Unexpected file in the merge directory');
 assert.deepEqual((await readdir(path('shards'))).sort(),[1,2,3,4,5].map(index=>`browser-shard-${index}-${producer.context.runAttempt}`),'Missing or extra shard artifact directories');
 for(let index=1;index<=5;index++){
  const folder=path(`shards/browser-shard-${index}-${producer.context.runAttempt}`),receipt=await readJson(resolve(folder,'receipt.json'));
  assert.equal(receipt.index,index);receipts.push(receipt);
  const blob=resolve(folder,`report-${index}.zip`);assert.equal(digest(await readFile(blob)),receipt.blobSha256,'Blob report changed in transit');
  await copyFile(blob,resolve(blobDir,`report-${index}.zip`));
 }
 verifyShardSet(plan,receipts);
 for(const name of ['seo-editorial','reading-accessibility']){
  const gate=await readJson(path(`gates/${name}/receipt.json`));assert.equal(gate.schemaVersion,1);assert.equal(gate.kind,'ci-gate');assert.equal(gate.name,name);assert.equal(gate.status,'passed');assertContext(gate.context,producer.context);
  assert.equal(digest(await readFile(path(`gates/${name}/report.json`))),gate.reportSha256,'Gate report changed');
 }
 await mkdir(resolve(root,'output/playwright'),{recursive:true});
 run(['merge-reports',`--reporter=json,html,${reporter}`,blobDir],{WM_CI_DISCOVERY:'0',WM_CI_REPORT:path('merged-record.json'),PLAYWRIGHT_JSON_OUTPUT_FILE:resolve(root,'output/playwright/results.json'),PLAYWRIGHT_HTML_OUTPUT_DIR:resolve(root,'output/playwright/report')});
 const mergedRecord=await readJson(path('merged-record.json'));verifyBrowserRecord(mergedRecord,inventory,plan.skipPolicy);
 const outcomes=results=>results.map(({identity,status})=>({identity,status})).sort((a,b)=>a.identity.localeCompare(b.identity,'en'));
 assert.deepEqual(outcomes(mergedRecord.results),outcomes(receipts.flatMap(receipt=>receipt.record.results)),'Merged blob outcomes differ from shard receipts');
 const merged=await readJson(resolve(root,'output/playwright/results.json'));
 assert.deepEqual(merged.errors,[]);assert.equal(merged.stats.unexpected,0);assert.equal(merged.stats.flaky,0);assert.equal(merged.stats.expected+merged.stats.skipped,inventory.length);
 assertContext(await ciContext(root),producer.context);
 const manifest={schemaVersion:1,kind:'website-technical',checkedAt:new Date().toISOString(),commit:producer.context.commit,dirty:producer.context.dirty,sourceSha256:producer.context.sourceSha256,artifactSha256:producer.context.artifactSha256,checks:technicalChecks,
  distributed:{runId:producer.context.runId,runAttempt:producer.context.runAttempt,ciInputsSha256:producer.context.ciInputsSha256,planSha256:jsonDigest(plan),shards:5,tests:inventory.length}};
 await saveJson(resolve(root,'evidence/technical-check.json'),manifest);
 console.log(`Complete technical verification passed: ${inventory.length} test identities across five shards, plus editorial and reading-accessibility gates.`);
}
