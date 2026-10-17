# Operating pack implementation

> Current-offer boundary — October 15, 2026: use `config/offers.json` and versioned `scripts/create-job.mjs` snapshots for every new quote. Builds are # Operating pack implementation
,400 / $2,350 / $3,700; services are # Operating pack implementation
50 / $400 / $800 monthly or # Operating pack implementation
,710 / $4,560 / $9,120 for twelve prepaid cycles. Baseline $399 and Audit & Fix Sprint $750. Client owns and pays hosting/domain/tools directly; setup and handoff labor is included, without new subsidies or markup. Provider plan, taxes, renewal, seats, usage, export, support and recovery are agreed before commitment. Historical V5 economics, caps and old synthetic records below are historical references only, never current offer or staffing authority. Preserve their accepted rights; never regenerate an old agreement from mutable new prices. Annual unused-cycle refunds and current-cycle unearned-work reconciliation remain required. No real account or billing changes are authorized by this copy release.


`WORKFLOWS.md` implements the V5 six-stage client flow. `weekly-board.json` is the single blank business board; `templates/accepted-scope.json` and `templates/cumulative-receipt.json` are copied per job. All event blocks in `templates/playbook-blocks.json` belong in those records. `service-rules.json` retains current Care/Search/Sprint and ownership/billing boundaries from V5. No original plan files were changed.

`capacity-worksheet.json` and `cash-worksheet.json` contain blank actual inputs, dated rows, formulas and stress-case fields. They distinguish actual availability from illustrations, earned/unearned obligations from cash, and founder contribution from owner draws. The cash worksheet references existing invoicing/bookkeeping records rather than issuing or duplicating invoices. `business-setup-and-inventory.json` records supplied identity/domain/contact, pending systems and editable account/license terms. `acquisition-drafts.json` holds unsent warm, individual, follow-up, feedback and permission drafts with bounded learning rules.

Run from the project directory with Node:

```
node --test tests/operations.test.mjs
node scripts/operations.mjs rehearse
node scripts/operations.mjs init operations/jobs/CLIENT-ID
node scripts/operations.mjs capacity input-week.json
node scripts/operations.mjs cash input-month.json
node scripts/operations.mjs gate input-gate.json
node scripts/operations.mjs change input-change.json
node scripts/operations.mjs incident input-incident.json
node scripts/operations.mjs renewal input-service.json
node scripts/operations.mjs cancellation input-exit.json
```

The CLI reads one filled row/object at a time (not an entire worksheet). `gate` expects `{ "stage": "Fit", "evidence": {} }` and lists missing named booleans. Renewal input uses `service` (`care`/`search`), exact `renewal_timestamp` with UTC offset, IANA `timezone`, `renewal_local_date`, written route, `closures` (local ISO dates), and `business_calendar_confirmed`. Search additionally needs useful task/input booleans and dated approval/input evidence; Care needs coverage, recipient and escalation confirmation. The runbook and service rules remain authoritative when a calculator cannot model the actual circumstances. Weekly/monthly dated peaks and legal/accounting reconciliation remain human checks; numeric output never grants booking or refund authority.

Optional output paths use exclusive creation and never overwrite an existing record. `init` creates only the scope and receipt, leaving the single board in place. It may leave the first file if the second already exists; inspect the folder on error before retrying. No third-party dependencies, network calls, credentials, charges, client messages or deployment commands exist in this CLI.

## Evidence and limits

`synthetic/workflow-results.json` is the deterministic `rehearse` output. It exercises purchase/handoff gates, scope change, defect, incident, Search renewal/pause/refund-or-credit/reconciliation, Care coverage, cancellation/handoff, capacity and cash stress. `synthetic/test-results.txt` records the local regression run. These verify decision logic only; they cannot establish actual delivery to an inbox, a paid project, production quality, throughput, margin or client retention. Never merge these samples into actual business rows.

## Remaining inputs

The owner confirmed Venture House Group LLC as the exact contracting name, and New York registration is verified (active, DOS ID 7654870). Domain control, protected Cloudflare/D1 staging, restricted Resend sending and actual inquiry-to-Gmail receipt are verified. Bitwarden account and Stripe sandbox setup are recorded; live billing and lost-device recovery remain pending. The owner personally reviews Gmail and replies as availability allows, with no fixed response promise. The delegated 90-day unsuccessful-inquiry policy and deletion ownership are in inquiry-policy.json. Name-rights review, actual calendar/cash/compensation, tax/invoice treatment, reviewed agreement and service coverage remain pending. Biography and future support-mailbox migration are deferred. Website publication is already authorized and verified; full business acceptance remains open.

Before a real sale complete the applicable scope/cost/capability/calendar/cash gates. Before launch complete actual provider+mailbox delivery, ownership/deployment/recovery and exact-version acceptance. Before scale gather three completed paid builds per tier, a full paid Care quarter and two full paid Search cycles as required by V5. No future commercial evidence is claimed.
# Service reach and search content

The studio's delivery facts live in `config/site.json` under `serviceCoverage`: `base`, `region`, and `country`. `src/service-area.mjs` derives the shared statement and structured-data area from those facts. The current statement is “Based in Erie County, serving businesses across New York online.” These fields describe actual online delivery, not offices or Google Business Profile eligibility.

Keep the current Buffalo/Erie County search focus separate from delivery reach. Core titles and descriptions are collected in `src/search-content.mjs`; article metadata and content live in `src/journal.mjs` and `src/search-guides.mjs`. The Erie County directory reads `authority/v5/geography.json`.

For expansion, first identify a distinct customer question and genuine service detail. Update an existing service or coverage section when it answers that question; add a new county page only when it has useful, distinct content. Register its route, add contextual links, and check its title, H1, canonical and visible coverage facts. Do not create pages by swapping county names or insert every keyword variation. Keep the keyword implementation map current with the intended page for each topic.

After a coverage edit, run both builds and verifiers, inspect the changed pages at phone and desktop widths, and verify the shared footer and Organization/Service markup. `searchIndexing` and the production `SEARCH_INDEXING` flag remain false until the owner explicitly authorizes activation.

