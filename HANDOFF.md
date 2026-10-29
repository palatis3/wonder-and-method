# Operating handoff

Current published application: [V4 offers](operations/v4-offers-20261029/RELEASE.md), source `f64d4a7faa12d02f8ab84ed0e20095c6446b0bfc`, runtime `472f43ed-afc5-4c6f-be80-d298b29a4892`, deployed 2026-10-29T20:34:01.721Z. All 2,437 routes and 3,124 assets match the tested build; 2,418 URLs are sitemap-eligible. All 15 exact-source CI jobs, 18 live browser checks, fresh-backup restore, scheduled recovery and external monitoring receipts passed. Database schema and operational bindings are unchanged. Later documentation-only commits do not change the deployed application identity.

Earlier dated release records remain below; the application identity and catalog above govern current operation.

## Retained prior release record

Previously published application: [Analytics consent layout correction](operations/ANALYTICS_CONSENT_FIX_20261026.md), source `7276436059258d34aa826ac0162c7b80b9497a32`, deployed 2026-10-26T20:45:51.274Z. Nevada and Washington content, Google Analytics configuration and all earlier reviewed coverage are retained.

The consent heading now stays compact on every tested page layout, including 320-pixel phones. Published source: `7276436059258d34aa826ac0162c7b80b9497a32`. Published runtime version: `efb7d38d-3130-430a-9fe7-39039fc8fb4a`. Deployed 2026-10-26T20:45:51.274Z. The change is one CSS selector plus a browser regression; consent behavior, event tags, page content, routes, database code and schema are unchanged from the verified Nevada/Washington release.

All 15 exact-source CI jobs passed. The complete browser run passed 1,264 tests with 567 reviewed skips. Reading, visual, cross-browser, SEO, HTML, link, dependency, performance and reproducible-build gates passed. All 2,183 production routes and 2,853 public assets match the checked build; 2,171 URLs remain sitemap-eligible. All 54 live journeys and 14 additional consent-layout cases passed. A fresh private database export restored with successful integrity and foreign-key checks; no migration was applied. Scheduled recovery succeeded at 2026-10-26T21:17:30.504Z; the external receiver confirmed it at 2026-10-26T21:17:34.948076+00:00. Email alerts remain enabled with a 60-minute period and 15-minute grace. No manual heartbeat was sent.

The [Nevada and Washington expansion](operations/NEVADA_WASHINGTON_EXPANSION_20261026.md) and consent-based Google Analytics are published and verified. Earlier coverage and reviewed Semrush corrections remain included.

Published source `7ecc8b115544c7b08f3e67cff3062f81dd118d03`; authenticated Worker `18877d9a-e033-466f-af86-a8cf15e305c4`; deployed 2026-10-26T19:06:47.891Z.

All 2,183 live application routes and 2,853 public asset hashes match the checked build. The sitemap contains 2,171 eligible URLs. All 15 jobs in the [exact-source CI run](https://github.com/palatis3/wonder-and-method/actions/runs/40374733225) passed, including the shared core build, five browser partitions and nine named release gates. All 5,046 generated files match the Linux build.

The complete browser inventory passed 1,261 checks with 567 independently reviewed platform-specific skips. Reading checks passed 36 cases; visual checks passed 64 tests covering 72 images; Firefox/WebKit passed 128 checks with 20 reviewed skips. All 54 live desktop, phone and 320-pixel journeys passed. Static SEO checked all 2,183 routes with zero errors and 36 exact editorial decisions. Outbound checks report 3,774 reachable, 0 confirmed broken and 158 unverified destinations; unavailable destinations are not reported as reachable.

The release adds Nevada and Washington directories and 50 individually researched service pages, with six directory-only decisions across 56 county-equivalent areas. Carson City is correctly treated as an independent city. All 1,983 preceding service records and all 275 FAQ pairs on 205 pages remain unchanged. The current inventory contains 2,033 service records and 2,893 county-equivalent directory entries across 43 states and Washington, DC. No additional FAQ answer or general guide was justified. The earlier Arizona/Oregon release and its Semrush corrections remain included.

A fresh private production backup passed restore, integrity, foreign-key checks and an offline rehearsal. Migration 0045 preserves preceding rows and schemas while extending daily analytics page keys from 2,103 to 2,155. All 44 preceding migrations remain unchanged. The preceding Worker remains compatible; a code rollback must not restore an older database over newer inquiries.

Authenticated health is healthy. A genuine scheduled recovery succeeded at 2026-10-26T19:17:31.062Z, followed by the external HTTPS receipt at 2026-10-26T19:17:32.288686+00:00. Email alerts remain enabled to support@wonderandmethod.com with a one-hour period and fifteen-minute grace. No manual heartbeat was sent.

Search Console confirmed the verified sitemap submission at 2026-10-26T19:19:37.294Z. Submission and discovery do not establish indexing, rankings or traffic. Routine QA sent no real inquiry, chat message, email or payment. Later documentation-only commits do not change the deployed application identity.

Google Analytics uses saved consent before collection, fixed page categories and allowlisted action names. Fourteen site actions map to thirteen event names; saved inquiries and questions map to generate_lead only after a successful save. The key event counts once per event, with selected-service and saved-inquiry-type dimensions. All seven enhanced-measurement categories are enabled; supported YouTube embeds provide video events. Search and unsupported-query visits are suppressed, and permitted navigation URLs are reported canonically. Live Google receipt and production content-security-policy verification are recorded separately from the fully intercepted event tests. No fake production lead was created.

The completed October 26 Semrush crawl measured the preceding eight-state release: 6,165 URLs, 97% Site Health, 98% AI Search Health, zero errors, 110 warnings and 5,983 notices. Every one of that release's 2,069 sitemap URLs returned 200 with a self-referencing canonical, including all 437 newly published URLs. Those measurements do not describe a fresh crawl of this Nevada/Washington release. Its publication and live reachability are verified separately above. The Nevada/Washington keyword review inspected 533 unique US exact phrases: 45 positive estimates, 49 explicit zeros and 439 unavailable results; 502 observations require refresh, including 65 partial numeric values. These estimates are not county-resident demand. All 56 individual decisions passed review; six areas remain directory-only: Eureka, Lander and Nye in Nevada, and Columbia, Cowlitz and Pierce in Washington.

## Daily inquiry handling

For website changes, follow [quality checks](operations/QUALITY_CHECKS.md), including content and screenshot review, shared-control checks and the exact-commit GitHub gate. Future prices and plan details use the [central offer workflow](operations/OFFER_UPDATES.md).

Review website inquiry and scope-request notifications in the owner's `palatis3@gmail.com` inbox. Support mail remains in Fastmail and tawk.to notifications remain unchanged, per the owner’s October 17 choice. The attempted Fastmail forwarding rule was rejected because forwarding is unavailable on its trial plan; no forwarding rule was saved. Continue reviewing those channels each business day. Reply within one business day, Monday–Friday Eastern. Chat presence should reflect actual availability; the response commitment does not imply instant chat coverage. The owner confirmed phone chat notification/reply on October 16; historical setup notes that say it is pending are superseded.

Check saved inquiry status independently of email receipt:

```powershell
npm run inquiries:production -- status
npm run inquiries:production -- export review-20261017
```

Status uses one aggregate request for delivery counts, backlog, manual-review cases, configuration presence and the last successful recovery run, without retrieving inquiry text. Follow [INQUIRY_HEALTH.md](operations/INQUIRY_HEALTH.md) at the start and end of each business day; a failed status command is a failed check. Export creates a new plaintext JSON file in `.runtime/exports` and refuses to overwrite it. Protect the file as personal data and delete it under the same retention decision as other working copies. The operator loads production credentials through Windows DPAPI without printing them.

Track real buyer progress in the [private lead pipeline](operations/LEAD_PIPELINE.md), using the saved reference and one row per buyer. `npm run leads -- report` shows received, qualified, proposal, won and lost counts by service and volunteered source, plus overdue actions and retention reviews. Run it from the existing operator checkout, `C:/Wonder and Method/wonder-method`; private records are not copied into release worktrees. The private board is separate from the tracked blank template, public fictional demo and aggregate website events. Read its current report rather than assuming it is empty; do not initialize a parallel board when a release checkout lacks it.

For a known reference, `retry REFERENCE CONFIRM_REFERENCE` may send a real notification; `delete REFERENCE CONFIRM_REFERENCE` removes the active record. Both arguments must be the same exact UUID. Reconcile uncertain delivery in Resend and the frozen message's destination inbox before retrying; new notifications go to Gmail and older attempts may still target Fastmail. Do not use the production form, retry or deletion commands for synthetic QA.

The deployed Worker caps notification attempts at five within a 22-hour retry window, uses a default site-wide 50-attempt UTC-day budget including retries, fences completion to the current sending lease and freezes the provider request body for new attempts after migration 0003. Hourly retries process at most 20 eligible records per run. Exhausted or ambiguous records need manual review; acceptance still does not establish inbox delivery. Independent Healthchecks delivery, submission-failure and retention alerts are configured. Follow [INQUIRY_HEALTH.md](operations/INQUIRY_HEALTH.md) for their different signals and guarded submission re-arm; none establishes that a buyer received a reply. Review delivery counts and reconcile uncertain provider outcomes.

Keep one weekly-board row per actual buyer. Record the last substantive contact, client status and any justified hold. Run `npm run inquiries:production -- retention-preview` using the verified migration 0003 schema; it is a dry run, not deletion. See [INQUIRY_RETENTION.md](operations/INQUIRY_RETENTION.md) for follow-up JSON and all-copy cleanup. Use `npm run inquiries:production -- measurement 7` for the deployed aggregate summary endpoint for aggregate reporting.

## Rebuild, deploy and recover

Use the clean-checkout commands in [README.md](README.md) and the release sequence in [PRODUCTION.md](deployment/PRODUCTION.md). Preserve both indexing gates as true. Keep the production custom-domain bindings and assets-only public boundary; old critique/review configurations are not production targets.

Before a release, record a compatible rollback Worker version and a private D1 export. A Worker rollback does not restore D1 or undo migrations. Restore a database only after reconciling newer inquiries, schema compatibility and provider state. Historical rollback and isolated SQL restore checks are in `evidence/production-recovery.json`; they do not prove current-volume recovery or lost-device access. Verify a clean rebuild and independently accessible source/credential recovery before claiming those capabilities.

## Commercial handoff

Use `config/offers.json` for new scopes and preserve accepted historical terms. Confirm the buyer's scope, start date, ready inputs and actual capacity before booking. The written proposal sets production, review and launch dates based on the agreed pages, research, writing and creative work; do not reuse an earlier generic production estimate. First contact is email, with a call arranged if useful. Issue private Stripe invoices only after the required written approvals. Care requires separately established coverage. Maintain actual costs, cash, client/accounting retention and client-owned accounts; a published website does not prove these business gates are complete.

Current website offers are Focused Website, Custom Website, Business Custom Website and Signature Custom Website. They include up to 10 / 15 / 20 / 25 pages at $2,195 / $2,995 / $4,495 / $6,495. Focused adapts an established layout direction; Custom and above start with original art direction. All four include original writing, basic native measurement, agreed launch checks, a source/account handoff and recorded guidance. Review rounds are 2 / 2 / 2 / 3; defect-reporting windows are 30 / 60 / 60 / 90 days. Timely in-scope reports remain covered until corrected, and paid-file delivery does not wait for that window to end. Website builds use 40% / 30% / 30% payment milestones. Read the selected plan in `config/offers.json` for exact journeys, guides, graphics, training and post-launch checks; specialty projects have their own scope. Monthly help is optional, and accepted historical agreements retain their saved terms.

Prepare the delivery with `node scripts/prepare-client-handoff.mjs --source "PATH/TO/CLIENT-FOLDER"` using [CLIENT_HANDOFF.md](operations/CLIENT_HANDOFF.md). Deliver the generated folder/ZIP, agreed paid assets/licenses, build/deployment instructions, service limitations and verified access to agreed client-owned accounts. Record the archive checksum and fresh-copy build evidence separately from the actual initial-launch URL/date and any real form/inbox checks. A fictional sample or clean secret scan does not establish those external results or guarantee every secret is absent.

Provide paid materials within five business days of relevant paid completion or reconciled termination, without waiting for the correction window to end. Optional service cancellation must not disable a paid client-owned site. Actual client outcomes, independent user research and unverified business facts remain separate evidence requirements.

Homepage SEO and menu update: `evidence/seo-positioning-20261017/` records the published headline, SEO emphasis, regional links and single mobile header CTA. The earlier Claude reassessment remains a dated audit snapshot.
