# Nine-state service-area expansion — October 22, 2026

This revision adds New Jersey, Connecticut, Rhode Island, Massachusetts, Delaware, Vermont, New Hampshire, Maine and Maryland to the existing New York, Pennsylvania and Ohio coverage. The studio remains based in Buffalo and delivers work online. Service coverage is not an office-location claim.

| Added state | Guides |
| --- | ---: |
| New Jersey | 21 counties |
| Connecticut | 9 planning regions |
| Rhode Island | 5 counties |
| Massachusetts | 14 counties |
| Delaware | 3 counties |
| Vermont | 14 counties |
| New Hampshire | 10 counties |
| Maine | 16 counties |
| Maryland | 23 counties and Baltimore City |

There are 116 added area guides and nine added state hubs. The complete candidate contains 411 HTML routes, 410 sitemap entries and 333 county/equivalent guides across twelve states. Existing New York URLs and all other pre-expansion routes are preserved. Connecticut uses planning-region URLs. Baltimore City has its own `/areas/maryland/baltimore-city/` route, separate from Baltimore County.

## Geography and content

Official state and Census sources support the county and municipality inventories, place types, aliases and cross-boundary entries. The directory preserves cities, towns, villages, boroughs, townships, Maine plantations and separately labelled nonmunicipal communities. Current and historical aliases remain searchable where documented. Private source notes retain reconciliation details; page disclosures link to official sources.

Each added guide contains a planning problem, two explicitly fictional examples, a matching downloadable worksheet and six visible questions. Three buyer questions per guide are editorial adaptations tied to retained Semrush source phrases; the other questions explain local planning and online collaboration. No rewritten question inherits the source phrase's search volume. Offer prices continue to come from `config/offers.json`.

Semantic review compares the decisions and worksheet outputs with existing guides. Revisions address repeated tasks; lexical overlap scores are only a review aid. The site does not create municipality-by-service page grids, invent local clients or offices, or guarantee search results.

## Integration

The finder supports all twelve states, typed places, cross-county matches, accent and apostrophe normalization, aliases and ordinary HTML browsing without JavaScript. A compact local dictionary preserves every search term within the existing directory-size budget; search remains in the browser. Service links, footer coverage, breadcrumbs, structured data, inquiry provenance, worksheets and social cards use the expanded inventory.

Migration `0018_journey_northeast.sql` adds exactly 125 fixed page categories to anonymous aggregate counts, bringing the existing allowlist from 291 to 416 categories. It preserves all prior dimensions, defaults, constraints, totals and conflict keys. Inquiry records and delivery state are not changed. Synthetic SQLite tests cover row preservation, legacy upserts, rejected values and all added Worker categories. A private production export and a compatible previous Worker must be recorded before applying the migration.

## Verification and publication evidence

The release requires the research/editorial audit, technical regression checks and a final independent Astra review. Browser coverage includes all 125 new routes at phone, tablet and desktop widths, expanded content, typed finder interactions, downloads, inquiry provenance and native browsing. Representative rendered views and previous flagged layouts are inspected separately from automated checks.

Private evidence is retained outside public assets and Git in the dated `northeast-expansion-20261022` and `northern-expansion-20261022` folders. The latter research folder contains the combined keyword-to-page map, raw report index, FAQ provenance, usage qualifications and query exclusions. The former retains the original baseline and source reconciliations. Response usage metadata is not a verified billing total.

Publication is established by the clean pushed commit, exact technical manifest, CI result, predeploy gate, authenticated runtime version and live route/asset parity record. This document alone does not establish that publication occurred. Search Console submission is recorded after live verification and is not proof of indexing, rankings or traffic.
