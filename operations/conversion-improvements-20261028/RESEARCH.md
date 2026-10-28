# Field performance, service labels and editing options

Checked October 28, 2026. Read-only research against current source; HEAD observed `b4f47e17e5605b18d057b29bb0e0367c990558b3`. User instruction: skip steps needing real-life inputs for now; the owner will supply them later. No participants, accounts, keys, paid services, outreach, tracking scripts or new product commitments were created.

## 18. Real visitor performance: availability unverified

The public PSI analysis URL was inaccessible to the text browser. A credential-free request to Google's PSI API for `https://wonderandmethod.com/` on mobile returned HTTP 429 (`RESOURCE_EXHAUSTED`, daily query quota). This is a tooling/access result, **not evidence of insufficient CrUX traffic or bad performance**. No usable URL-level or origin-level field metrics were obtained. Other pages/devices were not repeatedly queried after this quota response. Exact response: `evidence/conversion-improvements-20261028/research/public-psi-attempt.json`.

Google's current documentation distinguishes synthetic Lighthouse diagnostics from CrUX real-user observations. PSI field metrics cover the previous 28 days; a URL may fall back to origin data, and neither may have enough samples. CrUX requires public discoverability and sufficient popularity; its numeric popularity threshold is undisclosed. [PSI documentation](https://developers.google.com/speed/docs/insights/v5/about), [CrUX methodology](https://developer.chrome.com/docs/crux/methodology).

Keep existing lab gates: three mobile runs, median results, LCP ≤2500ms, CLS ≤0.1, TBT ≤200ms and score ≥0.90 in `config/performance-budgets.json`. `scripts/check-performance.mjs` explicitly blocks third-party HTTPS and uses a local synthetic server; these results cannot certify production field experience or real INP.

Later, use the public PSI interface for `/`, `/pricing/`, `/contact/` and relevant package-request pages, on mobile and desktop. Record date, exact URL, URL/origin fallback, device, collection window and available p75 metrics. Do not label origin data as page-specific. Google’s Good thresholds are LCP ≤2.5s, INP ≤200ms and CLS ≤0.1. Investigate any available p75 exceeding them; prioritize Poor (>4s, >500ms, >0.25 respectively). These thresholds trigger diagnosis, not a claim that a release caused the result. A trailing window mixes releases and traffic; annotate deployment dates. If data remains absent or inaccessible, report that and retain lab/phone checks. No invented minimum sample count, no new telemetry needed for this release. Separate authorization and privacy design would precede any custom real-user measurement.

## 19. Service-label study: deferred; protocol ready

**No human study has been run.** The current labels and task routes have only expert review. Later recruit about five representative service-business owners for one qualitative round, with both new-site and existing-site needs; this is issue discovery, not a representative conversion-rate estimate. [NN/g qualitative sample guidance](https://www.nngroup.com/articles/how-many-test-users/).

Use a staging version with synthetic submissions. Start each task from Home and vary task order; do not speak the target label in the prompt. Record anonymous participant code, first destination, unaided completion, hesitation/wrong turns, explanation of what is included and any moderator help. Ask participants to think aloud; do not coach.

| Task prompt | Expected path/understanding, for facilitator only |
|---|---|
| You have started a local service business and have no website. Find out how to get one and what the starting cost includes. | New website/web design; recognizes a fixed build and separate outside costs. |
| Your existing website has old pages and no longer explains your services. Find help replacing it without losing useful existing addresses. | Redesign path; understands planning/migration rather than routine care. |
| Your site works, but new opening hours and photos need updating regularly. Find ongoing help and explain its limits. | Care; distinguishes supplied small edits/checks from new researched content. |
| Customers searching for your service rarely find useful pages on your site. Find ongoing help and explain what a paid month delivers. | SEO/Improve/Grow; understands completed work and no ranking guarantee. |
| Your contact form has stopped working. Find the first step to ask for help, without committing to a new website. | Audit/review/fix or general inquiry; free request, compatibility checked before agreed paid work. |

Proposed local decision rule (not a statistical benchmark): investigate a label if two participants independently choose the same wrong service, or anyone develops a material false belief about price/commitment. Correct confirmed ambiguity and retest with a fresh small group. Preserve a broadly understandable label when alternatives add confusion. User-provided participant observations are the missing input; no study result belongs in public copy until actually observed.

## 20. Visual editing: demand-dependent offering deferred

Actual constraint: website packages declare `editing_mode: source_code` in `config/offers.json`; `src/offer-summary.mjs` explicitly excludes a visual/drag-and-drop editor and offers self/developer editing or optional $150/month Keep Running care within its stated limits. Much page content is built in JavaScript template modules, not a ready CMS schema. No generic editor can safely be promised merely by adding an admin screen.

| Option | Fit and cost of adopting it |
|---|---|
| Existing source files + developer or optional care | Available now. Best when edits are occasional and the owner wants them handled. Preserve current prices, file ownership, editing limitation and monthly scope. |
| Structured content editor over Git, e.g. Decap | A potential separately quoted pilot for frequent text/image edits. Decap offers a web UI over repository content and file collections can target existing data files. First extract approved editable fields into structured content, protect offer/legal/configuration fields, define authentication, previews, validation, publication and rollback. This is content editing, not arbitrary layout design. [Overview](https://decapcms.org/docs/intro/), [file collections](https://decapcms.org/docs/collection-file/). |
| Platform-native visual editing, e.g. Webflow | A separately scoped rebuild/platform decision for owners needing on-canvas editing. Webflow documents a content-editor role for copy/media/CMS edits with design restrictions. Account/plan/seat, hosting, export portability, permissions and maintenance implications need a current project-specific quote and proof-of-concept; existing custom files do not automatically gain this editor. [Official editor documentation](https://help.webflow.com/hc/en-us/articles/33961251014931-Edit-site-content-as-a-content-editor). |

Recommendation: retain source-code delivery now and ask frequent self-editors to raise the need before booking. No default CMS conversion, price or availability claim. Later owner input: examples of desired edits, frequency, who publishes, acceptable review process, account/hosting preference and budget.

Proposed business gate: consider a bounded pilot only after at least three distinct qualified buyers identify frequent self-editing as a material requirement, or one qualified buyer funds a specific pilot. This is an owner planning threshold, not market validation. Before offering broadly, demonstrate text/image update → preview → authorized approval → publish → rollback with a nontechnical participant, and confirm actual recurring costs, access revocation, backups/recovery, handoff and support responsibilities. No pilot is run now.

## Recorded demand evidence

`.runtime/operations/weekly-board.json` does not exist in this checkout. `operations/weekly-board.json` identifies itself as a blank template. Therefore recorded qualified lead count is **unknown/unavailable**, not zero leads for the business. There is no local private-board evidence sufficient to justify a new offer, conversion baseline or quantified demand conclusion. Only existence/aggregate-count logic was used; no private messages or PII were printed or changed. Evidence: `evidence/conversion-improvements-20261028/research/lead-counts.json`.

Completion status: #18 research attempted and limits documented; actual field measurements deferred pending public access/data. #19 protocol prepared, human testing skipped. #20 options assessed, demand-dependent pilot/offer skipped. Do not describe these three real-world activities as completed tests or launched capabilities.
