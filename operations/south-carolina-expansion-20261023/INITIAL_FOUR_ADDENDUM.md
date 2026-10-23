# Initial-four correction verification — 23 October 2026

Independently verified C1 and C2 for Charleston and H1 for Horry in both the generator and JSON. Reversing exactly those three replacements reproduces the original reviewed SHA-256 in both files, confirming that these are the only changes to the reviewed inputs.

| Input | Original reviewed SHA-256 | Current SHA-256 |
|---|---|---|
| drafts/initial-four.json | 9d0d7fa67c62e120ba3bbb67ad272078f66778aa0ec603419cccdcdcbb5db384 | 859b7808c50d0d1000b194c643352ab9c7f71468e1cf351fa8a79738350832bb |
| drafts/initial-four.mjs | 1d411a5dd94de47476c27164369f0ef06747b3d1d6b9e3621739846ca8e7ec1f | f94aa12d09bf6082331f79499c4628639a6fb6861c8e3ea0467f37967fe0a41e |

Charleston's required guest-count correction is resolved. **Charleston, Greenville, Richland and Horry now PASS this scoped editorial review.** Original report and review.json remain an immutable account of the earlier input and finding; this addendum supersedes Charleston's earlier HOLD for the hashes above.

H2 was optional and was not applied. Keeping the explicit source-uncertainty sentence is acceptable: it accurately explains why the draft gives no capacity, and it does not repeat either conflicting figure. No new source check was needed for the unchanged facts. Previous integration and rendering limitations still apply; no production or dist files were changed by this review.
