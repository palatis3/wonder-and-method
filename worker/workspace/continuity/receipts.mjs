import {canonical,uuid,WorkspaceError} from '../../../src/workspace/domain/contracts.mjs';
import {backupKeys,byteDigest,sealBytes,openBytes} from './envelope.mjs';
import {machineRpc} from '../database.mjs';
const encoder=new TextEncoder(),decoder=new TextDecoder();
const conflict=()=>{throw new WorkspaceError('receipt_conflict','Independent evidence requires reconciliation.',503);};
function generation(value){if(!/^[A-Za-z0-9_-]{8,100}$/.test(value||''))conflict();return value;}
export async function externalControl(env,org){
  uuid(org);if(!env.RECOVERY_CONTROL)throw new WorkspaceError('recovery_unavailable','Independent recovery control is unavailable.',503);
  const object=await env.RECOVERY_CONTROL.get(`control/${org}.json`);if(!object||object.size>8192)throw new WorkspaceError('recovery_unavailable','Independent recovery control is unavailable.',503);
  const control=await object.json();if(control.organization_id!==org||control.schema_version!==1)conflict();generation(control.external_generation);return control;
}
const contextOf=r=>({type:'critical_receipt',organization_id:r.organization_id,external_generation:r.external_generation,id:r.id,sequence:String(r.sequence),digest:r.digest});
const itemKey=r=>`receipts/${r.organization_id}/${generation(r.external_generation)}/items/${r.sequence}-${r.id}.bin`;
async function readItem(bucket,pointer,keys){
  const object=await bucket.get(pointer.key);if(!object||object.size>1048576)conflict();
  const bytes=new Uint8Array(await object.arrayBuffer());if(await byteDigest(bytes)!==pointer.ciphertext_digest)conflict();
  const record=JSON.parse(decoder.decode(await openBytes(bytes,pointer.context,keys)));
  if(canonical(contextOf(record.receipt))!==canonical(pointer.context)||itemKey(record.receipt)!==pointer.key)conflict();return record;
}
async function contains(bucket,head,wanted,keys){
  let cursor=head;
  for(let i=0;i<100&&cursor;i++){
    if(cursor.context.organization_id!==wanted.context.organization_id||cursor.context.external_generation!==wanted.context.external_generation)conflict();
    const record=await readItem(bucket,cursor,keys);
    if(BigInt(cursor.context.sequence)<BigInt(wanted.context.sequence))return false;
    if(cursor.context.id===wanted.context.id)return canonical(cursor)===canonical(wanted);
    if(record.receipt.predecessor_id!==(record.predecessor?.context.id||null))conflict();
    if(record.predecessor&&BigInt(record.predecessor.context.sequence)>=BigInt(cursor.context.sequence))conflict();
    cursor=record.predecessor;
  }
  return false;
}
export async function persistReceipt(env,receipt){
  const org=uuid(receipt.organization_id),id=uuid(receipt.id);if(!/^[1-9]\d*$/.test(String(receipt.sequence))||!/^[a-f0-9]{64}$/.test(receipt.digest||''))conflict();
  const control=await externalControl(env,org);if(control.external_generation!==receipt.external_generation)conflict();
  if(!env.RECOVERY_BYTES)throw new WorkspaceError('backup_unavailable','Independent evidence storage is unavailable.',503);
  const bucket=env.RECOVERY_BYTES,keys=backupKeys(env),context=contextOf(receipt),key=itemKey(receipt),headKey=`receipts/${org}/${receipt.external_generation}/head.json`;
  const headObject=await bucket.get(headKey);if(headObject&&headObject.size>8192)conflict();const head=headObject?await headObject.json():null;
  let existing=await bucket.get(key),pointer;
  if(existing){
    if(existing.size>1048576)conflict();const bytes=new Uint8Array(await existing.arrayBuffer());
    const stored=JSON.parse(decoder.decode(await openBytes(bytes,context,keys)));if(canonical(stored.receipt)!==canonical(receipt))conflict();
    pointer={key,context,ciphertext_digest:await byteDigest(bytes)};
  }else{
    if((head?.context.id||null)!==(receipt.predecessor_id||null))conflict();
    const bytes=await sealBytes(encoder.encode(canonical({receipt,predecessor:head})),context,keys,env.BACKUP_KEY_ID);
    if(bytes.length>1048576)conflict();
    await bucket.put(key,bytes,{onlyIf:new Headers({'If-None-Match':'*'}),httpMetadata:{contentType:'application/octet-stream'}});
    // A conditional loss or an acknowledged write must both be read back.
    existing=await bucket.get(key);if(!existing)throw new WorkspaceError('receipt_unknown','Independent receipt write is unconfirmed.',503);
    const saved=new Uint8Array(await existing.arrayBuffer());const stored=JSON.parse(decoder.decode(await openBytes(saved,context,keys)));
    if(canonical(stored.receipt)!==canonical(receipt)||canonical(stored.predecessor)!==canonical(head))conflict();
    pointer={key,context,ciphertext_digest:await byteDigest(saved)};
  }
  if(!await contains(bucket,head,pointer,keys)){
    if((head?.context.id||null)!==(receipt.predecessor_id||null))conflict();
    const stored=await readItem(bucket,pointer,keys);if(canonical(stored.predecessor)!==canonical(head))conflict();
    // Compare-and-swap the head. A late write cannot replace a newer head.
    await bucket.put(headKey,JSON.stringify(pointer),{onlyIf:headObject?{etagMatches:headObject.etag}:new Headers({'If-None-Match':'*'}),httpMetadata:{contentType:'application/json'}});
  }
  const currentHead=await bucket.get(headKey);if(!currentHead||!await contains(bucket,await currentHead.json(),pointer,keys))throw new WorkspaceError('receipt_unknown','Receipt head confirmation is pending.',503);
  const currentControl=await externalControl(env,org);if(currentControl.external_generation!==receipt.external_generation)conflict();
  return {p_org:org,p_id:id,p_digest:receipt.digest,p_generation:receipt.external_generation,p_key:key,p_ciphertext_digest:pointer.ciphertext_digest};
}
export async function flushReceipts(env,{rpc=machineRpc}={}){
  if(env.BACKUP_ENABLED!=='true')return {disabled:true};
  const pending=await rpc(env,'wm_receipts_pending',{p_limit:25}),blocked=new Set();let saved=0,failed=0;
  for(const receipt of pending){
    if(blocked.has(receipt.organization_id))continue;
    try{const evidence=await persistReceipt(env,receipt);await rpc(env,'wm_receipt_persisted',evidence);saved++;}
    catch(error){failed++;blocked.add(receipt.organization_id);if(error.code==='receipt_conflict')await rpc(env,'wm_receipt_conflict',{p_org:receipt.organization_id,p_id:receipt.id});}
  }
  return {saved,failed};
}
