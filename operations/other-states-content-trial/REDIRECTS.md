# County redirect repair — October 22, 2026

**Live repair complete.** The application already had the correct canonical mapping, but older Cloudflare rules could redirect New York aliases to retired county addresses first. Some generic normalization rules could also add an obsolete intermediate address.

## Change

The zone’s dynamic redirect ruleset moved from version 11 to version 20. Three obsolete state-specific county canonicalization rules (NY, PA, OH) were disabled. Six general public normalization rules now exclude paths beginning with /areas/ after lowercasing, allowing the application’s existing canonical handler to resolve those paths directly. Other public URL normalization and the separate source-handoff rule were retained. All ten rules remain present.

The full original expressions and rule bodies were backed up privately before the change. Cloudflare dry runs accepted all nine patches; the live update first checked the original ruleset version and rule contents to detect drift. Each updated rule was reread and matched its intended values. No application deployment, database migration or sitemap change was needed.

## Verification

| Check | Result |
|---|---|
| Current mapping | All 332 retired county paths match the directory’s canonical destination. |
| HTTPS requests | 1,182 passed: 332 retired paths plus 62 New York aliases, tested with GET, HEAD and www/uppercase/INDEX.HTML variants. All returned a direct 308 to the expected destination. |
| HTTP requests | 394 paths without a trailing slash retain Cloudflare’s 301 HTTPS upgrade, followed by the application’s correct 308. All 394 chains passed. |
| Query and fragment handling | Duplicate and encoded query values preserved; expected county fragments retained. |
| Destinations | All 13 destination pages returned 200. All 332 required county anchors were present; the separate Erie page also returned 200. |
| Other-route controls | Homepage, contact and pricing returned 200; www uppercase pricing/index.html normalized correctly. |
| Local canonical tests | Four tests passed, covering retired maps and New York aliases across the application’s Worker/native handlers. |

Cloudflare’s Always Use HTTPS setting remains on, verified through its API; it was last modified October 16. The HTTP upgrade is an intentional transport step. It is not a redirect through a different retired county URL, and this report does not claim all HTTP requests take one hop. HTTPS checks were recorded at 2026-10-22T23:13:09.606Z; HTTP follow-up and control checks completed at 2026-10-22T23:16:24.256Z. The [sanitized verification summary](data/redirect-verification.json) retains the counts, destinations and controls.

Full private evidence is retained in the task’s other-states-research folder: redirect-audit-before.json, redirect-audit-postfix-direct-expectation.json, redirect-verification-final.json, cloudflare-redirects-before-full.json, cloudflare-redirect-change-plan.json and cloudflare-redirect-update-result.json. The earlier incomplete backup named cloudflare-redirects-before.json must not be used for recovery. Restore a prior rule body only after checking for later live changes; this content package does not request rollback.

Current county destinations remain the appropriate state-hub anchors, except the existing Buffalo/Erie page. The content research does not reopen retired county routes.

[Research result](README.md)
