# Tenant logical restore rehearsal and restricted promotion

This module imports verified tenant backup data into **typed private tables**, validates it, freezes an exact plan, and atomically selects that recovery generation after explicit current-operator authorization. It does not physical-clone a project, replay archive SQL, overwrite live global identities, or enable historical provider jobs. Promotion is a usable **operator-only read-only recovery dataset**, not reopening the normal customer workspace. Fresh memberships, approvals, provider bindings and service resumption remain separate current workflows owned by main.

## Owned implementation

- worker/workspace/restore/control.mjs — independent freeze, checkpoint and promotion readback.
- worker/workspace/restore/verify.mjs — authenticated bounded snapshot/file reconstruction, private immutable file copies and promotion-time byte verification.
- worker/workspace/restore/service.mjs — strict commands, rehearsal, promotion/reconciliation and authorized read adapters.
- src/workspace/restore-ui.mjs — escaped request/review/promote/abandon UI and paginated exact-record renderer.
- tests/workspace/restore.test.mjs.
- db/workspace/migrations/20261031153831_tenant_restore.sql.
- This guide.

The migration was generated with Supabase CLI. Earlier unapplied owned migration 20261031152906 was replaced after main added 20261031153656_tenant_backup_schedules. Exactly one restore migration remains in the repository. No remote apply occurred.

## Supported typed schema and exact coverage

At inspection: **135 classified wm tables: 95 tenant, 13 related, 27 excluded; 108 typed isolated replicas**. Each replica has the reviewed source column types, NOT NULL and CHECK constraints, run-scoped unique keys and actual composite foreign keys. Cyclic dependencies are loaded in one bounded transaction with deferred foreign keys, then all constraints are made immediate before ready. No FK or source immutable-history trigger is disabled. Source defaults and triggers are not copied: source message/finance/notification triggers never execute in wm_restore.

The immutable local registry is captured from the installed reviewed backup registry, not from artifact instructions. Every physical wm table, every current registry classification/predicate/redaction and every column/type/nullability signature must match. Coverage must contain each table exactly once, exact included row counts, no excluded rows or extra tables. schema_profile is informational; its value alone proves nothing. New ad tables, changed columns or changed classifications require a reviewed schema/registry amendment and typed replicas before use. No automatic accept-new-table behavior exists.

Tenant families imported as inert typed data:

absence_windows, access_requirements, agreements, ai_attempts, ai_runs, allowance_entries, analytics_bindings, analytics_imports, analytics_normalized_pages, analytics_pages, analytics_partitions, asset_rights, attachments, attempt_observations, audit_events, billing_accounts, billing_obligations, billing_schedules, budget_authorizations, budget_reservations, business_facts, campaign_bindings, care_checks, catalog_snapshots, charge_bindings, closure_statements, closures, command_receipts, commitments, connection_mappings, critical_receipts, customer_export_receipts, customer_exports, decisions, delivery_observations, delivery_runs, dependencies, engagement_authorities, engagements, entitlements, export_jobs, fact_impacts, financial_adjustments, hosting_allocations, import_runs, inbound_routes, incidents, integration_credentials, intro_care_slots, invitations, lead_outcomes, measurement_checks, measurement_definitions, memberships, messages, metric_snapshots, milestones, notification_batches, notification_exception_notes, notification_items, notification_notices, notification_observations, notification_preferences, notification_routes, notification_sends, operation_attempts, operations, operator_assignments, opportunities, outbox_jobs, outcome_events, owner_capacity, owner_cover_revocations, owner_covers, owner_date_decisions, owner_date_proposals, owner_estimates, payment_references, provider_scopes, recovery_scopes, reports, requests, retention_actions, revision_facts, revisions, seo_items, service_starts, source_imports, stop_attempt_links, stop_intents, tenant_guards, time_entries, website_artifacts, website_releases, website_targets.

Related families:

catalog_registry, delivery_templates, inbound_anomalies, inbound_emails, inbound_events, notification_anomalies, notification_blocks, notification_channels, notification_webhooks, organizations, profiles, stripe_event_inbox, stripe_readbacks.

Related rows without organization_id must still match exact currently scoped live dependencies under the vetted registry predicate. Missing or changed global dependencies fail closed, rather than recreate shared records or guess ownership. The tenant organizations row must have the exact target ID.

Excluded families:

backup_manifests, capacity_periods, catalog_active, connection_tickets, event_receipts, inbound_inventory, inbound_inventory_pages, intake_arrivals, intake_commands, intake_conflict_decisions, intake_conflicts, intake_creation_grants, intake_events, intake_grant_revocations, intake_grant_uses, intake_links, intake_lock, intake_opportunities, intake_receipts, intake_sources, oauth_sessions, provider_connections, staff, tenant_backup_jobs, tenant_backup_parts, tenant_backup_registry, tenant_backup_schedules.

Global Auth is never imported or modified. Redacted integration credential material, invitation tokens and inbound-route tokens cannot reappear; even the presence of a redacted key in a supplied row is rejected. Historical memberships are changed to revoked in the candidate; operator capabilities become empty and assignments/engagement authorities revoked. Original exact history remains in the authenticated encrypted source backup. All other historical approvals, cover records, financial obligations, unknown attempts and jobs remain evidence only in a schema never consulted by existing dispatch/authorization. They must never be copied into live execution tables or interpreted as current authority.

## Transaction and authorization sequence

1. restore.request requires a live verified direct recovery operator, current session and recent MFA. It accepts only a manifest pointer and expected current external generation, with an exact stable-key/input binding.
2. SQL takes the tenant guard, creates the run, advances local recovery/authority generations, selects a fresh external-generation UUID, and sets restricted/positive_effects_allowed=false. Other tenants are unaffected.
3. freezeControl conditionally advances the independent control object from the expected prior generation to that exact run/generation. Lost acknowledgments are resolved by direct exact readback. Failure leaves local restriction in place. This does not prove remote ads stopped or external subscriptions cancelled.
4. Machine rehearsal rechecks the original live requester/session and current guard. It authenticates the independently retained latest checkpoint and witness head, manifest, snapshot, schema, rows, foreign keys and bytes. Neither a current-looking database nor an internally consistent old chain supplies missing current authority.
5. SQL imports into private typed replicas. A failed import rolls back every candidate row in its subtransaction and records attention. Live wm rows remain untouched except the explicit recovery guard.
6. The immutable plan binds run, manifest pointer/hash, exact normalized candidate hashes/counts, file proofs, current live baseline digest, complete checkpoint, generations and restricted mode. Exact records can be reviewed in deterministic pages of 100.
7. restore.promote requires current direct recovery authority and recent MFA against the exact plan hash and expected version. It records a bounded authorization intent only. A direct authenticated RPC cannot perform the machine commit.
8. The Worker rechecks the independent checkpoint, current guard and all copied file bytes, then calls machine-only wm_restore_commit. SQL checks current authorizer/session, 15-minute authorization window, baseline, plan and generations and atomically switches wm_restore.active to that run. State becomes promoted_pending_receipt, still restricted.
9. An encrypted immutable exact-key promotion receipt is GET/authenticated/read back, then CAS-bound into independent control. Only then does machine wm_restore_receipt mark promoted_read_only. Any uncertain SQL/R2/control result remains restricted and reconciles by the same run/hash/key. Postgres and independent storage do not commit atomically.

No second human approver is invented. A revoked requester/authorizer blocks the run; a newly verified recovery operator starts a fresh authorized recovery flow rather than restoring old roles.

Abandonment is permitted only before the commit, with current operator and expected version. It records attention and preserves restrictions. An expired/changed plan must be abandoned and replaced; no hidden replan or epoch decrement occurs. Once committed, rollback is a new forward-generation recovery.

## Independent checkpoint contract: required shared integration

The existing receipt witness records events; it cannot alone assert that no authority/deletion event was omitted. Main must wire and qualify an independent checkpoint publisher under its current recovery/retention contract. **This module never manufactures completeness from database rows or the backup.**

The independently governed control/<org>.json must have recovery_checkpoint containing a full authenticated envelope pointer in RECOVERY_BYTES. Its context is {type:"tenant_recovery_checkpoint",organization_id:ORG}. Plaintext schema is exact:

~~~json
{
  "format":"wm-recovery-checkpoint/1",
  "organization_id":"UUID",
  "control_generation":"current external generation before this freeze",
  "source_generation":"backup witness stream generation",
  "complete":true,
  "observed_at":"UTC timestamp",
  "valid_until":"UTC timestamp, at most 15 minutes ahead",
  "head":{"key":"exact encrypted witness-event key","context":{},"plaintext_digest":"...","ciphertext_digest":"...","bytes":123,"key_id":"retained key ID"},
  "tombstones":["workspace:FILE_UUID","message:MESSAGE_UUID"],
  "holds":[],
  "revoked_users":[],
  "withdrawn_approvals":[],
  "authority_mode":"all_historical_authority_inactive",
  "provider_reconciliation":"required"
}
~~~

Each list is unique, bounded to20,000 strings. Observation age is at most15 minutes. Future observations beyond30 seconds, stale expiry, absent fields, a hold/purge conflict or a missing anchor block use. A fully trusted application key plus a complete=true label is not evidence of independently administered custody; the publisher and completeness semantics must be qualified before enabling restore.

The checked current witness head must equal the checkpoint head, not merely descend from a valid old prefix. The backup's exact manifest seal must appear in the checked chain of at most256 events; older backups beyond this bound require a later reviewed segmented proof implementation. A newer late outcome invalidates the plan. Main must capture webhook/provider observations during the freeze without making restored jobs executable.

Supported latest purge identifiers are workspace:UUID, inbound:EMAIL_UUID:ATTACHMENT_UUID, export:UUID, message:UUID and request:UUID. Unsupported deletion families explicitly block promotion; they are not silently omitted. Purged source chunks are not fetched or recopied, so missing deliberately purged bytes do not cause resurrection. Message/request payloads are replaced with deletion tombstones in typed candidates; file metadata stays private, marked deleted. Conflicting hold and purge claims require resolution outside this module. Holds and authority overlays are bound to the immutable plan; all historical authority is inactive regardless of whether a particular ID appears in the revoked list.

## Actual bytes, consistency and bounds

The manifest and snapshot are authenticated using the existing AES-GCM envelope implementation and retained keyring. Exact source objects must match the typed attachments, tenant-routed inbound attachments and sealed customer-export records. Extra or missing file descriptors fail. Each 256 KiB source chunk has exact tenant/generation/backup/source/offset/length/whole-hash context. Full source SHA-256 is verified after assembly.

Nonpurged bytes are copied to encrypted create-only keys:
tenant-restores/<org>/<run>/file/<index>/<offset>.bin.
GET/decrypt/hash readback confirms each write; lost writes/checkpoints reconcile the same key. There is no public URL or customer file download. Before commit the copied bytes are verified again. Originals and copied ciphertext may become private orphans after a failed run; later qualified retention owns cleanup.

Bounds: 20,000 snapshot rows;16 MiB snapshot;2 MiB manifest;500 files;32 MiB each;256 MiB total source bytes;256 KiB chunks;1 MiB checkpoint;256 witness events;100 preview rows/page;20 status runs;1-day run deadline. One source buffer is assembled at a time, plus the snapshot and metadata. Rehearsal is a bounded whole verification operation, not a leased incremental scheduler; exact-key copies can resume after interruption. Maximum-bound CPU/subrequest budgets remain unqualified. Main must run it in an appropriately bounded recovery execution path and must not claim maximum-size Worker readiness from the small fixtures.

Consistent snapshot bytes come from the backup producer; no independent REST pages are combined into a pretend snapshot. Stage stores exact row text through PostgreSQL types, preserving decimal lexemes. The live baseline is compared again at promotion. Serialize schema migrations and live retention/GC under the appropriate recovery controls. Maintain backup/restore source and candidate holds through reconciliation; a hold cannot recover already deleted bytes.

## Exact shared wiring

- Allowlist RESTORE_COMMANDS before shared command validation, retaining Origin/CSRF/session/body limits/stable-key handling. Dispatch restoreCommand for request/promote/abandon.
- A current authorized backup selection supplies the exact sealed manifest pointer and expected live generation. Do not expose recovery pointers to customers.
- Run rehearseRestore(env,org,id) from the bounded machine recovery path; it is a real import, not an automatic effect dispatcher. Retry requested runs with exact keys; attention needs operator review/abandonment.
- GET restore status uses restoreStatus. GET exact candidate pages uses restoreRecords, which checks human authority and independent proof before/after machine reads. Do not expose wm_restore through PostgREST, raw grants or generic SQL/table endpoints.
- GET promoted recovery workspace uses restoreView. It selects wm_restore.active; original wm rows are not overwritten. Integrate this explicit restricted read model into the recovery screen, never route restored jobs to existing schedulers. Fixed projection shows engagements paused, requests waiting, facts needing fresh confirmation and providers unverified. The exact-record preview labels historical rows inert.
- Build restore-ui.mjs and wire restoreViews, restoreFormInput and restoreRecordPage. Use escaped text for archived content, accessible inline errors and next-page controls. No artifact text is HTML or an instruction.
- Same RECOVERY_BYTES, retained BACKUP_KEYS/BACKUP_KEY_ID, separate qualified witness and RECOVERY_CONTROL are required. The new checkpoint publisher is mandatory. Main reports tenant-witness-v1 hooks integrated; this module did not rerun or qualify them.
- A lost promotion response reconciles with completePromotion only after a still-valid authorization/plan. It never reissues a financial, ad, publication or email action.
- Fresh customer membership, provider reconnect, read-only remote reconciliation and separately approved positive actions remain normal current workflows. Do not reopen tenant access merely because this module says promoted_read_only.

## Unsupported boundaries and qualification

Fail closed on unknown/changed schema; missing/currently changed global dependencies; missing or stale latest authority/deletion proof; backup seal beyond the bounded chain; unsupported purge target families; corrupted or unavailable nonpurged bytes; stale baseline/plan/session/generation; missing retained keys. No automatic schema conversion, global Auth restoration, account provisioning, restored credentials, physical purge, global DR, or customer-access reenablement is supplied.

The current recovery projection is operator-only. Extending normal customer/service reads to a recovered generation and reauthorizing new work is shared integration, not permission to query arbitrary old rows. Financial and provider evidence is preserved inert, not asserted reconciled. Earned/unpaid obligations are not erased; uncertain attempts require read-only provider reconciliation before conflicting fresh actions. No claim of remote campaign pause/closure is made from a local freeze.

Focused checks use actual PGlite plus deterministic fake buckets/control, not live providers. Real PostgreSQL concurrency, browser journeys, maximum Worker bounds, live Supabase/R2 grants, independent admin/key custody, physical offline copies and owner-account-loss drills remain unrun here. Main's earlier CI/staging reports concern its integrated modules, not validation of this new migration.

Official platform boundary: Supabase database backups do not contain Storage bytes; physical project clone recovery is not this logical isolated protocol. See [Supabase backups](https://supabase.com/docs/guides/platform/backups), [clone restrictions](https://supabase.com/docs/guides/platform/clone-project), [R2 conditional writes](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/) and [R2 consistency](https://developers.cloudflare.com/r2/reference/consistency/). The changelog Markdown endpoint could not be rendered by the web tool; no provider-version or new SDK contract is assumed by this module.


## Observed local validation — 2026-10-31

Executed: node --test tests/workspace/restore.test.mjs. Result: 20 passed, 0 failed, 0 skipped; 36.79 seconds. Nineteen tests use actual local PGlite migrations/actor helpers with deterministic fake byte/control adapters; one tests strict validation and escaped HTML. All five JavaScript files passed node --check. No full suite, browser, real PostgreSQL concurrency, live provider or remote migration test was run.
