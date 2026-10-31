import {uuid,canonical} from '../../../src/workspace/domain/contracts.mjs';
import {rpc,machineRpc} from '../database.mjs';
import {backupKeys} from '../continuity/envelope.mjs';
import {putEncrypted,encode} from '../backups/objects.mjs';
import {deny,freezeControl,latestProof,recordPromotion} from './control.mjs';
import {verifyCandidate,verifyRecoveryFiles} from './verify.mjs';
export const RESTORE_COMMANDS=new Set(['restore.request','restore.promote','restore.abandon']);
export function validateRestore(command,input){
 const fields=command==='restore.request'?['manifest_pointer','expected_generation']:command==='restore.promote'?['id','plan_hash','expected_version']:command==='restore.abandon'?['id','expected_version']:[];
 if(!fields.length||!input||Array.isArray(input)||typeof input!=='object'||Object.keys(input).sort().join()!==fields.sort().join())deny('restore_input');
 if(command!=='restore.request'){uuid(input.id);if(command==='restore.promote'&&!/^[a-f0-9]{64}$/.test(input.plan_hash)||!Number.isSafeInteger(input.expected_version)||input.expected_version<1)deny('restore_input');}
 else if(!input.manifest_pointer||encode(input.manifest_pointer).length>4096||!/^[A-Za-z0-9_-]{8,100}$/.test(input.expected_generation||''))deny('restore_input');
 return input;
}
export async function restoreCommand(env,session,org,command,input,key,{human=rpc,machine=machineRpc}={}){
 uuid(org);validateRestore(command,input);if(typeof key!=='string'||!/^[A-Za-z0-9_-]{16,200}$/.test(key))deny('restore_input');
 if(command==='restore.abandon')return human(env,session.access_token,'wm_restore_abandon',{p_org:org,p_id:input.id,p_version:input.expected_version});
 if(command==='restore.request'){
  const j=await human(env,session.access_token,'wm_restore_request',{p_org:org,p_input:input,p_key:key});
  await freezeControl(env,j);return {id:j.id,state:j.state,generation:j.generation};
 }
 await human(env,session.access_token,'wm_restore_status',{p_org:org});
 let j=await machine(env,'wm_restore_context',{p_org:org,p_id:input.id}),proof=await latestProof(env,j);
 if(proof.checkpoint_digest!==j.proof_digest)deny('restore_proof_changed');
 await human(env,session.access_token,'wm_restore_promote',{p_org:org,p_id:j.id,p_hash:input.plan_hash,p_version:input.expected_version,p_proof_digest:proof.checkpoint_digest});
 return completePromotion(env,j,{machine});
}
export async function rehearseRestore(env,org,id,{machine=machineRpc}={}){
 uuid(org);uuid(id);const args={p_org:org,p_id:id},j=await machine(env,'wm_restore_context',args);
 if(j.state!=='requested')return {id,state:j.state};
 await freezeControl(env,j);const proof=await latestProof(env,j);
 const check=async()=>{await machine(env,'wm_restore_context',args);const current=await latestProof(env,j);if(canonical(current)!==canonical(proof))deny('restore_proof_changed');};
 const candidate=await verifyCandidate(env,j,proof,{check});
 const result=await machine(env,'wm_restore_stage',{...args,p_snapshot:candidate.snapshot,p_manifest:candidate.manifest,p_proof:proof,p_files:candidate.files});
 await check();return result;
}
// Also the sole reconciliation path after an uncertain SQL commit/receipt write.
// Same run/hash/immutable key; no replay of source jobs or provider operations.
export async function completePromotion(env,job,{machine=machineRpc}={}){
 const args={p_org:job.organization_id,p_id:job.id};let j=await machine(env,'wm_restore_context',args),proof=await latestProof(env,j);
 if(j.proof_digest!==proof.checkpoint_digest)deny('restore_proof_changed');
 await verifyRecoveryFiles(env,j,{check:async()=>{await machine(env,'wm_restore_context',args);const p=await latestProof(env,j);if(p.checkpoint_digest!==j.proof_digest)deny('restore_proof_changed');}});
 await machine(env,'wm_restore_commit',{...args,p_hash:j.plan_hash,p_proof_digest:proof.checkpoint_digest});
 j=await machine(env,'wm_restore_context',args);proof=await latestProof(env,j);if(proof.checkpoint_digest!==j.proof_digest)deny('restore_proof_changed');
 const context={type:'tenant_restore_promotion',organization_id:j.organization_id,external_generation:j.generation,run_id:j.id,plan_hash:j.plan_hash};
 const receipt=await putEncrypted(env.RECOVERY_BYTES,'tenant-restores/'+j.organization_id+'/'+j.id+'/promotion.bin',encode({format:1,run_id:j.id,plan_hash:j.plan_hash,baseline:j.baseline,proof_digest:j.proof_digest,mode:'restricted_read_only'}),context,backupKeys(env),env.BACKUP_KEY_ID);
 await recordPromotion(env,j,receipt);proof=await latestProof(env,j);if(proof.checkpoint_digest!==j.proof_digest)deny('restore_proof_changed');
 return machine(env,'wm_restore_receipt',{...args,p_hash:j.plan_hash,p_receipt:receipt});
}
export async function restoreStatus(env,session,org,{human=rpc}={}){uuid(org);return human(env,session.access_token,'wm_restore_status',{p_org:org});}
export async function restoreView(env,session,org,id,{human=rpc,machine=machineRpc}={}){
 uuid(org);uuid(id);await human(env,session.access_token,'wm_restore_status',{p_org:org});const j=await machine(env,'wm_restore_context',{p_org:org,p_id:id});let proof=await latestProof(env,j);if(proof.checkpoint_digest!==j.proof_digest)deny();
 await human(env,session.access_token,'wm_restore_status',{p_org:org});
 const data=await machine(env,'wm_restore_view',{p_org:org,p_id:id});
 await human(env,session.access_token,'wm_restore_status',{p_org:org});
 proof=await latestProof(env,j);if(proof.checkpoint_digest!==j.proof_digest)deny();return data;
}




export async function restoreRecords(env,session,org,id,family,offset=0,{human=rpc,machine=machineRpc}={}){
 uuid(org);uuid(id);if(!/^[a-z_]{1,63}$/.test(family)||!Number.isSafeInteger(offset)||offset<0||offset>20000)deny('restore_input');
 await human(env,session.access_token,'wm_restore_status',{p_org:org});
 const j=await machine(env,'wm_restore_context',{p_org:org,p_id:id});let p=await latestProof(env,j);if(p.checkpoint_digest!==j.proof_digest)deny('restore_proof_changed');
 const data=await machine(env,'wm_restore_records',{p_org:org,p_id:id,p_family:family,p_offset:offset});
 await human(env,session.access_token,'wm_restore_status',{p_org:org});p=await latestProof(env,j);if(p.checkpoint_digest!==j.proof_digest)deny('restore_proof_changed');return data;
}
