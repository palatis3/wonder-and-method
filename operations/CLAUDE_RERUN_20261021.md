# October 21 follow-up clarity and reliability work

This revision implements the owner's approved follow-up plan for 145 current
recommendations and six supplemental recommendations. The private implementation
ledger records each decision, evidence and remaining owner-dependent work.
Recommendations that would remove useful county content, conceal commercial
conditions, invent proof or silently change historical agreements were adjusted.

The site retains 286 routes, 285 sitemap URLs, 217 county pages, 23 guides, typed
municipality directories, old bookmarks and downloads. The per-county preservation
inventory compares questions, useful tasks, directory items, source links and
download destinations with the previous release. Shorter summaries use disclosures
and links where helpful; total word counts do not fall on every page because
buying conditions and form guidance remain explicit.

Shared offer summaries and guide plan lists keep current quantities and monthly
allowances distinct from build review rounds. The Baseline fee conditions remain
at buying points. Native and JavaScript forms preserve entered fields, selections,
county-page provenance and recovery paths. Proposal approval still precedes payment.
The cost and ROI calculators distinguish empty inputs, zero costs, entered totals
and upward-rounded break-even displays.

The motion controls, reduced-motion treatment and original films remain. Focus,
short-screen menus, breadcrumbs, guide cards and Work images have targeted layout
changes. Work screenshots come from the current rendered site and fictional demo
controls. The build prunes only reviewed, unreferenced emitted assets; source art,
article images, films, fonts, licenses, archives and downloads remain. Font and CSS
decisions use measured loading and state review; no automated unused-style purge
or new Worker compression layer is introduced.

County and guide language has a report-only editorial review with contextual
exceptions. Its candidate count is not a quality score or a banned-word gate.
Article dates and descriptions reflect reviewed content; recursively sorted
metadata prevents serialization-only changes from creating false update dates.
The older two-fix record distinguishes its original work date from current
verification and current fingerprints.

## Operational attention and release

Migration `0017_operation_attention.sql` is additive. It stores fixed submission
failure codes/counts and retention-review metadata without altering inquiry rows,
contact dates, delivery leases or deletion safeguards. Back up D1, record the
compatible previous Worker and inspect applied migrations before applying it.
Do not drop the new table on rollback.

`INQUIRY_FAILURE_RATE_LIMITER` bounds independent alert attempts per Cloudflare
location; it is approximate, not a strict global limit. Unsampled fixed-code logs
remain enabled. Three distinct receiver secrets are required: existing delivery,
submission failures and retention attention. Do not print their values.

Submission is a fail-only latch with automatic resume on incoming pings. Retention
uses an hourly heartbeat with day-80 advance attention. Both use the existing owner
alert integration. Follow [INQUIRY_HEALTH.md](INQUIRY_HEALTH.md), including the guarded
submission re-arm procedure and fresh status after acknowledgement. HTTP 200 is
not incident closure or mailbox receipt. A simultaneous database/receiver outage
still requires independent log review; this design does not guarantee durable
alert delivery.

Commissioning uses labeled, isolated local dependency fixtures with only one
empty-body receiver request allowed. It must separately record transport
acknowledgement, dashboard state and actual owner-mailbox receipt. No production
form, inquiry database or notification provider is used for these tests. Before
binding a new hourly check to production, keep it paused to avoid a false missing
schedule alert. After deployment verify a genuine scheduled receipt.

Cloudflare's three additional county rules preserve the seven existing rules,
query strings and method restrictions. See [MEASUREMENT.md](MEASUREMENT.md) for
their exact scope and the distinction between edge and static-asset fallbacks.

Run the required install, build, unit, verifier, browser and deployment checks from
the exact clean pushed commit; then run predeploy and the production release flow.
Keep runtime-version and complete live route/asset parity evidence private. If
rolling back to code without the new hourly retention producer, pause that check
and document the rollback. The existing delivery monitor remains active. Actual
publication identity, scheduled receipts and owner actions belong in the dated
private release record, not an inferred checklist completion.
