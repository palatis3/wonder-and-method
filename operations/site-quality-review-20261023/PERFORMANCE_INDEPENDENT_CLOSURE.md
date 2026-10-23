# Independent performance fix review

Pass: PERF-001, PERF-002 and PERF-003 are closed for the reviewed source and rebuilt artifact. Exact SHA-256 inputs and browser evidence are in fix-review.json; HEAD remains b711713f376d3f180d7d330fbbe20f5c27309d2b with the implementation in the working tree.

- **PERF-003:** A fresh 1440×1000 desktop visit to /#site-help made zero MP4 requests. The scene was wholly offscreen, src remained absent and preload stayed none. Scrolling to the hero started the film and showed a decoded frame. A normal visible desktop visit also played. Source now waits for the first observer result and retains the no-observer fallback.
- **PERF-001:** At 390×844, holding then releasing the Waterfront poster kept its 350px-wide box at 218.75px high. Caption movement, image height change and scroll change were all exactly 0px. Emitted dimensions and actual image are both 1200×750. Before/after screenshots were inspected.
- **PERF-002:** The rebuilt tracker card emits 1200×900 and a final 1200w candidate, matching the original WebP. Existing derivatives remain present.

The focused controller command, node --test tests/living-city-controller.test.mjs, passed all 30 tests. This includes the 28 previous lifecycle tests and both new observer regressions. No full suite, build, baseline changes or source edits were performed by this reviewer.

Browser checks used an isolated Edge CLI session against the existing synthetic server at 127.0.0.1:4187. External and API requests were blocked; none were attempted in the recorded run. The session is closed and the server was not started, stopped or changed. Root was notified when browser use finished.

The synthetic server logged its inline bootstrap script being blocked by script-src self. The external city controller initialized and the scoped runtime checks passed; production CSP is outside this review. No Core Web Vitals, field score or CLS metric is claimed. Design refresh and South Carolina changes were not reviewed here.
