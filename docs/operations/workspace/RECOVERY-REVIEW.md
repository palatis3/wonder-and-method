Sent the full protocol once to **Build Wonder and Method workflows**. Sending was accepted; the read-only check showed the main agent active, with **no explicit acknowledgment yet**.

**Critical finding:** Supabase’s current documentation says physical clones immediately run restored extensions such as `pg_cron`, `pg_net` and wrappers. There is no option to exclude or pause them before cloning. Tenant recovery should use a vetted logical import, not “clone first, disable jobs afterward.” [Supabase clone restrictions](https://supabase.com/docs/guides/platform/clone-project).

No writes, deletions, deployments, account changes or live tests were performed.

**Provider guarantees and limits**

| Component | Verified coverage or behavior |
|---|---|
| Supabase database backups/PITR | Database recovery; **not Storage file bytes**. Project deletion also deletes managed backups. Restore incurs downtime and operates at project scope. Physical backups are not directly downloadable. |
| Supabase clone | Includes Auth accounts, password hashes/authentication records and encryption root key. Storage files/settings, Auth configuration/API keys and other platform configuration require separate handling. Restored external extensions may execute immediately. |
| Supabase CLI dump | Default excludes managed `auth`/`storage` schemas and omits data/custom roles unless requested. An uninspected default dump is not a complete backup. |
| R2 consistency | Direct reads/writes/deletes/listing are strongly consistent. Multi-page listing is not a transaction snapshot. Cached custom domains may return stale objects. |
| R2 retention | Bucket locks prevent overwrite/deletion while configured, but administrators can remove them. They are not an administrator-proof compliance-mode guarantee. |
| R2 versioning | No supported historical-version retrieval contract was established. `R2Object.version` identifies an upload; it does not establish recoverability of previous bytes. |
| R2 encryption | Cloudflare-managed encryption at rest. Independent backup confidentiality requires application encryption and separate key custody. |

Sources: [Supabase backups](https://supabase.com/docs/guides/platform/backups), [CLI dump](https://supabase.com/docs/reference/cli/supabase-db-dump), [R2 consistency](https://developers.cloudflare.com/r2/reference/consistency/), [bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/), [S3 compatibility](https://developers.cloudflare.com/r2/api/s3/api/), [encryption](https://developers.cloudflare.com/r2/reference/data-security/).

**Keep customer export separate from recovery backup**

A **customer export** is a ZIP for a named recipient and permitted audience—not a SQL dump. Include readable records, machine-readable data, permitted file bytes and checksums. Exclude other tenants, operator-only material, hidden security/legal records, credentials and Auth internals. Tenant ownership does not automatically override restricted file audiences.

An **operator recovery set** contains encrypted tenant data, restricted evidence, receipts, attempt history, file versions and configuration inventory. A separate project-level DR backup may contain shared Auth and other tenants; never give it to a customer or restore it over production to repair one tenant.

Suggested customer ZIP:

```text
README.html
data/agreements.jsonl
data/invoices.jsonl
data/work.jsonl
data/messages.jsonl
data/approvals.jsonl
data/reports.jsonl
files/<file-id>/<version-id>/<safe-name>
manifest.json
SHA256SUMS
manifest.sig
```

The index must be static, escaped and usable offline. Preserve exact monetary values, currencies, relevant timezones, stable identifiers and a data dictionary. Optional CSV must neutralize spreadsheet formulas.

Different file audiences require separate packages. Putting restricted files in another ZIP folder does not preserve access control. Raw email may need redaction or exclusion because it can contain hidden recipients and restricted attachments.

**Manifest and completion seal**

Application-defined example:

```json
{
  "format":"wm-tenant-recovery/1",
  "kind":"operator_backup",
  "backup_id":"UUID",
  "tenant_id":"T",
  "environment":"production",
  "db_cut":{"snapshot_time":"UTC","tenant_revision":1234},
  "source":{"project_ref":"P","schema_version":"M","app_commit":"SHA"},
  "generations":{"recovery":7,"external":12},
  "receipt_cut":{"seq":530,"hash":"HEX"},
  "coverage":{
    "rows":"complete",
    "objects":"complete",
    "auth":"references_only"
  },
  "objects":[{
    "file_id":"F",
    "version_id":"V",
    "audience_id":"AUD",
    "plain_bytes":123,
    "plain_sha256":"HEX",
    "cipher_key":"OPAQUE_KEY",
    "cipher_bytes":456,
    "cipher_sha256":"HEX",
    "encryption_key_id":"K",
    "scan_state":"unscanned"
  }],
  "tables":[{"name":"messages","rows":10,"sha256":"HEX"}],
  "exclusions":[],
  "policy_version":"POLICY"
}
```

Customer manifests omit internal storage, receipt and configuration information.

Use canonical serialization and sign the manifest digest. Define precisely which bytes each hash covers. An outer completion receipt records manifest hash, archive hash/size and verification outcome; avoid circular self-hashes.

ZIP CRC is insufficient. Reject traversal paths, absolute paths, symlinks, duplicate/case-folded names, expansion bombs and unsupported format versions. Hold the trusted signing-key fingerprint independently so replacing both manifest and signature cannot pass.

Encrypt sensitive manifest fields. Do not leak restricted filenames, counts or hashes through exclusions.

**Consistent capture during concurrent changes**

Required invariant: **immutable file versions at distinct object keys**. Publish a version row only after complete upload/hash confirmation. Replacement creates a new version; deletion creates a tombstone followed by controlled garbage collection.

Protocol:

1. Serialize with the tenant GC gate. Persist a backup retention hold and settle any already-claimed physical deletions.
2. Extract all tenant rows, referenced immutable shared catalog snapshots, file-version references and receipt watermark from one PostgreSQL snapshot:

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
-- Read committed tenant revision and generations.
-- Extract every registered table and exact referenced file versions.
COMMIT;
```

3. Copy those immutable bytes after the database transaction, protected by the hold.
4. Read back and verify every mandatory object.
5. Seal the manifest, append an independent completion receipt and update backup inventory.
6. Release the temporary hold only after verified backup retention protects the required copies.

A hold cannot resurrect an already-deleted object. Missing bytes mean incomplete backup, not substitution with the latest file.

Use a direct/session-pooled connection. Independent REST/RPC pagination calls do not share a database snapshot. Parallel readers require `pg_export_snapshot()` and `SET TRANSACTION SNAPSHOT`, with the exporting transaction kept alive. `pg_dump --snapshot` supports operator DR; it is not a tenant-row filter. [PostgreSQL snapshots](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-SNAPSHOT-SYNCHRONIZATION), [pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html).

Bound snapshot duration. Retry a failed extraction as a new run rather than joining pages from different cuts. Exclude schema migrations from the extraction window.

Maintain a table coverage registry: a newly added tenant table must be exported or explicitly excluded, otherwise backup validation fails. A PostgreSQL sequence’s `last_value` is not a committed watermark; use the existing transactionally maintained tenant revision.

If legacy files permit overwrite, convert them to immutable versions or apply a bounded tenant write freeze during copying. Ordinary export does not pause remote campaigns or subscriptions; external observations need separate timestamps.

**Incremental copies, interruption and encryption**

Each manifest is a full inventory, even when only new objects are copied. Reuse verified encrypted bytes by tenant/file-version/hash/key-version. Avoid cross-tenant deduplication; it complicates isolation and deletion.

Supabase S3 endpoint:

```text
https://PROJECT_REF.storage.supabase.co/storage/v1/s3
```

Use the configured region and `forcePathStyle`. Fetch exact manifest bucket/key pairs. Generated Supabase S3 credentials bypass RLS across buckets, so backend code must enforce manifest scope. Storage mutations must use APIs, not SQL changes to `storage.objects`. [S3 authentication](https://supabase.com/docs/guides/storage/s3/authentication), [compatibility](https://supabase.com/docs/guides/storage/s3/compatibility), [Storage schema](https://supabase.com/docs/guides/storage/schema/design).

R2 uses:

```text
https://ACCOUNT_ID.r2.cloudflarestorage.com
region: auto
```

Use the documented jurisdiction endpoint when applicable.

Small-object Worker example:

```ts
const written = await env.BACKUPS.put(key, encryptedBytes, {
  onlyIf: new Headers({ "If-None-Match": "*" }),
  sha256: cipherSha256,
  httpMetadata: { contentType: "application/octet-stream" }
});

if (written === null) {
  // Verify existing bytes; never overwrite conflicting content.
}
```

Record immutable keys and verify through direct reads. A hash stored in uploader-controlled metadata is not independent proof.

For multipart uploads, persist upload ID, part numbers, ETags and application hashes. `resumeMultipartUpload()` does not itself validate upload existence. Completion timeout means unknown until readback resolves it. Never launch a competing writer at the same key. Incomplete uploads expire after seven days by default; multipart ETag is not whole-file SHA-256. [Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [multipart behavior](https://developers.cloudflare.com/r2/objects/upload-objects/).

Use a vetted streaming authenticated-encryption format, unique nonces and per-object/backup data keys wrapped to recovery custodians. Bind tenant, object version and chunk position as authenticated context. Do not invent ZIP-password cryptography.

Recovery private keys must survive loss of Supabase, Cloudflare and the owner’s laptop/password-manager session. Two independently recoverable custodians or escrow copies are simpler than new threshold cryptography. Backup writers need encryption public material, not offline recovery private keys.

The offline copy must include encrypted data/bytes, manifests, receipt segments, witnessed latest head, schema/migrations/app version, configuration inventory and verification tooling. Decrypt and verify it independently, then disconnect it. A permanently mounted synchronized drive is not an offline failure domain.

Losing every decryption key makes the archive unrecoverable, regardless of successful uploads.

**Independent latest-tail evidence**

A valid hash chain can be truncated and still validate. The backup cannot certify its own tail as latest.

Maintain the existing independent per-tenant head outside the database restore domain:

```text
tenant
recovery_generation
external_generation
receipt_seq + receipt_hash
authority_revocation_head
attempt_head
previous_anchor_hash
observed_at
```

The existing sequencer must enforce:

```text
immutable receipt durable
    → conditional latest-head advance
    → permission to dispatch
    → outcome receipt
```

A prepared attempt must be independently durable and covered by the head **before** provider dispatch. Head failure prevents dispatch. Prepared-without-result is unknown, not proof of non-execution.

If R2 holds the head, use conditional ETag updates and keep the mutable pointer outside locked receipt prefixes. A separate read-only witness/offline checkpoint records the largest observed head; never replace that witness from the restored database.

Checks:

- Restored sequence lower than trusted head: missing tail.
- Same sequence, different hash: fork/corruption.
- Head beyond available receipt bytes: missing evidence.
- Receipt facts without recoverable record bytes: integrity evidence, not data reconstruction.

If only the offline witness survives, completeness is established only through its checkpoint. The later interval remains unknown. Provider reads cannot reconstruct every revoked membership or approval.

Same-account locks and heads do not defend against a privileged administrator rewriting both. Independent custody detects rollback only through its last witnessed point.

Separate app, backup-writer, restore-reader and retention-admin privileges. Do not give the application lock-administration or offline signing/decryption keys. Cloudflare account tokens and user tokens have different owner-removal behavior; record that distinction in the runbook. [R2 permissions](https://developers.cloudflare.com/r2/api/tokens/).

**Tenant restore and fresh promotion**

Use:

```text
requested
→ independently_frozen
→ verified
→ importing_isolated
→ validated
→ provider_reconciled
→ ready_for_fresh_authority
→ promoted_read_only
→ explicitly_reenabled
```

Missing evidence blocks progression.

Before import:

- Authenticate the recovery operator independently of restored roles.
- Advance independent recovery/external generations and freeze dispatch/access.
- Reconcile leases; reject old generations at execution and download boundaries.
- Continue necessary live webhook capture into a separate restricted journal.
- Remember: local freeze does not cancel remote ads, Stripe schedules or accepted mail.
- Use a target with no customer access, provider credentials, SMTP or automatic external execution.
- Import vetted schema and allowlisted data—not arbitrary archive SQL.
- Do not use shared-project PITR for one tenant.

**Physical cloning is not an inert sandbox.** Supabase documents immediate execution of restored extension jobs. Logical restoration also does not automatically carry the encryption root key, so encrypted Vault data needs separate key handling. [Clone restrictions](https://supabase.com/docs/guides/platform/clone-project).

Import order:

1. Approved schema/app version, required extensions and deny-by-default privileges.
2. Recovery namespace/generation and historical identity mapping.
3. Tenant business roots and immutable catalog/agreement versions.
4. Work, billing evidence, messages, reports and approval/withdrawal history.
5. File bytes through Storage APIs under new recovery keys; file/audience mappings.
6. Latest independent revocation, closure, deletion and receipt overlays.
7. Fresh authority reconstruction, separate from historical records.

Do not roll back shared `auth.users` for tenant recovery. Keep current global identities. Missing/deleted actors remain historical tombstones until independently verified and freshly invited. Tenant backups contain identity references, not password hashes, MFA seeds, refresh tokens or sessions.

Historical approvals remain evidence; they cannot authorize new-generation execution. Apply newer revocations and purge decisions over older snapshots. Without trustworthy current revocation evidence, do not automatically regrant access.

Import chunks into inaccessible staging keyed by recovery run. Validate all foreign keys, counts, hashes and tenant boundaries. For small imports, use one transaction; for large imports, only staging chunks commit before a short promotion transaction. Do not disable foreign-key triggers and call the result validated.

```text
BEGIN
  lock tenant_control;
  verify expected freeze token/generation;
  verify manifest, coverage and import validation;
  verify current revocation head and reconciliation requirements;
  switch active_data_generation to recovery_run;
  keep frozen=true;
  append promotion and authority-invalidation facts;
COMMIT

verify independent promotion receipt;
allow authenticated read-only access;
enable specific capabilities only through fresh commands;
```

Postgres and R2 cannot commit atomically. Uncertain promotion/receipt outcomes stay frozen and reconcile by recovery-run ID.

Failed imports leave production unchanged. Clean up only reconciled, unreferenced staging objects. Reverting promotion advances another generation; never decrement an epoch. Once new external effects occur, rollback itself becomes a new reconciled recovery operation.

**Provider reconnect and reconciliation**

Restore provider identifiers and attempt evidence, not secrets:

```text
provider, environment, account,
customer/subscription/invoice/campaign/message IDs,
request hash, idempotency key, attempt status and timestamps
```

Fresh reconnect must verify account ownership/binding. Read first:

- Stripe invoices, payments, refunds, credits, subscriptions/schedules and portal-originated changes.
- Ads resource graph, configured/effective/review state, budgets and dated spend.
- Resend known sent-message state and inbound capture gaps.

Compare against independent attempts since the backup cut. An empty search or expired provider retention does not prove non-execution.

Restored outbox/jobs become historical reconciliation candidates, never executable queues. New actions require current-generation commands and applicable fresh approval. Unresolved older attempts block conflicting writes. Preserve earned and unpaid obligations.

**Customer closure and handoff**

Authorize export both at extraction and immediately before release/download. Changed membership or audience invalidates or rebuilds the package.

Verify every ZIP entry against checksums. Test readability with an isolated verifier. Preserve the explicit unscanned-file label. Missing bytes make the export incomplete unless the authorized requester accepts a documented partial package.

Closure sequence:

1. Confirm scope, effective date and customer-owned asset inventory.
2. Freeze new work and record closure/revocation intent independently.
3. Reconcile unknown effects and future schedules through separately authorized provider actions.
4. Prepare export and current billing/service status.
5. Verify customer ownership/admin access to ad accounts, analytics, domain/DNS, hosting, repositories and deliverables.
6. Record customer acknowledgment against the package hash and handoff evidence.
7. Revoke scoped access, aliases, download tokens, future jobs and agency delegation.
8. Apply retention/purge policy.

Transfer ownership/roles, not agency root passwords or shared credentials. Remove agency access after verified handoff.

A successful download response is not acceptance. Record `offered`, `downloaded`, `accepted`, `expired` and unresolved items distinctly.

Do not delete a shared Auth identity or revoke a shared provider principal merely to close one tenant. Revoke the tenant binding. Supabase signout invalidates refresh tokens, but existing access JWTs remain valid until expiry; current membership/session/generation checks remain necessary. [Signout semantics](https://supabase.com/docs/guides/auth/signout).

Use authenticated download proxies for revocable exports. Already-issued signed URLs can survive until expiry; already-downloaded bytes cannot be recalled.

**Retention and purge**

Determine policy per record class, contract, jurisdiction, purpose and legal hold through the appropriate policy owner. This is configurable implementation design, not a universal legal retention period.

Separate:

- Active service data.
- Customer export packages.
- Operational backups.
- Agreements, invoices and dispute evidence.
- Security receipts and deletion tombstones.

Retained evidence stays restricted to its permitted operator/legal audience. Legal retention is not permission to retain every attachment indefinitely or expose records to former members.

Record independent deletion intents so future restores reapply them. Purge relevant projections, files, exports, caches and backup objects when permitted. Check references from every retained manifest and hold before deleting shared backup chunks.

An immutable full-project backup cannot instantly lose one person’s rows. Keep it restricted until its retention expires, and apply deletion overlays before any restored access.

R2 lifecycle scheduling is not proof of deletion. Locks override lifecycle rules; multi-object deletes may return HTTP 200 with individual failures. Verify per-object outcomes and direct absence. Record `purge_pending` for lock expiry, provider retention or offline-media disposal. [Bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/), [lifecycle timing](https://developers.cloudflare.com/r2/buckets/object-lifecycles/).

Offline media require tracked expiry/sanitization. Crypto-erasure requires destruction of every relevant key copy; do not destroy shared keys needed for retained evidence.

**Recovery targets and owner-loss drill**

Suggested engineering targets, subject to measured qualification:

- Verified tenant data/file cut no more than one hour old.
- Offline verified copy/checkpoint no more than 24 hours old.
- Isolated read-only recovery within four hours for a defined reference dataset and provisioned recovery environment.
- External reenabling measured separately; unresolved provider outcomes may delay it.

These are application targets, not Supabase or Cloudflare promises.

The owner-loss drill assumes the original laptop, email/SSO, Supabase session and Cloudflare user token are unavailable. A designated custodian must recover runbook/key material and administrative access without relying on the failed inbox, decrypt the offline copy, compare heads, import into isolation and reconnect providers read-only.

Also simulate Cloudflare account unavailability. The offline cut remains recoverable; newer tail completeness stays unknown. Provider account-recovery time cannot be promised by this protocol.

**Exact failure exercises**

| Fixture | Required result |
|---|---|
| Row update and file replacement/deletion during capture | One consistent cut and pinned bytes, or explicit failure |
| New unclassified tenant table | Coverage validation fails |
| Recipient loses audience during ZIP build | Release denied/rebuilt; no restricted metadata leak |
| Interrupted multipart or lost completion response | Reconcile immutable bytes before sealing |
| Wrong key, missing escrow, corrupt signature/chunk, ZIP traversal | Reject before import |
| Valid but truncated chain | Independent head detects gap |
| Same-account head and chain rolled back | External witness detects through its checkpoint; later interval remains unknown |
| Receipt/head/dispatch crashes at each boundary | No unanchored dispatch; prepared attempts reconcile |
| Snapshot predates revocation, withdrawal, STOP, closure or purge | None revive as live authority |
| Old sessions, credentials and queued provider actions restored | Zero usable restored authority or outbound writes |
| Full-project restore requested for one tenant | Reject production PITR |
| Physical clone contains active external extensions | Reject as tenant-isolation method |
| FK/hash mismatch or failed staged chunk | Live generation unchanged |
| Promotion committed but receipt timed out | Frozen reconciliation; no double promotion |
| Provider effect absent from restored DB | Read/unknown outcome; no blind replay |
| Shared user belongs to another tenant | Closure preserves unrelated identity/access |
| Purge encounters holds, per-key failures, caches or offline copies | Pending versus verified deletion distinguished |
| Offline restore and customer ZIP validation | Record actual RPO/RTO, all-byte checksums and permission results |

Remaining qualification gaps are the actual project backup coverage, enabled R2 policies/permissions, recoverable keys, independent witness freshness and tested dataset sizes. No atomic DB/Storage/R2 snapshot, tenant-level PITR, guaranteed historical R2 versions or administrator-proof lock was established.
