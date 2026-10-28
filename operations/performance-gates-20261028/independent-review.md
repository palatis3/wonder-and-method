# Independent performance review

Reviewed the uncommitted performance/CLS changes against base `714cb18`, including the requested scripts, configuration, renderer/CSS changes, manifests, and focused tests. Read-only review; no source edits or broad test run. The primary agent owns the full validation run.

## Findings

- **Resolved P2 — `scripts/performance-contract.mjs:37–40`: first CLS session started at navigation time.** The initially reviewed implementation initialized `start=0`; six 0.02 shifts at 900, 1800, 2700, 3600, 4500, and 5400 ms incorrectly returned 0.10 and passed the 0.10 limit, although all six belong to one 4.5-second session (0.12). The primary agent changed initialization to an undefined start and initializes it on the first entry. A narrow direct import/reproduction now returns 0.12000000000000001, correctly failing the limit.

- **Resolved evidence gap — `scripts/startup-layout.mjs:67–73`: mobile recent-input exclusions and negative control.** The latest probe preserves standard CLS and additionally calculates `observedShiftScore` using the same session windows with recent-input exclusions disabled, appropriate for this no-input startup probe. Either exceeding 0.10 now fails, and `check-performance.mjs` propagates the failure. I independently recomputed all twelve recorded observed scores from their raw entries. The negative-control script restores only scene-before-copy ordering while retaining candidate assets; the same probe rejects both mobile streamed loads (CLS 0.42131/0.45296; observed scores 0.42543/0.45724). All six final candidate probes pass with no page errors, and worst observed movement is 0.07366. Source and evidence resolve the earlier concern.

## Verified review points

- All five Lighthouse metrics and the minimum performance score are enforced. Missing, nonfinite, negative, or incomplete metrics fail; CLS uses the maximum across runs, while timing metrics and score use medians. Both mobile and desktop profiles are mandatory.
- The installed Lighthouse desktop config explicitly changes form factor, throttling, screen emulation, and user agent. The mobile branch uses the default mobile preset.
- The streaming proxy preserves upstream CSP, splits at a parsed complete scene boundary, and validates that first paint precedes response completion. Missing readiness, unsupported measurements, page errors, incomplete matrix, and horizontal overflow fail the probe.
- Home pruning is limited to absent literal component classes; functional selectors and generic rules remain. The selected dynamic sources cover navigation and consent classes. Living City runtime classes do not use the pruner's targeted component prefixes. Shared, city, then consent order is preserved; no additional concrete cascade regression found.
- Copy-before-scene matches mobile visual order, while the desktop scene remains absolutely positioned. The controller uses explicit selectors rather than the reordered elements' sibling positions.
- Manifest semantic changes are limited to the added derivatives. Existing source entries remain intact; all six new phone capture hashes/byte counts and the intermediate poster hash/byte count match their files. Duplicate full-width source-set descriptors are avoided.

## Final verdict and remaining validation

No unresolved actionable findings remain in this bounded review. The startup regression gate demonstrably rejects the original DOM defect and accepts the fixed candidate without relaxing budgets.

I inspected `output/ci/performance/summary.json`: 18 page/profile combinations, 54 runs, passed status, no failures, median mobile scores 98–99 and desktop scores 100. That report predates the added conservative observed-movement field; the separately inspected `startup-final/summary.json` verifies the latest startup code. These are local results, not a claim of completed hosted CI. Required remaining unit/browser/visual checks, image quality inspection, and CI timing remain with the primary agent and were not repeated here.

## Independent browser exclusion hash review

Approved rebinding **only** `sourceFiles["tests/browser/living-city-night.spec.mjs"]` in `config/ci-browser-exclusions.json` from `d5616cedb1d536b48cab857cdcdc0da5e4aed9e189979f6e120b38eeb665f7d0` to `e2bf272971489d27869224ea075bc4d90627b4c27c63ff760538e41e638d0102` (SHA-256 of the exact reviewed file bytes).

The sole browser-test source diff expands the failed-moon interceptor to match the original asset and numeric-width derivatives, increments an abort counter, and requires at least one intercepted request. This repairs coverage for `crescent-moon-192.webp` and makes the failure scenario stricter. Existing film interception and usability assertions remain intact. No test title, skip predicate, or skip reason changed. I compared the policy against HEAD: all 585 exclusion objects, identities, and reasons are exactly unchanged, and no other browser-test file differs. Review is by the independent Astra worker `/root/astra_performance_review`; source and policy were not edited by this reviewer. Approval is limited to this hash binding and does not waive the affected-test rerun or other gates.
