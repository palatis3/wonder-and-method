import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {readResendKey} from '../deployment/resend-credentials.mjs';

const root=new URL('../',import.meta.url);
const draft=JSON.parse(fs.readFileSync(new URL('deployment/email-delivery-test.json',root),'utf8'));
const payload={from:draft.from,to:draft.to,subject:draft.subject,text:draft.text};
const body=JSON.stringify(payload);
const payloadSha256=createHash('sha256').update(body).digest('hex');
const receiptPath=new URL('.runtime/email-delivery-test-attempt.json',root);
const evidencePath=new URL('evidence/email-delivery-test.json',root);
const args=process.argv.slice(2);

if(args.length===0){
  console.log(JSON.stringify({mode:'preview-only',reference:draft.reference,payload,payloadSha256,approved:draft.approval.approved,scope:draft.scope},null,2));
} else if(args.length!==1||args[0]!=='--send'){
  throw new Error('Use no arguments to preview, or --send after exact message approval.');
} else {
  if(!draft.approval.approved||!draft.approval.approvedAt||draft.approval.payloadSha256!==payloadSha256)throw new Error('Exact-message approval is missing or no longer matches this payload.');
  if(draft.reference!=='wm-email-setup-2026-10-14-01'||payload.from!=='Wonder and Method <notifications@notify.wonderandmethod.com>'||JSON.stringify(payload.to)!=='["palatis3@gmail.com"]')throw new Error('Delivery test scope changed; prepare a separately reviewed test.');
  if(fs.existsSync(receiptPath)||fs.existsSync(evidencePath))throw new Error('This test already has an attempt or evidence record. Review it and the provider dashboard; do not resend automatically.');
  const key=readResendKey();
  const receipt={reference:draft.reference,attemptedAt:new Date().toISOString(),payloadSha256,status:'uncertain',providerId:null,mailboxReceiptVerified:false,scope:draft.scope};
  fs.mkdirSync(new URL('.runtime/',root),{recursive:true});
  fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  try {
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
      headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`setup/${draft.reference}`},body
    });
    receipt.httpStatus=response.status;
    if(response.ok){
      const data=await response.json();
      if(typeof data.id==='string'&&/^[a-zA-Z0-9-]{1,200}$/.test(data.id)){receipt.status='provider-accepted';receipt.providerId=data.id;}
    } else { receipt.status='provider-rejected';await response.body?.cancel(); }
  } catch { /* Only generic state is retained; never emit request headers or provider error bodies. */ }
  fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
  fs.writeFileSync(evidencePath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(receipt,null,2));
  if(receipt.status!=='provider-accepted')process.exitCode=1;
}
