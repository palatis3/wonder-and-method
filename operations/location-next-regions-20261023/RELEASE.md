# Eight further location services — publication October 23, 2026

Eight reviewed commercial website-design pages are now live: Fort Wayne/Allen County and Bloomington/Monroe County, Indiana; the Traverse City area/Grand Traverse County, Michigan; New Bern/Craven County, Durham County and Charlotte/Mecklenburg County, North Carolina; and Maryville/Blount County and Chattanooga/Hamilton County, Tennessee. The [page and source register](data/reviewed-locations.json) records their evidence. Following the [six-page release](../location-followup-20261023/RELEASE.md), the collection now has 73 pages serving 83 directory identities. Including the retained Buffalo/Erie service page, there are 74 direct service pages covering 84 identities.

Each page helps a buyer compare two possible website scopes, prepare owner inputs and check an illustrative acceptance case. Its original planning table develops a specific service decision. The pages identify Wonder and Method as a Buffalo studio working remotely and public businesses as research examples. The [review record](README.md), [content review](reviews/content.md) and [implementation review](reviews/implementation.md) have no unresolved findings. The content review's three optional wording improvements were applied before integration. No shared renderer or stylesheet change was needed.

## Verified release

| Item | Result |
|---|---|
| Published source | `7ced8bd52e428d46fee9b72344d06d38a4d3ef6a` |
| Authenticated Worker runtime | `d9a3fef4-ad7a-4485-8f2c-fcb43a159f01` |
| Exact-source technical checks | 690 unit tests and 283 browser checks passed; 164 intentional project skips; source verifier, content inventory and Worker dry run passed |
| GitHub checks | Verify and visual passed for the exact source commit: [run 39908668095](https://github.com/palatis3/wonder-and-method/actions/runs/39908668095); all 34 existing screenshot references passed unchanged |
| Publication gate | Clean pushed source, authentic CI source/artifact fingerprints and production secret inventory passed |
| Live parity | All 197 HTML routes and 1,129 asset hashes match the tested build; sitemap has 196 URLs; canonical, robots, private exclusions and CSS hints passed |
| New routes | All 40 canonical GET/HEAD, normalized-URL and state-hub link checks passed across the eight additions |
| Database | Migration 0024 added eight fixed page keys; all 445 old keys remain, making 453; all 459 prior aggregate rows and 4 prior inquiries were preserved; restored integrity and foreign-key checks passed |
| Operational health | Authenticated health was healthy after publication. Latest observed scheduled success was 2026-10-23T09:17:29.844Z; a new scheduled run after this deployment has not been observed. No new external receiver receipt is claimed |
| Google | Google accepted the updated sitemap and reports Success with 196 discovered pages; discovery does not establish indexing or rankings |

The successful exact-commit CI artifact supplied the final technical manifest. Its source and artifact SHA-256 values matched the clean local build before deployment. No source edits or rebuild occurred between that check and publication. The first live probes observed the preceding Worker on some requests while the deployment propagated, including old hub content and several unavailable new routes. The repeated full-site and new-route checks passed with no source or configuration change. The final full-site check needed no GET/HEAD transport retries. The [publication-record review](reviews/publication-record.md) records the final independent evidence check.

The 65 earlier location-page records and rendered bodies remain identical. All 59 guides, 1,079 directory entries, 333 county worksheets and 430 downloadable artifacts remain available. The content-preservation inventory counts 209 HTML files because it includes twelve existing sample-handoff files; the public site has 197 HTML routes. Only the four affected state hubs and the eight additions receive updated content dates. All eight tables passed 320px overflow checks and their desktop screenshots were inspected, along with representative phone views.

The historical 332-route fixture, 283 redirects and canonical routing implementation are unchanged. The earlier release's 1,576 passing live URL variants remain the evidence for that unchanged matrix; it was not rerun for this additive release. Current exact-source CI retains the historical browser regressions. Forty-nine historical paths remain restored, and 62 New York aliases remain supported.

Migration 0024 retains existing constraints, defaults and compatibility with the preceding Worker. Inquiry provenance retains its existing 333 fixed options; general commercial inquiry links do not infer a customer's business location. The pre-migration backup was restored locally and verified before publication. The first read-only migration-list call encountered a provider internal error; its repeat succeeded and showed only the expected migration before it was applied. Private database exports remain outside version control.

No real inquiry, email, chat message or payment was submitted during this release verification. Authenticated health does not prove inbox receipt, independent recovery or sustained reply coverage. Existing business enrollment and recovery requirements remain in force. The user has authorized expanded parallel county research, and individual review of every remaining entry continues. This release does not declare all 1,079 entries assessed or the business complete.

Private evidence is retained in `evidence/location-next-regions-20261023/`, including the exact-commit CI result and authentic manifest, artifact comparison, full live checks, new-route checks, database exports and preservation results, operator status, Google screenshot and release record. Later documentation commits are separate from the deployed application identity. Prior release reports retain their dated scope.
