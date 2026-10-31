import {canonical,uuid,WorkspaceError} from '../../../src/workspace/domain/contracts.mjs';
import {backupKeys,byteDigest,sealBytes,openBytes} from './envelope.mjs';
import {externalControl} from './receipts.mjs';
import {witnessAttempt} from './witness-hooks.mjs';
const encoder=new TextEncoder();
const fail=()=>{throw new WorkspaceError('attempt_evidence_unavailable','Independent action evidence needs attention.',503);};
export async function journalAttempt(env,permit,phase,proof=null){
 const org=uuid(permit.operation.organization_id),attempt=uuid(permit.attempt.id),nonce=uuid(permit.attempt.dispatch_nonce),generation=permit.attempt.external_generation;
 if(!/^[A-Za-z0-9_-]{8,100}$/.test(generation||'')||!['intent','outcome'].includes(phase)||env.BACKUP_ENABLED!=='true'||!env.RECOVERY_BYTES)fail();
 // Outcomes from an older generation must still be retained for reconciliation.
 // Only fresh dispatch intents require current open independent control.
 if(phase==='intent'){const control=await externalControl(env,org);if(control.external_generation!==generation||control.access_state!=='open')fail();}
 const payload=phase==='intent'?{operation:permit.operation,attempt:permit.attempt,context:permit.context||null,scope:permit.scope||null}:{operation_id:permit.operation.id,attempt_id:attempt,dispatch_nonce:nonce,proof};
 const plain=encoder.encode(canonical(payload));if(plain.length>524288)fail();
 const digest=await byteDigest(plain),context={type:'provider_attempt',organization_id:org,external_generation:generation,id:attempt,nonce,phase,digest};
 const key=`attempts/${org}/${generation}/${attempt}/${nonce}/${phase}/${phase==='intent'?'record':digest}.bin`;
 const bucket=env.RECOVERY_BYTES,keys=backupKeys(env);let stored=await bucket.get(key);
 if(!stored){
  const bytes=await sealBytes(plain,context,keys,env.BACKUP_KEY_ID);
  try{await bucket.put(key,bytes,{onlyIf:new Headers({'If-None-Match':'*'}),httpMetadata:{contentType:'application/octet-stream'}});}catch{/* A committed write can lose its acknowledgement; exact readback is authoritative. */}
  stored=await bucket.get(key);
 }
 if(!stored||stored.size>1048576)fail();
 const bytes=new Uint8Array(await stored.arrayBuffer()),verified=await openBytes(bytes,context,keys);
 if(await byteDigest(verified)!==digest)fail();
 const evidence={key,digest,ciphertext_digest:await byteDigest(bytes)};
 await witnessAttempt(env,permit,phase,{...evidence,context,bytes:plain.length});return evidence;
}
