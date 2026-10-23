# Browser route-expectation fix review

**No actionable findings.** The current two-file diff corrects both obsolete expectations without weakening the surrounding redirect, query, hash or worksheet assertions.

Reviewed only the changes to `tests/browser/northeast-coverage.spec.mjs` and `tests/browser/regional-directory.spec.mjs` in `C:/Wonder and Method/nys-distinct-20261022/site`, the applicable fixed route fixtures, and the requested CI logs. No implementation or test files changed during this review.

- `northeast-coverage.spec.mjs:115` now expects the restored Lower Connecticut River Valley page URL in the downloaded worksheet. That exact path appears in the approved 48-route wave-one fixture and is absent from retired redirects. CI 39937912199's received worksheet already contained this URL. The download event, filename, region heading, fictional-example label, keyboard/open-state assertions and general-contact query/hash/empty-field assertions are unchanged.
- `regional-directory.spec.mjs:97–99` classifies restored routes through `currentLocationPaths`, imported from independent fixed release fixtures rather than production output. This correctly adds Lower Connecticut River Valley to the existing restored-page branch. Monroe remains restored; Pennsylvania Columbia and Ohio Greene remain hub redirects; Baltimore city retains its explicit Baltimore-area redirect. Exact query-string and fragment preservation are still asserted in each branch, and live-page or expanded-directory content assertions remain.
- The separate 265-route HTTP matrix at `regional-directory.spec.mjs:111–123` remains unchanged: status 308, exact destination with encoded/duplicate query values, plus Erie's 200 response without a Location header. The source-disclosure checks are also unchanged. No skip, timeout, retry or assertion removal was introduced.

Validation evidence:

- `evidence/location-wave-one-20261023/ci-failure.log:1497–1505`: six failures consist of these same two expectations across desktop, phone and phone-reduced-motion; 295 tests passed and 176 skipped. The failure output shows the restored planning-region URL, matching the approved fixture rather than the stale hub-fragment expectation.
- `evidence/location-wave-one-20261023/browser-ci-fix.log:4–19`: both affected tests pass across all three projects, **6 passed (9.0s)**.
- A read-only Node inspection confirmed 121 current fixture paths, 48 wave-one paths and 265 retired routes. It confirmed the five bookmark cases take the intended branches listed above. Neither route fixture is changed in this diff.

The focused result verifies the two changed scenarios; it is not a claim that the full remote CI rerun has passed. No additional research or workers were used. Only this private report was added.
