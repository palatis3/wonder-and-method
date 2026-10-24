# MS/AL integration review

Reviewed 2026-10-24T04:22:51.434Z, against HEAD `af1a0e0638996b476f28e3da0d53b18fb1fcca7e`. **PASS for the reviewed source/data integration. No actionable source defects found. Release acceptance remains pending.**

## Verified

- All 1,088 prior service records deep-equal HEAD; the integrated array appends only the five accepted records. All 1,284 prior identities and 1,217 prior routes survive. The result has 1,433 identities, 25 regions (24 states and DC), 1,093 service records, 1,224 HTML routes and 1,223 sitemap entries.
- Accepted geography is integrated byte-for-byte. All 26 recorded geography input hashes, all commercial input hashes and all 38 canonical candidate/comparison record hashes match. All 149 new counties and 1,022 distinct places retain the separately reviewed classifications and cross-county data. The prior source reviews have not been broadened into sitewide SEO or ranking approval.
- The compact finder is 368,630 bytes against the unchanged 375,000-byte budget. Rendering, JavaScript, CSS and tests use matching data-cs/data-cl attributes; no stale long-attribute references remain in src/tests/scripts. All 880 internal links checked on the seven new pages resolve, including fragments.
- Targeted in-memory migration 0031 test passed: one test, zero failures. It exercises all 1,189 historical keys plus seven additions, preserves aggregate/inquiry/resolution rows, validates constraints/defaults and writes through the worker. This does not prove production migration preservation.
- The font reproduces byte-for-byte, its CSS ranges partition the existing full regular face exactly, and the original full font is unchanged. Validation agrees with the saved proof: 158 retained glyphs and 13,924 encoded kerning pairs. The common face saves 16,292 initial font bytes. Local diagnostic median LCP was 2,334.037 ms before and 2,333.1197 ms after, with unchanged 0.97 score; no meaningful measured LCP gain is claimed. Mixed-face text retains the documented additional-download/shaping limitation.
- Operations copies match the accepted review artifacts. Research totals remain 398 observed phrases, 152 complete, 246 partial/pending and 164 observed questions. There are 149 unique eligibility rows and 144 directory-only dispositions. Missing or partial data are not treated as absent demand or zero demand.

## Pending acceptance, not source defects

1. **P2 — planned visual baseline gap**, tests/visual/site.spec.mjs:53–59. The new Mississippi and Alabama screenshot assertions need four reviewed Linux baselines (desktop/phone for each). playwright.visual.config.mjs:6 disables automatic snapshot updates. The primary agent confirms capture, inspection and baseline commit are planned next; this review does not require waiting for them.
2. **All seven exact-final-commit CI gates remain pending:** verify, standards, cross-browser, performance, dependencies, links and visual (.github/workflows/site-checks.yml:11). Local unit/browser evidence and this review do not replace them.
3. **Production preservation and release remain pending:** apply pending migration 0030 before 0031 through the established procedure; deployment, live checks and sitemap submission need actual receipts (deployment/migrations/0031_journey_ms_al.sql:1; operations/ms-al-expansion-20261024/README.md:29).

## Exact reviewed hashes

| File | SHA-256 |
|---|---|
| src/ms-al-geography.mjs | 07800ad749b9e470c0043a1f73e005c5a46df0cb4dca0ad225769da8474472e6 |
| src/location-service-data.json | d1661acdd24f7a5d57608797d8b1c4062fd431ba11afdab685d577899d4a9d22 |
| deployment/migrations/0031_journey_ms_al.sql | 06fc98d399ec810742244d6441e10452f9f613908ef203481c2385e5e966c73d |
| tests/fixtures/ms-al-preservation.json | 68d8e8624a62f388e152c95c1019f1f237b24d6138a4f49cac15634bdbbd69f6 |
| scripts/subset-newsreader-common.py | 632eb19aab1bfc00b8289c87ddd698ad4b3e5f2146ba21cfe90905322889eb7d |
| src/assets/premium/newsreader-regular-common.woff2 | 08057429a915eff5ea8db915928709d35a49a870f24599646f82a17904c6f5b9 |
| src/assets/premium.css | 91316fa59c3706911e15b3967721b59a1886ab7327468a06c129474c691251b5 |
| src/pages.mjs | d157271ff82a869e237828c28af981860beac237960739f0eaa7a97013345883 |

Full reviewed source and operations hashes, accepted canonical record hashes and geography input hashes are in review.json. verification.json records the independent checks; verify.mjs and verify-font.py reproduce them without modifying source or dist. No network, browser, build, server or deployment actions were performed.
