# Measuring useful inquiries

The existing aggregate journey counts and consented analytics describe activity; they do not identify a person-level visitor funnel. The private lead board records one economic buyer and its saved inquiry reference. Do not put messages, names, email addresses or references into public analytics.

Use the existing `npm run leads -- init`, `update PRIVATE_JSON_FILE` and `report` workflow. Initialization preserves existing rows. The board is private under `.runtime/operations/weekly-board.json`; do not commit its content. Existing stage requirements still apply: record the real buyer job before qualification, a scope link for a proposal, and payment/booking evidence before marking won. Record unknown outcomes as unknown. Follow the existing retention checks across all systems.

The report now adds progression for histories recorded from receipt. It counts each buyer once per stage, excludes incomplete/malformed histories and reports null percentages when no eligible history exists. A buyer can skip or reopen stages; this is not a guaranteed descending funnel. Current-stage totals remain available separately. The report contains aggregate counts only.

For a before/after review, save dated private report snapshots and note the website release, campaigns, seasonality and changes in offers. Compare inquiry quality, proposal progression, paid acceptance and repeated scope questions. Review the same observation period and allow time for open proposals to resolve. Do not divide these buyers by aggregate page events and call the result a conversion rate. A change in counts is not proof that design caused it.

No usable private board was present in this checkout at implementation time. That means the baseline is unavailable, not that the business has zero leads. Actual entries, buyer interviews and visual-editor demand remain owner-supplied later inputs. Do not seed the working board with demonstration records.
