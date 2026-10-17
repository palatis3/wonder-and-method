# Provider roles and ownership

Operating roles reconciled October 17, 2026. This is a deployment/inventory guide, not a current price quote. Verify account billing, trial expiry, usage limits and renewal terms in the owner-controlled account before changing a paid service; no new purchase is authorized by these docs.

| Purpose | Provider and operating role | Owner action |
|---|---|---|
| Website and form endpoint | Cloudflare Workers assets; production custom domains, `dist/` only | Maintain domain/account access and separate staging/production bindings; never expose repository files |
| Durable inquiry and aggregate data | Cloudflare D1 | Verify schema migrations, private export/recovery and manual retention decisions |
| Owner email notification | Resend, verified `notify.wonderandmethod.com` sender | Restricted Worker secret; recipient is support@wonderandmethod.com, visitor email is reply-to; acceptance is not inbox proof |
| Public support inbox | Fastmail, support@wonderandmethod.com | Incoming and outgoing mail verified during setup; check trial/billing continuity and recovery access |
| Visitor chat | tawk.to | Load after explicit visitor action; monitor dashboard and phone notifications; set actual availability |
| Agreed project invoices | Stripe hosted private invoices | Confirm written scope/milestone approval and actual account readiness before issuing; no automatic site checkout/subscription enrollment |
| Founder credentials | Bitwarden plus scoped local DPAPI secrets | Maintain MFA, owner access and independently recoverable encrypted backups |

Cloudflare/D1/Resend/Bitwarden were selected on free tiers. Fastmail began with a 30-day trial and a previously approved USD 6 monthly budget; this is historical account authorization, not a newly checked price or proof of an active paid subscription. Gmail is retained privately for earlier correspondence/account recovery and is not the new production notification destination. Preserve both website and Resend DNS when changing mailbox settings.

## Inquiry and chat handling

The website writes D1 before attempting an owner notification. Review Fastmail and operator delivery status each business day. The confirmed response commitment is one business day, Monday–Friday Eastern. Neither inbox acceptance nor chat presence implies an immediate reply.

Deployed notification recovery is documented in [PRODUCTION.md](PRODUCTION.md); the October17 audit release and migrations are verified. The application cap defaults to 50 notification attempts per UTC day including retries; actual sender quotas remain a separate constraint.

The tawk.to setup uses core chat, with no paid add-on or AI/hired agent enabled in the recorded setup. The consent prompt is enabled and uploads disabled. Owner phone notification and reply were verified October 16 in `evidence/support-links-release-20261016/phone-test.json`. Recheck physical-device delivery after changes. Review and remove unsuccessful chat records with matching email/D1/export copies under [INQUIRY_RETENTION.md](../operations/INQUIRY_RETENTION.md); providers do not automatically perform that whole cleanup.

## Billing, account exit and recovery

Use Stripe private invoices after fit, scope and milestone approval. Check `scripts/stripe-billing.mjs` and the approved private job record before any real invoice action. Sandbox history does not describe current production activation by itself, and an enabled account does not prove a client paid. Never collect full card details through the site form, email or chat. Optional recurring services need explicit terms and approval.

The founder controls studio accounts; paid client production accounts should belong to the client. Record renewal, cancellation, export and third-party licensing terms in each scope. Verify mailbox export and replacement receipt before cancelling or changing MX records. Preserve independent account recovery when the business inbox itself is unavailable.

D1 recovery, mailbox trash, sender logs and provider backups have separate retention behavior; active-record deletion is not immediate erasure of every copy. Consult the published notice in `config/site.json` and current provider policies for a real deletion decision. Encrypted local DPAPI files alone are not a lost-device recovery plan. Never create plaintext vault exports in this repository.
