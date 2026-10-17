import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

function fixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'wm-mail-test-'));
  t.after(()=>{const target=fs.realpathSync(dir),parent=fs.realpathSync(os.tmpdir());assert.equal(path.dirname(target),parent);assert.ok(path.basename(target).startsWith('wm-mail-test-'));fs.rmSync(target,{recursive:true,force:true});});
  for(const sub of ['deployment','scripts','evidence'])fs.mkdirSync(path.join(dir,sub));
  fs.copyFileSync(new URL('../scripts/test-email-delivery.mjs',import.meta.url),path.join(dir,'scripts/test-email-delivery.mjs'));
  const draft=JSON.parse(fs.readFileSync(new URL('./fixtures/email-delivery-test.json',import.meta.url)));
  draft.approval={approved:false,approvedAt:null,payloadSha256:null};
  const save=()=>fs.writeFileSync(path.join(dir,'deployment/email-delivery-test.json'),JSON.stringify(draft));
  save();
  fs.writeFileSync(path.join(dir,'deployment/resend-credentials.mjs'),"export function readResendKey(){return 'fake-key-never-used-on-network';}\n");
  fs.writeFileSync(path.join(dir,'mock-provider.mjs'),`import fs from 'node:fs';
globalThis.fetch=async(url,options)=>{if(url!=='https://api.resend.com/emails')throw Error('Unexpected destination');fs.appendFileSync(new URL('./calls.txt',import.meta.url),'called\\n');if(process.env.WM_TEST_RESPONSE==='timeout')throw Error('Simulated timeout');return Response.json({id:'fixture-provider-id'});};\n`);
  const run=(args=[],timeout=false)=>spawnSync(process.execPath,['--import',pathToFileURL(path.join(dir,'mock-provider.mjs')).href,path.join(dir,'scripts/test-email-delivery.mjs'),...args],{encoding:'utf8',env:{...process.env,WM_TEST_RESPONSE:timeout?'timeout':'accepted'}});
  const approve=()=>{const payload={from:draft.from,to:draft.to,subject:draft.subject,text:draft.text};draft.approval={approved:true,approvedAt:'2026-10-14T00:00:00Z',payloadSha256:createHash('sha256').update(JSON.stringify(payload)).digest('hex')};save();};
  return {dir,draft,save,run,approve,calls:()=>fs.existsSync(path.join(dir,'calls.txt'))?fs.readFileSync(path.join(dir,'calls.txt'),'utf8').trim().split('\n').length:0};
}

test('mail test preview and missing or changed approval cannot contact the provider',t=>{
  const f=fixture(t);
  assert.equal(f.run().status,0);
  assert.notEqual(f.run(['--send']).status,0);
  f.approve();f.draft.text+=' Changed after approval';f.save();
  assert.notEqual(f.run(['--send']).status,0);
  assert.equal(f.calls(),0);
  assert.equal(fs.existsSync(path.join(f.dir,'.runtime/email-delivery-test-attempt.json')),false);
});

test('accepted mail test cannot be resent and does not claim mailbox receipt',t=>{
  const f=fixture(t);f.approve();
  assert.equal(f.run(['--send']).status,0);
  assert.notEqual(f.run(['--send']).status,0);
  assert.equal(f.calls(),1);
  const receipt=JSON.parse(fs.readFileSync(path.join(f.dir,'evidence/email-delivery-test.json')));
  assert.equal(receipt.status,'provider-accepted');
  assert.equal(receipt.mailboxReceiptVerified,false);
});

test('uncertain provider outcome remains a single attempt and requires review',t=>{
  const f=fixture(t);f.approve();
  assert.notEqual(f.run(['--send'],true).status,0);
  assert.notEqual(f.run(['--send']).status,0);
  assert.equal(f.calls(),1);
  const receipt=JSON.parse(fs.readFileSync(path.join(f.dir,'evidence/email-delivery-test.json')));
  assert.equal(receipt.status,'uncertain');
  assert.equal(receipt.providerId,null);
});

test('Windows credential storage round-trips ciphertext and refuses overwrite',{skip:process.platform!=='win32'},t=>{
  const f=fixture(t);
  fs.copyFileSync(new URL('../deployment/resend-credentials.mjs',import.meta.url),path.join(f.dir,'deployment/resend-credentials.mjs'));
  const key='re_synthetic_credential_not_real_1234567890';
  const moduleUrl=pathToFileURL(path.join(f.dir,'deployment/resend-credentials.mjs')).href;
  const script=`import {storeResendKey,readResendKey} from ${JSON.stringify(moduleUrl)}; const key=${JSON.stringify(key)};storeResendKey(key);if(readResendKey()!==key)throw Error('Round-trip failed');let rejected=false;try{storeResendKey(key)}catch{rejected=true}if(!rejected)throw Error('Overwrite permitted');console.log('Encrypted round-trip and overwrite rejection passed');`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.ok(!result.stdout.includes(key));
  assert.ok(!fs.readFileSync(path.join(f.dir,'.runtime/credentials/resend-notifications.dpapi')).includes(Buffer.from(key)));
});
