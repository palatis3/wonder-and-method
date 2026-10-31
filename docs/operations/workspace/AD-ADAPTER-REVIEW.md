Sent the full review once to **Build Wonder and Method workflows** (`01a1372f-80d0-7bf0-b8dc-c159ebe59991`). The tool accepted delivery; the read-only check showed the thread active but **no acknowledgment yet**. I did not resend.

The complete implementation contract follows. Research only: no provider requests, account changes, repository edits or deployments.

**Version and scope**

Official documentation supports Google Ads **v26**, Meta Marketing **v25.0**, Microsoft Advertising **v13**, TikTok advertiser campaign resources **v1.3**, and LinkedIn REST **202610**. TikTok advertiser OAuth v2.0 is separate from campaign resource versioning.

Each adapter below implements one explicit campaign family. This is functional scope for all five channels, with typed extensions for additional campaign families—not manual-only adapters.

Four changes deserve particular attention:

- TikTok’s current warning prohibits `CUSTOMIZED_USER` non-Spark creation for TikTok placement, despite an outdated example that still uses it.
- Meta documents seven-day create idempotency, but the header can be **silently ignored until enabled for the app**. Its applicability to the intended v25 app remains unqualified.
- Microsoft’s October 28 documentation prohibits adding `MaxCpc` to new non-portfolio Maximize Clicks campaigns.
- LinkedIn creatives can reject pause while under review; the adapter must retain an independently controllable paused parent.

Sources: [TikTok ad creation](https://business-api.tiktok.com/portal/docs/create-ads/v1.3), [Meta idempotency](https://developers.facebook.com/documentation/ads-commerce/marketing-api/idempotent-requests), [Microsoft MaxClicks](https://learn.microsoft.com/en-us/advertising/campaign-management-service/maxclicksbiddingscheme?view=bingads-13), [LinkedIn creatives](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/account-structure/create-and-manage-creatives?view=li-lms-2026-10).

**Shared typed contract**

```ts
createPausedGraph(approvedVersion, accountBinding, stopEpoch)
readGraph(exactResourceBindings)
enableApprovedGraph(approvedVersion, exactResourceBindings, stopEpoch)
pauseGraph(exactResourceBindings, stopEpoch)
requestReport(reportSpec)
pollReport(reportBinding)
fetchReportPage(reportBinding, cursor)
reconcileAttempt(attemptId)
```

Persist exact request bytes/hash, provider/environment/account, approval version, resource bindings, currency, STOP epoch and attempt ID **before dispatch**.

Keep these states separate:

| State | Meaning |
|---|---|
| Configured | Requested native enabled/paused status |
| Effective | Parent status, account restrictions and other inherited holds |
| Review | Pending, approved, rejected or otherwise ineligible |
| Delivery | Dated serving observations or reported activity |
| Attempt | Rejected, accepted, partial, unknown or reconciled |

Create parents paused; construct and verify children under that hold. Enable children first and the approved parent last, checking STOP before each dispatch. Pause the highest exclusively owned parent first.

There is no atomic transaction spanning Postgres and these providers. An old enable can arrive after a successful pause. Keep **STOP pending** while older authority-changing attempts remain unresolved; reconcile and apply another pause after any late enable. A paused readback alone cannot prove cancellation of an unresolved request.

Budgets have provider pacing and overdelivery behavior. Delayed reports and STOP cannot provide an instantaneous hard spending ceiling. Preserve account currency, account timezone, reporting timezone and exact monetary units.

Examples below use symbolic IDs and approved inputs; they are templates, not tested live requests.

**Google Ads v26 — Search, exact keyword, responsive search ad, Manual CPC**

Required graph:

`Customer → CampaignBudget → SEARCH Campaign → SEARCH_STANDARD AdGroup → Keyword + ResponsiveSearchAd`

Also create campaign location and language criteria. An RSA requires at least three headlines, two descriptions and a final URL. This family needs no image upload. [Campaign requirements](https://developers.google.com/google-ads/api/docs/campaigns/create-campaigns), [campaign example](https://developers.google.com/google-ads/api/samples/add-campaigns), [RSA example](https://developers.google.com/google-ads/api/docs/responsive-search-ads/create-responsive-search-ads).

```http
POST https://googleads.googleapis.com/v26/customers/A/googleAds:mutate
Authorization: Bearer TOKEN
Content-Type: application/json
login-customer-id: VERIFIED_MANAGER_ID
```

Omit `login-customer-id` when no manager access path is used.

```json
{
  "partialFailure": false,
  "validateOnly": false,
  "mutateOperations": [
    {"campaignBudgetOperation":{"create":{
      "resourceName":"customers/A/campaignBudgets/-1",
      "name":"APPROVAL budget",
      "amountMicros":"B_MICROS",
      "deliveryMethod":"STANDARD",
      "explicitlyShared":false
    }}},
    {"campaignOperation":{"create":{
      "resourceName":"customers/A/campaigns/-2",
      "name":"APPROVAL campaign",
      "status":"PAUSED",
      "advertisingChannelType":"SEARCH",
      "campaignBudget":"customers/A/campaignBudgets/-1",
      "manualCpc":{},
      "networkSettings":{
        "targetGoogleSearch":true,
        "targetSearchNetwork":false,
        "targetContentNetwork":false
      },
      "geoTargetTypeSetting":{"positiveGeoTargetType":"PRESENCE"},
      "containsEuPoliticalAdvertising":
        "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING"
    }}},
    {"campaignCriterionOperation":{"create":{
      "campaign":"customers/A/campaigns/-2",
      "location":{"geoTargetConstant":"geoTargetConstants/GEO"}
    }}},
    {"campaignCriterionOperation":{"create":{
      "campaign":"customers/A/campaigns/-2",
      "language":{"languageConstant":"languageConstants/LANG"}
    }}},
    {"adGroupOperation":{"create":{
      "resourceName":"customers/A/adGroups/-3",
      "campaign":"customers/A/campaigns/-2",
      "name":"APPROVAL group",
      "type":"SEARCH_STANDARD",
      "status":"PAUSED",
      "cpcBidMicros":"BID_MICROS"
    }}},
    {"adGroupCriterionOperation":{"create":{
      "adGroup":"customers/A/adGroups/-3",
      "status":"ENABLED",
      "keyword":{"text":"APPROVED_KEYWORD","matchType":"EXACT"}
    }}},
    {"adGroupAdOperation":{"create":{
      "adGroup":"customers/A/adGroups/-3",
      "status":"PAUSED",
      "ad":{
        "finalUrls":["APPROVED_URL"],
        "responsiveSearchAd":{
          "headlines":[{"text":"H1"},{"text":"H2"},{"text":"H3"}],
          "descriptions":[{"text":"D1"},{"text":"D2"}]
        }
      }
    }}}
  ]
}
```

The political declaration must match the actual approved classification. Resolve geography and language constants. Amounts are **millionths of the account currency**. When adding dates, use the v26 schedule fields rather than copying deprecated examples.

Run the same graph with `validateOnly:true` first. Negative temporary IDs work only inside that request. `partialFailure:false` supplies provider-request atomicity, but a timeout can still leave the entire request’s outcome unknown. No generic durable create-idempotency key was established. [Mutation semantics](https://developers.google.com/google-ads/api/docs/mutating/overview), [partial failures](https://developers.google.com/google-ads/api/docs/mutating/best-practices).

Status changes use the same endpoint:

```json
{
  "partialFailure":false,
  "mutateOperations":[{
    "campaignOperation":{
      "update":{
        "resourceName":"customers/A/campaigns/C",
        "status":"PAUSED"
      },
      "updateMask":"status"
    }
  }]
}
```

Use `ENABLED` for activation. Apply analogous status-only updates to groups and ad-group ads, retaining their returned resource names.

Complete readback uses:

```http
POST .../customers/A/googleAds:search

{"query":"GAQL"}
```

Fetch configuration independently of metrics, including:

- Customer currency, timezone and status.
- Campaign status/primary status/reasons, networks, geography mode, political declaration, schedule and bidding.
- Budget binding, amount and sharing.
- Every campaign criterion, group, keyword and ad.
- Creative text, URLs and policy review/approval fields.

Follow every `nextPageToken` with the same query. Metrics queries can omit zero-impression entities and therefore cannot establish complete inventory. [Search protocol](https://developers.google.com/google-ads/api/rest/common/search), [v26 campaign fields](https://developers.google.com/google-ads/api/fields/v26/campaign).

Exact report query:

```sql
SELECT customer.id, customer.currency_code, campaign.id, segments.date,
       metrics.impressions, metrics.clicks, metrics.cost_micros
FROM campaign
WHERE campaign.id = C
  AND segments.date BETWEEN 'YYYY-MM-DD' AND 'YYYY-MM-DD'
```

Creative/policy read example:

```sql
SELECT ad_group_ad.resource_name, ad_group_ad.status,
       ad_group_ad.ad.id, ad_group_ad.ad.final_urls,
       ad_group_ad.ad.responsive_search_ad.headlines,
       ad_group_ad.ad.responsive_search_ad.descriptions,
       ad_group_ad.policy_summary.review_status,
       ad_group_ad.policy_summary.approval_status
FROM ad_group_ad
WHERE campaign.id = C
```

Production qualification requires the applicable Google Cloud project access level, OAuth authorization and customer/manager relationship, billing eligibility and advertiser verification where required. Current documentation says developer tokens sunset September 9, 2026; do not add a new dependency on them. Test accounts and `validateOnly` do not prove production review or delivery. [Access levels](https://developers.google.com/google-ads/api/docs/api-policy/access-levels), [developer-token migration](https://developers.google.com/google-ads/api/docs/api-policy/developer-token).

**Meta Marketing v25.0 — website Traffic, single-image link, Facebook and Instagram Feed**

Base: `https://graph.facebook.com/v25.0`.

Use four sequential POSTs. These examples are form fields; JSON-valued fields must be serialized as JSON strings.

```text
POST /act_A/campaigns
name=N
objective=OUTCOME_TRAFFIC
buying_type=AUCTION
status=PAUSED
special_ad_categories=[]
is_adset_budget_sharing_enabled=false
```

```text
POST /act_A/adsets
name=N
campaign_id=C
status=PAUSED
daily_budget=B_MINOR
billing_event=IMPRESSIONS
optimization_goal=LINK_CLICKS
bid_strategy=LOWEST_COST_WITHOUT_CAP
destination_type=WEBSITE
start_time=START_WITH_OFFSET
end_time=END_WITH_OFFSET
targeting={
  "geo_locations":{"countries":["US"]},
  "age_min":18,
  "publisher_platforms":["facebook","instagram"],
  "facebook_positions":["feed"],
  "instagram_positions":["stream"]
}
```

An empty special-category list applies only to a non-special-category campaign. EU targeting requires applicable beneficiary/payor declarations. Budget values use currency subunits and currency-specific rules; do not universally multiply by 100. This family uses ad-set budgets and explicitly disables sharing. [Campaign reference](https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/ad-campaign-group), [ad-set reference](https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/ad-campaign).

```text
POST /act_A/adcreatives
name=N
object_story_spec={
  "page_id":"PAGE",
  "instagram_user_id":"IG_USER",
  "link_data":{
    "message":"APPROVED_COPY",
    "link":"APPROVED_URL",
    "picture":"IMMUTABLE_APPROVED_IMAGE_URL",
    "call_to_action":{
      "type":"LEARN_MORE",
      "value":{"link":"APPROVED_URL"}
    }
  }
}
```

```text
POST /act_A/ads
name=N
adset_id=G
creative={"creative_id":"CREATIVE"}
status=PAUSED
```

Verify Page and Instagram identity rights. The image URL must be accessible to Meta ingestion; retain an independent hash of approved bytes and returned creative/image identities. A preuploaded account image hash is an alternative typed asset workflow. An unpublished Page story is still a real resource. The pinned v25 story schema supports `instagram_user_id`. [Creative construction](https://developers.facebook.com/documentation/ads-commerce/marketing-api/get-started/basic-ad-creation/create-an-ad-creative), [v25 story schema](https://developers.facebook.com/docs/marketing-api/reference/ad-creative-object-story-spec/v25.0).

Enable/pause:

```text
POST /C   status=ACTIVE | PAUSED
POST /G   status=ACTIVE | PAUSED
POST /AD  status=ACTIVE | PAUSED
```

Minimum readback selections:

```text
/act_A?fields=id,account_id,account_status,currency,timezone_name

/C?fields=id,account_id,name,objective,status,effective_status,
special_ad_categories,is_adset_budget_sharing_enabled,
daily_budget,lifetime_budget,spend_cap

/C/adsets?fields=id,campaign_id,status,effective_status,
daily_budget,lifetime_budget,bid_strategy,billing_event,
optimization_goal,targeting,start_time,end_time

/G/ads?fields=id,adset_id,campaign_id,status,effective_status,
creative,issues_info

/CREATIVE?fields=id,object_story_spec,effective_object_story_id,
instagram_user_id,image_hash,image_url
```

Follow all edge pagination, including nested edges if used. A child configured `ACTIVE` under `CAMPAIGN_PAUSED` is not serving.

Campaign/ad-set validation supports `execution_options=["validate_only"]`; do not infer universal support for every endpoint. Validation cannot supply real IDs for subsequent dependent resources or guarantee review.

Meta now documents `X-Client-Idempotent-Key` for campaign, ad-set, ad and creative creates. It retains results seven days and excludes batch, async, update and delete operations. **The feature is gradually enabled and may silently ignore the header.** The examples use v26; qualify v25 and the actual app before enabling retries. Do not use the header on validation-only calls. Always read current state after a replay. [Idempotency contract](https://developers.facebook.com/documentation/ads-commerce/marketing-api/idempotent-requests).

Reporting:

```text
GET /act_A/insights
  ?level=ad
  &fields=account_id,account_currency,campaign_id,adset_id,ad_id,
          date_start,date_stop,impressions,clicks,spend
  &time_range={"since":"YYYY-MM-DD","until":"YYYY-MM-DD"}
  &time_increment=1
```

For asynchronous reporting:

1. `POST /act_A/insights` with the report parameters → `report_run_id`.
2. `GET /RUN?fields=async_status,async_percent_completion`.
3. Require `Job Completed` and `100`.
4. `GET /RUN/insights`, exhausting pagination.

Failed or skipped jobs are not empty successful reports. Spend is a **major-unit decimal string**, unlike budget integers. Preserve account timezone and extraction time. Current documentation says older attribution switches are disregarded; do not promise unsupported custom attribution behavior. [Insights operational contract](https://developers.facebook.com/documentation/ads-commerce/marketing-api/insights/best-practices).

Qualification requires production app access for the intended customer-account use case, write/report permissions, Page/Instagram asset tasks, billing and review eligibility. App review, access tier and idempotency rollout cannot be established with mocks.

**Microsoft Advertising v13 REST — SearchStandard RSA, exact keyword, Maximize Clicks**

Use REST for this build. Microsoft documents SOAP retirement on January 31, 2027. [API overview](https://learn.microsoft.com/en-us/advertising/guides/?view=bingads-13).

```text
M = https://campaign.api.bingads.microsoft.com/CampaignManagement/v13

Authorization: Bearer TOKEN
DeveloperToken: TOKEN
CustomerAccountId: A
CustomerId: VERIFIED_MANAGER_CUSTOMER
```

```json
POST M/Campaigns
{
  "AccountId":"A",
  "Campaigns":[{
    "Name":"N",
    "CampaignType":"Search",
    "Status":"Paused",
    "DailyBudget":B_MAJOR,
    "BudgetType":"DailyBudgetStandard",
    "Languages":["English"],
    "TimeZone":"VERIFIED_ENUM",
    "BiddingScheme":{"Type":"MaxClicks"}
  }]
}
```

```json
POST M/AdGroups
{
  "CampaignId":"C",
  "AdGroups":[{
    "Name":"N",
    "AdGroupType":"SearchStandard",
    "Status":"Paused",
    "Network":"OwnedAndOperatedAndSyndicatedSearch"
  }],
  "ReturnInheritedBidStrategyTypes":false
}
```

```json
POST M/Keywords
{
  "AdGroupId":"G",
  "Keywords":[{
    "Text":"APPROVED_KEYWORD",
    "MatchType":"Exact",
    "Status":"Active"
  }],
  "ReturnInheritedBidStrategyTypes":true
}
```

Maximize Clicks supplies inherited bidding, so this family does not add manual keyword bids. Current documentation prohibits a new non-portfolio `MaxCpc`; a mandatory CPC ceiling needs a separately qualified portfolio strategy. [AddCampaigns](https://learn.microsoft.com/en-us/advertising/campaign-management-service/addcampaigns?view=bingads-13), [ad-group schema](https://learn.microsoft.com/en-us/advertising/campaign-management-service/adgroup?view=bingads-13), [current MaxClicks restrictions](https://learn.microsoft.com/en-us/advertising/campaign-management-service/maxclicksbiddingscheme?view=bingads-13).

**Serialization limitation:** Microsoft’s MaxClicks JSON example uses `"Type":"MaxClicks"`, while generic templates/prose use class-name discriminators. Use the official REST SDK’s serialization as the fixture source; raw Cloudflare Worker interoperability remains a qualification item. [Official REST SDK migration](https://learn.microsoft.com/en-us/advertising/guides/php-sdk-migration-soap-to-rest?view=bingads-13).

```json
POST M/CampaignCriterions
{
  "CriterionType":"Targets",
  "CampaignCriterions":[{
    "Type":"BiddableCampaignCriterion",
    "CampaignId":"C",
    "Criterion":{"Type":"LocationCriterion","LocationId":"GEO"}
  },{
    "Type":"BiddableCampaignCriterion",
    "CampaignId":"C",
    "Criterion":{
      "Type":"LocationIntentCriterion",
      "IntentOption":"PeopleIn"
    }
  }]
}
```

```json
POST M/Ads
{
  "AdGroupId":"G",
  "Ads":[{
    "Type":"ResponsiveSearch",
    "Status":"Paused",
    "FinalUrls":["APPROVED_URL"],
    "Headlines":[
      {"Asset":{"Type":"TextAsset","Text":"H1"}},
      {"Asset":{"Type":"TextAsset","Text":"H2"}},
      {"Asset":{"Type":"TextAsset","Text":"H3"}}
    ],
    "Descriptions":[
      {"Asset":{"Type":"TextAsset","Text":"D1"}},
      {"Asset":{"Type":"TextAsset","Text":"D2"}}
    ]
  }]
}
```

RSA assets require three–15 headlines and two–four descriptions, subject to length/language rules. Retrieve generated asset IDs. Explicitly set location intent; group geography can replace campaign geography rather than intersect it. [RSA schema](https://learn.microsoft.com/en-us/advertising/campaign-management-service/responsivesearchad?view=bingads-13), [location targeting](https://learn.microsoft.com/en-us/advertising/campaign-management-service/locationcriterion?view=bingads-13), [location intent](https://learn.microsoft.com/en-us/advertising/campaign-management-service/locationintentcriterion?view=bingads-13).

Status-only updates:

```text
PUT M/Campaigns
{"AccountId":"A","Campaigns":[{"Id":"C","Status":"Paused"}]}

PUT M/AdGroups
{"CampaignId":"C","AdGroups":[{"Id":"G","Status":"Paused"}]}

PUT M/Ads
{"AdGroupId":"G","Ads":[
  {"Id":"AD","Type":"ResponsiveSearch","Status":"Paused"}
]}
```

Use `Active` for enable. [UpdateAdGroups](https://learn.microsoft.com/en-us/advertising/campaign-management-service/updateadgroups?view=bingads-13), [UpdateAds](https://learn.microsoft.com/en-us/advertising/campaign-management-service/updateads?view=bingads-13).

Readback uses **POST query routes**:

```text
M/Campaigns/QueryByAccountId
{"AccountId":"A","CampaignType":"Search"}

M/AdGroups/QueryByCampaignId
{"CampaignId":"C"}

M/Ads/QueryByAdGroupId
{"AdGroupId":"G","AdTypes":["ResponsiveSearch"]}

M/Keywords/QueryByAdGroupId
{"AdGroupId":"G"}

M/CampaignCriterions/QueryByIds
{"CampaignId":"C","CampaignCriterionIds":null,"CriterionType":"Location"}
```

Repeat criteria reads for `LocationIntent` and every relevant family. These particular operations return collections without cursor parameters. Enumerate every parent and request documented additional fields for enabled controls. Include other supported descendant types when detecting external drift. Read editorial status, inherited strategy, targeting/exclusions, creative assets, schedule, currency and timezone. [Campaign inventory](https://learn.microsoft.com/en-us/advertising/campaign-management-service/getcampaignsbyaccountid?view=bingads-13), [group inventory](https://learn.microsoft.com/en-us/advertising/campaign-management-service/getadgroupsbycampaignid?view=bingads-13), [ad inventory](https://learn.microsoft.com/en-us/advertising/campaign-management-service/getadsbyadgroupid?view=bingads-13), [criteria read](https://learn.microsoft.com/en-us/advertising/campaign-management-service/getcampaigncriterionsbyids?view=bingads-13).

Adds return positional IDs, including nulls for failures. Match `PartialErrors` by their `Index`; their array order need not match input order. Preserve `TrackingId`. No universal validation-only or durable create-idempotency contract was established for these operations.

Reporting:

```http
POST https://reporting.api.bingads.microsoft.com/Reporting/v13/GenerateReport/Submit
```

```json
{
  "ReportRequest":{
    "Type":"CampaignPerformanceReportRequest",
    "ReportName":"ATTEMPT",
    "Format":"Csv",
    "Aggregation":"Daily",
    "ReturnOnlyCompleteData":true,
    "Columns":[
      "TimePeriod","AccountId","CampaignId","CurrencyCode",
      "Impressions","Clicks","Spend"
    ],
    "Scope":{"AccountIds":["A"]},
    "Time":{
      "CustomDateRangeStart":{"Year":Y,"Month":M,"Day":D1},
      "CustomDateRangeEnd":{"Year":Y,"Month":M,"Day":D2},
      "ReportTimeZone":"EXPLICIT_SUPPORTED_ENUM"
    }
  }
}
```

Poll with the same user:

```text
POST .../GenerateReport/Poll
{"ReportRequestId":"R"}
```

On `Success`, download `ReportDownloadUrl` and parse every row plus completeness metadata. `TimePeriod` is necessary for daily aggregation. Request IDs expire within one day; report URLs are temporary transport artifacts. Budget and spend use account major units. [Submit](https://learn.microsoft.com/en-us/advertising/reporting-service/submitgeneratereport?view=bingads-13), [report schema](https://learn.microsoft.com/en-us/advertising/reporting-service/campaignperformancereportrequest?view=bingads-13).

Qualification requires a production developer token, OAuth/MFA, correct account/manager role, supported market/bidding configuration and usable billing. Sandbox does not prove production eligibility.

**TikTok advertiser v1.3 — manual Traffic, website Click, Spark single video**

```text
T = https://business-api.tiktok.com/open_api/v1.3
Access-Token: TOKEN
Content-Type: application/json
```

The graph is campaign → ad group → Spark ad referencing an authorized identity/post. An asset-selection and rights-verification workflow is required; new Spark-post publishing is a separate typed workflow.

```json
POST T/campaign/create/
{
  "advertiser_id":"A",
  "campaign_name":"N",
  "objective_type":"TRAFFIC",
  "campaign_type":"REGULAR_CAMPAIGN",
  "budget_mode":"BUDGET_MODE_TOTAL",
  "budget":B_MAJOR,
  "operation_status":"DISABLE",
  "request_id":"UNIQUE_INT64_DECIMAL_STRING"
}
```

```json
POST T/adgroup/create/
{
  "advertiser_id":"A",
  "campaign_id":"C",
  "adgroup_name":"N",
  "promotion_type":"WEBSITE",
  "placement_type":"PLACEMENT_TYPE_NORMAL",
  "placements":["PLACEMENT_TIKTOK"],
  "location_ids":["GEO"],
  "budget_mode":"BUDGET_MODE_TOTAL",
  "budget":B_MAJOR,
  "schedule_type":"SCHEDULE_START_END",
  "schedule_start_time":"YYYY-MM-DD HH:MM:SS",
  "schedule_end_time":"YYYY-MM-DD HH:MM:SS",
  "optimization_goal":"CLICK",
  "bid_type":"BID_TYPE_NO_BID",
  "billing_event":"CPC",
  "pacing":"PACING_MODE_SMOOTH",
  "operation_status":"DISABLE"
}
```

These schedule timestamps use UTC+0; reports use advertiser timezone. Enforce currency-specific budget minima and schedule constraints. Omit CBO rather than inventing a false value where the create table documents only `true`. [Campaign creation](https://business-api.tiktok.com/portal/docs/create-a-campaign/v1.3), [ad-group creation](https://ads.tiktok.com/marketing_api/docs?id=1739499616346114).

Before ad creation:

```text
GET T/identity/get/?advertiser_id=A&identity_type=BC_AUTH_TT

GET T/identity/video/get/
    ?advertiser_id=A
    &identity_type=BC_AUTH_TT
    &identity_id=IDENTITY
    &identity_authorized_bc_id=BC
```

Require identity availability and `can_pull_video`; follow video cursors/`has_more`. Select the approved item and verify post authorization and commercial music rights.

```json
POST T/ad/create/
{
  "advertiser_id":"A",
  "adgroup_id":"G",
  "creatives":[{
    "ad_name":"N",
    "identity_type":"BC_AUTH_TT",
    "identity_id":"IDENTITY",
    "identity_authorized_bc_id":"BC",
    "ad_format":"SINGLE_VIDEO",
    "tiktok_item_id":"ITEM",
    "call_to_action":"LEARN_MORE",
    "landing_page_url":"APPROVED_URL",
    "operation_status":"DISABLE"
  }]
}
```

`TT_USER` with appropriate rights is an alternative. `AUTH_CODE` requires genuine post authorization and expiry evidence. Uploaded video IDs are not a replacement for Spark-post authorization. [Spark workflow](https://business-api.tiktok.com/portal/docs?id=1739470744631298), [ad creation and current warning](https://business-api.tiktok.com/portal/docs/create-ads/v1.3).

Status:

```json
POST T/campaign/status/update/
{
  "advertiser_id":"A",
  "campaign_ids":["C"],
  "operation_status":"DISABLE"
}
```

Use `ENABLE` for activation; corresponding group/ad routes use `adgroup_ids`/`ad_ids`. Read back every affected ID. The current campaign field table says `operation_status`; an old sample still says `opt_status`. [Current status contract](https://business-api.tiktok.com/portal/docs/update-the-operation-statuses-of-campaigns/v1.3).

Read `campaign/get/`, `adgroup/get/`, and `ad/get/` with advertiser and exact parent/ID filters. Omit field projection to retrieve all documented fields; exhaust `page_info.total_page`. Preserve configured and secondary status, targeting, budgets, schedules, bidding, identities and creative destinations. Deleted entities need explicit queries; absence from default results is not evidence of never-created. [Campaign readback](https://business-api.tiktok.com/portal/docs/get-campaigns/v1.3), [campaign-management references](https://ads.tiktok.com/marketing_api/docs?id=1739381823123458).

Campaign `request_id` deduplicates for only **ten seconds** and differs from the response request ID. Do not extend that guarantee to other creates or replay an unknown outcome outside the window. Check both HTTP and JSON error codes; missing item bindings remain unresolved.

Reporting:

```text
GET T/report/integrated/get/
advertiser_id=A
service_type=AUCTION
report_type=BASIC
data_level=AUCTION_CAMPAIGN
dimensions=["campaign_id","stat_time_day"]
metrics=["spend","impressions","clicks"]
start_date=YYYY-MM-DD
end_date=YYYY-MM-DD
page=1
page_size=200
```

URL-encode parameter values. Partition daily reporting into ranges of at most 30 days; consume every page. Preserve metric strings, advertiser currency/timezone and extraction time. Async reporting is allowlist-only; partitioned synchronous reporting can satisfy the minimum adapter without an async stub. [Reporting endpoint](https://ads.tiktok.com/marketing_api/docs?id=1738864778664961), [async qualification](https://business-api.tiktok.com/portal/docs/reporting-use-case/v1.3).

Qualification requires approved API for Business permissions, authorized advertiser, billing/region eligibility and actual identity/post/music rights. Sandbox does not return real delivery evidence. [App permissions](https://business-api.tiktok.com/portal/docs/app-permissions/v1.3).

**LinkedIn REST 202610 — WEBSITE_VISIT, single-image link Sponsored Content, CPC**

Use an article post with a thumbnail and destination URL.

```text
L = https://api.linkedin.com/rest
Authorization: Bearer TOKEN
LinkedIn-Version: 202610
X-Restli-Protocol-Version: 2.0.0
Content-Type: application/json
```

```json
POST L/adAccounts/A/adCampaignGroups
{
  "account":"urn:li:sponsoredAccount:A",
  "name":"N",
  "status":"PAUSED",
  "runSchedule":{"start":START_MS,"end":END_MS},
  "totalBudget":{"amount":"TOTAL_MAJOR","currencyCode":"CCY"}
}
```

```json
POST L/adAccounts/A/adCampaigns
{
  "account":"urn:li:sponsoredAccount:A",
  "campaignGroup":"urn:li:sponsoredCampaignGroup:CG",
  "name":"N",
  "type":"SPONSORED_UPDATES",
  "format":"STANDARD_UPDATE",
  "objectiveType":"WEBSITE_VISIT",
  "status":"PAUSED",
  "costType":"CPC",
  "optimizationTargetType":"NONE",
  "unitCost":{"amount":"BID_MAJOR","currencyCode":"CCY"},
  "dailyBudget":{"amount":"DAILY_MAJOR","currencyCode":"CCY"},
  "locale":{"language":"en","country":"US"},
  "audienceExpansionEnabled":false,
  "offsiteDeliveryEnabled":false,
  "creativeSelection":"OPTIMIZED",
  "runSchedule":{"start":START_MS,"end":END_MS},
  "targetingCriteria":{"include":{"and":[
    {"or":{"urn:li:adTargetingFacet:locations":["urn:li:geo:GEO"]}},
    {"or":{"urn:li:adTargetingFacet:interfaceLocales":[
      "urn:li:locale:en_US"
    ]}}
  ]}}
}
```

Use singular `WEBSITE_VISIT`. Amounts are decimal strings in account currency; timestamps are milliseconds. Resolve current geography URNs. Group/account restrictions still apply. [Campaign groups](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/account-structure/create-and-manage-campaign-groups?view=li-lms-2026-09), [campaign schema and validation](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/account-structure/create-and-manage-campaigns?view=li-lms-2026-10), [current changes](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/recent-changes?view=li-lms-2026-10).

```json
POST L/images?action=initializeUpload
{
  "initializeUploadRequest":{"owner":"urn:li:organization:ORG"}
}
```

Upload approved bytes to the returned upload URL using the documented procedure before expiry. Poll `GET L/images/{encodedImageURN}` until `AVAILABLE`. Retain owner, image URN and independent bytes hash. [Image API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api?view=li-lms-2026-10).

```json
POST L/posts
{
  "author":"urn:li:organization:ORG",
  "commentary":"APPROVED_COPY",
  "visibility":"PUBLIC",
  "distribution":{
    "feedDistribution":"NONE",
    "targetEntities":[],
    "thirdPartyDistributionChannels":[]
  },
  "adContext":{
    "dscAdAccount":"urn:li:sponsoredAccount:A",
    "dscStatus":"ACTIVE"
  },
  "content":{"article":{
    "source":"APPROVED_URL",
    "thumbnail":"IMAGE_URN",
    "title":"APPROVED_TITLE",
    "description":"APPROVED_DESCRIPTION"
  }},
  "lifecycleState":"PUBLISHED",
  "isReshareDisabledByAuthor":true
}
```

```json
POST L/adAccounts/A/creatives
{
  "name":"N",
  "campaign":"urn:li:sponsoredCampaign:C",
  "content":{"reference":"POST_URN"},
  "intendedStatus":"PAUSED"
}
```

Capture `x-restli-id`; do not assume IDs appear in response JSON. LinkedIn does not scrape article content from the URL. Organization publishing rights are separate from advertising-account rights. A published direct-sponsored post and a paused creative have different lifecycle states. [Posts schema](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-10), [image-ad permissions](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/advertising-targeting/version/image-ads-integrations?view=li-lms-2026-10).

Status update:

```http
POST L/adAccounts/A/adCampaigns/C
X-RestLi-Method: PARTIAL_UPDATE
```

```json
{"patch":{"$set":{"status":"PAUSED"}}}
```

Use `ACTIVE` for activation. Groups use the analogous group path; creative patches use `intendedStatus`.

A creative under review can reject pause. Preserve that error and maintain a confirmed parent pause. Activate the creative beneath a paused parent when obtaining review evidence before releasing the parent. No generic validation-only or durable create-idempotency contract was established. [Creative lifecycle](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/account-structure/create-and-manage-creatives?view=li-lms-2026-10).

Read exact account, group, campaign, creative, post and image identities. Campaign/group searches use `pageSize`, `pageToken` and `metadata.nextPageToken`. Creative search uses `q=criteria&campaigns=List(encodedCampaignURN)` with cursor pagination and maximum page size 100. Preserve complete objects and creative fields:

```text
id,account,campaign,content,intendedStatus,review,
isServing,servingHoldReasons,metadata
```

Reporting:

```text
GET L/adAnalytics
  ?q=analytics
  &pivot=CAMPAIGN
  &timeGranularity=DAILY
  &accounts=List(urn%3Ali%3AsponsoredAccount%3AA)
  &dateRange=(start:(year:Y,month:M,day:D1),
              end:(year:Y,month:M,day:D2))
  &fields=dateRange,pivotValues,impressions,clicks,
          landingPageClicks,costInLocalCurrency
```

Analytics **does not support pagination**. Partition queries below the 15,000-element limit. Empty results can indicate insufficient access; do not automatically record zero. Reports use UTC; distinguish clicks from landing-page clicks. Older pagination examples contradict the current explicit restriction. [Reporting contract](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/ads-reporting?view=li-lms-2026-10), [report timezone](https://www.linkedin.com/help/lms/answer/a420851/time-zones-for-ads-reporting?lang=en).

Qualification requires the Advertising product and intended access tier, `rw_ads`/`r_ads`/`r_ads_reporting` as applicable, account roles, organization publishing/read rights, image/post authority, billing and review. Development-tier account limits are provider entitlements, not a proposed customer cap. [Access tiers](https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access?view=li-lms-2026-03).

**Deterministic failure tests**

These are proposed exercises; none were executed during research.

| Exercise | Required result |
|---|---|
| Parent succeeds, child fails | Record per-item outcomes; never enable incomplete graph |
| Provider commits create, response disappears | Mark unknown; no blind recreation |
| Same-name unrelated resource appears | Reject adoption without exact account, parent and content evidence |
| Older enable arrives after STOP/pause | Keep STOP pending, compensate and reread |
| Child active under paused parent | Preserve configured/effective distinction |
| External child, target, budget or creative changes | Block enable on approval/binding mismatch |
| Missing middle page or repeated cursor | Report/inventory remains incomplete |
| Empty report after permission removal | Access unknown, not zero performance |
| Timezone, currency exponent or precision mismatch | Reject conversion or publication |
| Delayed/revised metrics | Preserve extraction time and correction history |

Provider-specific fixtures:

- **Google:** validation creates no IDs; atomic mutation rejection leaves no graph; partial-failure fixtures preserve successful operations and dependent temporary-ID errors; inventory includes zero-spend resources.
- **Meta:** ignored idempotency header keeps retry capability disabled; changed-body key reuse and expired keys never cause automatic replay; v25 Instagram identity readback matches; failed/skipped async reports cannot publish.
- **Microsoft:** null IDs and unordered indexed errors map correctly; prohibited non-portfolio `MaxCpc` is surfaced rather than silently removed; geography overrides are evaluated; missing `TimePeriod` fails the report schema.
- **TikTok:** reject unsupported custom identity for TikTok placement; expired Spark rights block enable; retry after the ten-second window remains unknown; reject stale `opt_status`; split daily reporting beyond 30 days.
- **LinkedIn:** verify singular objective and account-scoped routes; capture header IDs; image processing must finish; creative-review pause failure leaves the parent held; oversized or unauthorized analytics results remain incomplete/unknown.

**Launch evidence and remaining limitations**

Before acquiring customers, implement and exercise all five adapters, their resource readback, reporting, unknown-outcome reconciliation and owner recovery. Real provider qualification can use appropriately authorized owner-controlled accounts; it does not require a customer pilot.

Mocks cannot establish app approval, production access, actual account/asset rights, billing eligibility, platform review or actual serving. Provider writes and any spending require their own authorization.

Some official pages returned empty content, rate limits or stale SOAP-rendered text; browser documentation supplied current content where available. Two explicit contract qualifications remain:

1. **Meta:** v25 support and actual app enablement for create idempotency.
2. **Microsoft:** raw REST polymorphic serialization; establish wire fixtures from the supported current SDK.

No live acceptance, review eligibility or delivery has been claimed.
