# V3 offers release

The V3 release publishes all 15 approved plans and 13 optional additions across service pages, pricing, request forms, payment schedules and downloadable scope terms. Website packages now offer 8, 10, 15 and 20 pages for $2,950, $4,500, $7,500 and $11,500. Accepted historical agreements retain their agreed terms.

Application source: `edd10936794297cd3d172b6e8e22a67b30328400`.
Production runtime: `8d40237e-9f25-4b26-bf9c-04409bb13088`.
Published: `2026-10-29T13:26:57.348Z`.

## Verification

- All 15 jobs passed in [CI run 40875707464, attempt 1](https://github.com/palatis3/wonder-and-method/actions/runs/40875707464). All 5,571 generated files match the Linux CI artifacts byte for byte.
- Browser coverage passed 1,487 cases with 587 independently reviewed applicability exclusions. Reading checks passed 54 cases, visual checks passed 84, and cross-browser checks passed 200 with 20 documented exclusions. No unexpected failures or flaky results remain.
- The post-publication comparison verified all 2,437 HTML routes and 3,124 assets against the approved build. The sitemap matches all 2,418 eligible URLs.
- All 18 live browser checks passed across three viewport sizes. Two stale private verification expectations were corrected: the approved services-section color and versioned scope-download links. Original test files and first-run results remain preserved. The correction review is recorded separately from the original helper review.
- The actual tawk.to panel and back-to-top control were tested on the published pricing page at desktop and phone widths. Both work. The chat was opened and minimized without sending a message.
- The fresh production database backup restored locally with integrity `ok` and zero foreign-key errors. Additive migration 0049 preserved existing records while accepting the new plan identifiers and analytics dimensions.
- Nine page paths were tested in mobile and desktop Lighthouse profiles. Mobile scores were 98–99; desktop scores were 100. These are laboratory measurements, not field-performance or conversion claims.
- External links: 4,127 reachable, zero confirmed broken and 337 explicitly unverified. Unverified links are not counted as successful checks.

## Independent review

The catalog, implementation, commercial scope protections, changed visual baselines and browser applicability exclusions received bounded independent Astra review. Findings were corrected and the final implementation and visual records passed. Historical review artifacts preserve what was pending when each review occurred; the completed release record supplies the subsequent CI, migration, publication and recovery evidence.

The scheduled recovery run succeeded at 2026-10-29T14:17:30.723Z. External inquiry-delivery and retention-attention checks then showed healthy status, email notifications enabled, one-hour periods and 15-minute grace windows, with fresh pings after that run. No manual heartbeat was sent.

Release verification completed at 2026-10-29T14:19:04.895Z. The completed release record SHA-256 is `cd375c65adc7acd50d0b306f1b1261eb1713797f6ac0b8ffedcf963cf08352b8`; the supplemental record SHA-256 is `62fe09e44d479f3a12e5f4f5d600bfe72680dd93d58bedb521c6762e86812c46`.

The final private evidence record hashes the deployment, backup, migration, CI, live-page comparison, browser results and external monitoring receipts. A supplemental record preserves the reviewed browser-expectation corrections and the observed floating controls. Private database snapshots, operational credentials and inquiry contents are not published in repository documentation.

## Limits

Examples retain their studio-owned, fictional or illustrative labels. Verification did not send a real inquiry, chat message or email. No delivered client outcome, human usability result or measured conversion uplift is claimed. Sitemap verification does not imply a separate Search Console submission. Later documentation-only commits do not change the deployed application identity above.
