# New York county coverage — October 20, 2026

The website now has 25 county service areas. Fifteen guides add Brooklyn/Kings, Queens, Manhattan/New York, Suffolk, Bronx, Nassau, Westchester, Staten Island/Richmond, Broome, Ulster, Schenectady, Rensselaer, Chautauqua, Oswego and Ontario to the existing ten. Each new guide includes its own planning examples, SEO approach, questions, government geography references and downloadable planning exercise. Examples are explicitly illustrative. Delivery remains online from Buffalo.

The service-area hub groups all counties into eight regions. Every service page and the Erie County page links to the complete directory. Related counties link within their region. Structured service coverage includes all 25 counties without creating additional office addresses.

All 82 published public pages are eligible for indexing, including the public offer inquiry forms, demonstrations, terms, privacy and accessibility pages. The 404 page, protected APIs, runtime metadata and operational downloads retain exclusion headers. This change does not expose inquiry records. The generated sitemap and page metadata use the same policy as the production Worker. Search-engine inclusion and rankings remain the search engines' decisions.

## Research and geography

The connected Semrush US database returned 44 rows for a batch of 75 county, city and borough phrases on October 20. The request consumed 440 standard API units. The research informed place-name wording and content priorities; the pages do not publish these estimates as local traffic or client results. A missing result was treated as unavailable data, not zero demand. The raw response remains in the private release evidence.

A subsequent question-research pass used `phrase_questions` for Brooklyn web design, web design, website redesign and local SEO. It returned 61 question rows. Relevant buyer themes include choosing a designer, redesign cost and timing, preserving useful SEO content, responsive design, local SEO work and pricing, and verifying handed-over files. Career and unrelated technical queries were not used. The reports record 7,360 additional API units; their raw responses remain private.

Each new county guide now has six visible, expandable FAQs: three answers informed by those research themes, two locally specific planning questions and the existing online-working explanation. Answers link to relevant pricing, service guides or handoff evidence. Prices come from the current offer configuration. The original Semrush queries and their US estimates are recorded separately from adapted local question wording; general US search volume is not presented as county demand. No FAQ rich-result or ranking outcome is claimed.

Municipalities were checked against New York State county directories. All ten new non-NYC village lists were also compared with the state's [current village register](https://www.tax.ny.gov/research/property/2027-villages-tbgf.htm). Nassau's omitted Stewart Manor was restored. Chautauqua's list was corrected using county records and [state dissolution records](https://dos.ny.gov/dissolve-village): 2 cities, 27 towns and 13 villages, with Celoron spelled correctly and dissolved Cherry Creek and Forestville excluded as villages.

NYC borough guides use selected neighborhoods from the city's community-board directories, with no separate city, town or village entries. Each guide links its exact geography sources.

## Release and recovery

Migration `0011_journey_county_expansion.sql` adds only the fifteen emitted county page keys to aggregate journey counts. It preserves the columns, other fixed dimensions, conflict key, total bounds and default source. It does not alter inquiry or delivery-resolution tables. The previous Worker remains compatible with the expanded schema.

Before production migration, export D1 privately and record the current authenticated Worker version. Apply the migration with the pinned production configuration, then export and compare existing inquiry rows and aggregate dimensions. Live traffic can increase aggregate totals between snapshots. Publish only the clean, pushed commit after the exact-source technical check, CI and predeploy checks pass.

The private `county-expansion-20261020` release folder holds research, regression results, responsive captures, independent review, database-preservation verification and the final live release record. Local checks are candidate evidence; the final record identifies the deployed version and actual Google Search Console submission result. No QA request should create a production inquiry or send email.
