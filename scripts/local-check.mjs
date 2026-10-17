import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const run=promisify(execFile),root=resolve(import.meta.dirname,'..'),logs=resolve(root,'.runtime/local-check');
await mkdir(logs,{recursive:true});
const tests=(await readdir(resolve(root,'tests'))).filter(x=>x.endsWith('.test.mjs')).sort().map(x=>'tests/'+x);
const checks=[['build',['scripts/build.mjs']],['authority',['scripts/verify-authority.mjs']],['tests',['--test',...tests]],['static',['scripts/verify.mjs']],['search-coverage',['scripts/search-coverage.mjs']],['synthetic-client',['scripts/synthetic-client.mjs']],['private-packet',['scripts/job-packet.mjs']],['business-rehearsal',['scripts/operations.mjs','rehearse']]];
const results=[];
for(const [name,args] of checks){
 try{
  const result=await run(process.execPath,args,{cwd:root,env:{...process.env,NO_COLOR:'1'},maxBuffer:8*1024*1024});
  await writeFile(resolve(logs,name+'.txt'),result.stdout+result.stderr);
  results.push({name,passed:true,log:'.runtime/local-check/'+name+'.txt'});console.log(`PASS ${name}`);
 }catch(error){
  await writeFile(resolve(logs,name+'.txt'),String(error.stdout||'')+String(error.stderr||error.message));
  results.push({name,passed:false,log:'.runtime/local-check/'+name+'.txt'});console.error(`FAIL ${name}; see ${results.at(-1).log}`);process.exitCode=1;break;
 }
}
const summary={checkedAt:new Date().toISOString(),mode:'local-only',passed:results.length===checks.length&&results.every(x=>x.passed),checks:results,externalActions:[],limits:['Node and static checks only; browser visual checks are recorded separately.','No provider calls, real email, real invoices, charges, DNS or deployments.','Public release still requires the separate V5 release gates.']};
await writeFile(resolve(root,'evidence/local-verification.json'),JSON.stringify(summary,null,2)+'\n');
console.log('Local evidence: evidence/local-verification.json');
