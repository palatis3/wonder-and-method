// One approved test window, with local finally restoration and remote five-minute expiry.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {readResendKey} from '../deployment/resend-credentials.mjs';
import {readStagingCredentials} from '../deployment/staging-credentials.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const mode=process.argv.slice(2);assert(mode.length===1&&['--run-approved','--resume-before-submit'].includes(mode[0]));
const draft=JSON.parse(fs.readFileSync(path.join(root,'deployment/form-delivery-test.json')));
const {approval,...proposal}=draft;
assert(approval.approved===true&&approval.approvedAt&&approval.payloadSha256===createHash('sha256').update(JSON.stringify(proposal)).digest('hex'),'Exact test approval is missing or changed.');
assert.match(draft.reference,/^wm-protected-form-test-2026-10-14-(01|02)$/);
const artifactSuffix=draft.reference.endsWith('-01')?'':'-02';
const attempt=path.join(root,`.runtime/form-delivery-test-attempt${artifactSuffix}.json`);
assert(!fs.existsSync(attempt),'An inquiry attempt already exists. Do not rerun the window.');
const windowPath=path.join(root,`evidence/form-test-window${artifactSuffix}.json`);
let previousSetup=null;
if(mode[0]==='--resume-before-submit'){
 previousSetup=JSON.parse(fs.readFileSync(windowPath));
 assert(previousSetup.submissionAttempted===false&&previousSetup.restored===true,'Only a restored setup/preflight failure with no submission can resume.');
 assert.equal(previousSetup.testReference,draft.reference);assert.equal(previousSetup.approvedPayloadSha256,approval.payloadSha256);
}else assert(!fs.existsSync(windowPath),'A test window already exists. Reconcile before any further action.');
const baseline='e5b81c02-09bb-4fba-a979-2b8cfbeaa579';
const configPath=path.join(root,'deployment/wrangler.jsonc');
const cli=path.join(root,'deployment/node_modules/wrangler/bin/wrangler.js');
const report={startedAt:new Date().toISOString(),testReference:draft.reference,baseline,approvedPayloadSha256:approval.payloadSha256,secretInstalled:false,testVersion:null,submissionAttempted:false,restored:false,publicLaunch:false};
if(previousSetup)report.previousSetupAttempts=[previousSetup];
const save=()=>fs.writeFileSync(windowPath,JSON.stringify(report,null,2)+'\n');
function wrangler(args,input){
 const result=spawnSync(process.execPath,[cli,...args,'--config',configPath],{cwd:root,input,encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:60000,maxBuffer:4*1024*1024});
 if(result.error||result.status!==0)throw Error(`Wrangler ${args[0]} ${args[1]||''} failed or timed out; reconcile remote state before retrying.`);
 return result.stdout;
}
const current=()=>JSON.parse(wrangler(['deployments','status','--json']));
const version=id=>JSON.parse(wrangler(['versions','view',id,'--json']));
function verifyBaseline(){
 const d=current();assert.equal(d.versions.length,1);assert.equal(d.versions[0].version_id,baseline);assert.equal(d.versions[0].percentage,100);
 const v=version(baseline),b=v.resources.bindings;
 for(const [name,value] of Object.entries({ENVIRONMENT:'staging',INQUIRY_MODE:'synthetic',RELEASE_APPROVED:'false'}))assert.equal(b.find(x=>x.name===name)?.text,value);
 assert.equal(b.find(x=>x.name==='DB')?.database_id,'dfcded52-c87b-48f4-959a-84079e1cec97');
 assert(!b.some(x=>x.name==='RESEND_API_KEY'));assert.equal(v.resources.script_runtime.assets.raw_run_worker_first,true);
 return d.id;
}
report.baselineDeployment=verifyBaseline();
fs.writeFileSync(windowPath,JSON.stringify(report,null,2)+'\n',{flag:previousSetup?'w':'wx'});
let mutationStarted=false;
try{
 mutationStarted=true;
 wrangler(['versions','secret','put','RESEND_API_KEY'],readResendKey()+'\n');report.secretInstalled=true;save();console.log('Restricted sending key uploaded without activating a version.');
 const cfg=JSON.parse(fs.readFileSync(configPath));
 assert.equal(cfg.name,'wonder-method-staging');assert.equal(cfg.account_id,'4fc7ad8717e64e119476c2dcf8f0666e');
 assert.equal(cfg.d1_databases[0].database_id,'dfcded52-c87b-48f4-959a-84079e1cec97');
 const start=Date.now(),end=start+300000;
 cfg.main=path.join(root,'deployment/form-test-worker.mjs');cfg.assets.directory=path.join(root,'dist');
 cfg.workers_dev=true;cfg.preview_urls=false;cfg.vars.TEST_START_MS=String(start);cfg.vars.TEST_END_MS=String(end);
 cfg.d1_databases[0].migrations_dir=path.join(root,'deployment/migrations');delete cfg.$schema;
 const temporary=path.join(root,'.runtime/form-test.wrangler.json');fs.writeFileSync(temporary,JSON.stringify(cfg,null,2)+'\n');
 const deployed=spawnSync(process.execPath,[cli,'deploy','--config',temporary],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000,maxBuffer:4*1024*1024});
 if(deployed.error||deployed.status!==0)throw Error('Test deployment failed or timed out; restoring baseline.');
 const active=current();assert.equal(active.versions.length,1);assert.equal(active.versions[0].percentage,100);assert.notEqual(active.versions[0].version_id,baseline);
 const v=version(active.versions[0].version_id),b=v.resources.bindings;
 for(const [name,value] of Object.entries(cfg.vars))assert.equal(b.find(x=>x.name===name)?.text,value,name);
 assert.equal(b.find(x=>x.name==='DB')?.database_id,'dfcded52-c87b-48f4-959a-84079e1cec97');
 for(const name of ['RESEND_API_KEY','STAGING_AUTH','OPERATOR_TOKEN','FINGERPRINT_SECRET'])assert.equal(b.find(x=>x.name===name)?.type,'secret_text');
 assert.equal(v.resources.script_runtime.assets.raw_run_worker_first,true);assert.equal(v.resources.script_runtime.assets.serve_directly,false);
 assert(Date.now()<end-30000,'Insufficient test window remains; no submission.');
 report.testVersion=v.id;report.testDeployment=active.id;report.windowStart=new Date(start).toISOString();report.windowEnd=new Date(end).toISOString();save();console.log('Test deployment recorded; waiting for the actual protected test handler.');
 const basic='Basic '+Buffer.from(readStagingCredentials().STAGING_AUTH).toString('base64');
 let ready=false;
 for(let i=0;i<30&&Date.now()<end-30000;i++){
   const response=await fetch(draft.origin+'/api/setup-test-readiness?check='+Date.now(),{redirect:'error',signal:AbortSignal.timeout(5000),headers:{Authorization:basic,Accept:'application/json'}});
   if(response.status===200){const runtime=await response.json();ready=runtime.ready===true&&runtime.testReference===draft.reference&&runtime.approvedPayloadSha256===approval.payloadSha256&&runtime.startsAt===start&&runtime.expiresAt===end;}
   else await response.body?.cancel();
   if(ready){report.runtimeReadinessVerifiedAt=new Date().toISOString();break;}
   await delay(2000);
 }
 assert(ready,'Actual test handler did not become ready; no submission.');save();console.log('Actual test handler identified; submitting the approved fixture once.');
 const script=path.join(root,'scripts/test-form-delivery.mjs');
 const submitted=spawnSync(process.execPath,[script,'--submit'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000});
 report.preflightSteps=(submitted.stdout||'').split('\n').filter(line=>line.startsWith('PRECHECK: '));
 const assertion=(submitted.stderr||'').match(/AssertionError(?: \[[^\]]+\])?: ([^\n]{1,250})/);
 if(assertion)report.submissionAssertion=assertion[1];
 report.submissionAttempted=fs.existsSync(attempt);save();
 if(submitted.error||submitted.status!==0)throw Error('Submission did not confirm a saved record; do not resubmit.');
 for(let i=0;i<6;i++){
   const inspected=spawnSync(process.execPath,[script,'--inspect'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30000});
   if(inspected.error||inspected.status!==0)throw Error('Record inspection failed; reconcile the saved attempt.');
   const receipt=JSON.parse(fs.readFileSync(attempt));report.reference=receipt.reference;report.deliveryStatus=receipt.status;report.providerId=receipt.providerId;report.attempts=receipt.attempts;save();
   if(['accepted','failed','uncertain','manual_review'].includes(receipt.status))break;
   await delay(2000);
 }
 assert.equal(report.deliveryStatus,'accepted','Delivery requires reconciliation; never retry automatically.');assert.equal(report.attempts,1);
 console.log('Durable inquiry and one provider-accepted notification verified.');
}catch(error){
 report.error=error instanceof assert.AssertionError?'An expected deployment or delivery invariant failed; inspect the saved report.':error.message;
 process.exitCode=1;
}finally{
 if(mutationStarted){
   try{wrangler(['rollback',baseline,'--yes','--message','Restore protected synthetic staging after approved single inquiry test.']);report.restoredDeployment=verifyBaseline();report.restored=true;report.restoredAt=new Date().toISOString();console.log('Original synthetic staging version restored and verified.');}
   catch{report.restoreError='Baseline restoration was not verified; use the recorded baseline version and Cloudflare deployment API immediately.';process.exitCode=1;}
 }
 save();
 console.log(JSON.stringify(report,null,2));
}
