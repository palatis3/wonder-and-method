import {canonical,uuid} from '../../../src/workspace/domain/contracts.mjs';
import {machineRpc,rpc as userRpc} from '../database.mjs';
import {backupKeys,byteDigest,sealBytes,openBytes} from '../continuity/envelope.mjs';
import {encode,decode,objectBytes,getEncrypted,putEncrypted} from '../backups/objects.mjs';
import {readControl} from '../restore/control.mjs';
import {CONTRACT,deny,hash,fresh,verifyEvidence,schemaDigest,generationSet} from './evidence.mjs';
const LIMIT=1048576,MAX_CHAIN=64;
const anchorContext=(org,source)=>({type:'checkpoint_publisher_head',organization_id:org,source_instance:source});
export async function anchor(env,org,source,keys){const key=`checkpoints/${org}/${source}/head.bin`,o=await env.RECOVERY_WITNESS.get(key);if(!o)return {key,etag:null,pointer:null};return {key,etag:o.etag,pointer:decode(await openBytes(await objectBytes(o,16384),anchorContext(org,source),keys)).pointer};}
export async function recordAt(env,p,keys){const r=decode(await getEncrypted(env.RECOVERY_BYTES,p,keys,LIMIT+8212));if(p.context?.type!=='checkpoint_publication'||p.context.id!==r.id||p.context.organization_id!==r.organization_id||p.key!==`checkpoints/${r.organization_id}/${r.source_instance}/${r.id}.bin`)deny('checkpoint_publication_binding');return r;}
export async function qualified(env,org,control,keys,now,{recoveryJob}={}){
 let trusted;try{trusted=JSON.parse(env.CHECKPOINT_TRUST_ROOTS||'{}')[org];}catch{deny('checkpoint_trust_missing');}
 if(!trusted?.enrollment_pointer||canonical(control.checkpoint_enrollment)!==canonical(trusted.enrollment_pointer))deny('checkpoint_trust_missing');
 const p=trusted.enrollment_pointer;if(p.context?.type!=='checkpoint_enrollment'||p.context.organization_id!==org)deny();
 const root=decode(await getEncrypted(env.RECOVERY_BYTES,p,keys,LIMIT+8212));
 if(root.format!=='wm-checkpoint-enrollment/1'||root.organization_id!==org||root.id!==p.context.id||root.contract!==CONTRACT||root.write_ahead_invalidation!==true||root.all_authority_sources!==true||root.primary_restart_fenced!==true||root.independent_latest_custody!==true||root.restored_database_denied!==true||!Number.isFinite(Date.parse(root.valid_until))||Date.parse(root.valid_until)<=now)deny('checkpoint_source_unqualified');
 const frozen=recoveryJob&&control.access_state==='restricted'&&control.positive_effects_allowed===false&&control.external_generation===recoveryJob.generation&&control.restore?.run_id===recoveryJob.id&&control.restore.previous_generation===recoveryJob.old_generation&&root.generation===recoveryJob.old_generation;
 if(!(recoveryJob?frozen:control.access_state==='open'&&control.external_generation===root.generation)||control.checkpoint_source_pending!==false||!control.checkpoint_source)deny('checkpoint_source_pending');
 const sp=control.checkpoint_source;if(sp.context?.type!=='live_source_frontier'||sp.context.organization_id!==org||sp.context.external_generation!==root.generation||sp.context.source_instance!==root.source_instance)deny('checkpoint_source_binding');
 const frontier=decode(await getEncrypted(env.RECOVERY_BYTES,sp,keys,LIMIT+8212));fresh(frontier,now);
 if(frontier.format!=='wm-live-source-frontier/1'||frontier.contract!==CONTRACT||frontier.organization_id!==org||frontier.source_instance!==root.source_instance||frontier.generation!==root.generation||frontier.enrollment_id!==root.id||frontier.complete!==true||frontier.unpublished_mutations!==false||!/^[1-9][0-9]*$/.test(frontier.sequence||'')||sp.context.sequence!==frontier.sequence||frontier.schema_digest!==root.schema_digest)deny('checkpoint_source_unqualified');
 generationSet(root,frontier);return {root,frontier,source_pointer:sp};
}
export async function publishCheckpoint(env,org,options={}){
 uuid(org);if(!Object.hasOwn(options,'expected'))deny('checkpoint_retained_anchor_required');
 const {expected,rpc=machineRpc,now=()=>Date.now()}=options,keys=backupKeys(env);if(!env.RECOVERY_BYTES||!env.RECOVERY_WITNESS||!env.RECOVERY_CONTROL)deny('checkpoint_configuration');
 let c=await readControl(env,org);const q=await qualified(env,org,c.value,keys,now());
 let a=await anchor(env,org,q.root.source_instance,keys),prior=expected?await recordAt(env,expected,keys):null;
 if(expected&&(!prior||prior.organization_id!==org||prior.source_instance!==q.root.source_instance))deny('checkpoint_anchor_binding');
 if(expected===null&&q.root.genesis_publication!==null)deny('checkpoint_anchor_required');
 let replay=false;
 if(canonical(a.pointer)!==canonical(expected)){
  if(!a.pointer)deny('checkpoint_anchor_rollback');const current=await recordAt(env,a.pointer,keys);
  if(canonical(current.previous)!==canonical(expected)||canonical(current.source_pointer)!==canonical(q.source_pointer))deny('checkpoint_anchor_changed');replay=true;
 }
 const raw=await rpc(env,'wm_checkpoint_source',{p_org:org});
 if(typeof raw.source_text!=='string'||new TextEncoder().encode(raw.source_text).length>LIMIT||await byteDigest(new TextEncoder().encode(raw.source_text))!==raw.digest)deny('checkpoint_primary_bytes');
 const source=JSON.parse(raw.source_text),s=source.setup,f=q.frontier;
 if(source.organization_id!==org||source.format!=='wm-checkpoint-source/1'||s.source_instance!==q.root.source_instance||s.enrollment_id!==q.root.id||s.external_generation!==q.root.generation||s.id!==f.setup_id||String(s.version)!==String(f.setup_version)||s.owner_digest!==f.owner_digest||String(s.authority_version)!==String(f.authority_version)||String(s.recovery_generation)!==String(f.recovery_generation)||raw.digest!==f.source_digest||await schemaDigest(source)!==f.schema_digest||Date.parse(s.expires_at)<=now())deny('checkpoint_primary_frontier_mismatch');
 if(prior){if(BigInt(f.sequence)<BigInt(prior.source_sequence)||BigInt(f.sequence)===BigInt(prior.source_sequence)&&canonical(prior.source_pointer)!==canonical(q.source_pointer))deny('checkpoint_source_rollback');
  if(BigInt(f.sequence)>BigInt(prior.source_sequence)){
   let p=q.source_pointer,matched=false;for(let i=0;p&&i<MAX_CHAIN;i++){if(canonical(p)===canonical(prior.source_pointer)){matched=true;break;}const x=decode(await getEncrypted(env.RECOVERY_BYTES,p,keys,LIMIT+8212));if(p.context?.type!=='live_source_frontier'||p.context.organization_id!==org||p.context.sequence!==x.sequence||x.organization_id!==org||x.source_instance!==s.source_instance||x.generation!==s.external_generation||!x.previous||BigInt(x.sequence)!==BigInt(x.previous.context.sequence)+1n)deny('checkpoint_source_gap');p=x.previous;}if(!matched)deny('checkpoint_source_gap');
  }
 }
 const evidence=await verifyEvidence(env,org,source,f,{expectedHeads:prior?.witness_heads||{},expectedRetention:prior?.retention_head,now:now()});
 const boundaries=[...source.operators,...source.staff,...source.authorities,...source.covers,...source.portal_grants].flatMap(x=>['active_until','starts_at','ends_at'].map(k=>Date.parse(x[k]))).filter(Number.isFinite);
 if(boundaries.some(t=>t>Date.parse(f.observed_at)&&t<=now()))deny('checkpoint_time_boundary');
 const validUntil=new Date(Math.min(Date.parse(f.valid_until),Date.parse(f.observed_at)+900000,Date.parse(s.expires_at),Date.parse(q.root.valid_until),...boundaries.filter(t=>t>now()))).toISOString();
 const proof={format:'wm-recovery-checkpoint/1',organization_id:org,control_generation:s.external_generation,source_generation:s.external_generation,complete:true,observed_at:f.observed_at,valid_until:validUntil,head:evidence.head,tombstones:evidence.tombstones,holds:evidence.holds,revoked_users:evidence.revoked_users,withdrawn_approvals:evidence.withdrawn_approvals,authority_mode:'all_historical_authority_inactive',provider_reconciliation:'required'};fresh(proof,now());
 const id=await hash({org,source:q.source_pointer,setup:s.id,version:s.version}),context={type:'tenant_recovery_checkpoint',organization_id:org,external_generation:s.external_generation,id};
 const pointer=await putEncrypted(env.RECOVERY_BYTES,`checkpoints/${org}/${s.source_instance}/${id}.proof.bin`,encode(proof),context,keys,env.BACKUP_KEY_ID,{max:LIMIT});
 const sourcePointer=await putEncrypted(env.RECOVERY_BYTES,`checkpoints/${org}/${s.source_instance}/${id}.source.bin`,new TextEncoder().encode(raw.source_text),{type:'checkpoint_source_snapshot',organization_id:org,external_generation:s.external_generation,id},keys,env.BACKUP_KEY_ID,{max:LIMIT});
 const record={id,organization_id:org,source_instance:s.source_instance,source_sequence:f.sequence,source_pointer:q.source_pointer,enrollment_pointer:c.value.checkpoint_enrollment,setup_id:s.id,setup_version:s.version,source_snapshot:sourcePointer,schema_digest:f.schema_digest,witness_heads:evidence.heads,witness_head:evidence.head,retention_head:evidence.retention_head,proof:pointer,previous:expected};
 let publication;
 if(prior&&canonical(prior.source_pointer)===canonical(q.source_pointer)){publication=expected;if(canonical(prior.proof)!==canonical(pointer))deny('checkpoint_same_frontier_conflict');}
 else publication=await putEncrypted(env.RECOVERY_BYTES,`checkpoints/${org}/${s.source_instance}/${id}.bin`,encode(record),{type:'checkpoint_publication',organization_id:org,id},keys,env.BACKUP_KEY_ID,{max:LIMIT});
 // Re-read live SQL and independent heads. No separate REST pages fabricate a snapshot.
 const again=await rpc(env,'wm_checkpoint_source',{p_org:org});if(again.digest!==raw.digest||again.source_text!==raw.source_text)deny('checkpoint_source_changed');
 const before=await readControl(env,org);if(canonical(before.value.checkpoint_source)!==canonical(q.source_pointer)||before.value.checkpoint_source_pending!==false||before.value.external_generation!==s.external_generation||before.value.access_state!=='open'||canonical(before.value.checkpoint_enrollment)!==canonical(c.value.checkpoint_enrollment))deny('checkpoint_control_changed');
 await verifyEvidence(env,org,source,f,{expectedHeads:evidence.heads,expectedRetention:evidence.retention_head,now:now()});
 if(!replay&&canonical(a.pointer)!==canonical(publication)){
  const bytes=await sealBytes(encode({pointer:publication}),anchorContext(org,s.source_instance),keys,env.BACKUP_KEY_ID);
  try{await env.RECOVERY_WITNESS.put(a.key,bytes,{onlyIf:a.etag?{etagMatches:a.etag}:new Headers({'If-None-Match':'*'})});}catch{/* Exact readback resolves a lost acknowledgement. */}
 }
 a=await anchor(env,org,s.source_instance,keys);if(canonical(a.pointer)!==canonical(publication))deny('checkpoint_anchor_cas');
 const next={...before.value,recovery_checkpoint:pointer,checkpoint_publication:publication};
 try{await env.RECOVERY_CONTROL.put(before.key,JSON.stringify(next),{onlyIf:{etagMatches:before.etag},httpMetadata:{contentType:'application/json'}});}catch{/* Never retry blindly; verify the exact accepted pointer and source. */}
 c=await readControl(env,org);if(canonical(c.value)!==canonical(next))deny('checkpoint_control_cas');
 fresh(proof,now());if((await rpc(env,'wm_checkpoint_source',{p_org:org})).digest!==raw.digest)deny('checkpoint_source_changed');
 await verifyEvidence(env,org,source,f,{expectedHeads:evidence.heads,expectedRetention:evidence.retention_head,now:now()});
 await rpc(env,'wm_checkpoint_record',{p_org:org,p_input:{id,setup_id:s.id,source_digest:raw.digest,source_sequence:f.sequence,proof_digest:pointer.plaintext_digest,pointer:publication,observed_at:proof.observed_at,valid_until:proof.valid_until}});
 return {state:'published',id,anchor:publication,proof:pointer,valid_until:proof.valid_until};
}
export async function checkpointCommand(env,token,org,input,key,{rpc=userRpc}={}){uuid(org);if(!input||Object.keys(input).sort().join()!==['enabled','expected_version','source_instance','enrollment_id','qualification','expires_at'].sort().join()||typeof input.enabled!=='boolean'||!Number.isSafeInteger(input.expected_version)||input.expected_version<0)deny('checkpoint_input');uuid(input.enrollment_id);return rpc(env,token,'wm_checkpoint_command',{p_org:org,p_command:'checkpoint.setup',p_input:input,p_key:key});}
export async function checkpointStatus(env,token,org,{rpc=userRpc}={}){return rpc(env,token,'wm_checkpoint_status',{p_org:uuid(org)});}
export async function publishCheckpoints(env,{rpc=machineRpc,readRetainedAnchor,limit=5,after=null,...options}={}){
 if(typeof readRetainedAnchor!=='function'||!Number.isInteger(limit)||limit<1||limit>10)deny('checkpoint_retained_anchor_required');
 if(after!==null)uuid(after);const rows=await rpc(env,'wm_checkpoint_candidates',{p_limit:limit,p_after:after});let published=0,blocked=0;
 for(const row of rows){try{const expected=await readRetainedAnchor(row.organization_id);await publishCheckpoint(env,row.organization_id,{...options,rpc,expected});published++;}catch{blocked++;}}
 return {published,blocked,next_after:rows.length===limit?rows.at(-1).organization_id:null};
}
