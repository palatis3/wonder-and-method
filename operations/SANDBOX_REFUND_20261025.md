# Stripe sandbox refund rehearsal — October 25, 2026

The existing synthetic $700 checkout payment from October 16 was fully refunded in the authenticated **Wonder and Method sandbox** Dashboard. Stripe showed **Refunded**, a $700 refunded amount and a `refund.created` event whose refund object had `status: succeeded`, `amount: 70000` and `currency: usd`. The event appeared at **2026-10-25 04:40:36 UTC** and identified Dashboard as its source. The test card ended in 4242; the customer was explicitly labeled synthetic with an `example.invalid` email address. Receipt history continued to show **No receipts sent**. No receipt-send control was used.

This was the previously recorded invoice, not a new charge. Its original paid-invoice history remains historical payment evidence; the payment now has a full refund. An invoice's paid label alone must not be used to infer an available or unrefunded balance. The simulated original $20.60 processing fee remained in the payment breakdown, giving a net amount of -$20.60 after the refund.

The private provider identifiers and observation record are in `C:/Wonder and Method/wonder-method/.runtime/payments/refund-rehearsal-20261025.json`. Earlier checkout evidence remains in that checkout's `evidence/payments-20261016/provider-checkout.json`. The existing restricted key permissions were not expanded; this rehearsal used the authenticated sandbox Dashboard.

This completes the provider refund-route rehearsal only. It does not establish a funded annual reserve, fee buffer, accepted undelivered-work reserve, real customer cancellation, bank settlement, actual cash position or delivery capacity. Annual enrollment stays on hold until its other requirements are evidenced. For an actual cancellation, reconcile the accepted terms and unearned amount, identify the responsible operator and effective date, and meet the recorded ten-business-day initiation deadline.

Provider references: [refund workflow and fees](https://docs.stripe.com/refunds) and [sandbox testing](https://docs.stripe.com/testing). Real refunds require the actual reconciled customer obligation and appropriate authorization.
