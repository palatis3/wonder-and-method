# Operating pack implementation

The current operating flow is [WORKFLOWS.md](WORKFLOWS.md), with Stripe billing in [PAYMENTS.md](PAYMENTS.md). `config/offers.json` governs new offers. Accepted jobs retain their own versioned `commercial_snapshot`; changes to public prices do not rewrite them. The original V5 plan and `service-rules.json` remain historical references. Before-payment versions of these operating documents are retained in `historical/`.

Current website offers are Focused Website, Custom Website, Business Custom Website and Signature Custom Website. They include up to 10 / 15 / 20 / 25 pages at $2,195 / $2,995 / $4,495 / $6,495. Focused adapts an established layout direction; Custom and above start with original art direction. All four include original writing, basic native measurement, agreed launch checks, a source/account handoff and recorded guidance. Review rounds are 2 / 2 / 2 / 3; defect-reporting windows are 30 / 60 / 60 / 90 days. Timely in-scope reports remain covered until corrected, and paid-file delivery does not wait for that window to end. Website builds use 40% / 30% / 30% payment milestones. Read the selected plan in `config/offers.json` for exact journeys, guides, graphics, training and post-launch checks; specialty projects have their own scope. Monthly help is optional, and accepted historical agreements retain their saved terms. [BUILD_STATUS.md](../BUILD_STATUS.md) records the current production release and remaining business dependencies. Older audit records retain their dated scope.

`.runtime/operations/weekly-board.json` is the actual private business board; `operations/weekly-board.json` is the tracked blank template. `scripts/create-job.mjs` creates a current-offer scope and cumulative receipt under ignored `operations/jobs`. The buyer packet remains a local review draft. `operations/templates/billing.json` supplies private invoice prerequisites; `scripts/stripe-billing.mjs` creates and reconciles manual Stripe-hosted invoices. No command sends customer email or automatically charges, renews, refunds or fulfills work.

`node scripts/prepare-client-handoff.mjs --source "PATH/TO/CLIENT-FOLDER"` prepares the source delivery; [CLIENT_HANDOFF.md](CLIENT_HANDOFF.md) covers its explicit allowlist, Node/Python/Gitleaks requirements and integrity checks. With no source argument it packages a fictional demonstration. This command does not deploy, send files, configure provider accounts or establish actual form/email delivery.

`capacity-worksheet.json` and `cash-worksheet.json` require actual owner inputs. Existing `scripts/operations.mjs` calculators and synthetic rehearsals retain V5 logic and historical Care/Search identifiers; they are not current offer authority. Their numeric checks do not establish current profitability, actual staffing, acceptance or cash. `business-setup-and-inventory.json` records supplied identity and provider evidence. `acquisition-drafts.json` contains unsent drafts only.

## Verification

Run `node --test tests/payments.test.mjs` for billing behavior, `npm test` for the repository suite, `npm run build`, `npm run verify`, and the required release checks before publication. Build and review the experience preview for public UI changes. Local/fake-provider tests establish code behavior only; actual Stripe sandbox checkout and live activation need separate provider evidence. No real-client sale or operating-cycle evidence is invented.

## Remaining business inputs

[OWNER_READINESS.md](OWNER_READINESS.md) turns the October 18 audit requirements into specific owner steps. The draft calendar is provisional; annual funding is a real pre-invoice gate. The [October 25 sandbox refund](SANDBOX_REFUND_20261025.md) verifies the provider route; local settlement/restore rehearsals do not prove cash or lost-device recovery. The aggregate inquiry logger does not substitute for reviewing and replying to mailbox/chat messages.

Venture House Group LLC is the owner-confirmed contracting entity with verified New York registration. Domain, live inquiries, support mailbox, tawk.to phone notifications/replies and recovery evidence exist in the provider inventory. Stripe live activation/credential/catalog/checkout status must be read from current payment evidence, not inferred from code or a sandbox account. Actual calendar, cash/compensation, reviewed agreement, tax/invoice treatment, name-rights and coverage decisions remain owner inputs wherever not evidenced. The business can prepare offers while those inputs remain pending; accepting a specific commitment still needs its applicable gates.

# Service reach and search content

The studio's delivery facts live in `config/site.json` under `serviceCoverage`: `base`, `regions` and `country`, with `region` retained for compatibility. `src/service-area.mjs` derives the shared statement and structured-data areas from those facts. The current base is Buffalo. Read [BUILD_STATUS.md](../BUILD_STATUS.md) and its linked release record for current coverage and route counts. The custom Buffalo/Erie page remains. Retired standard county articles redirect to their corresponding directory entries, preserving local facts, sources, worksheets and historical inquiry contexts; distinct county service pages are added only after review. These fields describe actual online delivery, not offices or Google Business Profile eligibility.

Keep the current Buffalo/Erie County search focus separate from delivery reach. Core titles and descriptions are collected in `src/search-content.mjs`; article metadata and content live in `src/journal.mjs` and `src/search-guides.mjs`. The Erie County directory reads `authority/v5/geography.json`.

For expansion, first identify a distinct customer question and genuine service detail. Update an existing service or coverage section when it answers that question; add a new county page only when it has useful, distinct content. Register its route, add contextual links, and check its title, H1, canonical and visible coverage facts. Do not create pages by swapping county names or insert every keyword variation. Keep the keyword implementation map current with the intended page for each topic.

After a coverage edit, run both builds and verifiers, inspect the changed pages at phone and desktop widths, and verify the shared footer and Organization/Service markup. Search indexing has been owner-authorized and enabled since October 16: preserve `searchIndexing: true` and production `SEARCH_INDEXING: "true"`, with private/API/utility route restrictions unchanged.


