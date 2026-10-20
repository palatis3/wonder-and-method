# Private lead pipeline

The actual board is `.runtime/operations/weekly-board.json`, ignored by Git and excluded from public assets. `operations/weekly-board.json` is its blank template. Keep one row per economic buyer, linked by the saved inquiry reference. Initialize without overwriting existing rows:

```powershell
npm run leads -- init
npm run leads -- report
npm run leads -- update .runtime/operations/lead-update.json
```

The update input is a private JSON object. It needs `economic_buyer_id` and the existing `inquiry_reference`; repeat those for later updates. Optional fields include `stage`, `appropriate_offer`, `source`, `buyer_job`, `owner`, `next_action`, `next_action_date`, `quoted_amount`, `scope_link`, `receipt_link`, `outcome_reason`, `last_substantive_contact_at`, `inquiry_retention_due_at` and `retention_exception` / `retention_exception_review_at`. Existing delivery and capacity fields are preserved. Do not copy raw inquiry messages, credentials or unnecessary contact details into this board.

Stages are `received`, `qualified`, `proposal`, `won` and `lost`. Record a real buyer job for qualification, a scope link for proposals, booking/payment evidence for a win, and the known reason (or explicitly unknown reason) for a loss. Test inquiries never enter the actual board. A proposal is not a booking; the operating approval and payment gates still apply. Stage history records changes without duplicating a buyer.

Use a service ID accepted by the website (`launch_site`, `focused_site`, `signature_site`, `keep_running`, `improve`, `grow`, `website_baseline`, `audit_fix_sprint`, or `unsure`). Source is the visitor's answer on the current form: `search`, `ai`, `referral`, `returning`, `other`, or `unknown` when skipped. Older saved answers may include `google`, `maps`, `social` or `directory`; preserve that actual historical answer rather than silently recoding it. Do not infer it from a visitor's connection or treat it as attribution. Date fields use ISO dates/timestamps. Unknown quoted amounts remain null.

The report shows current-stage counts by service and stated source, overdue next actions and due retention reviews. It omits buyer identities and does not compute visitor conversion rates or earned revenue. Review the actual private board to identify the rows behind those counts. No email, payment or production database mutation occurs.

At the weekly review, reconcile new saved references with the inquiry inbox and existing buyer rows, update qualification/proposal/outcome evidence, and choose the next action. Apply the established 90-day unsuccessful-inquiry policy using the last substantive contact date. When contact is known and expiry is omitted, the tool derives the 90-day deadline. A later deadline requires a documented exception and a future review date within 366 days. Unknown contact dates, legacy inconsistent deadlines and expired exceptions always require review; an arbitrary far-future date cannot hide an old inquiry. A due flag starts a review, not an automatic deletion. Complete the D1, Gmail, private-input, board, export and backup checks in `INQUIRY_RETENTION.md`. Converted clients and documented preservation exceptions follow their reviewed schedules. A local board is not a replacement for provider receipts or the production inquiry record.
