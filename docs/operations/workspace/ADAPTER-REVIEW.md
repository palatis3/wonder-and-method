Sent the complete five-platform review once to **“Build Wonder and Method workflows.”** The tool accepted it; the subsequent read did not yet show an acknowledgment of this new review. I did not resend.

No provider operations, edits, account changes, purchases, deployments, new chats or subagents were performed.

The recommendation is **one shared execution interface with five typed provider adapters**, preserving each platform’s native behavior. All five must be operational before acquisition; manual fallback remains a recovery mechanism.

**1. Minimal shared contract**

```ts
interface AdvertisingAdapter<ProviderSpec, ProviderPatch> {
  capabilities(account, apiVersion): CapabilityProfile;
  readAccount(binding): AccountObservation;
  readGraph(roots, cursor?): GraphPage;

  plan(approvedManifest: ProviderSpec, currentGraph): ImmutablePlan;
  validate(plan): ValidationEvidence;

  dispatch(step, attemptPermit): ItemResult[];
  poll(jobBinding): JobObservation;
  readback(bindings, materialFields): ResourceObservation[];
  reconcile(attempt, observations): ReconciliationResult;

  planPause(stopIntent, graph): ImmutablePlan;
  planResume(clearance, approvedManifest, graph): ImmutablePlan;
}
```

`ProviderSpec` and `ProviderPatch` must be discriminated unions for Google, Meta, Microsoft, TikTok and LinkedIn. Each declares supported objectives/formats, allowed changes, immutable fields, dependency rules, endpoint version and required readback.

Do not expose arbitrary provider URLs or unrestricted request bodies. A generic `update({status:"active", budget:100})` loses essential semantics.

Every step needs:

```text
operation_id, attempt_id, organization_id
provider, environment, exact account_binding
resource_kind, resource_binding OR local_create_key
desired_digest, approval_id/domain/version
budget_authorization_id/period
recovery_generation, stop_epoch, lease_generation
credential_ref, changed_fields, expected_prior_material_digest
```

Keep spending accounts separate from manager/Business Center context. Store identifiers as opaque strings, preserving 64-bit IDs, URNs and complete resource names.

Per-item results should distinguish:

```text
rejected
accepted_pending
succeeded_unverified
verified
failed
unknown
```

Each result retains its local step ID, request index, returned resource/parent IDs, diagnostic request ID, job ID, native errors, retry guidance and evidence reference.

A successful HTTP envelope or completed job does not establish whole-operation success. Persist each returned binding and outcome before scheduling dependent work. Missing items remain unresolved.

**2. Preserve four separate status observations**

| Observation | Meaning |
|---|---|
| Configured | The native writable state requested for this resource |
| Effective/inherited | Parent state and other hierarchy constraints |
| Review/eligibility | Policy review, processing, billing, schedule or budget restrictions |
| Delivery | Actual measured impressions/spend, with window, source and freshness |

Retain raw native enums and reason arrays. Derived labels must not discard them.

Examples:

- “Configured enabled; parent paused.”
- “Configured enabled; creative under review.”
- “Eligible; no delivery observed in this reporting window.”
- “Pause observed; earlier change still being checked.”

Unknown values must not default to active or paused. Zero impressions do not prove pause. Delayed reporting of pre-pause spend does not automatically establish post-pause drift.

Graph reads need pagination, account binding, inventory coverage and observation timestamps. They generally are not atomic snapshots across resources. Repeat relevant reads when parents or inventory change.

Resuming a parent may enable forgotten descendants. Enumerate the affected graph and verify the exact intended-enabled set. Never enable an unrelated parent merely to make a child runnable.

**3. Budget and execution rules**

Represent money with exact decimal/integer values, explicit currency, native unit and tested conversion rules. Represent budgets with their owning resource, daily/lifetime/shared/total semantics, reset interval, schedule timezone and all consumers.

Do not assume:

- Every provider uses cents.
- Every budget resets at UTC midnight.
- A daily budget is a hard spend ceiling.
- Account, campaign, searcher and reporting timezones are identical.
- Released budget is available while the corresponding remote operation remains unknown.

Cross-platform allocation changes are not atomic. Preserve reservations until the source-side uncertainty is resolved.

Build resource graphs in an inert state where the native campaign family supports it. Verify settings, creative identities, tracking, placements and automatic expansion before separately authorized activation.

If a native product cannot be created inert, classify creation as a positive activation and qualify that workflow explicitly. Never silently fall back to enabled creation.

Updates should be allowlisted typed patches. An immutable objective or format change becomes a replacement plan. Compare provider readback—including defaults and substitutions—to the approved material settings.

Disable automatic SDK retries for mutations unless the endpoint’s retry behavior is established.

**4. STOP and resume across five platforms**

STOP remains a durable operation scoped to exact provider/accounts:

1. Increment each scope’s STOP epoch.
2. Fence queued positive work.
3. Link older attempts and asynchronous jobs capable of changing serving state.
4. Pause the highest exclusively managed parent covering the intended targets; otherwise pause only authorized resources.
5. Read back affected controls and hierarchy.
6. Reconcile late results, bind newly discovered resources and pause again if necessary.

Confirm STOP only when:

- Inventory coverage is sufficient.
- Relevant older attempts can no longer produce unresolved positive effects.
- A later readback establishes blocking controls across the intended set.

An observed pause is insufficient while an older enable/create/copy can finish later. Lease expiry, client timeout and local cancellation do not cancel a provider’s accepted work.

All-channel STOP is a fan-out operation. Show five separate outcomes. Four successful providers plus one inaccessible account means the aggregate STOP remains incomplete.

Resume requires current clearance referencing the active stop intent/epoch, fresh account rights and budget authority, current approval, and verified material configuration. Preserve independently paused descendants. A stale resume cannot clear a newer STOP.

**5. Google Ads adapter**

Use explicit typed branches for campaign channel/subtype, budget resource, bidding strategy, conversion goals, targeting, ads/assets and automation settings. Search ad groups and Performance Max asset groups require different resource graphs.

The examined v24 schema separates `status`, `primary_status`, `primary_status_reasons` and `serving_status`; primary status can lag changes. Preserve policy evidence separately and pin a supported version rather than assuming identical fields across releases. [Google campaign fields](https://developers.google.com/google-ads/api/fields/v24/campaign)

Use field masks and supported validation facilities. Preserve budget micros exactly. Request IDs are diagnostic; this review established no general create-idempotency guarantee. A timed-out create remains unknown until exact resources are reconciled. [Mutation guidance](https://developers.google.com/google-ads/api/docs/mutating/best-practices)

`BatchJobService` is asynchronous, ordinarily uses partial failures, and does not roll back successes when another operation fails or a job is cancelled. Persist job identity, operation indices and dependencies; retrieve results before readback. Emergency pause should not wait behind a large positive job. [Batch processing](https://developers.google.com/google-ads/api/docs/batch-processing/overview)

Qualification requires the correct OAuth principal, production Cloud-project access/permissible use, customer hierarchy and actual permissions. Google currently assigns access to the Cloud project following the September 2026 developer-token sunset. Test accounts do not serve or bill. [Access requirements](https://developers.google.com/google-ads/api/docs/api-policy/access-levels), [test accounts](https://developers.google.com/google-ads/api/docs/best-practices/test-accounts)

Required deterministic tests:

| ID | Fixture and expected result |
|---|---|
| G1 | A succeeds, B fails: retain A’s binding; no full-package enable |
| G2 | Cancelled batch already enabled one campaign: reconcile and pause that campaign |
| G3 | Timed-out create is initially absent, then appears: no blind recreation |
| G4 | Enabled configuration with limited/review state: preserve restrictions; no delivery claim |
| G5 | Shared budget includes unmanaged consumer: reject or require broader approved scope |
| G6 | Readback introduces unapproved automation: activation blocked by material mismatch |

**6. Meta Facebook/Instagram adapter**

Model:

```text
AdAccount → Campaign → AdSet → Ad → Creative
```

Typed extensions include Page/Instagram identity, objective, buying type, special categories, budget ownership, optimization/billing event, placements, targeting, promoted object, measurement, attribution and creative automation.

Facebook and Instagram placements share the Meta account graph; do not create competing budget ledgers.

Official SDK definitions expose configured/effective state and parent IDs. Ad effective states include parent pauses, pending review, disapproval and processing. Retain review feedback and exact creative bindings. [Campaign model](https://raw.githubusercontent.com/facebook/facebook-python-business-sdk/main/facebook_business/adobjects/campaign.py), [ad-set model](https://raw.githubusercontent.com/facebook/facebook-python-business-sdk/main/facebook_business/adobjects/adset.py), [ad model](https://raw.githubusercontent.com/facebook/facebook-python-business-sdk/main/facebook_business/adobjects/ad.py)

Use pinned Graph-version create/update/read operations, with explicit paused creation where supported. Creative changes may need replacement creative objects and new bindings.

Parse Graph batch subresponses individually. Do not confuse media processing, review, reporting jobs and mutation execution. No universal create-dedup window was established from accessible official sources. [Official batch implementation](https://raw.githubusercontent.com/facebook/facebook-python-business-sdk/main/facebook_business/api.py)

Qualification requires applicable `ads_management`/read permissions, actual account and Page/Instagram asset rights, token lifecycle, customer-account permission review and required business verification. Permission Advanced Access is distinct from the Marketing API Access Tier, renamed in May 2026 to Limited/Full Access. [Permissions](https://developers.facebook.com/documentation/development/permissions), [Marketing use cases](https://developers.facebook.com/documentation/development/create-an-app/marketing-api-use-cases), [tier changes](https://developers.meta.com/blog/updates-to-ads-management-standard-access-feature/)

Required deterministic tests:

| ID | Fixture and expected result |
|---|---|
| M1 | Active ad under paused ad set: show inherited block; do not enable parent |
| M2 | Parent contains unapproved/new active child: resume blocked pending graph review |
| M3 | Campaign succeeds, ad set fails, dependent ad fails: separate outcomes |
| M4 | Creative processing → review → rejection: no false serving state |
| M5 | Reads work but mutation/asset permission fails: write readiness remains unqualified |
| M6 | Timed-out create produces same-name candidates: no first-match adoption or blind retry |

Direct Meta object-reference requests returned HTTP 429. Official SDK definitions supplied field evidence, but do not establish all endpoint constraints. The sandbox reference was inaccessible; current coverage still needs verification.

**7. Microsoft Advertising/Bing adapter**

Typed extensions include manager `CustomerId`, spending `CustomerAccountId`/`AccountId`, campaign type, shared `BudgetId` or daily budget, bidding, dates/timezone settings, ad groups, ads, keywords and conversion goals.

Campaign Management v13 provides Add/Update operations and corresponding reads. `AddCampaigns` returns IDs aligned to input positions, with null entries for failures. `PartialErrors` must be matched using their indices, not their array positions. `TrackingId` is diagnostic. [AddCampaigns](https://learn.microsoft.com/en-us/advertising/campaign-management-service/addcampaigns?view=bingads-13)

Update omission/clearing behavior is field-specific. Read actual bidding settings: the documentation describes automatic conversion of legacy Target CPA/ROAS schemes. Approve supported semantic settings rather than ignore substitutions. [UpdateCampaigns](https://learn.microsoft.com/en-us/advertising/campaign-management-service/updatecampaigns?view=bingads-13), [campaign schema](https://learn.microsoft.com/en-us/advertising/campaign-management-service/campaign?view=bingads-13)

Keep ad status and editorial status distinct. Editorial `ActiveLimited` can mean market-specific eligibility. Derive hierarchy blockers with provenance rather than inventing a native `effective_status`. [Ad status](https://learn.microsoft.com/en-us/advertising/campaign-management-service/adstatus?view=bingads-13), [editorial status](https://learn.microsoft.com/en-us/advertising/campaign-management-service/adeditorialstatus?view=bingads-13)

Bulk work is asynchronous and per-record partial. Preserve job and row identity, retrieve result files and parse by schema—not fixed column positions. Never resubmit an entire unknown upload. [Bulk operations](https://learn.microsoft.com/en-us/advertising/guides/bulk-download-upload?view=bingads-13)

Qualification requires Microsoft’s developer token, OAuth app/user and exact account/manager permissions. Google’s token change does not apply here. Sandbox credentials/endpoints are separate; ads do not serve and editorial support is limited. [Microsoft sandbox](https://github.com/MicrosoftDocs/Advertising/blob/main/advertising/bingads-13/guides/sandbox.md)

Required deterministic tests:

| ID | Fixture and expected result |
|---|---|
| B1 | IDs `[A,null,C]`, shuffled error array: bind A/C correctly; fail B only |
| B2 | Header/body account mismatch: reject before network call |
| B3 | Active ad, limited editorial approval, paused campaign: preserve every restriction |
| B4 | Completed bulk upload contains rejected rows: partial result, selective confirmed-failure retry |
| B5 | Provider changes bidding/time semantics: compare material readback |
| B6 | Late bulk enable after STOP: pause again; aggregate STOP remains pending |

**8. TikTok adapter**

Keep campaign families explicit—Manual, Upgraded Smart+ and other qualified families do not share one interchangeable payload.

Typed extensions include advertiser/Business Center, objective, buying type, budget ownership and mode, campaign/ad-group/ad structure, placement, optimization, bid/billing configuration, schedule, pixel/event, identity/Spark authorization, creative processing and destination.

For the examined v1.3 Manual API, campaign create/update/status/read are separate operations. Creation defaults enabled; specify `DISABLE` where supported. Reach & Frequency creation explicitly cannot use that disabled path. Campaign-create `request_id` provides only a **10-second** idempotency window and differs from the response’s diagnostic request ID. Do not extend that guarantee to other endpoints. [TikTok campaign creation](https://business-api.tiktok.com/gateway/docs/index?doc_id=1739318962329602&language=ENGLISH)

Parse the API result code and returned IDs, not HTTP status alone. Preserve `operation_status`, `secondary_status`, review and asset/identity eligibility separately. Pin native budget units, precision, minimums and timezone behavior.

Asynchronous campaign copy is allowlist-only. Preserve `task_id`, poll its result and reconcile new graph bindings. Ordinary typed creation need not depend on copy access. [Campaign copy](https://business-api.tiktok.com/gateway/docs/index?doc_id=1788434533212162&language=ENGLISH)

Qualification requires API for Business—not consumer Login Kit or Content Posting—plus approved endpoint permissions, advertiser authorization and asset rights. The current official navigation labels Marketing sandbox accounts “To-be-deprecated”; full current retirement and coverage details were not retrievable. [Business API documentation](https://business-api.tiktok.com/gateway/docs/index?doc_id=1771100865818625&language=ENGLISH), [official SDK](https://github.com/tiktok/tiktok-business-api-sdk)

Required deterministic tests:

| ID | Fixture and expected result |
|---|---|
| T1 | Status omitted: reject the default-active hazard |
| T2 | Ambiguous retry inside versus beyond documented window: endpoint-specific treatment; no blind late create |
| T3 | Diagnostic response ID substituted for client retry key: reject |
| T4 | HTTP 200 with API error or missing entity ID: no successful binding |
| T5 | Inert creation unsupported by selected family: capability error, never fallback to enabled |
| T6 | Copy finishes after STOP with new children: bind, pause and reconcile |
| T7 | Expired identity authorization or pending creative review: no serving claim |
| T8 | Manual payload sent to Smart+ family: reject before network call |

**9. LinkedIn adapter**

Model:

```text
SponsoredAccount → CampaignGroup → Campaign → Creative
```

Typed extensions include organization/content identity, objective/type/format, cost type, bid/unit cost, daily/total budget, schedule, targeting, offsite delivery, audience expansion and group constraints.

The retrieved 202610 campaign reference uses account-scoped routes:

```text
POST /rest/adAccounts/{accountId}/adCampaigns
GET  /rest/adAccounts/{accountId}/adCampaigns/{campaignId}
POST /rest/adAccounts/{accountId}/adCampaigns/{campaignId}
     X-RestLi-Method: PARTIAL_UPDATE
```

Pin `LinkedIn-Version` and Rest.li protocol. Preserve the creation ID from `x-restli-id`, budget decimal strings/currency, and per-item batch errors. Batch campaign operations stay within one account. [Campaign API](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/account-structure/create-and-manage-campaigns?view=li-lms-2026-10)

Keep configured `status` distinct from serving/review reasons. Parent, billing, schedule, budget and creative conditions may block an active campaign. `RUNNABLE` is eligibility, not observed impressions. [Status propagation](https://learn.microsoft.com/en-us/linkedin/marketing/usecases/foundations/statuses?view=li-lms-2026-01)

Do not infer general create idempotency or compare-and-swap guarantees merely because a version tag exists. A lost creation ID remains unknown. Media processing and review are separate from mutation completion.

Qualification requires Advertising API approval, applicable `rw_ads`/`r_ads`/`r_ads_reporting`, member account roles and organization/content rights. Development-tier limits are provider constraints; Standard is the scalable production target, with approval not guaranteed. [Permissions](https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access?view=li-lms-2026-03), [access tiers](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/marketing-tiers?view=li-lms-2026-04)

Test accounts use production infrastructure but do not serve or bill; test creatives are auto-rejected and lack delivery reporting. Do not require live serving as their pass condition. [Test accounts](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/account-structure/create-and-manage-accounts?view=li-lms-2025-10)

Required deterministic tests:

| ID | Fixture and expected result |
|---|---|
| L1 | Creation ID only in response header: bind correctly; lost response remains unknown |
| L2 | Active campaign with parent/account hold: preserve blocked eligibility |
| L3 | Batch read has one result and one error: inventory remains incomplete |
| L4 | Test creative rejected: documented test limitation, not endless retry |
| L5 | Write scope but viewer account role: deny write readiness |
| L6 | Parent resume with independently paused children: preserve child decisions |
| L7 | Unsupported version/format change or invalid budget patch: explicit failure, no broad replacement |

The group-specific reference page was inaccessible. Exact group schemas still need pinned-version qualification.

**10. Shared qualification evidence**

Every provider/account/campaign-family capability record should include:

- Pinned API/SDK schema and source date.
- Actual scopes, roles, access tier and token lifecycle.
- Supported create/update/pause/resume/read endpoints.
- Native money units and time semantics.
- Immutable-field and partial-update rules.
- Async/per-item result parser.
- Documented retry policy—or an explicit absence of guarantee.
- Complete graph enumeration and material readback strategy.
- Native review, inherited state and serving interpretation.
- Failure-test results and emergency operator/native access.

Run these additional deterministic tests against all five:

| Test | Required outcome |
|---|---|
| STOP at every dispatch/job boundary | Older effects remain tracked |
| Late enable after paused observation | STOP stays pending and reapplies pause |
| New STOP during resume | Stale clearance rejected |
| Tenant/account/parent substitution | No provider request |
| Large IDs and native money conversions | Exact round-trip |
| DST and reporting-day boundaries | Correct schedule and accounting period |
| Rate limit before execution versus timeout after possible execution | Different retry classification |
| Pagination failure, changed parents, new enum | Explicit incomplete/unknown state |
| Credentials revoked after preflight | No false readiness |
| Four stopped providers and one timeout | Aggregate STOP incomplete |
| Budget transfer with unknown source release | No double allocation |
| Omitted patch fields | Unchanged, not silently reset |
| SDK retries ambiguous creation | Test fails |
| Old webhook/read result arrives late | Cannot clear STOP or overwrite newer evidence |

Qualification has four distinct evidence levels:

| Level | What it proves |
|---|---|
| Local deterministic tests | State, concurrency and failure handling |
| Provider test or controlled inert resources | Actual API/schema, permissions and readback |
| Agency production prerequisites | App approvals, roles, credentials, quotas and emergency routes |
| Authorized live activation | Customer-specific review, auction delivery and outcomes |

Every advertised platform and format must map to a complete workflow before acquisition. A required provider permission or capability still blocked means that portion of launch remains blocked; a manual-only button does not satisfy it.

“All five platforms” must not silently mean every restricted reservation, commerce, app or automated ad product uses the same workflow. Enumerate offered families explicitly and fully implement each promised family.

The remaining research limitations are **Meta’s rate-limited references and inaccessible sandbox coverage, TikTok’s unreadable general portal/current sandbox retirement details, and LinkedIn’s inaccessible group-specific schema page**. These are documentation and qualification gaps, not failed provider operations. No live qualification tests were performed.
