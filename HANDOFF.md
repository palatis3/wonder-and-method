# Operating handoff

Updated October 22, 2026. [BUILD_STATUS.md](BUILD_STATUS.md) identifies the verified deployed application and its exact release evidence: 415 HTML routes, 414 sitemap URLs and 1,027 matching asset hashes. Later documentation commits are separate from the deployed application. [OWNER_READINESS.md](operations/OWNER_READINESS.md) retains the business requirements that need actual owner or client evidence. Gmail routing remains unchanged.

## Daily inquiry handling

Review website inquiry and scope-request notifications in the owner's `palatis3@gmail.com` inbox. Support mail remains in Fastmail and tawk.to notifications remain unchanged, per the owner’s October 17 choice. The attempted Fastmail forwarding rule was rejected because forwarding is unavailable on its trial plan; no forwarding rule was saved. Continue reviewing those channels each business day. Reply within one business day, Monday–Friday Eastern. Chat presence should reflect actual availability; the response commitment does not imply instant chat coverage. The owner confirmed phone chat notification/reply on October 16; historical setup notes that say it is pending are superseded.

Check saved inquiry status independently of email receipt:

```powershell
npm run inquiries:production -- status
npm run inquiries:production -- export review-20261017
```

Status uses one aggregate request for delivery counts, backlog, manual-review cases, configuration presence and the last successful recovery run, without retrieving inquiry text. Follow [INQUIRY_HEALTH.md](operations/INQUIRY_HEALTH.md) at the start and end of each business day; a failed status command is a failed check. Export creates a new plaintext JSON file in `.runtime/exports` and refuses to overwrite it. Protect the file as personal data and delete it under the same retention decision as other working copies. The operator loads production credentials through Windows DPAPI without printing them.

Track real buyer progress in the [private lead pipeline](operations/LEAD_PIPELINE.md), using the saved reference and one row per buyer. `npm run leads -- report` shows received, qualified, proposal, won and lost counts by service and volunteered source, plus overdue actions and retention reviews. The private board is separate from the tracked blank template, public fictional demo and aggregate website events. Read its current report rather than assuming it is empty.

For a known reference, `retry REFERENCE CONFIRM_REFERENCE` may send a real notification; `delete REFERENCE CONFIRM_REFERENCE` removes the active record. Both arguments must be the same exact UUID. Reconcile uncertain delivery in Resend and the frozen message's destination inbox before retrying; new notifications go to Gmail and older attempts may still target Fastmail. Do not use the production form, retry or deletion commands for synthetic QA.

The deployed Worker caps notification attempts at five within a 22-hour retry window, uses a default site-wide 50-attempt UTC-day budget including retries, fences completion to the current sending lease and freezes the provider request body for new attempts after migration 0003. Hourly retries process at most 20 eligible records per run. Exhausted or ambiguous records need manual review; acceptance still does not establish inbox delivery. Independent Healthchecks delivery, submission-failure and retention alerts are configured. Follow [INQUIRY_HEALTH.md](operations/INQUIRY_HEALTH.md) for their different signals and guarded submission re-arm; none establishes that a buyer received a reply. Review delivery counts and reconcile uncertain provider outcomes.

Keep one weekly-board row per actual buyer. Record the last substantive contact, client status and any justified hold. Run `npm run inquiries:production -- retention-preview` using the verified migration 0003 schema; it is a dry run, not deletion. See [INQUIRY_RETENTION.md](operations/INQUIRY_RETENTION.md) for follow-up JSON and all-copy cleanup. Use `npm run inquiries:production -- measurement 7` for the deployed aggregate summary endpoint for aggregate reporting.

## Rebuild, deploy and recover

Use the clean-checkout commands in [README.md](README.md) and the release sequence in [PRODUCTION.md](deployment/PRODUCTION.md). Preserve both indexing gates as true. Keep the production custom-domain bindings and assets-only public boundary; old critique/review configurations are not production targets.

Before a release, record a compatible rollback Worker version and a private D1 export. A Worker rollback does not restore D1 or undo migrations. Restore a database only after reconciling newer inquiries, schema compatibility and provider state. Historical rollback and isolated SQL restore checks are in `evidence/production-recovery.json`; they do not prove current-volume recovery or lost-device access. Verify a clean rebuild and independently accessible source/credential recovery before claiming those capabilities.

## Commercial handoff

Use `config/offers.json` for new scopes and preserve accepted historical terms. Confirm the buyer's scope, start date, ready inputs and actual capacity before booking. The written proposal sets production, review and launch dates based on the agreed pages, research, writing and creative work; do not reuse an earlier generic production estimate. First contact is email, with a call arranged if useful. Issue private Stripe invoices only after the required written approvals. Care requires separately established coverage. Maintain actual costs, cash, client/accounting retention and client-owned accounts; a published website does not prove these business gates are complete.

Every new website plan includes custom code, one initial launch, a source folder/ZIP, written operating notes and one optional handoff call of up to 30 minutes. Keep the existing price, page cap, creative/motion scope, two review rounds, payment schedule and 30-day defect correction. Launch allows up to one ready-service link or compatible standard embed; Focused and Signature allow up to two. The client supplies ready-to-use services. Do not include a CMS/editor/accounts, app/portal/store/CRM, booking/newsletter account setup, tracking-number setup or scheduled growth follow-up in a new build quote. Scope these separately when requested; preserve any earlier accepted obligations.

Prepare the delivery with `node scripts/prepare-client-handoff.mjs --source "PATH/TO/CLIENT-FOLDER"` using [CLIENT_HANDOFF.md](operations/CLIENT_HANDOFF.md). Deliver the generated folder/ZIP, agreed paid assets/licenses, build/deployment instructions, service limitations and verified access to agreed client-owned accounts. Record the archive checksum and fresh-copy build evidence separately from the actual initial-launch URL/date and any real form/inbox checks. A fictional sample or clean secret scan does not establish those external results or guarantee every secret is absent.

Provide paid materials within five business days of relevant paid completion or reconciled termination, without waiting for the correction window to end. Optional service cancellation must not disable a paid client-owned site. Actual client outcomes, independent user research and unverified business facts remain separate evidence requirements.

Homepage SEO and menu update: `evidence/seo-positioning-20261017/` records the published headline, SEO emphasis, regional links and single mobile header CTA. The earlier Claude reassessment remains a dated audit snapshot.
