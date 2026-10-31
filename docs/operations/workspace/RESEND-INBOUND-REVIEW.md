Sent the completed review once to **Build Wonder and Method workflows**. Delivery was accepted; the read-only check showed the main agent active, but **no explicit acknowledgment yet**. No resend, provider writes, edits or account changes occurred.

The complete findings are retained below.

**Recommended contract**

Implement inbound email as untrusted correspondence intake. Track these separately:

1. Authentic Resend webhook.
2. Candidate tenant/thread route.
3. Sender evidence.
4. Durable local content capture.
5. Authorized workspace action.

Neither a signed webhook nor possession of a reply alias authorizes approval, spending or STOP execution.

**Endpoints and schemas**

Resend sends:

```http
POST /webhooks/resend/inbound
svix-id: EVENT_ID
svix-timestamp: UNIX_SECONDS
svix-signature: v1,SIGNATURE
```

```json
{
  "type":"email.received",
  "created_at":"EVENT_TIME",
  "data":{
    "email_id":"EMAIL_UUID",
    "created_at":"RECEIVED_TIME",
    "from":"sender@example.com",
    "to":["r.TOKEN@reply.example.com"],
    "cc":[],
    "bcc":[],
    "received_for":[],
    "message_id":"<MAIL_MESSAGE_ID>",
    "subject":"Subject",
    "attachments":[{
      "id":"ATTACHMENT_UUID",
      "filename":"brief.pdf",
      "content_type":"application/pdf",
      "content_disposition":"attachment",
      "content_id":null
    }]
  }
}
```

This contains metadata, not body or attachment bytes. Handle optional/null fields defensively. RFC `Message-ID` is sender-controlled and unsuitable as the ingestion uniqueness key. [Event schema](https://resend.com/docs/webhooks/emails/received), [content retrieval](https://resend.com/docs/dashboard/receiving/get-email-content).

Use these server-side GETs with `Authorization: Bearer RESEND_KEY`:

```text
https://api.resend.com/emails/receiving/EMAIL_UUID?html_format=cid

https://api.resend.com/emails/receiving/EMAIL_UUID/attachments?limit=100

https://api.resend.com/emails/receiving/EMAIL_UUID/attachments
  ?limit=100&after=LAST_ATTACHMENT_ID

https://api.resend.com/emails/receiving/EMAIL_UUID/attachments/ATTACHMENT_UUID

https://api.resend.com/emails/receiving?limit=100&after=LAST_EMAIL_ID
```

The received-email response includes:

```text
object,id,from,to,cc,bcc,reply_to,received_for,subject,message_id,
created_at,html,text,html_format,headers,authentication,raw,attachments
```

Request `html_format=cid` to avoid base64 image expansion; inspect the returned format. Nullable `raw` contains an expiring URL for the original MIME email, including attachments. [Received email API](https://resend.com/docs/api-reference/emails/retrieve-received-email).

Attachment listing:

```json
{
  "object":"list",
  "has_more":true,
  "data":[{
    "id":"ATTACHMENT_UUID",
    "filename":"brief.pdf",
    "size":4096,
    "content_type":"application/pdf",
    "content_disposition":"attachment",
    "content_id":null,
    "download_url":"https://inbound-cdn.resend.com/...SIGNED...",
    "expires_at":"ISO_TIMESTAMP"
  }]
}
```

Single-attachment retrieval returns these fields plus `object:"attachment"`. Fetch the signed URL separately, **without forwarding the Resend bearer token**. [List attachments](https://resend.com/docs/api-reference/emails/list-received-email-attachments), [retrieve attachment](https://resend.com/docs/api-reference/emails/retrieve-received-email-attachment).

Set `limit` explicitly, between 1 and 100. Continue using the last returned ID as `after` until `has_more:false`; never combine `before` and `after`. The general pagination contract explicitly includes received-email attachments, although their endpoint page omits query-parameter detail. Detect repeated cursors, duplicate IDs and empty pages claiming more results. Compare the enumerated attachment set with message metadata before declaring completeness. [Pagination](https://resend.com/docs/api-reference/pagination), [email listing](https://resend.com/docs/api-reference/emails/list-received-emails).

**Webhook verification and durable acknowledgment**

Use a pinned Svix verifier tested in the Worker runtime. Resend explicitly supports it; its own SDK examples use differing argument shapes, so avoid combining examples from different SDK versions.

Illustrative handler—the helper/RPC names are application design:

```ts
import { Webhook } from "svix";

async function receive(request, env) {
  const raw = await readUtf8BodyWithByteLimit(request);
  const headers = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? ""
  };

  let event;
  try {
    assertAttemptTimestampWithin300Seconds(headers["svix-timestamp"]);
    event = new Webhook(env.RESEND_WEBHOOK_SECRET).verify(raw, headers);
  } catch {
    return new Response("Invalid webhook", { status: 400 });
  }

  await acceptInboundEventAndEnqueue({
    connection: env.CONNECTION_ID,
    environment: env.ENVIRONMENT,
    eventId: headers["svix-id"],
    raw,
    rawHash: await sha256(raw),
    event
  });

  return new Response("OK", { status: 200 });
}
```

The ±300-second window is a proposed application policy, not a newly claimed Resend guarantee. Validate integer seconds, maintain accurate clocks and retain library timestamp checks. Check the signed **attempt timestamp**, not event creation time: an older event can legitimately receive a fresh delivery attempt.

Verify before JSON transformation. Svix signs ID, timestamp and raw body; support multiple signatures and bounded secret-rotation overlap. Separate endpoint/environment secrets. [Resend verification](https://resend.com/docs/webhooks/verify-webhooks-requests), [Svix contract](https://docs.svix.com/receiving/verifying-payloads/how-manual).

One private transaction should:

```text
BEGIN
  insert webhook_event
    unique(connection, environment, svix_id),
    raw_hash, payload, verification_time, key_version;

  duplicate same ID/hash => existing success;
  duplicate ID/different hash => anomaly, no overwrite;

  upsert inbound_email
    unique(connection, environment, provider_email_id);

  insert retrieval_job
    unique(email_id, capture_generation);

  insert outbox wake-up;
COMMIT
```

Return 200 only after commit. Database unavailable or uncertain commit outcome gets non-2xx; unique constraints resolve subsequent retries. Different events for the same provider email must not create duplicate correspondence.

Authenticated unknown schemas/types may be acknowledged only after durable private quarantine and an operational alert. Invalid signatures never enter business ingestion.

Resend’s documented retry intervals after successive failures are 5 seconds, 5 minutes, 30 minutes, 2 hours, 5 hours, 10 hours and another 10 hours. Disabling/removing the endpoint stops retries. [Retries](https://resend.com/docs/webhooks/retries-and-replays).

Do not download everything inside the webhook or rely on `waitUntil` for durability. Cloudflare allows only up to 30 seconds of HTTP-triggered background execution after response/disconnection. Use leased durable jobs; `waitUntil` can optimize an already-persisted wake-up. [Cloudflare context](https://developers.cloudflare.com/workers/runtime-apis/context/).

**Retrieval, recovery and retention**

Keep separate lifecycle fields:

| Area | States |
|---|---|
| Content | queued, retrieving, partial, captured, blocked, unavailable |
| Routing | unresolved, candidate, triage, accepted |
| Attachment | discovered, fetching, stored_unscanned, scanned_clean, blocked, failed |
| Publication | private_triage, workspace_correspondence |

A worker claims a lease/generation, fetches body and every attachment page, persists attachment jobs, streams approved bytes into private storage, then finalizes the manifest against the current lease.

Storage and Postgres cannot commit atomically. Use immutable generated object keys, attempt IDs and hashes. Resolve upload timeouts through object length/hash readback; never overwrite conflicting bytes. Reconcile manifests before deleting orphans. “Captured” requires the body and every expected attachment; exclusions remain explicitly partial.

Attachment URLs are documented as valid for **one hour**. Respect `expires_at` with transfer/clock margin and request fresh metadata after expiry. Raw MIME URLs also expose expiry, but the consulted raw-content reference did not separately guarantee a fixed lifetime. Refreshing URLs does not extend retention. [Attachment processing](https://resend.com/docs/dashboard/receiving/attachments).

Resend states **30-day email/log retention** for Free, Pro and Scale; Enterprise is flexible. This general policy does not provide a per-object retrieval-until timestamp or availability SLA. Confirm actual account terms, including attachment/raw availability. [Retention policy](https://resend.com/security/gdpr).

Recommended application targets:

- Begin immediately; aim for capture within five minutes.
- Alert on fifteen-minute backlog.
- Escalate well before confirmed provider retention expiry.
- Track received/first-seen times, oldest backlog, URL expiry, retry count and planning deadline.
- If retention is unconfirmed, record an unknown deadline and alert rather than inventing certainty.

Retry GETs on transient network/5xx failures with jitter. Respect 429 retry/rate headers. An initial 404 can receive bounded delayed rechecks, but no eventual-consistency guarantee was established. Persistent 404 means unavailable/investigate; 401/403 means credential/configuration intervention.

Run scheduled received-email reconciliation with overlapping scans and durable cursors. Reuse the same email uniqueness key and mark `API_backfill` as the discovery source; never invent a webhook receipt. Stale cursors require a bounded retention-window sweep. Restore recovery must reconcile independent capture receipts and manifests without republishing old authority.

The documented default API rate limit is **10 requests/second per team**, shared across API keys; use actual headers/account configuration. Received messages also count toward email quotas. [Usage limits](https://resend.com/docs/api-reference/rate-limit).

**Routing and sender evidence**

Use per-thread/per-participant aliases such as:

```text
r.<192-bit-random-base32>@reply.example.com
```

Store an HMAC/hash lookup plus tenant, thread, participant, audience, generation and revocation/grace times. Parse complete addresses; normalize domains, preserve the generated token format, and avoid arbitrary Gmail-style dot/plus normalization.

An alias selects a possible destination; it grants no access.

Inspect all recipient candidates, not `to[0]`. Resend defines `received_for` as derived from `Received` header “for” clauses, **not as a documented authoritative SMTP-envelope recipient list**. Treat recipient/header values as routing evidence only. Unknown, revoked or conflicting aliases go to private operator triage. Never duplicate a mixed-tenant message into both workspaces.

Old aliases must never be reassigned. Membership removal or suspected compromise revokes immediately; planned grace preserves the original binding only. Redact aliases from telemetry. `References` and `In-Reply-To` can assist threading after routing checks but establish no authority. [Threading guide](https://resend.com/docs/dashboard/receiving/reply-to-emails).

A useful current addition is `email.authentication`: Resend documents this as receiver-computed SPF/DKIM/DMARC results, **not copied from sender headers**. Older emails can return null. Preserve `pass`, `fail`, `gray`, `processing_failed` and `unknown`; their meanings differ by mechanism. Never trust an arbitrary `Authentication-Results` header as equivalent evidence. [Authentication schema](https://resend.com/docs/api-reference/emails/retrieve-received-email).

Recommended automatic correspondence placement requires:

- Exactly one active route/audience.
- One parsed From mailbox matching an independently verified email association for a **current** tenant participant.
- Receiver-computed authentication satisfying policy—recommend DMARC pass for this path.
- No conflicting From, Reply-To, routing or forwarding evidence.

Otherwise use operator-only triage with reason codes. Legitimate forwarding failures or null authentication should not be silently discarded. Operator resolution requires an audit record.

Even DMARC pass does not prove the human sender or exclude mailbox compromise. Label the material as received email, not a signed user action. Never automatically invite unknown senders or treat Reply-To as authorization.

**Approvals and urgent STOP**

Email content cannot execute approval, withdrawal, billing change, budget increase, launch, resume or STOP.

“Approved” remains correspondence until the actor authenticates, passes current role/membership checks and approves the exact immutable version.

Suspected urgent STOP mail should immediately create a deduplicated operator alert and triage item, including when authentication fails. An authorized actor then invokes the existing STOP command with current authority and epoch. Receipt must never be reported as completed cancellation.

Any later reply uses the existing outbox and rechecked recipients, never raw-header reply-all. Include loop suppression; do not echo confidential thread content to an unverified address.

**Private storage, downloads and rendering**

Use unexposed intake tables and private storage. Unassigned/ambiguous messages remain operator-only. Published correspondence receives explicit tenant/thread/audience bindings. Check current membership **and audience** for every list/read/download; operator authority stays separate from customer membership.

Raw MIME includes all attachments and potentially BCC information, so it cannot bypass restrictions applied to parsed content.

Prefer an authenticated Worker download proxy when immediate revocation matters. Supabase private buckets also support signed URLs, but issued URLs remain bearer capabilities until expiry. Keep provider URLs and service keys out of browser responses and logs. [Private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals).

Use a narrow backend ingestion RPC and explicit grants. Supabase’s current exposure change means new public-schema tables must not be assumed automatically available. Webhook ingestion uses a service principal, not a fabricated customer identity. [Exposure change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).

Attachment fetch controls:

- Accept only URLs returned by an authenticated API read for the expected email/attachment.
- Enforce HTTPS and qualified exact CDN hosts; reject credentials, private/link-local destinations and uncontrolled redirects.
- Never fetch URLs supplied in message HTML, filenames or headers.
- Do not forward API Authorization to the CDN.
- Stream with file/message size, count, duration and decompression limits; do not trust declared sizes.
- Use generated storage keys; sanitize filenames for paths, CR/LF, controls, bidi characters and collisions.
- MIME sniffing is not malware clearance. Do not automatically extract archives or execute macros.

Documentation shows `inbound-cdn.resend.com` and signed CloudFront raw URLs but supplies no exhaustive immutable hostname list. Qualify actual hosts rather than allowing every CloudFront distribution.

The stated invite-only allowance fits this policy:

- Authorized users may explicitly download a stored file labeled **“Unscanned — not checked for malware.”**
- Audit the acknowledgment against file hash/version.
- Keep current tenant/audience checks.
- Scanner failure leaves the file unscanned; it must not silently become clean.
- Known-malicious, integrity-failed or policy-blocked content remains unavailable.
- Serve downloads as attachments with safe filename, `nosniff` and `no-store`; no inline preview.
- Oversized content receives a visible partial/blocked state and authenticated upload recovery.

Render escaped text by default. Optional HTML needs a maintained sanitizer, isolated sandbox and restrictive CSP. Remove executable content, forms, active SVG, CSS/network fetches and dangerous URLs. Block remote images/tracking. Resolve CID images only to captured authorized assets; duplicate or missing content IDs remain unresolved.

All content is untrusted input to AI helpers. It cannot change routing, recipients or execution privileges.

**Real setup and qualification**

Required evidence:

- Correct Resend team, receiving entitlement/quota and separated production/staging bindings.
- Managed `<id>.resend.app` address, or verified custom receiving subdomain with receiving enabled and the exact Resend MX record. A dedicated reply subdomain avoids taking over an existing corporate mailbox. Receiving MX is separate from outbound authentication records. [Receiving setup](https://resend.com/docs/dashboard/receiving/introduction), [custom domains](https://resend.com/docs/dashboard/receiving/custom-domains).
- Public HTTPS Worker subscribed to `email.received`, with endpoint signing secret installed. Configuration example only:

```http
POST https://api.resend.com/webhooks
```

```json
{
  "endpoint":"https://WORKER/webhooks/resend/inbound",
  "events":["email.received"]
}
```

The response supplies webhook identity/signing secret. No configuration was executed. [Webhook API](https://resend.com/docs/api-reference/webhooks/create-webhook).

- A retrieval-capable backend credential. Documented API-key choices are `full_access` and `sending_access`; sending-only access is insufficient for inbound retrieval. No inbound-read-only API-key permission was established. Isolate the full-access key. [Key permissions](https://resend.com/docs/api-reference/api-keys/create-api-key).
- Actual retention terms, CDN behavior, storage limits, Worker verifier compatibility and outage monitoring.

Later authorized controlled-account exercises must prove MX receipt, signatures, body/attachment capture, pagination, URL renewal, BCC/forwarding behavior, authentication evidence, replay and outage backfill. They require no live-customer prerequisite.

**Failure exercises**

| Fixture | Expected result |
|---|---|
| Modified body, missing header, wrong secret, stale/future timestamp | Reject without business ingestion |
| Concurrent duplicate event; multiple events for one email | One capture and correspondence record |
| Same event ID, different body | Anomaly; no overwrite |
| Commit succeeds, HTTP response lost | Idempotent recovery |
| Job wake-up fails or worker crashes | Durable job resumes |
| Missing page, repeated cursor, attachment-set mismatch | Incomplete manifest |
| URL expires, 429/5xx, revoked key, persistent 404 | Refresh/retry or explicit intervention |
| Storage succeeds but finalize is lost | Hash/readback reconciliation |
| Stale lease attempts finalize | Reject stale mutation |
| Spoofed sender/header, ambiguous alias, mixed tenants | Private triage, no disclosure |
| Member removed before download | Deny access |
| DMARC pass plus “APPROVED/STOP” | Correspondence/triage only |
| Script, remote pixel, CID collision, traversal filename, oversized stream | Safe rendering or explicit block |
| Unscanned permitted download | Label, current authorization and audit |
| Known malware under unscanned exception | Deny |
| Retention expires before capture | Honest missing-content state |

Remaining limits: no documented inbound SMTP maximum, attachment-count maximum, malware-scanning guarantee, authoritative envelope-recipient field, exact per-object deletion instant or complete CDN allowlist was established. Do not substitute outbound attachment limits or marketing-page “full payload” wording.

The Supabase markdown changelog fetch was unsupported by the reader; its HTML changelog and relevant exposure notice were successfully read. No documentation-access blocker prevents this design, but live qualification remains outstanding.
