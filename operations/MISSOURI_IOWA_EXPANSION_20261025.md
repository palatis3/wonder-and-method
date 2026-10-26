# Missouri and Iowa expansion — October 25, 2026

The expansion adds two state directories and 166 separately researched service pages: 85 in Missouri and 81 in Iowa. All 214 counties and county equivalents have directory entries. The remaining 48 entries retain their directory destinations. Six focused FAQ pairs are added; the research did not justify a new general guide.

The site now has 1,644 application routes, 1,632 sitemap URLs, 1,506 commercial service records and 2,214 directory identities across 31 states and Washington, DC. All 1,340 earlier service records and earlier FAQs are preserved. The existing 436 downloads remain, with the coverage and page inventory in `llms.txt` expanded.

## Research and geography

Each accepted brief connects a documented local operation to a website decision, practical scope, owner inputs and acceptance check. Named organizations are public planning examples, not studio clients or endorsements. The studio remains based in Buffalo and works online. County membership uses independent geographic evidence; a postal city alone is insufficient.

All six research batches passed independent review, followed by a complete cross-batch review of the 166 briefs and six FAQs. No unresolved holds were published. Sources, captures, revisions and review bindings are retained privately under `evidence/mo-ia-expansion-20261025/`. The public decision inventory is `operations/mo-ia-expansion-20261025/county-decisions.json`.

The geography retains 114 Missouri counties plus independent St. Louis City, and all 99 Iowa counties. Census place identities, county memberships, classifications and population exceptions were independently reconstructed. St. Louis City and St. Louis County remain separate. Iowa's Saylorville Reservoir is identified as a statistical unorganized territory, not a township government. Cross-county places remain in every relevant county. Missing population values remain missing, and reported zeros remain zero.

The expanded combined directory initially exceeded its existing search-data budget. Lossless column encoding brought the complete directory from 464,676 to 445,342 raw bytes and from 199,579 to 185,073 gzip bytes. All 2,214 cards and 40,087 ordered search terms round-trip exactly. Existing payload decoding, typed searches, ranking, visible markup and browsing without JavaScript remain supported.

## Keywords and FAQs

The US keyword research captured 1,700 unique bulk queries: 428 county phrases, 1,252 city/place phrases and 20 state, alias and question phrases. The place queries cover 626 unique names mapped to 636 independently verified county/place memberships.

All county phrases had unavailable metrics. City phrases included 36 positive volumes and 37 reported zeros; the other 1,179 lacked metrics. The additional phrases included 11 positive volumes, one zero and eight unavailable rows. Displayed and partial metrics are recorded separately. These are US phrase estimates, not county-resident demand; shared place volumes are not summed across counties. The generic meaning of “agency” also limits interpretation of Agency, Missouri queries.

The Missouri and Iowa state question panels both reported no data. The six FAQs instead address supported residual questions that the corresponding main bodies do not answer: museum access with a hall rental, preserving old archive links, changed meeting points for existing bookings, offline trip preparation, payment-statement descriptions and correcting third-party directions. Missing keyword metrics did not automatically exclude a useful local brief or justify an extra FAQ.

## Migration and verification

Migration `0039_mo_ia_journey_pages.sql` adds 168 daily analytics keys: two state directories and 166 county pages. It retains all 1,448 earlier keys for 1,616 total. The prior 38 migrations are unchanged. Synthetic tests verify preserved records and schemas, constraints, daily/monthly atomic writes, saturation and retention boundaries. Monthly history is not backfilled; the preceding Worker remains compatible with the additive schema.

The local build and all 913 unit tests passed. Browser checks cover every new county brief on desktop, phone and reduced-motion phone, including tables, source disclosures and inquiry context. The directory checks also exercise the combined search encoding and native browsing. Citation checks found 245 reachable sources, no confirmed missing destinations and four access-denied destinations requiring the retained source evidence; HTTP reachability alone does not establish factual support.

All 183 final contextual guide links passed semantic review. Clay's link now supports comparing rental and marina arrangements; Worth retains the content-preparation guide. Three existing Florida connections were re-reviewed after the coverage count changed in their linked guide. The final local quality check reports no findings, and the accepted content snapshot preserves all earlier material after the documented coverage additions.

Published and verified.

Published source `8cd5d0aa1bbd5a40270519156f529bb51de51b8d`; authenticated Worker `e0c778d5-68bc-4d23-8fd3-66d24c0ad524`; deployed 2026-10-26T00:18:11.786Z.

All 1,644 live HTML routes and 2,311 public asset hashes match the tested build, with 1,632 eligible sitemap URLs. All 15 jobs in the [exact-source CI run](https://github.com/palatis3/wonder-and-method/actions/runs/40246808116) passed: nine named release gates, a shared core build and five browser partitions. The complete browser inventory passed 918 checks with 523 reviewed platform-specific skips. Reading checks passed 36 cases; visual checks passed 64 tests covering 72 images; Firefox/WebKit passed 72 checks with 20 intentional skips. All 3,965 generated files match between local and Linux builds. Six live desktop, phone and 320-pixel journeys passed.

The SEO audit checked all 1,644 routes with 0 errors and 21 current editorial decisions. Outbound verification reports 2,959 reachable links, 0 confirmed broken and 113 unverified. Blocked or unavailable destinations remain unverified. Coverage includes 2,214 directory identities across 31 states plus DC, 1,506 commercial location records, 65 guides and 436 downloads. Routine QA sent no real inquiry, chat message, email or payment.

A fresh private production export passed local restore, integrity, foreign-key checks and an offline migration rehearsal. Migration `0039_mo_ia_journey_pages.sql` preserved existing records and schemas while extending the daily analytics page keys from 1,448 to 1,616. All 38 prior migrations remain unchanged. The preceding Worker remains compatible with the additive schema; a code rollback must not restore an old database over newer inquiries.

Authenticated health is healthy. A genuine scheduled recovery succeeded at 2026-10-26T01:17:29.907Z, with an external HTTPS receipt at 2026-10-26T01:17:31.652303+00:00. Email alerts remain enabled to support@wonderandmethod.com with a one-hour period and fifteen-minute grace. No manual heartbeat was sent.

Search Console confirmed the sitemap submission at 2026-10-26T00:19:14Z. Its latest observed status is Success with 1,632 discovered pages. The verified live sitemap contains 1,632 eligible URLs; discovery counts can lag and do not establish indexing or rankings.

No indexing or ranking outcome is claimed.
