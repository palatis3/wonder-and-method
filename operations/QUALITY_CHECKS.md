# Checks before publishing

Every normal code push and pull request runs seven GitHub jobs in **Website checks**. All seven must pass for the exact commit before `npm run predeploy` permits the normal production release process. Documentation-only commits may explicitly skip CI; they cannot authorize publishing a different application revision.

- **verify:** builds the site; runs unit and billing/inquiry regression tests; verifies local links, fragment targets, downloads, metadata and output boundaries; checks the accepted content and asset inventory; runs browser journeys and every generated site route at phone and desktop widths; performs a Worker deployment dry run. The repository secret scan and locked dependency installation remain required.
- **visual:** compares desktop and phone screenshots against reviewed references on Ubuntu 24.04 with the repository's pinned Chromium. It covers the homepage, prices, services, Work, contact, proposal request, a guide, an area guide, About, a fictional concept and both footer states.
- **standards:** compares every file from two clean builds and validates every generated HTML document with Nu.
- **cross-browser:** exercises forms, buying paths, navigation, keyboard behavior, footers and table semantics in Firefox and WebKit, including phone and reduced-motion projects.
- **performance:** measures three cold mobile Lighthouse runs per representative page and enforces median loading, layout-shift, blocking-time and performance-score budgets.
- **dependencies:** checks the root and deployment dependency trees; high or critical vulnerabilities and audit-service errors fail the gate.
- **links:** checks every rendered outbound link and its redirect chain. Confirmed broken destinations fail; authentication blocks, rate limits and transport failures remain explicitly unverified.

The [CI implementation record](ci-checks-20261023/README.md) describes the exact budgets, failure rules and retained artifacts. Investigate and fix failed checks before publishing; do not wait for the owner to reproduce a regression already reported by CI.

Browser checks cover the floating back-to-top control, chat launcher, mocked chat loading, blocked-provider fallback, phone-menu behavior, keyboard focus and form-field obstruction. Every generated site page checks for the shared controls, loaded images/fonts, page errors and horizontal overflow. Representative page families receive automated accessibility checks with all footer groups expanded. Existing reduced-motion and no-JavaScript journeys remain part of verification.

The corner controls must remain separate floating buttons without a shared bottom bar. A responsive regression checks 320–1440-pixel widths, tablet breakpoints and landscape layouts at the top, middle and end of representative pages, including a Texas brief and the contact form. It checks transparent shared chrome, unobstructed space between the buttons, round touch targets, shadows and pointer reachability. Dedicated homepage and scrolled-content screenshots preserve their appearance on desktop and phone. These checks run in the required verify and visual jobs before publication.

These checks catch defined regressions; they do not prove every design choice is good, every external service is available or every assistive-technology experience is correct. CI never sends a real inquiry, chat message or payment. Live publication checks remain separate.

## Intentional content or design changes

1. Implement the change and build locally. Inspect the affected pages at phone and desktop widths.
2. Run `npm run check:content`. Read `output/site-contract/changes.json`: it identifies added/removed pages, changed text, metadata, links, media references, downloads and asset bytes. Restore unintended changes first.
3. After review, run `npm run baseline:content` and commit `tests/baselines/site-content.json` with the intended changes. Normal CI cannot overwrite this baseline. The changing private build identity in `version.json` is excluded; page content and public assets are not.
4. For an intended visual change, dispatch **Capture visual candidates** for the candidate commit. Download its `visual-candidates-COMMIT` artifact and inspect the affected full-page images plus footer states. Copy approved files into `tests/visual/baselines/linux/`, then commit them. Do not copy a failed comparison over its reference without review. The capture workflow cannot satisfy the production gate and has no write or deployment permission.
5. Push and wait for all seven required jobs to pass. Then run `npm run technical:check` from the clean committed source and `npm run predeploy` without rebuilding or editing afterward. An authentic CI technical manifest may be used only after independently verifying its exact commit, source and artifact hashes against the clean local build. Predeploy checks both the tested artifact and the latest exact-commit GitHub result. A missing, failed, skipped or unfinished required job blocks this path.

The visual comparison uses the same Ubuntu image, Node major, pinned dependencies and browser as the capture workflow. Browser/runner upgrades can change rendering and require newly reviewed references. Windows screenshots are useful for local review but must not be substituted for Linux references.

## Diagnosing failures

Download **browser-journeys** for failed test details, screenshots, traces and the content change report. Download **visual-comparison** for expected/actual/difference images and the HTML comparison report. Fix the cause and rerun the failed checks; do not delete assertions or raise image tolerances merely to turn a failed build green.

GitHub checks do not themselves deploy the website. The deployment procedure and rollback evidence remain in [PRODUCTION.md](../deployment/PRODUCTION.md). The release gate does not alter accepted customer prices, authorize billing, or establish staffed service capacity.
