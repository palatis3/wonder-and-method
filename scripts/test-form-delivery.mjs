import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readStagingCredentials} from '../deployment/staging-credentials.mjs';
import {validateInquiry} from '../src/inquiry.mjs';

const root=new URL('../',import.meta.url);
const draft=JSON.parse(fs.readFileSync(new URL('deployment/form-delivery-test.json',root),'utf8'));
const {approval,...proposal}=draft;
const payloadSha256=createHash('sha256').update(JSON.stringify(proposal)).digest('hex');
const artifactSuffix=draft.reference==='wm-protected-form-test-2026-10-14-01'?'':'-02';
const attemptPath=new URL(`.runtime/form-delivery-test-attempt${artifactSuffix}.json`,root);
const evidencePath=new URL(`evidence/form-delivery-test${artifactSuffix}.json`,root);
const action=process.argv.slice(2);
assert.equal(draft.origin,'https://wonder-method-staging.palatis3.workers.dev');
assert.match(draft.reference,/^wm-protected-form-test-2026-10-14-(01|02)$/);
assert.equal(draft.from,'Wonder and Method <notifications@notify.wonderandmethod.com>');
assert.deepEqual(draft.to,['palatis3@gmail.com']);
const validated=validateInquiry(draft.inquiry);
assert.deepEqual(validated.errors,{});
assert.deepEqual(validated.value,draft.inquiry);
assert.equal(draft.subjectTemplate,'Website inquiry {server-generated UUID}');
assert.equal(draft.textTemplate,['Website inquiry','Reference: {server-generated UUID}',...Object.entries(validated.value).map(([k,v])=>`${k}: ${v}`)].join('\n\n'));

if(!action.length){
  console.log(JSON.stringify({mode:'preview-only',...proposal,payloadSha256,approved:approval.approved},null,2));
}else{
  assert(action.length===1&&['--submit','--inspect','--cleanup','--cleanup-synthetic'].includes(action[0]),'Use preview, --submit, --inspect, --cleanup or --cleanup-synthetic.');
  assert(approval.approved===true&&approval.approvedAt&&approval.payloadSha256===payloadSha256,'Exact proposal approval is missing or has changed.');
  if(action[0]==='--submit')assert(!fs.existsSync(attemptPath)&&!fs.existsSync(evidencePath),'Attempt already recorded; reconcile it without resubmitting.');
  const secrets=readStagingCredentials();
  const basic='Basic '+Buffer.from(secrets.STAGING_AUTH).toString('base64');
  const operator={Authorization:'Bearer '+secrets.OPERATOR_TOKEN,'X-Staging-Authorization':basic,Accept:'application/json'};
  const request=(path,options={})=>fetch(draft.origin+path,{redirect:'error',signal:AbortSignal.timeout(20000),...options});
  let receipt;
  const persist=()=>{fs.writeFileSync(attemptPath,JSON.stringify(receipt,null,2)+'\n');fs.writeFileSync(evidencePath,JSON.stringify(receipt,null,2)+'\n');};
  if(action[0]==='--submit'){
    // Verify privacy before arming; remote live settings must also be independently checked.
    const denied=await request('/api/inquiries');assert.equal(denied.status,401,'Unauthenticated inquiry access must be denied.');await denied.body?.cancel();console.log('PRECHECK: unauthenticated access denied');
    const page=await request('/contact/',{headers:{Authorization:basic}});assert.equal(page.status,200,'Authenticated contact page must render.');assert.match(page.headers.get('x-robots-tag'),/noindex/,'Authenticated contact page must remain noindex.');await page.body?.cancel();console.log('PRECHECK: authenticated page remains private');
    const readiness=await request('/api/setup-test-readiness',{headers:{Authorization:basic,Accept:'application/json'}});
    assert.equal(readiness.status,200,'Actual test handler is not serving yet; no submission.');
    const active=await readiness.json();assert.equal(active.testReference,draft.reference,'Runtime reference mismatch.');assert.equal(active.approvedPayloadSha256,payloadSha256,'Runtime approval hash mismatch.');assert.equal(active.ready,true,'Runtime sender key missing.');assert(active.expiresAt>Date.now()+10000,'Runtime window too short.');console.log('PRECHECK: runtime reference, approval and expiry match');
    receipt={attemptedAt:new Date().toISOString(),testReference:draft.reference,payloadSha256,status:'uncertain',reference:null,providerId:null,mailboxReceiptVerified:false,restoredSyntheticVersionVerified:false,deleted:false};
    fs.mkdirSync(new URL('.runtime/',root),{recursive:true});
    fs.writeFileSync(attemptPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
    try{
      const response=await request('/api/inquiries',{method:'POST',headers:{Authorization:basic,Origin:draft.origin,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(draft.inquiry)});
      receipt.httpStatus=response.status;
      if(response.status===202){const data=await response.json();if(/^[a-f0-9-]{36}$/.test(data.reference)){receipt.reference=data.reference;receipt.testHandlerMatched=response.headers.get('X-WM-Test-Reference')===draft.reference;receipt.responseMessage=data.message;receipt.status=receipt.testHandlerMatched?'saved-unverified':'saved-handler-mismatch';}}
      else {receipt.status='rejected';await response.body?.cancel();}
    }catch{/* Retain uncertainty and block a second submission. Never print credentials or raw errors. */}
    persist();
    if(receipt.status!=='saved-unverified')process.exitCode=1;
  }else{
    receipt=JSON.parse(fs.readFileSync(attemptPath,'utf8'));
    assert.equal(receipt.payloadSha256,payloadSha256);
    assert.match(receipt.reference||'',/^[a-f0-9-]{36}$/,'Unknown submission outcome requires manual reconciliation; do not resubmit.');
    const response=await request('/api/operator/inquiries',{headers:operator});assert.equal(response.status,200);
    const data=await response.json();
    // Refuse pagination rather than inspect or delete a potentially incomplete match.
    assert(!data.next_cursor,'Manual reconciliation required for paginated inventory.');
    const record=data.records.find(row=>row.id===receipt.reference);
    if(action[0]==='--inspect'){
      assert(record,'Expected test record missing.');assert.deepEqual(JSON.parse(record.payload),draft.inquiry);
      receipt.status=record.delivery_status;receipt.synthetic=record.synthetic;receipt.providerId=record.provider_id;receipt.attempts=record.attempts;receipt.inspectedAt=new Date().toISOString();persist();
      assert.equal(record.synthetic,0,'Fixture was saved by synthetic processing; no live delivery is claimed.');
    }else{
      assert(receipt.restoredSyntheticVersionVerified===true,'Verify restored synthetic Worker before cleanup.');
      assert(record,'Expected fixture is absent; record cleanup as unresolved until reconciled.');
      {
        assert.deepEqual(JSON.parse(record.payload),draft.inquiry);
        if(action[0]==='--cleanup-synthetic'){
          assert.equal(record.synthetic,1);assert.equal(record.delivery_status,'synthetic');assert.equal(record.attempts,0);assert.equal(record.provider_id,null);assert.equal(receipt.mailboxReceiptVerified,false);
          receipt.cleanupReason='Failed integration fixture reconciled as synthetic with zero notification attempts; not a successful email test.';
        }else{
          assert.equal(receipt.mailboxReceiptVerified,true,'Verify actual inbox receipt before successful-test cleanup.');assert.equal(record.delivery_status,'accepted');assert.equal(record.provider_id,receipt.providerId);assert.equal(record.attempts,1);
        }
        const deletion=await request('/api/operator/inquiries/'+receipt.reference,{method:'DELETE',headers:{...operator,'X-Confirm-Delete':receipt.reference}});assert.equal(deletion.status,200);await deletion.body?.cancel();
        const after=await request('/api/operator/inquiries',{headers:operator});assert.equal(after.status,200);const rows=await after.json();assert(!rows.next_cursor&&!rows.records.some(row=>row.id===receipt.reference));
      }
      receipt.deleted=true;receipt.deletedAt=new Date().toISOString();persist();
    }
  }
  console.log(JSON.stringify(receipt,null,2));
}
