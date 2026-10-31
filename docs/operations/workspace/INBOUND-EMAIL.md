# Incoming email

The private Worker accepts `POST /api/webhooks/resend/inbound` before the human
session routes. Pinned Svix 2.9.1 verifies the exact raw UTF-8 payload and signed
attempt timestamp (five-minute tolerance). This version verifies without returning
parsed JSON; parsing follows successful verification. Current and explicitly
time-limited previous secrets support rotation. Unknown signed schemas and event-ID
hash conflicts create durable private anomalies. A response is successful only
after the database transaction saves the event and retrieval work.

`INBOUND_ENABLED=true` additionally requires `RESEND_INBOUND_CONNECTION`, a stable
account-specific identifier, `ENVIRONMENT=production|staging`,
`RESEND_INBOUND_WEBHOOK_SECRET`, and a separate `RESEND_INBOUND_API_KEY` with received
email read access. Set `INBOUND_REPLY_DOMAIN` to the qualified receiving domain.
Optional rotation fields are `RESEND_INBOUND_PREVIOUS_SECRET` and an absolute
`RESEND_INBOUND_PREVIOUS_UNTIL`, at most 24 hours ahead. No domain, webhook, SMTP
configuration, account scope or live delivery was qualified by the software tests.

Leased database jobs retrieve body and every attachment page. A mismatch, repeated
cursor, unsupported file, unsafe URL, exceeded limit or failed byte readback leaves
an explicit partial state. Body text and HTML remain private; HTML is never rendered
or automatically passed to AI. Twenty attachments, 20 MiB per file, 50 MiB per email,
and 512 Ki characters per body representation bound capture. Larger/incomplete
inventories preserve the body and a capture limitation. Raw MIME capture is not
implemented: this archive preserves the parsed body and qualified attachments,
not a forensic original. Provider retention remains a separate live qualification.

Attachment downloads accept only HTTPS `inbound-cdn.resend.com` URLs returned by an
authenticated read. Redirects are rejected and no API token is forwarded. Supported
types pass the ordinary workspace byte/type/archive checks. Immutable generated
keys in the private `workspace-inbound` bucket are read back and hashed after
upload; a lost upload response never authorizes overwriting. Retries preserve
previously captured bytes and quarantine conflicting content. Scan-required mode
does not release these attachments. The owner's invitation-only exception labels
available attachments **Unscanned — not checked for malware**; explicit download
acknowledgment and current business access are checked and audited before and
after retrieving verified bytes. Customer projections omit object keys and all
provider URLs. No raw bucket policies or table grants are added.

Reply aliases carry 256 random bits and route to an exact tenant/service/request;
they confer no authority. The operator sees a newly created address in the saved
result. Its hash identifies the active route. Current route revocation blocks new
automatic placement. Automatic correspondence requires one unambiguous alias,
nonconflicting reply identity, receiver-computed DMARC `pass`, a confirmed Auth
email matching a current business participant, complete capture, and an open
tenant. Other messages stay in global private triage, accessible only to current
MFA staff with the `intake` capability plus delivery access to the chosen business.
A manual placement records its operator, destination and evidence. The interface
displays received email separately from authenticated workspace messages.

STOP/pause/cancel wording raises the urgent triage flag even at event receipt.
No email creates an approval, invitation, billing instruction, launch, budget
change, withdrawal or STOP operation. An authorized human must use the existing
workspace command. No automatic reply, reply-all or content echo is sent.

Retries use stable provider/event identities and lease generations. A maximum of
ten automatic capture attempts moves failed work to attention; authorized intake
staff can explicitly retry it. The scheduled intake task is independent of outbound
effect enablement, and its failure cannot prevent financial/STOP processing.

Before enabling, qualify a receiving subdomain, actual attachment host, read-key
scope, webhook signing secret, database/storage credentials, cron wake-up,
unambiguous reply route, known and unknown senders, duplicate/replay delivery,
oversized files, urgent alert handling and the account's retention deadline.
A separate leased received-email inventory walks the complete provider-visible
list with a durable cursor and hashed page receipts. It resumes after interruptions,
deduplicates against webhook-discovered emails and starts another sweep 15 minutes
after reaching the end. Repeated or empty continuation cursors cannot certify
completion. Inventory recovery covers only messages the provider still retains;
the actual retention window and cron latency require live qualification.

Contracts: [Resend webhook verification](https://resend.com/docs/webhooks/verify-webhooks-requests),
[received-email schema and authentication](https://resend.com/docs/api-reference/emails/retrieve-received-email),
[attachment retrieval](https://resend.com/docs/api-reference/emails/list-received-email-attachments),
[private Supabase buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals).
Dot's detailed research and qualification cases are retained in
`RESEND-INBOUND-REVIEW.md`.
