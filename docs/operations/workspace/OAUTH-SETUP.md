# Platform connections

Implementation checkpoint, 2026-10-30. These adapters are not live-qualified.
No provider credentials, authorization grants or advertising writes were created
during this checkpoint. The existing effect dispatcher still blocks advertising
adapters. `read_verified` account binding is not write qualification or consent
to spend. Production remains unpublished.

## Server configuration

Store credentials through Worker secrets. `INTEGRATION_KEY_ID` selects a key in
`INTEGRATION_KEYS`, a JSON map of key IDs to base64url-encoded 32-byte AES keys.
Keep old keys available during rotation. The independent `RECOVERY_CONTROL`
binding must be available and match the current business generation.

For each family configure `<FAMILY>_CLIENT_ID`, `<FAMILY>_CLIENT_SECRET` and
`<FAMILY>_ACCOUNT_ENVIRONMENT` (`test` or `production`). Families are `GOOGLE`,
`META`, `MICROSOFT`, `TIKTOK`, `LINKEDIN`. A provider-specific environment such
as `GOOGLE_ADS_ACCOUNT_ENVIRONMENT` overrides the family value. Analytics and
Search Console use production resources even when the application is in staging.
Explicit per-provider flags are `GOOGLE_ADS_OAUTH_ENABLED`,
`ANALYTICS_OAUTH_ENABLED`, `SEARCH_CONSOLE_OAUTH_ENABLED`, `META_ADS_OAUTH_ENABLED`,
`MICROSOFT_ADS_OAUTH_ENABLED`, `TIKTOK_ADS_OAUTH_ENABLED`, and
`LINKEDIN_ADS_OAUTH_ENABLED`; only the literal `true` enables sign-in.

Register an exact callback of
`{APP_ORIGIN}/api/connections/callback/{provider}` for each enabled provider.
Staging and production use different origins and app configurations. The stored
encrypted fingerprint binds client ID, callback, scopes/configuration and account
environment. Changing these requires reauthorization; rotating a client secret
does not alter that fingerprint.

Additional requirements:

- Meta: `META_LOGIN_CONFIG_ID` must be a reviewed Facebook Login for Business
  configuration issuing business system-user tokens. Personal-user/Page token
  fallback is deliberately absent. Only production resource accounts are accepted.
- TikTok: `TIKTOK_AUTHORIZATION_URL` must be the actual advertiser authorization
  URL generated for the app, with matching app ID and exact callback. The worker
  adds its state; it does not invent a portal contract. Set
  `TIKTOK_REQUIRED_PERMISSION_IDS` to a JSON array of exact **strings** copied
  from the approved app's numeric permission mapping. Long-term advertiser tokens
  are explicitly requested; short-term rotating tokens are not implemented by
  this adapter. Production resource accounts only.
- Microsoft: `MICROSOFT_DEVELOPER_TOKEN` is required for resource calls. The
  registered confidential Web app must support the account types allowed by
  the `common` authority. Sandbox and production use different fixed API hosts.
- LinkedIn: programmatic refresh is used only when an actual refresh token is
  issued. Its availability is an approved-program capability, not an assumed
  property of every application.

## Reviewed official contracts

Dot independently researched the current official documentation and delivered
its OAuth implementation review on 2026-10-31 UTC. It performed no provider
operations. The implementation uses the following contracts:

| Provider | Identity flow | Resource pin | Permission basis |
| --- | --- | --- | --- |
| Google | Confidential OAuth v2, S256, offline access | Ads v26; GA4 Admin v1beta; Search Console webmasters/v3 | adwords; analytics.readonly; webmasters.readonly, separately requested |
| Meta | Graph v26.0 business-login configuration; token debugging verifies app, SYSTEM_USER, scopes and client business | Marketing v25.0 | ads_read, ads_management and documented Page dependencies |
| Microsoft | Entra v2.0 code flow, S256, offline_access | Ads REST v13 | https://ads.microsoft.com/msads.manage |
| TikTok | Advertiser v2.0 access-token endpoint, explicit long-term mode and auth_code callback | Advertiser discovery/info v1.3 | Approved app's exact numeric permissions |
| LinkedIn | Confidential web OAuth v2; no invented web PKCE support | REST with LinkedIn-Version 202610 | rw_ads and r_ads_reporting; account access remains independently checked |

Google Ads developer tokens were retired September 9, 2026. Cloud-project access
replaces that onboarding; Microsoft still requires its own developer token.
[Google migration](https://developers.google.com/google-ads/api/docs/api-policy/developer-token),
[Google release notes](https://developers.google.com/google-ads/api/docs/release-notes),
[Google OAuth](https://developers.google.com/identity/protocols/oauth2/web-server),
[Microsoft OAuth](https://learn.microsoft.com/en-us/advertising/guides/authentication-oauth-get-tokens?view=bingads-13).

Meta login and Marketing have separate version listings. Tokens have separate
lifecycles by class; this code does not call a fictitious generic refresh-token
grant. Debugging and business binding precede credential attachment.
[Meta versions](https://developers.facebook.com/docs/graph-api/changelog/versions/),
[Business login](https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business),
[Permission dependencies](https://developers.facebook.com/documentation/development/permissions).

TikTok's advertiser authorization differs from creator `/tt_user`, consumer Login
Kit and MCP OAuth. Its detailed v2 short-term refresh page names
`/oauth2/refresh_token/`, despite a contradictory index entry. Short-token expired
header, replay and revocation-family behavior remain qualification gaps; the
implemented long-term flow never enters that refresh path.
[Advertiser authorization](https://business-api.tiktok.com/portal/docs/marketing-api-authorization/v1.3),
[Advertiser token](https://business-api.tiktok.com/portal/docs/obtain-an-advertiser-access-token/v2.0),
[Short-term refresh](https://business-api.tiktok.com/portal/docs/refresh-a-short-term-advertiser-access-token/v2.0),
[Resource catalog](https://business-api.tiktok.com/portal/docs?id=1735713875563521).

LinkedIn native PKCE is a different endpoint and enabled product; confidential
web support was not established. Refresh lifetime is fixed to the original
grant horizon and response TTLs are authoritative.
[Web flow](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow),
[Programmatic refresh](https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens),
[Versioning](https://learn.microsoft.com/en-us/linkedin/marketing/versioning?view=li-lms-2026-10).

## Data and recovery boundaries

Dedicated host-only HttpOnly Lax cookies bind OAuth callbacks to the initiating
browser; the normal workspace session remains Strict. SQL additionally checks the
original session, current actor/service, tenant and recovery generations at
claim and completion. State is consumed before an exchange. Provider denial and
uncertain exchange require a new authorization; provider messages/codes never
appear in redirect URLs or audit receipts.

AES-GCM envelopes bind organization, service, provider, environment, connection
and purpose. Refresh claims are exclusive. A lost refresh response leaves the
credential fenced in `refreshing`; no lease timeout restarts the provider call.
Independent recovery control is checked around token operations. Old credential
generations cannot obtain fresh tickets after restoration.

Only the authorizing person can discover all accounts visible to their grant.
Binding requires fresh provider observation of the exact selected account and
manager. Discovery cursors stay on fixed hosts; provider `next` URLs are never
followed. Numeric IDs larger than JavaScript's safe integer range are preserved
as strings before parsing. Read access does not prove a provider write role.
LinkedIn account timezone and unmapped Microsoft timezone values remain null;
future write qualification must resolve required scheduling semantics explicitly.

Removing stored workspace access does not assert provider revocation or campaign
pause. Managed resources/unresolved operations block removal pending stop or
handoff. Broad grant revocation can affect other tenants or Google services;
it is not part of the unlink command and requires a separately reviewed flow.

## Remaining live qualification

Each enabled platform needs real application approval, permitted scopes/assets,
registered callbacks, account-role verification, representative consent/read
and refresh evidence, endpoint/version compatibility, expiry/revocation behavior,
and typed write/readback qualification before advertising execution. Meta Full
Marketing/Advanced permissions, TikTok approved scope mapping and LinkedIn
production access are external prerequisites. Synthetic tests do not establish
them. No account connection starts service, earns a milestone, authorizes a
budget, or enables a positive effect.
