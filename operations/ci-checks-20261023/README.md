# Required website checks

The website workflow now has seven required jobs on every push and pull request. Production predeploy verification requires all seven jobs to pass on the exact clean, pushed source commit. A missing, skipped, cancelled or failed job does not satisfy the release gate.

| Job | What it checks | Retained evidence |
| --- | --- | --- |
| `verify` | Existing unit, content, static, historical-route and Chromium journey checks; Worker dry run and secret scan | `browser-journeys` |
| `visual` | Reviewed Linux desktop and phone screenshots | `visual-comparison` |
| `standards` | Two clean builds, byte comparison of every output including version metadata, and Nu validation of every HTML document | `standards-reports` |
| `cross-browser` | Firefox desktop and WebKit desktop, phone and reduced-motion journeys: forms, buying, navigation, footers and table semantics | `cross-browser-journeys` |
| `performance` | Three cold mobile Lighthouse runs on six representative pages; median LCP ≤ 2,500 ms, CLS ≤ 0.1, TBT ≤ 200 ms and score ≥ 0.9 | `performance-reports` |
| `dependencies` | Both root and deployment npm dependency trees; high and critical vulnerabilities fail, all levels remain in the report; audit-service errors fail | `dependency-reports` |
| `links` | Every rendered outbound anchor, including source citations, with affected pages and complete redirect chains | `outbound-links` |

Lighthouse and Chrome Launcher are exact package-lock pins. Chromium, Firefox and WebKit use the existing pinned Playwright release. Nu uses a pinned validator package. CI runs on Ubuntu 24.04 and Node 24; the main technical job retains its 90-minute budget for the full route inventory.

The performance harness uses an isolated synthetic local server, gzip text transfer and blocked third-party HTTPS. These lab measurements are not field Core Web Vitals. Configuration and measurement validation prevents an empty path list, insufficient runs, invalid budgets or missing metrics from passing without measurements.

The link checker performs credential-free GETs with bounded concurrency, host scheduling, timeouts and retries. Two consistent broken observations fail the check, including 404/410 responses, redirect loops, missing or invalid destinations, more than five redirects and HTTPS downgrades. Authentication blocks, rate limits and transport failures remain explicitly **unverified**. An unfinished inventory fails. The report flags HTTP origins, host changes and longer redirect chains for review. Successful HTTP responses do not establish source accuracy or catch every soft 404, challenge page or stale claim; external fragments also need manual review. Local assets, fragments and historical redirects remain covered by the existing technical checks.

## Corrections and local evidence

The first complete scan found six broken URLs. Each replacement was independently checked against the claim it supports. Two unavailable Messer Pontoon pages now use dated snapshots of the original operator's pages, with explicitly historical wording. The other four links use current source destinations. See `source-link-corrections.json` for exact field edits and provenance. The subsequent complete scan covered 2,361 unique URLs across 1,219 HTML documents: 2,308 reachable, zero confirmed broken and 53 unverified. Unverified links are not presented as passed.

Nu initially rejected redundant explicit row and cell roles. The table transformer now retains native `tr`, `th` and `td` semantics, along with table/rowgroup roles, captions, scope attributes, phone labels and the existing layout. Nu subsequently reported zero errors across 1,219 documents; 3,318 warnings remain visible in its report. Accessibility snapshots in Firefox and WebKit confirm table, row, header and cell relationships on desktop and phone layouts.

`content-baseline-review.json` records the content review: restoring only the former role attributes reproduces the old HTML hashes for 1,082 pages. Five further pages contain the reviewed citation corrections. All route inventories, titles, descriptions, canonicals, headings, IDs, media, structured data, downloads and other emitted assets were preserved.

The initial 719-test unit run passed. Focused tests additionally cover invalid performance configurations, incomplete measurements, link failures and required exact-commit job coverage. Local Lighthouse measurements passed all six pages. Windows WebKit's keyboard link-tabbing behavior differs from the other engines; the mandatory Ubuntu cross-browser run retains the actual keyboard assertions and must pass before release. Local selective runs are diagnostic evidence, not substitutes for that job.

Independent review found one performance-configuration issue, corrected with strict validation and negative tests. The review and closure manifests retain input hashes. Final CI outcomes are recorded separately after execution; adding the workflow alone does not establish a passing release.

These checks support technical quality. They do not certify every Google Search guideline, editorial usefulness, indexing, rankings or real-device Safari behavior.
