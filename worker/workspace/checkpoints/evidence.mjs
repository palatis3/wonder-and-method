import {canonical,WorkspaceError} from '../../../src/workspace/domain/contracts.mjs';
import {byteDigest,backupKeys} from '../continuity/envelope.mjs';
import {encode,decode,getEncrypted} from '../backups/objects.mjs';
import {checkWitness,assessWitnessTail} from '../backups/witness.mjs';
import {readRetentionOverlay} from '../retention/overlay.mjs';
export const deny=(code='checkpoint_evidence')=>{throw new WorkspaceError(code,'Recovery checkpoint publication is blocked pending independent evidence.',409);};
export const hash=x=>byteDigest(encode(x));
export const CONTRACT='wm-live-frontier/2';
// Reviewed semantic families. Future kinds must be classified deliberately.
const RECEIPTS=new Set(('decision.approve decision.withdraw decision.request_changes ads.stop execution.verified engagement.closure invitation.create invitation.revoke invitation.accept member.change authority.assign authority.revoke proposal.withdrawn agreement.amendment_pending agreement.accepted milestone.earned billing.authorized billing.provider_verified hosting.allocated service.started billing.enabled refund.authorized financial.provider_verified refund.observed connection.authorized connection.account_bound connection.disconnected closure.statement_recorded reporting.promote reporting.review reporting.publish lead.save fact.impact delivery.completed inbound.accept inbound.dismiss inbound.retry inbound.route inbound.revoke intake.create_business website.artifact_uploaded analytics.published owner.date.accept owner.date.reject owner.date.withdraw owner.cover.assigned owner.cover.revoked staff.grant.changed operator.grant.changed backup.schedule portal.authority portal.binding portal.request').split(' '));
export function fresh(v,now){const a=Date.parse(v.observed_at),b=Date.parse(v.valid_until);if(!Number.isFinite(a)||!Number.isFinite(b)||a>now+30000||a<now-900000||b<=now||b>a+900000)deny('checkpoint_stale');}
function boundedUnique(xs){const r=[...new Set(xs)].sort();if(r.length>20000||r.some(x=>typeof x!=='string'||x.length>200))deny('checkpoint_overlay_limit');return r;}
export function authorityOverlay(source,now){
 const revoked=new Set(source.users.filter(x=>!x.exists||!x.verified).map(x=>x.id));
 for(const m of source.memberships)if(m.status!=='active'||m.revoked_at)revoked.add(m.user_id);
 for(const o of source.operators)if(o.revoked_at||Date.parse(o.active_until)<=now||!o.capabilities?.length)revoked.add(o.user_id);
 for(const s of source.staff)if(s.revoked_at||Date.parse(s.active_until)<=now)revoked.add(s.user_id);
 const withdrawn=new Set(),map=new Map(source.decisions.map(d=>[d.id,d]));
 for(const d of source.decisions){
  if(!['approve','withdraw','request_changes'].includes(d.decision))deny('checkpoint_decision_kind');
  if(d.decision==='approve')continue;
  let prev=d.supersedes_decision_id,seen=new Set();while(prev){if(seen.has(prev)||!map.has(prev))deny('checkpoint_decision_gap');seen.add(prev);const x=map.get(prev);if(x.revision_id!==d.revision_id)deny('checkpoint_decision_gap');if(x.decision==='approve')withdrawn.add(x.id);prev=x.supersedes_decision_id;}
 }
 return {revoked_users:boundedUnique([...revoked]),withdrawn_approvals:boundedUnique([...withdrawn])};
}
export async function schemaDigest(source){
 const i=source.schema_integrity,c=source.schema_signatures;
 if(!i||typeof i.profile!=='string'||!i.profile||!i.signatures||!c||Object.keys(c).length===0||canonical(Object.keys(i.signatures).sort())!==canonical(Object.keys(c).sort())||Object.values(i.signatures).some(v=>!/^[a-f0-9]{64}$/.test(v)))deny('checkpoint_schema_integrity');
 return hash({columns:c,integrity:i});
}
// The enrolled generation set is an independently qualified completeness assertion.
// It cannot be inferred by enumerating a possibly restored database or bucket.
export function generationSet(root,frontier){
 const gs=root.covered_generations,hs=frontier.witness_heads;
 if(!Array.isArray(gs)||gs.length<1||gs.length>8||new Set(gs).size!==gs.length||gs.some(g=>!/^[A-Za-z0-9_-]{8,100}$/.test(g))||!gs.includes(root.generation)||!hs||canonical(Object.keys(hs).sort())!==canonical([...gs].sort()))deny('checkpoint_generation_coverage');
 for(const g of gs)if(!hs[g]||hs[g].context?.external_generation!==g)deny('checkpoint_generation_head');
 if(canonical(frontier.witness_head)!==canonical(hs[root.generation]))deny('checkpoint_generation_head');
 return gs;
}
export async function verifyHeads(env,org,heads,{prior={},keys=backupKeys(env)}={}){
 if(!heads||Object.keys(heads).length<1||Object.keys(heads).length>8||Object.keys(prior).some(g=>!Object.hasOwn(heads,g)))deny('checkpoint_generation_coverage');
 const checks={};let count=0;
 for(const [g,head] of Object.entries(heads)){
  const checked=await checkWitness(env,org,g,{keys});
  if(!head||!checked.complete_to_genesis||canonical(head)!==canonical(checked.head))deny('checkpoint_latest_head');
  if(prior[g])await checkWitness(env,org,g,{expected:prior[g],keys});
  count+=checked.events.length;if(count>512)deny('checkpoint_total_tail_limit');checks[g]=checked;
 }
 return checks;
}
export async function verifyEvidence(env,org,source,frontier,{expectedWitness,expectedHeads={},expectedRetention,now=Date.now()}={}){
 const generation=source.setup.external_generation,keys=backupKeys(env);
 const checks=await verifyHeads(env,org,frontier.witness_heads,{prior:expectedHeads,keys});
 const check=checks[generation];if(!check)deny('checkpoint_generation_coverage');
 if(expectedWitness)await checkWitness(env,org,generation,{expected:expectedWitness,keys});
 const receipts=Object.fromEntries(source.receipts.map(r=>[r.id,r.digest])),attempts=Object.fromEntries(source.attempts.map(a=>[a.id,{nonce:a.nonce,state:a.state}]));
 const tail={receipts,attempts,retention_receipts:source.retention_receipts};
 if(Object.values(checks).some(c=>assessWitnessTail(c,tail).issues.length))deny('checkpoint_primary_tail_gap');
 const seenReceipts=new Set(),seenRetentions=new Set(),intents=new Set(),outcomes=new Set(),seals=new Set();
 for(const [eventGeneration,checked] of Object.entries(checks))for(const e of checked.events){
  const payload=decode(await getEncrypted(env.RECOVERY_BYTES,e.source_pointer,keys,e.kind==='backup_seal'?2105364:1048576));
  if(e.kind==='receipt'){
   const r=source.receipts.find(x=>x.id===e.source_id);if(!r||!RECEIPTS.has(r.event_type)||r.external_generation!==eventGeneration||r.durability_status!=='durable')deny('checkpoint_receipt_kind_or_state');
   for(const field of ['id','organization_id','event_type','target_id','payload','digest','external_generation','predecessor_id'])if(canonical(r[field])!==canonical(payload.receipt?.[field]))deny('checkpoint_receipt_source_changed');seenReceipts.add(r.id);
  }else if(e.kind==='retention'){
   const r=source.retention_events.find(x=>x.id===e.source_id);if(!r||canonical(r)!==canonical(payload.event)||r.generation!==eventGeneration)deny('checkpoint_retention_source_changed');seenRetentions.add(r.id);
  }else if(e.kind==='attempt_intent'){
   const a=source.attempts.find(x=>x.id===e.attempt_id);if(!a||a.generation!==eventGeneration||payload.operation?.id!==a.operation_id||payload.attempt?.external_generation!==eventGeneration||a.state!=='resolved')deny('checkpoint_attempt_unresolved');intents.add(a.id);
  }else if(e.kind==='attempt_outcome'){
   const a=source.attempts.find(x=>x.id===e.attempt_id);if(!a||a.generation!==eventGeneration||payload.operation_id!==a.operation_id||payload.proof?.settled!==true||payload.proof?.readback_matches!==true||a.state!=='resolved')deny('checkpoint_attempt_unresolved');outcomes.add(a.id);
  }else if(e.kind==='backup_seal'){
   const b=source.backup_seals.find(x=>x.id===e.source_id);if(!b||b.manifest_digest!==e.source_digest||b.snapshot_digest!==e.snapshot_digest||canonical(b.pointer)!==canonical(e.source_pointer))deny('checkpoint_backup_source_missing');seals.add(b.id);
  }else deny('checkpoint_unrecognized_event');
 }
 for(const r of source.receipts)if(!seenReceipts.has(r.id))deny('checkpoint_unwitnessed_receipt');
 for(const r of source.retention_events)if(!seenRetentions.has(r.id))deny('checkpoint_unwitnessed_retention');
 for(const a of source.attempts)if(!checks[a.generation]||a.state!=='resolved'||!intents.has(a.id)||!outcomes.has(a.id))deny('checkpoint_attempt_unresolved');
 for(const b of source.backup_seals)if(!seals.has(b.id))deny('checkpoint_backup_unwitnessed');
 const overlay=await readRetentionOverlay(env,org,{expected:expectedRetention??null});
 if(overlay.epoch!==frontier.retention_epoch||canonical(overlay.head)!==canonical(frontier.retention_head)||Object.keys(overlay.pending).length)deny('checkpoint_retention_incomplete');
 if(overlay.events.length!==source.retention_events.length)deny('checkpoint_retention_gap');
 for(const e of overlay.events)if(!seenRetentions.has(e.id)||source.retention_receipts[e.id]?.digest!==overlay.receipts[e.id])deny('checkpoint_retention_gap');
 for(const h of source.retention_holds){const actual=overlay.holds[h.source_id];if(!actual||actual.held!==h.held||String(actual.version)!==String(h.version))deny('checkpoint_hold_gap');}
 if(Object.keys(overlay.holds).length!==source.retention_holds.length)deny('checkpoint_hold_gap');
 for(const e of source.retention_events.filter(e=>['delete_intent','dispatch','absent'].includes(e.kind))){
  const j=source.retention_jobs.find(j=>j.id===e.job_id);
  if(!j||j.source_id!==e.source_id||canonical(j.inventory)!==canonical(e.payload.inventory)||j.attempt_nonce!==e.payload.attempt_nonce)deny('checkpoint_retention_job_binding');
  if(e.kind==='delete_intent'&&(e.id!==j.intent_id||e.generation!==j.generation)||e.kind==='dispatch'&&(e.id!==j.dispatch_id||e.generation!==j.generation)||e.kind==='absent'&&(e.id!==j.observation_id||!j.attempted_at||e.generation!==(j.observer_generation||j.generation)||j.state!=='purged'))deny('checkpoint_retention_job_binding');
 }
 if(source.retention_jobs.some(j=>['authorized','intent','attempted','unknown','observed_absent'].includes(j.state)||j.attempted_at&&j.state!=='purged'))deny('checkpoint_deletion_unresolved');
 const tombstones=boundedUnique(overlay.purged),holds=boundedUnique(Object.entries(overlay.holds).filter(([,x])=>x.held).map(([id])=>id));
 if(tombstones.some(id=>holds.includes(id)))deny('checkpoint_hold_purge_conflict');
 // Legacy legal holds/purges require an exact independent typed overlay too.
 for(const r of source.legacy_retention){const prefix={file:'workspace',message:'message',request:'request',export:'export'}[r.target_type],id=prefix&&prefix+':'+r.target_id;if((r.legal_hold||r.state==='purged')&&(!id||(r.legal_hold&&!holds.includes(id))||(r.state==='purged'&&!tombstones.includes(id))))deny('checkpoint_legacy_overlay_missing');}
 return {head:check.head,heads:frontier.witness_heads,retention_head:overlay.head,tombstones,holds,...authorityOverlay(source,now)};
}
