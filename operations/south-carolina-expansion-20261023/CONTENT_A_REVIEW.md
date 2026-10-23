# Content A independent audit — 23 October 2026

**Result: Lexington PASS; York PASS; Beaufort HOLD; Spartanburg PASS.** One private-draft collection issue; no additional production copy defect found in the bounded commercial-scope check. These judgments concern the complete drafts at the hashes below, not release approval.

Reviewed HEAD: `b711713f376d3f180d7d330fbbe20f5c27309d2b`. Production records remain at 1,068. This audit wrote only this report and `findings.json`; it did not change source, drafts, dist, prior audit evidence, forms, accounts or messages, and ran no build or full test suite.

## Required action

**CA-01 — HOLD Beaufort as a separate commercial page.** Location: `evidence/south-carolina-expansion-20261023/drafts/beaufort-spartanburg.json:14`, especially the decision at line 16, the two scopes at lines 17–32 and planning rows at lines 45–48.

The full draft's main choice is whether the customer owns the object or needs art selected for a room. The complete existing Luzerne record (`src/location-service-data.json:62206`) already provides that choice, the same owner inputs, a focused edit versus fuller service introduction, and the acceptance case in which an empty-wall customer must not be required to name artwork they own. Its planning table separately covers owned art and still choosing art. The complete Cheshire record (`src/location-service-data.json:33380`) already extends single-item framing to artwork across rooms, identifies pieces already owned, and keeps a general inquiry available before an artwork list or layout exists.

Beaufort's mixed hallway-piece/two-empty-rooms case is clearer than an undifferentiated contact form, but its requested action is still to preserve the owned-piece and room-selection information together. It adds no distinct service decision, handoff requirement or unresolved question beyond those full existing briefs. The family photograph, three rooms and Camellia citation do not on their own make this another useful collection destination. The author review compared Vigo, Jefferson and Sevier, but omitted the materially closer Luzerne and Cheshire records.

**Minimal action:** leave Beaufort represented in the South Carolina directory and do not integrate this commercial draft. Reopen only for a complete, source-supported brief with a materially different visitor decision; another scenario, new wording, or a longer mixed-request table is not a sufficient correction. No correction to the factual Camellia claims is required, and this finding does not request a change to existing production records.

This is an editorial collection judgment, not a claim that Google has found a policy violation. Google's [helpful-content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) asks whether a page gives its intended readers substantial help and useful original analysis. Its [spam policies](https://developers.google.com/search/docs/essentials/spam-policies) address low-value regional funnels and scaled production primarily for rankings. I applied neither a keyword-volume threshold nor an exclusive-industry rule; no minimum page count must be met.

## Per-page evidence and decisions

| Page | Judgment | Evidence and practical purpose | Required correction |
| --- | --- | --- | --- |
| Lexington | PASS | Pinestraw Place's FAQ supports different bulk/sod lead times, address confirmation and supply versus installation. The draft's product-change case requires a fresh timing discussion and product-appropriate quantity context while preserving installation intent. Fluvanna covers estimate versus fulfillment but does not test invalidating the earlier timing assumption when the material changes. | None. |
| York | PASS | The stored source explicitly distinguishes a public closures calendar from reservation confirmation, then sets out review, meet-and-greet and required trial. The draft tests three different states: inquiry received, trial arranged, reservation confirmed. Atlantic's new/returning appointment choice and Clarke/Van Buren's boarding responsibilities do not provide that same calendar-and-onboarding state distinction. | None. |
| Beaufort | HOLD | The source claims are supported; the full-record collection purpose substantially overlaps Luzerne plus Cheshire as explained in CA-01. | Directory coverage only until a materially different full brief passes review. |
| Spartanburg | PASS | RoCo's named Porsche and Scout galleries and Spartanburg contact address are supported. The proposed inquiry keeps two identities: the portfolio vehicle as inspiration and the customer's different asset as the subject of work; separate component descriptions prevent a two-cushion inquiry becoming an entire interior. Venango concerns a vehicle-specific design-tool preview; Montgomery concerns representative versus actual inventory; Addison concerns retained versus changed components. None of those full records makes the two-asset reference transfer the central interaction. | None. |

Spartanburg has limited published operating-policy detail. The draft appropriately refrains from inventing prices, materials, turnaround, receiving/removal rules or an existing upload system. Its narrow PASS rests on the explicit reference-versus-customer identity checks, not industry novelty or geography alone.

Source anchors read: `primary/sources/selected-york-1.txt:108` (calendar), `:114` (onboarding), `:144` (submission does not reserve), `:162` and `:177` (Paw Partner); `selected-beaufort-1.txt:103` (room reference), `:120` (selection/placement consultation), plus the Bluffton location source; `selected-spartanburg-2.txt:78` (address), `selected-spartanburg-3.txt:75` and `selected-spartanburg-4.txt:75` (named projects). These paths are relative to `evidence/south-carolina-expansion-20261023/`. All seven selected source text files match their manifest SHA-256 values. Lexington had no stored selected snapshot: I independently read the [live primary FAQ](https://pinestrawplacesc.com/faq/) on 23 October 2026; its delivery, sod and installation sections support the bounded claims. Exact source prices, timings and capacity were not copied into the drafts.

## Scope, schema and verification

Read both complete draft files and both author review files. Independently searched the 1,068-record collection, then read 16 complete comparison records: Atlantic NJ; Clarke and Fluvanna VA; Van Buren and Sevier TN; Wyoming WV; Potter, Venango and Luzerne PA; Jefferson, Madison and Vigo IN; Montgomery NY; Addison VT; Wilkes NC; Cheshire NH. This is a targeted comparison, not a second full review of all 1,068 pages. The prior completed audit under `operations/google-quality-audit-20261023/` remains unchanged and is not reopened.

The shared renderer (`src/location-service-pages.mjs:27`) introduces Terry's broad remote web-design service and the public-example/nonclient disclosure before the named examples. Its scope comparison (`:14`) explicitly says examples are not prepriced assignments; included forms have six agreed fields, one destination and one confirmation, with uploads, sensitive data, custom booking, payments and automation assessed separately. The four drafts label added behavior as proposed and assign professional decisions to the business or appropriate specialist. The record-level absence of repeated shared copy would not itself be a defect.

The bounded commercial check compared the shared renderer with `config/offers.json`, `src/service-content.mjs` and `src/pricing-content.mjs`: build prices/page/form/connection allowances use the offer catalog, review/fix limits agree, remote delivery and ownership agree, and none of these four examples promises complex functionality inside an ordinary form allowance. No actionable production discrepancy was found.

An in-memory data check found all four drafts use exactly the initial-four key set, consistent county identities, expected county paths and directory anchors, no production path/identity collisions, two scopes, three quote questions, and four rows of four cells. Descriptions contain 145, 143, 148 and 160 characters respectively. Applying the existing pure `locationCopyFindings` function returned no findings. Service schema mapping in `src/pages.mjs:112` reads these `servedAreas` and points to the studio provider. Integration, generated routes, geographic backlinks, live rendering and full release gates remain untested here because the drafts are private and the release is frozen.

## Pinned inputs

| Input | SHA-256 |
| --- | --- |
| `drafts/lexington-york.json` | `02a61f91097f824126a8ff00db5032efe60935eb73af0e8399fbf0a4c9757b0d` |
| `drafts/beaufort-spartanburg.json` | `8c5c0ac31965eb8dd62c92e1878fb4ad92b42528a0b45bd49f8ccf5a96fc2944` |
| `src/location-service-data.json` | `39fb7aa50d73d9971dc57919c478baeaa8d6253a5ed71c12172955f97f010bde` |
| `src/location-service-pages.mjs` | `e01bf5c4b565bd1df4ab431402dfae6cf462c9e4d1004af88d8a562b0f878cac` |
| `config/offers.json` | `f3d686ce1e7a18fae8dea08d8c1f2c70730e349687eea1de998ed96f5545dab2` |

Draft paths in this table are under `evidence/south-carolina-expansion-20261023/`. `findings.json` pins 27 review inputs, individual record hashes, complete comparison identifiers and their hashes, checks, source URLs and the exact required action. Record hashes use SHA-256 over Node `JSON.stringify(record)` in the parsed file's property order; file hashes use raw bytes.
