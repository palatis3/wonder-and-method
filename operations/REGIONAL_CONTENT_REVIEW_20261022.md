# Regional content and customer-information review — October 22, 2026

The user requested a stricter review of the entire site against Google's people-first content and spam guidance, useful additions for customers, eight additional service jurisdictions, and a regression fix for the header disappearing when a desktop window is resized.

## Reviewed decisions

- Reviewed all 415 previously published main routes, including 333 area pages, 12 state pages, 27 guides, eight service routes and 35 other routes. No identical complete main-content documents were found. Repeated catalogue terms alone were not treated as a reason to remove a page.
- Consolidated all 332 standard county, planning-region and independent-city articles into their corresponding state-directory entries. Their shared commercial offer and largely portable fictional exercises did not establish separate local customer tasks. Preserved the actual local distinctions, typed place lists, source records, parent-place relationships, status qualifications and existing worksheet downloads.
- Retained the custom Buffalo/Erie page for the studio's actual home area. Retained the 27 distinct guides, service pages, package-specific requests, working demonstrations and other useful routes.
- Added eight directory hubs: Virginia, West Virginia, Michigan, Washington, DC, Indiana, Kentucky, Tennessee and North Carolina. Their 679 areas receive searchable entries rather than separate generic commercial articles.
- The final structure has 91 public HTML routes, including the error page, and 90 sitemap URLs. Twenty state/district hubs organize 1,012 counties and equivalents. All navigation works through ordinary links and native disclosures; search runs locally in the browser.

This is an editorial and usability decision. A directory format, a lower page count, source attribution or passing technical tests does not guarantee Google policy compliance, indexing, rankings or immunity from future actions. Separate local pages can be added when supported by substantial distinct customer value; no county-page quota is used.

## Content improvements

The review retained concrete distinctions such as town/village overlaps in Monroe County, Connecticut's current planning regions, DuBois/Sandy consolidation, independent Baltimore City, Virginia's independent cities, Michigan's township types, DC wards versus neighborhoods, and documented municipal-status changes. Geography records distinguish unresolved subtype/status questions instead of asserting unsupported certainty.

The service-page follow-up found two useful gaps. The web-design page now explains first-message inputs and that finished customer-written copy is unnecessary. The audit page explains what the existing Baseline fee covers when no safe small fix fits. Both additions follow the existing offer catalogue; prices and obligations are unchanged.

Other corrections clarify that noindex is not access control, preserve authored download-link wording, carry eligible-business/authorized-access conditions beside Business Profile work, and identify a blank reporting template accurately. Concept previews explain the relevant example instead of repeating one generic introduction. General worksheets explicitly label their fictional examples and link to the current location entry.

## Redirects and historical compatibility

`deployment/retired-county-routes.mjs` records all 332 permanent mappings. GET and HEAD requests redirect directly to the appropriate state page and county fragment. Existing queries, normalized URL forms and New York aliases are covered. Hub canonicals use the page URL without a fragment, and retired pages are absent from the sitemap and active route inventory.

The original 333 inquiry context values and worksheet filenames remain compatible. All 428 fixed historical analytics page keys remain accepted, including retired pages. Migration 0020 adds the eight new hubs without deleting old aggregates or inquiry records. The operator's historical county grouping includes retired routes.

## Header and navigation regression

A desktop reproduction at 1200×500 changed the home header to `position:absolute`, placing its top at −887px while scrolled. Existing short-screen rules had applied to desktop windows as well as touch screens. Those position changes are now limited to touch devices; desktop menus have a viewport-bounded scrolling list. The existing phone and keyboard behavior remains covered separately.

`tests/browser/header-resize.spec.mjs` tests six page types through nine actual width/height transitions while scrolled, checks viewport position and hit-test reachability, and exercises every desktop service-menu link plus transitions across the compact-menu breakpoint. It is automatically included in the GitHub `Website checks` workflow through `technical:check`.

Directory keyboard testing also exposed focus being lost after a native fragment action. Same-page directory navigation now updates history and opens/focuses the destination disclosure in one operation; normal links and browser history remain available.

## Verification and release gates

Before the release gate, the complete unit suite passed 683 tests. Targeted directory browser checks passed 72 cases with 89 intentional project skips. Seven desktop header-resize tests passed. All 332 redirects were exercised through the Worker and native server; historical analytics events were persisted in a migrated synthetic database. The built artifact audit found no metadata, canonical, schema, indexing or date issues. Main routes, local references and the existing initial-payload budget passed.

Visual inspection included the actual home capture and continuous views of eight representative expanded entries on a 390px viewport, with no horizontal overflow. The visual comparison set now includes the regional directory, DC directory and an expanded New York entry alongside the existing page set. Final source-bound technical checks, reviewed Linux screenshots, exact-commit CI, predeploy checks, a verified database backup, migration and live verification remain required; this document does not bypass them or certify they have run.

The October 22 Search Console inspection found no reported manual actions or security issues. The available indexing report was dated October 15 and predates the latest public-indexing changes; its counts cannot establish coverage of this release. The short performance history is a baseline, not evidence that consolidation has improved rankings.

## Official guidance consulted

- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Spam policies: doorway abuse and scaled content abuse](https://developers.google.com/search/docs/essentials/spam-policies)
- [Guidance on using generative AI content](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content)
- [URL changes, permanent redirects and monitoring](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
- [Canonical URL consolidation](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)

Accessed October 22, 2026. The latest listed completed spam rollout was September 24–October 8, 2026; the latest listed completed core rollout was May 21–June 2, 2026. Helpful-content evaluation is part of Google's core ranking systems, rather than a separate present-day "helpful content update" release gate.
