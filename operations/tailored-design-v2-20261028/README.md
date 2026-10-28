# Tailored visual design v2

Implementation of the owner's approved v2 plan for ideas 1, 2, 3 and 6. The owner authorized implementation, a GitHub push and publication on October 28, 2026. Publication remains subject to the existing exact-commit release gates.

## Scope

The [page map](page-map.json) records the 11 existing URLs and acceptance criteria. No public route, price, package inclusion or inquiry submission behavior is added.

- Work pairs its introduction with a real AssetRounds screenshot, keeps the complete existing project inventory and introduces the Fieldwork design desk. The separate AssetRounds case study keeps its detailed content and full captures. The phone opening uses the actual mobile capture and a deliberate top crop.
- The design desk compares Quiet, Expressive and Warm presentations using identical content and artwork. Native radio groups control direction and layout width. Direction and preferred width survive resizing; focus moves to the checked direction only if its focused width control must disappear. A server-rendered Quiet example works without JavaScript.
- Services preserves its three groups and seven choices, with a relevant example beside each group. The review example uses actual Northline repair screenshots and their provenance. Existing service detail examples are refined in place where possible.
- Process uses compact illustrative scope, review and handoff artifacts while retaining its sequence, responsibilities and payment wording.
- Home gains one link beside its current concepts. The living city, shared navigation/footer and floating-control behavior are preserved.

## Component boundaries

`src/design-desk.mjs` and `src/assets/design-desk.js` own the independent specimen. `src/tailored-examples.mjs` owns explanatory examples. `src/assets/tailored-visuals.css` is loaded only on the ten revised inner pages through the existing build/versioning pipeline. Home uses only its existing styles.

Shared AssetRounds preview and milestone renderers retain their defaults; revised pages opt into the added treatment. Add-on examples are passed from the server-side page renderer to avoid importing presentation assets into the shared browser bundle.

## Review and verification

One independent Astra reviewer inspected the plan and implementation. Two implementation findings were fixed: inherited radio minimum height and insufficient phone art direction. A further test finding was fixed by proving the lazy artwork request was aborted and the image failed before checking the fallback. Existing gallery/detail and inquiry-selector assertions were updated for the intentional composition; no existing assertion coverage, skip policy or tolerance was removed.

New browser coverage checks all design states, content invariance, keyboard focus, width restoration, enlarged-text layout, missing artwork, blocked scripts, actual no-JavaScript fallback, all 11 page families and preserved inquiry context. The same suite is included in Firefox/WebKit coverage. Visual coverage now includes the remaining service pages and Process. Performance coverage adds Work, Services and Web Design without changing budgets or removing previous paths.

At the local checkpoint: focused Chromium journeys and accessibility passed 29 cases with one pre-existing reduced-motion exclusion; focused Firefox/WebKit coverage passed 20 cases. The 1,048-unit suite had two build-dependent fixture failures during a concurrent rebuild; both affected tests and their complete four-test file passed after the build finished. Final CI must rerun the complete suite. Static verification, 2,425-route SEO checks, 2,995 historical fragment checks and all 16 exact editorial review decisions passed. These are development results, not publication evidence.

Linux screenshot inspection caught an inherited page-footer background on the design desk links. Its local link group now uses an ordinary div, with a regression assertion for the transparent background. Nu validation caught missing responsive-source metadata; the phone source now pairs an explicit 390w descriptor with its sizes attribute. The independent reviewer approved both repairs. Release helper review also added postdeployment timestamps and authenticated runtime/commit binding to live browser evidence.

## Release status

Published and verified. See [the release record](RELEASE.md) for the exact source, runtime, checks and live evidence. No field-performance, conversion-lift or human usability result is claimed.
