import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {testIdentity} from '../scripts/ci-browser-reporter.mjs';
import {assertContext,assertSameInventory,partitionTests,verifyBrowserRecord,verifyShardSet,requirePrerequisites,jsonDigest} from '../scripts/ci-contract.mjs';

const context={commit:'a'.repeat(40),dirty:false,sourceSha256:'source',artifactSha256:'artifact',buildMetadataSha256:'build',ciInputsSha256:'ci',runId:'123',runAttempt:'1',playwrightVersion:'1.64.1',nodeVersion:'24.0.0'};
const inventory=Array.from({length:15},(_,i)=>({identity:`[desktop] › tests/browser/example.spec.mjs › case ${i}`,project:'desktop',file:'tests/browser/example.spec.mjs',titles:[`case ${i}`]}));
test('repository evidence identity and Playwright root-relative selector remain distinct',()=>{
 const root=resolve('.'),file=resolve(root,'tests/browser/nested/example.spec.mjs');
 const result=testIdentity({parent:{project:()=>({name:'desktop'})},location:{file},titlePath:()=>['','desktop','nested/example.spec.mjs','group','case']},root,resolve(root,'tests/browser'));
 assert.equal(result.identity,'[desktop] › tests/browser/nested/example.spec.mjs › group › case');
 assert.equal(result.listEntry,'[desktop] › nested/example.spec.mjs › group › case');
});
const record=tests=>({schemaVersion:1,mode:'run',status:'passed',errors:[],inventory:tests,results:tests.map(item=>({...item,status:'passed',retry:0,errors:[],annotations:[]}))});
const fixture=()=>{const plan={schemaVersion:1,context,inventory,shards:partitionTests(inventory),skipPolicy:[]};return {plan,receipts:plan.shards.map(shard=>({schemaVersion:1,kind:'browser-shard',context:{...context},index:shard.index,total:5,planSha256:jsonDigest(plan),record:record(shard.tests)}))};};

test('duration-balanced partitions retain every project-qualified identity exactly once',()=>{
 const hints=Object.fromEntries(inventory.map((item,i)=>[item.identity,i===0?25000:5000]));
 const shards=partitionTests(inventory,hints);
 assertSameInventory(shards.flatMap(shard=>shard.tests),inventory);
 assert.ok(Math.max(...shards.map(shard=>shard.estimatedMs))<=25000);
 assert.deepEqual(partitionTests([...inventory].reverse(),hints),shards,'Input ordering must not change the partition');
});
test('five complete successful receipts authorize aggregation',()=>{const f=fixture();assert.equal(verifyShardSet(f.plan,f.receipts),true);});
for(const [name,mutate] of [
 ['missing shard',f=>f.receipts.pop()],
 ['unsupported receipt',f=>f.receipts[0].schemaVersion=2],
 ['duplicate shard',f=>f.receipts[4]=structuredClone(f.receipts[0])],
 ['unknown shard',f=>f.receipts[0].index=9],
 ['wrong shard total',f=>f.receipts[0].total=4],
 ['wrong plan',f=>f.receipts[0].planSha256='other'],
 ['missing test',f=>f.receipts[0].record.results.pop()],
 ['duplicate test',f=>f.receipts[0].record.results[1]=structuredClone(f.receipts[0].record.results[0])],
 ['unknown test',f=>f.receipts[0].record.results[0].identity='unknown'],
 ['unexpected skip',f=>f.receipts[0].record.results[0].status='skipped'],
 ['failed test',f=>f.receipts[0].record.results[0].status='failed'],
 ['timeout',f=>f.receipts[0].record.results[0].status='timedOut'],
 ['interrupted test',f=>f.receipts[0].record.results[0].status='interrupted'],
 ['retry',f=>f.receipts[0].record.results[0].retry=1],
 ['reporter error',f=>f.receipts[0].record.errors.push('uncaught error')],
 ['test error despite passed status',f=>f.receipts[0].record.results[0].errors.push('assertion')],
 ['list-only report',f=>f.receipts[0].record.mode='list'],
 ['cancelled browser run',f=>f.receipts[0].record.status='interrupted'],
 ['stale attempt',f=>f.receipts[0].context.runAttempt='0'],
 ['different source',f=>f.receipts[0].context.sourceSha256='changed'],
 ['different artifact',f=>f.receipts[0].context.artifactSha256='changed'],
 ['different tests',f=>f.receipts[0].context.ciInputsSha256='changed'],
 ['different build metadata',f=>f.receipts[0].context.buildMetadataSha256='changed'],
 ['different commit',f=>f.receipts[0].context.commit='changed']
])test(`aggregation rejects ${name}`,()=>{const f=fixture();mutate(f);assert.throws(()=>verifyShardSet(f.plan,f.receipts));});
test('intentional exclusions require the exact identity and reason',()=>{
 const r=record(inventory.slice(0,2));r.results[0].status='skipped';r.results[0].annotations=[{type:'skip',description:'Covered in desktop matrix'}];
 const policy=[{identity:r.results[0].identity,reason:'Covered in desktop matrix'}];
 assert.deepEqual(verifyBrowserRecord(r,r.inventory,policy),{passed:1,skipped:1,total:2});
 assert.throws(()=>verifyBrowserRecord(r,r.inventory,[{...policy[0],reason:'Different reason'}]),/reason/);
 assert.throws(()=>verifyBrowserRecord(r,r.inventory,[policy[0],policy[0]]),/Duplicate skip/);
});
test('all-skipped and empty suites cannot masquerade as browser verification',()=>{
 const r=record(inventory.slice(0,1));r.results[0].status='skipped';r.results[0].annotations=[{type:'skip',description:'intentional'}];
 assert.throws(()=>verifyBrowserRecord(r,r.inventory,[{identity:r.results[0].identity,reason:'intentional'}]),/No passing/);
 assert.throws(()=>assertSameInventory([],[]),/Empty/);
});
test('the final required job rejects unsuccessful or missing prerequisites',()=>{
 const good={core:{result:'success'},browser:{result:'success'}};requirePrerequisites(good,['core','browser']);
 for(const result of ['skipped','cancelled','failure','neutral'])assert.throws(()=>requirePrerequisites({...good,browser:{result}},['core','browser']));
 assert.throws(()=>requirePrerequisites({core:good.core},['core','browser']));
 assert.throws(()=>assertContext({...context,runId:'old'},context));
});
