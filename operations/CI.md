# Website verification

The Website checks workflow runs 15 jobs. `core` builds once and runs unit,
content, static, historical-route and Worker dry-run checks. Five browser jobs
consume that exact build. Independent editorial and reading-accessibility jobs
also consume it. `verify` aggregates their evidence. The existing standards,
cross-browser, performance, dependencies, links and visual jobs remain required.
Standards deliberately builds twice to test reproducibility.

## Browser partitions

`npm run ci:browser -- plan` discovers every project-qualified leaf test and
distributes it across five duration-balanced lists. Timing hints affect only
scheduling; they cannot remove tests. Playwright resolves each list independently
before it runs. Each shard uses one worker and no retries. The final job checks
the exact inventory, results, exclusions, blob hashes and merged outcomes.

Existing platform-specific skips are listed in
`config/ci-browser-exclusions.json`, with reasons and source-file hashes. Changes
to those files require independent review of the exclusions. New skips are not
automatically accepted. Shared `beforeAll`/`afterAll` or serial suites require an
explicit partition design before adoption.

Every consumer verifies the commit, source, emitted files, build metadata,
test/configuration inputs, runtime versions, workflow run and attempt. A partial
core manifest cannot authorize publication. **Rerun all jobs together**, rather
than only failed jobs: artifacts from another attempt are intentionally refused.
The stable required `verify` job runs even after failed prerequisites and rejects
skipped, cancelled and failed dependencies.

## Additional reading and editorial coverage

Editorial decisions in `operations/editorial-review.json` bind the exact flagged
passages or linking evidence. Missing, changed, duplicate or stale decisions fail.
Length thresholds trigger review; they are not a claim that length establishes
writing quality or search rankings.

The reading suite checks 12 representative routes at 320 CSS pixels, at 200%
text size, and with increased line, letter, word and paragraph spacing. It opens
disclosures, exercises keyboard navigation and checks a synthetic form error.
Native select line height remains browser-controlled; its letter and word
spacing are still checked. These checks supplement the full browser inventory
and do not establish a complete manual accessibility audit.

## Performance coverage

`npm run check:performance` measures the exact built artifact on nine representative
routes: home, pricing, contact, payments, a guide, a state page, work, services and
web design. Each gets three cold Lighthouse loads with both the mobile and desktop
presets. The required `performance` job fails when a budget is exceeded:

| Metric | Limit | Across three loads |
| --- | --- | --- |
| First Contentful Paint | 1.8 seconds | Median |
| Largest Contentful Paint | 2.5 seconds | Median |
| Total Blocking Time | 200 milliseconds | Median |
| Cumulative Layout Shift | 0.1 | Maximum |
| Speed Index | 3.4 seconds | Median |
| Lighthouse performance score | At least 90 | Median |

Six additional homepage probes cover 390px, 412px and 1440px viewports with
streamed HTML and delayed fonts/modules. The streamed fixture pauses after the
hero artwork and requires a paint before the response completes. This catches
the partial-document layout jump that an immediate localhost response can miss.
Every probe checks the full CLS session-window score, horizontal overflow,
JavaScript errors and completed hero initialization. Because the probe sends no
input, a second session-window check includes every observed shift, even those
Chromium mobile emulation marks as recent-input events. It uses a fresh browser
context and includes the initial consent choice UI.

The job retains per-run HTML/JSON reports, startup screenshots and `summary.json`
under `output/ci/performance/`, even on failure. Lighthouse reports also retain
image-delivery, unused-CSS, render-blocking and request-chain diagnostics. No
budget or report is silently accepted or rewritten in CI.

These are synthetic lab tests against the local production build with compressed
text transfer. External HTTPS requests are blocked. They do not measure the CDN,
third-party execution after consent, every route, or every visitor's connection.
Continue checking deployed PageSpeed and field Core Web Vitals after releases.

## Local commands and release evidence

- `npm run technical:check`: all technical checks locally, including the two new gates.
- `npm run ci:core`: build and non-browser core checks only; not release approval.
- `npm run check:editorial`: verify exact editorial decisions against emitted HTML.
- `npm run test:reading`: run the additional reading checks on synthetic port 4198.

Publication requires all nine named GitHub gates and the complete technical
manifest for the exact source and artifact. A distributed manifest records the
run, attempt, partition hash and complete test count. When deploying a locally
built artifact, verify every emitted file against the checked Linux build first.
Live checks, backup and recovery evidence remain separate release requirements.
Real elapsed CI time must be measured after a completed run; timing hints are
not a promise about queue time or hosted runner speed.
