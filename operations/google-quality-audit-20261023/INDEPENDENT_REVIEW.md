# Independent combined closure — October 23, 2026

**Status: PASS — all six CI findings and all four required collection findings are closed.** Guide-review integration also passes. This is a pre-CI review, not publication approval. The Adams County, Ohio omission found during closure was corrected and independently verified in source and generated HTML. No actionable defect remains within this bounded closure.

## Scope and integrity

I reviewed the six findings in `ci-review/report.md`, the four required collection findings, current quality-check implementation and mandatory release integration, and the provenance and semantics of the guide-review ledger. I did not repeat the seven full-record editorial audits or claim independent rereading of every business source. All new helpers and evidence are confined to this `ci-closure` directory. No application source, production service, account, form, external message, deployment or migration was changed by this review.

The initial 26-file snapshot is recorded in `input-hashes.json` and `snapshot/`. The first final comparison found exactly two byte changes: `src/location-service-data.json` and `tests/fixtures/historical-route-contract.json` were normalized from CRLF to LF. Both the normalized text and parsed values were independently proven identical. `ledger-audit.json` records their before/after hashes. Later remediation, if any, must be captured separately rather than silently treating these original checks as tests of changed bytes.

The final closure records the subsequent Adams correction separately in `final-integrity.json`. Its `scopeTrigger` is the only semantic location-record change from this review's starting snapshot. The rules gained the specific `CAD design` term and the test gained the reproducing assertion; other initially pinned implementation files remain unchanged apart from the documented route-contract newline normalization. The complete exact-record replay was independently rerun with outputs confined here: **1,068 records and 11 substantive closure hashes pass**, with no unexplained source changes (`record-preservation-final.json`).

## Six CI findings: closed

| Finding | Independent evidence | Result |
|---|---|---|
| Empty/non-HTML historical destination could pass | Cloned real checker with the actual Worker response wrapped: empty HTML now causes 20 route findings; wrong MIME/arbitrary body causes 22. The unchanged baseline has 0. | Closed |
| Unexpected redirect fragment could pass | Unexpected `#nonexistent-audit-target` causes 9 route findings; current checker compares the exact expected hash. | Closed |
| Comment, template, script or hidden ID could satisfy a fragment | Pure negative tests reject all four. A commented duplicate ID no longer generates a false duplicate. Current parser reads actual attributes and ignores inactive markup. | Closed |
| Purpose hash omitted proposed scopes | Changing only the proposed scope now invalidates the related-guide review. All purpose-bearing scopes are included in the hash. | Closed |
| `aria-hidden` hid visibly unresolved copy from the check | Visible `undefined` inside `aria-hidden` now fails. | Closed |
| Embedded object interpolation was missed | `prefix [object Object] suffix` now fails. | Closed |

The unchanged checker passed **4,412 route requests, 2,995 retained content-fragment targets and 1,116 guide associations** with zero findings. Positive controls for a 503 response and wrong canonical generated 22 and 20 route findings, confirming that the negative experiments exercise the intended path. See `checker-negative-results.json`, `pure-negative-results.json` and the individual checker outputs.

The quality gate remains mandatory in `technical-check.mjs`, `technicalChecks`, and the GitHub workflow. A previous technical manifest is removed before checks; failure exits before a replacement can be written. The final manifest binds the exact source, built artifact and commit checked. These checks detect defined regressions, not factual truth or Google approval.

## Focused tests and browser verification

An independent focused run passed **13 tests, 0 failures, 0 skips**: five quality tests, two citation tests and six release-integrity tests. Synthetic fixtures and output were redirected into this directory; `focused-tests.txt` contains the full result.

An independent browser run passed **4 cases, 0 failures, 0 flaky cases, 0 skips** across desktop and phone projects. The heading checks cover state/index/sample layouts at 320, 390, 834, 1280 and 1600 pixels. Historical-link journeys cover direct and aliased Albany, a Connecticut planning region, both Baltimore identities, and Buffalo, including actual visible fragment targets, preserved query/hash, purpose-specific content and viewport placement below the sticky header. These are representative browser journeys backed by the exhaustive static/Worker checks. I also visually inspected the saved Albany 320-pixel heading and Pennsylvania 1280-pixel directory section: labels appear above the heading without overlap. See `browser-results.json` and `browser-results/`.

The opt-in citation review now includes business and geography sources and changed observations, records reachability results, distinguishes blocked/transient responses from repeated missing pages, and has bounded attempts, redirects and total runtime. Its workflow is manual, with read permissions and retained evidence. No schedule or live citation sweep was started by this review. HTTP success is not proof of a source's substantive support.

## Collection findings

1. **Professional responsibility: closed after one follow-up.** Merrimack NH, Franklin NC and Lincoln WV explicitly assign professional work to the maker or qualified specialists and separate website functions. I found that Adams OH still grouped CAD design with separately quoted website work. It now says, in both source and generated HTML: “The cabinetmaker remains responsible for design, measurements and manufacturing approval. Online cabinet configuration, automated estimates or an approval-workflow integration require a separate website assessment. Clear stage descriptions can support an ordinary project inquiry.” The scope rule now includes CAD design and a regression assertion reproduces the old wording. I reran all 13 focused tests successfully and the full current quality check again: **1,192 pages, 4,412 routes, 2,995 fragments, zero findings** (`final-site-quality.json`). No guide-purpose field or guide hash changed.
2. **Broad service before narrow example: closed.** The common introduction now establishes website design, repair/redesign and remote Buffalo delivery first; a visible “Example website brief” label introduces the sector illustration. The public-example/non-client explanation precedes the first named-business discussion. Metadata now identifies the example. I checked the built Merrimack, Franklin, Adams, Lincoln and Baker introductions; the shared renderer applies the same order throughout.
3. **Service-area guidance: closed.** I read the complete current article and checked the short answer, worksheet, SVG text, figure caption/alt declarations and linked contractor guidance. They require substantial additional help, preserve an existing-page option, reject place-name/citation-only justification and candidly explain shared remote services, prices and portable public examples. The article does not turn geography into evidence of an office or client relationship. The topic-navigation link and collection research/accountability section also implement the two nonblocking recommendations.
4. **Florida `undefined`: closed.** The state description is supplied, the generated main hub passes the visible-copy check, and the built Florida introduction accurately identifies all 67 counties. No unresolved marker remains in the checked build.

`collection-extract.json` records the built excerpts and complete relevant article text read during closure. The first extraction used an incorrect North Dakota Cass identifier and returned an explicit missing result; that query is not evidence about Cass, Michigan and is not counted as a checked sample.

## Guide ledger: provenance and coverage pass

`audit-ledger.mjs` independently verifies all three input and review hashes against the integration record, unique assignments, complete target-guide read declarations, exact current article text, and every assigned page's full purpose fields. It derives the final ledger directly from the frozen review decisions and compares every field with the saved ledger and every active source link.

- **34 complete articles / 1,124 original associations:** 1,095 pass and 29 corrections.
- **29 corrections:** 7 removals, 14 replacement destinations and 8 label corrections.
- **1,116 final associations:** exact coverage after one explicitly reviewed Russell duplicate destination is consolidated; no missing, extra or duplicate active pair.
- **29 changed records:** current link arrays exactly match the reviewed correction packet. Every replacement destination was among the same reviewer's complete article reads.

The ledger is not merely an automatically populated hash list: the frozen review packets contain per-association judgments and reasons, including rejections. I additionally read complete target articles and full location-purpose context for six meaningful samples:

| Sample | Independent semantic conclusion |
|---|---|
| Alleghany VA | Replacing the after-class handoff guide with the content template fits eligibility, taught/open-studio formats and arrival preparation. The separate departure-address link also directly supports the activity-specific entrance. |
| Catawba NC | The personalization guide provides a defensible analogy for preserving product/options/preview through the quote handoff. The corrected label explicitly identifies its furniture application. |
| Russell VA | Experience-choice guidance better supports learning, add-on and contribution choices than dated farm-event maintenance. Consolidating its duplicate target preserves the more explanatory reviewed label. |
| Buncombe NC | Account access versus transaction approval is useful for membership readiness versus an approved tool loan. The explicit borrowing-analogy label avoids presenting purchasing as the actual activity. |
| Mitchell NC | Removing the shipping-date/quote guide is justified: the complete brief concerns a unique artwork's cart and purchase state, not dispatch-date choice or packing-price exceptions. |
| Washington, DC | Assessment versus authorization in the repair guide supports preparing a binding-restoration inquiry while leaving treatment to the binder. The content-template link supports service explanations. |

This is a bounded semantic sample plus exhaustive provenance/coverage verification; it does not claim a second full manual read of all 1,124 associations.

## Remaining release gates

Obtain the full exact-commit GitHub technical/visual result and the normal publication checks. Live redirects and inherited fragments must be verified after deployment; this candidate review cannot close the earlier live fragment defect before new code is published. Search submission, crawling, indexing and ranking are separate outcomes.
