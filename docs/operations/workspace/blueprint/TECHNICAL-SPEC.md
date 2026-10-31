# Wonder and Method Workspace Technical Specification V2

Companion implementation contract for Business Plan V2 • October 30, 2026

## 1 Boundaries and authority

This specification defines the intended implementation; it is not executable SQL, a production security assessment or evidence that a test has passed. Implement incrementally in the existing repository after inspecting its current instructions and branch. Preserve the established public site, offer authority and release gates. New filenames below are proposed ownership locations, not a claim that those files already exist.

| Component | Owns | Must not own |
|---|---|---|
| Public Cloudflare Worker + D1 | Original public inquiries, acknowledgment/retry and existing public site | Editable private engagement conversation |
| Supabase Postgres | Accepted engagements, membership, revisions, decisions, messages, file metadata, observations and operations | Google billing or an independently editable campaign configuration clone |
| Supabase Auth | User identity and sessions | Business authority inferred from email/domain |
| Supabase private Storage | Quarantined and approved file bytes | Public unrevocable client links |
| Resend | Email transport and transport events | Business acceptance, approval or completion |
| Google Ads | Actual account/campaign configuration, serving, platform metrics and ad billing | W&M fee, agreement or customer lead-quality truth |
| Stripe payment provider | Financial transaction state | Campaign approval or automatic suspension of unrelated work |
| Backup destination | Protected recoverable records, files and critical receipts | A live editable workflow or retrying scheduler |

Data path: public inquiry → durable D1 receipt → accepted opportunity/proposal import → Postgres engagement. Private customer/API requests → Cloudflare authorization/session boundary → scoped Postgres commands/queries. Files → short-lived upload authorization → quarantine → validated availability. Business transition → transactional outbox → one cron dispatcher → provider effect → reconciliation → verified receipt. All external effects remain separate from database commit.

Use **https://app.wonderandmethod.com** for `/workspace/`, `/operator/` and all private API routes. The public site's existing third-party chat/analytics scripts execute on the marketing origin; omitting them from a private page on that same origin would not isolate private APIs. The public `/workspace/` route may only redirect to an allowlisted private entry point. Deploy the private Cloudflare Worker/service route with scoped bindings and secrets; reuse the repository and domain modules without exposing private routes or secrets to the public Worker. This separates the trust boundary without introducing a second private data backend or scheduler.

Private sessions use host-only `__Host-` Secure/HttpOnly cookies with Path=/, no Domain attribute, and appropriate SameSite. Require exact private Origin and CSRF validation for mutations; same-site sibling origins are not trusted. No credentialed CORS allowance for the public origin; no wildcard origin, postMessage token handoff or shared parent-domain session. Apply a restrictive private CSP with no marketing vendors and `frame-ancestors 'none'`; private responses are no-store with a no-referrer policy on sensitive task/auth pages. The public service worker cannot control the separate private origin. Inspect route precedence and remove public asset fallback from private API routing; authentication failure returns no private data. Test the boundary with synthetic signed-in sessions before launch.

## 2 Implementation modules

Proposed paths under the existing site repository:

- `src/workspace/`: accessible client/owner components, labels and rendering; no secrets or provider mutation code.
- `src/workspace/domain/`: typed states, schemas, permissions and pure transition rules shared by validation/tests.
- `worker/workspace/`: session boundary, scoped API commands, safe downloads, integrations and dispatcher, adapted to the repository's actual Worker layout.
- `db/workspace/migrations/`: ordered expand/contract migrations, policies, constraints and narrowly scoped transaction functions.
- `config/ads-service.json`: versioned commercial scope and enabled public visibility; validated against existing `config/offers.json` to avoid two conflicting price authorities. Prefer integrating the typed ads record into the existing catalog if its schema supports it; do not keep both independently editable.
- `tests/workspace/`: authorization, state, concurrency, integration-simulation and UI acceptance evidence.
- `docs/operations/workspace/`: readiness/launch/pause/offboarding/restore/import/incident runbooks, source verification dates and ownership.

Before adding a new framework, prove existing static rendering/Worker structure cannot support the narrow application. Use progressive enhancement and ordinary forms where possible; avoid shipping the workspace bundle on marketing pages. Select a migration/test library based on the repository toolchain, not this document's illustrative path names.

## 3 Data conventions

Use generated UUID primary keys; UTC `timestamptz` event timestamps; explicit IANA account timezone and ISO currency for reports/spend. Display dates in the agreed account/business context with timezone labels. Store money in integer minor units with an explicit currency exponent, or a validated decimal monetary type when provider precision requires it; normalize Google micro-unit costs through tested conversions. Never sum currencies. Metrics use exact integer/decimal columns rather than binary floats where precision affects decisions.

Every tenant-owned row has `organization_id NOT NULL`. Every parent has a unique `(organization_id,id)` key and children use composite foreign keys, so a child's tenant cannot disagree with its parent. Nullable parent relationships still require an explicit visibility rule. Operational unique keys include provider + account + object/event ID where IDs are not globally unique. Content/evidence digests are SHA-256 over a canonical versioned representation, not an unstable UI screenshot.

`created_at`, `updated_at`, `created_by` and optimistic `version` belong on mutable business rows. Append-only decisions/events use sequence/time plus actor. Names and emails are display data; provider IDs and local IDs are distinct. Soft deletion/revocation and retention state must be explicit. Do not cascade-delete approval/financial evidence when removing a person; retain a minimal actor reference under the approved schedule.

## 4 Core schema

Types shown are a design contract. Exact indexes and constraints are implemented and tested in migrations before use.

| Table | Required fields beyond common IDs/timestamps | Principal constraints |
|---|---|---|
| `organizations` | name, legal/display name if needed, timezone, status, confirmed_facts JSON with source/date/schema_version | No automatic merge by domain/email; confirmed facts are versioned |
| `profiles` | auth_user_id unique, display_name, preferred_locale | Identity profile has no implied tenant role |
| `memberships` | organization_id, user_id, role, status, invited_by, revoked_at, authority_verified_at | Unique org/user; role customer_admin/contributor/viewer; current status checked for every command |
| `operator_assignments` | organization_id, operator_user_id, capabilities, active_until | W&M operators are separate from customer admins; MFA requirement enforced server-side |
| `engagements` | service_type, catalog_version, agreement_revision_id, commercial_state, service_start_at, service_end_at, owner_user_id, version | Enum ads_search/web_design/seo/care; ads_search/web_design/seo/care plus typed catalog-project templates available at launch; no service state inferred from payment |
| `engagement_authorities` | engagement_id, user_id, authority_kind, starts_at, ends_at, revoked_at, verified_by | Named approver, spending authority and authorized substitute; one active primary approver per decision domain plus explicitly authorized substitute; no automatic contributor promotion |
| `requests` | engagement_id, outcome, state, approver_user_id, accepted_scope, next_contact_at, committed_at, waiting_reason, version | States and transitions validated; one canonical request; coverage/price/date accepted by operator |
| `messages` | engagement_id, request_id optional, direction, visibility, sender_user_id optional, provider_message_id, body_ref/body, status | Shared/internal explicit; unknown inbound remains triage; internal rows never client-visible |
| `attachments` | engagement_id, authoritative_parent_type/id, request_id optional, uploader_id, visibility, object_key, original_name, media_type, bytes, checksum, scan_state, retention_class | Explicit draft/shared/internal audience; parent-chain/visibility checks apply to metadata, bytes, previews and exports; received ≠ usable |
| `revisions` | request_id, kind, sequence, manifest JSON, digest, schema_version, supersedes_id | Immutable contents; unique request/sequence; kind campaign_package/agreement/report/web_preview/seo_content |
| `decisions` | request_id, revision_id, digest, actor_id, authority_id, decision, shown_scope, decided_at, supersedes_decision_id optional | Append-only approve/request_changes/withdraw; FK binds same org/request/revision; latest valid decision computed with revocations |
| `payment_references` | engagement_id, provider, external_invoice_id, external_charge_id, observed_state, observed_at, period | Preserve distinct genuine charges; source provider authoritative; restricted finance visibility |
| `event_receipts` | provider, account_id, external_event_id, payload_hash, received_at, verified_at, processing_state | Unique scoped event ID; durable intake before acknowledgment; replay with different hash is an incident |
| `operations` | engagement_id, request_id optional, operation_kind, operation_key, desired_digest, state, provider_reference, observed_result, epoch, version | Unique operation_key; intent persisted before effect; pending/in_flight/unknown/verified/failed/cancelled distinct |
| `outbox_jobs` | operation_id, kind, payload_ref, not_before, lease_until, attempts, epoch, state, last_error_code | Transactional with business transition; bounded retries; uniqueness by operation/effect kind |
| `audit_events` | org, actor, action, target_type/id, before_version, after_version, reason, correlation_id | Append-only by application role; redact secrets and unnecessary content; access restricted |
| `source_imports` | source_system, source_id, organization_id, engagement_id, source_hash, status, imported_at | Unique source_system/source_id; retry cannot create another engagement or overwrite newer facts |
| `backup_manifests` | backup_id, class, object_manifest_ref, counts, checksums, created_at, restored_test_at, expiry_at | Track row and file completeness; external effects disabled during restore |
| `critical_receipts` | event_type, target_id, digest, external_backup_ref, persisted_at, actor, predecessor_receipt_id, sequence, durability_status | Covers approval/withdrawal, authority/revocation, spend/pause and execution; independently retained, but available receipts alone never prove latest-tail completeness |

A request may contain several review revisions; an engagement may contain several requests. Messages can exist on the engagement before a request is accepted. Invitations grant no access until identity and intended organization are confirmed. Membership does not grant approval rights without active engagement authority.

Attachment authorization is the intersection of explicit file audience, current parent visibility and actor permissions. Internal-note attachments and derived previews remain operator-only. An unlinked upload intent is a draft visible only to its uploader and permitted operators. A checked linking command chooses one authoritative message/request parent; every supplied org/engagement/request/message association must agree, including same-business parents. Generic link/reparent commands cannot widen audience. An operator may deliberately publish a reviewed copy through a separate share command with an explicit destination, new shared record and audit; the internal original stays internal. Apply the same rule to listing, metadata, downloads, signed URLs, direct Storage access, previews, notifications and customer exports. Scan readiness grants no visibility by itself.

## 5 Ads extension schema

| Table | Fields and purpose | Invariant |
|---|---|---|
| `ads_settings` | engagement_id unique; service scope; account reference; coverage; loss allowance; review/stop date; consent/measurement references; schema_version | One typed settings record; monetary authority is validated fields, not arbitrary JSON |
| `connected_accounts` | provider, external_customer/property_id, currency, timezone, permission_level, access_status, last_checked_at, credential_ref optional | Unique org/provider/account mapping; shared manager context explicit; never expose secret values |
| `budget_authorizations` | recurrence_rule, period_key, renewal_policy, engagement_id, revision_id, authority_id, currency, total_allowance, allocation JSON with campaign IDs, valid_from/until, reserve, routine_change_limits, status | Positive amounts; bounds/effective dates required; explicitly accepted recurring authority may roll into a new period; no inferred renewal beyond its terms |
| `measurement_definitions` | engagement_id, outcome, primary_source, external_action_id, bidding_role, qualification_rule, dedupe_rule, consent_version | One authoritative counted outcome per path; goals inspected including custom goals |
| `measurement_checks` | definition_id, tested_at, tester, scenario, outcome, evidence_ref, expires/retest_reason | Success/failure/duplicate/consent/receipt tested; changes invalidate relevant evidence |
| `campaign_bindings` | engagement_id, external_customer_id, campaign_id, desired_state, last_observed_state, observed_at, approved_revision_id | Desired state never overwrites observed fact; account/currency/timezone validated |
| `import_runs` | engagement_id, source, source_file_id, hash, period_start/end, account_id, timezone, currency, total/accepted/rejected counts, schema_version, status | Atomic staged validation before promoting snapshot; partial/rejected explicit; duplicate import no double totals |
| `metric_snapshots` | engagement_id, import_run_id, metric_definition_version, period, source, value, unit, observed_at, provisional, supersedes_id | Revisioned snapshots; null unknown ≠ 0; attribution windows/source never silently merged |
| `lead_outcomes` | engagement_id, pseudonymous_source_key, occurred_at, outcome, value/currency optional, source/consent_ref, last_confirmed_at | Minimized; unknown legitimate; client CRM remains source where present; no unneeded contact PII |
| `conversion_upload_results` | import_run_id, source_row_key, provider_job_id, accepted/rejected/unknown, reason, reconciled_at | Upload acknowledgment not attribution; no blind duplicate resubmission |
| `service_pauses` | stop_epoch, active_stop_intent_id, stop_clearance_decision_id, engagement_id, reason, requested/observed campaign state, continuing_work, billing_treatment, review_at, restart_authority, evidence_ref | Every pause has separate service, serving and fee facts |

Index organization + parent + state/date for queues; org + engagement + period for results; provider event uniqueness; job state/not_before; current memberships/authorities. Measure real query plans and payload limits before adding generalized search or warehousing.

## 6 Authorization implementation

Prefer server-side session handling in the private Cloudflare API and user-scoped Supabase queries/RPCs. Verify JWT signature/issuer/audience/expiry with supported libraries; refresh sessions securely. Apply the host-only cookie and exact-Origin/CSRF boundary in §1, not a path-based approximation. Use private-origin allowlisted return paths, rate-limited OTP/invites and non-enumerating login responses. Custom production SMTP and scanner-safe OTP fallback are required; [Supabase email template limitations](https://supabase.com/docs/guides/auth/auth-email-templates#limitations) explain why emailed links can fail.

Enable and test [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) on all exposed tables and private Storage policies. Ordinary user commands must not use a service-role key that bypasses their policies. Restrict grants so browser clients cannot alter protected state columns, authority, audit or operations directly; use explicit command RPCs. A narrowly scoped privileged function must independently check actor, current membership/role, tenant/parent, authority and expected version; use a fixed safe search path, qualified names, reviewed function ownership and minimal EXECUTE grants. Do not trust user-editable metadata for roles.

Jobs/webhooks necessarily have a server identity. Their privileged entry points validate provider signature or worker identity, derive tenant from a verified stored mapping, validate the parent chain and recheck current engagement/approval/epoch before effect. Arbitrary payload organization IDs never grant authority. Keep privileged credentials only in server secrets, with distinct test/prod credentials and rotation/revocation runbooks.

| Actor | Read shared | Send/upload | Approve | Invite/remove | Launch/change ads | Internal notes/operations |
|---|---|---|---|---|---|---|
| Viewer | Assigned business | No | No | No | No | No |
| Contributor | Assigned business | Yes | No | No | No | No |
| Customer admin | Assigned business | Yes | Only if named authority | Request/manage permitted customer roles through checked commands | No direct W&M operator action | No |
| Named approver | As membership permits | As membership permits | Current assigned revision/scope only | No implied admin right | Approves authority, does not execute launch | No |
| Assigned W&M operator | Assigned scope | Yes | Cannot impersonate client | Verified assignment flow | Under current approval/standing authority | Yes, assigned scope |
| Background worker | Needed row set | Typed effects only | Never | Never | Typed supported operations under current authority | Restricted machine evidence |

Customer invitation flow cannot invite operators or elevate to spending approver without the business authority verification step. Approver replacement ends old authority and invalidates pending permissions as appropriate. Require recent authentication for material approval/access changes and operator MFA for high-risk functions. Handle multi-business tabs by including org in routes/request body while deriving access server-side; changing the visible switcher never changes another tab's implicit authority.

## 7 Additional records for a complete release

All tables inherit tenant/parent constraints, explicit authority, versioning and retention conventions above. The schema is a contract to implement in migrations, not unreviewed executable SQL. JSON carries versioned display/configuration detail; money, authority, relationships and executable action types use validated typed fields.

| Record | Required fields | Integrity and ownership |
|---|---|---|
| `opportunities` | source_import_id, stage, source, requested_services, next_action, assigned_operator, won_lost_reason | D1 owns raw intake; Postgres owns accepted opportunity; no competing lead-board editor |
| `catalog_snapshots` | version, service_id, scope, price_components, allowance_rules, billing_policy, digest | Immutable snapshot, validated from current catalog; no silently changing old agreements |
| `proposals` / `agreements` | engagement_id, revision_id, catalog_snapshot_id, status, signatory_authority_id, starts_at, ends_at | Accepted version immutable; separate amendment; electronic acceptance receipt exported |
| `entitlements` | engagement_id, kind, period, quantity/unit, consumed, rollover_policy, source_agreement | Covered work references entitlement; optimistic reservation and settlement prevent double consumption |
| `milestones` | engagement_id, deliverable, due_date, acceptance_rule, invoice_ref, earned_amount | Website and ads schedules remain distinct; earned/due/paid separate |
| `billing_schedules` | engagement, provider_subscription/item, effective_dates, interval, next_invoice_at, cancellation_policy | One active schedule per charge component; change effective date, not historical invoice rewrite |
| `financial_adjustments` | invoice/charge, amount,currency, reason, authorized_by, provider_id, state | Credit/refund intent and actual provider result; a second real charge is not deduplicated away |
| `business_facts` / `asset_rights` | key,value,source,confirmed_by,confirmed_at,valid_until,license/provenance | Stale/conflicting facts request confirmation; changed shared facts produce affected-work list |
| `access_requirements` | provider/account/property, capability, person_to_act, status,last_checked,evidence | Existing/no-account/wrong-account/provider-owned/lost-access branches; never store passwords |
| `commitments` / `dependencies` | engagement/request, deliverable, owner,due_date,status,blocking_request_id | All promises stay visible; dependency graph must be acyclic; no silent rescheduling |
| `website_releases` | request, preview_revision,digest,repository,target,commit,build/deploy_id,previous_release,verification | Approval of preview does not approve later changed bytes; actual deployment proof |
| `seo_plans` / `seo_items` | engagement,period,property,URL/topic,source_findings,deliverable,content_revision,status | Publication and observed indexing/rank are separate fields |
| `care_checks` / `allowance_entries` | engagement,period,scheduled_check,observations,edit_minutes,correction_reason | Contract-specific included work; W&M defect correction not charged as new output |
| `reports` | engagement,period,source_snapshot_ids,narrative_revision,published_at,supersedes | Published report immutable; corrections create a visible revision |
| `notification_preferences` / `absence_windows` | membership/engagement,channel,digest,next_contact,backup_authority,coverage | No marketing opt-in inferred; urgency behavior follows agreed policy |
| `time_entries` / `capacity_periods` | operator,engagement/task,category,minutes,available,shared_allocation | Disjoint allocation; preserve original entries and corrections |
| `incidents` / `recovery_scopes` | severity,affected_tenants/capabilities,evidence,owner,status,next_update,epoch | Broaden scope on uncertainty; explicit resumption evidence and actor |
| `export_jobs` / `retention_actions` | audience,cutoff,manifest,expiry,legal_hold,deletion_tombstone | Export sees only entitled audience; deletion re-applied after restore |
| `provider_connections` / `secret_envelopes` | provider,principal,account_mapping,permissions,key_version,ciphertext,nonce,expiry | Private server-only secret store; no ordinary authenticated table grants |
| `ai_runs` | task_type,input_refs/input_versions,model_config,prompt_version,output,status,review,usage | Sources and version visible; rejected output cannot become policy |

Add service types for generic catalog projects without allowing arbitrary executable workflow JSON. Explicit handlers map each current catalog ID to project, recurring production, Care or Search Ads delivery. Include commerce site/Care services already sold. Validate complete mapping automatically: any active catalog service without a functioning template fails release qualification.

## 8 State transitions and command contracts

Independent domains: opportunity (`new/qualified/proposed/won/lost`); agreement (`draft/sent/accepted/superseded/terminated`); service (`setup/active/paused/ending/closed`); payment (provider observation); request (`received/triage/waiting/accepted/preparing/in_review/approved/executing/verifying/complete/changes_requested`); external operation (`pending/in_flight/unknown/verified/failed/cancelled`); campaign (`unverified/paused/enabled/limited/not_serving/inaccessible`); measurement (`untested/healthy/degraded/broken/unknown`); report (`missing/fresh/provisional/stale/failed`); file (`received/quarantined/checking/ready/rejected/expired`). Each transition records actor, time, version and reason. Service active does not prove ads serve. Paid does not prove approval. No transition erases history.

Commands require validated session, current membership/operator capability, exact org/parent chain and `expectedVersion`. Money carries currency; timestamps carry account/business context. `Idempotency-Key` is scoped to actor + org + command and a canonical payload digest. Reuse with a different payload returns 409; a retry with the same payload returns canonical state. HTTP failure after commit does not invite duplicate creation. GET requests, link scanners and email previews never mutate state.

Approval transaction: lock request/current revision → verify current decision authority and intended scope → verify immutable digest and authority terms → append decision → update eligible request → append audit/outbox → commit. Revisions cannot mutate after approval. Feedback and withdrawal remain possible when a budget has expired; a stale feedback note is retained against its original version and cannot approve a newer one. Revocation takes immediate local effect and invalidates queued affected operations. A substitute must have explicit current authority.

For recurring budgets, create a deterministic period instance from the accepted recurrence rule, allowed amounts and validity. Carrying a period does not increase the ceiling or extend a terminated agreement. Sum campaign allocations/reserves in one currency; shared budgets and unmanaged campaigns must be represented to avoid double allocation. Show billable service and current-period authority separately. A material increase creates a new approval; a permitted rebalance within the envelope logs the change without unnecessary client review.

Core API families (all under private origin; org IDs never confer permission):

| Method/route | Action and essential behavior |
|---|---|
| GET `/api/workspace/businesses`, `/:org/overview`, `/:org/work` | Authorized projection; includes all obligations and separate freshness/state |
| POST `/api/operator/inquiries/:source/accept` | Unique D1 import → opportunity/proposal draft; no duplicate receipt/email |
| POST `/api/operator/:org/proposals`, `/:id/send` | Versioned scope/catalog/fee/date; signatory assignment; verified recipients |
| POST `/api/workspace/:org/agreements/:id/accept` | Exact revision and signer authority; recorded consent and downloadable receipt |
| POST `/api/workspace/:org/billing/session` | Checked finance role; provider-hosted session for mapped customer; allowlisted return URL |
| POST `/api/operator/:org/adjustments` | Authorized amount/currency/reason; durable refund/credit intent; reconcile unknown provider result |
| POST `/api/workspace/:org/requests`, `/messages`, `/lead-outcomes` | Typed input, same-business parents; internal visibility cannot be set by client |
| POST `/api/operator/:org/requests/:id/accept` | Atomic scope/coverage/blockers/date/owner/authority acceptance |
| POST `/api/workspace/:org/requests/:id/decisions` | Exact revision, decision, feedback; stale conflicts return useful review action |
| POST `/api/workspace/:org/files/upload-intent`, `/:id/finish`; GET `/:id` | Unique quarantine object, actual byte verification, scan state; audience/parent checked on every access |
| POST `/api/operator/:org/ads/prepare`, `/ads/apply`, `/ads/resume` | Typed supported intent and approved manifest; current rights/state before effect; provider readback |
| POST `/api/workspace/:org/ads/stop` | Current authorized defensive request; no new positive-spend approval; immediate receipt, verified outcome follows |
| POST `/api/operator/:org/operations/:id/takeover`, `/reconcile` | Increment epoch; stop new claims; expose in-flight action; reconcile instead of blind retry |
| POST `/api/operator/:org/releases`, `/:id/verify` | Approved artifact/commit/target; provider proof and live-check result; cannot fabricate success |
| POST `/api/operator/:org/reports/:id/publish` | Frozen source snapshots and reviewed narrative; corrections supersede |
| POST `/api/workspace/:org/engagements/:id/cancel`, `/exports` | Service-specific authorized exit/export; independent campaign/billing/access completion |
| POST `/api/integrations/:provider` | Raw signed event, timestamp/dedup validation, stored account mapping; persist receipt before async processing |

Membership/invitation, preferences/absence, profile/fact, SEO/Care work, time/capacity, catalog and incident commands use the same explicit typed command layer; document payload schemas and capability mapping in implementation, without unrestricted generic table editing. Errors: 400 field correction; 401 sign-in/recovery; 403/404 consistent non-disclosure; 409 reload/review; 413 supported-size guidance; 429 retry window; 503 unconfirmed plus status lookup. Return correlation ID, not raw private stack traces.

### Stop ordering and eventual provider state

An accepted stop command atomically creates an active stop intent for the exact account/campaign set, increments its monotonic stop epoch, invalidates unclaimed positive launch/resume/increase jobs, records all already-dispatched positive operations, and queues defensive pause plus independent receipt. A positive job must register its in-flight record and epoch under the same serialized account/campaign coordination boundary before its final permission check and provider dispatch. An active stop rejects new positive dispatch even when recurring budget authority remains valid. A check-then-send race is therefore visible as a registered in-flight attempt, not invisible work.

The provider may still complete an already-dispatched positive action after the first pause. Pause promptly where possible, reconcile every registered older positive attempt, and apply the desired paused state again if that attempt changed it. Keep the stop intent active throughout retries/outages. Do not issue a final verified-pause completion while an older positive attempt remains capable of changing the result; show “Pause observed; earlier change still being checked” when appropriate. Final confirmation requires older effects resolved and current paused readback for the complete managed set, with observation time. External customer/provider edits after confirmation are detected as drift and handled under the continuing stop intent; no observation promises perpetual remote immutability.

Resume requires a distinct current authorized clearance of the active stop (or an explicit resume instruction already included in that stop's accepted terms), fresh material configuration/budget checks, and a new operation at the current epoch. Generic standing optimization authority alone does not clear a stop. Stop receipts, epochs and clearances participate in affected-scope recovery; an old restored queue cannot revive a pre-stop action. Exercise stops before claim, between claim and dispatch, during remote mutation, after a provider timeout and across worker takeover/restore. The operator runbook continues until convergence or explicitly unknown remote state, never a false green receipt.

## 9 Files, email and work routing

Selected scan adapter: Cloudmersive advanced file scan over HTTPS, with server-only API key and the paid entitlement needed for 20 MB files. Permit the agreed file formats (PNG/JPEG/WebP/PDF/TXT/CSV/DOCX/XLSX), ten files per request initially; these are technical resource limits with useful help, not a client-count restriction. Verify actual type/signature/bytes against declaration. Explicitly reject executable/script/active HTML/SVG/archive/password-protected/macro content. Configure the adapter's content restrictions; only a complete clean response for the exact checksum can promote a file. Timeouts/5xx remain checking with an assigned retry; they never imply clean. Retain harmless message text if one attachment fails. Provider-specific settings and SDK version are pinned in tests. [Scan API](https://api.cloudmersive.com/docs/virus.asp)

Cloudmersive states its APIs do not retain payloads after processing; verify the subscribed region, DPA and actual contract before sending customer files. Do not infer universal legal compliance from marketing text. [Security statement](https://cloudmersive.com/security)

Upload intents reserve bounded size and audience, support progress/retry/resumable behavior appropriate to the chosen storage API, and expire unlinked objects. Server checks actual completed bytes/checksum and tenant path before scan. Files use opaque generated object keys. File names are sanitized display data. Use authenticated streamed downloads with safe MIME, nosniff and attachment disposition for original documents; do not render active documents inline. Safe raster previews are optional; if generated they inherit parent audience and are regenerated from validated bytes in isolated processing. A scan does not grant sharing rights. Export/download/metadata/search all intersect current membership, parent visibility and explicit audience. An operator's deliberate share creates a reviewed shared copy; it does not relabel the internal original.

Resend runs on a dedicated inbound subdomain, separate from existing human mailbox MX. Raw webhook signature/timestamp validation precedes durable unique receipt. Retrieve full body and temporary attachment URLs promptly, validating provider identity and safe fetch destination. Plain text/sanitized content is the message source, not executable HTML. Store provider thread/message references and a non-guessable routing token. Matching From/domain/token is routing evidence, never authority to view prior private history or accept a decision. Unknown or forwarded senders receive at most a neutral receipt and go to assigned triage. Safe same-thread replies do not auto-invite new members. [Resend receiving](https://resend.com/docs/dashboard/receiving/introduction)

Deduplicate provider events and own outbound message identifiers; prevent bounce/autoresponder loops. A human reply suspends the pending reminder while reviewed without falsely marking the blocker solved. Recheck audience, unresolved action, last reply, absence and next-contact immediately before send. Template acknowledgment/digest/reminders may auto-send from current verified facts; novel commitments and AI-written external text require review. Track queued/sent/delivered/bounced separately; never equate delivery with work completion.

Inbound lead/outcome adapters are distinct from the engagement conversation. Use authenticated provider signatures or scoped server credentials, account mapping and source keys. Forms, supported calls and external bookings preserve source, event time, received time and record identity; booked, attended, suitable and won are separate outcomes where supplied. Store only necessary contact data in the client's authorized system; the workspace links pseudonymous keys. If an optional response/booking workflow is separately contracted, replies/bookings/opt-outs cancel its queued follow-ups before send. No marketing automation is silently included in Search Ads scope.

## 10 Provider execution, payments and reports

Use typed adapter functions, not arbitrary provider requests from the browser. Each operation includes business/account, intended outcome, actor/authority/revision, precondition snapshot, operation key, current epoch and reconciliation query. Dispatch claims a leased job and rechecks current authority immediately before the effect. Takeover increments epoch and prevents future old claims; already in-flight effects remain visible for readback. Provider idempotency is used where supported, but the local operation ledger survives provider dedup windows. For non-idempotent creates, query current state using stored identifiers/correlation before retry; ambiguity goes to assigned operator review. Exactly-once effects are not promised.

Google Ads launch scope: read account/campaign/budget/goals/assets/metrics; create and change supported Search campaign/ad-group/keyword/negative/responsive-ad/assets configuration; enable/pause/resume managed campaigns under authority. Use explicit field masks, version-pinned request schemas and validate-only where available. Handle partial failures per operation; a batch HTTP success is not full success. Proposed manifest includes every material setting including auto-generated/expansion/recommendation behavior. Check actual configuration and record readback after each mutation. If the required manifest cannot be verified, positive changes wait for the named operator; defensive authorized pause remains available. [Google API access](https://developers.google.com/google-ads/api/docs/api-policy/access-levels)

Account creation, Google billing and advertiser verification use guided native steps because they involve provider permission and customer responsibilities. The app tracks actor, exact expected account/property and evidence. No-existing-account, former-provider ownership, wrong shared property and missing permissions each have an action/help route. API production access is verified separately from test fixtures. Explorer's restrictions and quotas are respected; Basic/Standard and permissible-use approval are requested if needed by implemented functionality. No unapproved account or paid campaign is used merely to make acceptance tests look real.

Ads/GA4/Search Console reads use isolated account mappings, pagination, quotas/backoff, overlapping lookback windows and idempotent source-key upsert. Protect access to metric detail as tenant data. Keep source snapshots/definitions; conversion counts from different systems do not sum. Search Console inspection describes Google's indexed version, not a live URL test. [Search Console inspection](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect)

CSV import is a finished fallback: quarantined file → schema/account/currency/timezone/period validation → row error preview → explicit promotion → revisioned complete snapshot. Same file/hash cannot double-count; conflicting duplicate IDs surface an error; partial data cannot replace a complete period silently. Escape spreadsheet formulas on export. Corrections preserve old report versions. Currency, timezone, DST, micros-to-minor-unit conversions, denominators and missing values have deterministic tests. [GA4 authorized reporting](https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart)

Offline conversion upload is supported only through an expressly configured Data Manager/approved adapter when contracted and permitted; ordinary reporting works without it. Store per-row accepted/rejected/unknown results, dedup keys, consent/definition version and reconciliation state; API acceptance is not attributed success. If this optional service is sold, its actual provider path must be qualified first. The release does not advertise an unsupported generic upload API.

Stripe: separate test/live account identities and event secrets; verify raw signature; persist receipt before 2xx; deduplicate by provider event ID; retrieve current invoice/subscription/charge state rather than trust delivery order. Distinct charges remain distinct even when the buyer clicked twice. Record checkout/session/invoice/charge/subscription mappings before effects; never trust metadata supplied by the browser for tenancy. Agreement schedule creates a stable billing operation; payment success URL only prompts reconciliation. [Stripe webhooks](https://docs.stripe.com/webhooks)

Supported finance cases: successful/declined/authentication-required payments; renewal; partial or overpayment; unpaid/void/uncollectible invoices; credit/refund/dispute; failed invoice finalization; service and campaign pause; immediate/period-end cancellation; reactivation under new accepted terms. Invoice changes preserve provider audit. Current provider state, accepted policy and effective date determine future charges. A late paid event after cancellation triggers reconciliation, not reinstatement. Portal-originated cancellation creates the same closure record and responsible campaign action; missed webhook recovery polls provider objects. Disable unsupported subscription changes in the provider portal rather than expose changes the workspace cannot honor.

## 11 Scoped recovery and independent evidence

Critical local withdrawals/revocations deny immediately. Record independent durability separately; failure cannot turn a local stop into approval. Prior to new positive external spend, independently persist the current authority/approval receipt; after effect persist execution evidence. Receipt objects have sequence/predecessor/digest and append-oriented access. Available prefix alone never proves no later missing revocation. Direct defensive action under verified standing/recovery authority can proceed with secure alternate incident evidence during receipt failure; reconcile before any positive action.

| Recovery situation | Restriction | What establishes safe resumption |
|---|---|---|
| Rebuild report/import from current intact data | Affected report/import only | Validated replacement/source totals; current membership never restored from old backup |
| Restore file bytes while current DB/auth remains intact | Affected missing file only | Exact expected checksum, current audience and deletion state; no old file index replaces current metadata |
| Logical restore of one tenant's authority/work records | Affected tenant sessions, positive effects and queued jobs | Verified isolation, fresh current membership/authority through independent recovery identity process, deletion/receipt/provider reconciliation |
| Global DB/Auth restore or unknown cross-tenant compromise | All potentially affected access/effects until scope established | Fresh operator MFA enrollment, independently verified business owners/successors, reconciled current provider/payment/mail state and deletion tail |
| One connector lost, no data corruption | Its privileged effects and freshness, not unrelated service access | Reauthorized current identity/account and remote-state reconciliation |

Unchanged current membership may be used only when its authoritative store and revocation history were not rolled back or compromised. Do not treat an old backup, old email address or intact receipt prefix as evidence of current membership. For affected lost-tail cases use the independently held verified recovery contacts/identity procedure, current business-owner evidence and freshly granted authority. Operator cannot self-attest a customer's authority. If scope/completeness is uncertain, widen the restriction, explain why and name next action. Recovery is an operational procedure, not a blanket “always suspend everyone” product rule.

Back up schema/migrations, database rows, Auth recovery metadata, private bytes, manifests and critical receipts to private R2 independently from Supabase. Client-side encryption and independently held recovery key; application writers cannot administer retention locks. Record object checksums/counts, cutoff, schema version, expiry and recovery-key ID. Keep an encrypted offline recovery copy. A shared Cloudflare account is a residual shared failure domain; offline access/key drill is required. Database backups alone do not include private Storage bytes. [Supabase backups](https://supabase.com/docs/guides/platform/backups), [R2 retention locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/)

Restore first into isolated environment with effects disabled. Compare manifests, recover keys/auth/files, reapply revocation/deletion/legal-hold records, reconcile provider state and unknown in-flight actions, then reopen only proven scope. Never replay a restored outbox wholesale. Financial/mail/campaign effects are not undone by restoring a DB. Measure ordinary-record RPO ≤24h and workspace RTO ≤8 business hours as initial internal objectives; record actual drill results. Incident response for active ads uses direct provider access and verified cover independently of portal restoration.

## 12 Secret management, observability and maintenance

Static provider keys reside in private Worker secrets, with distinct environments. Per-principal OAuth refresh tokens use server-side AES-GCM envelopes in a non-exposed Postgres schema, random nonces, authenticated associated org/provider/principal context and wrapping-key version; wrapping keys are Worker secrets with an independently encrypted offline recovery copy. Never reuse a nonce/key pair. Use reviewed platform crypto libraries/APIs and test rotation/recovery. Ordinary client roles have no secret-table grants. Server functions decrypt only for an allowed mapped operation and redact token material from logs/AI/errors. Rotation keeps bounded old-key support until rewrap is verified; revoke compromised grants and record affected account scope.

One OAuth principal can have several mapped businesses. Tenant disconnect removes only that mapping; provider-wide revocation occurs only when intended for the shared grant, with affected bindings shown. Do not break other clients by revoking a shared operator token during one client's offboarding. Client-owned account access and W&M employment/operator revocation remain separate procedures.

Structured redacted logs carry correlation ID, business-scoped operation ID, state, timing and error category. Never log raw emails/files/credentials. Metrics: queue age/leases, provider success and unknown effects, auth failures, stale reports, scan latency, email delivery, backup age/restore evidence, storage and cost/quota. Independent heartbeat checks scheduled dispatch and backup completion; send actionable alerts to the named operator/cover with severity and next update. Redact/aggregate customer detail in alert channels.

Default scheduled jobs: short frequent dispatcher; provider sync at documented quotas/freshness; business-day owner check list; monthly report preparation; daily backup/export verification; retention sweep; daily provider event reconciliation; periodic restore exercise. Cron execution time is UTC; derive business due dates with tested IANA timezone logic. Changing a schedule does not change customer commitments. Load-test the documented forecast plus headroom and record exact p95/throughput/error evidence; no arbitrary client ceiling.

Dependencies/API versions, provider contact emails, domains/certificates, quota tiers, billing and secret expiry appear in one operations register. Assign monthly maintenance review and urgent deprecation notice handling. Cost limits notify/queue nonessential work without interrupting auth, authorized stop or necessary operational evidence. A kill switch disables only the diagnosed adapter/effect class and leaves records readable where access is valid.

## 13 AI preparation and human effort

Implement seven task types: request brief; scope comparison; missing-input suggestions; feedback grouping; owner/cover handoff; completion explanation; weekly improvement summary. Place results inside the existing request/report screen with source links and input versions. Model output is untrusted text, never an instruction to tools or policy. Retrieval is explicit org/request-scoped; no cross-client shared context or raw secret/credential inputs. Rules, arithmetic, authority and effect state are deterministic.

Select one production adapter through a versioned provider/model config and task evaluation; provider name, retention settings, region, purpose and cost limits must be filled in the real readiness record before enabling it. This is an implementation dependency, not permission to leave seven unconnected buttons. Use representative held-out synthetic cases, prompt injection, conflicting/stale facts, unsupported claims and empty context. Track correction/approval minutes and cost; revise prompts/model when they add work. Human approves external text that creates new promises; routine approved templates do not require repetitive review. Timeout or disabled AI exposes originals/templates immediately and does not block service.

Human effort table: client confirms unknown facts and material decisions; system reuses records and prepares reminders/reports; owner accepts scope/date, exercises professional judgment and verifies delivery; named cover handles absence. No automation claim depends on an unassigned person doing invisible cleanup. Measure direct work, review, rework, interruptions and allocated maintenance separately. Improvements are postlaunch operating targets, not mandatory paid-client release experiments.

## 14 Website/SEO execution and public integration

Implement website/Care/SEO/catalog-project handlers plus corresponding accessible customer/owner screens. Website artifact approval binds revision digest/commit, target domain and material configuration; launch references that exact artifact, existing deployment pipeline and actual checks. Failed build/timeout/readback stays unknown or failed; rollback targets known compatible artifact and records data effects separately. Verify contact/booking, routes, mobile/keyboard, search metadata, redirects/canonicals and owner editing/access handoff as applicable. Static deployment proof is not proof that third-party form delivery succeeded.

SEO tracks research sources/date, target URL/query group, approved facts/content, technical tasks, publication proof and dated search observation. Care schedules checks, requested edits, entitlement consumption, fixes and recovery exercises from the actual contract. Existing commerce delivery includes its own checkout/access tests through the current implementation process; W&M does not acquire a new ecommerce advertising service merely by sharing the workspace.

Public source touchpoints: `config/offers.json`, existing catalog validators and consumers, `src/pages.mjs`, `src/navigation.mjs`, `src/display-names.mjs`, `src/intake-content.mjs`, `src/privacy-content.mjs`, contact Worker validators and public structured-data builders. Recheck names/paths against the implementation branch. Add ads to the existing canonical catalog when schema supports it; do not maintain an independently editable `ads-service.json` price fork. Reconcile stale Care onboarding text to current $195/$395 fields and test waivers/first invoice. Preserve accepted agreement snapshots, native basic measurement entitlement, website payment milestones and other existing services.

No private code/analytics leaks into public bundles. Private pages use auth/no-store/noindex and stay out of sitemaps. Public contact works during Supabase outage; import replay is separate from the D1 acknowledgment. Draft public pages can be reviewed locally; publish accurate complete capability/terms together with release readiness, without a customer-validation lock.

## 15 Implementation, release evidence and rollback

Use existing Node/ESM/static/Cloudflare toolchain unless a measured requirement justifies an addition. Inspect the current branch and repository instructions before edits. The referenced baseline is evidence, not permission to overwrite newer work. Separate development/staging/production Supabase, secrets and provider modes; use synthetic data in tests. Migrations are expand → compatible app → backfill/verify → enforce → contract after rollback window. Save app/schema/catalog/provider adapter versions in evidence.

The shared durable-effect foundation B03E follows identity/schema B03 and precedes the first proposal send, Stripe operation, Resend message or scanner call. It implements transactional receipts/outbox, keys, leases/epochs, reconciliation and the critical-receipt writer. B07 adds approval/stop domain rules on that existing kernel; B13 completes recovery/export qualification. No provider adapter invents its own temporary retry ledger. Full release stages and owned paths are in `IMPLEMENTATION-BACKLOG.json`; all are required before acquisition except explicitly separately contracted service options. Internal feature switches support deployment/recovery, with launch-required features enabled and qualified. No first-customer, first-three-business, two-cycle-profit or bought-portal gate remains. Training/usability participants can be noncustomers.

`ACCEPTANCE-TESTS.json` retains 45 original V2/V3 cases and 33 V1 cases for provenance. Changed active expectations explicitly supersede AD22 (API writes now implemented), AD25 (economic model quality, not paid cycles), AD30 (pre-customer complete launch), AD33 (affected scope under lost-tail recovery), and any inherited pilot ordering. Original text is archival evidence, never an active instruction to defer a launch module. New V2 cases cover complete commercial/service/operations paths. All implementation statuses remain `not_run` until executed against the actual software.

Each readiness item requires capability, accountable owner, code/schema version, fixture and expected/actual evidence, provider configuration evidence where applicable, runbook and status (`not_started/implemented/verified/blocked`). Mocks prove adapter behavior, not live credentials, DNS, settlement, delivery or ad attribution. Test-account ads do not serve or provide real performance; customer-specific activation checks remain after signup. Production agency infrastructure/access/monitoring must be verified before the product is called ready. No real-card test charges or unrequested media spending are necessary to qualify software logic.

Rollback disables affected new intake/effects, preserves newer records, reconciles in-flight actions and keeps one accountable operator. Never roll back external finances or ad state by assumption. Public site rollback is separate from private data migration. Tests appropriate to changed source: existing catalog/content/link/SEO/performance suites; private authorization/concurrency/cache boundaries; contract integrations; mobile/keyboard/zoom/error recovery; complete service and exit scenarios; timed restore/export drill. Five representative participants test essential comprehension; fix every severe barrier regardless of count. Production release remains incomplete if a required capability is blocked, even if the report/demo looks polished.
