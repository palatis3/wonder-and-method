# Business-day inquiry checks

Owner: the owner of Venture House Group LLC. The public reply commitment is within one business day, Monday–Friday Eastern. These are operating instructions; implementation alone is not evidence that the owner has performed them.

At the start of each business day and again before finishing the day:

1. Run `npm run inquiries:production -- status`. This uses an authenticated aggregate endpoint: it reports counts, pending age, configuration presence, manual-review count and the last successful recovery run without retrieving names, addresses or messages. A failed command, HTTP error or missing result is a failed check, not zero inquiries.
2. Review Gmail for new website inquiries and outstanding replies. Also check Fastmail for public support mail and older inquiry notifications, and tawk.to for chats. A provider's accepted state does not establish mailbox receipt or a personal reply.
3. Reconcile any `manual_review_required`, `notification_backlog`, `notification_configuration_missing` or `recovery_heartbeat_missing_or_stale` reason. Hourly recovery runs at minute 17; its heartbeat is stale after 75 minutes. Backlog means an unaccepted saved inquiry is at least ten minutes old. A successful cron records its completion only after cleanup and retry processing finish. Schema migration 0005 is required for that heartbeat.
4. For a delivery discrepancy, use a new private export to identify the exact saved references and inspect provider/inbox evidence. Do not reset attempts, alter frozen messages or repeatedly retry an uncertain send. Follow the existing bounded retry and exact-reference procedures in `deployment/PRODUCTION.md` and `HANDOFF.md`. Respond to the buyer once the actual request and reply state are reconciled.
5. Record only check time, reviewer, aggregate result, any incident reference and resolution status in a private operations log. Keep inquiry text and credentials out of the log. Use the weekly retention procedure for working copies and exports.

If D1 or authentication is unavailable, the independent mailbox review and failed status command are the signals; this endpoint cannot diagnose itself during a total outage. No external paging service or independently verified owner-check history is claimed. If the owner cannot cover these checks, arrange actual coverage before relying on the response commitment.

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
