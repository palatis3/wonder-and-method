# First-business intake (bounded B04 module)

Implemented with shared routing/UI, including the staff path without a business,
and applied to staging. Bootstrap provisioning and live export qualification remain
pending. No live public export, invitation or customer message has been sent.

## Owned files

- `worker/workspace/intake/service.mjs`
- `src/workspace/intake-ui.mjs`
- `tests/workspace/intake.test.mjs`
- `db/workspace/migrations/20261031133949_intake_workflows.sql`
- This document.

The migration filename was generated using `supabase migration new intake_workflows`
in an isolated temporary directory, then copied into this repository's migration
directory. Do not generate a second copy. Existing migrations and shared files were
not edited. The module consumes existing verified staff; it cannot provision staff,
source connections, creation grants, initial owner access or a first-login owner.

## Public inquiry boundary and actual export contract

Inspected `deployment/worker.mjs` and `deployment/operator.mjs`. The existing
protected endpoint is:

```http
GET https://APPROVED_PUBLIC_ORIGIN/api/operator/inquiries?after=UUID
Authorization: Bearer SERVER_ONLY_PUBLIC_OPERATOR_TOKEN
Accept: application/json
```

Omit `after` on the first page. Staging may additionally require
`X-Staging-Authorization: Basic ...`, already prepared server-side. Responses:

```json
{"records":[{"id":"40000000-0000-4000-8000-000000000001","created_at":1793400000000,"synthetic":1,"payload":"{\"name\":\"Synthetic contact\",\"message\":\"Synthetic inquiry\"}","delivery_status":"pending"}],"next_cursor":null}
```

The endpoint selects UUID order, at most 100 rows. Exactly 100 rows yields the last
UUID as `next_cursor`; a final empty page is possible. This is not an atomic
snapshot or an append-only timestamp feed. A newly inserted random UUID may sort
before a saved cursor. Finish each pass, then restart from the beginning on the
next pass; source idempotency handles repeats. Never treat one pass as proof of
complete historical capture, and never advance a cursor on a failed/unknown local
receipt. Public retention can remove records before a later export; private outage
recovery needs source-retention monitoring and explicit operational reconciliation.
This module does not modify public submission, its notification delivery, D1
retention or D1 credentials. It creates no Postgres-to-D1 table access.

The Worker adapter exposes `syncIntakePage(env,session,sourceKey,{after},deps)`.
It checks current human intake access before fetching and again afterward, looks
up a separately approved source binding with a machine RPC, and accepts only the
server-configured HTTPS origin and environment. It never accepts a browser URL or
token. Fetch uses GET, redirects forbidden, a 20-second timeout and a 4 MB streamed
body limit. The page must contain at most 100 ordered, unique UUID records with a
valid cursor; payload strings are limited to 30 KB. Payload JSON must be an object.
Unknown payload fields are preserved as untrusted historical claims, not authority.

Server-only runtime configuration (never include this object in browser assets):

```js
env.INTAKE_EXPORT_SOURCES = {
  "public-prod": {
    origin: "https://APPROVED_ORIGIN",
    environment: "production",
    token: /* existing server secret */
  }
};
```

Bind actual secrets using main's existing secret/configuration conventions. The
object is an adapter input contract, not a claim that Cloudflare exposes an object
binding automatically. The DB `wm.intake_sources` row must match the exact key,
origin and environment and be enabled with recorded approval evidence. Provision
it only through the separately reviewed narrow bootstrap. Never reuse a source
key for another origin/environment, or repoint a source with existing arrivals.
The existing public operator token also authorizes other public operator actions;
this adapter only issues GET. Do not expose the token or general proxy to clients.

## Envelope, receipts, duplicates and quarantine

`exportEnvelope` hashes each immutable identity string:

```js
const identity_json = JSON.stringify([
  record.id, record.created_at, record.synthetic, record.payload
]);
const source_hash = SHA256_UTF8(identity_json);
```

The exact original `payload` string is included. Even a changed payload JSON
serialization is conservatively a different immutable source hash. Mutable public
delivery, retry, follow-up and resolution fields are excluded from this identity,
so a normal provider-status update does not quarantine the inquiry. The entire
HTTP response's raw SHA-256 is recorded as a receipt reference, not an independent
backup of those response bytes or a source signature.

Machine-only RPC `wm_intake_receive(p_source,p_envelope)` accepts:

```js
{
  schema: 'wm-public-inquiry-export-1', origin, environment,
  response_hash, after: null /* or UUID */, next_cursor: null /* or UUID */,
  records: [{source_id, identity_json, source_hash}]
}
```

SQL revalidates the approved source, envelope shape, identity fields, SHA-256,
ordering and cursor contract. One transaction stores immutable arrivals, private
opportunities, conflicts and its page receipt. Identity is `(source_key, source_id)`.
An identical identity hash never creates another opportunity. A changed hash adds
immutable private conflict evidence and quarantines the existing intake item;
original payload, business facts, tenant links and memberships remain unchanged.
Replayed page receipts return the original result; do not sum replayed `new` counts
as a fresh import. Receipt identity is source + raw response hash + starting cursor;
different envelope content under that identity is rejected.

The raw response hash is an authenticated-server attestation, not proof of public
source authenticity by itself. Only this reviewed server adapter may reach the
machine RPC; do not expose a generic receive RPC proxy or browser envelope upload.
There is no signed public export or durable export acknowledgment endpoint in the
inspected contract. An existing `operator.mjs` JSON file export has no signature;
this module does not accept arbitrary uploaded copies as verified sources.

Unknown outcome: rerun the same read/page and let the transaction's exact source
IDs/hashes reconcile. No inquiry is deleted or marked exported on D1. An import
receipt means committed private Postgres content, not independently backed-up
bytes. Main's recovery/receipt subsystem must independently preserve source IDs,
grant consumption, revocations and restore generations before recovery promotion.
Do not restore global intake/grant state from a tenant-only backup or resurrect a
consumed creation grant. Source conflicts remain private; rejecting a conflicting
copy requires current staff authority, expected version, exact hash and reason.
It retains the original; there is deliberately no overwrite-original command.
Queue pages show at most 20 unresolved conflicting copies per item; refresh after
resolving those to see the next copies. Quarantine clears only when none remain.

## Commands and lifecycle

All human RPC calls use the user's token. Current authoritative session, recent
authentication, MFA (`aal2`), verified Auth identity and active `intake` staff
capability are checked in SQL. Email address/content grants no permissions.

`wm_intake_command(p_command,p_input,p_key)` supports:

| Command | Exact input |
| --- | --- |
| `intake.assign` | `id, expected_version, assignee_id, reason` |
| `intake.progress` | `id, expected_version, stage, next_action, next_contact_at, reason` |
| `intake.link` | `id, expected_version, organization_id, accepted_summary, requested_services, reason` |
| `intake.create_business` | `id, expected_version, grant_id, accepted_summary, requested_services, reason` |
| `intake.conflict.reject` | `id, expected_version, source_hash, reason` |

Stable keys match `[A-Za-z0-9_-]{16,200}`; duplicate command/key/input returns only
result references after current authority checks. Changed input with the same key
fails. Every changed item increments its global version. Assignment requires a
current verified intake staff recipient; assignment never grants tenant access.
Progression/link/creation requires the current assigned staff member. A new staff
member can deliberately take assignment from an absent or revoked colleague using
the current expected version and an audited reason.

Stages: `new -> qualified -> proposed -> won`, or `lost` from any nonterminal
stage. Nonterminal same-stage updates can change next action/contact. Active
opportunities require a future explicit-timezone contact date. Won requires a
reviewed tenant link. This is an intake sales outcome, not an accepted contract,
earned obligation, payment event or service-start authority.

Link/create requires a qualified/proposed unlinked item and deliberately authored
`accepted_summary` plus typed service IDs. Linking also requires current target
tenant direct `delivery` or `people` operator authority using existing `require_access`
and `operator_has`, plus a wall-clock direct-assignment expiry check under its tenant
guard. Customer-only membership is insufficient. Temporary-cover-only linking is
not enabled here; main must review that with the shared effective-permission wiring.
A composite-linked `wm.source_imports` and `wm.opportunities` snapshot is created;
only the reviewed summary and chosen services enter the tenant projection. No raw
contact or global notes are copied. Global progression afterward remains the
private intake pipeline; the tenant record is the reviewed handoff snapshot, not
a live mirror of private notes. Other service/contract commands own later tenant
delivery/commercial facts. Nothing updates `business_facts` or an existing tenant
opportunity. A linked item cannot be reassigned to a different tenant.

## Preapproved creation grants; bootstrap remains separate

There is no public creation-grant issuance RPC. Main's independently reviewed
bootstrap must insert a verified `wm.staff` row and an explicit
`wm.intake_creation_grants` row, with evidence, for the exact approved identity.
It must never designate the first login as owner. Grant fields:

- `id`, exact `staff_id`, exact `intake_id`;
- exact `business_name`, IANA `timezone`;
- explicit `capabilities` (must include read, never admin; subset of
  read/delivery/people/finance/ads/reports/recovery);
- `operator_expires_at`, short `expires_at` consumption deadline;
- independent `approved_by` UUID (different from consuming staff), evidence;
- `staff_digest = wm.hash_json(to_jsonb(the_current_staff_row))`.

The grant supplies the new tenant name, timezone and operator grant: the client
cannot request replacements. Both current `intake` and `create_business` staff
capabilities are required. Expired, revoked, wrong-actor, wrong-inquiry, already
used or changed-staff grants fail. Operator expiry cannot exceed current staff
expiry. A unique consumption row atomically binds grant/intake/staff/new business;
the new tenant guard starts with positive effects disabled and a new random
external generation. A critical receipt and audit event are created. Independent
receipt durability and normal external-effect gates still apply after creation.

No invitation, membership, engagement authority, agreement or external operation
is created. After successful creation, main may show the separate existing People
workflow. A currently authorized operator deliberately chooses the invitation
identity and customer role there; the existing invitation/acceptance process
controls delivery and membership. Do not pre-submit the inquiry email as a trusted
identity or silently send an invitation. Grants without `people` deliberately do
not authorize the new operator to invite; route that work to separately authorized
staff. Source grant revocation is append-only `intake_grant_revocations`, provisioned
through the narrow bootstrap/admin process, never a public raw-table write.

## Exact shared wiring for main

1. Import `INTAKE_COMMANDS`, `intakeCommand`, `intakeQueue`, `syncIntakePage`.
2. Add authenticated no-store `GET /api/intake?query=&stage=&after=` using
   `intakeQueue(env,session,{query,stage,after})`. This is global staff-only, not a
   tenant dashboard projection. Never append it to customer `wm_workspace` results.
3. Branch `INTAKE_COMMANDS` before the shared command validator and before any
   requirement for an existing selected organization. Retain exact Origin/CSRF,
   request bounds, session handling and stable action key. Call
   `intakeCommand(env,session,command,input,key)` with the user's token. These
   commands intentionally have no `p_org` because the first tenant may not exist.
4. Add a protected POST `/api/intake/sync` accepting only `{source_key,after}`.
   Retain session, Origin/CSRF/body checks. Resolve all connection configuration
   server-side. Call `syncIntakePage`; persist returned cursor only after confirmed
   receipt, retaining the old cursor on errors/unknown outcomes. Show page success
   separately from end-of-pass. Do not automatically start a new pass in a tight
   loop; the public export is rate limited. Scheduled automation, if later added,
   needs its own approved machine policy; do not fabricate human JWTs.
5. Add `/intake-ui.mjs` to the private asset/build list. Render
   `intakeViews({esc,dateTime,name}).queue(data,{businesses,actorId})`, passing only
   the current authorized target-business choices; SQL independently verifies the
   submitted ID. The HTML uses existing classes, labels, details, wrapping and
   form alerts. Bind `[data-intake-search]`, `[data-intake-next]`,
   `[data-intake-sync]` and `[data-intake-action]` with `intakeFormInput`.
6. Preserve query/stage while appending cursor pages by intake ID. Reset cursors
   when filters/source change. Keep a separate sync cursor per source/pass and
   distinguish it from the queue UUID cursor. Preserve form intent and the same
   action key after uncertain requests; replace the key only on success or deliberate
   input change. Focus the per-form alert, keep entered data after errors, refresh
   versions after confirmed changes and avoid automatic retries of stale commands.
7. Continue to existing People/invitation UI only after confirmed creation, on a
   separate user action. No email or provider call occurs in this module.
8. Review shared revocation/locking integration: global intake writes take the
   singleton intake lock, then the item, then any tenant guard/grant. Intake staff,
   source-binding and creation-grant revocations must take this global lock before
   affected tenant guards in sorted UUID order and use current-session rechecks.
   Do not call intake RPCs from inside a transaction already holding tenant locks.
   Existing `operator_has` and shared permission expiry/cover behavior remain main's
   responsibility; no shared helper was replaced here. Validate wall-clock expiry
   and concurrent revocation with actual PostgreSQL after integration.
9. Include these private global tables in the separate operational retention and
   recovery plan. They are not customer export tables. Immutable-evidence triggers
   intentionally deny routine raw update/delete; legally approved retention purge
   needs a separately reviewed administrative path that preserves required
   tombstones/consumption evidence. No delete/purge RPC was added or executed.

## Validation and limits

Focused local command: `node --test tests/workspace/intake.test.mjs`.
The suite contains ten tests: eight actual PGlite migration/SQL tests and two
adapter/HTML tests. See the completion handoff for the final executed result.
Tests cover exact first-arrival/receipt replay, mutable versus immutable source
changes, quarantine, current staff/session/MFA, stale assignment/version/key,
wrong-tenant link, fact preservation, no email-derived grants, exact one-use
creation, invalid grants, bounded export parsing, pinned source and failure before
local receipt. Fixtures are synthetic; no real D1 export, account qualification,
SMTP, customer invitation or provider operation ran.

Remaining integration qualification: real PostgreSQL concurrent imports/grant
consumption/revocation and tenant-lock races; browser keyboard/mobile/error/retry
flows; approved source origin/token access; public retention/restart reconciliation;
independent backup/tail handling; separately approved owner/source/grant bootstrap.
The local tests do not prove those paths are deployed or release-ready.

Sources checked: current repository contracts above and official
[Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).
The [Supabase changelog](https://supabase.com/changelog) flags current timezone-data
corrections; verify actual deployment timezone data before claiming date-boundary
qualification. No provider upgrade was performed.
