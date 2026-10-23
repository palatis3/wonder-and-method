# Implementation status — October 22, 2026

The website is published and verified. The latest release is the [Florida expansion](operations/florida-expansion-20261022/RELEASE.md), following the county article publication. Deployed application identity remains separate from later documentation commits and requirements for accepting client work.

## Current published website

| Item | Verified October 22, 2026 |
|---|---|
| Origin | https://wonderandmethod.com |
| Published source | `5fcab430fd1b36a58ea1753f969a8a620108ea5f` |
| Authenticated runtime | `c16af9b4-69ef-4a03-b135-b1bbd1151f62` |
| Content | 124 HTML routes including the error page; 123 sitemap URLs; 59 guides; 1,079 area entries across 20 states and Washington, DC; custom Buffalo/Erie page retained |
| Technical validation | 686 unit tests and 276 browser checks passed; 156 intentional skips; 34 reviewed screenshot references; exact-commit GitHub verify/visual and predeploy passed |
| Live verification | All 124 HTML routes and 1,105 asset hashes match; 1,576 redirect variants passed for 332 retired routes and 62 New York aliases |
| Independent review | Geography, source/editorial, integration/migration and evidence consistency reviews passed; corrected population-source provenance recorded |
| Database | Migrations through 0021; only areas_florida added; 446 prior aggregate rows and all 4 prior inquiry records preserved; restored integrity and foreign-key checks passed |
| Search | Google accepted the updated sitemap and reports Success with 123 discovered pages; discovery does not establish indexing or rankings |
| Monitoring | Authenticated health was healthy after publication. Latest observed scheduled success was 2026-10-23T01:17:30.694Z; a new scheduled run after this deployment has not been observed. No new external receiver receipt is claimed |

The private release record is `evidence/florida-expansion-20261022/release-record.json`, alongside the technical manifest, live HTTP/browser checks, redirects, backup/preservation results and Google receipt. [Exact-source GitHub checks](https://github.com/palatis3/wonder-and-method/actions/runs/39882286408) passed. Earlier release reports remain historical evidence.

Deployment identity comes from the authenticated operator response and the private build manifest. Public `/version.json` returns 404. Do not infer the running version from the latest repository commit or an old screenshot. Follow [PRODUCTION.md](deployment/PRODUCTION.md) for publication and verification.

## Offers and daily operation

New scopes use [config/offers.json](config/offers.json), currently version `2026-10-21-clarity-review`; accepted historical scopes retain their exact saved terms. Launch, Focused and Signature remain $1,400 / $2,350 / $3,700 with 6 / 15 / 30 pages. Use the current catalogue and written scope for inclusions, additions and dates; older V5 prices and planning assumptions are historical.

Use [HANDOFF.md](HANDOFF.md) for daily operation, [WORKFLOWS.md](operations/WORKFLOWS.md) for a client job, [PAYMENTS.md](operations/PAYMENTS.md) for private Stripe invoicing, and [CLIENT_HANDOFF.md](operations/CLIENT_HANDOFF.md) for source delivery. Website notifications go to the owner's Gmail inbox; public support mail remains in Fastmail and chat remains in tawk.to. Monitoring does not prove mailbox review or a buyer reply.

The actual private board is `.runtime/operations/weekly-board.json`; the tracked `operations/weekly-board.json` is a blank template. The October 22 report contained zero recorded buyers. That is a board observation, not proof that no inquiries exist elsewhere. Use `npm run leads -- report` for a fresh report.

## Remaining business requirements

[OWNER_READINESS.md](operations/OWNER_READINESS.md) and the existing per-job checks remain in force. The following do not become complete because website tests pass:

- Actual dated capacity, correction coverage, cash floor, required owner compensation and bookkeeping.
- October 22 owner clarification: no clients or bookkeeping system yet; monthly pay is flexible with no numeric minimum selected. A blank local bookkeeping starter is available through `operations/cash-worksheet.json`; actual books and balances remain unverified, and further bookkeeping work is deferred.
- Reviewed agreement, tax/invoicing treatment, assumed-name/name-rights and insurance/coverage decisions where applicable.
- Resolution of Stripe's owner tax-ID task. The October 22 read-only API reports charges and payouts enabled; it does not expose or clear the Dashboard requirement observed October 18.
- Actual funded annual-service reserves and the separate provider refund rehearsal before annual enrollment.
- Independent access/recovery without this Windows profile, including production credentials and provider/mailbox accounts.
- Sustained mailbox/chat/reply coverage, genuine client evidence and observed end-to-end delivery time before broader capacity or outcome claims.

Historical release records remain evidence of their dates and scopes. The October 18 [audit closure](operations/AUDIT_CLOSURE_20261018.md), October 21 [clarity audit](operations/CLAUDE_AUDIT_20261021.md) and [follow-up audit](operations/CLAUDE_RERUN_20261021.md) retain their original findings and limitations. This update does not declare the entire business complete.
