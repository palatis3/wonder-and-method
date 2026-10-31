Sent the complete report once to **Build Wonder and Method workflows** for review. Sending was accepted. One read-only check found the main thread active, but **no explicit acknowledgment of this report yet**.

No repository changes, authenticated account calls or provider writes were performed.

**The recommended implementation is a small registry of fixed report profiles, backed by immutable import versions.** The critical traps are restricted GA4 metrics returning successful zero values, Search Console returning only exposed top rows, non-atomic pagination, and corrected periods being accidentally added twice.

1. **Versions, scopes and tenant binding**

Use these separately:

| Service | API version / path | Existing scope |
|---|---|---|
| Analytics Admin | `v1beta` | `analytics.readonly` |
| Analytics Data | `v1beta` | `analytics.readonly` |
| Search Console Sites/Search Analytics | `/webmasters/v3` | `webmasters.readonly` |
| URL Inspection | `/v1/urlInspection/index:inspect` | `webmasters.readonly` |

The observed public discovery revisions were Admin `20261027`, Data `20261028` and Search Console `20261028`. These identify inspected schemas; they do not pin an immutable backend release. Search Console’s discovery version is `v1` despite its retained `/webmasters/v3` paths. [Admin discovery](https://analyticsadmin.googleapis.com/$discovery/rest?version=v1beta), [Data discovery](https://analyticsdata.googleapis.com/$discovery/rest?version=v1beta), [Search Console reference](https://developers.google.com/webmaster-tools/v1/api_reference_index).

Use bearer authorization headers. The reporting, compatibility and inspection POSTs below are read operations. Do not add configuration mutations, Measurement Protocol events, sitemap submissions or Indexing API calls.

GA discovery:

```http
GET https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200
GET https://analyticsadmin.googleapis.com/v1beta/properties/123
GET https://analyticsadmin.googleapis.com/v1beta/properties/123/dataStreams?pageSize=200
```

Follow `nextPageToken` until absent, even after a short page. Preserve other parameters. Account summaries return accessible properties; `canEdit:false` does not prevent reporting. Property readback supplies currency, timezone, service level, account, property type and deletion state. A numeric property ID is distinct from a `G-...` measurement ID. Stream records supply the numeric stream ID, type, measurement ID and possibly an empty `defaultUri`. None proves exclusive tenant ownership. [Account discovery](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/accountSummaries/list), [property lookup](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties/get), [stream pagination](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.dataStreams/list), [stream fields](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.dataStreams).

Search Console discovery:

```http
GET https://www.googleapis.com/webmasters/v3/sites
GET https://www.googleapis.com/webmasters/v3/sites/{encoded-exact-siteUrl}
```

Example:

```json
{
  "siteEntry": [
    {
      "siteUrl": "sc-domain:example.com",
      "permissionLevel": "siteFullUser"
    }
  ]
}
```

`sites.list` has no documented pagination. Keep domain properties, protocols, hosts, paths and trailing slashes distinct. Roles include owner, full, restricted and unverified users. An owner can be delegated; read integration need not require ownership when delegated access works. Verify each intended operation rather than assuming a role guarantees every capability. [Sites list](https://developers.google.com/webmaster-tools/v1/sites/list), [site lookup](https://developers.google.com/webmaster-tools/v1/sites/get), [role values](https://developers.google.com/webmaster-tools/v1/sites), [ownership distinction](https://support.google.com/webmasters/answer/7687615).

Store a local binding containing:

```text
tenant_id, connection_id, principal_id, connection_generation,
exact_property_or_site, approved_stream_ids, intended_domains,
authorized_selector, verification_evidence, verified_at
```

Never expose an agency principal’s entire discovery list to every tenant. A shared GA property needs an explicitly approved stream/host boundary applied to every profile; otherwise reject the binding. Reporting filters are not provider ACLs. Overlapping Search Console domain/prefix properties must not have their totals added together.

`analytics.readonly` cannot enumerate GA access bindings: that requires `analytics.manage.users.readonly` or `analytics.manage.users`. Existing scope permits operational readback, not a complete ACL audit. [Access-binding scope](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/properties.accessBindings/list).

2. **Fixed GA4 report contracts**

Read property-specific schema and check each profile:

```http
GET https://analyticsdata.googleapis.com/v1beta/properties/123/metadata
POST https://analyticsdata.googleapis.com/v1beta/properties/123:checkCompatibility
```

For compatibility, send the same dimensions, metrics and filters as the report, without dates or pagination. Use the actual property’s metadata, not `properties/0`, for restrictions and custom definitions. Incompatibility is an explicit profile error; do not silently drop metrics. [Metadata](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/getMetadata), [compatibility](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/checkCompatibility).

Suggested minimum registry:

| Profile | Dimensions | Metrics |
|---|---|---|
| `ga_daily_v1` | `date` | `sessions`, `engagedSessions`, `activeUsers`, `eventCount`, `keyEvents` |
| `ga_acquisition_daily_v1` | `date`, `sessionDefaultChannelGroup` | `sessions`, `engagedSessions`, `keyEvents` |
| `ga_landing_daily_v1` | `date`, `landingPage` | `sessions`, `engagedSessions`, `keyEvents` |
| `ga_events_daily_v1` | `date`, `eventName` | `eventCount`, `keyEvents` |
| `ga_revenue_daily_v1` | `date` | `totalRevenue` |

Use approved event-name filters for the event profile. Qualify revenue separately so revenue restrictions do not suppress otherwise usable traffic reporting. These fields are documented; the combinations still need property-specific compatibility and live qualification. [Dimension/metric catalog](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema).

Example read request:

```http
POST https://analyticsdata.googleapis.com/v1beta/properties/123:runReport
Authorization: Bearer <existing token>
Content-Type: application/json
```

```json
{
  "dateRanges": [
    {"startDate": "2026-10-28", "endDate": "2026-10-28"}
  ],
  "dimensions": [{"name": "date"}],
  "metrics": [
    {"name": "sessions"},
    {"name": "engagedSessions"},
    {"name": "activeUsers"},
    {"name": "eventCount"},
    {"name": "keyEvents"}
  ],
  "dimensionFilter": {
    "filter": {
      "fieldName": "streamId",
      "stringFilter": {
        "matchType": "EXACT",
        "value": "456",
        "caseSensitive": true
      }
    }
  },
  "orderBys": [
    {
      "dimension": {
        "dimensionName": "date",
        "orderType": "ALPHANUMERIC"
      },
      "desc": false
    }
  ],
  "offset": "0",
  "limit": "10000",
  "keepEmptyRows": true,
  "returnPropertyQuota": true
}
```

For multiple streams use `inListFilter`. Combine mandatory stream/host restrictions and optional event restrictions through `andGroup.expressions`. Optional filters must never replace the mandatory scope. Add ascending order entries for every requested dimension. [Report method](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport), [filters](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/FilterExpression), [ordering](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/OrderBy).

Illustrative response shape:

```json
{
  "dimensionHeaders": [{"name": "date"}],
  "metricHeaders": [{"name": "sessions", "type": "TYPE_INTEGER"}],
  "rows": [
    {
      "dimensionValues": [{"value": "20261028"}],
      "metricValues": [{"value": "100"}]
    }
  ],
  "rowCount": 1,
  "metadata": {
    "currencyCode": "USD",
    "timeZone": "America/New_York"
  }
}
```

That illustrates a single-metric response, not a live observation. Match actual headers and row lengths to the requested profile. `rowCount` describes the whole result, not the current page. Keep response `totals`, `maximums` and `minimums` separate from detail rows. [Response schema](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/RunReportResponse), [row values](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/Row).

Use a fixed page size; the documented maximum is 250,000. Collect the entire `rowCount`. Unexpected empty/short pages, changing counts, duplicate keys or changing configuration invalidate collection. Restart the partition rather than mixing pages into a published period.

No documented snapshot token makes separate `runReport` pages atomic. Stable ordering and unchanged counts help detect problems but cannot prove a consistent snapshot. Prefer daily, narrow profiles. [Pagination](https://developers.google.com/analytics/devguides/reporting/data/v1/basics).

3. **Parsing and truthful result states**

Preserve raw metric strings. Parse integer types with arbitrary precision and other numeric types with decimal arithmetic. Currency values are report-currency units, not cents or Ads micros. Durations follow the supplied type; rates are fractions. Missing, null or invalid metric values must not become zero. Preserve `(not set)`, `(other)` and empty dimension values distinctly. [Metric types](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/MetricType).

**GA4 can return HTTP 200 and zero values for forbidden metrics.** Inspect `MetricMetadata.blockedReasons`, including `NO_REVENUE_METRICS` and `NO_COST_METRICS`, plus response restrictions. Those values mean restricted/unavailable, not measured zero revenue. Filters on blocked metrics can fail. [Metric restrictions](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/MetricMetadata).

Preserve each page’s:

```text
metadata.dataLossFromOtherRow
metadata.samplingMetadatas[]
metadata.subjectToThresholding
metadata.schemaRestrictionResponse.activeMetricRestrictions[]
metadata.dataTruncationReasons[]
metadata.emptyReason
metadata.currencyCode
metadata.timeZone
```

Sampling metadata includes counts for computing the sampled fraction. Thresholding being applicable does not reveal an exact missing-row count. Other-row loss can remain flagged when filters hide the visible `(other)` row. Unknown future flags must survive normalization. [Response metadata](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/ResponseMetaData).

Recommended independent state axes:

```text
transport: success | auth_expired | permission_denied |
           quota_deferred | provider_error

collection: complete_api_result | incomplete_pages |
            non_atomic_observation

quality flags: sampled | thresholded | aggregated_other |
               truncated | restricted | top_rows | privacy_omissions

freshness: provisional | provider_final | observed_at

value: observed_number | observed_zero | no_reported_row | unavailable
```

An empty successful result establishes no reported rows, not a functioning tag or absence of visitors. `keepEmptyRows` does not manufacture events never recorded. Preserve last good data as visibly stale after a failed refresh.

Do not sum daily active users into monthly unique users or average percentages without valid weights. Obtain nonadditive period metrics from a separately qualified period report. GA unique counts can be estimates, and dimensions/reporting identity affect results. [Reporting expectations](https://developers.google.com/analytics/devguides/reporting/data/v1/reporting-data-expectations).

4. **Search Console query contracts**

Minimum profiles:

| Profile | Dimensions | Aggregation |
|---|---|---|
| `sc_daily_total_v1` | `date` | `byProperty` |
| `sc_daily_pages_v1` | `date`, `page` | `auto` |
| `sc_daily_queries_v1` | `date`, `query` | `byProperty` |
| `sc_daily_device_v1` | `date`, `device` | `byProperty` |

Keep the headline profile free of page/query filters. Start with `web`; each additional search type is a separate named series.

```http
POST https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Aexample.com/searchAnalytics/query
```

```json
{
  "startDate": "2026-10-28",
  "endDate": "2026-10-28",
  "dimensions": ["date"],
  "type": "web",
  "aggregationType": "byProperty",
  "dataState": "final",
  "rowLimit": 25000,
  "startRow": 0
}
```

Illustrative response:

```json
{
  "rows": [
    {
      "keys": ["2026-10-28"],
      "clicks": 12,
      "impressions": 100,
      "ctr": 0.12,
      "position": 4.2
    }
  ],
  "responseAggregationType": "byProperty"
}
```

A page drilldown may add this fragment:

```json
{
  "dimensionFilterGroups": [{
    "groupType": "and",
    "filters": [{
      "dimension": "page",
      "operator": "equals",
      "expression": "https://example.com/service/"
    }]
  }],
  "aggregationType": "auto"
}
```

Do not combine page grouping/filtering with `byProperty`. No client-selected sort is documented. Results use clicks or date ordering with arbitrary ties. Dates are inclusive; metrics are JSON numbers, and CTR is a fraction. [Query contract](https://developers.google.com/webmaster-tools/v1/searchanalytics/query).

Validate key order and returned aggregation. Combine CTR using clicks/impressions only across compatible, nonoverlapping buckets; a zero denominator is undefined. Do not reconstruct headline totals from truncated details or average position without valid weighting. Property/page aggregation measures different things. [Aggregation semantics](https://support.google.com/webmasters/answer/17011364), [metric meanings](https://support.google.com/webmasters/answer/7576553).

Page with `startRow=0,25000,50000…` until a successful empty response, retaining page hashes and terminal evidence. There is no `rowCount` or continuation token. Google documents at most 50,000 exposed rows per day/search type. Completion means **all exposed rows enumerated**, not exhaustive underlying data. Detect duplicate/conflicting keys; never sum duplicates. [Retrieval limits](https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data).

Privacy-suppressed queries may contribute to unfiltered totals while remaining absent from query rows. Query filters also affect privacy inclusion. Keep independent headline totals and label detail reports as top-row reports. [Privacy limitations](https://support.google.com/webmasters/answer/17011259).

For freshness diagnostics, query recent dates with `dataState:"all"`; normal historical profiles use `"final"`. Hourly reporting, if enabled later, needs its own `hour`/`hourly_all` profile.

**Current documentation conflict:** discovery names freshness fields `firstIncompleteDate` and `firstIncompleteHour`; method prose uses `first_incomplete_date` and `first_incomplete_hour`. Normalize both, retain original JSON, and reject contradictory simultaneous values. Discovery uses uppercase enums while method examples use lower/camelcase. Qualify the chosen serializer against the endpoint. Some discovery date descriptions still say fixed PST; current method and dimension descriptions specify Pacific time with DST. Use `America/Los_Angeles`. [Current discovery](https://www.googleapis.com/discovery/v1/apis/searchconsole/v1/rest).

5. **Dates, freshness and corrected periods**

GA daily boundaries follow the property timezone, including DST. Timezone changes affect future data, so the current setting cannot reconstruct unknown historical changes. Record configuration snapshots. Use absolute dates throughout an import. Preserve response currency and prevent silent mixed-currency aggregation. [Property settings](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties), [date ranges](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/DateRange).

Use calendar arithmetic rather than adding 86,400 seconds. GA New York and Search Console Los Angeles rows bearing the same date represent different windows. Daily aggregates cannot be perfectly rebucketed afterward.

GA processing can take 24–48 hours; key-event attribution credit can change for up to 12 days. Suggested local policy: reread the preceding 14 days daily, with periodic older checks and explicit backfills. This is a correction policy, not a permanence guarantee. [GA freshness](https://support.google.com/analytics/answer/11198161).

Search Console `final` identifies the requested provider data state, not an immutable business fact. Missing recent dates remain “no reported data,” with observed coverage and fetch time. Do not infer finality from absent metadata on a query that lacks the required date grouping.

6. **Measurement and conversion-definition evidence**

```http
GET https://analyticsadmin.googleapis.com/v1beta/properties/123/keyEvents?pageSize=200
```

Follow pagination. Store resource name, event name, creation time, counting method, optional default value/currency and a definition hash. Counting methods distinguish once per event from once per session. [List key events](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.keyEvents/list), [definition schema](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.keyEvents).

Maintain separate states:

```text
configured
observed_in_period
end_to_end_verified
```

Pair definitions with the fixed event profile for required business events. A tag, count or configured default value does not prove consent behavior, deduplication, successful inquiry delivery, business value or lead quality. Those need a separately authorized controlled measurement exercise. Do not generate fake production events through this read adapter.

Additional configuration evidence is readable with the existing scope through separately pinned Admin `v1alpha` endpoints:

```http
GET https://analyticsadmin.googleapis.com/v1alpha/properties/123/attributionSettings
GET https://analyticsadmin.googleapis.com/v1alpha/properties/123/reportingIdentitySettings
```

Store snapshots or explicit unavailability. [Attribution read](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/properties/getAttributionSettings), [reporting identity read](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/properties/getReportingIdentitySettings).

```http
GET https://analyticsadmin.googleapis.com/v1beta/properties/123/googleAdsLinks?pageSize=200
```

A link supports account mapping, but does not establish Ads conversion actions, bidding goals, counting windows or campaign configuration. Verify those with the separate Ads adapter; keep GA key events and Ads conversion metrics distinct. [Ads links](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.googleAdsLinks/list), [key events versus conversions](https://support.google.com/analytics/answer/13965727).

7. **URL Inspection remains separate**

```http
POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect
```

```json
{
  "inspectionUrl": "https://example.com/service/",
  "siteUrl": "sc-domain:example.com",
  "languageCode": "en-US"
}
```

Check tenant binding and property containment first. This read method supports `webmasters.readonly`. It describes Google’s indexed version; it neither tests the live URL nor requests indexing. [Inspection method](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect).

Store the requested URL/site, fetch time, inspection link and returned index fields:

```text
verdict, coverageState, robotsTxtState, indexingState,
pageFetchState, lastCrawlTime, googleCanonical,
userCanonical, crawledAs, sitemap, referringUrls
```

Missing fields are not success. Keep enum facts separate from localized text. Sitemaps are not exhaustive; optional AMP/rich-result sections can be absent; mobile usability is deprecated. [Response contract](https://developers.google.com/webmaster-tools/v1/urlInspection.index/UrlInspectionResult).

`PASS` does not prove ranking, present website health or indexing of a new deployment. The result-type prose mentions live inspection, but the actual method explicitly disallows it. Do not invent a live flag or issue Indexing API writes.

8. **Quotas and retry behavior**

GA Data Core limits currently documented:

| Limit | Standard | 360 |
|---|---:|---:|
| Tokens/property/day | 200,000 | 2,000,000 |
| Tokens/property/hour | 40,000 | 400,000 |
| Tokens/project/property/hour | 14,000 | 140,000 |
| Concurrent/property | 10 | 50 |
| Server errors/project/property/hour | 10 | 50 |

Use returned quota state. Query complexity affects consumption; 500/503 consume server-error quota. Daily reset documentation says midnight PST; hourly replenishment is not necessarily on the hour. [Data quotas](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas).

Admin allows 1,200 requests/minute overall and 600/minute/user. [Admin quotas](https://developers.google.com/analytics/devguides/config/admin/v1/quotas).

Search Analytics allows 1,200 QPM/site and /user, plus project limits of 40,000 QPM and 30 million QPD. Separate load budgets have no published numeric allowance; short-term exhaustion guidance is to wait 15 minutes. URL Inspection allows 2,000/day/site and 600/minute/site, with separate project limits. [Search Console quotas](https://developers.google.com/webmaster-tools/limits).

Implement central budgets across tenants sharing a principal/resource, modest concurrency and bounded jittered backoff. Distinguish structured quota/API-disabled 403 errors from permission denial. Refresh a 401 once through existing serialized OAuth handling; invalid grants require reconnect.

Retrying a read does not repeat an external business mutation, but can consume quota and return changed data. Keep attempts separate and never append duplicate pages. Preserve stale last-good results.

9. **Append-only import and publication**

Minimal typed operations:

```text
discoverGaResources(connectionId)
verifyGaBinding(bindingId)
fetchGaProfile(bindingId, profileVersion, absoluteRange)

discoverScSites(connectionId)
verifyScBinding(bindingId)
fetchScProfile(bindingId, profileVersion, day)
inspectBoundUrl(bindingId, approvedUrl)

publishValidatedImport(importId, expectedCurrentVersion)
```

Callers select registered bindings/profiles, not arbitrary tokens, URLs or resource IDs.

Each import records tenant/binding generation, API/schema/adapter/profile versions, canonical request, calendar/currency, configuration hashes, collection ordinal/times, raw page hashes/private references, typed rows, quality/coverage state and replacement lineage. Never retain access tokens in provenance. Treat page/query content as private untrusted data.

Partition identity:

```text
tenant + exact resource/binding scope + profile version +
date/range + calendar/currency + aggregation/search type
```

Add the dimension tuple for row identity. Enforce import-local uniqueness.

Publication protocol:

1. Reserve an import ordinal and binding/configuration generation.
2. Fetch pages into private staging.
3. Validate coverage, types, keys and metadata; recheck current binding.
4. Seal raw and normalized hashes.
5. In one local transaction, lock the partition, verify eligibility and append a publication/replacement fact while switching its current-import pointer.
6. Readers select one published version per partition.

An older job finishing late cannot replace a newer publication. Failed/partial imports cannot replace good data with zeros. A correction replaces the whole partition—including removal of formerly present rows—rather than adding another increment. Preserve earlier imports and published report editions.

There is no documented atomic snapshot spanning Admin configuration, report pages and URL Inspection. Before/after reads detect some changes; they cannot certify all intervening history.

10. **Failure exercises and actual qualification**

Required deterministic fixtures:

- Short discovery page with a continuation token; repeated-token loop.
- Wrong tenant/property and overlapping Search Console properties.
- Permission revoked between staging and publication.
- GA HTTP 200, zero revenue and a revenue restriction.
- Huge integers, decimals, missing values, changed headers and malformed rows.
- Changing GA row counts, duplicate pages and unexpected empty middle pages.
- Sampling, thresholding, truncation and unknown quality enums.
- Search Console 25,000 + 25,000 + empty: exposed enumeration succeeds, exhaustive-data claim remains prohibited.
- Both freshness-field spellings, plus conflicting values.
- Query-detail totals differing from headline totals.
- DST transitions and timezone/currency changes.
- Correction from 100 to 95, including row removal: result must be 95, not 195.
- Old imports completing after new publication or connection-generation change.
- Refresh races, denied/quota/API-disabled errors, 429 and repeated 503.
- Changed key-event definitions and a tag firing without successful lead delivery.
- Old inspection results, absent crawl timestamps and canonical disagreement.
- Worker crash after page capture or publication commit.
- Report/export access after tenant membership revocation.

Later authorized live qualification must establish enabled APIs, production-appropriate existing OAuth grants, exact property/site permissions, working profiles, complete collection evidence, actual restriction handling, UI comparisons under identical settings and known measurement outcomes. Synthetic fixtures cannot establish real access or valid measurement. No such qualification occurred here. [GA setup](https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart), [Search Console authorization](https://developers.google.com/webmaster-tools/v1/how-tos/authorizing).

The direct Search Console discovery URL was inaccessible through the browsing tool; Google’s alternate official discovery route worked. Documentation discrepancies remain around Search Console casing/date descriptions and filter case behavior, plus URL Inspection’s broader result-type prose. Preserve raw responses and qualify those edges. None establishes atomic pagination, exhaustive Search Console detail, permanent GA finality or measurement correctness for the connected accounts.
