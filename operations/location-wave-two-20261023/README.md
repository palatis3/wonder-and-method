# 144 individually reviewed location pages — October 23, 2026

This release candidate adds 144 researched commercial website-design pages after the [48-page publication](../location-wave-one-20261023/RELEASE.md). Every page develops a specific buyer decision through original analysis, two possible scopes, owner inputs, a four-column planning table and acceptance examples. Shared industries and principles are allowed when the complete page remains useful to someone visiting it directly. The common presentation identifies Wonder and Method as a Buffalo studio working remotely and the named organizations as public research examples.

The [page and source register](data/reviewed-locations.json) contains all additions. Complete content review is recorded in four groups of 36: [New York and Michigan/Indiana](reviews/remaining36-ny-mi.md), [Kentucky/Tennessee and Virginia](reviews/remaining36-ky-va.md), [Florida and North Carolina](reviews/remaining36-fl-nc.md), and [Ohio and New England](reviews/remaining36-oh-newengland.md). All specified copy corrections are applied. Every authored field matches the approved frozen inputs; no unresolved research followup remains in this batch.

## Preserved content and routing

The 121 earlier collection records are unchanged. The candidate collection has 265 pages serving 275 directory identities; including Buffalo/Erie, that is 266 direct service pages serving 276 identities. The build has 389 public HTML routes and 388 sitemap URLs. All 59 guides, 1,079 directory entries, 333 historical county worksheets and 430 downloads remain available.

Fifty-four historical paths are restored. The independent 332-route fixture remains unchanged, with 121 reviewed commercial destinations and 211 explicit redirects. The 54 associated worksheet edits replace only their destination URL, retaining all existing planning text. New York aliases and query/hash preservation retain regression coverage. General inquiry links do not infer the visitor's location; the fixed 333-option inquiry provenance allowlist is unchanged.

Migration 0026 adds 90 fixed analytics page keys, extending 483 to 573; 54 restored keys already existed. The migration retains all earlier keys, event/service/source constraints, defaults, aggregate bounds and conflict keys. Its database test seeds all 483 historical keys, inquiries and delivery-resolution records, verifies preservation and integrity, rejects invalid dimensions/totals, checks defaults/uniqueness and exercises the actual Worker handler for all 573 supported keys.

## Local validation

- All 692 unit tests pass. The initial run found one synthetic server fixture still assuming Chenango was retired. The fixture now supplies a destination for a currently retired route, while continuing to check every retired GET/HEAD redirect and a restored canonical page. It also retains unsupported-method checks.
- Production build and static verification pass for all 389 routes, internal links, metadata, privacy exclusions and payload requirements.
- Forty-eight focused browser checks pass across all 144 new pages on desktop and phone, covering native headers, row labels, corresponding phone labels, source dates, general-inquiry parameters and automated accessibility. All 144 also pass the 320px overflow check. Twenty-four reduced-motion project skips are intentional for static tables; reduced-motion behavior has separate coverage.
- All 144 desktop tables, the tallest phone table from each of 14 represented states, and the longest social-card title were visually inspected. All 288 desktop/phone screenshots and their hashes are retained privately. No renderer or stylesheet change was needed.
- The preservation inventory contains 401 HTML files including twelve existing sample-handoff files and all 430 downloads. Exactly 359 intended changes were verified: 144 added pages, 14 state hubs, 54 worksheet destination links, 144 social cards, sitemap, text index and asset-hash manifest. The other 243 earlier HTML records are unchanged. Only the new pages and affected hubs receive changed content-date records.

The fixed release fixtures remain independent of production content. Earlier migration tests retain their historical counts and subset preservation; the newest migration owns equality against the full runtime key set. No routing implementation, Worker handler, renderer or stylesheet is changed.

The independent [implementation review](reviews/implementation.md) has no actionable findings. Publication is pending full checks on the committed source, database backup and preservation, deployment, live verification and sitemap submission. The individual county work continues. Google discovery, indexing and rankings are distinct; no search outcome is promised. Existing business enrollment, reply coverage and recovery requirements remain separate.
