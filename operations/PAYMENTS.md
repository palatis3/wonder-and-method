# Accept a payment for agreed work

Use the current offer snapshot saved with the job. Original V5 prices remain historical. Stripe hosts the private payment page, invoice and receipt; the website does not collect card numbers. Each invoice belongs to one agreed milestone or dated service period.

This operator uses manual invoice collection. It does not email invoices, charge saved cards, enroll subscriptions, automatically renew annual plans, refund payments or launch a site. Customer communication and real charges need the applicable authorization and accepted customer obligation.

## Public service requests

Each of the eight current services has a `/checkout/` request page linked from its product card. A customer can request scope and a payment link, or ask a question about that service. The request retains the selected service and any monthly/annual preference in the normal inquiry record and notification. Sending it neither books work nor charges the customer. Review fit, timing and the written scope before preparing the private Stripe invoice. There is no multi-service cart because each service needs its own scope and eligibility review.

The public `/payments/` page explains private invoice payment, receipts and support. The privacy notice identifies Stripe and separates billing retention from unsuccessful inquiry retention.

## Verified setup on October 16, 2026

Stripe API readback confirms live charges and payouts enabled, with eight current products and eighteen one-time milestone/service-cycle prices. The restricted live key is encrypted with Windows DPAPI. Sandbox hosted checkout passed a declined card followed by a successful $700 synthetic Launch milestone; provider reconciliation confirmed the paid amount and zero remaining balance. No real customer was charged and no invoice email was sent. Evidence is in `evidence/payments-20261016/`.

Stripe still requires the owner to correct the EIN/document mismatch directly in Dashboard. Its task says **payouts will pause on November 15, 2026 or when total volume reaches $600**. This is a payout threshold, not a stated $600 checkout limit. Actual calendar, economics, agreement/tax decisions and bookkeeping remain separate business inputs; the sandbox payment does not validate customer demand.

## Setup and environments

The owner completes Stripe live activation, identity verification, bank details and final submission inside Stripe. Verify charges and payouts are enabled. Live account: `acct_1UQHQFLjuTLH94aN`. Sandbox: `acct_1UQHQMLt5KTaVn9K`. A sandbox pass is not live readiness.

The local operator needs a restricted key with account read, customer read, product/price read-write and invoice/invoice-item read-write. It does not need payout, bank, transfer, refund, dispute or subscription write access. Use Dashboard for customer creation, tax review, reconciliation and refunds.

Run `pwsh -NoProfile -File deployment/save-stripe-key.ps1 -Mode test` (or `live`) and paste the matching key into the hidden prompt. Windows DPAPI encrypts it under ignored `.runtime/credentials`. An approved secret manager can instead supply `STRIPE_SECRET_KEY`. Never put a key in chat, command arguments, source, screenshots or reports. Revoke unused keys in Stripe. Recovery on another computer needs an owner-controlled vault or a new restricted key.

`npm run billing -- account MODE` reads account readiness. `npm run billing -- catalog MODE` previews the current catalog without credentials. `npm run billing -- sync-catalog MODE` creates/verifies eight versioned products and eighteen prices. Existing historic products remain. All prices are one-time milestone or service-cycle amounts: the catalog does not create auto-renewal or permission to bill a customer.

## Prepare the job

1. Run `node scripts/create-job.mjs JOB-ID OFFER-ID`; add `--annual` only for twelve prepaid service cycles. Use a nonpersonal job ID. Copy `operations/templates/billing.json` into the private job folder.
2. Complete the exact scope, named approver, buyer confirmations, written exact-version acceptance, dated start and milestone approval. Complete billing environment/account, existing Stripe customer ID, due timestamp and fit/capacity/cash/agreement references.
3. Record reviewed tax treatment. `no_tax` requires a real decision reference; it is not a default assumption. `stripe_rates` requires approved tax-rate IDs. Review the actual invoice before finalizing.
4. For service, record exact paid period, timezone, cancellation route, actual coverage and approved useful work/inputs. Annual service additionally requires twelve cycles, manual renewal and an actual unearned-balance reserve. Do not sell an included usable baseline again.
5. Run `npm run billing -- prepare MODE JOB-ID MILESTONE`. Milestones are one-based. Review the saved plan and local buyer packet. Preparation creates no invoice.

## Issue only the reviewed milestone

Run `npm run billing -- draft MODE JOB-ID MILESTONE`. It creates one draft with `auto_advance=false`, `send_invoice`, the exact milestone amount and no unrelated pending items. Retries reuse the obligation. Changed terms after invoice creation require reconciliation, not another invoice. Later milestones require the earlier accepted amount to be fully paid; credits and amendments do not silently satisfy that gate.

In Stripe, review customer, contracting identity, scope/version, description, due date, taxes, exact total, support details and payment methods. Check actual provider charges before agreeing optional paid features; the local catalog does not invent fees or taxes.

Run `npm run billing -- finalize MODE JOB-ID MILESTONE INVOICE_ID TOTAL_CENTS` with the exact reviewed total including tax. This makes only that invoice payable and returns its private Stripe payment URL. It sends no email. Share it only with the intended customer through authorized communication. Never publish individual payment URLs on the website, in Git or in a general report.

Use only sandbox test methods for rehearsals. No live test charge is needed. A real payment requires an actual accepted customer obligation.

## Confirm, reconcile and retain

Run `npm run billing -- status MODE JOB-ID MILESTONE INVOICE_ID`. It checks current Stripe status against the saved original request, including after the due date or when live charging is disabled. A redirect, prepared draft or client screenshot is not payment evidence. A credit-adjusted or partially paid obligation requires reconciliation. Check Stripe for refunds/disputes before relying on an earlier payment for another billing or release decision.

Append the invoice ID, checked state, payment and decision references to the same cumulative job receipt. The CLI does not mutate the accepted scope or mark unrelated business gates complete. Private results are in `.runtime/payments/MODE`; job scopes/receipts are in ignored `operations/jobs`. Back up these private records through an approved workflow.

On a timeout, inspect Stripe before retrying. Idempotency keys and obligation metadata protect repeats, but provider key retention is finite. If a crash leaves a lock, verify no operator is running and inspect Stripe before removing that exact lock. Do not remove an active lock or run concurrent billing operations.

Invoice monthly service per approved cycle after the useful-work/input and cancellation checks. Annual renewal requires new written confirmation. Record earned/unearned balances, unused-cycle refunds, current-cycle reconciliation and delayed work in the original receipt and bookkeeping records. Payment collection does not replace bookkeeping or legal/tax review.

## Release evidence

Before reporting live checkout ready, verify live charges/payouts, live catalog, customer-facing identity/support settings, sandbox hosted checkout/receipt, failed/incomplete-payment handling, cancellation/refund procedures and secure credentials. A public customer-portal link remains absent until its real live login URL and permissions are checked. Never publish a placeholder or sandbox payment link.

Official references: [Hosted invoices](https://docs.stripe.com/invoicing/hosted-invoice-page), [manual advancement](https://docs.stripe.com/invoicing/integration/automatic-advancement-collection), [idempotency](https://docs.stripe.com/api/idempotent_requests), [API versioning](https://docs.stripe.com/api/versioning).
