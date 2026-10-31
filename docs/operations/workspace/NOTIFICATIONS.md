# Notification cadence and delivery exceptions

Notification cadence and delivery-exception implementation for B06.

Primary integration is now implemented and applied to staging. The shared Worker
routes signed outbound events and current-user status/commands, the scheduler
separates digest preparation and delivery polling, and new writers use this
reserved-send protocol. Runtime `NOTIFICATION_CHANNELS` accepts a protected JSON
secret or an object; the environment/account/channel must match the SQL binding.
No live sender/domain/channel qualification or production enablement is claimed.

The reviewed preflight checks the exact leased job's channel before registering an
attempt. The send adapter checks that exact runtime channel before reserving.
`wm_notification_no_post` locks the same tenant guard as reservation: only a new
protocol attempt with no immutable reservation or provider reference can be
cancelled and requeued as a proven pre-POST interruption. Existing reservations
remain unknown and cannot replay. Recovery generation and current source checks
remain required. The additional real SQL/fake-provider regressions pass for a
missing target channel followed by repair, and an absent reservation versus a
reserved timeout. This does not extend Resend's idempotency window.

Historical pre-migration reads require `LEGACY_NOTIFICATION_READS`, a protected
per-operation registry of original organization/account/environment/sender/origin,
qualification time/evidence and server key. Missing or mismatched bindings fail
closed. This registry is read-only and cannot authorize a POST.

## Files

- `worker/workspace/notifications/service.mjs`
- `src/workspace/notification-ui.mjs`
- `tests/workspace/notifications.test.mjs`
- `db/workspace/migrations/20261031135902_notification_delivery.sql`
- This document.

The migration was generated with `supabase migration new notification_delivery`
in an isolated temporary directory, then copied into the repository migration
directory. Do not generate another copy. Existing provider/dispatcher/app/index,
owner/intake/analytics modules, package files and migration files were not edited.

## Cadence and audience

Default routine-message cadence is daily. `digest=none` or `email_enabled=false`
disables routine email. Weekly periods begin Monday at local midnight. Periods
end at the next local midnight/day or Monday/week in the saved preference IANA
timezone (business timezone if unset). Calendar boundaries are converted to UTC;
they are not fixed 24/168-hour durations. Due time is the period end. These are
event notification batches, not a weekly project-update-writing service.

Private durable batches are unique by tenant, stable recipient UUID, cadence,
timezone, preference version, period start and recovery/external generation. Message-to-recipient items are
unique; no email is enqueued for each message. Only currently shared outbound or
workspace messages enter batches, excluding their sender. The existing exclusion
of inbound email is preserved. The final email contains only a generic subject
and login-required `/workspace/` link: no business name, thread body, filenames,
message count, approval token or sensitive URL. Delivery metadata necessarily
contains the chosen recipient address; it is never in customer/operator status
responses or browser configuration.

Preference writes use `notification.preference` with exact fields
`{digest,email_enabled,timezone,expected_version}` and stable action key. New row
version is 0 as input. Changing preferences cancels unattempted older batches/jobs;
it does not resend old material under a new cadence. Future messages use the new
version. Already registered sends must pass the current preference check before
reservation; an email already accepted remotely cannot be retracted. Workspace
messages remain available regardless of email preference. Switching back within a
period creates a new preference-version batch containing only newly arriving items.

Digest preparation leases last two minutes. Claims are bounded and skip locked
rows; expired leases sort by their last lease time so persistently failing old
jobs cannot permanently head-block later tenants. Each worker processes jobs in
its own try/catch; even a failed attention write does not abort later jobs. A batch
older than seven days after its period end cannot dispatch. Preparation failures
become actionable attention, not sent or delivered. `notification.batch.retry`
requires current delivery operator + recent auth, exact batch ID and expected
lease generation; it only resets an unattempted attention batch or its existing
pending attention outbox job when no attempt has ever been registered. It preserves
the same operation/key. It cannot requeue an unknown, registered or remotely accepted send.

## Mandatory notices are an explicit evidence allowlist

Existing invitation provisioning and invitation notification stay separate from
routine preferences. Invitation send checks exact still-pending invitation,
expiry, current inviter authority and existing target identity. It does not require
the invitee to have verified email yet, because this is an invitation; it grants
no membership. The normal invitation acceptance workflow remains authoritative.

The new private receipt trigger recognizes only these existing immutable receipts:

| Receipt | Notice | Recipients |
| --- | --- | --- |
| `member.change` | `security_access_changed` | Exact affected membership identity from the canonical receipt input, with current verified Auth email |
| `authority.assign`, `authority.revoke` | `authority_changed` | Current customer admins and affected named authority if still a current member |
| `ads.stop` | `stop_recorded` | Current customer admins; this means STOP recorded, never remote pause confirmed |
| `service.started`, `engagement.closure`, `closure.statement_recorded` | `service_changed` | Current customer admins |

An arbitrary category string, generic message or webhook cannot create a mandatory
notice. There is no public mandatory-notice creation RPC. Security access-change
notice is the sole new exception for a revoked membership: it goes only to the
verified identity affected by that canonical receipt, at its unchanged address,
and contains no tenant information. Other notices require current membership at
dispatch. Verified address changes invalidate pending mandatory notices rather
than retargeting them. Auth-provider login/OTP/password/session security emails
remain owned by Auth; this module does not synthesize a session-revocation event
or replace Supabase's security mail. New notice types need a separately reviewed
canonical event/recipient mapping, never a generic mandatory bypass.

All notices, including invitations, honor verified bounce/complaint/suppression
blocks. Mandatory classification cannot override a blocked destination.

## Existing kernel and send authority

The migration replaces `wm.message_jobs` to collect batches and wraps
`wm.service_context` as `service_context_before_notifications` + checked wrapper.
Original helper grants remain private. Other effect kinds delegate unchanged.
The wrapper reuses existing per-tenant `wm.require_access`/session behavior for
human actions and existing attempt/tenant/recovery generation checks for machines.

For digests, current member, verified Auth email, current preference version,
timezone, enabled cadence and at least one still-shared message are rechecked.
Recipient UUID is stable. The current verified address is chosen at attempt
registration, then frozen. `wm_notification_reserve` immediately rechecks service
context and requires it to equal the registered attempt context; address/channel
or preference changes after registration block sending. The reservation persists
the exact generic request, account/environment, address hash, idempotency key and
attempt ID before POST. An existing reservation cannot be reserved again.

`sendCadencedNotification` uses `POST https://api.resend.com/emails`, a stable
`Idempotency-Key: workspace/<operation UUID>`, and two tags: `workspace_operation`
and `workspace_attempt`. The returned provider UUID is checkpointed before readback.
Resend documents a 24-hour idempotency retention period; this module additionally
refuses first reservation on attempts older than 23 hours and does not automatically
repeat POST at all. A timeout/429/5xx/ambiguous response remains unknown. It must not
be turned into a fresh operation/key after the retention window.

No database transaction is atomic with Resend. Revocation between final local
check and remote acceptance remains a real race. Reconcile the historical outcome;
do not claim remote cancellation or erase a delivered observation. Repeated workers
cannot repeat a reserved send, and shared dispatch must retain independent intent
and outcome journaling, recovery controls and existing attempt resolve rules.

`readCadencedNotification` fetches the exact provider ID with
`GET https://api.resend.com/emails/{id}` and compares from/to/subject/text and both
tags with the saved immutable request. Missing ID, competing ID, wrong account,
changed body or unavailable readback remains unknown. A signed event can supply a
candidate provider ID only for the exact registered operation+attempt tags and
matching recipient/from/subject. Readback still verifies the complete request
before kernel resolution. There is no documented idempotency-key lookup used here.

Proof `delivery=accepted_by_provider` means the send operation exists at Resend;
it does not mean inbox delivery. Even provider `delivered` means recipient mail
server delivery, not placement in an inbox or human reading. Open/click events are
not used as human-read evidence or authority.

## Outbound webhook, account binding and immutable observations

Use a new dedicated outbound route and signing secret, separate from inbound
email verification. Server-only configuration contract:

```js
env.NOTIFICATION_CHANNELS = {
  "outbound-production": {
    account_id: "reviewed-account-binding",
    environment: "production",
    api_key: /* existing server-only Resend key */,
    outbound_webhook_secret: /* separate existing whsec_ secret */,
    key_version: "reviewed-key-version"
    // Optional previous_secret + absolute previous_until, max 24-hour overlap.
  }
};
```

Main must build this object from existing secrets/configuration; it is not a claim
that an object binding exists automatically. The private `notification_channels`
record binds ID/account/environment/from address/workspace origin/enabled state;
`notification_routes` explicitly assigns each tenant to one channel. Neither has
a public provisioning RPC. Provision only through separately approved setup. The
Resend API response is not an independent proof of the human-entered account name;
qualification must verify API key, account, sender domain and webhook destination
belong together. Do not repoint a channel ID to another account or environment.

`handleOutboundWebhook(request,env,channelId)` accepts POST with a bounded 1 MB
raw UTF-8 body. Installed Svix library verifies exact raw bytes represented as
UTF-8, `svix-id`, `svix-timestamp` and `svix-signature`; local tolerance is +/- five
minutes. It never parses/re-serializes before verification. Secret rotation overlap
has an explicit end, at most 24 hours ahead. Environment/account come from the
configured route, never the payload. Only acknowledge after the SQL transaction
commits the deduplicated raw-payload hash and parsed private evidence. Database
failure must return non-2xx through main's normal error handling.

Supported observations: `email.sent`, `email.delivered`, `email.bounced`,
`email.complained`, `email.suppressed`, `email.failed`, `email.delivery_delayed`.
Other signed events are durably retained and ignored. Unknown or unmatched events
do not grant access, create invitations, reply, refund or trigger a new send.
Identity is channel + `svix-id`; changed bytes under that identity create immutable
anomaly evidence. Provider ID conflicts never overwrite an earlier binding.
Signed event `created_at` is distinct from signed transport timestamp: valid
provider retry/replay can report an older event while transport signature is fresh.

Every delivery observation is append-only. Readback `last_event` is a snapshot;
it never deletes prior bounce/complaint/suppression/delivery facts. Address blocks
are channel/account/environment scoped through their channel, apply across tenants
using that account, and do not reveal the other tenant. A later delivered snapshot
does not lift a block. There is deliberately no automatic unsuppression API or
public block-clear command: provider-side removal alone is not proof of renewed
recipient consent. The current module offers private operator follow-up notes and
explicit exception status. A reviewed restoration workflow would need its own
consent/account evidence contract; it is not implemented or claimed here.

Delivery polling uses bounded two-minute read leases and postpones claims before
network work; failure cannot starve later rows. Successful readback appends a fact
and schedules another check six hours later; failed/unbound reads remain eligible
after the claim's 15-minute backoff. GET polling does not resolve the kernel's
unknown attempt by itself; shared reconciliation must use the adapter and normal
independent outcome journal + `wm_attempt_resolve`. Historical readback uses the
frozen request even if the user was later revoked. It never reauthorizes a send.

## Exact main wiring

1. Replace the dispatcher implementation for `message_notify` and
   `invitation_notify` with `sendCadencedNotification`; add `notice_notify`. Extend
   its configured-kind gate to recognize these kinds and reviewed channel bindings.
   Keep existing effect enablement, intent/outcome journaling, independent control,
   registered attempts and resolution. Do not call the provider adapter from a
   browser command route or directly from the cadence scheduler.
   The existing dispatcher's catch block can itself throw while recording an
   observation/attention error. Main must isolate those secondary recording errors
   per job too, retain recoverable leases/unknown state and report aggregate failure
   after processing later jobs. This module does not edit that shared loop.
2. Add `prepareNotificationDigests` before effects in scheduledWork, and
   `pollNotificationDelivery` as its own isolated task. Keep each task and job
   independently caught. Do not merge these into an unbounded per-tenant loop.
3. Route new registered notification attempts in `readServiceEffect` to
   `readCadencedNotification`. Preserve the old `readNotification` for historical
   pre-migration attempts that have no notification send reservation, after
   verifying their original account mapping. Never feed those old unknown sends
   into new cadence jobs. The migration only backfills unattempted legacy
   per-message jobs; recipient-specific already-registered/unknown/verified copies
   are excluded. New sends must use the new adapter, never the old provider writer.
4. Add POST outbound webhook route, selecting a configured channel server-side and
   calling `handleOutboundWebhook`. Do not use the inbound secret. Enforce method,
   body bounds and normal no-store/error behavior; webhook routes use signature
   authentication rather than browser CSRF. Do not log raw bodies, addresses, keys
   or signatures. Protect any diagnostics from customer access.
5. Add authenticated `GET /api/notifications?business=UUID` calling
   `notificationStatus`; current tenant access is checked in SQL. Customers see
   only their own batches/deliveries; current delivery operators see tenant
   exceptions. No recipient addresses, signing secrets, bearer links, provider IDs
   or full messages are returned. Up to 100 recent records per list are shown.
6. Branch `NOTIFICATION_COMMANDS` before shared validation. Preserve exact-Origin,
   CSRF, body bounds, user token, stable keys and tenant context. Commands:
   - `notification.preference`: digest/email_enabled/timezone/expected_version.
   - `notification.exception.note`: operation_id/note; current delivery + recent auth.
   - `notification.batch.retry`: batch_id/expected_generation; current delivery +
     recent auth; only unattempted preparation, never registered sends.
7. Retire the old UI `preference.save` action. The new migration wraps
   `wm_service_command` and rejects only that unversioned action after existing
   access checks; all other commands delegate to the original implementation with
   its grants and checks intact. New writer is strictly versioned. The renamed
   old helper is not directly executable by authenticated or service roles.
8. Add notification-ui.mjs to the private asset/build allowlist. Render both
   `notificationViews({esc,dateTime}).status(data,{org,canSetPreferences})` and
   `.retry(data,{org})`. Bind forms marked `data-notification-action` through
   `notificationFormInput`. Set canSetPreferences only for current customers;
   operator-only viewers can review exceptions, not create customer preferences.
   Preserve errors/intent/action keys and focus the per-form alert. Refresh only
   after confirmed result; do not silently retry stale or unknown work.
9. Preserve tenant-lock order in shared membership/authority/recovery changes.
   Current authority is rechecked at dispatch; in-flight provider evidence remains
   historical. Independent backups/tail receipts must preserve registered request,
   consumed reservation, provider binding, anomalies and suppression evidence;
   restore must not create a new send key for an earlier unknown effect.
   Batches bind their original recovery/external generations, and mandatory notices
   bind their source receipt's external generation; restored pending work cannot
   mint a fresh send merely because enqueue would otherwise capture a new epoch.
10. Moving-worktree integration note: main's newer
    `20261031140756_owner_effective_permissions.sql` copied the notification
    `service_context` definition before the final recovery checks were added.
    Main should refresh that copy when reviewing its permission changes. The owned
    preparation and reservation RPCs also call `wm.notification_generation`
    independently, so the later helper replacement cannot remove the essential
    generation fence. This task did not edit main's migration.

## Expected existing-test changes and qualification

Old tests/fixtures were not edited or broadly rerun. Tests expecting immediate
`message_notify` enqueue per message must instead assert a coalesced batch, advance
through period end and claim/prepare it. Cases using the removed `preference.save`
must use the versioned notification command. Notification-send fixtures now need
explicit reviewed channel/tenant route records and the new adapter; historical
readback tests keep the old adapter. Lifecycle/authority receipts can now enqueue
separate `notice_notify` operations, so exact total-operation assertions must
filter the relevant kind. Scheduled task-name assertions need the new isolated
cadence and delivery-poll stages when main wires them.

Focused command: `node --test tests/workspace/notifications.test.mjs`. It applies
actual migrations via the existing PGlite harness. Cases cover recipient cadence,
two tenants, DST, preference versions, revocation/address change, mandatory notice
identity, duplicate/reordered/conflicting events, suppression, lease expiry, unknown
sends, safe preparation retry, legacy unknown backfill, signature replay/tampering,
failure isolation and HTML privacy. See completion handoff for final run counts.
No browser, real PostgreSQL multi-connection, live Resend or account qualification
is implied. Main must test shared CSRF/routing/mobile/accessibility, concurrent
claim/revoke/send boundaries and actual sender/key/webhook bindings before release.

Official contracts checked:

- [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys):
  stable send keys are retained 24 hours; no indefinite exactly-once guarantee.
- [Retrieve sent email](https://resend.com/docs/api-reference/emails/retrieve-email):
  exact-ID GET returns request fields and `last_event`.
- [Webhook verification](https://resend.com/docs/webhooks/verify-webhooks-requests)
  and [Svix verification](https://docs.svix.com/receiving/verifying-payloads/how):
  raw-body verification with signed transport headers.
- [Event types](https://resend.com/docs/webhooks/event-types),
  [delivered](https://resend.com/docs/webhooks/emails/delivered),
  [suppressed](https://resend.com/docs/webhooks/emails/suppressed): provider delivery
  is mail-server delivery; suppression is a distinct event, not a delivery success.
- [Webhook retries/replays](https://resend.com/docs/webhooks/retries-and-replays):
  retries and manual replays can repeat events; persistent endpoint failure can
  disable webhook delivery. Real operational monitoring is still required.

The guessed `/email-delivered` and `/email-suppressed` documentation paths were
inaccessible; the actual linked `/delivered` and `/suppressed` pages above were
accessible and used. No unsupported endpoint was implemented.
