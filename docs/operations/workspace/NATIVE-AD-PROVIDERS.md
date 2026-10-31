# Native ad provider wire layer

Local implementation checkpoint, 2026-10-31. This is **pure/fake-call evidence**, with no provider writes, sandbox claims, account qualification or live spending evidence. The shared ads kernel owns credentials, current permissions, tenant locks, rights, budget reservations, exact approval/revocation, one dispatch checkpoint, operation receipts and immutable binding storage. These modules do not fetch, send mutations, retry, or write SQL.

## Public interface and exact bytes

Import from `worker/workspace/ads/providers/index.mjs`:

```js
compileNativePlan(provider, spec, identity)
buildNativeRequest(provider, {plan, action, step_key, bindings})
readNativeStep(provider, {plan, step_key, bindings, phase}, {call})
extractNativeCreateBindings(provider, {plan, step_key, response, headers})
buildNativeValidationRequest('google_ads', {plan, bindings})
parseNativeJson(rawResponseText)
```

The only provider keys are `google_ads`, `meta_ads`, `microsoft_ads`, `tiktok_ads`, `linkedin_ads`. Unknown fields, formats and environments fail. `identity` is exactly `{provider,environment:'production',account_id,currency,timezone}`, optionally `manager_id` and `customer_id`. Microsoft requires `customer_id` and its native timezone enum; LinkedIn requires `timezone:'UTC'`. The other providers use the exact current native account timezone string. IDs and all user money values must be strings. Native production accounts, currency, timezone, active status and referenced media/identities are read again by the identity prerequisite. Test accounts are unsupported.

`plan` is recursively frozen, JSON serializable, and includes `schema:'wm-native-ads/1'`, `provider`, `family`, `environment`, `account_id`, `currency`, `timezone`, `marker`, `identity`, `spec`, `steps`, `active_status`, `enable_order`, `pause_order`, `limit_semantics`, `qualification_required`. Each step has `key,role,depends_on,parent,create_status,controllable,body` and relevant inventory/atomic-create metadata. References such as `{$ref:'campaign',field:'id'}` resolve only when a request is built. `{$number:'123.45'}` denotes an exact native JSON numeric token; it is not a JavaScript floating-point number.

Every request descriptor has this exact top-level shape:

```js
{
  schema: 'wm-native-request/1', provider, environment, account_id,
  method, url, write, operation, headers,
  body, body_encoding, typed_body, expect,
  automatic_retry: false, credential_context
}
```

**`request.body` is the final wire string, or `null`. Send and hash its UTF-8 bytes directly. Never `JSON.stringify(request.body)` and never serialize `typed_body` for transport.** `body_encoding` is `json`, `form`, or `none`. Meta uses URL-encoded form data whose nested values are already JSON strings. Other providers use exact JSON text. `typed_body` is an audit/preview copy with number wrappers. Headers contain only content/version/Rest.li method metadata, never secrets. `credential_context` carries the account and supplied manager/customer IDs; the caller adds authorization and provider-required developer/customer/account headers after verifying the current connection. No request accepts an arbitrary endpoint.

`call(request,{write:false})` is injected for reads only. Return either raw JSON text, a lossless native object, or `{status:200,body:rawJsonText}` / `{status:200,data:losslessObject}`. Prefer raw text so `parseNativeJson` can preserve native int64 and decimal lexemes **before** JSON parsing rounds them. Native numeric values in a supplied lossless object must be strings; booleans remain booleans. A bare native `{data:[...]}` or TikTok `{code:0,data:{...}}` remains a native envelope. A wrapper requires a numeric HTTP `status`. HTTP/transport/native errors, unreadable inventories and pagination limits produce an unknown readback, never permission to replay.

Google GAQL and Microsoft `/Query...` reads use HTTP POST with `write:false,operation:'query'`. Google `validateOnly` is also a non-mutating POST. A generic HTTP-POST-equals-write classifier must not route these as mutations. Actual creates, controls and updates use `write:true`. The factories do not perform either kind of call.

## Exact example inputs

These objects are complete valid compiler inputs; IDs are illustrative strings, not qualified references. Replace them using verified native account/media/identity records and current caller-owned rights evidence. The example schedule is explicit and does not cause a call.

```js
const marker = '0123456789abcdef0123456789abcdef';
const shared = {marker, name:'Approved test'};
const url = 'https://example.com/approved';
const imageSha = 'a'.repeat(64);
const rsa = {
  headlines:['A precise headline','Another approved headline','Third approved headline'],
  descriptions:['The first exact approved description.','The second exact approved description.']
};
const examples = {
  google_ads:{...shared,
    daily_budget_micros:'123450000', cpc_bid_micros:'1500000',
    starts_on:'2026-11-02', ends_on:'2026-11-30',
    location_ids:['2840'], language_ids:['1000'], keywords:['exact phrase'],
    ...rsa, url, eu_political_advertising:'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING'
  },
  meta_ads:{...shared,
    daily_budget_minor:'12345', starts_at:'2026-11-02T00:00:00Z',
    ends_at:'2026-11-30T23:59:59Z', countries:['US'],
    page_id:'123456789', instagram_user_id:'234567890',
    image_hash:'b'.repeat(32), image_sha256:imageSha,
    rights_evidence:'rights/approved-image', copy:'Exact approved text',
    headline:'Approved headline', description:'Approved description',
    url, special_category:'NONE'
  },
  microsoft_ads:{...shared,
    daily_budget_major:'123.45', starts_on:'2026-11-02', ends_on:'2026-11-30',
    language:'English', location_ids:['190'],
    keywords:['exact phrase'], ...rsa, url
  },
  tiktok_ads:{...shared,
    total_budget_major:'1234.56', starts_at:'2026-11-02T00:00:00Z',
    ends_at:'2026-11-30T23:59:59Z', location_ids:['6252001'],
    identity_id:'123456789', business_center_id:'234567890',
    tiktok_item_id:'345678901', authorization_expires_at:'2099-12-01T00:00:00Z',
    rights_evidence:'rights/approved-spark-post', media_sha256:imageSha,
    url, campaign_request_id:'9007199254740993'
  },
  linkedin_ads:{...shared,
    group_total_budget_major:'1234.56', daily_budget_major:'123.45',
    cpc_bid_major:'2.50', starts_at_ms:'1793577600000', ends_at_ms:'1796083199000',
    location_urns:['urn:li:geo:103644278'],
    organization_urn:'urn:li:organization:123456789',
    image_urn:'urn:li:image:C4Dapproved', image_sha256:imageSha,
    rights_evidence:'rights/approved-image', copy:'Exact approved text',
    title:'Approved article', description:'Approved article description', url
  }
};
const identityFor = provider => ({
  provider, environment:'production', account_id:'90071992547409931', currency:'USD',
  timezone:provider==='microsoft_ads' ? 'EasternTimeUSCanada'
    : provider==='linkedin_ads' ? 'UTC' : 'America/New_York',
  ...(provider==='microsoft_ads' ? {customer_id:'987654321'} : {})
});
const plans = Object.fromEntries(Object.entries(examples).map(([provider,spec]) =>
  [provider,compileNativePlan(provider,spec,identityFor(provider))]));
```

The exact `{family,steps,enable_order,pause_order}` output projections for these inputs are:

| Provider | `family` | `steps.map(s=>s.key)` | Enable order | Pause order |
| --- | --- | --- | --- | --- |
| Google | `search-rsa-exact-manual-cpc-v1` | `identity,graph,budget,campaign,location0,language0,group,keyword0,ad` | `ad,group,campaign` | `campaign,group,ad` |
| Meta | `website-traffic-non-special-image-feed-v1` | `identity,campaign,adset,creative,ad` | `ad,adset,campaign` | `campaign,adset,ad` |
| Microsoft | `search-standard-rsa-exact-maxclicks-v1` | `identity,campaign,location0,location_intent,group,keyword0,ad` | `ad,group,campaign` | `campaign,group,ad` |
| TikTok | `manual-traffic-website-spark-bc-single-video-v1` | `identity,campaign,group,ad` | `ad,group,campaign` | `campaign,group,ad` |
| LinkedIn | `website-visit-single-image-dsc-cpc-v1` | `identity,group,campaign,post,creative` | `creative,campaign,group` | `group,campaign,creative` |

Google `graph` produces seven resources for this example in one atomic `googleAds:mutate` (`partialFailure:false,validateOnly:false`). Its individual logical steps have `create_via:'graph'` and cannot be separately created. The `graph` step's `produces` array maps positional mutation responses to logical keys. Every other provider has one create mutation per non-identity step. Criteria/keywords are complete before the first ad is enabled; the controllable root remains paused. Google exact keywords and Microsoft exact keywords can be enabled on creation while their paused ancestors prevent delivery.

## Binding and dispatch example

```js
const provider = 'meta_ads';
const plan = plans[provider];
const prerequisite = await readNativeStep(provider,
  {plan,step_key:'identity'}, {call:credentialedReadOnlyCall});
// Proceed only on prerequisite.state === 'matched', with a current kernel permit.
let bindings = prerequisite.bindings;
const request = buildNativeRequest(provider,
  {plan,action:'create',step_key:'campaign',bindings});
```

For that exact example the request URL is
`https://graph.facebook.com/v25.0/act_90071992547409931/campaigns`, method `POST`, encoding `form`, and body is exactly:

```text
name=Approved+test+%5Bwm%3A0123456789abcdef0123456789abcdef%3Acampaign%5D&objective=OUTCOME_TRAFFIC&buying_type=AUCTION&status=PAUSED&special_ad_categories=%5B%5D&is_adset_budget_sharing_enabled=false
```

After the caller's independently authorized single POST and durable response checkpoint:

```js
const extraction = extractNativeCreateBindings(provider, {
  plan, step_key:'campaign', response:'{"id":"900719925474099301"}'
});
```

The exact extraction is:

```json
{
  "bindings": {
    "campaign": {
      "provider":"meta_ads", "environment":"production",
      "account_id":"90071992547409931", "plan_marker":"0123456789abcdef0123456789abcdef",
      "step_key":"campaign", "role":"campaign",
      "id":"900719925474099301", "verified":false, "content_verified":false
    }
  },
  "verified":false, "checkpoint_then_read_required":true,
  "automatic_replay_allowed":false, "provider_errors":null, "tracking_id":null
}
```

Unverified IDs cannot create children. Merge the captured binding with current verified prerequisites, then call `readNativeStep(provider,{plan,step_key:'campaign',bindings},{call})`. Exactly one full native match produces a verified logical binding. A successful normalized resource has `provider,environment,account_id,plan_marker,step_key,role,id,resource_name,configured_status,effective_status,review,delivery_observed:false,native,verified:true,content_verified:true`. Preserve the entire typed binding, including `plan_marker`; a different plan's records are rejected even within one native account. Google uses full `resource_name` references and composite criterion/ad IDs; LinkedIn uses numeric campaign/group/creative IDs plus resource URNs, and a share/ugcPost URN as the post ID. Other providers use decimal ID strings.

Create-response extraction for Google preserves operation positions, Microsoft preserves null ID slots, indexed `PartialErrors` and `TrackingId`, and LinkedIn requires the captured `x-restli-id` header. Extraction never confers content verification or an automatic retry permit. If no response ID survived, omit that logical binding and discover via fresh native reads. Zero or multiple matches remain unknown. Discovery checks the locally frozen marker names plus exact account/parent/type/content/status/budget. Native names remain mutable and copyable: this is a current full graph match, **not a provider-generated immutable attribution guarantee**. The kernel must retain that distinction and its original intent/approval evidence.

After creation, read `step_key:'graph',phase:'created'`. Before releasing the final root, enable and verify each earlier `enable_order` entry, then read `step_key:'graph',phase:'children_enabled'`. Pass the returned `bindings`, including `_graph`, into the final root enable factory. `_graph` freezes the exact approved spec, environment/account/marker, phase and logical ID/resource/status summary. Missing, stale, altered or incomplete summaries are rejected. `phase:'enabled'` verifies all controllable nodes active; `phase:'paused'` verifies the root paused and verifies other children against their supplied active/paused bindings. Each read is a point-in-time observation; it cannot prevent native external edits between a read and a POST.

Graph inventories reject extra current ad groups/ad sets, ads/creatives and criteria under owned parents, not only matching marker names. Google also checks budget consumers, explicit asset/asset-set/shared-set links and bid modifiers. Microsoft inventories every concrete retrieval flag in the module and all native ad types; unsupported/unreadable native flags make proof unknown rather than being skipped. Pagination uses fixed request builders and bounded cursors, never arbitrary returned next URLs; the limits are 100 pages and 10,000 objects per paged inventory. Legacy/unrelated objects elsewhere in the native account are not adopted. Native account-level defaults and inherited assets require the separate qualification below.

Unknown readback has the same top-level shape as a successful readback, with `state:'unknown',verified:false,bindings:{}` and a reason such as `ambiguous`, `no_exact_match`, `unmanaged_or_missing_descendants`, `native_asset_rights`, `native_read_unavailable`. All readbacks include `proof.automatic_replay_allowed:false`, `proof.provider_attribution_proven:false` and `proof.delivery_proven:false`. Candidate arrays on an unknown graph may describe the ambiguous step for diagnosis; they are not complete graph matches or saveable bindings. A matched graph sets `_graph.native_review_approval_proven:false`: configured status and exact content do not prove creative review approval, rights, current write permission, impressions, billing or delivery.

`pause` needs only the typed root binding and can be built even while creation is incomplete or previous verification is unavailable. Pause is still a real mutation, with an independently authorized, durable attempt. Pause the roots first. Microsoft/Google/Meta/TikTok then allow child pauses; LinkedIn can reject creative pauses during review, so its campaign/group controls are the independent emergency controls. Supported `update` is intentionally only the newly approved budget/bid fields on a verified paused root: Google budget; Meta ad set daily budget; Microsoft campaign daily budget; TikTok campaign/adgroup total budget; LinkedIn group total budget or campaign daily budget/unit cost. Changing other content is unsupported. The caller must cancel old approvals and reserve any newly authorized budget before any update.

## Native families and qualification boundaries

| Provider | Fixed wire contract and native controls | Required qualification before live release |
| --- | --- | --- |
| Google v26 | Search only, ManualCPC, non-shared STANDARD budget, Google Search only, presence geo, explicit non-EU-political declaration, account-calendar start/end dates, language/location criteria, SearchStandard group, exact keywords, 3–15 RSA headlines and 2–4 descriptions. Paused campaign/group/ad in one atomic graph. | Successful v26 `validateOnly` for the exact graph; current billing/native minima; account-level automatically inherited assets and policy/review/measurement eligibility. Tracking URL/suffix overrides and extra explicit descendants are rejected. An atomic timeout is still unknown and is not replayed. |
| Meta v25.0 | Non-special-category US website Traffic only; OUTCOME_TRAFFIC/AUCTION, ad-set budget/LINK_CLICKS/IMPRESSIONS, Facebook Feed plus Instagram Feed, Page-associated IG business identity and existing account image hash. Campaign/adset/ad paused; named creative has a real effective Page post. | Current Page/IG ad publishing permissions and ready image hash, separate approved SHA/rights binding, current v25 targeting/Advantage+ creative default projections and review. No automatic image upload, story publication retry, asset-feed format, special category or unproved targeting expansion. |
| Microsoft v13 | Search/English, DailyBudgetStandard/MaxClicks, geo criteria plus PeopleIn intent, SearchStandard group with native owned-and-operated **and syndicated Search** network, exact keywords, RSA. Campaign/group/ad paused. No `MaxCpc` is sent. | Capture raw official REST/SDK polymorphic JSON and response fixtures for this exact account family, including `Type` discriminators and all concrete inventory flags. Public MaxClicks pages distinguish create `Type:'MaxClicks'` from returned `MaxClicksBiddingScheme`; both are read explicitly. Serialization/read errors block proof. No new non-portfolio MaxCpc fallback. |
| TikTok v1.3 | Manual regular Traffic/Website/Click Spark ad, TikTok placement, NO_BID/CPC, campaign and group TOTAL budgets, explicit UTC start/end, current BC_AUTH_TT identity and one already-authorized post. Campaign/group/ad DISABLE. | Exact native advertiser/identity/post eligibility, BC binding, current availability/can-pull-video/non-GPPPA, independent current Spark/copyright/music rights and supplied expiry covering the entire schedule. Native preview access is not a license or a SHA proof. Campaign request ID has a short native retention window; it is never an automatic replay permit. Other identity types and non-Spark/app/catalog/Smart+/GMV formats are unsupported. |
| LinkedIn REST 202610 | UTC, WEBSITE_VISIT/SPONSORED_UPDATES/STANDARD_UPDATE/CPC/NONE, explicit unit cost, daily campaign budget and group total, US-English interface locale, fixed geo, offsite/expansion disabled; paused group/campaign and intendedStatus-paused creative. DSC article references one existing AVAILABLE organization-owned image. | Current approved organization publishing role, native image readiness/rights and current review; qualify `adContext.dscName` create/read projection and 202610 account-scoped routes. DSC post creation is a real PUBLISHED resource with feedDistribution NONE, not a fake draft. Missing marker/read projection remains unknown. Post names are internal DSC names; no marker is appended to approved visible copy. |

All budget fields are native pacing/limit controls; `limit_semantics.hard_spend_cap` is always false. Google average daily budgets can overdeliver within native charging rules; Meta daily budgets are average pacing targets; Microsoft DailyBudgetStandard is provider-paced. TikTok TOTAL and LinkedIn group total are native lifetime controls with possible delayed delivery/charging observations, not instant invoice/credit ceilings. LinkedIn daily budget uses UTC. Money is never converted with a universal 100-subunit assumption: Google micros, Meta account subunits, and other providers' native account major units remain explicitly distinct. The shared kernel must enforce conservative cross-operation reservations and authoritative actual-spend reconciliation; these factories provide no global spend guarantee.

Each compiled plan retains `qualification_required`. The fake tests below do not satisfy those requirements. No module claims a native SHA, commercial license, immutable external marker, fresh write authorization or completed policy review from a configured-status match. Exact native IDs/media/Spark/organization references must come from independently verified current records. Additional formats, countries/languages where narrowed above, automated bidding variants, uploads, identity authorization, accounts/billing creation, tracking templates and arbitrary patches are explicit unsupported scope.

## Evidence and primary documentation

`node --test tests/workspace/ads-providers.test.mjs` covers five complete graphs and native versions/payload fields, paused creation/parent-last release, independent root pause, exact decimal/native int64 bytes, indexed partial failures, lost/empty/multiple readback, account/parent/type/budget/content drift, extra unmanaged children, current media/identity revocation, read-only POST classification and later-page discovery. These are synthetic calls, with no credentials or real provider operations.

Fresh official references checked for the implementation:

- Google: [v26 RSA creation](https://developers.google.com/google-ads/api/docs/responsive-search-ads/create-responsive-search-ads), [campaign creation and current schedule fields](https://developers.google.com/google-ads/api/docs/campaigns/create-campaigns), [v26 Campaign](https://developers.google.com/google-ads/api/reference/rpc/v26/Campaign), [EU declaration](https://developers.google.com/google-ads/api/docs/api-policy/eu-par).
- Meta: [Marketing API campaign creation](https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group/), [official generated object-story spec](https://github.com/facebook/facebook-java-business-sdk/blob/main/src/main/java/com/facebook/ads/sdk/AdCreativeObjectStorySpec.java). Public reference visibility varies; no inaccessible page is treated as captured live wire qualification.
- Microsoft: [MaxClicks and current MaxCpc restriction](https://learn.microsoft.com/en-us/advertising/campaign-management-service/maxclicksbiddingscheme?view=bingads-13), [account query](https://learn.microsoft.com/en-us/advertising/customer-management-service/getaccount?view=bingads-13), [campaign criterion retrieval](https://learn.microsoft.com/en-us/advertising/campaign-management-service/getcampaigncriterionsbyids?view=bingads-13), [ad-group criterion retrieval](https://learn.microsoft.com/en-us/advertising/campaign-management-service/getadgroupcriterionsbyids?view=bingads-13), [campaign retrieval flags](https://learn.microsoft.com/en-us/advertising/campaign-management-service/campaigncriteriontype?view=bingads-13), [group retrieval flags](https://learn.microsoft.com/en-us/advertising/campaign-management-service/adgroupcriteriontype?view=bingads-13).
- TikTok: [current identity list](https://business-api.tiktok.com/portal/docs/get-the-identity-list/v1.3), [official identity API](https://github.com/tiktok/tiktok-business-api-sdk/blob/main/js_sdk/docs/IdentityApi.md), [native Spark preview read](https://business-api.tiktok.com/portal/docs/faqs-overview/v1.3), [authorization workflow](https://business-api.tiktok.com/portal/docs/get-sparks-ads-authorization/v1.3).
- LinkedIn: [202610 campaign routes](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/account-structure/create-and-manage-campaigns?view=li-lms-2026-10), [objective values](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/account-structure/campaign-objectives?view=li-lms-2026-09), [Posts/DSC and dscName](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-10), [image readiness](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api?view=li-lms-2026-10), [organization roles and offset pagination](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-access-control-by-role?view=li-lms-2026-06).

The detailed pre-implementation official payload review remains [AD-ADAPTER-REVIEW.md](AD-ADAPTER-REVIEW.md). These sources establish the intended protocol, not account access, billing, license rights or live delivery qualification.

Main review added required Microsoft account-calendar start/end dates to its
SearchStandard ad group. Exact date-object readback is part of graph matching;
ignored or changed dates cannot authorize enablement. Dates at or after 2050-01-02
are refused because native end-date semantics can remove the end date. The end
date is inclusive in the campaign timezone.
[Microsoft AdGroup date contract](https://learn.microsoft.com/en-us/advertising/campaign-management-service/adgroup?view=bingads-13).
