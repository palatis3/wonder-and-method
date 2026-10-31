import {canonical,uuid} from '../../../src/workspace/domain/contracts.mjs';
import {backupKeys} from '../continuity/envelope.mjs';
import {decode,getEncrypted} from '../backups/objects.mjs';
import {readControl} from '../restore/control.mjs';
import {anchor,recordAt,qualified} from './service.mjs';
import {deny,fresh,schemaDigest,verifyEvidence,hash} from './evidence.mjs';

// No provider mutation or primary DB read. readRetainedAnchor is a REQUIRED
// independently custodied adapter, never a local row, request field or fallback.
// Call before freeze CAS and every proof use after freeze. Compare control_etag
// in the freeze CAS; do not re-read a different control and use this validation.
export async function validateRecoveryCheckpoint(env,job,{readRetainedAnchor,phase='frozen',now=()=>Date.now()}={}){
 uuid(job.organization_id);uuid(job.id);
 if(typeof readRetainedAnchor!=='function'||!['before_freeze','frozen'].includes(phase)||!job.manifest_pointer)deny('checkpoint_consumer_input');
 const org=job.organization_id,keys=backupKeys(env),c=await readControl(env,org);
 const q=await qualified(env,org,c.value,keys,now(),phase==='frozen'?{recoveryJob:job}:{});
 if(q.root.generation!==job.old_generation)deny('checkpoint_consumer_generation');
 const expected=await readRetainedAnchor(org,q.root.source_instance);
 if(!expected)deny('checkpoint_retained_anchor_required');
 const a=await anchor(env,org,q.root.source_instance,keys);
 if(canonical(a.pointer)!==canonical(expected)||canonical(c.value.checkpoint_publication)!==canonical(expected))deny('checkpoint_consumer_anchor');
 const r=await recordAt(env,expected,keys);
 const proofPointer=phase==='frozen'?c.value.restore.checkpoint:c.value.recovery_checkpoint;
 if(r.organization_id!==org||r.source_instance!==q.root.source_instance||canonical(r.source_pointer)!==canonical(q.source_pointer)||canonical(r.enrollment_pointer)!==canonical(c.value.checkpoint_enrollment)||canonical(r.proof)!==canonical(proofPointer)||canonical(r.proof)!==canonical(c.value.recovery_checkpoint)||canonical(r.witness_heads)!==canonical(q.frontier.witness_heads)||r.schema_digest!==q.frontier.schema_digest||r.source_sequence!==q.frontier.sequence||canonical(r.retention_head)!==canonical(q.frontier.retention_head))deny('checkpoint_consumer_binding');
 if(r.source_snapshot?.context?.type!=='checkpoint_source_snapshot'||r.source_snapshot.context.organization_id!==org||r.source_snapshot.context.external_generation!==q.root.generation||r.source_snapshot.context.id!==r.id||r.source_snapshot.plaintext_digest!==q.frontier.source_digest)deny('checkpoint_consumer_source');
 const source=decode(await getEncrypted(env.RECOVERY_BYTES,r.source_snapshot,keys,1048576+8212)),s=source.setup,f=q.frontier;
 if(source.format!=='wm-checkpoint-source/1'||source.organization_id!==org||s.id!==r.setup_id||s.id!==f.setup_id||String(s.version)!==String(r.setup_version)||String(s.version)!==String(f.setup_version)||s.enrollment_id!==q.root.id||s.source_instance!==q.root.source_instance||s.external_generation!==q.root.generation||s.owner_digest!==f.owner_digest||String(s.authority_version)!==String(f.authority_version)||String(s.recovery_generation)!==String(f.recovery_generation)||!Number.isFinite(Date.parse(s.expires_at))||Date.parse(s.expires_at)<=now()||await schemaDigest(source)!==f.schema_digest)deny('checkpoint_consumer_source');
 const evidence=await verifyEvidence(env,org,source,f,{expectedHeads:r.witness_heads,expectedRetention:r.retention_head,now:now()});
 const proof=decode(await getEncrypted(env.RECOVERY_BYTES,proofPointer,keys,1048576+8212));fresh(proof,now());
 const fields=['format','organization_id','control_generation','source_generation','complete','observed_at','valid_until','head','tombstones','holds','revoked_users','withdrawn_approvals','authority_mode','provider_reconciliation'];
 if(canonical(Object.keys(proof).sort())!==canonical(fields.sort())||proof.format!=='wm-recovery-checkpoint/1'||proof.organization_id!==org||proof.control_generation!==q.root.generation||proof.source_generation!==q.root.generation||proof.complete!==true||proof.observed_at!==f.observed_at||Date.parse(proof.valid_until)>Math.min(Date.parse(f.valid_until),Date.parse(q.root.valid_until),Date.parse(s.expires_at))||proof.authority_mode!=='all_historical_authority_inactive'||proof.provider_reconciliation!=='required'||canonical(proof.head)!==canonical(evidence.head))deny('checkpoint_consumer_proof');
 for(const name of ['tombstones','holds','revoked_users','withdrawn_approvals'])if(canonical(proof[name])!==canonical(evidence[name]))deny('checkpoint_consumer_overlay');
 const boundaries=[...source.operators,...source.staff,...source.authorities,...source.covers,...source.portal_grants].flatMap(x=>['active_until','starts_at','ends_at'].map(k=>Date.parse(x[k]))).filter(Number.isFinite);
 if(boundaries.some(t=>t>Date.parse(f.observed_at)&&t<=now()))deny('checkpoint_time_boundary');
 const manifestPointer=job.manifest_pointer,b=source.backup_seals.find(b=>canonical(b.pointer)===canonical(manifestPointer));
 if(!b||manifestPointer.context?.type!=='tenant_backup_manifest'||manifestPointer.context.organization_id!==org||manifestPointer.context.backup_id!==b.id||manifestPointer.plaintext_digest!==b.manifest_digest)deny('checkpoint_consumer_backup');
 const generation=manifestPointer.context.external_generation,head=evidence.heads[generation];if(!head)deny('checkpoint_generation_head');
 // Authenticating the manifest here binds the selected backup; full chunk/file
 // verification remains verifyCandidate's job and cannot be skipped.
 const manifest=decode(await getEncrypted(env.RECOVERY_BYTES,manifestPointer,keys,2097152+8212));
 if(manifest.organization_id!==org||manifest.backup_id!==b.id||manifest.external_generation!==generation||manifest.snapshot_digest!==b.snapshot_digest||manifest.format!=='wm-tenant-backup/1'||manifest.restore_authority!=='none')deny('checkpoint_consumer_backup');
 const binding={publication:expected,source:q.source_pointer,enrollment:c.value.checkpoint_enrollment,manifest:manifestPointer,source_head:head,current_heads:evidence.heads};
 const selection_digest=await hash(binding),freeze_binding={selection_digest,manifest_pointer:manifestPointer,publication:expected,source:q.source_pointer,enrollment:c.value.checkpoint_enrollment};
 if(phase==='frozen'&&(!c.value.restore.consumer_binding||canonical(c.value.restore.consumer_binding)!==canonical(freeze_binding)))deny('checkpoint_consumer_frozen_selection');
 const current=await readControl(env,org);
 if(current.etag!==c.etag||canonical(current.value)!==canonical(c.value)||canonical(await readRetainedAnchor(org,q.root.source_instance))!==canonical(expected)||canonical((await anchor(env,org,q.root.source_instance,keys)).pointer)!==canonical(expected))deny('checkpoint_consumer_changed');
 // Close the verification window with another full exact-head check. An event
 // after return still requires producer invalidation and caller CAS/use fences.
 await verifyEvidence(env,org,source,f,{expectedHeads:r.witness_heads,expectedRetention:r.retention_head,now:now()});fresh(proof,now());
 const finalControl=await readControl(env,org);if(finalControl.etag!==c.etag||canonical(finalControl.value)!==canonical(c.value))deny('checkpoint_consumer_changed');
 return {proof:{...proof,source_generation:generation,head},checkpoint_digest:proofPointer.plaintext_digest,selection_digest,freeze_binding,binding,control_etag:c.etag};
}
