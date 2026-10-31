# Physical retention and legal holds

This bounded module plans, independently records and executes one exact private object deletion at a time. It supplies executable Supabase/R2 adapters and local/fake-provider tests. **No live deletion, account operation, provider request, remote migration or credential creation was performed.** Do not enable production deletion until the shared fences, independent initialization and storage qualification below are complete.

## Owned files and scope

- worker/workspace/retention/storage.mjs
- worker/workspace/retention/overlay.mjs
- worker/workspace/retention/service.mjs
- src/workspace/retention-ui.mjs
- tests/workspace/retention.test.mjs
- db/workspace/migrations/20261031155622_retention_workflows.sql (CLI-generated; not remotely applied)
- This guide.

Five new private RLS tables: retention_jobs, retention_holds, retention_events, retention_durability, retention_commands. Raw public/anon/authenticated/service_role grants are denied; narrowly granted typed RPCs enforce current authority. Job inventory/policy/attempt identity is immutable. Events, independent durability evidence and stable-key command results are immutable. Legal hold projections have expected versions, with immutable local and independent hold/release facts.

The migration classifies all five new tables as tenant evidence in wm.tenant_backup_registry. Restored copies must remain inert. It does not amend the already handed-off restore registry: restore correctly rejects these additional families until main provides the reviewed typed schema/coverage amendment.

## Exact supported targets

A plan contains one source_id, current expected record version, explicit policy_version and explicit cutoff. No legal retention period is inferred. The source must exist in the target tenant and have creation/seal time at or before cutoff; cutoff cannot be in the future.

| Source | Authoritative inventory |
|---|---|
| workspace:FILE_UUID | Hashed sealed workspace object: workspace-sealed/<tenant>/<file>/<sha256>. |
| inbound:EMAIL_UUID:ATTACHMENT_UUID | stored_unscanned attachment on an actual tenant-owned inbound route; exact inbound/<email>/<attachment>/<sha256>. Unassigned/ambiguous global email is excluded. |
| export:EXPORT_UUID | Sealed customer ZIP with frozen storage_target, exact customer-exports/<tenant>/<export>/<digest>.zip, archive checksum and size; Supabase or qualified R2 export binding. |

The inventory binds backend, bucket, immutable key, content SHA-256, actual byte size, record version and time. Bytes are read and hashed before intent, and again just before the final dispatch fences. Input cannot select arbitrary buckets, URLs or SQL. Byte bounds are 1–32 MiB per target.

Quarantine/unhashed/mutable keys, source object versions without an established immutable-ID contract, other buckets, backup/receipt objects and offline copies are unsupported and fail closed. Deleting the canonical workspace object does not prove its original quarantine copy is gone. This is deliberately **exact-object retention**, not a claim that every copy of a file has been erased.

Material content replacement must use a fresh immutable source ID/key. An administrative writer bypassing this rule defeats the lack of a provider conditional-delete API; qualification must enforce it. Record-version changes during an attempt do not authorize deleting a different hash/key.

No generic row erasure or arbitrary body deletion exists. After verified absence:
- Workspace availability gets deleted_at only when the current sealed key/hash still match.
- The exact inbound attachment's state becomes purged; email body/correspondence remains.
- The exact export becomes cancelled/unavailable; immutable export snapshot/hash/history remains.
- retention_actions receives the minimal explicit tombstone.
Financial, agreement, approval, audit, other-service and unrelated file records are preserved.

## Human authority and lock order

Commands are retention.plan, retention.hold, retention.execute, retention.reconcile and retention.cancel. All require current verified direct recovery operator capability, an authoritative live session and recent MFA. No customer membership or restored grant suffices. Stable keys bind the exact input; expected versions reject stale decisions.

Planning only creates an operator preview. Execute is a separate deliberate confirmation of that exact plan. It captures the current reviewer/session/assignment digest and a five-minute lease, fenced by current local/external recovery generations. Reconciliation grants read-only observation, never a fresh DELETE. A hold/release is an explicit versioned decision with a reason; there is no automatic expiration or guessed statutory period.

Lock order: **tenant_guards → retention job → hold projection/history**. Human mutations and machine boundaries use this order. The blocker checks the same captured/copying file predicate as wm_backup_hold; it uses the private query for human calls because the existing public hold RPC is machine-only. It also blocks when:
- Current local or independently retained legal hold exists.
- Existing retention_actions records a legal hold.
- A customer export is preparing bytes.
- A non-attention active restore exists; promoted recovery data conservatively keeps the tenant held.
- The original target/version/inventory, actor/session/grant or generation changes.

The complete tenant is held during requested restore because it may not yet have decoded source references. Restore candidate ciphertext is never a deletion target. Releasing an old restore run for later source GC requires main's qualified lifecycle integration; it is not automatic here.

A hold arriving after DELETE was registered reports uncertain_inflight=true. The module cannot atomically cancel a request already accepted by Storage. If later reads show absence, the result says hold_race=true and explicitly does not promise preservation. A hold can still be recorded against a known already-purged target, with already_absent=true. It does not recreate bytes. A conflicting hold/purge pair must be deliberately resolved before restore checkpoint publication.

## Independent intent, dispatch and absence protocol

A restored database alone cannot certify the deletion/hold tail. Independently initialized RECOVERY_CONTROL must contain:

~~~json
{
  "schema_version":1,
  "organization_id":"TENANT_UUID",
  "external_generation":"CURRENT_GENERATION",
  "access_state":"open",
  "retention_epoch":"INDEPENDENTLY_APPROVED_EPOCH",
  "retention_head":null
}
~~~

The module **never invents genesis from an empty/restored DB**. Main must provision and independently retain this epoch/head through the approved recovery process. Existing other control properties are preserved by ETag CAS.

Each immutable encrypted event lives in RECOVERY_BYTES at retention/<tenant>/<epoch>/<event-id>.bin. The authenticated record contains event, predecessor, epoch, monotonic sequence and semantic digest. It uses the existing AES-GCM envelope with retained keys. A dispatch event additionally has a unique writer claim; conflicting concurrent writers cannot both acquire it. Exact key GET/auth/hash readback resolves accepted writes whose acknowledgment was lost. Orphan events cannot be silently reparented under the same ID.

Event kinds:
- delete_intent: exact inventory, policy/cutoff, actor and stable attempt nonce.
- dispatch: independently registered possible physical attempt.
- hold / release: versioned hold state.
- cancel: whether cancellation was definitely before any registered attempt.
- absent: exact inventory, attempt nonce and bounded absence observations; no unsupported attribution claim.

Head advance is a CAS of independent control, with direct readback and ancestry checks. The existing shared RECOVERY_WITNESS then acknowledges the event as a typed receipt using its retained source envelope. SQL saves the overlay and witness pointers. **Both independent intent and dispatch facts must be acknowledged before DELETE.**

Detailed order:

1. Current SQL/independent control/hold checks; read exact source bytes and verify hash/size.
2. Persist immutable intent, advance independent head, obtain shared witness acknowledgment, register durability.
3. Recheck fences; SQL registers attempt exactly once and creates stable dispatch event.
4. Persist independent dispatch claim and shared witness acknowledgment. Reusing an existing dispatch fact never grants another DELETE.
5. Re-read/hash source bytes; recheck SQL actor/session/grant/generation, target/version and holds; recheck independent control/holds/cancellation.
6. Send the one exact DELETE.
7. Observe exact absence twice through authenticated direct reads. Timeout/present/ambiguous absence remains unknown or attention; do not retry DELETE.
8. Persist independently witnessed absence event, read absence again and finish locally. Only then is the exact object marked purged.

Postgres, independent control, witness and provider deletion have no common transaction. A hold can race after the last check; the response and history preserve that uncertainty. A crash after dispatch registration but before sending may conservatively leave unknown. It is never silently treated as safe to resend.

Unknown outcome reconciliation uses the same target/attempt and only reads. Even a known provider denial remains attention; this module has no automatic retry of a registered DELETE. A future retry design would need separate reviewed current authorization and proof of nonexecution. Crossing recovery generations likewise requires the later recovery-authority bridge, not reuse of old leases.

Missing source before an attempt is attention, not successful purge. Absence after an attempt proves only observed absence—not who deleted it, that a hold was satisfied, or that backups/offline copies are gone.

## Provider adapters and qualification

Supabase: authenticated direct GET of the private object; only a bounded structured NoSuchKey response is absence. A missing bucket, permission error, HTML error, redirect or generic 404 is not accepted as absence. DELETE uses /storage/v1/object/<bucket> with {"prefixes":["one exact key"]}; response alone is not completion. Server credentials never enter UI or plan evidence.

R2: exact get(key) plus bounded body/hash verification, followed by one delete(key). The native delete contract is not an atomic hash/ETag/legal-hold conditional delete. Null direct reads are absence. Provider lock/permission errors remain actionable uncertainty/attention.

Required runtime gates: RETENTION_FENCES_VERSION=retention-v1, RETENTION_IMMUTABLE_STORAGE_QUALIFIED=true, RECOVERY_WITNESS_ENABLED=true, private RECOVERY_BYTES/RECOVERY_WITNESS/RECOVERY_CONTROL, retained BACKUP_KEYS/BACKUP_KEY_ID, and the exact current CUSTOMER_EXPORT_STORAGE_ID/binding for export objects. These labels are operator qualification declarations, not proof obtainable from opaque bindings. They must not be enabled merely to make tests pass.

Official contracts checked: [Supabase remove](https://supabase.com/docs/reference/javascript/storage-from-remove), [official StorageFileApi implementation](https://github.com/supabase/storage-js/blob/master/src/packages/StorageFileApi.ts), [R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [R2 consistency](https://developers.cloudflare.com/r2/reference/consistency/). No provider operation was executed to qualify them.

## Restore checkpoint adapter and mandatory shared amendments

retentionCheckpointOverlay(env,org,{expected}) requires a separately retained expected anchor, authenticates the independent chain to genesis and verifies every checked event's receipt in the shared witness. Missing acknowledgments, forks, rollback or traversal limits fail closed. It returns:
- Exact independent head/epoch.
- tombstones plus tombstone_targets containing bound key/hash/size/version inventories.
- Current independently retained holds.
- Unresolved intents/dispatches.
- complete=false while any deletion is unresolved.
- Explicit statement that it supplies no authority/withdrawal completeness.

No DB query is used to derive that tail. A valid old chain is not sufficient without independently retained latest evidence. Administrative compromise/rollback of every online copy remains outside the guarantee; independent account/key/checkpoint custody must be qualified.

Main's full restore checkpoint publisher must combine this output with independently verified authority/withdrawal evidence, check the actual target inventory/immutable-ID contract, and bind the current head. It must never copy local retention_actions alone and set complete=true. Unresolved intentions block checkpoint completion. Hold/purge conflicts need explicit resolution. Existing restore checkpoint format must not be broadened implicitly.

**Shared receipt classification amendment:** these retention source receipts live under retention/... and their source IDs are retention event IDs. The existing backup tail comparison currently enumerates critical_receipts and operation_attempts. Main must explicitly include retention_durability/retention_events source identity/digest evidence in that comparison and recovery reconciliation. Do not weaken receipt checks or pretend these IDs are missing ordinary command receipts. Without this amendment, backup tail assessment will conservatively report gaps.

**Restore coverage amendment:** the five newly classified tenant tables require reviewed typed restore replicas/coverage. Existing restore validation correctly rejects them until amended. Historical deletion jobs/leases must remain inert and must not reenter this executor after restore.

## Required shared wiring

1. Route RETENTION_COMMANDS before generic command validation to retentionCommand. Retain Origin/CSRF/authentication/body limits and stable-key handling. No generic storage-delete endpoint.
2. Wire retentionStatus and retentionViews/retentionFormInput. Display both local and independent hold state, pending durability, exact inventory, policy/cutoff and in-flight uncertainty. Recovery operators only.
3. Execute a bounded single target from the explicit command. Do not add an unattended policy-duration scheduler. Reconcile only through retention.reconcile/read-only process path.
4. Shared file upload/seal/download, export preparation/download, backup capture/copy and restore/GC paths must honor wm_retention_object_fenced under the tenant guard. Once an attempt is registered the key remains fenced; no writer may recreate it. Establish/settle existing claims before enablement.
5. Backup capture must not race from queued to captured after retention's last source-hold check. Its guard-protected capture needs the retention fence; retention already respects captured/copying backup references. Hold candidate/source bytes during active restore. New copies/links need the same fence.
6. Freeze or journal current legal-hold/revocation intent through the independent recovery path. A local hold blocks immediately, but a failure to persist independently is reported pending; no claim is made that an unacknowledged local-only fact survives total primary loss.
7. Wire the checkpoint/source-classification amendments above and qualify independent epoch initialization/custody and immutable storage.
8. Preserve retention evidence under separately determined legal policy; this module never purges its own receipts, finance or audit data.

## Bounds and unsupported behavior

One exact object per plan/attempt; 32 MiB maximum read; 5-minute machine lease; 50 recent status jobs; 256 independent events and 256 shared-witness events per checked generation. Over-limit histories require a later reviewed segmented/checkpoint compaction path, never a truncated “complete” tail. There is no second DELETE in automatic reconciliation.

No arbitrary SQL/row erasure, legal duration defaults, mutable/unhashed/quarantine deletion, backup/offline destruction, bulk bucket deletion, public URL, customer email, provider-account changes, global restore, fresh recovery-authority bridge, or release approval. Body tombstoning is intentionally not included; only safe exact object availability metadata changes.

Local PGlite and fake buckets model races and failures; they do not establish actual provider locking, administrative separation, maximum Worker memory/CPU, real PostgreSQL concurrency, browser layout/accessibility or live storage qualification. Those checks remain main's release work.

## Executed module validation

On 2026-10-31, `node --test tests/workspace/retention.test.mjs` completed with 21 passed, zero failed/skipped (33.624 seconds): 19 tests exercising actual local PGlite and two pure adapter/CAS tests. WORKSPACE_TEST_DATABASE_URL was checked unset before execution. All provider/storage/control operations used deterministic fakes; no live deletion ran. Five `node --check` checks passed for the three Worker modules, UI and test file.

Coverage includes tenant/MFA/RLS negatives, cutoff and exact inventory, independent intent/dispatch/absence receipts, local and independent legal holds, backup/restore holds, missing witness, lost acknowledgments, unknown-present read-only reconciliation, in-flight hold uncertainty, missing/corrupt/drifting bytes, revoked authority, stale local projections and anchored rollback, conflicting CAS writers, exact Supabase/R2 shapes, routed inbound and ZIP availability changes, immutable plan evidence, cancellation, strict inputs and escaped HTML. Fixture races are not evidence of real PostgreSQL concurrency or browser/provider qualification.
