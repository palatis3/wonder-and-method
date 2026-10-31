# Customer exports (B13 customer-copy slice)

Implemented in `worker/workspace/exports/{service,archive}.mjs`, `src/workspace/export-ui.mjs`, `tests/workspace/exports.test.mjs`, and CLI-generated migration `20261031142642_customer_exports.sql`. Shared API/UI/scheduler wiring is present and the migration is applied to staging. Old export queues are not consumed. This module is **not** operator disaster recovery, logical restore, an independent backup, retention/purge implementation or offboarding acceptance.

## User contract and scope

`customer_export.request` accepts exactly `{engagement_id, expected_version, acknowledge_unscanned:true}` and a stable command key. It requires a current session, recent authentication, current customer membership and the exact current engagement version. A staff/operator assignment alone is insufficient; the request always belongs to `auth.uid()`. A dual operator/member gets only their customer audience. No supplied recipient, email, arbitrary SQL/table selector or storage destination is accepted.

`customer_export.cancel` accepts exactly `{id, expected_version}` and a stable key. It immediately fences subsequent retrieval and sealing. Already downloaded bytes cannot be recalled. Neither request nor cancel sends email, changes membership, settles bills or proves closure acceptance.

The customer-engagement-v1 profile is deliberately enumerated in `wm.customer_export_snapshot`, not a raw database dump:

- The selected engagement; requests; shared messages; revision summaries/digests plus the explicit customer-content manifest keys; decisions; sent/accepted/historical agreements and their catalog snapshots; shared business facts; commitments, entitlements, SEO and Care status; lead outcomes; published/superseded reports and linked metric snapshots; published analytics results; closure status; STOP observations; account/access status.
- Customer administrators additionally get milestones/earned amounts, billing schedules, invoice/payment/adjustment observations, hosting offsets and settlement statement amounts. Tax/calculation evidence and other hidden legal/security evidence are omitted. Payment observations do not replace contractual earnings; corrected/historical reporting is never automatically summed.
- Files: shared workspace files, the requester's own drafts, and stored-unscanned inbound attachments belonging to accepted correspondence with a shared message in the selected engagement. An internal parent disqualifies an otherwise shared file. Other drafts, other tenants and other audiences are absent from both bytes and manifest metadata.
- Operator queues/notes, incidents, time entries, raw email headers/HTML, source triage, credentials, Auth internals, security/legal evidence, provider request payloads, execution journals, and unpublished reports are excluded. Arbitrary internal revision manifest keys are not dumped. Auth/user tables are never copied. Customer-authored free text remains customer content; this is not a secret-detection/redaction engine.

The profile is explicitly declared in README/manifest. It is not a promise to export every database column. Main must update this allowlist when adding new customer-visible record families. Existing `export.request` and `wm.export_jobs` are intentionally not consumed or silently relabeled; main should retire that user action in favor of the new command. No operator export is transformed into a customer export.

## Consistent snapshot and authority

Commercial requests, revisions, decisions and catalog snapshots use the same
sent/current customer financial-or-contract audience as the workspace. An unsent
draft cannot enter a ZIP. Losing or expiring the named contract reading authority
invalidates a previously captured commercial package. Pending inbound files use
the same shared-parent-message audience as file selection; hidden internal work
cannot prevent an otherwise complete customer copy. Outcome-event history,
including explicit corrections, is included without private consent evidence.

A request acquires the existing tenant guard through `wm.require_access`, then persists one bounded `STABLE` SQL statement snapshot. It does not concatenate multiple REST pages. The job freezes requester membership version/role, recovery generation, external generation, organization status, engagement service state and a closure-state digest. The snapshot/identity fields, reservation hash/key and receipts are immutable. SQL numbers, including nested decimals, are represented as decimal strings before JavaScript parses them.

`wm.customer_export_current` independently checks current membership, membership version/role, expiry, guard/generations, organization/engagement/closure status, shared-message visibility, report publication status and every referenced file's current audience/hash/key/byte count. A role change or revoke-and-regrant invalidates the old archive. File removal/reclassification invalidates retrieval even if the ZIP bytes still exist. Closure changes invalidate old packages; make a fresh request using current access for the new closure state. Organization closure or a restricted/closed guard denies access; there is no historical-access bypass.

The Worker also reads the existing independent `RECOVERY_CONTROL` via `externalControl` before/after human command/status delivery, before capture-byte use/write, before sealing, and around authenticated download. Missing control, closed access or an external-generation mismatch fails closed. This prevents a restored database and its old guard from independently reauthorizing old packages. The authenticated RPC grants do not themselves perform an external R2 read: browser access must use the Worker to receive any bytes. Machine credentials remain server-only.

All new tables have RLS and deny raw grants to public, anon, authenticated and service_role. Only typed human/machine RPCs are granted. No shared helper is replaced. Current status hides archive hashes/sizes and download affordances when the package's frozen authority is no longer valid.

## Bounds and archive format

Per export: **2,000 rows total**, **2 MiB records snapshot**, **100 permitted files**, **20 MiB combined source bytes**, **32 MiB ZIP**, **7-day access expiry**, **3 requests per member/tenant/hour**. These are processing limits, not customer-count restrictions. Overflow/pending released-file checks produce explicit `attention` with an incomplete empty snapshot. No partial package is labeled complete. Larger scopes need a future explicitly reviewed partition/streaming contract; repeated requests do not silently produce different pages.

A claim batch is at most 5 (default 2), with a 5-minute lease, 10-minute retry interval and at most 5 claims. Stale leases cannot seal. A crashed exhausted lease becomes attention. Each job and secondary attention-write failure is isolated so later tenants continue.

ZIP uses existing `fflate`, **store-only**, fixed DOS timestamp, safe generated ASCII paths and no package additions:

```
README.html
 data/records.json
 data/records.csv
 data/files.json
 files/workspace/<file-uuid>/<sha256>.bin
 files/inbound/<email-uuid>/<attachment-uuid>/<sha256>.bin
 manifest.json
 SHA256SUMS
```

(The indents above are illustrative, not literal path characters.) Original names are in escaped README/JSON only. `.bin` members preserve exact source bytes without executing a misleading filename. Every unscanned file is explicitly labeled. JSON escapes HTML delimiters; CSV cells quote delimiters/quotes and prefix formula-leading values with an apostrophe. Source file bytes are **not** rewritten, so untrusted original CSV/Office files remain untrusted attachments.

Manifest SHA-256 covers every content member; SHA256SUMS additionally covers manifest.json. A private database reservation/receipt stores the whole ZIP hash/size and manifest hash. No circular self-hash. The ZIP parser validates central/local headers, bounds, contiguous entries, names, duplicates/case collisions, methods, flags, sizes and member SHA-256; it rejects traversal, compression/expansion, encryption, ZIP64 and symlinks. It verifies exact manifest membership and checksum list. Hashes inside a ZIP are not independent authenticity signatures; users should compare the whole-archive hash shown by the authenticated workspace. This module does not introduce signing keys or claim a backup tail witness.

## Actual byte adapters and uncertain outcomes

Sources use authenticated, server-only Supabase private Storage GETs for exact `workspace-sealed/<tenant>/<file>/<sha>` or `workspace-inbound/inbound/<email>/<attachment>/<sha>` identities. Actual body byte limits and SHA-256 are checked; missing, corrupt or oversized bytes cannot seal. No provider calls were made during implementation.

Choose **one** configured archive backend:

- `CUSTOMER_EXPORT_BACKEND=r2`, `CUSTOMER_EXPORT_STORAGE_ID=<approved immutable binding identity>`, private `CUSTOMER_EXPORTS_R2` binding. GET is direct R2, not a public/custom CDN. PUT uses `If-None-Match:*` and SHA-256; readback hashes actual bytes. R2 ETag/version/user metadata are not treated as content proof.
- `CUSTOMER_EXPORT_BACKEND=supabase`, same storage identity setting, existing Supabase server secret/config. Exact endpoint `/storage/v1/object/workspace-customer-exports/<key>`; POST with `x-upsert:false`; authenticated GET. New migration creates the private bucket if Storage exists and rejects a public bucket. Current `NoSuchKey` body code on 400/404 means absent; `NoSuchBucket` is configuration failure. Unknown legacy error shapes fail closed and require qualification, not a guessed write. The backend supports standard small-object uploads; live qualification must measure reliability/memory at this module's cap.

Server configuration owns the identity-to-bucket mapping. Freeze it for outstanding reservations; changing a human label alone does not prove the same remote bucket/account. Verify environment/account/bucket ownership before enabling. Use separate test/live identities and private bindings. The same backend/identity must serve request processing and download. No anonymous policies, public URLs or signed bearer download links.

Protocol: claim -> read current context + independent control -> build deterministic ZIP -> **reserve target/key/hash/size/manifest in SQL** -> read exact key -> register write exactly once -> conditional/no-upsert write -> read exact key and verify full ZIP -> current SQL authority/lease recheck + seal receipt. A committed reservation whose response was lost is read/rebuilt deterministically. A recorded write whose result is unknown permits GET reconciliation only; never a fresh key or repeated POST. If it never appears, the request reaches attention. A later deliberate new request has a different job/key; it does not convert the previous uncertain write into success. Cancelled/expired private objects are inaccessible but not deleted by this module.

There is no atomic transaction across Postgres and Storage/R2. A write or seal may have succeeded before a network response failed. Existing exact bytes can resolve the uncertainty; an orphaned inaccessible object is acceptable pending the separately owned purge workflow. Queue/data state is not proof of physical retention or independent backup.

## Main's exact shared wiring

1. Apply the new migration through normal reviewed migration/CI delivery (not done here). Add `/export-ui.mjs` to the asset build/allowlist. No package change is needed.
2. In the authenticated Worker `/api/command` handler **before** generic shared validation, route `EXPORT_COMMANDS.has(command)` to `exportCommand(env,session,org,command,input.input,key)`. Keep existing Origin/CSRF/identity/body-size/stable-key checks. Retire legacy export.request in the customer interface; do not drain its operator queue with this processor.
3. Authenticated GET `/api/customer-exports?business=<uuid>&before=<decimal cursor>` calls `exportStatus`. `before` is an opaque decimal ordinal string, not a date or JS number; page length20 plus lookahead, `next_before` continues safely through equal timestamps.
4. After `identity(session,env)` route `/api/customer-exports/:id/download?business=<uuid>&acknowledge_unscanned=true` through `downloadCustomerExport`. It buffers the bounded private object, verifies hash/ZIP, rechecks session/current SQL authority and independent control after bytes, then returns no-store attachment headers with sandbox CSP. Do not stream response bytes before the final checks. A revocation committed after that final authorization boundary cannot recall bytes already sent; do not promise network-level atomic revocation.
5. Add `processCustomerExports(env)` as an isolated scheduled stage. It owns its bounded read/build/private-write lease workflow and does not dispatch Stripe/ads/email. Reuse the production `RECOVERY_CONTROL` binding; do not inject test `control`, `store`, `call`, or `loadSource` substitutes in production.
6. UI: `exportViews({esc,dateTime}).panel(data,{org,engagements})`; delegated forms use `data-export-action`, `data-organization`, `exportFormInput`, stable action keys, inline errors and fresh reload. Request forms use the selected engagement version. Only `download_available` renders a link. Handle sign-in/recent-auth failures visibly. Preserve existing wrapping CSS for long checksum text; check desktop/phone/Safari.
7. Configure only the approved private backend/bucket identity; never accept it from a browser. Ensure server-only permissions and existing source buckets. Check current storage policy/public access and independent control before enabling scheduled work.
8. Retention/GC integration: `wm_customer_export_holds()` is a machine-only inventory of exact source bucket/key holds for unsealed active jobs until their seven-day expiry. Future GC must coordinate the same tenant guard and honor/settle these holds before deleting source bytes. A hold cannot resurrect deleted bytes. Sealed archives no longer need originals for physical completeness, but downloads continue to require current source audience records. A later purge must remove expired/cancelled artifacts and snapshot content under the approved policy; this task does not implement deletions or indefinite legal retention. Do not call an export receipt a completed closure/handoff acceptance.

## Verification and remaining qualification

Focused command: `node --test tests/workspace/exports.test.mjs` using the actual local PGlite migration/actor helpers; WORKSPACE_TEST_DATABASE_URL was unset. Tests use deterministic fake private Storage/R2, never provider requests. `node --check` is run for both Worker modules, UI and tests. Tests cover SQL authorization/raw grants, frozen snapshots/idempotency, exact bigint values, audience filtering including inbound parents, explicit limits, SQL-to-ZIP sealing, member/session/file revocation, recovery/closure changes, lease/reservation/unknown outcomes, cancellation, ZIP corruption/traversal/expansion, CSV/HTML safety, post-byte authorization, actual adapter request shapes, financial-role boundaries and independent control. Expiry/exhausted-lease exercise is included.

Still required by main: shared route/scheduler/UI integration, full-suite compatibility, real PostgreSQL concurrency races (membership/recovery/closure/GC versus capture/seal/download), browser journeys, real bucket/auth/control qualification and Worker CPU/memory tests at bounds. No remote migration, live download/upload, account changes, purchases, commits/pushes or release approval occurred. This does not complete the broader B13 backup/restore/retention/owner-loss drills.

## Current official contracts checked

- [Supabase private downloads](https://supabase.com/docs/guides/storage/serving/downloads): authenticated retrieval is separate from public/signed URLs.
- [Standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads): no upsert for immutable archive keys; TUS is recommended above 6 MB for reliability. This bounded adapter requires live reliability qualification and cannot imply a timeout means failure.
- [Storage error codes](https://supabase.com/docs/guides/storage/debugging/error-codes): NoSuchKey versus NoSuchBucket and transitional legacy shapes.
- [R2 Worker methods and conditionals](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/): get/put/onlyIf and SHA-256 options; no S3 parity or version-retention assumptions.
- [Supabase changelog](https://supabase.com/changelog): reviewed current changes; the markdown index failed web content-type parsing, so the official HTML index was used. Current tzdata warnings do not alter stored timestamps; archive preserves business zone and UTC/offset timestamp data without inventing local conversions.

Observed final local run: **17 passed, 0 failed, 0 skipped** (13 tests exercise real PGlite SQL; 4 are pure adapter/archive/UI tests), approximately 13.87 seconds. All four `node --check` invocations passed. All six owned files matched their checked temporary drafts with SHA-256 comparison and zero trailing whitespace. Scoped `git status` failed with `fatal: this operation must be run in a work tree`; no Git configuration was changed. Ownership was checked through collision checks, the explicit Copy-Item target list and final hashes, not a successful Git diff. The brief disconnected-computer interruption was resolved before tests ran.
