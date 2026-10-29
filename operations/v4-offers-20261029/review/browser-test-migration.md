# V4 browser-test migration

PASS for the bounded browser migration. Nine existing Playwright spec files updated; no tests removed, no new skips, no retries/force clicks, no timeout increases and no weakened layout or safety gates.

Changes cover V4 add-on fees and exact 40/30/30 milestone cents, calculator/ROI examples, website-card placement and Discuss CTAs, delivery windows, all monthly variant names and prices, the homepage SEO production starting fee and combined page/profile output, and eligible Brochure hosting offsets. The estimator test explicitly checks the $240 annual offset at $20/month eligible hosting and the $300 cap at $30/month. Historical annual behavior retains its frozen catalog fixture.

Two findings resolved:

- The homepage SEO tile still advertised $299/month and page OR profile work. The primary agent corrected source/build to $199 production-only and page work PLUS profile updates; the final homepage test passes in desktop, phone and reduced-motion projects.
- An isolated synthetic form document lacked UTF-8 encoding, displaying corrupted punctuation and causing phone click hit testing to fail after switching services. Added `<meta charset="utf-8">` to the existing test mount, matching actual pages. The previously failing phone and reduced-motion tests then passed, followed by all 30 cases in that fixture suite. No production source or CSS change was needed.

Validation

All commands used `node node_modules/@playwright/test/cli.js test`, existing repository configs, `--workers=1`, and `--reporter=line` for final evidence.

1. Chromium behavior/layout matrix, projects desktop, phone, phone-reduced-motion; spec list: addons, buyer-decisions, buyer-journeys, living-city-night, approved-rerun-backend, research-guides, payment-schedule, ux-improvements, table-semantics, audit-layout-regression. The 177 identities yielded 151 passes, 24 existing viewport-specific skips and 2 failures caused by the fixture encoding issue. Corrective rerun of the entire approved-rerun-backend spec across all three projects passed all 30; combined validated outcome is 153 passing executed identities and 24 unchanged skips. Evidence: `browser-responsive-final.log` and `browser-fixture-final.log`.
2. Dedicated `tests/browser/no-javascript.spec.mjs --project=no-javascript`: all 16 passed, including native add-on selection, correction, receipt and fixed monthly context. Evidence: `browser-native.log`.
3. `--config=playwright.cross-browser.config.mjs` with buyer-journeys, payment-schedule and table-semantics: 54 passed and 2 existing phone-navigation skips across Firefox, WebKit desktop, WebKit phone and WebKit reduced-motion. Evidence: `browser-cross-final.log`.
4. `git -c core.whitespace=cr-at-eol diff --check -- tests/browser` passed, retaining existing CRLF where tracked.

The interrupted diagnostic run overlapped a primary rebuild and is not used as evidence. Final Chromium and cross-browser runs used the primary's completed reviewed build while dist remained frozen. The primary subsequently has a small source clarity batch awaiting a new build; these results do not claim verification of that future artifact.

No unresolved product defect remains from this bounded review. Primary-owned follow-up: refresh applicable `config/ci-browser-exclusions.json` source-file hashes after final spec edits, retaining all existing intentional exclusions; validate the eventual rebuilt artifact through normal release checks.

Ownership and cleanup: only existing browser specs plus this report/logs were changed. No source, config, fixtures or visual baselines changed. Repository test server 4187 was stopped; primary server 4198 remains untouched.

Modified paths

- `tests/browser/addons.spec.mjs`
- `tests/browser/approved-rerun-backend.spec.mjs`
- `tests/browser/buyer-decisions.spec.mjs`
- `tests/browser/buyer-journeys.spec.mjs`
- `tests/browser/living-city-night.spec.mjs`
- `tests/browser/no-javascript.spec.mjs`
- `tests/browser/payment-schedule.spec.mjs`
- `tests/browser/research-guides.spec.mjs`
- `tests/browser/ux-improvements.spec.mjs`
