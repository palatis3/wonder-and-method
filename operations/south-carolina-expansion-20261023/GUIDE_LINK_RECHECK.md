# Service-area guide connections — independent follow-up

**Retain all three existing connections: Broward, Calhoun and Leon, Florida. No link or label changes are required.**

I independently read the complete current rendered `dist/guides/service-area-pages/index.html`, all fields of the three current location records, and their exact existing ledger rows. This review concerns contextual relevance; it does not re-audit the complete geographic collection or the external businesses.

## Exact change and fingerprints

The previous complete article text in `evidence/google-quality-audit-20261023/guide-associations/part-3/input.json` hashes to the guide fingerprint recorded by all three existing ledger rows. Comparing it with the current article text extracted by the checker proves that the only change is the coverage sentence:

- Before: `North Carolina, and Florida.`
- After: `North Carolina, Florida, and South Carolina.`

Replacing that exact segment makes the entire previous article text identical to the current article text. The practical guidance, illustrative example, boundaries, prices and next step are unchanged. The prior/current normalized article lengths are 7,471 / 7,487 characters. All three location-purpose fingerprints remain identical to their ledger entries, and their current link labels also match.

The current **`guidePurposeFingerprint`**, obtained by importing the actual export from `scripts/site-quality-rules.mjs`, is:

```text
c1fab5a459d888136ab4dd3f4499a61b39cb0f663d6ff1eecbe67df61bfc4547
```

The previous guide fingerprint is:

```text
1bf5fca0f637e350637659053ba8f316a846e83db3c288bb6cd848442ab1faad
```

## Individual decisions

| Existing connection | Decision | Reason |
|---|---|---|
| Broward → service-area guide; “Describe the shop and road coverage accurately” | RETAIN | The brief keeps the truck’s worksite separate from its billing office and distinguishes the real Pompano Beach shop from road service. The guide explicitly separates premises, on-site delivery and coverage, and keeps address and scheduling conditions visible. It supports accurate coverage without inventing a Fort Lauderdale shop or confirmed dispatch. |
| Calhoun → service-area guide; “Explain delivery coverage without guaranteeing availability” | RETAIN | The brief connects building selection to the actual delivery property, access questions and separately confirmed scheduling. The guide explains address-level assessment, service limits and unresolved conditions. That directly supports the label without presenting general coverage as guaranteed delivery availability. |
| Leon → service-area guide; “Describe locations and service coverage accurately” | RETAIN | The brief makes workshop-specific capability and intermittent specialist availability visible before travel, while correctly locating the Midway workshop in neighboring Gadsden County. The guide asks which services are available at a real location, rejects office claims inferred from service reach, and assigns maintenance of changing conditions. |

Unchanged location-purpose fingerprints:

| Record | SHA-256 |
|---|---|
| `florida/broward` | `4cf0f82b74f9c18845b1df954ceaa2aa06a44841bc148e365e687fd8fe2a7b21` |
| `florida/calhoun` | `97541cdaa6629f68c9043991683362093ccf5e9640e0ecda1f7095ac1d882a28` |
| `florida/leon` | `5377e877b819b538c14a59c5a41d31f3d68196ae15f9e604776fe9896d2f1d12` |

## Integration evidence

`guide-links-review.json` includes the three individual decisions, complete proposed ledger rows, current/prior fingerprints and raw-byte SHA-256 hashes of the guide, source records, ledger, previous review input and checker implementation. `guide-links-audit.mjs` reproduces the fingerprint and exact-change comparison from the site root and writes only the owned review JSON.

Root can retain these three links and apply the supplied ledger rows. No public source or ledger was changed by this worker, and no build, full test suite or deployment was performed. This acceptance applies to these exact reviewed inputs; later article-purpose or location-purpose changes require another relevance check.
