# Shared and recurring media budgets

This module implements customer-approved shared media commitments, fixed allocation keys, bounded operator rebalances and explicit calendar-month recurrence. It does not write to ad providers. Native daily budgets are pacing controls with provider-specific overdelivery rules; neither a native average daily target nor this internal approval ledger is a provider-enforced hard spending cap.

## Human workflow

An assigned, currently verified ads operator proposes immutable pool terms for one engagement and its current accepted agreement. A current named customer spending authority approves the exact returned digest and terms using recent authentication. Customer admin membership alone does not create spending authority. Accepted terms persist across recurring periods without a new monthly approval while the issuer's exact membership, named authority, verified identity, agreement, connected scopes and generations remain current.

Approval snapshots bind the credential owner to a hash of the current complete direct assignment and staff grant, including monotonic grant versions. Revoking and restoring the same apparent grant does not revive old authority. Membership, named authority, agreement, service termination and relevant staff changes invalidate accepted pools and queue defensive STOP. STOP does not resume anything and never clears a customer's existing STOP. Expired positive spending permission does not prevent a currently authorized withdrawal.

Terms may be approved during service setup. Generation waits for service commencement and current positive control without manufacturing a period, revoking the accepted terms, or requiring another customer approval. Ended or otherwise invalid authority is withdrawn rather than treated as onboarding.

Amounts are canonical, nonnegative decimal **strings of native currency minor units**, at most 18 digits. The module does not assume every currency has 100 minor units. Currency conversion and cross-currency pools are unsupported. The native plan/compiler and trusted orchestration layer must validate each account's money scale, budget units and safe provider pacing/overdelivery math.

## Public commands and data

`worker/workspace/budgets/service.mjs` exports:

- `MEDIA_BUDGET_COMMANDS`, `validateMediaBudgetCommand(command,input)`.
- `mediaBudgetCommand(env,session,org,command,input,key,{call,control}={})`.
- `mediaBudgetStatus(env,session,org,{call,control}={})`.
- `runMediaBudgets(env,{call}={})`, enabled only when `MEDIA_BUDGETS_ENABLED` is the string `"true"`.
- `synchronizeMediaSpend(env,query,{readSpend=null,call}={})`.

The human adapter calls `wm_media_budget_command(p_org,p_command,p_input,p_key)` and rechecks external-recovery generation around the RPC. The stable key is required; exact retries return the recorded outcome after current audience checks. Current access, recent authentication, versions and server-side named customer authority are enforced in SQL, independently of forms.

`media_budget.propose` accepts `{engagement_id,agreement_id,terms,replaces_pool_id?}`. Exact terms:

```json
{
  "currency": "USD",
  "total_minor": "100000",
  "reserve_minor": "10000",
  "timezone": "America/New_York",
  "starts_at": "2026-11-01T00:00:00-04:00",
  "ends_at": "2027-02-01T00:00:00-05:00",
  "expires_at": "2027-02-01T00:00:00-05:00",
  "recurrence": "calendar_month",
  "routine_limits": {
    "max_rebalance_minor": "20000",
    "max_rebalances": 4,
    "allowed_actions": ["create", "enable", "update", "pause"]
  },
  "allocations": [
    {
      "key": "search",
      "provider_scope_id": "00000000-0000-4000-8000-000000000001",
      "provider": "google_ads",
      "environment": "production",
      "account_id": "1234567890",
      "currency": "USD",
      "timezone": "America/New_York",
      "initial_minor": "60000",
      "cap_minor": "80000",
      "unmanaged_minor": "0"
    },
    {
      "key": "social",
      "provider_scope_id": "00000000-0000-4000-8000-000000000002",
      "provider": "meta_ads",
      "environment": "production",
      "account_id": "90071992547409931",
      "currency": "USD",
      "timezone": "America/New_York",
      "initial_minor": "30000",
      "cap_minor": "60000",
      "unmanaged_minor": "0"
    }
  ]
}
```

The example UUIDs and accounts are placeholders. Supported provider values are `google_ads`, `meta_ads`, `microsoft_ads`, `tiktok_ads`, and `linkedin_ads`; environment is `production` or `test`. Provider, environment, account, native timezone and currency must exactly match current connected provider scopes; no credential or license is inferred. Allocation keys and scopes are unique. Initial allocations plus the unallocated reserve must equal the total. Per-allocation caps may allow flexibility but never create extra pool money. The reserve is not routine allocation room. An explicit unmanaged commitment floor is part of the terms; known historical floors cannot be reduced by a browser claim.

The supported period is a PostgreSQL IANA/UTC calendar month. Explicit timestamp offsets are mandatory; `starts_at < expires_at <= ends_at`, with bounded two-year terms and current customer authority/contract expiry. `once` must fit one local calendar month; `calendar_month` creates unique local month periods, including DST. A partial first/last period receives the explicit accepted amount; there is no implicit prorating. A native timezone enum is retained as native scope metadata and is not silently treated as an IANA name.

Other command inputs:

```js
// Use digest and version returned by propose/list; these are not client recomputations.
{pool_id, expected_version: 1, digest, shown_terms_digest: digest} // media_budget.approve
{pool_id, expected_version: 2, reason}                           // media_budget.revoke
{pool_id, expected_version: 1, period_key: '2026-11',
 allocations: [{key:'search',assigned_minor:'50000'},
               {key:'social',assigned_minor:'40000'}], reason}  // media_budget.rebalance
```

Rebalance's expected version is the **period** version. It must submit the entire exact allocation set, preserve the total and reserve, stay within accepted caps and cumulative count/transfer bounds, and leave all held room funded. It does not edit accepted terms. A material replacement is a new proposal with `replaces_pool_id`; it preserves engagement, currency, calendar and exact allocation/scope identities, supersedes only the accepted pool, and retains global commitments. A future replacement cannot prematurely supersede current authority.

`wm_media_budget_list(p_org)` returns at most 20 pools and two recent periods per pool. Money and projected versions are strings, with explicit `can_approve`, `can_revoke`, held amounts and evidence limitations. It does not expose credential-owner snapshots, tokens or grant fingerprints. Ads operators and customer admins can read the applicable business projection; a named contributor is restricted to their exact engagement authority.

## Native orchestration bridge

These are **private SQL helpers**, not public PostgREST calls or stand-alone permissions. The main native ads producer/context must invoke them from its own checked SECURITY DEFINER RPC under the tenant guard:

```sql
wm.ad_budget_attach(org uuid, revision uuid) returns uuid
wm.ad_budget_current(org uuid, budget uuid, operation uuid,
                     require_reservation boolean default false) returns jsonb
wm.ad_budget_reserve(org uuid, budget uuid, operation uuid) returns jsonb
```

The exact approved campaign revision manifest must include:

```js
{
  provider, account_id, currency, budget_minor: '40000',
  goal, audience, copy, landing_page,
  native_ads: {
    schema: 'wm-native-package/1', pool_id, allocation_key, provider_scope_id,
    plan_hash, native_plan: compiledPlan, rights_ids: [rightsUUID],
    measurement_id: measurementUUIDOrNull
  }
}
```

`plan_hash` is the lowercase SHA-256 of canonical native plan JSON: recursively sorted object keys with compact separators, preserving array order and exact strings. `measurement_id` is an explicit key and may be null. The plan has schema `wm-native-ads/1`, the current provider/environment/account/currency and an immutable `marker` matching `^[a-z0-9][a-z0-9_-]{15,63}$`. SQL verifies the exact current campaign revision approval/digest as well as pool scope/plan content, returns a row ID compatible with existing `wm.budget_authorizations`, and preserves that table's original customer `authority_id` FK and exact revision binding. The main kernel still owns campaign approval, provider permissions, rights, measurement and final native current-state checks.

At prepare and every positive dispatch boundary call `ad_budget_current(...,false)` for the exact operation. Operations must bind their exact revision, provider scope, provider/action, `payload.budget_id`, current actor and recovery/external/authority versions and STOP epoch. For the final independently controllable root enable or a positive budget expansion, call `ad_budget_reserve`, then require `ad_budget_current(...,true)` before POST. Parent creation and child enables must not independently reserve the entire campaign amount. Parent orchestration owns the durable one-intent/one-POST/unknown-outcome boundary.

The commitment identity is `(organization,scope,calendar timezone/start/end,request_id + ':' + native_plan.marker)`. Preserve the marker across approved revisions of the **same actual managed root**; new roots require new markers. Final-root retries and sibling root operations for the same package in a period share a high-water commitment. A replay reserves delta zero; an approved increase reserves only the positive delta. A different marker consumes separate room. Do not reuse markers to conceal independent spend roots. Exact operation links are immutable.

Reservations serialize under the existing tenant guard, so cross-operation/pool checks and writes are atomic. Different accepted pools do not create duplicate capacity for overlapping scope/calendar commitments. Unresolved packages carry their conservative high-water into the next period exactly once. The hold is the conservative maximum of package commitments plus unmanaged account floor, and exact complete machine account spend. No settlement path decreases a prior high-water, erases billed/late spend or frees an unknown outcome.

`wm_media_budget_observe_stop(p_org,p_scope)` is machine-only and can close future carry only after the existing kernel proves the exact current STOP complete/verified with no unresolved positive operations or attempts. It does not decrease any old reservation/high-water, clear STOP, or grant resume. A confirmed native pause by itself is insufficient.

## Scheduling and trusted actual-spend evidence

Wire `runMediaBudgets` into the shared scheduler as its own recorded stage. It calls machine-only `wm_media_budget_generate(p_limit default 10)`, bounded at 25. The generator selects the due-priority set, then takes tenant guards in organization UUID order; it never depends on the approving customer's human session. `next_check_at` provides bounded fair traversal. It rechecks saved issuer/current scope/service/contract/generations and returns current, attention, expired/revoked or pending service/control results. Invalid positive authority queues defensive STOP without gaining provider write permission.

There is currently **no qualified automatic native account-spend/finality reader** registered by this module. `synchronizeMediaSpend` without an injected trusted `readSpend` returns `pending_native_evidence`, makes no settlement RPC, and reports `held_commitments_released:false`. Browser-entered actual totals are unsupported. Native inventory, cross-account calendar normalization and final late-billing qualification remain the main orchestration/reader's responsibility; absent qualified evidence, conservative commitments remain held.

A trusted native reader may submit only a complete account-wide receipt through machine-only `wm_media_budget_record_spend(p_org,p_input)`:

```js
{
  schema: 'wm-native-media-spend/1',
  provider_scope_id, provider, environment, account_id, currency, timezone,
  period_start, period_end,
  source: provider + '_native_account_spend/v1',
  query_hash, raw_hash, normalized_hash,
  coverage: 'complete', scope: 'ACCOUNT_ALL_CAMPAIGNS',
  finalized_through, observed_at, amount_minor: '90071992547409931',
  recovery_generation, external_generation
}
```

The machine reader owns actual native byte/query verification and private raw receipt storage. All three hashes must be SHA-256. SQL rebinds the exact current native scope/account/currency/timezone/generations and existing accepted full native calendar period; partial campaign rows cannot masquerade as a complete account zero. The observation must be recent and finalized through the period end, not in the future. `normalized_hash` is SHA-256 of canonical JSON of the receipt after removing `query_hash`, `raw_hash`, `normalized_hash`, `observed_at`, `recovery_generation`, `external_generation` and `finalized_through`. Raw/query hashes remain immutable provenance, not a claim that SQL fetched the provider. Duplicate proofs are idempotent. Actual spend is an additional conservative floor; even accepted evidence does not release commitments. Lifetime settlement/release needs a separately reviewed qualified protocol.

## UI and persistence integration

`src/workspace/budget-ui.mjs` exports `budgetViews({esc,dateTime}).panel(data,{org,engagements,agreements,scopes})` and `budgetFormInput(command,form)`. Supply current workspace engagement/agreement/scope options. Forms use `data-budget-action` and `data-organization`; wire them through the common signed-in command handler and refresh the projection after success. Suggested shared routes are GET `/api/media-budgets?business=...` via `mediaBudgetStatus`, plus the existing signed-in command route for `MEDIA_BUDGET_COMMANDS`. No shared route, scheduler, manifest, build asset or app wiring is changed by this contribution. All inserted values are escaped; there are no inline scripts/styles. Customer approval presents exact terms and a required acknowledgment, and withdrawal remains visible after positive expiry when current named authority permits it.

The CLI-generated migration is `20261031161551_media_budgets.sql`. Its eight private RLS tables are `media_budget_pools`, `media_budget_decisions`, `media_budget_periods`, `media_budget_allocations`, `media_budget_commitments`, `media_budget_links`, `media_budget_operation_links`, and `media_budget_spend_evidence`. Raw table grants are revoked; decisions, proofs and operation links are immutable. Accepted terms and commitment high-waters are protected by triggers. The eight exact table shapes are explicitly added to the tenant backup registry. Existing restore schemas/typed replicas remain untouched and must receive the main agent's separate reviewed compatibility amendment before qualification.

## Verification and remaining qualification

Run `node --test tests/workspace/budgets.test.mjs`. Actual PGlite cases cover current customer/operator/MFA separation, immutable terms and private grants, replay/high-water expansion/new roots, bounded rebalance, timezone/DST recurrence and uniqueness, expiry-safe withdrawal, unknown-spend retention, authority/service/staff regrant invalidation, strict provenance and exact huge integers, escaped UI, fair bounded generation, setup waiting and replacement/carry behavior. Two separate-client PostgreSQL races in this same file are guarded by `WORKSPACE_TEST_DATABASE_URL`: competing root reservations and concurrent period generation. Local PGlite success does not qualify those PostgreSQL races, live provider accounting, currency scales, overdelivery math or native reporting completeness. No provider call, automatic POST retry or live evidence is supplied by this module.
