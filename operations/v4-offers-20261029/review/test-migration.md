# V4 existing-test migration

Migrated 31 existing test files from obsolete V3 current-offer expectations to the approved V4 catalog. Preserved validation, failure-closed billing, exact cents and milestone allocation, immutable accepted snapshots, scope limits, content escaping, native inquiry behavior, offer bindings, full buyer-pack content, and published-page checks. No tests were removed or skipped.

Current prices, ten/fifteen/twenty/twenty-five-page website limits, delivery windows, defect windows, Care variants, 60-minute Care edit allowance, and Local Search outputs now match the approved V4 catalog. Monthly starting-price assertions use production-only pricing; default quoted monthly scopes assert the selected Brochure variant. Class assertions retain the V3 card class token while allowing the additional V4 styling class.

Historical annual, hosting-credit, artwork and pre-V3 tests retain their existing frozen sources. The V3 county rendered-hash test now explicitly loads `operations/historical/offers-2026-10-29-v3.json`, retaining the approved historical rendered hash without updating its baseline.

Existing tests surfaced three valid product regressions and were preserved while the primary agent fixed them: explicit monthly advance-billing/cancellation clarity; eligibility and exact first-invoice confirmation before payment; and the dynamic optional monthly strategy-review appointment duration.

Validation: sequential Node test execution (`node --test --test-concurrency=1 --test-reporter=tap`) over the existing failed-file set, excluding primary-owned `client-handoff.test.mjs` and `audit-responsive-city-assets.test.mjs`. Final evidence is `migration-verified.tap` in this folder. Whitespace validation uses `git -c core.whitespace=cr-at-eol diff --check -- tests` because some tracked test files intentionally use CRLF with `* -text` repository attributes. No builds or production actions were run by this worker.

Final status: PASS — 229 tests passed; 0 failed, skipped, cancelled or pending. Duration: 45.15 seconds. No unresolved product findings in the owned test set.

Modified files:

- `tests/addons-backend.test.mjs`
- `tests/addons-content.test.mjs`
- `tests/addons-frontend.test.mjs`
- `tests/approved-rerun-backend.test.mjs`
- `tests/audit-buyer-packs-clarity.test.mjs`
- `tests/audit-calculator-clarity.test.mjs`
- `tests/audit-guide-clarity.test.mjs`
- `tests/audit-implementation.test.mjs`
- `tests/audit-inquiry-clarity.test.mjs`
- `tests/audit-search-metadata.test.mjs`
- `tests/audit-service-help-clarity.test.mjs`
- `tests/audit-work-clarity.test.mjs`
- `tests/business-documents.test.mjs`
- `tests/buyer-experience.test.mjs`
- `tests/buyer-packs.test.mjs`
- `tests/checkout.test.mjs`
- `tests/claude-clarity-frontend.test.mjs`
- `tests/drafts.test.mjs`
- `tests/expanded-website-packages.test.mjs`
- `tests/job-packet.test.mjs`
- `tests/journal.test.mjs`
- `tests/location-services.test.mjs`
- `tests/monthly-seo-growth.test.mjs`
- `tests/offer-catalog.test.mjs`
- `tests/payments.test.mjs`
- `tests/plan-clarity.test.mjs`
- `tests/project-milestones.test.mjs`
- `tests/rerun2-buyer-content.test.mjs`
- `tests/rerun2-content.test.mjs`
- `tests/source-handoff-offers.test.mjs`
- `tests/v3-source-repair.test.mjs`
