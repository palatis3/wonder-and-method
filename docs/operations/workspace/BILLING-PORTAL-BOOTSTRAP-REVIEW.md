Sent the complete review once to **Build Wonder and Method workflows** (`01a1372f-80d0-7bf0-b8dc-c159ebe59991`). The tool accepted delivery. One read-only check found the thread active, but **no explicit acknowledgment of this report yet**. No resend was attempted.

Research is complete. No provider writes, credentials, repository changes or qualification tests were performed.

**1. Stripe portal contract**

Current official examples and generated SDK identify `2026-10-28.endive`. Pin the qualified API version explicitly and qualify webhook versions separately; do not silently upgrade the existing integration. [SDK version](https://raw.githubusercontent.com/stripe/stripe-node/master/src/apiVersion.ts), [versioning guidance](https://docs.stripe.com/upgrades).

All endpoints below use `https://api.stripe.com`:

| Operation | Endpoint |
|---|---|
| Create configuration | `POST /v1/billing_portal/configurations` |
| Retrieve configuration | `GET /v1/billing_portal/configurations/{id}` |
| Update configuration | `POST /v1/billing_portal/configurations/{id}` |
| List configurations | `GET /v1/billing_portal/configurations` |
| Create portal session | `POST /v1/billing_portal/sessions` |

Configuration listing supports `active`, `is_default`, `limit` of 1–100, cursor pagination and `has_more`. No configuration delete or portal-session retrieve, list, update or revoke operation appeared in the inspected surface. [Configuration API](https://docs.stripe.com/api/customer_portal/configurations), [listing](https://docs.stripe.com/api/customer_portal/configurations/list), [session API](https://docs.stripe.com/api/customer_portal/sessions).

Use an explicit nondefault configuration. This is an SDK object; encode corresponding bracketed form fields for direct Stripe v1 HTTP:

```json
{
  "name": "workspace-billing-restricted-v1",
  "features": {
    "invoice_history": {"enabled": true},
    "payment_method_update": {"enabled": true},
    "customer_update": {"enabled": false},
    "subscription_update": {"enabled": false},
    "subscription_cancel": {"enabled": false},
    "subscription_pause": {"enabled": false}
  },
  "login_page": {"enabled": false},
  "default_return_url": "https://workspace.example.com/billing",
  "metadata": {"policy_version": "restricted-v1"}
}
```

Explicitly set policy booleans on create/update and retrieve the resulting configuration. Omission is not a safe reset mechanism. [Create](https://docs.stripe.com/api/customer_portal/configurations/create), [update](https://docs.stripe.com/api/customer_portal/configurations/update).

A consequential current-schema finding: **`subscription_pause` is a separate feature** in the official generated SDK, although the shortened REST response example omits it. Disable it on the qualified current version. If the deployed API pin rejects the field, resolve that version discrepancy rather than ignoring it. The schema also supports `payment_method_update.payment_method_configuration`; omission uses the default payment-method configuration. `login_page.enabled=false` deactivates the shareable login URL. [Generated configuration schema](https://raw.githubusercontent.com/stripe/stripe-node/master/src/resources/BillingPortal/Configurations.ts).

Dashboard defaults are unsuitable as the security policy: the guide shows cancellation and several customer-information changes enabled by default. Keep customer updates disabled unless separately approved. Invoice history can still provide invoice payment and downloads; disabling subscription management does **not** make the portal read-only. Standalone invoices are supported, and invoice-only use needs no product catalog. [Defaults](https://docs.stripe.com/customer-management/configure-portal), [portal capabilities](https://docs.stripe.com/customer-management), [integration](https://docs.stripe.com/customer-management/integrate-customer-portal).

**2. Session binding and bearer access**

Minimum server-owned request:

```http
POST /v1/billing_portal/sessions
Stripe-Version: 2026-10-28.endive
Idempotency-Key: <registered-attempt-key>
Content-Type: application/x-www-form-urlencoded

customer=cus_...
&configuration=bpc_...
&return_url=https%3A%2F%2Fworkspace.example.com%2Fbilling
```

The response includes `id`, `customer`, `configuration`, `livemode`, `created`, `return_url` and the secret-bearing `url`. Verify bindings before disclosing it. Resolve provider parameters server-side; reject browser control of customer, configuration, Stripe account, `flow_data` or `after_expiration`. The newer `customer_account` parameter belongs to Accounts v2 and must not be confused with the merchant/Connect account. [Session creation](https://docs.stripe.com/api/customer_portal/sessions/create), [session object](https://docs.stripe.com/api/customer_portal/sessions/object).

Recommended mapping key:

```text
tenant
+ billing principal
+ Stripe merchant/account context
+ environment and sandbox identity
+ customer ID
+ approved configuration ID/version
```

`livemode=false` does not distinguish separate sandboxes. Never resolve billing authority from an email address alone.

For Connect, the portal integration guide says to configure the portal for the platform. Preserve the actual charge architecture. `on_behalf_of` filters invoices/subscriptions and branding; it is not a universal engagement or payment-method authorization filter. [Connect guidance](https://docs.stripe.com/customer-management/integrate-customer-portal), [parameter contract](https://docs.stripe.com/api/customer_portal/sessions/create).

The local permission must cover **customer-wide billing access**. A Stripe customer can span engagements with different audiences. Someone entitled to one engagement must not automatically receive all that customer’s invoices and payment controls. There is no documented engagement filter to solve that mismatch.

Issue sessions through a CSRF-protected authenticated POST with current database authorization. Use a fixed HTTPS return URL, `Cache-Control: no-store`, and a redirect response. Redact portal URLs from logs, analytics, traces and exports. Durable receipts should retain session/request/attempt identifiers and configuration fingerprints, not the bearer URL. If temporary replay requires storing the URL, encrypt it with narrowly scoped access and short retention.

Current session schema adds:

```text
after_expiration.type = customer_login
after_expiration.customer_login.expires_at = optional Unix timestamp
```

When recovery is enabled without the deadline, the schema permits recovery without a deadline. For this policy, omit `after_expiration`, require null/absent readback, and disallow `flow_data`. Do not invent an `enabled:false` recovery field. [Generated session schema](https://raw.githubusercontent.com/stripe/stripe-node/master/src/resources/BillingPortal/Sessions.ts).

An unused session expires after five minutes. If used within that period, it expires within one hour of its most recent activity—not necessarily one hour after creation. Configuration `active=false` documents prevention of **new** sessions. I found no guarantee that changing/deactivating a configuration revokes existing sessions. Local logout or membership revocation therefore cannot be reported as immediate portal revocation. [Lifetime](https://docs.stripe.com/customer-management), [configuration semantics](https://docs.stripe.com/api/customer_portal/configurations/object).

**3. Transaction boundaries and unknown outcomes**

Suggested minimal typed commands:

- `EnsureRestrictedPortalConfiguration(policyVersion, stripeContext)`
- `IssueBillingPortalSession(tenantId, intentId)`
- `ObserveStripeBillingEvent(eventId, stripeContext)`
- `PrepareOwnerIdentity(approvedBootstrapId)`
- `ActivateApprovedOwner(bootstrapId)`
- `RequestExistingIdentityOtp()`

Session issuance:

```text
Transaction 1:
  Validate JWT and current session.
  Check current customer-wide billing permission.
  Lock intent and resolve trusted provider bindings.
  Register exact request hash, idempotency key and authority epoch.
Commit.

Retrieve configuration and validate its effective policy.
Recheck authority.
Call Stripe outside the database transaction.

Transaction 2:
  Persist provider result/receipt.
  Recheck current authority epoch and provider binding.
  Withhold URL if authority changed; record remote session may exist.
Commit.

Redirect only while authorized.
```

There is no atomic database/Stripe commit. Configuration retrieval also cannot prevent a concurrent external configuration edit. Restrict configuration administration, monitor drift, prefer versioned nondefault configurations, and stop issuance on mismatch. Metadata identifies intended policy; it does not enforce policy.

Stripe API v1 POST idempotency caches the first executed status/body, including a `500`. Parameter changes under the same key fail. Keys may be removed after at least 24 hours; validation failures and certain pre-execution conflicts are not cached. Exact same-key/body/context replay can resolve a timeout within that boundary, but this is not perpetual exactly-once issuance. [Idempotency](https://docs.stripe.com/api/idempotent_requests).

Operational rules:

- Never automatically switch to a new key after uncertainty.
- Retry only under current authority: an earlier request may never have executed.
- An expired URL returned from the idempotency cache is not a fresh session.
- A later explicit authorized click may create a new attempt, retaining the old unresolved record.
- A cached error or expired idempotency window may leave uncertainty. Use available event/request-log evidence; do not invent session retrieval.
- A response received after revocation must not be disclosed, even though the remote session may exist.

**4. Portal effects do not replace service authority**

Portal actions must never implicitly accept an agreement, verify service start, approve amended prices, waive debt, authorize advertising, or close an engagement.

On `customer.updated`, reconcile `invoice_settings.default_payment_method` and applicable subscription overrides; the portal can remove subscription-level defaults. A customer default can affect multiple subscriptions, while invoices can have their own settings. Saving a payment method is not evidence of payment or a guarantee that all unpaid invoices were retried. [Payment-default guidance](https://docs.stripe.com/customer-management/integrate-customer-portal).

Use signed webhooks and existing billing readback to observe actual payment/invoice/subscription facts. Redirects and session creation are not payment evidence. Duplicate or reordered events must not replay business commands.

Unexpected remote cancellation, update or pause enters a discrepancy workflow. Preserve the accepted agreement and earned/unpaid obligations. Do not automatically recreate or reactivate a subscription to “repair” the difference. External billing-email changes must not alter login identity or membership.

**5. Minimal owner bootstrap**

Establish an independently approved identity before public authentication:

1. Create a private bootstrap intent containing the exact approved identity, intended role, project/environment, expiry, issuer evidence, generation and one-use state.
2. Resolve or invite the Auth identity through a narrowly controlled administrative path.
3. Bind the immutable Auth user UUID to that intent.
4. After authentication, atomically consume the still-valid intent and activate only its exact approved operator grant.
5. Keep tenant membership separate from operator privilege.

Never grant ownership to the first login, a matching email domain, invite metadata, `user_metadata`, or a client-supplied role. Account-loss recovery needs a separately approved process.

Invitation example:

```ts
const { data, error } =
  await admin.auth.admin.inviteUserByEmail(approvedEmail, {
    redirectTo: FIXED_INVITE_CALLBACK
  });

// Bind data.user.id to the preapproved bootstrap intent.
// Invitation success does not activate ownership.
```

Keep the admin secret server-side and outside routine tenant commands. [Invitation API](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail).

Current official Auth source creates a missing user/email identity, rejects an already confirmed user with an email-exists error, and can resend an invitation to an existing unconfirmed user. This is source evidence, not proof of a specific hosted deployment revision. Existing confirmed users should sign in normally and retain their UUID; do not delete/recreate or administratively confirm them to bypass the flow. [Invite implementation](https://raw.githubusercontent.com/supabase/auth/master/internal/api/invite.go).

Existing-user OTP:

```ts
await supabase.auth.signInWithOtp({
  email,
  options: {
    shouldCreateUser: false,
    emailRedirectTo: FIXED_AUTH_CALLBACK
  }
});

// When the template presents an email code:
await supabase.auth.verifyOtp({
  email,
  token,
  type: "email"
});
```

The wire parameter is `create_user:false`; creation is otherwise enabled by default. This prevents identity creation but does not authorize membership. Errors may be deliberately ambiguous. Show a generic response and never fall back to administrative account creation after a failed login. [Passwordless guide](https://supabase.com/docs/guides/auth/auth-email-passwordless), [OTP reference](https://supabase.com/docs/reference/javascript/auth-signinwithotp), [wire implementation](https://raw.githubusercontent.com/supabase/auth/master/internal/api/otp.go).

`auth.resend` documents signup confirmation, email-change and SMS cases—not an invite/magic-link resend type. Request another email OTP through `signInWithOtp`, preserving `shouldCreateUser:false` and throttling. Pending reinvitations require current approval and status checks. After a timeout, reconcile Auth/audit/send evidence before a deliberate resend: identity creation, SMTP acceptance and local persistence are not atomic. [Resend method](https://supabase.com/docs/reference/javascript/auth-resend).

Supabase supports same-email automatic OAuth linking and authenticated manual linking; SAML SSO users are excluded as linking targets. Do not build an additional email-based owner merger. Local privilege remains bound to the approved UUID. [Identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking).

**6. Redirects, scanners and revoked sessions**

Use exact production HTTPS redirect allowlists and a correct production Site URL. Isolate preview wildcards. Validate nested `next`/return URLs independently. Invite verification uses its invite flow; normal email OTP uses `email`. Do not accept arbitrary client-controlled verification types. [Redirect guidance](https://supabase.com/docs/guides/auth/redirect-urls).

Email scanners can consume single-use links, and click tracking can rewrite them. Prefer typed OTP for normal sign-in. Invitations can use an intermediate confirmation screen with intentional user action before redemption. Do not redeem tokens on a prefetchable GET. Treat token hashes as bearer secrets, redact callback queries, and exclude third-party analytics from token handling. Expired or consumed links lead to a deliberate resend/sign-in path—not autoconfirm or new ownership. [Email templates and scanner handling](https://supabase.com/docs/guides/auth/auth-email-templates).

Signout revokes refresh capability, while an existing access JWT remains valid until expiry. Sensitive commands should validate the current `auth.sessions` row corresponding to `session_id`, current local grant and revocation/authority epoch, in addition to JWT validation. Some provider session limits take effect at refresh rather than proactively. Tenant closure should revoke that tenant’s authority immediately without unnecessarily signing the identity out of unrelated tenants. [Signout](https://supabase.com/docs/guides/auth/signout), [session lifecycle](https://supabase.com/docs/guides/auth/sessions).

**7. Supabase custom Resend SMTP**

Documented settings:

```text
Host: smtp.resend.com
Port: 465 — implicit TLS
Username: resend
Password: existing authorized Resend API key
Sender email: approved address on verified sending domain
Sender name: approved workspace name
```

Resend also supports port 587 with STARTTLS; do not confuse the transport modes. No credentials were requested or created. [Supabase setup](https://resend.com/docs/send-with-supabase-smtp), [SMTP transport](https://resend.com/docs/send-with-smtp).

Real prerequisites:

- Verify the exact sending domain/subdomain.
- Install Resend-generated DKIM/SPF records exactly, including required TXT/MX or CNAME records.
- Avoid proxying verification CNAMEs.
- Treat DMARC as additional domain policy.
- Do not infer recipient identity from sender-domain verification.
- Auth sending does not require enabling inbound receiving or replacing existing business-mailbox MX records. [DNS setup](https://resend.com/docs/add-a-domain), [domain rules](https://resend.com/docs/dashboard/domains/introduction).

Prefer an already authorized sending-only, domain-restricted credential where supported; qualify the actual SMTP/key combination. Do not broaden to full access for convenience. Store secret references rather than values in application records. [Resend permission model](https://resend.com/docs/api-reference/api-keys/create-api-key).

Supabase’s default SMTP currently permits organization-team recipients only, has an approximately two-message/hour limit and no delivery SLA. Custom SMTP initially applies a 30-message/hour limit, adjustable through authorized configuration. The documented management endpoint is:

```text
PATCH https://api.supabase.com/v1/projects/{ref}/config/auth

smtp_host
smtp_port
smtp_user
smtp_pass
smtp_admin_email
smtp_sender_name
```

No call was made. Preserve email confirmation and avoid copying unrelated settings from generic examples. [Supabase SMTP contract](https://supabase.com/docs/guides/auth/auth-smtp).

Disable click tracking for Auth mail. Resend SMTP supports `Resend-Idempotency-Key`, but I found no contract establishing that standard Supabase custom SMTP injects an application-chosen key. Do not claim exactly-once invitations. SMTP acceptance is not inbox delivery or completed authentication. Resend also documents that SMTP server logs are unavailable; use supported email records, Auth audit evidence and support rather than promising raw transport logs. [SMTP behavior](https://resend.com/docs/send-with-smtp).

**8. Failure exercises and completion evidence**

Stripe exercises:

- Submitted customer/configuration/account/environment/flow/return-URL overrides cannot change trusted bindings.
- Separate sandboxes remain isolated despite both returning `livemode=false`.
- Engagement-only viewers cannot access customer-wide billing.
- Configuration drift enabling cancellation, update, pause, customer changes or shared login blocks issuance.
- Timeout after acceptance reuses the registered key/body/context only under current authority.
- Cached `500`, expired URL and aged idempotency key preserve uncertainty without new-key loops.
- Revocation during issuance withholds the returned URL and records possible remote existence.
- An already-open portal is never falsely marked revoked by local logout.
- Payment-default overrides reconcile correctly without generating invented payment/service-start facts.
- Forged redirects and duplicate/reordered webhooks cannot accept agreements or erase obligations.

Auth/SMTP exercises:

- First login, forged owner metadata, matching domain and wrong-project JWT grant no ownership.
- Existing confirmed, unconfirmed and missing identities follow distinct paths without recreation or autoconfirm.
- `shouldCreateUser:false` never creates a missing account.
- Racing activation requests consume one bootstrap grant; revoked intents activate none.
- Auth/SMTP timeouts reconcile identity and delivery evidence before resending.
- Scanner prefetch, rewritten URLs, expired/reused tokens and external redirects cannot bypass activation.
- Still-valid JWTs fail sensitive checks after current-session or membership revocation.
- Revoking tenant A preserves legitimate tenant B access.
- Wrong sender, missing DNS verification, bad TLS/port, expired credential, rate limits, suppression and delayed delivery produce distinct operational states.
- Secrets never enter logs, client bundles or exported receipts.

Before marking the system qualified, obtain evidence from the actual approved Stripe account/environment/configuration, portal controls, invoice/customer mappings and webhook reconciliation. Auth qualification needs controlled invitation and existing-user OTP round trips, actual DNS/TLS/sender and delivery evidence, plus expired/revoked/racing bootstrap exercises. Synthetic fixtures establish code behavior, not real account access or delivery.

Documentation limits: Stripe’s nested `?query=` expansion routes were inaccessible, so additional fields were verified against its official generated SDK, whose declared version matches the current reference. Supabase invitation edge cases were checked in official source and still need hosted-version qualification. No inspected contract establishes immediate portal-session revocation, atomic database/provider/email commits, or exactly-once invitations. These limits require explicit states and recovery paths; they do not require reducing the full-launch scope.
