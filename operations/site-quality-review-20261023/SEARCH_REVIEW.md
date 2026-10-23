# Technical search audit — October 23, 2026

**Result: PASS within the audited scope. No actionable defects or metadata corrections found.**

Audited frozen HEAD `b711713f376d3f180d7d330fbbe20f5c27309d2b`, matching `dist/version.json` (1,192 routes; clean source build). This was an independent technical review of the shared source and representative frozen HTML. It retains the complete content/redirect/fragment audit in `operations/google-quality-audit-20261023/`; it does not repeat that corpus review or certify Google compliance, indexing, rich results, or rankings.

## Evidence and checks

`node evidence/site-quality-xhigh-20261023/search/check.mjs` completed with zero findings. The deterministic output in `deterministic-checks.json` records all 29 sampled routes, extracted metadata, typed search results, representative redirect expectations, and SHA256 hashes for the inputs and sampled HTML/images.

| Area | Verified result | Exact source / rendered evidence |
| --- | --- | --- |
| Canonical and social URL consistency | Each sampled eligible page has exactly one self canonical at the production origin, matching `og:url`; the 404 page has neither. Title and description match their Open Graph/Twitter values. | `src/pages.mjs:99`, `src/pages.mjs:118`; sampled `dist/**/index.html:1`, including `dist/areas/maryland/baltimore-area/index.html:1`. |
| Sitemap and route inventory | All 1,192 frozen HTML routes exactly match the page-date route set. The sitemap contains the expected 1,191 eligible routes, with no duplicates, query strings, fragments, foreign origins, retired Baltimore paths, or South Carolina paths. Every sitemap `lastmod` matches its ledger value. | `src/seo.mjs:17`, `src/seo.mjs:21`; `dist/sitemap.xml:1`; `config/page-dates.json`. |
| Index policy | Public pages, including contact, checkout, and fictional request examples, remain eligible as explicitly intended. API paths, operational downloads, buyer packs, runtime metadata, and 404 stay excluded. Public editorial/social image paths have an explicit eligibility exception. The frozen robots file allows public crawling and gives the production sitemap. | `src/index-policy.mjs:1`, `src/index-policy.mjs:4`, `src/index-policy.mjs:8`; `src/seo.mjs:16`; `deployment/worker.mjs:552`; `dist/robots.txt:1`. |
| Original URLs and redirects | The immutable 332-route historical fixture still resolves: 330 routes remain pages, and both Baltimore originals redirect directly to `/areas/maryland/baltimore-area/`. Fourteen representative GET/HEAD cases preserve raw query encoding and finish at a canonical URL without another redirect. New York aliases, mixed case, repeated slashes, `.html`/`index.html`, and the prior work URL are included. Mutations remain outside redirect handling. | `tests/fixtures/historic-county-routes.json:1`; `deployment/retired-county-routes.mjs:3`; `deployment/public-route-canonical.mjs:14`; `deployment/worker.mjs:471`. |
| Structured data | Sampled service area nodes distinguish New York/Pennsylvania/Ohio Erie counties, Richmond City, the Capitol Planning Region, both Baltimore jurisdictions, and Washington, DC. General services use the current 20-state plus federal-district coverage. Organization identity is Buffalo-based; the shared schema does not invent local office addresses for these service pages. Article description/main entity and breadcrumb destinations agree with each sampled page. | `src/schema.mjs:13`, `src/schema.mjs:15`; `src/pages.mjs:104`, `src/pages.mjs:110`, `src/pages.mjs:112`, `src/pages.mjs:113`, `src/pages.mjs:117`; sample extracted nodes in `deterministic-checks.json`. |
| Social assets | Every sampled referenced Open Graph PNG exists at the production-relative path; its actual PNG dimensions match declared width/height. Twitter and Open Graph use the same image. | `src/social-cards.mjs:3`; `src/pages.mjs:103`, `src/pages.mjs:118`; image paths and hashes in `deterministic-checks.json`. |
| Content dates | All 1,192 ledger dates are real calendar dates no later than October 23. Each of the 29 sampled HTML editorial hashes matches the ledger. Five sampled articles have coherent publication/update ordering and matching visible, JSON-LD, ledger, and sitemap update dates. For example, the service-area article visibly and structurally reports publication October 16 and update October 23. The date recorder preserves unchanged content dates and requires verified history or explicit review for hash migration. | `scripts/page-dates.mjs:39`, `scripts/page-dates.mjs:51`, `scripts/page-dates.mjs:73`; `src/schema.mjs:3`; `src/journal.mjs:186`; `dist/guides/service-area-pages/index.html:1`. |
| Directory search and crawlable destinations | The frozen all-area directory contains 1,079 ordinary HTML entry links; search filters this existing inventory locally. Twelve probes passed, including Erie state disambiguation, Richmond city/county, Baltimore City, a Connecticut planning region, Hempstead town, DC Ward 3, Miami-Dade, Deferiet, and no matches for unsupported ZIP/South Carolina input. Search does not create separate query-result URLs. Existing fragment navigation clears filtering and reveals the target. | `src/service-area-directory.mjs:34`, `src/service-area-directory.mjs:115`, `src/service-area-directory.mjs:128`; `src/assets/county-directory.js:41`, `src/assets/county-directory.js:59`, `src/assets/county-directory.js:130`; `dist/areas/index.html:1`. |

The additional bounded test command `node --test tests/newpublic-route-canonical.test.mjs` passed **3/3**, including actual Worker 308 behavior, query preservation, canonical asset routing, and staging authentication before redirects. The previously audited 4,412 route/method cases and 2,995 fragment targets were not rerun.

## South Carolina boundary

South Carolina is **not integrated** into this source/build. The private integration README and generator correctly leave page-date registration, new social cards, final build verification, and preservation gates pending. `evidence/south-carolina-expansion-20261023/integration/README.md:55` records that route dates drive canonical and journey allowlists; `prepare.mjs:93` lists these remaining steps. This pass must not be reused as verification of subsequently generated SC HTML. No new SC content or geography judgment is made here.

## Primary guidance used

The canonical/sitemap review checks for consistent signals; Google still chooses its canonical. [Google canonicalization guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).

The sitemap review checks canonical absolute URLs and modification dates reflecting content changes, without adding arbitrary metadata length requirements. [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

Visible and structured article dates should agree and describe publication or significant update dates; no future date was found. [Google byline-date guidance](https://developers.google.com/search/docs/appearance/publication-dates).

## Limitations and required fixes

No fixes required from this audit. This is local source/frozen-HTML evidence, not a live HTTP deployment check, Search Console inspection, or a fresh review of every page's prose and external source. No Semrush API/browser, Search Console action, rebuild, baseline acceptance, public mutation, or production source edit occurred.

Key input hashes:

- `config/page-dates.json`: `b9621829f94e75777358786db1845a45d0b294ffa2dbc066cfcc92124c188216`
- `src/pages.mjs`: `305f872503006e68636a50e8e09f15019d73eb7e2872853768eabb9b1c920194`
- `deployment/public-route-canonical.mjs`: `b4d4a7db0b69e2811f3b9aca0e449305503e132225c7070473964b97d98d0c74`
- `src/assets/county-directory.js`: `e899035b1489bb54f94d0d0ae1ec30c69a1b6d1125cb9e829a5691305fc05093`
- `dist/sitemap.xml`: `d3f075abf699c7f693685bc1b1914e8295634ce2073eb5ee60ac29a9cf829ee1`
