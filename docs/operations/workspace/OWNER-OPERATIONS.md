# Owner operations module

The module and shared UI/API/effective-permission integration are implemented and
applied to staging. This is not a release approval. Later grant changes use the
reviewed `owner_effective_permissions` migration and monotonic grant versions.
No provider calls, customer notifications, deployment or remote migration are part
of this module. Existing operator assignments are never edited by these commands.

## Files and migration

- `worker/workspace/owner/service.mjs`: strict command adapter and queue adapter.
- `src/workspace/owner-ui.mjs`: caller-rendered accessible HTML and form conversion.
- `tests/workspace/owner.test.mjs`: actual migration/PGlite tests, not SQL mocks.
- `db/workspace/migrations/20261031132142_owner_operations.sql`: generated with
  `supabase migration new owner_operations` in an isolated temporary directory,
  then placed in the existing migration directory. Do not generate another copy.

The migration adds six private RLS tables and narrowly granted RPCs. Immutable
date proposals/decisions and cover grants/revocations are append-only. Estimates
and allocations use expected versions. Every mutation takes the tenant guard,
checks current session/authority, and uses existing command receipts/audit.

## Shared wiring required

1. Import `ownerQueue`, `ownerCommand`, `OWNER_COMMANDS` from the Worker module.
   Add authenticated `GET /api/owner?query=&week_start=YYYY-MM-DD&timezone=...&after=`.
   Validate the existing session with `identity`, then call `ownerQueue` with the
   supplied bounded query/date/timezone/cursor. Return via the existing secure
   JSON/no-store wrapper. Keep `after` null when absent.
2. In `/api/command`, handle `OWNER_COMMANDS.includes(command)` **before** the
   old `validateCommand`, since that shared validator does not know these commands.
   Preserve the existing exact-Origin/CSRF/body/idempotency checks; derive org from
   the submitted organization and independently authorize it in SQL. Call
   `ownerCommand(env,session,org,command,input.input,key)`; never machine/service-role
   RPC for a human command. Unknown owner names must fail, not fall through.
3. Add authenticated `GET /api/owner-dates?business=UUID`, calling
   `wm_owner_dates({p_org})` using the user's token. This is the customer-visible
   proposal list; do not give customers the owner queue. The decision RPC requires
   current named contract authority, not merely a customer-admin role. Add this
   list to the existing request/agreement area and preserve its business context.
4. Add `/owner-ui.mjs` to private asset allowlist and build-copy manifest. Import
   `ownerViews({esc,dateTime,name})`, then render `.queue(data)` for the owner screen
   and `.dates(proposals,{org,canDecide,canWithdraw})` for the appropriate view.
   Use trusted escaping helpers; `canDecide` is a UI affordance, never authority.
5. Wire `[data-owner-search]` to the queue GET, and `[data-owner-next]` to its exact
   `next_after` cursor, preserving query/week/timezone and appending by business ID.
   Replacing a search discards the old page set. `has_more` and per-business
   truncation flags mean incomplete; never call a truncated queue complete.
6. Wire `[data-owner-action]` forms through `ownerFormInput(command,form)` and
   the existing CSRF command client. Use `data-organization` rather than a mutable
   global business switcher. Keep one idempotency key for a failed unchanged form;
   regenerate it after deliberate input changes or success. Preserve form intent
   on errors; surface field/session/version errors and focus the alert. Refresh
   only after a confirmed result. Do not send a date proposal or cover notice by
   email without the existing authorized notification workflow.
7. Effective-permission integration needs a separate reviewed shared migration:
   `wm.operator_has(org,cap)` may combine the existing direct grant with
   `wm.owner_cover_has(org,cap)`, retaining current session/MFA/tenant checks.
   This module intentionally does NOT replace that function. Direct issuer
   checking uses `owner_direct` and cannot recursively delegate through covers.
   Existing projections, `wm.require_access`, and service-specific reads now
   consistently recognize listed cover through that shared migration. Current
   issuer verification and exact grant versions remain required.
8. Background operations must recheck their bound original actor through the
   private `wm.owner_cover_for(org,actor,cap)` (or a reviewed combined actor helper)
   immediately before dispatch; it checks current issuer/recipient grants and
   revocations without relying on a browser JWT. It is NOT a public authorization
   endpoint. Retain the original operation's approval, session/actor policy,
   current tenant/recovery/STOP epochs and independently durable receipt gates.
   Cover never grants named customer authority, `ads`, `finance`, `people`,
   `recovery` or unrestricted `admin`. Positive effects must still follow the
   existing operation kernel. Reconcile already-in-flight work after revocation.
9. Every shared staff/assignment change must use the established tenant guard lock
   discipline. Global staff revocation must lock affected tenant guards in UUID
   order and invalidate queued positive authority before returning. Module reads
   recheck after lock acquisition; PGlite tests do not prove multi-connection races.
   Add those integration races to PostgreSQL CI after wiring.

## Commands

All commands take `{organization_id,command,input}` and a stable action key.
Exact input keys are in `service.mjs`; SQL repeats validation. Times require an
explicit offset/Z. New estimate/capacity rows use expected_version=0; existing
rows use their returned version. Covers/proposals start at version 1; a final
revocation/decision has version 2. Duplicate keys with changed input fail.

- `owner.estimate`: request_id, expected_version, minutes (remaining, 0–10080).
- `owner.capacity`: week_start (Monday), timezone, expected_version,
  available_minutes, other_minutes, contingency_minutes. Allocation belongs to
  the signed-in operator and this business; this is not total personal capacity.
- `owner.date.propose`: request_id, expected_version (request),
  blocking_request_id (null or existing same-tenant dependency), due_at,
  next_contact_at, reason. Frozen request dates/version and open linked commitment
  IDs/versions/dates are retained. No agreed date changes during proposal creation.
- `owner.date.decide`: proposal_id, expected_version, decision
  accept/reject/withdraw, reason. Only the current named contract authority accepts
  or rejects; current delivery operators can withdraw. Acceptance rejects stale
  request/commitment snapshots and expired proposed dates. It changes the request
  and ALL open linked commitments explicitly displayed by the proposal; other
  work/dependent requests remain unchanged and need their own proposal.
- `owner.cover.assign`: recipient_id (existing verified current staff),
  capabilities (unique subset of read/delivery/reports including read), starts_at,
  ends_at, reason. Requires current coverage staff plus a direct tenant people/admin
  grant and recent MFA. Delegation is a strict subset of issuer effective grant;
  expiry is at most 31 days and no later than either staff grant or issuer assignment.
- `owner.cover.revoke`: cover_id, expected_version, reason. Current privileged
  coverage staff with direct tenant authority may revoke, including a substitute
  issuer. Revocation is immediately authoritative, invalidates queued positive
  operations, and records a critical receipt separately from its durability.

Cover validity checks exact issuer-assignment, issuer-staff and recipient-staff
fingerprints, current expiry/revocation, verified recipient identity, tenant open
state and recovery/external generations. Narrowing or replacing these grants
invalidates old covers; create a new explicitly approved cover instead of editing
history. No cover-to-cover delegation or operator-assignment overwrite occurs.

## Queue, time and capacity interpretation

Queue pagination is by authorized business UUID, 100 businesses/page, with current
authorization repeated for each tenant. Requests/commitments show at most 100 each
with explicit truncation flags; main must link to the full business work view.
Search applies to business name/request outcome without revealing other tenants.
Dates include overdue/contact-due states. Logs use existing immutable time entries,
excluding superseded entries; estimated remaining minutes use current open assigned
requests due in the selected week. Unestimated counts remain visible.

The week uses two local midnights seven calendar days apart, not 168 fixed hours;
the query explicitly supplies the IANA timezone. Capacity allocated in a different
timezone has `capacity_timezone_matches=false`; the UI withholds headroom arithmetic
until the user uses matching dates/zone. Hidden tenants, unassigned work and other
weeks are not represented as free capacity. Existing `time.record` remains the
producer for logged minutes; this module does not duplicate it.

## Validation and remaining qualification

Local execution on 2026-10-31: seven focused tests passed with zero failures/skips
(six actual PGlite database/migration cases plus one adapter/HTML case). JavaScript
syntax checks passed for the Worker adapter, UI module and test; owned files had
no trailing whitespace. This is not shared wiring or deployed qualification.

Run `node --test tests/workspace/owner.test.mjs` and `node --check` for both modules
and the test. The tests apply actual repository migrations through the existing
database/actor/ids harness. They cover tenant filtering, session/MFA, raw grants,
issuer/recipient bounds and revocation, real wall-clock cover expiry, generation
changes, immutable histories, duplicate/stale commands, explicit date approval,
stale commitment snapshots, weekly totals and output escaping.

Pending shared integration: API CSRF/routing, customer decision affordance, browser
error/retry/keyboard/mobile checks, effective permissions/dispatch and true PostgreSQL
concurrency. No module-local test proves deployed SMTP, provider access, real cover
handoff or release readiness. Supabase's Oct 30 tzdata notice also requires checking
actual server timezone data before claiming date-boundary qualification; this task
does not upgrade or alter the provider.
