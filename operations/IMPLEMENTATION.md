# Operating pack implementation

The current operating flow is [WORKFLOWS.md](WORKFLOWS.md), with Stripe billing in [PAYMENTS.md](PAYMENTS.md). `config/offers.json` governs new offers. Accepted jobs retain their own versioned `commercial_snapshot`; changes to public prices do not rewrite them. The original V5 plan and `service-rules.json` remain historical references. Before-payment versions of these operating documents are retained in `historical/`.

`weekly-board.json` is the single business board. `scripts/create-job.mjs` creates a current-offer scope and cumulative receipt under ignored `operations/jobs`. The buyer packet remains a local review draft. `operations/templates/billing.json` supplies private invoice prerequisites; `scripts/stripe-billing.mjs` creates and reconciles manual Stripe-hosted invoices. No command sends customer email or automatically charges, renews, refunds or fulfills work.

`capacity-worksheet.json` and `cash-worksheet.json` require actual owner inputs. Existing `scripts/operations.mjs` calculators and synthetic rehearsals retain V5 logic and historical Care/Search identifiers; they are not current offer authority. Their numeric checks do not establish current profitability, actual staffing, acceptance or cash. `business-setup-and-inventory.json` records supplied identity and provider evidence. `acquisition-drafts.json` contains unsent drafts only.

## Verification

Run `node --test tests/payments.test.mjs` for billing behavior, `npm test` for the repository suite, `npm run build`, `npm run verify`, and the required release checks before publication. Build and review the experience preview for public UI changes. Local/fake-provider tests establish code behavior only; actual Stripe sandbox checkout and live activation need separate provider evidence. No real-client sale or operating-cycle evidence is invented.

## Remaining business inputs

Venture House Group LLC is the owner-confirmed contracting entity with verified New York registration. Domain, live inquiries, support mailbox, tawk.to phone notifications/replies and recovery evidence exist in the provider inventory. Stripe live activation/credential/catalog/checkout status must be read from current payment evidence, not inferred from code or a sandbox account. Actual calendar, cash/compensation, reviewed agreement, tax/invoice treatment, name-rights and coverage decisions remain owner inputs wherever not evidenced. The business can prepare offers while those inputs remain pending; accepting a specific commitment still needs its applicable gates.

# Service reach and search content

The studio's delivery facts live in `config/site.json` under `serviceCoverage`: `base`, `region`, and `country`. `src/service-area.mjs` derives the shared statement and structured-data area from those facts. The current statement is “Based in Erie County, serving businesses across New York online.” These fields describe actual online delivery, not offices or Google Business Profile eligibility.

Keep the current Buffalo/Erie County search focus separate from delivery reach. Core titles and descriptions are collected in `src/search-content.mjs`; article metadata and content live in `src/journal.mjs` and `src/search-guides.mjs`. The Erie County directory reads `authority/v5/geography.json`.

For expansion, first identify a distinct customer question and genuine service detail. Update an existing service or coverage section when it answers that question; add a new county page only when it has useful, distinct content. Register its route, add contextual links, and check its title, H1, canonical and visible coverage facts. Do not create pages by swapping county names or insert every keyword variation. Keep the keyword implementation map current with the intended page for each topic.

After a coverage edit, run both builds and verifiers, inspect the changed pages at phone and desktop widths, and verify the shared footer and Organization/Service markup. `searchIndexing` and the production `SEARCH_INDEXING` flag remain false until the owner explicitly authorizes activation.


