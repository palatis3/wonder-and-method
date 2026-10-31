# Intermediate recovery review

An independent Astra review covered the current restore, retention, storage and restricted recovery integration. It was a bounded intermediate checkpoint, not a final release review.

| Finding | Repair and evidence |
|---|---|
| P1: optional recovery discovery returned a freshness denial and blocked an otherwise authorized customer refresh. | Non-recovery customers return an empty recovery discovery list before its MFA gate. The frontend treats that optional discovery's 401/403 separately. Normal session/workspace authorization remains required. Local stale-customer regression passes. |
| P1: a primary rollback could erase SQL-only first-write and deletion fences. | Canonical workspace, inbound and export writes also use independent encrypted immutable object claims. A permanent independent no-recreate marker is verified before physical DELETE. The identity is global to the exact backend/bucket/key/storage target, so inbound routing loss cannot bypass it. Tests include concurrent first-claim winners and an always-permitted rolled-back SQL scanner that can neither repeat POST nor recreate a retained key. |
| P2: event 257 advanced the retention head before the capacity readback failed. | Causal validation and capacity checks precede immutable writes and head CAS. Pending jobs reserve their remaining dispatch/absence slots. A seeded 256-event regression confirms a rejected append leaves the original readable head and object count unchanged. |

The reviewer rechecked all three fixes and passed five focused tests, with no remaining findings in that recheck. No files were edited or external effects performed by the reviewer.

Main also fixed authenticated retention causality: every absence requires its exact original pending intent/dispatch, source inventory and nonce, including same-generation and newly authorized observer-generation events. Orphan and mismatched observations are rejected before persistence.

These tests do not qualify real R2/admin separation, source attestation, old-writer draining, immutable source storage, maximum-bound execution, off-device custody or full disaster recovery. Physical deletion and production remain gated. The unfinished runner/record inspection/customer reopen and trusted producer/consumer wiring are recorded in PAUSE-20261031.md.
