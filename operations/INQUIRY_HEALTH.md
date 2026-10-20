# Business-day inquiry checks

Owner: the owner of Venture House Group LLC. The public reply commitment is within one business day, Monday–Friday Eastern. These are operating instructions; implementation alone is not evidence that the owner has performed them.

At the start of each business day and again before finishing the day:

1. Run `npm run inquiries:production -- status`. This uses an authenticated aggregate endpoint: it reports counts, pending age, configuration presence, manual-review count and the last successful recovery run without retrieving names, addresses or messages. A failed command, HTTP error or missing result is a failed check, not zero inquiries.
2. Review Gmail for new website inquiries and outstanding replies. Also check Fastmail for public support mail and older inquiry notifications, and tawk.to for chats. A provider's accepted state does not establish mailbox receipt or a personal reply.
3. Reconcile any `manual_review_required`, `notification_backlog`, `notification_configuration_missing`, `recovery_heartbeat_missing_or_stale`, `automatic_notification_budget_exhausted` or `notification_budget_exhausted` delivery reason. Check `attention.retention.review_required` separately for retention work. Hourly recovery runs at minute 17; its heartbeat is stale after 75 minutes. Backlog means an unaccepted saved inquiry is at least ten minutes old. Recovery runs before cleanup. Its heartbeat is recorded only after the full retry batch completes without a database error; independent cleanup failures are logged separately. Schema migration 0005 is required for that heartbeat.
4. For a delivery discrepancy, use a new private export to identify the exact saved references and inspect provider/inbox evidence. Do not reset attempts, alter frozen messages or repeatedly retry an uncertain send. Follow the existing bounded retry and exact-reference procedures in `deployment/PRODUCTION.md` and `HANDOFF.md`. Respond to the buyer once the actual request and reply state are reconciled.
5. Record only check time, reviewer, aggregate result, any incident reference and resolution status in a private operations log. Keep inquiry text and credentials out of the log. Use the weekly retention procedure for working copies and exports.

If D1 or authentication is unavailable, the independent mailbox review, failed status command and missing scheduled receiver ping are the signals; this endpoint cannot diagnose itself during a total outage. Healthchecks is active as documented below, but its signal does not establish that the owner checked mail or replied. If the owner cannot cover these checks, arrange actual coverage before relying on the response commitment.

Authenticated operator traffic has a separate bound of 600 requests per IP per ten-minute bucket; failed authentication remains bounded at 30. Status takes one request at any row count. Exports use 100-row pages and can handle the tested 3,001-row case. A 429 includes `Retry-After: 600`; wait and restart an export under a new label if an earlier partial attempt did not finish. A file is written only after every page is read, and existing exports are never overwritten.

## Keeping a lightweight record

Run `node scripts/record-inquiry-check.mjs` for the aggregate portion. It appends
only sanitized health/count results to ignored `.runtime/operations/inquiry-checks.jsonl`.
A failed command produces a failed check. It never marks mailbox, chat or personal
reply review complete. Add that separate completion and any incident reference to
the existing private operating record after actually reviewing those channels.
One healthy automated check is not evidence of a sustained opening/closing routine.

## Absence and closure procedure

The owner reported no planned closures on October 18, 2026. Before an absence,
review outstanding replies, accepted dates and escalation needs. Arrange actual
coverage or publish the specific closure/return date and realistic response window
in the website's shared response configuration, contact copy and inquiry receipts.
Notify affected clients through their agreed channel after reviewing their dates.
Verify the deployed notice and set a dated owner reminder to restore the usual
promise on return. Until coverage is confirmed, do not accept overlapping starts.
No absence message, customer notification or recurring automation was sent or
created by this audit-fix task.

## Active independent failure alert

The approved Healthchecks.io receiver is active with a one-hour period, a
fifteen-minute grace period and email alerts independent of Resend. A real
production scheduled receipt and the owner's Down/Up alert emails were verified
on October 19, 2026. These are dated observations, not proof of later receipts
or a completed owner mailbox review. Preserve the existing receiver; do not
create another monitor or send a manual ping as a substitute for a scheduled run.
The production release gate requires the `HEALTHCHECK_URL` secret. Never commit
or print its value. The request has no inquiry payload,
uses a five-second timeout and refuses redirects. A ping occurs only in live mode
when recovery, cleanup and delivery health all pass. Retention attention does not suppress this delivery heartbeat. An exhausted notification budget does suppress it, even before the ten-minute backlog threshold, so the monitor can flag capacity pressure without sending another notification through the same budget. A missing ping must
alert through the receiver; merely saving a URL is not proof that paging works.

After an authorized deployment, confirm the next genuine scheduled receipt and
aggregate health, using the procedure in `deployment/PRODUCTION.md`. A receiver
replacement needs its own approved setup and alert-delivery evidence. The current
code change does not renew the October 19 evidence. Manual mailbox and status
checks remain necessary.

A daily notification-budget hold preserves the saved row, attempt count and prior
frozen body. An inquiry with no provider attempt can recover for 48 hours after
creation, allowing the next UTC-day quota; after an actual attempt the five-attempt
and 22-hour limits still apply. Repeated quota holds will appear as backlog.
Retention review reports known due dates separately from old rows whose last
contact is unknown; creation date never becomes an assumed last-contact date.

## Resolve an investigated manual-review incident

`delivery.manual_review` retains the original delivery state. It is not an
acceptance or inbox-receipt claim. `attention.manual_review` counts only records
that still need investigation; `resolution.manual_review_resolved` counts the
owner-recorded outcomes separately. A resolution does not silence another
unresolved record, backlog, exhausted budget or failed scheduled step.

First inspect the exact inquiry, provider evidence, mailbox and any buyer reply.
Complete the required handling through the existing agreed channel. Then record
one of these outcomes, with a nonpersonal reference to that private incident
evidence:

- `handled_manually`: the actual request and notification discrepancy were
  reviewed, and the required buyer response or other agreed handling is complete.
- `duplicate_confirmed`: the inquiry was confirmed as a duplicate; the private
  incident record identifies the original and its handling.
- `spam_confirmed`: the owner reviewed the actual request and confirmed it is
  spam rather than an unanswered lead.

```powershell
npm run inquiries:production -- resolve FULL_REFERENCE FULL_REFERENCE handled_manually incident-20261020-01
```

Repeat the exact full UUID. The evidence reference must be 3–80 lowercase
letters, numbers, dots, hyphens or underscores; do not include names, email
addresses, inquiry text, credentials or a URL. The authenticated API is
`POST /api/operator/inquiries/{id}/resolve`, with `X-Confirm-Resolve` equal to
the full reference and JSON containing only `outcome` and `evidence_reference`.
Only a nonsynthetic `manual_review` record without an active lease is eligible.

The first resolution is immutable. Repeating the same outcome/reference returns
the existing result; conflicting evidence is rejected. The action never sends
mail, changes provider status, resets attempts or frozen messages, or changes
contact dates, client status or retention holds. A later retry cannot send a
resolved record. If an outcome was recorded incorrectly, stop and reconcile it
through the private incident process; do not reset delivery fields to force mail.
Record any real substantive buyer contact separately using the existing
follow-up command. Routine investigation/resolution does not restart retention.

Migration `0009_inquiry_delivery_resolutions.sql` adds a separate table and
preserves all inquiry rows and existing delivery constraints. For an authorized
release, apply this additive migration before deploying the new Worker/CLI.
Without it, existing processing/health behavior continues and resolution returns
503 without changing anything. Older code ignores this table and may alert again
on resolved manual-review rows; rollback must account for that conservative
behavior. Do not drop the table to roll back. Private exports include resolution
metadata, and its foreign key deletes the metadata with a confirmed D1 inquiry
deletion. No live migration or record resolution was performed by this change.

## Weekly retention reminder and reconciliation

Use the owner weekly retention review to act before the deadline; this runbook
is not evidence that a reminder has been scheduled or that cleanup is complete.
Advance review starts at day 80 after the recorded last substantive contact.
`attention.retention.upcoming` and the preview's `upcoming` list cover days
80–89; `due` still means day 90 or later. The actual working-copy deadline stays
90 days, and each known record's `retention_due_at` is unchanged. Finish the
review and eligible cleanup by that date, including all owner-controlled copies.

Unknown contact dates have separate `unconfirmed_upcoming` and
`unconfirmed_old` status counts, and corresponding
`unconfirmed_upcoming_needing_review` / `unconfirmed_old_needing_review` preview
lists. Their creation ages identify records to investigate, never an assumed
last contact or automatic deletion date. Both upcoming and due work set
`attention.retention.review_required`. These housekeeping signals remain
separate from delivery health and never imply deletion.

Run `npm run inquiries:production -- retention-preview` in the private workspace. Reconcile old unknown-contact records against actual email/chat history before setting a contact date or client status. Do not infer that an empty contact timestamp means no response. For each reconciled record, write the allowed follow-up fields to a private `.runtime` JSON file and run `npm run inquiries:production -- followup REFERENCE REFERENCE .runtime/FILE.json`. A preservation hold also needs its reason and future review date. Keep existing exact-reference deletion confirmations, client/hold safeguards and active delivery leases.

Apply the reviewed unsuccessful-inquiry policy to owner-controlled email, chat and export copies as well as D1. Record review time, counts and exceptions without inquiry text. Check preservation-hold review dates in the preview. Retention previews and status commands do not perform automatic deletion. Existing accepted projects and unknown correspondence must never be swept by a creation-date fallback.
