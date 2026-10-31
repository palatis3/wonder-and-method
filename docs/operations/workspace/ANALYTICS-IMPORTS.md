# Connected analytics and search observations

`worker/workspace/analytics/` implements GA Analytics Admin/Data v1beta and
Search Console Sites/Search Analytics v3 plus URL Inspection v1. Only existing
`analytics.readonly` and `webmasters.readonly` grants are used. POST report and
inspection requests are reads. No tags, key events, site registrations, indexing
requests or provider configuration are changed by these adapters.

Enable background reads with `ANALYTICS_ENABLED=true` after qualifying the existing
Google OAuth client, encrypted integration key ring, Supabase machine credential
and independent recovery-control store. Exact properties/sites are first verified
through the existing connection binding. A current reports operator registers
numeric GA stream IDs, exact hostnames, approved event names, fixed profiles and
scope/consent evidence. Shared properties always receive the mandatory stream AND
host filter; optional event restrictions cannot replace it. Search Console keeps
the exact URL-prefix or `sc-domain:` identity. Distinct properties are never added
together as an overlapping total.

The operator can queue daily reads or enable daily collection of the previous
14 source-calendar days. This is a correction policy, not a guarantee of permanent
finality. Automatic reads stage immutable observations; an operator reviews the
exact digest to queue publication. A fresh native API access/configuration probe
precedes publication, and a current authenticated publishing session, local grant,
credential consent, account binding and recovery generation are checked again.
If those checks change, the previous published partition stays current.

GA uses fixed daily, acquisition, landing-page, agreed-event and separate revenue
profiles. Property metadata and exact compatibility must support the requested
profile. Numeric strings retain arbitrary integer/decimal precision; restricted
metrics returning HTTP 200/zero remain unavailable. Response restrictions, sampling,
privacy thresholds, grouped-other loss, truncation and unfamiliar metadata remain
visible. Deterministic pagination checks headers, counts and duplicate dimension
keys. The API offers no snapshot token, so even validated pages are labeled as
observed across separate requests. Empty rows do not establish zero traffic or
working measurement. Daily active users are never summed into monthly uniques.

Search Console daily total/page/query/device profiles enumerate exposed rows until
a successful empty page. The API's top-row and privacy limits remain explicit.
Headline totals use their own unfiltered profile; detail tables cannot reconstruct
suppressed queries. Camel-case and snake-case incomplete-date/hour metadata are
normalized; contradictory markers fail validation. Source dates remain in
America/Los_Angeles, separate from a GA property's calendar. Date boundaries use
named-zone calendar arithmetic and pass 23/25-hour DST cases.

A canonical scope key binds provider, exact resource, calendar/currency and filter
sets. Reauthorizing the same scope replaces its current partition across binding
IDs. Changing the stream/filter scope creates an explicit separate series. In one
transaction, publication switches a whole partition to a newer observation;
removed rows disappear from current data, older imports remain immutable, and a
late older job cannot replace a newer one. Existing published narrative reports
retain their original metric snapshots and receive the existing correction flag.
Automatic source series cannot be overwritten through a CSV promotion.

Private raw request/response receipts are hashed, bounded and append-only. Normalized
page manifests cover the complete captured result. Collection and publication
attempt generations keep their read receipts separate. The UI loads 20 observations
per ordinal page and at most 10 sample rows per observation. Full manifests remain
authorized records; full raw/normalized pages are retained for scoped exports.
Per-response raw limits, dimension-key memory budgets and maximum daily result
sizes fail explicitly rather than certifying an incomplete result.

URL Inspection verifies containment and stores the indexed-version observation.
It is not a live availability/indexability test or an indexing request. Missing
fields remain unavailable. Publishing an inspection rechecks the actual inspection
endpoint rather than assuming Sites API access proves inspection access.

Credential refresh uses the shared encrypted credential row with its current
version and a single nonce. A lost/failed refresh enters reauthorization; no blind
rotating-token replay occurs. Quota/transient failures leave prior data intact and
defer automatic correction reads. Scheduled work isolates independent classes so
one failure cannot prevent unrelated STOP/payment/correspondence processing; the
cron invocation still fails when a class throws. Independent heartbeat/backlog
qualification remains release work.

The software tests establish parsing, scope, local authority and state transitions.
They do not establish actual Google account permission, quota, working consent/tag
behavior, successful inquiry measurement, or live Data/Search API response behavior.
Qualify each configured profile, stream, exact property/site, metric restriction,
calendar, end-to-end measurement outcome and correction with controlled accounts
before enabling production collection. Native basic-measurement setup remains a
separately authorized human setup/check workflow, not a write permission invented
by this read adapter.

Sources: [GA response metadata](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/ResponseMetaData),
[restricted metric behavior](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/MetricMetadata),
[Search Analytics rows and limits](https://developers.google.com/webmaster-tools/v1/searchanalytics/query).
Dot's complete researched contracts and failure exercises are in
`ANALYTICS-REVIEW.md`.
