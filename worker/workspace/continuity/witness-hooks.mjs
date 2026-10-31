import {canonical} from '../../../src/workspace/domain/contracts.mjs';
import {backupKeys} from './envelope.mjs';
import {readEvidencePointer,fail} from '../backups/objects.mjs';
import {appendWitness,checkWitness} from '../backups/witness.mjs';

export const WITNESS_HOOKS_VERSION='tenant-witness-v1';

// The same source observation always gets the same event ID, including after a
// lost acknowledgement. A different outcome cannot overwrite an earlier one.
async function eventId(identity){
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(identity))));
 bytes[6]=(bytes[6]&15)|80;bytes[8]=(bytes[8]&63)|128;
 const hex=Array.from(bytes.subarray(0,16),n=>n.toString(16).padStart(2,'0')).join('');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
async function retain(env,organization,generation,event){
 if(env.RECOVERY_WITNESS_ENABLED!=='true')return {disabled:true};
 if(!env.RECOVERY_WITNESS||!env.RECOVERY_BYTES)fail('witness_configuration');
 const keys=backupKeys(env),head=await checkWitness(env,organization,generation,{keys});
 return appendWitness(env,organization,generation,{...event,id:await eventId({organization,generation,...event})},{expected:head.head});
}
export async function witnessReceipt(env,receipt,evidence){
 if(env.RECOVERY_WITNESS_ENABLED!=='true')return {disabled:true};
 const context={type:'critical_receipt',organization_id:receipt.organization_id,external_generation:receipt.external_generation,id:receipt.id,sequence:String(receipt.sequence),digest:receipt.digest};
 const pointer=await readEvidencePointer(env.RECOVERY_BYTES,evidence.p_key,context,backupKeys(env),evidence.p_ciphertext_digest);
 return retain(env,receipt.organization_id,receipt.external_generation,{kind:'receipt',source_id:receipt.id,source_digest:receipt.digest,source_pointer:pointer});
}
export async function witnessAttempt(env,permit,phase,{key,context,bytes,digest,ciphertext_digest}){
 if(env.RECOVERY_WITNESS_ENABLED!=='true')return {disabled:true};
 const pointer=await readEvidencePointer(env.RECOVERY_BYTES,key,context,backupKeys(env),ciphertext_digest);
 if(pointer.bytes!==bytes||pointer.plaintext_digest!==digest)fail('witness_source_binding');
 return retain(env,permit.operation.organization_id,permit.attempt.external_generation,{kind:phase==='intent'?'attempt_intent':'attempt_outcome',source_id:permit.operation.id,source_digest:digest,attempt_id:permit.attempt.id,nonce:permit.attempt.dispatch_nonce,phase,source_pointer:pointer});
}
