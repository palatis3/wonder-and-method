import {canonical,uuid,WorkspaceError} from '../../../src/workspace/domain/contracts.mjs';
import {backupKeys} from '../continuity/envelope.mjs';
import {objectBytes,decode,getEncrypted} from '../backups/objects.mjs';
import {checkWitness} from '../backups/witness.mjs';
export function deny(code='restore_evidence'){throw new WorkspaceError(code,'Recovery remains restricted pending verified evidence.',409);}
export async function readControl(env,org){
 uuid(org);if(!env.RECOVERY_CONTROL)deny('restore_control_missing');
 const key='control/'+org+'.json',object=await env.RECOVERY_CONTROL.get(key);const value=decode(await objectBytes(object,8192));
 if(value.organization_id!==org||value.schema_version!==1||typeof object.etag!=='string')deny();
 return {key,etag:object.etag,value};
}
export async function freezeControl(env,job){
 let current=await readControl(env,job.organization_id);
 if(current.value.external_generation===job.generation&&current.value.access_state==='restricted'&&current.value.restore?.run_id===job.id)return current.value;
 if(current.value.external_generation!==job.old_generation||!current.value.recovery_checkpoint)deny('restore_control_changed');
 const value={...current.value,external_generation:job.generation,access_state:'restricted',positive_effects_allowed:false,
 restore:{run_id:job.id,previous_generation:job.old_generation,checkpoint:current.value.recovery_checkpoint}};
 let outcome;try{outcome=await env.RECOVERY_CONTROL.put(current.key,JSON.stringify(value),{onlyIf:{etagMatches:current.etag},httpMetadata:{contentType:'application/json'}});}catch{outcome='unknown';}
 current=await readControl(env,job.organization_id);
 if(canonical(current.value)!==canonical(value))deny(outcome==='unknown'?'restore_freeze_unknown':'restore_control_changed');
 return current.value;
}
export async function latestProof(env,job,{now=()=>Date.now()}={}){
 const {value}=await readControl(env,job.organization_id);
 if(value.external_generation!==job.generation||value.access_state!=='restricted'||value.positive_effects_allowed!==false||value.restore?.run_id!==job.id)deny('restore_control_changed');
 const pointer=value.restore.checkpoint,keys=backupKeys(env);
 if(pointer?.context?.type!=='tenant_recovery_checkpoint'||pointer.context.organization_id!==job.organization_id)deny('restore_checkpoint_missing');
 const proof=decode(await getEncrypted(env.RECOVERY_BYTES,pointer,keys,1048576+8212));
 const allowed=['format','organization_id','control_generation','source_generation','complete','observed_at','valid_until','head','tombstones','holds','revoked_users','withdrawn_approvals','authority_mode','provider_reconciliation'];
 if(!proof||Object.keys(proof).sort().join()!==allowed.sort().join()||proof.format!=='wm-recovery-checkpoint/1'||proof.organization_id!==job.organization_id||proof.control_generation!==job.old_generation||proof.complete!==true||proof.authority_mode!=='all_historical_authority_inactive'||proof.provider_reconciliation!=='required')deny('restore_checkpoint_invalid');
 const until=Date.parse(proof.valid_until),observed=Date.parse(proof.observed_at);
 if(!Number.isFinite(until)||!Number.isFinite(observed)||until<=now()||until>now()+900000||observed>now()+30000||observed<now()-900000)deny('restore_checkpoint_stale');
 for(const name of ['tombstones','holds','revoked_users','withdrawn_approvals'])if(!Array.isArray(proof[name])||proof[name].length>20000||new Set(proof[name]).size!==proof[name].length||proof[name].some(x=>typeof x!=='string'||x.length>200))deny();
 if(proof.holds.some(x=>proof.tombstones.includes(x)))deny('restore_retention_conflict');
 if(!proof.head||proof.head.context?.external_generation!==proof.source_generation)deny('restore_checkpoint_missing');
 const witness=await checkWitness(env,job.organization_id,proof.source_generation,{expected:proof.head,keys});
 if(!witness.anchored||canonical(witness.head)!==canonical(proof.head))deny('restore_latest_tail_changed');
 return {...proof,generation:job.generation,run_id:job.id,checkpoint_digest:pointer.plaintext_digest};
}
export async function recordPromotion(env,job,pointer){
 let c=await readControl(env,job.organization_id);
 if(c.value.external_generation!==job.generation||c.value.access_state!=='restricted'||c.value.restore?.run_id!==job.id)deny('restore_control_changed');
 if(c.value.restore.promotion){if(canonical(c.value.restore.promotion)!==canonical(pointer))deny();return;}
 const value={...c.value,restore:{...c.value.restore,promotion:pointer}};
 let result;try{result=await env.RECOVERY_CONTROL.put(c.key,JSON.stringify(value),{onlyIf:{etagMatches:c.etag},httpMetadata:{contentType:'application/json'}});}catch{result='unknown';}
 c=await readControl(env,job.organization_id);
 if(canonical(c.value)!==canonical(value))deny(result==='unknown'?'restore_promotion_unknown':'restore_control_changed');
}
