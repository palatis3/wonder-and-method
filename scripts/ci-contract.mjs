import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {releaseFingerprint} from '../src/release.mjs';

export const digest=value=>createHash('sha256').update(value).digest('hex');
export const jsonDigest=value=>digest(JSON.stringify(value));
export const contextKeys=['commit','dirty','sourceSha256','artifactSha256','buildMetadataSha256','ciInputsSha256','runId','runAttempt','playwrightVersion','nodeVersion'];
export const readJson=async file=>JSON.parse(await readFile(file,'utf8'));
export async function saveJson(file,value){
 await mkdir(dirname(file),{recursive:true});
 await writeFile(file+'.tmp',JSON.stringify(value,null,2)+'\n');
 await rename(file+'.tmp',file);
}
export async function ciContext(root){
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
 const names=git('ls-files','--cached','--others','--exclude-standard','-z').split('\0').filter(Boolean)
  .filter(name=>/^(tests\/|scripts\/|config\/|\.github\/|playwright[^/]*\.mjs$|operations\/editorial-review\.json$|(?:deployment\/)?package(?:-lock)?\.json$)/.test(name)).sort();
 const inputs=await Promise.all(names.map(async path=>({path,sha256:digest(await readFile(resolve(root,path)))})));
 return {commit:git('rev-parse','HEAD'),dirty:!!git('status','--porcelain'),...await releaseFingerprint(root),
  buildMetadataSha256:digest(await readFile(resolve(root,'evidence/build.json'))),ciInputsSha256:jsonDigest(inputs),
  runId:process.env.GITHUB_RUN_ID||'local',runAttempt:process.env.GITHUB_RUN_ATTEMPT||'1',
  playwrightVersion:(await readJson(resolve(root,'node_modules/@playwright/test/package.json'))).version,nodeVersion:process.versions.node};
}
export function assertContext(actual,expected){
 for(const key of contextKeys){assert.notEqual(expected[key],undefined,`Missing CI context: ${key}`);assert.equal(actual[key],expected[key],`CI evidence mismatch: ${key}. Rerun every job together; partial reruns cannot reuse an older attempt.`);}
}
export function assertUniqueInventory(inventory){
 assert.ok(Array.isArray(inventory)&&inventory.length>0,'Empty test inventory');
 const ids=inventory.map(test=>test.identity);
 assert.ok(ids.every(id=>typeof id==='string'&&id.length>0&&!/[\r\n]/.test(id)),'Invalid test identity');
 assert.equal(new Set(ids).size,ids.length,'Duplicate test identity');
 return [...ids].sort();
}
export function assertSameInventory(actual,expected){assert.deepEqual(assertUniqueInventory(actual),assertUniqueInventory(expected),'Test inventory differs: missing, duplicate or unexpected tests');}
export function partitionTests(inventory,hints={},count=5){
 assertUniqueInventory(inventory);assert.ok(Number.isInteger(count)&&count>0&&count<=inventory.length,'Invalid shard count');
 const bins=Array.from({length:count},(_,i)=>({index:i+1,estimatedMs:0,tests:[]}));
 const weighted=inventory.map(test=>({...test,estimatedMs:Math.max(1,Number(hints[test.identity]??hints[test.project+'::'+test.file]??5000))}));
 assert.ok(weighted.every(test=>Number.isFinite(test.estimatedMs)),'Invalid timing hint');
 weighted.sort((a,b)=>b.estimatedMs-a.estimatedMs||a.identity.localeCompare(b.identity,'en'));
 for(const test of weighted){bins.sort((a,b)=>a.estimatedMs-b.estimatedMs||a.tests.length-b.tests.length||a.index-b.index);bins[0].tests.push(test);bins[0].estimatedMs+=test.estimatedMs;}
 bins.sort((a,b)=>a.index-b.index);for(const bin of bins)bin.tests.sort((a,b)=>a.identity.localeCompare(b.identity,'en'));
 assertSameInventory(bins.flatMap(bin=>bin.tests),inventory);return bins;
}
export function verifyBrowserRecord(record,expected,skipPolicy=[]){
 assert.equal(record.schemaVersion,1);assert.equal(record.mode,'run');assert.equal(record.status,'passed','Browser run did not pass');assert.deepEqual(record.errors,[],'Browser reporter errors');
 assertSameInventory(record.inventory,expected);assertSameInventory(record.results,expected);
 const allowed=new Map(skipPolicy.map(item=>[item.identity,item]));
 assert.equal(allowed.size,skipPolicy.length,'Duplicate skip approval');
 let passed=0,skipped=0;
 for(const result of record.results){
  assert.equal(result.retry,0,'Retries must not hide a browser failure');
  assert.deepEqual(result.errors,[],'A browser test recorded errors');
  if(result.status==='skipped'){
   const approval=allowed.get(result.identity);assert.ok(approval,`Unapproved skipped test: ${result.identity}`);
   const reasons=result.annotations.filter(item=>item.type==='skip').map(item=>item.description||'');
   assert.ok(reasons.includes(approval.reason),`Skip reason changed: ${result.identity}`);skipped++;
  }else{assert.equal(result.status,'passed',`Failed, timed-out or interrupted test: ${result.identity}`);passed++;}
 }
 assert.ok(passed>0,'No passing browser tests');return {passed,skipped,total:passed+skipped};
}
export function verifyShardSet(plan,receipts){
 assert.equal(plan.schemaVersion,1);assert.equal(plan.shards.length,5);assert.equal(receipts.length,plan.shards.length,'Exactly five shard receipts are required');
 const seen=new Set();const completed=[];
 for(const receipt of receipts){
  assert.equal(receipt.schemaVersion,1);assert.equal(receipt.kind,'browser-shard');assertContext(receipt.context,plan.context);assert.equal(receipt.planSha256,jsonDigest(plan),'Wrong partition plan');
  assert.ok(!seen.has(receipt.index),'Duplicate shard receipt');seen.add(receipt.index);
  const shard=plan.shards.find(item=>item.index===receipt.index);assert.ok(shard,'Unknown shard');
  assert.equal(receipt.total,plan.shards.length);verifyBrowserRecord(receipt.record,shard.tests,plan.skipPolicy);completed.push(...receipt.record.results);
 }
 assertSameInventory(completed,plan.inventory);return true;
}
export function requirePrerequisites(results,names){
 assert.deepEqual(Object.keys(results).sort(),[...names].sort(),'Unexpected prerequisite set');
 for(const name of names)assert.equal(results[name].result,'success',`Required job ${name} did not succeed`);
}
