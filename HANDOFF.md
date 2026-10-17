# Operating handoff

Updated October 17, 2026. Current production: October 17 audit release `464be5fb-4424-4c95-b356-16e4e13d599a`. See [BUILD_STATUS.md](BUILD_STATUS.md) and `evidence/claude-audit-20261017/` for verification.

## Daily inquiry handling

Review `support@wonderandmethod.com` in Fastmail and the tawk.to dashboard each business day. Reply within one business day, Monday–Friday Eastern. Chat presence should reflect actual availability; the response commitment does not imply instant chat coverage. The owner confirmed phone chat notification/reply on October 16; historical setup notes that say it is pending are superseded.

Check saved inquiry status independently of email receipt:

```powershell
npm run inquiries:production -- status
npm run inquiries:production -- export review-20261017
```

Status prints delivery counts, not inquiry text. Export creates a new plaintext JSON file in `.runtime/exports` and refuses to overwrite it. Protect the file as personal data and delete it under the same retention decision as other working copies. The operator loads production credentials through Windows DPAPI without printing them.

For a known reference, `retry REFERENCE CONFIRM_REFERENCE` may send a real notification; `delete REFERENCE CONFIRM_REFERENCE` removes the active record. Both arguments must be the same exact UUID. Reconcile uncertain delivery in Resend and Fastmail before retrying. Do not use the production form, retry or deletion commands for synthetic QA.

The deployed Worker caps notification attempts at five within a 22-hour retry window, uses a default site-wide 50-attempt UTC-day budget including retries, fences completion to the current sending lease and freezes the provider request body for new attempts after migration 0003. Hourly retries process at most 20 eligible records per run. Exhausted or ambiguous records need manual review; acceptance still does not establish inbox delivery. A second-channel failure alert is not configured. Review delivery counts and reconcile uncertain provider outcomes.

Keep one weekly-board row per actual buyer. Record the last substantive contact, client status and any justified hold. Run `npm run inquiries:production -- retention-preview` using the verified migration 0003 schema; it is a dry run, not deletion. See [INQUIRY_RETENTION.md](operations/INQUIRY_RETENTION.md) for follow-up JSON and all-copy cleanup. Use `npm run inquiries:production -- measurement 7` for the deployed aggregate summary endpoint for aggregate reporting.

## Rebuild, deploy and recover

Use the clean-checkout commands in [README.md](README.md) and the release sequence in [PRODUCTION.md](deployment/PRODUCTION.md). Preserve both indexing gates as true. Keep the production custom-domain bindings and assets-only public boundary; old critique/review configurations are not production targets.

Before a release, record a compatible rollback Worker version and a private D1 export. A Worker rollback does not restore D1 or undo migrations. Restore a database only after reconciling newer inquiries, schema compatibility and provider state. Historical rollback and isolated SQL restore checks are in `evidence/production-recovery.json`; they do not prove current-volume recovery or lost-device access. Verify a clean rebuild and independently accessible source/credential recovery before claiming those capabilities.

## Commercial handoff

Use `config/offers.json` for new scopes and preserve accepted historical terms. Confirm the buyer's scope, start date, ready inputs and actual capacity before booking; typical 7–10 day delivery starts only after those conditions. Issue private Stripe invoices only after the required written approvals. Care requires separately established coverage. Maintain actual costs, cash, client/accounting retention and client-owned accounts; a published website does not prove these business gates are complete.

At client handoff, deliver agreed paid source/assets/licenses and verified account access. Optional service cancellation must not disable a paid client-owned site. Actual client outcomes, independent user research and unverified business facts remain separate evidence requirements.
