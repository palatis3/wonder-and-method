# Location release technical review

Reviewed 2026-10-23 against base commit `398e59af07a79d417e67a8addd4f07096e4e723b` in `C:/Wonder and Method/nys-distinct-20261022/site`. Independent read-only review; no application/test changes, production access, publishing or commits.

No unresolved actionable application-code or migration findings were identified within the reviewed scope.

- **P2 test finding, corrected during review:** `tests/browser/regional-directory.spec.mjs:98` initially expected an empty fragment after `/areas/maryland/baltimore-city/#buyer-task` redirected to `/areas/maryland/baltimore-area/`. The redirect Location has no fragment, so the browser retains `#buyer-task`; the target contains that useful section. The primary agent independently confirmed this in a real browser. The current assertion now correctly expects `'#'+fragment` for both restored Monroe and redirected Baltimore. No redirect change was needed. Final browser rerun remains the primary agent's verification gate.

Evidence checked:

- Rendered all 183 pages and independently checked every one of the 59 commercial pages. All load `/assets/counties.css`, including the Virginia city/area paths and shared Baltimore path; loading is selected by the `/areas/` prefix, not a county suffix.
- Each new commercial page has exactly one Service schema node, its own canonical URL and the Buffalo studio provider reference. Explicit served-area names match all 69 directory jurisdiction identities. Separate Baltimore City/County and Fairfax County/Fairfax City/Falls Church City identities remain intact. AdministrativeArea is used consistently; no local-office schema is introduced.
- Checked internal page/anchor links across all 59 rendered documents and their local worksheet assets. No broken content destinations were found. The shared root favicon exists in the built output. Breadcrumb state parents and commercial-page labels are selected correctly.
- Checked uppercase, index-document and missing-slash aliases for every commercial path with a repeated, percent-encoded query. Canonical targets preserve query bytes. The 49 restored paths are removed from retirement; the remaining 283 destinations retain both Baltimore legacy redirects to the shared page.
- Independently compared `tests/fixtures/historic-county-routes.json` with the base commit's actual 332-entry retirement map: exact equality. The revised retirement test independently rebuilds the original map and the expected 283 current redirects, so replacing some historical fixture references does not silently drop route coverage. Existing 1079-entry directory and fixed333 inquiry-context roundtrip assertions remain.
- Compared migrations0021 and0022 after normalizing their temporary table names and page-key lists: all other SQL is identical. The new regression test checks the 429→439 key expansion, exact runtime allowlist equality, preserved rows across all prior keys, inquiry/delivery records, defaults, conflict key and invalid-value constraints. Earlier migration assertions now allow later additive keys, while the latest migration test restores exact-set coverage.
- Independently varied build prices, page caps, form counts, external-connection limits and review prices/page caps. All 59 pages reflected the changed values. Existing new tests additionally vary baseline/care prices and first-payment arithmetic.
- Reviewed the legacy `buyer-task`, `approach`, and `search` anchors and restored historical worksheet links. They remain useful destinations. The primary agent is adding explicit selected-eight/non-exhaustive wording for Hampton Roads; its eight separate identities were verified here.

Limits: source research was previously independently reviewed and was not repeated. This review did not duplicate the complete unit suite, production build or browser/visual matrix, which the primary agent is running. It does not certify production deployment or resolve unrelated baseline CSP behavior. Recheck final suite/build/browser results and the final Hampton Roads wording before release.

## Closure — 2026-10-23

No unresolved actionable findings remain from this technical review. Verified the current browser assertion at `tests/browser/regional-directory.spec.mjs:98` preserves `'#'+fragment`. Verified Hampton Roads now explicitly says "eight selected independent cities" and "these eight cities do not define all of Hampton Roads," with the same eight distinct directory IDs.

Read the completed evidence logs: `location-tests-pass.txt` records 688 tests passed, zero failures/skips; `location-browser-all-routes.txt` records all nine tests passed, including the repaired historic-bookmark case and all 183 routes. The all-route test code checks each route at 360px and 1440px.

Independently hashed the built early boot script, `document.documentElement.classList.add('js');`, and confirmed its exact SHA-256 allowance is present in `dist/_headers` (`/x7W7R75k8Roq0WaVRQX9blP4OufE5xbAdzklGxsgpw=`). The reported stricter synthetic-server CSP warning does not indicate a missing allowance in the production artifact.

This closure supersedes the pending browser and Hampton Roads verification items above. No full tests were rerun, application code changed, production accessed or release published during the closure pass.
