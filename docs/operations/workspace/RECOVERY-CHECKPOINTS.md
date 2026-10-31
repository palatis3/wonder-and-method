# Independent recovery checkpoint publisher

The publisher is executable with a qualified independent live-source frontier. **Current shared hooks do not establish that frontier. Production publication must remain blocked until the producer contract below is implemented and qualified.** A working database, a matching generation, encrypted receipt bytes, a feature flag or an internally consistent witness prefix does not prove that every authority mutation was captured or that the queried database is the current primary.

Owned surfaces are `worker/workspace/checkpoints/{evidence,service,consumer}.mjs`, `tests/workspace/checkpoints.test.mjs`, this guide and CLI-created `db/workspace/migrations/20261031164659_recovery_checkpoints.sql`. No shared source, restore registry, applied migration, provider, key or account was changed. Supabase CLI v2.106.0 generated the migration locally; it was not remotely applied.

## What is implemented

The module uses current direct recovery owner/MFA/recent authentication to enroll a bounded standing setup; captures a tenant-scoped authority/evidence projection using real Postgres RPCs; checks encrypted independent source attestations, exact current witness and typed retention history; produces the exact `wm-recovery-checkpoint/1` payload accepted by `restore/control.mjs`; AES-GCM seals it with the existing keyring; reads back immutable bytes; advances a separate encrypted publication anchor and the existing control object using conditional writes; and records sanitized local observations. It never opens restricted recovery control or grants recovered authority.

The proof contains exactly: format, organization_id, control_generation, source_generation, complete, observed_at, valid_until, head, tombstones, holds, revoked_users, withdrawn_approvals, authority_mode and provider_reconciliation. Authority mode is always `all_historical_authority_inactive`; provider reconciliation is always `required`. Publication is not restore promotion and cannot authorize replay, billing, advertising, email or publication effects.

The timestamp is copied from the independently authenticated source frontier, never renewed from the publisher's clock or a new database query. Validity is at most 15 minutes from that observation, bounded further by frontier/enrollment/setup expiry and upcoming authority time boundaries. Crossing a grant start/expiry boundary after source attestation requires a new attestation. Reusing one frontier returns the same immutable proof; it does not extend freshness.

## Independent producer contract required before enablement

Existing `persistReceipt`, witness hooks and retention overlay verify retained bytes and witnessed actions. `assessWitnessTail` explicitly limits its claim to wired events. They do not independently certify primary identity or absence of unwitnessed commits. This module therefore consumes, and does not manufacture, the following artifacts.

1. An independently qualified enrollment pointer is pinned under `CHECKPOINT_TRUST_ROOTS[tenant].enrollment_pointer` and must equal `RECOVERY_CONTROL`'s `checkpoint_enrollment`. Its encrypted context is `{type:'checkpoint_enrollment', organization_id, id}`. Its payload is:

```json
{
  "format":"wm-checkpoint-enrollment/1", "contract":"wm-live-frontier/2",
  "id":"<enrollment UUID>", "organization_id":"<tenant UUID>",
  "source_instance":"<independently verified primary identity>",
  "generation":"<trusted live generation>",
  "schema_digest":"<SHA256 of canonical {columns:source.schema_signatures,integrity:source.schema_integrity}>",
  "covered_generations":["<every independently inventoried generation, including current>"],
  "write_ahead_invalidation":true, "all_authority_sources":true,
  "primary_restart_fenced":true, "independent_latest_custody":true,
  "restored_database_denied":true, "genesis_publication":null,
  "valid_until":"<explicit qualification expiry>"
}
```

These booleans are signed/sealed assertions by a trusted enrollment procedure, not evidence obtained from flags. The publisher exposes no function to mint them. That procedure must verify deployed producer/consumer code, exact primary and custody identities, all relevant mutation routes, and fail-closed startup/restore behavior before signing. An administrator controlling all key/storage/configuration domains can forge or roll back evidence; this module makes no administrator-proof claim.

2. A separately trusted live-source attester publishes immutable chained frontiers. Before **any** covered authority, withdrawal, deletion, hold, owner/setup, relevant Auth identity, provider-attempt or source-schema change is allowed to commit/become effective, the integration must CAS independent control to `checkpoint_source_pending:true` and invalidate `recovery_checkpoint`/its usable publication pointer. It must also serialize recovery freeze against that invalidation. Fail closed if this independent write cannot be confirmed. An after-commit receipt alone leaves an unsafe window. Changes outside the app, global staff/Auth changes, physical restore, source failover/restart, credential reassignment and schema/deployment changes need equivalent fences; otherwise enrollment cannot honestly assert completeness.

3. After the actual current primary commits, all required receipts and outcomes are independently retained and witnessed, and no covered work is unpublished, the attester obtains `wm_checkpoint_source` from that **independently authenticated primary endpoint** and seals its exact returned digest. It cannot accept a connection chosen by a restored tenant row. Its context is `{type:'live_source_frontier', organization_id, external_generation, source_instance, sequence}`. Payload:

```json
{
  "format":"wm-live-source-frontier/1", "contract":"wm-live-frontier/2",
  "organization_id":"...", "source_instance":"...", "generation":"...",
  "enrollment_id":"...", "setup_id":"...", "setup_version":1,
  "owner_digest":"...", "authority_version":1, "recovery_generation":1,
  "source_digest":"<SHA256 of exact source_text UTF-8 bytes>",
  "schema_digest":"...", "sequence":"1", "previous":null,
  "witness_head":"<current-generation exact authenticated pointer object>",
  "witness_heads":{"<each covered generation>":"<exact current authenticated head pointer>"},
  "retention_head":null, "retention_epoch":"...",
  "complete":true, "unpublished_mutations":false,
  "observed_at":"...", "valid_until":"..."
}
```

Pointers above are JSON pointer objects, not strings in actual requests. Sequence increases by exactly one; subsequent `previous` is the exact retained predecessor pointer. The attester CAS-publishes `checkpoint_source` and clears pending only after all commitments are complete, retaining the full control object and current generation. A stalled/unresolved mutation, missing outcome, rollback or unknown event cannot be omitted or marked complete. Fresh observations with unchanged source bytes still require a new attested sequence/time; the publisher cannot generate them.

4. The scheduler supplies an independently retained **prior publication anchor** to every call. That anchor must survive primary recovery and cannot be reconstructed from `checkpoint_publications`, arbitrary restored configuration or a potentially stale listing. Do not reset it to null after failure. Null is only the explicitly qualified genesis anchor. The publisher also maintains a separate AES-authenticated head in `RECOVERY_WITNESS`, and compares it with the supplied anchor. Custody of both domains and off-device latest checkpoints requires qualification.

5. Main must wire restore freeze/latest-proof consumption so a pending or invalidated source cannot be consumed, and so the exact publication/source/enrollment pointers remain bound to the proof. The new checkpoints/consumer.mjs validator supplies these checks, but main must wire it into shared restore/control before freeze and every proof use. The legacy reader alone is insufficient. The new adapter also returns a selected backup source head separately from the current authority frontier; format compatibility alone does not certify missing invalidation/custody. Retain existing restricted states whenever the contract is incomplete.

**These five conditions are current enablement blockers.** Do not create a synthetic enrollment in staging/live as a shortcut. The test enrollment/frontier helper is deliberately confined to the test file and fake buckets. No production attester, qualification ceremony, new key, credential or live artifact was created here.

## Local setup and source RPCs

`wm_checkpoint_command(org,'checkpoint.setup',input,key)` and `checkpointCommand` accept only:

```json
{"enabled":true,"expected_version":0,"source_instance":"...",
 "enrollment_id":"<UUID>","qualification":"<reviewed evidence reference>",
 "expires_at":"<explicit timestamp>"}
```

Setup requires a current direct recovery assignment, existing verified identity, current session, MFA and recent auth. Covers cannot supply recovery authority. Expiry is limited to 24 hours and the current direct/staff grant. Versioned setup changes and disablement require explicit current owner action. A standing grant permits bounded automation without relying on the original browser session remaining logged in; current owner identity/grant digest, expiry, tenant authority version and recovery/external generation are checked at every source read. Revoke/regrant changes the digest/version and cannot silently revive old setup/frontiers. Fresh setup authorization and fresh independent attestation are required.

`wm_checkpoint_source(org)` is machine-only and locks the tenant guard before a static, single-statement projection. It includes memberships, operators, tenant authorities, relevant global staff and verified-user existence, cover assignments/revocations, portal grants, decisions, critical receipts, attempt states/contexts, sealed backup pointers, typed retention events/holds/jobs/receipt pointers and legacy retention rows. It also binds the exact current registry signatures and local setup/guard. No arbitrary imported SQL, user-supplied table selector or restored authority is executed. Receipt payloads/dispatch contexts can contain private customer information; source text is server-only and must not enter logs, status responses or customer exports. Auth/staff facts are read only for scoped principals; they are not imported into a recovered tenant.

The source text is bounded and hashed as exact UTF-8 SQL JSON text. The publisher checks that hash before parsing, then compares it to the independent frontier. It repeats the source read before and after publication. Schema changes/unclassified tables fail locally; a schema signature different from the independently approved enrollment fails externally. Future authority families require source-contract review and projection updates, not merely adding a registry entry or changing a flag. source.schema_integrity contains the exact reviewed wm_restore.integrity_profile() and complete immutable registry signatures. The original migration invokes the later integrity gate at runtime and authenticates these values together with the column map in root/frontier schema_digest. Missing gate, missing signatures or any CHECK/FK/unique index/predicate/deferrability drift blocks. Enrollment qualification must still separately pin/review deployed functions, triggers, RLS and Worker mutation coverage: the structural fingerprint does not attest those.

`wm_checkpoint_status` returns only setup id/version/enabled/expiry and up to 20 publication IDs/times. It does not return source bytes, owner digests, storage pointers, keys or a claim that local status proves freshness. Both new tables use private RLS and deny raw access; only explicit human/machine RPC execution is granted. `wm_checkpoint_record` is an idempotent local observation after independent publication, never the latest-truth authority.

## Evidence and overlay rules

The publisher requires the current witness head exactly equal the attested head, a complete walk to genesis, and ancestry through the retained previous witness head. It compares both directions: each witnessed receipt/attempt/retention source must exist and match locally, and every selected local receipt/attempt/retention event must be witnessed. It authenticates actual source envelopes and compares immutable receipt fields and typed retention event bytes, not just labels. Backup-seal events require matching current local sealed manifest/snapshot/pointer evidence.

Critical event families are explicitly enumerated in `evidence.mjs`. Unrecognized semantic event types stop publication. A recognized type is still checked against retained bytes. All selected provider attempts must be resolved and have both authenticated intent and settled matching outcome; current cancelled-before-dispatch/no-effect cases without independently retained terminal evidence are deliberately unsupported rather than silently omitted. Main can add a reviewed terminal-negative outcome contract later.

Retention uses the actual `retention` witness kind and `retention_event` envelope context. `source.retention_receipts` follows the existing snapshot tail mapping `{eventId:{digest,key,generation,kind}}`. The entire independent retention chain must agree with local typed events and hold versions. Unknown/in-flight deletion, missing absence receipt, unpublished hold/release, hold-versus-purge conflict and legacy legal hold/purge without an exact independent typed overlay all block. A purge marker is not proof of causal attribution or deletion of backup/offline copies.

`revoked_users` conservatively includes currently revoked/inactive memberships, revoked/expired/capability-empty operators, revoked/expired scoped staff and missing/unverified scoped identities. It is a restriction marker, never an authority grant. `withdrawn_approvals` contains prior approve-decision UUIDs reached through explicit withdraw/request-changes supersession chains; broken or cross-revision chains fail closed. A later approve does not erase a prior withdrawal. Every historical authority remains inactive regardless of those lists; fresh customer/operator/provider authorization belongs to separate normal workflows.

## Publication, concurrency and lost acknowledgments

`publishCheckpoint(env,org,{expected,rpc,now})` requires the expected retained anchor property even at genesis. It creates deterministic proof/publication keys from the exact frontier pointer and setup version. Existing authenticated bytes win under create-only writes; no caller can reparent an orphan. AES-GCM uses existing envelope nonces/key IDs and authenticated contexts.

The immutable publication record includes the proof pointer, exact enrollment/source pointers, source sequence, setup/version, witness/retention heads and predecessor publication. The independent encrypted publisher head advances by ETag CAS first; then the control object CAS installs `recovery_checkpoint` and `checkpoint_publication` without discarding other fields. Every write gets exact readback. A lost acknowledgment with exact accepted bytes is recognized; disagreement is blocked. A candidate anchor committed before control publication remains an explicit orphan/pending state. Only retry of the same source and same predecessor can reconcile it automatically. An unrelated newer candidate or changed source requires reviewed reconciliation; no blind reparent/retry.

Postgres, RECOVERY_BYTES, RECOVERY_WITNESS and RECOVERY_CONTROL are not one atomic transaction. Source/control/witness checks before and after publication reduce races but do not replace the required write-ahead invalidation contract. A post-publication failure can leave independent evidence present while local observation is missing; treat it as uncertain until exact readback/reconciliation, never manufacture a new timestamp. No code here reopens recovery after failure.

`publishCheckpoints` handles at most 10 candidate setups (default 5), requires an external `readRetainedAnchor(tenant)` callback, and isolates failures within that batch. It returns a next_after cursor ordered by tenant UUID, including when a tenant is blocked. Main must carry that cursor between bounded batches and restart at null after exhaustion; repeatedly selecting only the first page is not a complete multi-tenant scheduler. Do not use local database publication history as the callback's authority.

## Integration and limits

Main owns all shared routing, scheduler, producer and restore wiring. Add authenticated setup/status routes with current Origin/CSRF/session/body controls, and the machine publication stage only after the independent contracts are qualified. Supply existing RECOVERY_BYTES/RECOVERY_WITNESS/RECOVERY_CONTROL and retained BACKUP_KEYS/BACKUP_KEY_ID. Root metadata pins an authenticated enrollment pointer; mere presence of these bindings is not proof of administrative independence.

Backup registry explicitly classifies `checkpoint_setups` and `checkpoint_publications` as tenant history. Main must amend the frozen typed restore registry/replicas for both tables. Historical setup rows remain disabled/inert; old publication records cannot replace current independent anchors. No shared restore registry was changed in this task.

Hard limits: 20,000 projected rows, 1 MiB source/proof/publication plaintext, 8 enrolled generations, 256 witness events per generation with 512 aggregate events, and 256 retention events, 64 source-frontier ancestry steps, 15-minute maximum proof freshness, 24-hour maximum local standing setup, 20 status records and 10 candidates per batch. Bounds fail closed; no truncated prefix is complete. Database JSON construction and Worker resource ceilings still need actual production-scale qualification.

Current conservative unsupported boundaries include the evolving media_budget.* critical-event family pending its separate semantic/source review, witness chains beyond the bounded full-genesis scan, unclassified critical event kinds, terminal-negative attempts without an independent outcome, unrepresented legacy purges/holds, source failover/recovery without fresh qualified enrollment, missing latest-anchor custody and the unimplemented live-source/invalidation producer contract. These are explicit blockers, not completed full disaster recovery. No live/off-device/account-loss/concurrency/browser/provider qualification was performed.

## Original handoff validation (before the extension)

On 2026-10-31, `node --test tests/workspace/checkpoints.test.mjs` completed with **15 passed, zero failed/skipped**, in 22.789 seconds. Fourteen tests use actual local PGlite/current repository migrations and one tests authority/withdrawal overlay semantics directly. Tests use real AES-GCM, immutable-object, receipt, witness, retention and restore-reader code with deterministic fake buckets/control. Independent enrollment/live-source attestations are synthetic fixtures, not qualification evidence. WORKSPACE_TEST_DATABASE_URL was checked unset before running.

Three `node --check` checks passed for evidence.mjs, service.mjs and checkpoints.test.mjs. Coverage includes current MFA/private grants, restore-format compatibility, missing enrollment/anchor, pending source, exact lost-ack reconciliation, nonrenewable proof times, monotonic frontier and anchor rollback, current owner revocation/regrant, primary mismatch/missing bytes/unknown receipts, unresolved attempts, control-CAS races, stale frontier/source denial, explicit approval withdrawals, typed hold agreement, purge/hold conflict and standing-setup expiry. A temporary parse failure occurred while shared migration files were changing; a subsequent read-only migration reload and the final full focused run passed. No shared file was changed to resolve it.

No live provider, database, credential, off-device/account-loss, browser or real concurrent-Postgres exercise was performed. Passing these tests establishes module behavior under the fixture contracts; it does not certify the missing production attester/invalidation/custody contracts.


## Multi-generation extension and consumer wiring

The contract is now **wm-live-frontier/2**. A v1 enrollment/frontier cannot be consumed. root.covered_generations is an explicit independent completeness assertion, not a list inferred from local tables or R2 listing. Each current frontier seals an exact witness_heads map with exactly that enrolled key set, including the current generation. witness_head is retained as an exact alias of witness_heads[root.generation]. Each entry is a non-null authenticated current head, not a last-known prefix. The publisher walks every bounded chain to genesis, checks prior heads remain ancestors, checks all primary receipts/attempts/sealed backups/retention evidence bidirectionally, and refuses unknown generations, omitted heads, excess chains or unresolved outcomes. No generation is rewritten or filtered away. Empty streams are deliberately unsupported by this contract; do not invent placeholder heads.

Retention's shared independent overlay verifies intent -> dispatch -> absence chronology, immutable inventory, nonce and unique dispatch claim. The checkpoint additionally matches each event to the exact current primary job ID, source, inventory, attempt nonce, intent/dispatch/observation IDs, original dispatch generation and separate observer generation. An absence must correspond to the job's purged state and original attempted_at. Observer reauthorization never authorizes a DELETE here. Original and observer streams must both be independently attested; a prior generation may still receive a historical outcome, which invalidates the prior latest proof until a new frontier includes it. Holds conflicting with purges or any unresolved job block publication.

The immutable publication now retains source_snapshot (private encrypted exact SQL JSON UTF-8), schema_digest and witness_heads alongside current source/enrollment/proof pointers. This enables a consumer to authenticate source evidence during primary unavailability without calling a restored database. It is not fresh evidence by itself: the current independent control/frontier, retained anchor and 15-minute bound remain mandatory. Source snapshots include private identity/history fields and must never appear in customer exports, logs, UI or arbitrary downloads. Keep their keys/bytes with the other private recovery evidence and retention holds.

New API:

```js
import {validateRecoveryCheckpoint} from './checkpoints/consumer.mjs';
const checked = await validateRecoveryCheckpoint(env, job, {
  phase: 'before_freeze', // then 'frozen' at every subsequent proof use
  readRetainedAnchor: independentlyCustodiedLatestPublication,
  now: () => Date.now()
});
// job: organization_id, id, old_generation, generation, manifest_pointer
// result: proof, checkpoint_digest, selection_digest, freeze_binding, binding, control_etag
```

readRetainedAnchor(org, sourceInstance) must return the exact independently retained publication pointer, never a caller-provided pointer, local publication row, bucket-listing result, or fallback to null. Consumer checks it against the encrypted publisher head and exact control.checkpoint_publication, and authenticates control.checkpoint_enrollment/source/recovery_checkpoint and the publication's immutable source bytes. It verifies all current attested generation heads and current retention state, derived revocation/withdrawal overlays, enrollment/setup/time boundaries and source/schema binding. It does not call SQL, mint grants or perform writes. Missing independent producer/custody blocks use; no synthetic flags enable production.

The returned proof preserves the existing wm-recovery-checkpoint/1 field shape. control_generation stays the current authority generation; source_generation/head are selected from the exact job.manifest_pointer's independently witnessed backup generation. The consumer requires that precise manifest in the authenticated source backup seals and witness stream, fetches/authenticates its manifest bytes, and checks backup ID/tenant/generation/snapshot digest. Full backup chunk/file/schema validation remains mandatory in verifyCandidate. This selection does not label the old backup head current global authority. binding contains publication/source/enrollment/manifest/source_head/current_heads; selection_digest commits to those exact objects. checkpoint_digest remains the immutable authority proof plaintext digest, not a hash of a fabricated replacement pointer. Pin the exact manifest and selection digest to the restore plan/run; a different backup or changed frontier requires a fresh approved plan, never silent substitution.

Main integration requirements (shared files intentionally untouched):

1. In freezeControl call this validator with before_freeze, then use its exact control_etag in the freeze CAS. Do not validate and then CAS a newly read unrelated control. Preserve enrollment/source/publication/recovery_checkpoint pointers; set restore.consumer_binding to the exact returned freeze_binding in that SAME freeze CAS. The consumer rejects a frozen run with absent or different consumer_binding (including selection_digest and manifest_pointer), even if the substitute backup is otherwise valid and witnessed. On lost acknowledgment, exact readback only; a different accepted freeze must block. Existing recovery invalidation must be serialized against this CAS.
2. In latestProof and every rehearsal/promotion/download/use boundary, call with frozen using the same immutable job/manifest and independently custodied anchor. The frozen control must have restricted access, positive_effects_allowed=false, exact run/new generation and previous_generation. Return checked.proof with the existing run/generation/checkpoint_digest metadata expected by downstream code; separately compare the pinned selection_digest. Do not also apply the legacy assumption source_generation === old_generation.
3. Do not remove verifyCandidate's exact backup seal/manifest/chunk/file checks. Source head selection covers prior backup generation; current authority/withdrawal/tombstone overlays remain from the current frontier. Any changed head in any enrolled generation, even if the selected backup stream stayed unchanged, blocks.
4. Keep proof reads and use under existing tenant recovery/control fences. No multi-store read can prevent a mutation after validation returns. The producer must independently invalidate before the mutation becomes effective, and the caller must recheck at each boundary/CAS. This adapter is not a global atomic transaction or a revocation mechanism for already released bytes.

Structural binding relies on main's 20261031171018_recovery_schema_integrity.sql installed after the authorized original checkpoint migration. Runtime references are deliberately fail-closed if absent. Do not change the immutable registry to make drift pass; reviewed changes require a new profile and independently approved enrollment. The checkpoint migration creates no second registry and changes no shared integrity functions.

Still missing: the trusted live-primary attester and write-ahead invalidation producer, independent current-generation inventory, independently custodied latest anchor, deployment/function/trigger/RLS coverage qualification, actual off-device custody and shared restore call-site integration. This extension supplies verification, not these attestations or deployment. All automated evidence here uses synthetic enrolled fixtures, local PGlite and deterministic fake storage only.


## Final extension validation and pause handoff

2026-10-31: `node --test tests/workspace/checkpoints.test.mjs` finished on the final saved code with **26 passed, zero failed/skipped**, 139.201 seconds while main ran broader tests. Twenty-five tests instantiate actual local PGlite; one tests the authority overlay directly. Four `node --check` commands passed for evidence.mjs, service.mjs, consumer.mjs and checkpoints.test.mjs. WORKSPACE_TEST_DATABASE_URL was checked unset. All storage, independent enrollment/source attestations and custody callbacks in tests are deterministic synthetic fixtures; no live calls or credential access occurred.

New coverage: two-generation original dispatch/current observer linkage; unchanged original generation; missing historical heads; immutable SQL inventory and forged-source mismatch rejection; same-generation orphan absence; unchanged-column CHECK, FK, unique predicate and deferrability drift; missing integrity gate; older-backup selection before/after freeze; missing frozen selection binding; substitution of another otherwise-valid witnessed backup; control enrollment/source/publication/proof substitution; stale proof; concurrent control invalidation; and a changed historical head with unchanged current head. Existing authority, withdrawal, retention conflict, lost-ack, rollback, source-denial and expiry assertions remain.

During iteration a shared retention redeclaration temporarily blocked imports; main fixed it without edits here. Consumer tests identified a late control-check window and a missing-binding error-classification issue; both are fixed and included in the final passing run. The retention inventory fixture now asserts main's immutable SQL protection instead of trying to bypass it.

Only the six authorized checkpoint surfaces were written. The original migration was edited under main's explicit confirmation that it remained unapplied/untracked; no new migration was created for this extension. Git status could not be established: git -C reported Permission denied while direct allowed file reads/writes worked. File hashes identify the handoff; no clean-worktree claim is made.

Paused at the user's request after this bounded extension. No producer/attester follow-up started. Main still owns shared consumer wiring and the independent producer/invalidation/custody qualification. No commits, pushes, remote applies, provider/account actions, real keys, customer messages, browser checks or actual concurrent-Postgres/off-device drills were performed here.
