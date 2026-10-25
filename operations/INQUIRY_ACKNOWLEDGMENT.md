# Optional inquiry reference email

F52 adds a minimal visitor email after durable intake and provider acceptance of the owner notification. The on-page saved reference remains the authoritative submission receipt. The email says the inquiry was saved for studio review; it does not promise mailbox delivery, a reply deadline, a booking, or a purchase.

The message contains the fixed Wonder and Method identity and a server-generated UUID reference. It never copies the visitor's name, message, website, phone, service choices, or financial details. The only recipient is the validated email in the saved inquiry. The public request cannot select a recipient separately.

## Release configuration

The default is disabled. Apply additive migration `deployment/migrations/0035_inquiry_acknowledgments.sql` through the existing reviewed migration process before enabling `INQUIRY_ACKNOWLEDGMENT="enabled"`. The module also requires production environment, live intake, release approval, the existing `RESEND_API_KEY`, valid `NOTIFICATION_FROM` (bare address or display-name/address), and a `FINGERPRINT_SECRET` of at least 32 characters. Missing configuration, tables, retention/resolution columns, or any of the four safety triggers prevents new queue/send work. There is no separate account, sender credential, public send endpoint, or owner override.

The optional `ACKNOWLEDGMENT_DAILY_LIMIT` accepts integers 1–20; omitted/invalid values use 10. The existing notification budget still applies to the combined owner and acknowledgment attempts. An accepted owner notification is a prerequisite on every queue insertion and send claim. Never enable this by weakening the owner path or changing its reserved quota.

The user must expressly check an optional email-reference checkbox. Validation may persist only `email_receipt: "requested"` for that choice; absent legacy payloads remain absent. Recovery considers only marked, non-synthetic inquiries created within the preceding 23 hours, with owner notification accepted, no delivery resolution, no client flag, and no retention hold. It never enrolls unmarked historical submissions. A budget or eligibility hold does not change the saved inquiry or on-page receipt.

## Budget and abuse protection

Let `L` be `notificationBudget(env).limit`, `R` its reserve, and `A=L-R` its automatic allowance. Acknowledgments stop at shared counter ceiling `C=max(0,A-ceil(A/5))`. This preserves every reserved owner retry plus at least 20% of automatic owner slots (minimum one). With `L=50,R=10`, `A=40`, protected automatic headroom is 8 and the acknowledgment ceiling is 32. Owners can still use the remaining 8 automatic slots and 10 reserved slots. With automatic allowance 1, acknowledgments cannot send.

Each attempt performs one atomic SQLite claim whose trigger charges BOTH the existing `rate_limits` key `notification-quota:<UTC-day>` and the separate acknowledgment day counter. Claiming is allowed only below both ceilings. Every retry consumes both counters. A failure during either counter write, recipient reservation, or lease mutation rolls back the entire claim; a budget hold consumes no attempt. Owner sends are charged by their existing code and are serialized against the same shared counter.

A separate HMAC-SHA256 recipient key admits one new acknowledgment per normalized email address per rolling 24 hours. It uses the existing fingerprint secret with an acknowledgment-specific domain separator, never raw email in the key. Retries of that same acknowledgment reuse its reservation. A cooldown suppression is terminal and cannot be forced into another send. Email aliases remain distinct; this is a bounded abuse control, not proof of mailbox ownership. Secret rotation can reset recipient correlation, so avoid rotation during an incident unless needed for credential security; global limits still apply.

## Delivery and deletion invariants

The durable `inquiry_acknowledgments` row stores an immutable minimal provider request and stable `inquiry-acknowledgment/v1/<UUID>` key. Maximum attempts are four, with 2-, 4-, and 8-minute retry spacing and a 60-second lease. The network request has an 8-second timeout. The expiry is the inquiry creation time plus 23 hours, so even a late first attempt cannot retry beyond that boundary. Attempts with unknown outcome keep the same request bytes and key. Accepted/suppressed/expired rows are terminal. Late completions are fenced by attempt number, lease, and sending status and cannot overwrite newer state.

The provider's documented idempotency retention is 24 hours, verified from [Resend's official idempotency documentation](https://resend.com/docs/dashboard/emails/idempotency-keys) on 2026-10-24. The 23-hour bound leaves a margin. A provider acceptance is not evidence that a recipient's mailbox delivered or displayed the email. The guarantee after a timeout or local persistence failure depends on the provider honoring that documented stable-key contract.

The FK `inquiry_acknowledgments.inquiry_id -> inquiries.id ON DELETE CASCADE` removes acknowledgment payloads with inquiry deletion. The `inquiry_acknowledgments_delete_guard` trigger rejects parent deletion while its acknowledgment has `status='sending'`, with the exact error `ack-send-in-progress`. Preflight checks should show an explicit retry-later message, but this database guard handles a race after preflight. Never bypass it by dropping the trigger or directly deleting the child row.

Recovery first clears expired sending leases, including for newly protected/ineligible inquiries, and does this even if the feature is disabled or provider configuration is missing. It preserves live leases. The stale row becomes suppressed when the parent is ineligible, expired when retry bounds are reached, or uncertain otherwise. After that maintenance, configuration gates all queueing/sending. Schedule recovery unconditionally when the migration exists, including while the feature is disabled. The ordinary retention and client-hold rules remain the deletion authority; clearing a stale email lease does not clear a retention hold. A hold recorded after a request has already left the worker cannot recall that in-flight provider request.

## Integration contract

Exports from `deployment/inquiry-acknowledgment.mjs`:

| Export | Contract |
| --- | --- |
| `queueInquiryAcknowledgment(env,id,now=Date.now())` | Reads the saved inquiry, checks eligibility and inserts once. No provider call. |
| `sendInquiryAcknowledgment(env,id,send=fetch,now=Date.now())` | Attempts an already queued row after fresh eligibility, lease, and budget checks. |
| `recoverInquiryAcknowledgments(env,send=fetch,now=Date.now(),clock=()=>now)` | Clears stale leases; if configured, queues up to 20 eligible recent opt-ins and processes up to 20 queued rows. Returns aggregate `status,queued,attempted,failed`. `attempted` counts provider invocations. |
| `inquiryAcknowledgmentStatus(env,now=Date.now())` | Aggregate configuration/migration state, status counts, attention count, budget-held and cooldown counts, daily acknowledgment/shared attempts and budget formula. No IDs, recipients, message text, or provider responses. |
| `inquiryAcknowledgmentConfiguration(env)` | `disabled`, `not-live`, `configuration-pending`, or `ready`; does not inspect DB migration. |
| `inquiryAcknowledgmentBudget(env)` | Existing `limit,reserve,automaticLimit` plus `dailyLimit,ownerHeadroom,sharedCeiling`. |

Queue/send return `status`, `sent` (true only for newly persisted provider acceptance), and `attempted` (provider invocation). A fenced completion also returns `staleAttempt:true`. Expected non-send statuses include `disabled`, `not-live`, `configuration-pending`, `migration-pending`, `ineligible`, `busy-or-ineligible`, `not-queued`, `daily-budget-held`, `shared-budget-held`, and `recipient-cooldown`; stored states are `pending`, `sending`, `accepted`, `failed`, `uncertain`, `suppressed`, `expired`. Unexpected storage errors propagate to the caller's generic aggregate failure handling; no exception text should be logged or shown publicly.

Suggested submit integration, after the existing durable save and without awaiting email in the HTTP receipt path:

```js
ctx.waitUntil((async () => {
  await notifyInquiry(env, id); // retain the existing owner behavior and error handling
  await queueInquiryAcknowledgment(env, id);
  await sendInquiryAcknowledgment(env, id);
})().catch(() => { /* generic aggregate attention; saved receipt remains valid */ }));
```

Use the existing owner recovery first during scheduled work, then call acknowledgment recovery as a separately handled step. Even when owner recovery throws, still run the acknowledgment stale-lease maintenance; it may only send rows whose owner notification is already accepted. Do not let optional email failures skip existing owner/retention maintenance. Attach `inquiryAcknowledgmentStatus` as a separate operator status section; budget holds, failed/uncertain/expired states, and pending work older than ten minutes are visible without printing inquiry data. Do not expose an endpoint that lets a public client trigger arbitrary reference emails or resets.

## Verification and operational limits

Run `node --test tests/inquiry-acknowledgment.test.mjs`. The suite applies all migrations through 0035 to local SQLite, including a populated-history preservation check. It exercises feature/config/schema failures, consent and owner acceptance, suppression, concurrent lease and cooldown claims, immutable payloads, stable-key retry after provider acceptance plus local storage failure, budgets and reserved headroom, late completion fencing, rollback after the shared counter write, deletion races, and disabled-mode stale-lease recovery. Every address/provider response is synthetic; no live request is sent.

This module's evidence does not establish a live provider account configuration, inbox delivery, deployed migration state, or browser checkbox wiring. Those remain release/integration checks in the primary change. Do not resend expired/accepted rows manually, reset attempts, alter frozen snapshots, or extend the 23-hour window. Review aggregate failures through the existing operator process; the original inquiry reference and owner workflow remain available.
