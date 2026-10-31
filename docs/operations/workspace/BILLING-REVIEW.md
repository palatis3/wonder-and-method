Completed the Stripe review and sent it **once** to **Build Wonder and Method workflows** (`01a1372f-80d0-7bf0-b8dc-c159ebe59991`). The send tool accepted it. Two read-only checks showed the main thread still active, but no visible receipt or acknowledgment yet. **Delivery remains unverified; I did not resend.**

No files, accounts or provider objects were changed. No tests or live qualification were executed.

**1. Recommended billing model**

Separate four things:

- **Contract:** immutable accepted agreement, catalog snapshot and amendments.
- **Obligation:** amounts due, earned, waived or credited, with supporting evidence.
- **Billing document:** Stripe invoice and its lines.
- **Settlement:** payments, allocations, credit notes and refunds.

Payment does not prove work was earned. An active subscription does not prove service started. Cancellation does not erase surviving debt.

Use native Stripe subscriptions for fixed recurring management. For Care charges with variable documented hosting offsets, use the application’s recurring schedule to **automatically assemble, finalize and collect explicit invoices**. Each component must have exactly one billing engine. This provides complete automation while avoiding an unsafe dependency on a webhook arriving before finalization.

**2. Object mapping and authority**

Scope every provider mapping by:

`environment/sandbox + Stripe account + tenant billing party + local object`

Maintain these relationships:

| Local record | Stripe mapping |
|---|---|
| Billing party | Customer |
| Immutable charge definition | Product/Price |
| Milestone or period obligation | InvoiceItem and finalized invoice line |
| Fixed recurring component | Subscription and SubscriptionItem |
| Future amendment | SubscriptionSchedule and phases |
| Payment allocation | InvoicePayment → PaymentIntent/Charge |
| Invoice reduction | CreditNote |
| Returned payment | Refund |
| Deliberate customer-wide credit | Customer balance transaction |

Do not pool unrelated tenants into one Stripe Customer: portal access and invoice credits operate at customer scope.

Each command checks current session, membership and finance/signer authority from database records. Operator grants remain separate from customer membership; JWT claims alone can be stale. Keep privileged commands and provider credentials server-side. [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)

A SetupIntent can prepare authorized future payments through `POST /v1/setup_intents` and customer confirmation. Its success establishes neither service commencement nor payment of an invoice. [SetupIntent API](https://docs.stripe.com/api/setup_intents/create)

**3. Accepted agreement → milestone invoice**

Use this local progression:

`accepted agreement → authorized milestone start → obligation due → invoice assembly`

Record earned work separately when the agreed completion evidence exists. The reviewed plan’s ads setup example is 20%/60%/20%, invoiced at milestone start and earned at completion.

Each provider step is independently registered and reconciled:

1. `POST /v1/invoices` with mapped customer, currency, `auto_advance=false`, `pending_invoice_items_behavior=exclude`, collection method and agreed due terms.
2. `POST /v1/invoiceitems`, always specifying the exact `invoice` and customer. Include obligation metadata and service period.
3. Retrieve `GET /v1/invoices/{id}` and paginate `GET /v1/invoices/{id}/lines`. Verify every line, currency, discount, tax configuration and total.
4. `POST /v1/invoices/{id}/finalize`, explicitly retaining `auto_advance=false`.
5. Retrieve final state, then either `POST /v1/invoices/{id}/send` or `POST /v1/invoices/{id}/pay`, according to the accepted collection policy.

Creating an invoice produces a draft. Invoice items can be attached only while it remains a draft. Explicit pending-item exclusion prevents unrelated charges entering the document. [Create invoice](https://docs.stripe.com/api/invoices/create), [invoice items](https://docs.stripe.com/api/invoiceitems/create), [finalization](https://docs.stripe.com/api/invoices/finalize)

Stripe invoice state generally progresses from `draft` to `open` to `paid`, with `void` and `uncollectible` alternatives. Payment failure can leave an invoice open; an uncollectible invoice can subsequently be paid. A zero-due or credit-funded paid invoice is not evidence of new cash collected. Automatic-finalization delays are not a durable review lock. [Invoice transitions](https://docs.stripe.com/invoicing/integration/workflow-transitions)

If Dashboard activity finalizes a draft during assembly, stop and reconcile. Do not recreate the invoice or silently move omitted lines to the next invoice. A database lock cannot prevent independent Stripe activity.

**4. Recurring management starts only after verified service commencement**

Require a durable start receipt binding:

- Accepted service revision and valid approval.
- Correct provider/account/resource.
- Operational launch or service evidence.
- Accountable operator confirmation.
- Agreed start instant and billing policy.

Neither checkout completion, `invoice.paid`, an active subscription nor a configured campaign status is enough.

Only then dispatch `POST /v1/subscriptions` with the exact customer, price/item quantity, tax settings, payment method, collection policy and explicit payment behavior. For automatic collection, Stripe finalizes the first invoice during subscription creation; its contents must already be correct. [Create subscription](https://docs.stripe.com/api/subscriptions/create)

A `send_invoice` subscription can be active while unpaid. Payment delay does not shift the original billing period. An initial immediate-payment subscription can become `incomplete_expired`; reconcile its invoice and authorization before issuing a successor. Store item-level period boundaries using the pinned schema. [Subscription lifecycle](https://docs.stripe.com/billing/subscriptions/overview)

Do not arm a future Stripe subscription schedule before verified start merely because launch is planned. Also define what happens when dispatch occurs after verified start: preserve the agreed anchor and explicitly handle any catch-up interval.

**5. Future amendments preserve earlier obligations**

An accepted amendment appends revision B. It does not overwrite A, its invoices or its earned obligations.

At the effective instant, calculate:

- Surviving A obligations.
- New B obligations.
- Explicitly released unearned amounts.
- Any authorized adjustments.
- Nonoverlapping service periods.

For native subscriptions:

- Retrieve the subscription and attached schedule.
- If necessary, create a schedule with `POST /v1/subscription_schedules` using `from_subscription`.
- Reconcile creation before updating it.
- Update through `POST /v1/subscription_schedules/{id}`, supplying every current/future phase and setting that must survive.
- Explicitly choose both update-level and phase-transition proration behavior.
- Choose `end_behavior` deliberately: `release` leaves the subscription running; `cancel` terminates it.

Schedules support up to ten current/future phases. Omitted settings can be unset, and direct subscription changes can be overwritten by a later phase. [Schedule guide](https://docs.stripe.com/billing/subscriptions/subscription-schedules), [schedule update](https://docs.stripe.com/api/subscription_schedules/update)

Use `POST /v1/invoices/create_preview` for the proposed change. A preview is not a payable invoice. For an authorized immediate proration, freeze the proration instant and reuse it in the actual update. [Invoice preview](https://docs.stripe.com/api/invoices/create_preview)

Stripe’s default prorations can credit unused time from an invoice that was never paid. Negative prorations do not automatically produce cash refunds. Disable default prorations where necessary and calculate explicit adjustments that preserve unpaid and earned obligations. Pin the billing mode because classic and flexible behavior can differ. [Prorations](https://docs.stripe.com/billing/subscriptions/prorations)

The reviewed catalog promises the quoted fee for the first **three paid cycles**, followed by no increase without a written change and at least 30 days’ notice. Three calendar phases are not necessarily three paid cycles. Do not automatically increase the rate when that introductory interval ends.

**6. Hosting offsets**

The reviewed `offers.json` specifies:

- Eligible documented supported hosting.
- Up to USD25 per month for eligible Brochure Care.
- Customer continues paying the host.
- No documented bill means no offset.
- Commerce, production-only, domains, licenses/apps and taxes are excluded.

Freeze evidence, eligible amount, covered period, component and currency:

`offset = min(eligible hosting amount, 2500 cents, eligible service subtotal)`

Prevent duplicate evidence allocation and negative service subtotals.

Examples before applicable tax:

- USD299 bundle + USD20 eligible hosting → W&M invoice USD279.
- USD299 bundle + USD50 hosting → W&M invoice USD274; customer separately pays host USD50.
- Existing unpaid invoices retain their balances.

For offset-bearing components, the application scheduler should automatically create the draft, apply the offset, validate it, finalize it and collect payment. Represent gross service and an invoice-specific discount. `POST /v1/coupons` supports amount/currency and product restrictions; apply the resulting discount only to the intended draft invoice or eligible line, not the Customer. [Coupons](https://docs.stripe.com/api/coupons/create)

Negative invoice items are supported, but their tax/allocation behavior must be qualified before choosing them instead of a discount.

Do **not** implement hosting offsets through customer invoice balance. That credit automatically applies to the next eligible finalized invoice in its currency, which could be the wrong component. Invoice balance is also distinct from cash balance. [Customer invoice balance](https://docs.stripe.com/billing/customer/balance)

If evidence arrives after finalization, use an authorized invoice-specific correction. Do not silently transfer the offset to another debt.

If native subscriptions are required for these variable charges, prove a durable draft gate covering both initial creation and renewals. `pause_collection[behavior]=keep_as_draft` holds future invoices but leaves the subscription active and does not fix previously generated invoices. Installing it after subscription creation introduces a gap. [Pause collection](https://docs.stripe.com/billing/subscriptions/pause-payment)

**7. Cancellation, including portal changes**

In one local transaction:

- Append cancellation and its effective instant.
- Increment the billing generation/epoch.
- Fence later starts, renewals and amendments.
- Preserve earned/unpaid obligations.
- Record the final settlement plan.

Keep service cancellation separate from collection authority for surviving debt.

| Situation | Provider action |
|---|---|
| Unscheduled subscription, period end | `POST /v1/subscriptions/{id}` with `cancel_at_period_end=true` |
| Unscheduled subscription, immediate | `DELETE /v1/subscriptions/{id}` |
| Schedule-managed, immediate | `POST /v1/subscription_schedules/{id}/cancel` |
| Schedule-managed, period end | Preserve current phase, remove later phases, end at agreed boundary with `end_behavior=cancel` |
| Reverse pending cancellation | Fresh authority, then clear pending cancellation before termination |

When the application calculates exact final obligations, explicitly control `invoice_now` and `prorate`; do not accept accidental provider-generated settlement. Inventory pending items and prorations first. A canceled subscription cannot be reactivated. Releasing a schedule alone leaves its subscription running. [Cancellation guide](https://docs.stripe.com/billing/subscriptions/cancel), [cancel schedule](https://docs.stripe.com/api/subscription_schedules/cancel), [release schedule](https://docs.stripe.com/api/subscription_schedules/release)

**Documentation discrepancy requiring qualification:** the guide describes disabling automatic advancement for the subscription’s open/draft invoices; the API reference describes stopping automatic collection for all finalized invoices belonging to the Customer. Conservatively inspect all affected customer invoices and restore collection only for independently authorized surviving obligations. [Cancellation API](https://docs.stripe.com/api/subscriptions/cancel)

Create portal sessions using `POST /v1/billing_portal/sessions`, a server-resolved Customer, an explicit environment-specific configuration and an allowed return URL after current finance authorization. Treat the returned URL as sensitive. [Portal sessions](https://docs.stripe.com/api/customer_portal/sessions/create)

Disable unsupported price changes, promotions and retention offers. Stripe documents that subscriptions with scheduled updates cannot be updated or canceled through the portal. Provide a complete workspace cancellation path for those subscriptions and application-invoiced components. [Portal limitations](https://docs.stripe.com/customer-management)

Portal/Dashboard cancellation becomes a provider-originated fact after readback and triggers the same closure process. Do not invent a local signer attribution or resurrect service from a delayed active/update event.

**8. Credit notes, refunds and balances are different commands**

| Need | Correct mechanism |
|---|---|
| Correct an unfinalized document | Edit authorized draft lines |
| Reduce a finalized invoice | Credit note |
| Return a collected payment | Refund |
| Grant a deliberate customer-wide future credit | Customer balance transaction |
| Reduce the price on a particular new invoice | Scoped discount |

Use `GET /v1/credit_notes/preview`, then `POST /v1/credit_notes`, preferably referencing original invoice lines.

A credit note first reduces the remaining invoice amount. Any post-payment amount must explicitly become a refund, linked existing refund, customer credit or documented out-of-band adjustment. Reserve the disposition before dispatch; never use out-of-band as a placeholder. [Credit-note preview](https://docs.stripe.com/api/credit_notes/preview), [credit-note creation](https://docs.stripe.com/api/credit_notes/create)

For independent refunds, use `POST /v1/refunds` with the exact Charge or PaymentIntent and amount. If subsequently associating that refund with a credit note, link the existing refund instead of requesting another. Deliberate customer-wide credits use `POST /v1/customers/{id}/balance_transactions`. [Refund creation](https://docs.stripe.com/api/refunds/create), [balance transactions](https://docs.stripe.com/api/customer_balance_transactions/create)

Paginate `GET /v1/invoice_payments?invoice=…` and map allocations through PaymentIntent/Charge. Do not assume a single legacy `invoice.payment_intent` field covers every payment. [Invoice Payments](https://docs.stripe.com/api/invoice-payment/list)

Refund acceptance is not settlement. A refund can remain pending or fail. Display requested, pending, succeeded and failed separately. A refund alone does not rewrite the invoice or establish that contractual debt was released. [Refund behavior](https://docs.stripe.com/refunds)

The proposed actual-days cancellation calculation needs an explicit timezone, day-count and rounding policy. Stripe’s generic proration does not establish that business rule.

**9. Typed commands and transaction boundaries**

Use a closed command set:

`AcceptAgreement`, `AuthorizeMilestoneDue`, `RecordEarnedWork`, `VerifyServiceStart`, `StartRecurringComponent`, `AcceptAmendment`, `ScheduleAmendment`, `RecordHostingEvidence`, `GeneratePeriodInvoice`, `FinalizeApprovedInvoice`, `CollectOrSendInvoice`, `CancelComponent`, `ReversePendingCancellation`, `AuthorizeAdjustment`, `CreatePortalSession`, `ReconcileProviderObject`.

Each carries a command ID, expected revision/epoch, scope and immutable terms digest. Derive external amounts and authority server-side.

```text
BEGIN
  lock component, affected obligations and adjustment reservations
  check current session and scoped authority
  validate expected revision, currency, agreement and effective interval
  deduplicate command ID; reject same ID with different payload
  append immutable business fact
  reserve unique obligation or adjustment allocation
  append outbox step with canonical request hash,
      account/environment, authority reference and generation
COMMIT

Worker:
  claim step and register leased attempt in a short transaction
  persist independent pre-send intent and scope tail
  recheck authority, generation and restore fence
  call Stripe outside the database transaction
  persist independent outcome receipt
  commit local projection and successor step
  retain UNKNOWN whenever the outcome is ambiguous
```

There is **no atomic commit across Postgres, Stripe and independent receipt storage**. A crash can occur after a real provider effect but before its success receipt.

Consequently:

- Lease expiration never proves nonexecution.
- Cancellation racing an in-flight start/payment remains reconciling.
- Closure accounts for every older attempt and future provider schedule.
- Restore blocks dispatch until independent tails/epochs reconcile.
- Receipt-store failure before dispatch blocks new mutations.
- Receipt failure after provider success leads to reconciliation, not a new request key.

For API v1 POSTs, Stripe caches executed results, including 500 errors. Keys can be pruned after at least 24 hours. Identical controlled replay within the window can recover network failures, but it is not an unlimited exactly-once guarantee. DELETE does not gain protection from an idempotency key. [Idempotency](https://docs.stripe.com/api/idempotent_requests)

Timeout/500 recovery uses known object IDs, request logs, metadata, webhooks and readback. Never change to a fresh key while the original outcome remains unknown. Metadata supports correlation but is not provider-enforced uniqueness. [Advanced errors](https://docs.stripe.com/error-low-level)

A particularly important exception: **do not replay an uncertain create after cancellation simply to discover its result**. If the original never reached Stripe, the replay could create a new subscription after cancellation.

**10. Webhooks, currency and time**

The Cloudflare Worker verifies the signature against the raw body and correct endpoint secret, then durably records the inbox event before returning success.

Deduplicate by account/environment/event ID and by business-operation uniqueness. Do not permanently deduplicate on object ID plus event type: a subscription can legitimately receive many distinct updates.

Use events to trigger fresh provider retrieval. Delivery order and second-resolution event timestamps do not establish reliable state order. Periodic reconciliation must recover missing events. [Webhook behavior](https://docs.stripe.com/webhooks)

Use integer minor units and validate currency exponent. Freeze tax inclusivity, product tax codes, customer location/status and discount allocation policy. Tax can change between preview and finalization. Missing required tax information must block controlled finalization. [Invoice tax](https://docs.stripe.com/tax/invoicing)

Store contractual timezone, UTC instants, half-open periods, month-end anniversary behavior and rounding. Test leap years and DST. Supabase currently flags outdated timezone data affecting Vancouver, Edmonton and Casablanca on older project versions; verify the actual deployed version where relevant. [Supabase changelog](https://supabase.com/changelog)

Pin request API version, webhook schema, SDK and billing mode separately. Keep live and each sandbox’s credentials, objects, portal configurations and receipts isolated.

**11. Deterministic failure exercises**

These are proposed acceptance tests, not executed results.

| Test | Required result |
|---|---|
| A. Concurrent agreement/milestone commands | One acceptance, obligation and invoice operation; changed payload under reused ID rejected |
| B. Milestone paid before work completion | Payment changes; earned amount does not |
| C. Invoice-item creation succeeds but response drops | Exactly one reconciled line; no duplicate/pending leakage |
| D. Unrelated pending items exist | Only authorized obligations enter the invoice |
| E. Dashboard finalizes during assembly | No duplicate invoice or spillover; explicit correction path |
| F. Duplicate/reordered invoice events | Fresh provider state wins; stale events do not regress paid state |
| G. Checkout/setup/subscription success without verified start | No recurring-start command |
| H. Authentication required or initial subscription expires | Accurate pending/error state; no duplicate replacement charge |
| I. Future amendment with USD750 earned/unpaid obligation | Original USD750 survives; new rate applies only to its interval |
| J. Schedule update | Existing tax/discount/payment settings survive; omitted settings caught |
| K. Three calendar cycles, one unpaid | No automatic increase; paid-cycle/notice policy enforced |
| L. Hosting USD0/20/50 and ineligible Commerce | Offsets USD0/20/25/0; no duplicate evidence, balance credit or refund |
| M. Hosting evidence arrives after finalization | One authorized invoice-specific correction |
| N. Cancellation races queued/in-flight creation | Queued work fenced; unknown attempt reconciled before closure |
| O. Cancellation with multiple subscriptions and old invoices | Every affected invoice checked; surviving debt preserved |
| P. Portal cancellation followed by stale active event | Cancellation persists; no renewed service generation |
| Q. Two concurrent refunds exceed available allocation | Only authorized refundable amount executes |
| R. USD100 credit against USD40 outstanding | USD40 invoice reduction plus explicit USD60 disposition |
| S. Pending/failed refund | UI never claims cash was returned prematurely |
| T. Timeout, cached500, 409 and expired retry window | Correct recovery; no fresh-key duplicate |
| U. Crash at every persistence/send boundary, then restore | Independent tails fence stale authority; unknowns reconcile |
| V. Forged signature, wrong tenant/mode, removed authority | Rejected without disclosure or mutation |
| W. Jan31, leap February, DST, currency/tax/partial payments | Deterministic periods and correct settlement representation |
| X. Payment succeeds after cancellation | Original allocation updates; no service resurrection or double refund |

Retain command/receipt hashes, request IDs, provider object IDs, before/after obligation totals and event permutations.

The end-to-end proof must cover acceptance, milestone billing, verified start, renewal, amendment, hosting offset, cancellation, settlement and owner recovery.

**12. Real qualification and remaining decisions**

Stripe recommends separate sandboxes for local development and CI, with lifecycle simulations and payment-failure tests. Those cannot establish live activation, bank settlement, real customer authentication or production delivery. [Billing testing](https://docs.stripe.com/billing/testing)

Before acquisition, retain evidence of:

- Correct business/account, completed verification and live service activation.
- Required payment methods/currencies and payout setup.
- Approved business/support/statement information.
- Scoped server credentials and correctly configured webhooks.
- Live catalog, tax, portal and collection mappings.
- Reconciliation monitoring and recovery procedures.
- Sandbox end-to-end evidence plus a production configuration audit.

Live use requires verification and activation; sandbox success cannot substitute for them. No live qualification or money test was conducted in this assignment. [Account setup](https://docs.stripe.com/get-started/account/set-up)

The remaining decisions to freeze are immediate-cancellation day counting and earned-work allocation, late hosting evidence, the definition of a paid cycle, component boundaries, delayed-start billing anchors, hosting-offset tax treatment, pinned API/billing mode and cancellation’s actual collection scope.

The complete report is available in this response and was submitted to the existing main workflow. **The remaining coordination blocker is visible acknowledgment of that submission.**
