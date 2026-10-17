import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

function fixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'wm-form-test-'));
  t.after(()=>{assert.equal(path.dirname(fs.realpathSync(dir)),fs.realpathSync(os.tmpdir()));assert(path.basename(dir).startsWith('wm-form-test-'));fs.rmSync(dir,{recursive:true,force:true});});
  for(const sub of ['deployment','scripts','src','evidence'])fs.mkdirSync(path.join(dir,sub));
  for(const file of ['scripts/test-form-delivery.mjs','deployment/form-delivery-test.json','src/inquiry.mjs','src/shared.mjs'])fs.copyFileSync(new URL(file==='deployment/form-delivery-test.json'?'./fixtures/form-delivery-test.json':'../'+file,import.meta.url),path.join(dir,file));
  const draft=JSON.parse(fs.readFileSync(path.join(dir,'deployment/form-delivery-test.json')));
  // Isolate the canonical first-attempt paths used by these fake-network tests.
  draft.reference='wm-protected-form-test-2026-10-14-01';
  draft.inquiry.message=draft.inquiry.message.replace('wm-protected-form-test-2026-10-14-02',draft.reference);
  draft.textTemplate=draft.textTemplate.replace('wm-protected-form-test-2026-10-14-02',draft.reference);
  draft.approval={approved:false,approvedAt:null,payloadSha256:null};
  const save=()=>fs.writeFileSync(path.join(dir,'deployment/form-delivery-test.json'),JSON.stringify(draft));
  save();
  fs.writeFileSync(path.join(dir,'deployment/staging-credentials.mjs'),"export const readStagingCredentials=()=>({STAGING_AUTH:'fake:auth',OPERATOR_TOKEN:'fake-token'});\n");
  fs.writeFileSync(path.join(dir,'mock.mjs'),`import fs from 'node:fs';
const root=new URL('./',import.meta.url),draft=JSON.parse(fs.readFileSync(new URL('deployment/form-delivery-test.json',root)));
globalThis.fetch=async(url,options={})=>{
 if(!url.startsWith(draft.origin))throw Error('Unexpected destination');
 if(options.method==='POST'){fs.appendFileSync(new URL('posts.txt',root),'post\\n');if(process.env.WM_FORM_TEST_MODE==='timeout')throw Error('timeout');return Response.json({reference:'11111111-2222-3333-4444-555555555555'},{status:202,headers:{'X-WM-Test-Reference':draft.reference}});}
 if(url.endsWith('/api/inquiries'))return new Response('',{status:401});
 if(url.endsWith('/contact/'))return new Response('',{headers:{'x-robots-tag':'noindex'}});
 if(url.endsWith('/api/setup-test-readiness'))return process.env.WM_FORM_TEST_MODE==='old-version'?new Response('',{status:404}):Response.json({testReference:draft.reference,approvedPayloadSha256:draft.approval.payloadSha256,ready:true,expiresAt:Date.now()+300000});
 if(options.method==='DELETE'){fs.appendFileSync(new URL('deletes.txt',root),'delete\\n');return Response.json({});}
 const deleted=fs.existsSync(new URL('deletes.txt',root));
 const synthetic=process.env.WM_FORM_TEST_MODE==='synthetic';
 return Response.json({records:deleted?[]:[{id:'11111111-2222-3333-4444-555555555555',payload:JSON.stringify(process.env.WM_FORM_TEST_MODE==='wrong-payload'?{...draft.inquiry,name:'Other client'}:draft.inquiry),synthetic:synthetic?1:0,delivery_status:synthetic?'synthetic':'accepted',provider_id:synthetic?null:'fake-provider',attempts:synthetic?0:1}],next_cursor:null});
};`);
  const run=(args=[],mode='ok')=>spawnSync(process.execPath,['--import',pathToFileURL(path.join(dir,'mock.mjs')).href,path.join(dir,'scripts/test-form-delivery.mjs'),...args],{encoding:'utf8',env:{...process.env,WM_FORM_TEST_MODE:mode}});
  const approve=()=>{const {approval,...proposal}=draft;draft.approval={approved:true,approvedAt:'2026-10-14T00:00:00Z',payloadSha256:createHash('sha256').update(JSON.stringify(proposal)).digest('hex')};save();};
  const count=file=>fs.existsSync(path.join(dir,file))?fs.readFileSync(path.join(dir,file),'utf8').trim().split('\n').length:0;
  return {dir,draft,save,approve,run,count};
}

test('form delivery preview and unapproved or changed proposal cannot submit',t=>{
 const f=fixture(t);assert.equal(f.run().status,0);assert.notEqual(f.run(['--submit']).status,0);
 f.approve();f.draft.scope+=' changed';f.save();assert.notEqual(f.run(['--submit']).status,0);assert.equal(f.count('posts.txt'),0);
});
test('form delivery blocks a second POST after saved and uncertain outcomes',t=>{
 for(const mode of ['ok','timeout']){const f=fixture(t);f.approve();const result=f.run(['--submit'],mode);assert.equal(result.status,mode==='ok'?0:1,result.stderr);assert.notEqual(f.run(['--submit']).status,0);assert.equal(f.count('posts.txt'),1);}
});
test('form cleanup requires receipt, restoration and exact payload; inspection does not send',t=>{
 const f=fixture(t);f.approve();assert.equal(f.run(['--submit']).status,0);assert.equal(f.run(['--inspect']).status,0);
 assert.notEqual(f.run(['--cleanup']).status,0);assert.equal(f.count('deletes.txt'),0);
 const p=path.join(f.dir,'.runtime/form-delivery-test-attempt.json'),receipt=JSON.parse(fs.readFileSync(p));receipt.mailboxReceiptVerified=true;receipt.restoredSyntheticVersionVerified=true;fs.writeFileSync(p,JSON.stringify(receipt));
 assert.notEqual(f.run(['--cleanup'],'wrong-payload').status,0);assert.equal(f.count('deletes.txt'),0);
 assert.equal(f.run(['--cleanup']).status,0);assert.equal(f.count('deletes.txt'),1);assert.equal(f.count('posts.txt'),1);
});
test('previous deployed handler cannot trigger a submission or consume its local attempt',t=>{
 const f=fixture(t);f.approve();assert.notEqual(f.run(['--submit'],'old-version').status,0);assert.equal(f.count('posts.txt'),0);assert(!fs.existsSync(path.join(f.dir,'.runtime/form-delivery-test-attempt.json')));
});
test('unexpected synthetic row is recorded truthfully and only that no-send fixture can be cleaned',t=>{
 const f=fixture(t);f.approve();assert.equal(f.run(['--submit']).status,0);assert.notEqual(f.run(['--inspect'],'synthetic').status,0);
 const p=path.join(f.dir,'.runtime/form-delivery-test-attempt.json'),receipt=JSON.parse(fs.readFileSync(p));assert.equal(receipt.synthetic,1);assert.equal(receipt.attempts,0);assert.equal(receipt.mailboxReceiptVerified,false);
 receipt.restoredSyntheticVersionVerified=true;fs.writeFileSync(p,JSON.stringify(receipt));
 assert.notEqual(f.run(['--cleanup-synthetic']).status,0);assert.equal(f.count('deletes.txt'),0);
 assert.equal(f.run(['--cleanup-synthetic'],'synthetic').status,0);assert.equal(f.count('deletes.txt'),1);assert.equal(f.count('posts.txt'),1);
});
test('separately approved second fixture uses distinct at-most-once evidence paths',t=>{
 const f=fixture(t);f.draft.reference='wm-protected-form-test-2026-10-14-02';f.draft.inquiry.message=f.draft.inquiry.message.replace('2026-10-14-01','2026-10-14-02');f.draft.textTemplate=f.draft.textTemplate.replace('2026-10-14-01','2026-10-14-02');f.save();
 assert.notEqual(f.run(['--submit']).status,0);assert.equal(f.count('posts.txt'),0);f.approve();assert.equal(f.run(['--submit']).status,0);assert.notEqual(f.run(['--submit']).status,0);
 assert(fs.existsSync(path.join(f.dir,'.runtime/form-delivery-test-attempt-02.json')));assert(fs.existsSync(path.join(f.dir,'evidence/form-delivery-test-02.json')));assert(!fs.existsSync(path.join(f.dir,'.runtime/form-delivery-test-attempt.json')));assert.equal(f.count('posts.txt'),1);
});
