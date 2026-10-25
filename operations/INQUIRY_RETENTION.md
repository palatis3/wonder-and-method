# Inquiry retention and follow-up

Updated October 17, 2026. Owner: the owner of Venture House Group LLC. Review due dates weekly and complete unsuccessful-inquiry cleanup within 90 days after the last substantive project contact, or submission if there was no response. Routine internal review and automated reminders do not restart the clock. Converted clients follow a separately reviewed client/accounting schedule. Specific dispute/legal holds require a reason and review date.

## Record facts before evaluating deletion

Migration `0003_inquiry_followup.sql` adds nullable `last_substantive_contact_at`, explicit client/hold state, hold reason/review time and frozen notification payloads. It does not backfill contact dates from `created_at`: the database cannot infer later email/chat contact. The schema and read-only preview endpoint were verified in the October17 audit release. Confirm the production target before using these commands. Unknown contact stays null until the owner reconciles the conversation; when there was no response, explicitly record the verified submission time.

```powershell
npm run inquiries:production -- retention-preview
npm run inquiries:production -- followup REFERENCE CONFIRM_REFERENCE .runtime/inquiry-followup.json
```

`REFERENCE` and `CONFIRM_REFERENCE` must be the same exact inquiry UUID. The follow-up file must resolve inside `.runtime/` and be at most 4,096 bytes. Include all three fields `last_substantive_contact_at`, `is_client` and `retention_hold`. Timestamps are integer Unix milliseconds; contact may be null, otherwise it must be between creation and now. A hold requires a short reason and future review timestamp within 366 days. Releasing a hold clears its reason/review fields. Review expired holds; do not silently discard their protection.

Synthetic example only, for UUID `00000000-0000-4000-8000-000000000001` (do not submit it to production):

```json
{
  "last_substantive_contact_at": 1792238400000,
  "is_client": false,
  "retention_hold": true,
  "retention_hold_reason": "Synthetic example: preserve a specific disputed scope pending owner review.",
  "retention_hold_review_at": 1794830400000
}
```

The example contact is October 17, 2026 at 12:00 UTC and review is November 16 at 12:00 UTC. Replace with verified facts before any actual use; these fixed example dates eventually become invalid. Do not include an inquiry body, unnecessary dispute details or secrets in the hold reason.

Preview is read-only and returns at most 100 due records, an unknown-contact count and at most 100 holds needing review. Eligible preview rows exclude synthetic records, clients, holds, unknown contact and sending records. A full page can mean more records exist. No automatic inquiry deletion is implemented; hourly maintenance only clears its designated rate/aggregate data and handles bounded notification retries.

## Manual cleanup of all working copies

1. Inspect the exact reference and conversation history. Confirm the last substantive contact/no-response submission date, client status and any preservation exception. Do not treat a preview row as permission or proof that every system is ready for deletion.
2. Reconcile notification delivery and any active sending lease. For the exact approved record use `npm run inquiries:production -- delete REFERENCE CONFIRM_REFERENCE`. The API refuses deletion while a preservation hold or sending state remains, and fails closed if the follow-up schema is missing. An expired hold still protects the record until the owner explicitly releases it after review. This deletes the active D1 record, not a mailbox or provider backup. Verify absence through the private operator.
3. Remove matching owner-controlled Gmail inquiry mail/conversations and Fastmail support or older notification copies where present, tawk.to conversations/contact records, exports and local working copies using each system's controls. Include trash where supported. Track exceptions and provider recovery retention separately; do not promise immediate destruction of provider-held backups.
4. Keep a minimal result: reference, decision date, reason/category, systems checked and any unresolved retained copy with owner/review date. Do not preserve the deleted message body in a cleanup log. Client/accounting records and justified holds remain under their separate schedule.

Exports are plaintext private files even though operator credentials are DPAPI encrypted. Keep them out of Git and public output. Synthetic tests must use mocks/local records; routine QA sends no real notifications and deletes no real inquiries.

## Reviewed batches (combined release candidate, October 24)

The candidate adds a bounded alternative to the existing exact-reference command. It has not been exercised against real inquiries. A plan contains 1–25 explicit references and one reason: `retention_due`, or `resolved_spam_or_duplicate`. Delivery held for manual review is not evidence of spam. The latter reason requires an already recorded `spam_confirmed` or `duplicate_confirmed` resolution; `handled_manually` does not qualify.

Both reasons exclude clients, synthetic rows, preservation holds, sending records and unexpired delivery leases. Retention additionally requires a verified last-contact timestamp at least 90 days old. Unknown contact never falls back to creation time. A plan snapshots delivery, contact, client, hold and resolution fields. Any missing, changed or newly ineligible record rejects the entire batch in one database statement; no partial cleanup is accepted.

1. Reconcile each inquiry and all working copies using the steps above. Save only the chosen `reason` and `references` array in a private `.runtime/` JSON input file. A plan request does not update or delete records.
2. Run `npm run inquiries:production -- deletion-plan REVIEW_LABEL .runtime/INPUT_FILE.json`. This saves a new private `.runtime/deletion-plans/REVIEW_LABEL.json` and prints its SHA-256 digest, count, reason and expiry. Existing files are never overwritten. The plan expires after 30 minutes.
3. Read the complete plan and check every reference against the conversation and recorded reason. Keep it private: it includes operational references, dates and resolution evidence references, although it omits inquiry text and contact details.
4. Only after review, run `npm run inquiries:production -- delete-batch .runtime/deletion-plans/REVIEW_LABEL.json EXACT_REVIEWED_DIGEST`. The client checks the file digest and expiry; the authenticated server checks them again and atomically revalidates every snapshot. A stale plan requires a fresh plan and review. Do not edit a plan to force it through.
5. Verify the result and complete mailbox, chat, export and recovery-copy reconciliation. Delete local input/plan working copies under the same policy. Retain only the minimal cleanup result; the digest is an integrity confirmation, not proof that other systems were cleaned.

No schedule automatically runs this command. The existing reference-twice deletion command remains available with its existing safeguards. Neither command removes provider recovery copies or grants permission to disregard a preservation obligation.
