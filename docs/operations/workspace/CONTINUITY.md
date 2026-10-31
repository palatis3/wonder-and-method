# Independent receipts and background effects

The implementation uses separate `RECOVERY_CONTROL` and `RECOVERY_BYTES` R2
bindings. Neither is provisioned or qualified yet. `BACKUP_ENABLED` and
`EFFECTS_ENABLED` must remain false until actual storage, key custody, provider
access and recovery exercises pass. The public website has no binding to these
private records.

## Receipt format and ordering

Receipt bytes use AES-256-GCM with a fresh 96-bit nonce. The authenticated header
binds organization, generation, record ID, sequence, purpose, database payload
digest and key version. The plaintext checksum is also authenticated. Key
versions come from the server-only `BACKUP_KEYS` map; `BACKUP_KEY_ID` identifies
the current version. Retain older keys for their encrypted objects' lifetime.
An independent offline copy and custodian are required; neither is established
by writing a Worker secret.

Items are written under unique sequence/ID keys with `If-None-Match: *`. The
writer reads and decrypts the saved bytes, authenticates the current predecessor,
then compare-and-swaps the head using its ETag. A lost response stays pending;
later readback can establish the existing item and head without overwriting it.
Conflicting content, a missing predecessor or a different independent generation
requires reconciliation. R2's documented conditional writes and consistency are
the provider contract; memory tests exercise the algorithm but do not qualify
the real bucket. See [Workers R2 API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/).

The database acknowledges durability only for the exact generation/digest/key
and after its preceding receipt is durable. Selection processes one earliest
unresolved receipt per tenant per batch, rotating by last attempt time. A failing
tenant cannot prevent another tenant's receipt from being attempted. A conflict
blocks later receipts for that tenant and disables positive effects.

`control/{organization_id}.json` is an independently maintained object containing
`schema_version: 1`, the exact organization ID, `external_generation`,
`access_state`, and `positive_effects_allowed`. The application never initializes
or repairs this object from restored database contents. Custody and provisioning
must be completed through the recovery procedure. A matching generation and an
intact receipt prefix do not prove that a lost latest withdrawal never existed.
Restoration requires current identity, deletion, authority and provider checks.

Readback walks at most 100 head links. If a database acknowledgment lags beyond
that bound, it remains unconfirmed for operator reconciliation. Appends verify
the immediate head; they do not constitute a whole-archive integrity audit.
Retention locks, independent administration, full archive audits, offline export,
actual restore, RPO and RTO qualification remain required.

## External-effect behavior

Every dispatch registers an attempt before the provider request. The worker
checks independent generation and access again, and records returned provider
IDs before subsequent readback. Unknown outcomes do not automatically repeat a
mutation. Lease expiry does not establish that an old provider call stopped.
Read-only reconciliation checks unresolved effects every five minutes and can
be requested from the operator interface. Recovery-generation mismatches require
the recovery workflow rather than automatic dispatch.

Supported service adapters currently cover unconfirmed Supabase identity
provisioning, Resend invitation/update notifications, and Cloudmersive file scans.
Each also requires its explicit environment enable flag. Identity creation sets
`email_confirm:false`, grants no business membership and sends no message itself.
Invitation acceptance separately checks the current confirmed email and business.
Notifications use plain text and generic workspace links; shared message contents
are not copied into notification mail. Resend readback must match the bound
recipient, subject, sender and body. Provider acceptance is not delivery.

Resend's 24-hour idempotency window is additional protection, not authority to
resend an old unknown action. The local operation record survives that window.
See [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys),
[email readback](https://resend.com/docs/api-reference/emails/retrieve-email), and
[Supabase identity creation](https://supabase.com/docs/reference/javascript/auth-admin-createuser).

Current limitations: live R2 storage/key qualification, provider credentials and
delivery exercises, webhook ingestion, broad provider adapters, operator
resolution of outcomes without exact remote bindings, full backups, exports and
restore drills are still pending. No live messages, scans or advertising actions
have been executed by this implementation.

Provider attempt journals use independently encrypted immutable intent records and
append-only outcome records under the tenant/generation/attempt/nonce prefix.
Recovery must enumerate this prefix in addition to the critical-receipt chain.
Intent storage and readback precede provider writes; verified outcome storage
precedes local resolution. Journals do not eliminate the external-effect/receipt
crash gap: a retained intent without outcome still requires read-only reconciliation.
The implementation has synthetic storage tests; real R2 retention, independent
custody, inventory completeness and restore drills are still release gates.
