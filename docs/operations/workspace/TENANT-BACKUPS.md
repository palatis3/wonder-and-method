# Tenant backup producer and latest-tail witness core

This is the B13 **tenant data/file producer and witness core**. It is not an import, tenant restore/promotion, full project DR, retention deletion tool, customer download, provider replay system or release approval. Shared UI/API, scheduler and journal-witness hooks are now implemented locally; release qualification remains outstanding.

Owned implementation:

- `worker/workspace/backups/objects.mjs`: existing AES-GCM envelope reuse, bounded object reads, immutable encrypted writes and existing-journal pointer bridge.
- `worker/workspace/backups/witness.mjs`: encrypted immutable events and CAS head append/check; source-byte authentication; tail comparison.
- `worker/workspace/backups/service.mjs`: typed request/status adapters, private file byte adapters and leased chunk producer.
- `worker/workspace/backups/offline.mjs`: caller-supplied offline loaders/keyring verification, no SQL restore or secret output.
- `src/workspace/backup-ui.mjs`, `tests/workspace/backups.test.mjs`.
- CLI-generated `db/workspace/migrations/20261031144939_tenant_backups.sql`.

No existing continuity/envelope/dispatcher/export/other modules are edited. The migration was generated locally with `supabase migration new tenant_backups`; it has not been applied remotely.

## Authority and workflow

`backup.request` accepts exactly `{qualification, key_id}` and a stable key. Qualification has exactly `bytes_identity`, `witness_identity`, `custody_reference`, `witness_hooks_version`: nonsecret references an operator has reviewed. `backup.cancel` accepts `{id, expected_version}`. The request/status RPCs require the current recovery operator, current session and recent MFA. A customer membership or delivery cover cannot create or inspect a backup. The direct operator assignment, original session, generation and one-day preparation deadline remain current during machine work; grant changes, revoked session/actor, recovery freeze or epoch changes block further use. Cancellation fences new machine work but does not delete encrypted objects already written.

These references are **operator-verified configuration claims**, not identity evidence derivable from opaque R2 bindings. Runtime compares the request qualification exactly with server `BACKUP_QUALIFICATION`. It also checks current independent `RECOVERY_CONTROL` around copying/sealing. No function mints membership, approvals, spending authority, provider operations or customer export access.

New private RLS tables: `tenant_backup_jobs`, `tenant_backup_parts`, `tenant_backup_registry`. No raw grants to public/anon/authenticated/service_role. Typed functions use explicit grants. Capture fields, manifest and part receipts are immutable; mutable queue/status fields are separate. There is no tenant-row replay API.

## Exact capture and coverage

The machine acquires the tenant guard and executes `wm.backup_snapshot` as one **STABLE SQL statement snapshot**, including its read-only dynamic SELECTs. It does not claim consistency across REST pages. It stores immutable snapshot text, file references, schema coverage and tail identities in one transaction. Later `wm_backup_page` calls retrieve fixed 256 KiB **byte slices of that stored snapshot**, not fresh table queries.

The initial inspected migration set classifies **134 wm tables**, including the three producer tables. Every physical wm table must have an explicit classification; an unknown table, missing table or changed registered column/type/nullability signature blocks capture. Main must update classifications through a reviewed migration when introducing schema, not silently bypass the check. The stored schema profile is `20261031144939` / producer `tenant-backups-v1`; obtain the matching reviewed schema/functions/migrations separately for any later recovery.

Tenant tables retain complete scoped row history: memberships/operator assignments as historical evidence, named authorities/decisions/withdrawals/STOPs, provider/account/budget reservations, operations/outbox/attempts/observations, critical and command receipts, billing/settlements, notification reservations/notices/observations, reports/imports/analytics, files/rights, owner work, recovery and retention evidence. Arbitrary provider execution or restored authority is prohibited regardless of what historical rows say.

Explicit related selectors preserve:

- Tenant-bound profiles, catalog definitions and delivery templates as dependencies.
- Accepted **and private triage** inbound rows/files only when there is an actual `inbound_routes` tenant reference; linked anomalies and signed ingress events follow those known IDs. Unassigned or ambiguous global triage is not attributed to a tenant by sender/email. Its recovery belongs to the separate global ingress/project plan.
- Relevant notification channel settings, matching recipient suppression hashes, and webhook facts tied to the tenant's exact provider message IDs.
- Stripe ingress/readback rows only through exact known tenant object bindings, not all events in a shared Stripe account.

Global Auth accounts/sessions, staff, intake/prospect/creation-grant state, global capacity and global source inventories are **excluded**, never recreated. Global ingress without a proven tenant binding is excluded. Legacy shared `provider_connections` secrets and ephemeral OAuth/session tickets are excluded. Tenant `integration_credentials` retain identifiers/state/key version but omit ciphertext/refresh material; invitation and reply-route token hashes are omitted. A later restore must reconnect providers, rotate routes/invitations and obtain fresh authority. It must not import historical grants as active merely because they appear in the snapshot.

Rows are stored as PostgreSQL JSON **text strings** inside the table arrays, with explicit schema signatures and UTC timestamp serialization. This preserves exact numeric lexemes without JS float conversion. A later reader must parse row strings using the recorded database types/decimal-aware logic.

Limits: **20,000 included rows total; 8 MiB per table; 16 MiB snapshot; 500 source objects; 256 MiB combined source bytes; 32 MiB per source**. Any overflow, unclassified source or capture error becomes explicit attention with no truncated successful snapshot. Referenced legacy `export_jobs.object_key` lacks a qualified byte adapter and deliberately blocks capture until classified; it is not silently ignored.

## Actual file bytes, holds and encryption

Source descriptors bind immutable ID/version/key/length/SHA-256. The producer copies released workspace files, already hashed quarantine bytes, tenant-referenced private inbound attachments, and sealed customer ZIPs. Internal/draft/rejected/unscanned states remain private and are not converted into customer-visible files. A file with a documented `retention_actions` purge tombstone (and no legal hold) is represented by retained metadata rather than falsely demanding purged bytes. Committed bytes missing from a required source cause attention. Pending uploads with no committed byte hash remain pending records; no claim is made about orphan or uncommitted storage bytes.

Supabase source GETs use exact private bucket/key paths, server credentials and a Range header. A 206 response must have the exact Content-Range and length. A 200 response that ignores Range is bounded to the declared source size (at most 32 MiB), verified for length and sliced. Real deployment Range behavior/reliability still needs qualification. R2 customer ZIP sources use the declared current archive binding identity and range GETs. No signed/public URLs or provider-origin redirects are used.

Chunks are **256 KiB**. Each source chunk is encrypted using the existing `sealBytes` AES-GCM envelope with a fresh nonce, retained key ID, and authenticated context binding tenant, external generation, backup ID, source, offset, length and frozen whole-source hash. Ciphertext SHA-256 and authenticated plaintext SHA-256 are both retained. A source changed between range reads cannot seal: the producer reads/decrypts the copied chunks and verifies the exact full source hash. It verifies one whole source per tick, using at most 32 MiB for the assembled source plus bounded envelopes. Snapshot verification is at most 16 MiB.

Exact destinations: `tenant-backups/<tenant>/<external-generation>/<backup-id>/snapshot/<offset>.bin`, `file/<index>/<offset>.bin`, and `manifest.bin` in private `RECOVERY_BYTES`. Each conditional write uses If-None-Match:* and is followed by exact GET, authentication and hash verification. Existing valid bytes win, even if an earlier acknowledgment or SQL checkpoint was lost. Nonces are never derived from plaintext or reused to overwrite a destination. A conflicting body at an existing key fails closed.

Per scheduled tick: default four missing chunks (maximum16), then at most one complete source verification. Claims default2/max5, five-minute leases, one-day preparation deadline. Release makes remaining work claimable again. Lost lease/current authority prevents subsequent checkpoint/seal. Failures are per-job; a failed secondary status write does not abort later jobs. Main should use a frequent enough scheduler for the declared bounds and run only one bounded stage at a time to avoid concurrent large buffers.

After all chunks and whole-source proofs, SQL checks the exact expected part set, immutable registered pointers and whole-source hashes/lengths. It refuses missing/duplicate/extra parts or incomplete source verification. The manifest freezes table coverage, file descriptors, ciphertext pointers, key IDs, capture generations/time, qualification, before/after witness pointers and tail assessment. The encrypted manifest is read back before a separate witness seal and local completion. `manifest_digest` in SQL is the PostgreSQL structural JSON hash; the actual manifest-byte SHA-256 is `manifest_pointer.plaintext_digest`. Do not conflate them.

There is **no atomic Postgres/R2/witness transaction**. A local checkpoint or seal can lag a successful private write. Resume uses exact keys and authenticated readback. Orphaned ciphertext is possible and remains private; future retention is responsible for it. Source GC must acquire the same tenant guard, settle already claimed physical deletions, and honor `wm_backup_hold(bucket,key)` for captured/copying jobs through expiry. The hold cannot undo deletion. That GC interlock is a required shared integration, not an existing provider guarantee.

## Independent witness contract

`RECOVERY_WITNESS` is a **separate configured storage adapter** from `RECOVERY_BYTES`; actual account/admin/key custody separation must be qualified outside these opaque bindings. R2 strong direct reads and conditional writes do not provide administrator-proof immutability or historical object-version recovery. No bucket listing is used as evidence of a complete latest tail.

`appendWitness(env, org, generation, event, {expected, control, keyId})` accepts a stable UUID event ID, kind (`receipt`, `attempt_intent`, `attempt_outcome`, `backup_seal`), source UUID, semantic source digest, and a full `source_pointer`. Attempts also bind attempt UUID, dispatch nonce and phase; backup seals bind manifest key and snapshot digest. The source pointer contains exact key, authenticated envelope context, plaintext/ciphertext digests, byte length and retained key ID. Append and check authenticate the actual source bytes in RECOVERY_BYTES; a digest label alone is insufficient.

For existing journal integration, `readEvidencePointer(bucket,key,context,keyring,expectedCiphertext)` verifies the already-retained receipt/attempt envelope and constructs that pointer **without rewriting it**. Use the exact existing context from `continuity/receipts.mjs` or `attempt-journal.mjs`. For critical receipts, `event.source_digest` is the inner receipt digest, distinct from the wrapper plaintext hash. For attempts, it is the journal payload plaintext digest.

Event objects live at `witness/<tenant>/<generation>/events/<event-id>.bin`. Each authenticated event binds its predecessor pointer and the next contiguous monotonic witness sequence. `head.bin` is also authenticated/encrypted and updated with ETag compare-and-swap (If-None-Match for genesis). Concurrent writers from one predecessor cannot both acknowledge a fork. An uncertain head update is checked by exact head read and verified ancestry; a later concurrent head can still acknowledge the earlier committed event. Reusing an event ID with different content fails. A CAS-losing orphan event cannot be silently reparented under the same ID: reconcile the conflict; never treat its object existence as an acknowledged event.

`checkWitness(...,{expected})` verifies current head, event chain and referenced source bytes back to the supplied retained checkpoint. It detects missing sources, gaps, forks and rollback relative to that checkpoint. Reads are bounded to256 events. If an expected anchor lies beyond that bound it returns an error requiring bounded offline reconciliation; it never calls a partial walk complete. Without a retained expected anchor, a self-consistent older head cannot be proven current. The result explicitly reports whether it was anchored and reached genesis. An administrator who can replace/delete every online copy cannot be defeated by a chain stored in the same failure domain.

`assessWitnessTail(check, snapshot.tail)` flags missing/diverged receipt IDs/digests, missing/changed attempt nonces, and witnessed outcomes whose local attempt is not resolved. Events arriving after the snapshot can legitimately require reconciliation; they are not silently erased or replayed. It reports **no gap in the checked witnessed events**, never “all provider history complete.” Hooks are not yet integrated by this module, and a configuration label cannot prove no event was omitted.

Main must wire, using stable persisted event IDs and serialized per-tenant predecessor selection:

1. Existing critical receipt persistence -> authenticated source pointer -> witness receipt append -> only then record witnessed completion.
2. Registered attempt intent/journal -> authenticated source pointer -> witness intent acknowledgment **before** provider dispatch.
3. Every durable outcome/journal -> witness outcome. Historic outcomes remain retainable in their original generation even after a freeze; this grants no new effect authority.
4. Failure/unknown witness append prevents positive execution/acknowledgment as appropriate. Check exact existing ID/head before retry; never generate a new ID to hide an uncertain result. Shared dispatcher wiring is owned by main.

The producer already appends its backup seal. It does not alter existing receipt/journal modules or claim the three hooks above are installed.

## Offline interface and qualification

`verifyOfflineBackup({load,manifestPointer,keyring,onVerifiedChunk})` uses an exact-key offline loader and caller-supplied retained keyring. It authenticates manifest/chunks, checks exact planned coverage and whole-source hashes, and supplies verified source bytes only to the caller callback. It does not write files, print keys/plaintext, import SQL, create accounts, restore grants or execute providers. Caller callbacks must not log sensitive bytes.

`verifyOfflineWitness({loadWitness,loadBytes,organizationId,generation,keyring,expected})` checks a separately retained witness checkpoint and its underlying source evidence using offline loaders. The offline package must contain manifest/chunks **plus** all referenced witness events and original journal source envelopes needed for the retained anchor, not only the producer's current files. Retain the expected latest checkpoint independently, and compare current online witness before any later promotion.

`BACKUP_KEYS` and current `BACKUP_KEY_ID` use the existing keyring mechanism. The job freezes its key ID; retain all historical keys referenced by encrypted bytes and witness heads. Losing those keys makes the bytes unrecoverable. No key was created, requested, printed, transmitted or installed here; tests use a clearly synthetic fixture. Actual off-device encrypted copies, independently recoverable custody and owner-account-loss drills remain unperformed qualification.

## Exact main wiring and checks

- Add BACKUP_COMMANDS.has(command) before shared command validation -> `backupCommand`, retaining existing Origin/CSRF/identity/body/stable-key checks. GET `/api/backups?business=<uuid>` -> `backupStatus` after identity. No download/restore route is added.
- Add `processTenantBackups(env)` as an isolated scheduled stage. Configure private RECOVERY_BYTES, separate RECOVERY_WITNESS, existing RECOVERY_CONTROL, retained keyring, and server BACKUP_QUALIFICATION matching the approved nonsecret identities. For backed-up customer ZIPs retain the corresponding current archive binding identity. Missing/mismatched configuration fails closed.
- Build/allowlist backup-ui.mjs; `backupViews({esc,dateTime}).panel(data,{org,qualification,keyId})`, delegated data-backup-action forms, `backupFormInput`, stable keys and inline errors. The status view shows at most50 requests and no plaintext snapshot/key material. Keep desktop/mobile wrapping and recent-auth errors actionable.
- Integrate witness hooks and source GC holds above. Review related/global classifications when schema changes. Restore/promotion must be separately implemented in isolation with fresh authority and current provider reconciliation; never run restored outbox, jobs, invitations, grants, tokens or approvals.

Focused test command: `node --test tests/workspace/backups.test.mjs`; actual local PGlite migrations/actor helpers and deterministic fake buckets only. Static checks use `node --check` on all four Worker modules, UI and test file. Tests cover current operator/MFA/RLS, consistent stored capture, unknown schema, missing proofs, generations/revocation, actual encrypted bytes/offline verification, private triage boundaries, corruption, lost acknowledgments, CAS concurrency/rollback, missing keys/source bytes/predecessors, range/tenant validation, checkpoint interruption and size limits.

Not run: full test suites, real PostgreSQL concurrency, Worker memory/CPU tests at maximum bounds, browser journeys, live Supabase/R2/witness/IAM/account separation, offline custody or owner-loss drills. No provider requests/account changes, remote migrations, purchases, commits/pushes, customer messages or restore operations occurred. Fake buckets prove modeled conditional semantics, not actual account qualification.

Provider guarantees used remain the current official [R2 Workers get/put/conditionals](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/) and [direct consistency contract](https://developers.cloudflare.com/r2/reference/consistency/), with [bucket-lock administrative limits](https://developers.cloudflare.com/r2/buckets/bucket-locks/); Supabase [private authenticated downloads](https://supabase.com/docs/guides/storage/serving/downloads) do not imply DB backups contain [Storage object bytes](https://supabase.com/docs/guides/platform/backups). Existing project RECOVERY-REVIEW.md contains the broader DR/restore cautions, including restored extension-job risks.

## Observed module validation — 2026-10-31

Executed node --test tests/workspace/backups.test.mjs: 17 passed, 0 failed, 0 skipped (12.56 seconds). Ten cases exercise actual PGlite migrations and actor helpers; seven exercise deterministic byte, witness, adapter and UI contracts. All six JavaScript files passed node --check. Final witness coverage distinguishes a confirmed CAS conflict from an uncertain timed-out head write that may still commit; retry reconciles the same immutable event without duplicate head writes. These results do not qualify real R2 concurrency, production PostgreSQL, browser integration, account custody or provider access.


## Main integration update — 2026-10-31

The private Worker now serves the backup API/UI to current recovery operators and
processes leased copying in its isolated scheduled stage. Critical receipt
persistence requires a witness append before database durability acknowledgment;
intent journaling requires its append before provider dispatch; outcome journaling
retains the exact result in its original generation before projection. Stable
source-derived event IDs recover lost acknowledgments without substituting a new
identity. A conflicting/uncertain head remains attention, with no effect replay.

Enable RECOVERY_WITNESS_ENABLED and BACKUP_ENABLED, use hooks version
`tenant-witness-v1`, and configure the qualified storage/key references before
requesting preparation. Missing configuration leaves existing history readable but
disables new preparation. TENANT_BACKUPS_ENABLED controls the scheduled producer.
The deployment config keeps these switches off pending real custody qualification.

The separately generated tenant_backup_schedules migration adds explicit daily
standing authority. Current recovery permission and recent MFA authorize the
versioned configuration. It can continue after that user's sign-out, while the
direct verified operator grant, exact configuration version and recovery/external
generations remain current. Changing/disabling the schedule cancels old unfinished
work; reenabling cannot revive it. Jobs retain no human session token. On-demand
jobs retain their original session checks. The schedule is excluded from recovery
snapshots and cannot be restored as authority. At most one active preparation is
created per tenant; actual PostgreSQL concurrent generation is reserved for CI.

The original 134-table inventory is the producer's initial schema. Later reviewed
migrations explicitly classify their new tables and update signatures; the full
coverage/signature manifest, matching reviewed migration set and independent latest
witness proof govern restore compatibility, rather than the profile label alone.
Source-GC hold integration remains a required part of the physical retention module.

Local checks now include five actual-SQL standing-schedule cases, integrated
receipt/intent/outcome witnesses, failed-witness dispatch/acknowledgment denial and
operator/customer browser boundaries. Independent review, full combined tests,
actual PostgreSQL races, live R2/Storage account separation, maximum-load timing,
off-device key recovery and owner-account-loss drills remain outstanding.

Independent review found and resolved staff regrant revival, a reversed multi-tenant
lock order and false healthy monitoring results. The frozen actor fingerprint now
includes the monotonic global staff grant as well as the tenant assignment. A
revoked-then-restored staff row cannot revive either backup lease type. The bounded
due set is selected by due priority, then processed in UUID guard-lock order.

The producer, schedule and runtime-monitor migrations are applied to empty staging
and are now immutable. Registry verification reports 135 classified wm tables, no
unclassified tables and no column-signature drift. Anonymous commands, customer
machine/raw-row access and the legacy command bypass remain denied. Fifty-one
focused backup/schedule/witness/monitor/dispatcher/HTTP tests and all three backup
browser journeys passed. Independent recheck found no remaining P0–P2 issue in its
bounded scope. The two real-PostgreSQL races still require exact-commit CI.
