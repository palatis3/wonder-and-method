# Six further location services — publication October 23, 2026

Six reviewed commercial website-design pages are now live: Macomb and Oakland counties in Michigan; Indianapolis/Marion County, Indiana; Lexington/Fayette County, Kentucky; Nashville/Davidson County and Franklin/Williamson County, Tennessee. The [page and source register](data/reviewed-locations.json) records their evidence. Together with the [earlier 59-page release](../location-services-20261023/RELEASE.md), the collection has 65 pages serving 75 directory identities. The existing Buffalo/Erie service page remains separate and available.

Each page helps a buyer compare two possible website scopes, prepare owner inputs and check an illustrative acceptance case. Its planning table develops a specific service decision. The pages identify Wonder and Method as a Buffalo studio working remotely and public businesses as research examples. The [review record](README.md), [content review](reviews/content.md) and [implementation review](reviews/implementation.md) have no unresolved findings. The one required Lexington scope-label correction and the final desktop table-width adjustment are implemented and checked.

## Verified release

| Item | Result |
|---|---|
| Published source | `e2733670d2d21344e1017064b92cb9018a8f7a9f` |
| Authenticated Worker runtime | `926b95bb-59d2-4593-9c88-21b6cc234df3` |
| Exact-source technical checks | 689 unit tests and 281 browser checks passed; 163 intentional project skips; source verifier, content inventory and Worker dry run passed |
| GitHub checks | Verify and visual passed for the exact source commit: [run 39903920233](https://github.com/palatis3/wonder-and-method/actions/runs/39903920233); all 34 existing screenshot references passed unchanged |
| Publication gate | Clean pushed source, authentic CI source/artifact fingerprints and production secret inventory passed |
| Live parity | All 189 HTML routes and 1,121 asset hashes match the tested build; sitemap has 188 URLs; canonical, robots, private exclusions and CSS hints passed |
| New routes | All 30 canonical GET/HEAD, normalized-URL and state-hub link checks passed across the six additions |
| Database | Migration 0023 added six fixed page keys; all 439 old keys remain, making 445; all 456 prior aggregate rows and 4 prior inquiries were preserved; restored integrity and foreign-key checks passed |
| Operational health | Authenticated health was healthy after publication. Latest observed scheduled success was 2026-10-23T05:17:29.804Z; a new scheduled run after this deployment has not been observed. No new external receiver receipt is claimed |
| Google | Google accepted the updated sitemap and reports Success with 188 discovered pages; discovery does not establish indexing or rankings |

The successful exact-commit CI artifact supplied the final technical manifest. Its source and artifact SHA-256 values matched the clean local build before deployment. No source edits or rebuild occurred between that check and publication. Full live verification completed without transport retries. The [publication-record review](reviews/publication-record.md) records the final independent evidence check.

The 59 earlier location-page records and rendered bodies remain identical. All 59 guides, 1,079 directory entries, 333 county worksheets and 430 downloadable artifacts remain available. The content-preservation inventory counts 201 HTML files because it includes twelve existing sample-handoff files; the public site has 189 HTML routes. Only the four affected state hubs and the six additions receive new content dates. The tables use native headings and the existing responsive phone presentation; all six passed 320px overflow checks and their desktop screenshots were inspected.

The historical 332-route fixture, 283 redirects and canonical routing implementation are unchanged. The preceding release's 1,576 passing live URL variants remain the evidence for that unchanged matrix; it was not rerun for this additive release. Current exact-source CI retains the historical browser regressions. Forty-nine historical paths remain restored, and 62 New York aliases remain supported.

Migration 0023 retains existing constraints, defaults and compatibility with the preceding Worker. Inquiry provenance retains its existing 333 fixed options; general commercial inquiry links do not infer a customer's business location. The pre-migration backup was restored locally and verified before publication. Private exports remain outside version control.

No real inquiry, email, chat message or payment was submitted during this release verification. Authenticated health does not prove inbox receipt, independent recovery or sustained reply coverage. Existing business enrollment and recovery requirements remain in force. The broader individual market reassessment remains underway; this release does not declare every market assessed or the business complete.

Private evidence is retained in `evidence/location-services-followup-20261023/`, including the exact-commit CI result and authentic manifest, artifact comparison, full live checks, new-route checks, database exports and preservation results, operator status, Google screenshot and release record. Later documentation commits are separate from the deployed application identity. Prior release reports retain their dated scope.
