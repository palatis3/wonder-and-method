# Independent publication review — 144-page wave two

Reviewed October 23, 2026. **No actionable findings.** The publication record accurately identifies the deployed application and the retained evidence supports the reported release results.

## Identity and scope

- Application source: `31b461e4d8a6bfb29d109dd1c67aa6241b1b47e9`.
- Later documentation commit: `8de20dfd8bc11c27082af50bb64601884cc1b3a0`.
- Authenticated runtime: `c8fde114-4e59-4881-91a0-349d16a327ec`.
- CI: [run 39945861611](https://github.com/palatis3/wonder-and-method/actions/runs/39945861611), with successful verify and visual jobs at the application commit.

Reviewed `operations/location-wave-two-20261023/README.md` and `RELEASE.md`, plus the current sections of `BUILD_STATUS.md`, `HANDOFF.md` and `deployment/PRODUCTION.md`. They consistently distinguish the deployed source from the documentation commit and the continuing market-review work. The documentation commit changes only those five documentation files.

The current working `dist` contains later work and was not used to prove the 144-page publication. This review used Git snapshots and frozen/private evidence in the site's `evidence/location-wave-two-20261023/` directory. No deployment, production form, email, payment or other transaction was initiated.

## Independently corroborated results

| Area | Evidence and result |
|---|---|
| Exact source and artifact | The authentic CI `technical-check.json`, `artifact-parity.json`, release record and authenticated operator release identity agree on source SHA-256 `f8e9b14485a8d9d9a7a27be0a1ce0d24acd48e87f51fa230538aff0f0485f0a9` and artifact SHA-256 `d02e3c409e5c06ab3e3896f0203ff15cef1375a47375bf14cd2c755ee9f80a73`. CI records a clean application commit and build, test, static, preservation, browser and Worker dry-run checks. |
| Actual CI counts | Read the retained CI browser result: 355 expected passes, 212 skips, zero unexpected failures, zero flaky tests and no report errors. The actual CI unit summary says 692 tests, 691 passes, one skip, zero failures. Documentation correctly distinguishes this from the 692-pass local run. |
| Visual gate | The visual job succeeded. The source has 34 tracked visual references, with no reference-image changes in this release. The broader 288-image local review evidence remains separate from those fixed CI references. |
| Public content parity | The retained live report contains 389 HTML checks, all with matching HTML. Its 388 eligible/canonical pages agree with the sitemap; the error page explains the additional HTML route. The report records all 1,249 asset hashes matching, sitemap parity, private exclusions and the expected authenticated runtime. |
| New routes | Independently counted all 720 retained result rows and their pass flags: 720 passed, no failures. These cover the 144 new pages and their URL/hub checks. |
| Historical routes | Independently counted all 1,576 retained result rows: all passed. All 134 destination/anchor checks also passed. The unchanged fixture has 332 historical paths, plus the 62 New York aliases covered by the variants. |
| Restored/retired split | Derived 121 distinct restored canonical GET paths directly from the retained request rows, leaving 211 retired paths. This agrees with the source assertion and corrected summary. |
| Database backup and preservation | Independently restored both SQL exports into separate in-memory SQLite databases. All four inquiry rows, all 469 aggregate rows and the empty delivery-resolution set are exactly preserved; no private row contents were emitted. Integrity is `ok`, foreign-key errors are zero, and migration 0026 is the sole added migration. The before-export hash matches the backup record. |
| Approved content | Recomputed all five frozen approved-input hashes and compared every public authored field for all 144 additions with the `31b461e` source. They match. Private `incrementalValue` assessment text is correctly omitted from the public collection. All 121 earlier collection records are exactly unchanged. |
| Preservation inventory | Independently compared the committed content contracts: 158 changed/added HTML records (144 additions and 14 hubs), 55 changed downloads (54 worksheet destinations and the text index), and 146 changed assets (144 social cards, sitemap and asset-hash manifest), totaling 359. The other 243 earlier HTML records are unchanged. The published inventory has 401 HTML records including the twelve sample-handoff files, plus 430 downloads. The independent historical fixture is unchanged. |
| Google | Visually inspected the retained Search Console screenshot: the property's submitted sitemap shows Success, October 23, 2026, and 388 discovered pages. The release correctly limits this to discovery rather than indexing or ranking. |
| Operational health | Authenticated after-status reports the expected runtime, matching clean source identity, 389 routes and healthy status. Its scheduled-success timestamp predates deployment. Documentation correctly makes no new scheduled-run, external-receiver or inbox-receipt claim. |

## Historical-summary correction

The private legacy summary initially contained the stale literal `67`. The correction record identifies the summary-only change to `121`, and the retained request rows independently produce `121` restored canonical GET paths. The original per-request assertions/results were already based on 121; all 1,576 checks and destination checks remain passing. The helper now derives the summary count. This is a corrected reporting defect, not an unresolved routing failure or reason to repeat the release.

## Evidence limits and conclusion

This was a retrospective review of retained authenticated/publication evidence and frozen source. It did not rerun CI, deployment gates or live network checks against the later working tree, and it does not claim to reconstruct the old build from today's `dist`. The retained CI artifact comparison establishes the original predeployment parity; the deployment log and authenticated operator record establish the runtime. Prior independent implementation findings remain valid for the unchanged application source.

The release documentation preserves the relevant boundaries: a Buffalo remote studio, public examples rather than clients, unchanged inquiry provenance, no inferred visitor location, no claim that every directory entry has been assessed, and no claim of business enrollment, sustained reply coverage or recovery readiness from technical health alone.

**Disposition: publication record accepted; no corrective action requested.** Only this review report was written.
