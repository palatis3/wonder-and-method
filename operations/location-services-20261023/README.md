# Reviewed location services — October 23, 2026

This batch adds 59 commercial website-design pages for 69 county and independent-city directory identities. Each page explains a locally grounded project decision, scope alternatives, current offer limits and prices, remote work with the Buffalo studio, ownership and the next inquiry step. Public examples are identified as research examples, not clients or endorsements.

| Area | Pages | Directory identities |
| --- | ---: | ---: |
| New York | 12 | 12 |
| Pennsylvania | 11 | 11 |
| New Jersey | 14 | 14 |
| Massachusetts | 5 | 5 |
| Delaware | 1 | 1 |
| Maryland | 7 | 8 |
| Virginia | 9 | 18 |
| Total | 59 | 69 |

The [reviewed route and evidence register](data/reviewed-locations.json) records every release candidate, its directory identities, project decision, scope trigger and public sources. The content is implemented in src/location-service-data.json; shared offer wording reads the current offer configuration.

## Coverage and compatibility

All 1,079 directory entries remain available across 20 states and Washington, DC. This is an incremental release, not completion of the broader individual market reassessment. An initial screen exists for every area; deeper research and further commercial-page decisions remain underway. Unavailable keyword data is not treated as zero demand, and a county does not need a unique industry to justify a useful page.

The batch restores 49 historical page paths, adds ten new paths, and leaves 283 explicit redirects. Baltimore City and Baltimore County retain distinct directory entries and share one commercial destination. Fairfax County, Fairfax City and Falls Church City likewise retain their three identities. Hampton Roads covers eight selected independent cities, explicitly not an exhaustive definition of the region.

The 332-path historical route fixture remains fixed. Saved New York prefixed aliases, query strings, useful section anchors and all 333 county worksheets remain supported. The build updates the destination link in 51 worksheets (49 restored pages plus both Baltimore entries) while preserving their planning content. Inquiry provenance retains its existing fixed 333 options; general commercial inquiry links do not infer a customer's business location.

Migration 0022_journey_location_services.sql adds only ten fixed analytics page dimensions, increasing the allowlist from 429 to 439. The 49 restored pages reuse historical keys. Existing keys, aggregate records, inquiry records, delivery resolutions, event/service/source allowlists, defaults, total bounds and primary-key constraints are preserved.

## Review and validation before deployment

The independent content reviews are retained under [reviews](reviews/): New York, Pennsylvania/New Jersey, Mid-Atlantic and Virginia. Some original reviews record required corrections; later reviews and the technical closure document their resolution. The final [technical review](reviews/technical.md) has no unresolved findings.

- Full local unit suite: 688 passed, no failures or skips.
- Production build and static verification: 183 public HTML routes and 182 sitemap entries.
- Browser resource, landmark and overflow checks: all 183 routes at 360px and 1440px; all eight batches passed.
- Focused directory, legacy bookmark and no-JavaScript checks: 16 initially passed; the sole bookmark-test expectation was corrected for browser fragment inheritance and passed on rerun. Twelve intentional project skips were retained.
- Manual browser inspection: Fairfax desktop and phone layouts, package comparison, and the new-website question CTA were checked; no inquiry was submitted.
- Migration tests: all 429 prior keys remain accepted, all ten new keys work, old records and constraints are preserved, and invalid dimensions remain rejected.

The content-preservation contract counts 195 HTML files because it also includes twelve existing sample-handoff HTML files. The site's public route count is 183. All 430 downloadable artifacts remain present; no artifact was removed by this batch.

Exact-commit CI, reviewed Linux visual candidates, production migration/deployment and live verification are recorded separately in the release receipt after they occur. This document does not claim publication, indexing, rankings, actual email delivery or full business readiness.

## Linux visual review

Capture run [39898844898](https://github.com/palatis3/wonder-and-method/actions/runs/39898844898) used source commit 3e068fe3b068c6ea33145ace4c6d106e672fe108. Eight changed Linux screenshots reviewed against prior references. The desktop and phone Monroe entries add the reviewed commercial-service link while preserving place lists and worksheets. Six other references catch up to already-published Florida coverage (19 to 20 states and Florida in lists); their page HTML did not change in this batch. Full Monroe entries, both About images and bounded old/new regions for every other changed area were inspected. No clipping or broken layout observed. The other 26 references remain byte-for-byte unchanged. The capture job does not satisfy the production CI gate; normal checks must pass on the commit containing these reviewed references.
