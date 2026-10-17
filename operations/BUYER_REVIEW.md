# Buyer usability sessions

> Current-offer boundary — October 15, 2026: use `config/offers.json` and versioned `scripts/create-job.mjs` snapshots for every new quote. Builds are # Buyer usability sessions
,400 / $2,350 / $3,700; services are # Buyer usability sessions
50 / $400 / $800 monthly or # Buyer usability sessions
,710 / $4,560 / $9,120 for twelve prepaid cycles. Baseline $399 and Audit & Fix Sprint $750. Client owns and pays hosting/domain/tools directly; setup and handoff labor is included, without new subsidies or markup. Provider plan, taxes, renewal, seats, usage, export, support and recovery are agreed before commitment. Historical V5 economics, caps and old synthetic records below are historical references only, never current offer or staffing authority. Preserve their accepted rights; never regenerate an old agreement from mutable new prices. Annual unused-cycle refunds and current-cycle unearned-work reconciliation remain required. No real account or billing changes are authorized by this copy release.


Status: prepared, not conducted. No participants, feedback or outcomes have been recorded. This implements the session requirements in `authority/v5/purchase-contract.json` (`buyer_usability_check`) and `authority/v5/BRAND_AND_MOBILE.md`. Conduct the planned five sessions when relevant prospective buyers are available; a developer rehearsal does not count.

## Set up a session

Use a relevant prospective buyer who did not help build the site. Record why their buying context is relevant, using a participant code rather than their name. Run individually, without coaching. Allow about 25–35 minutes; record actual elapsed time. Start on mobile and include a keyboard attempt. Record the device, browser, input method and exact build/source fingerprints, so a later fix can be retested against a known version.

The current synthetic candidate is `http://127.0.0.1:4198/`. Rebuild it with `npm run experience:build`, run `npm run experience:verify`, and start it with `npm run experience:serve` if it is not already running. Verify the contact page says “Submit synthetic inquiry” before a session. It saves local records and sends no email. Record the current candidate evidence from `evidence/buyer-review-candidate.json`; regenerate the evidence after source changes rather than reusing an old fingerprint. This loopback address works only on the host computer.

The published site at `https://wonderandmethod.com/` is available for browsing tasks B1–B6. Its inquiry form is live and sends real notifications. For B7, use the synthetic candidate on this computer; a remote participant can describe the steps but submission remains not tested unless a suitable test environment is arranged. Do not give participants staging/operator credentials. A live submission requires its own authorized test plan. Distinguish participant observations from the separate production save/inbox evidence.

Tell the participant: “We are testing the website, not you. Please say what you are thinking. There are no right answers, and you can stop at any time. This is a preview; please use the supplied fictional details instead of personal or customer information.” Ask permission before recording audio or video; written task notes are sufficient. Do not publish feedback or identify participants without separate permission.

## Tasks to read aloud

Show the homepage for five seconds, then hide it for the first question. After that, allow normal browsing. Do not point out links or correct answers while a task is in progress. If help is necessary, record the help and mark the result as assisted. Use neutral prompts such as “What would you do next?” rather than explaining the page.

| ID | Prompt | What to observe |
|---|---|---|
| B1 | What does this business offer, and who do you think it is for? | Service/buyer comprehension after five seconds; exact words and uncertainty. |
| B2 | Imagine you need a website for your business. Find the relevant fixed price and tell me what you would receive and what would cost extra. | Price discovery; pages, copy, revisions, form/media and exclusions from the selected resolved offer. Do not assume one offer fits every participant. |
| B3 | Once the site is yours, how would you change its content? Would that include a CMS? | Whether ownership, editing support and a separately scoped CMS are understood. |
| B4 | On mobile, find a work example. What does it prove, and whose work is it? | Example discovery and correct recognition of owned/demo/concept work; no inference of paid-client outcomes. |
| B5 | What external bills would you need to pay? Which ongoing services are optional? When would you be billed for the build? | Mandatory versus optional costs, milestone billing and uncertainty. Show the clearly labelled synthetic quote only after the participant has tried the site. Exact actual quote dates cannot be evaluated until a dated quote exists; record that part as pending. |
| B6 | How would you accept the work? What would you own or have access to, and what happens if you cancel? | Written acceptance, paid-source/account rights, reconciliation and handoff comprehension. |
| B7 | Send a test inquiry from mobile using the supplied fictional details. Then attempt the form with the keyboard. Tell me what tells you it worked. | Form discovery, labels, focus/order, validation, retained entries, submission and visible reference. Record each device/input attempt separately. A visible success message alone does not prove email receipt. |

For B7 on the local synthetic server, use a unique reference such as `BUYER-B01-YYYYMMDD` in the message, an address under `example.test`, and no real company or personal details. Choose the relevant service in the existing six-field form; there is no separate budget field. The operator verifies the returned reference against the local synthetic record. Do not run a live email test as part of this local session. If the environment is read-only, record submission as **not tested**, not a failure by the participant and not a pass.

After the tasks, ask: “What felt polished, confusing, generic or trustworthy? What would you need to know before contacting this business?” Record exact feedback separately from your interpretation.

## Record and act

Use `buyer_session_shape` in `templates/cumulative-receipt.json` as the shape for a `buyer-usability-session` entry in `operations/studio/cumulative-receipt.json`. That receipt already links the actual studio release; append buyer entries only after sessions occur. Do not create a parallel research tracker. Attach the session detail as evidence in that entry, with task results, observed behavior, exact feedback, severity, owner and change evidence. Keep participants pseudonymous in shareable artifacts.

Use results `unassisted`, `assisted`, `not-completed`, or `not-tested`; record the reason. Severity is an operator assessment: `critical` for inability to inquire or materially misleading purchase/rights information, `major` for substantial confusion or repeated inability to find essential information, `minor` for friction with a workable path. Preserve the original observation when recording a fix. Name an owner and retest affected tasks against the revised version. Do not mark a fix verified merely because code changed.

After five completed sessions, summarize observed patterns and unresolved issues in the same receipt. Report counts descriptively with the small sample size; do not claim conversion improvement, statistical certainty, a ranking advantage or commercial validation. Critical accessibility barriers, misleading purchase information and broken inquiry delivery remain release blockers regardless of session count. These sessions supplement the separate technical accessibility, delivery and release checks.
