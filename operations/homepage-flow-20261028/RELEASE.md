# Homepage flow and stable floating controls

Published 2026-10-28T05:10:25.241Z. Source `cd4192b41c78d636aee267733a87668d54816d85`; runtime `9022fed7-0c01-4f23-a2f7-283d680271a2`. Later documentation-only commits do not change this application identity.

## Published changes

The floating chat and back-to-top controls remain in their established bottom corners during ordinary scrolling. Form editing, visible inquiry fields, overlapping keyboard focus and open menus retain targeted protections. The personal introduction was removed from the homepage and remains on About. The homepage now follows introduction → service choices → real work → clearly labeled concepts → process → questions → contact. Its portfolio screenshot and reviewed visual references were refreshed.

The regression contract in [QUALITY_CHECKS.md](../QUALITY_CHECKS.md#regression-contract-for-future-changes) records the behavior future updates must preserve. [Research and decisions](RESEARCH.md) explain the homepage sequence.

## Verification

- All 15 jobs in [Website checks run 40629880905](https://github.com/palatis3/wonder-and-method/actions/runs/40629880905), attempt 2, passed for the exact published source.
- All 5,528 generated files match the successful Linux build byte for byte.
- Browser checks: 1,456 passed; 585 existing exclusions remain. Reading accessibility: 36 passed. Visual comparison: 64 passed. Cross-browser: 176 passed, with 20 existing exclusions. No unexpected failures or flaky results.
- All 1,046 unit tests and 27 focused UX checks passed. Independent source and release-helper reviews passed; 25 changed visual references were inspected.
- Live verification matched all 2,424 pages and 3,094 assets to the tested build, including 2,412 sitemap-eligible URLs. All nine live browser checks passed across desktop, phone and narrow-phone layouts.
- The fresh database backup restored locally with integrity and foreign-key checks passing. No database migration or binding change was made.
- Scheduled recovery succeeded at 2026-10-28T05:17:30.095Z; the external monitoring dashboard confirms subsequent inquiry-delivery and retention receipts with email alerts enabled. No manual heartbeat was sent.

## Limits and retained evidence

Fixed controls may overlap passing prose; the targeted form and keyboard protections remain. These checks do not establish real third-party chat delivery or conversion improvement, and no real inquiry, chat message or email was sent. The link check found 4,283 reachable URLs, 0 broken and 181 explicitly unverified URLs. The existing sitemap was checked; this update did not request a separate Search Console submission.

The first CI attempt encountered two external-link failures; both recovered in an independent read-only check and the complete same-source second attempt passed. The original failures remain in the evidence.

Detailed private records, exact hashes, live screenshots, backup verification and monitor receipts are retained in `evidence/homepage-flow-20261028/release-report.json` and its bound evidence files. Broader popular-site and sales-conversion research remains a recommendation report; its proposed improvements were not included in this release.
