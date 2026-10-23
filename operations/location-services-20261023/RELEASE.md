# Location-service publication — October 23, 2026

The site now includes 59 new commercial location pages for 69 county and independent-city directory identities across New York, Pennsylvania, New Jersey, Massachusetts, Delaware, Maryland and Virginia. The [page and source register](data/reviewed-locations.json) records every destination and its evidence. The existing Buffalo/Erie service page, 59 buyer guides and all 1,079 directory entries remain available.

These pages explain a locally grounded project decision, scope alternatives, project-specific planning questions, current offer prices and limits, and the next inquiry step. They identify Wonder and Method as a remote Buffalo studio and public business examples as research examples. A county need not have a unique industry; a page must help a buyer beyond the existing hub, services and guides. This is an incremental release: deeper individual research and further page decisions remain underway.

Forty-nine historical paths now serve the reviewed commercial pages, ten paths are new, and 283 remain explicit redirects. Baltimore City and Baltimore County share one destination while retaining separate directory identities. Fairfax County, Fairfax City and Falls Church City retain their three identities. Hampton Roads covers eight selected independent cities and does not claim to define the entire region. Saved aliases, useful section anchors and all 333 county worksheets remain supported; 51 worksheets received updated destination links without losing planning content.

## Verified release

| Item | Result |
|---|---|
| Published source | `2ea97b3ba0c85c55931895516cbf93f98922ebb9` |
| Authenticated Worker runtime | `ae5761a9-3a7d-4afc-9b9c-6e5c1865c1a8` |
| Exact-commit technical checks | 688 unit tests and 279 browser checks passed; 162 intentional project skips; source verifier, content inventory and Worker dry run passed |
| GitHub checks | Verify and visual passed for the exact source commit: [run 39899539638](https://github.com/palatis3/wonder-and-method/actions/runs/39899539638) |
| Publication gate | Clean pushed source, authentic CI source/artifact fingerprints and production secret inventory passed |
| Live parity | All 183 HTML routes and 1,115 asset hashes match the tested build; sitemap has 182 URLs; canonical, robots, private exclusions and CSS hints passed |
| Historical URLs | All 1,576 variants passed for 332 historical county paths and 62 New York aliases; 49 canonical paths are restored, 283 remain redirects, and destination anchors resolve |
| Database | Migration 0022 added ten fixed page keys; all 429 old keys remain; all 451 prior aggregate rows and 4 prior inquiries were preserved; restored integrity and foreign-key checks passed |
| Operational health | Authenticated health was healthy after publication. Latest observed scheduled success was 2026-10-23T04:17:31.008Z; a new scheduled run after this deployment has not been observed. No new external receiver receipt is claimed |
| Google | Google accepted the updated sitemap and reports Success with 182 discovered pages; discovery does not establish indexing or rankings |

The final technical manifest came from the successful exact-commit GitHub run. Both its source and artifact SHA-256 values matched the clean local build before deployment. The [review record](README.md) documents independent content and technical review, the corrected legacy-fragment test expectation, all-route desktop/phone checks and the reviewed Linux visual references. No unresolved technical or content-review findings remain for this batch. The final [publication-record review](reviews/publication-record.md) also has no unresolved findings.

All 430 downloadable artifacts remain present. The content-preservation inventory counts 195 HTML files because it includes twelve existing sample-handoff files; the public site has 183 HTML routes. The 49 restored pages reuse historical analytics keys. Migration 0022 expands the fixed allowlist from 429 to 439, retaining constraints and compatibility with the prior Worker. Inquiry provenance retains its existing 333 fixed options; general commercial inquiry links do not infer the customer's business location.

No real inquiry, email, chat message or payment was submitted during release verification. Live operator health does not prove inbox receipt, independent recovery or sustained reply coverage. Existing business enrollment and recovery requirements remain in force.

Private evidence is retained in `evidence/location-services-20261023/`, including the exact-commit CI result and authentic manifest, artifact comparison, full live checks, historical URL matrix, database exports and preservation results, operator status and Google receipt. Later documentation commits are separate from the deployed application identity. Previous release reports retain their dated scope.
