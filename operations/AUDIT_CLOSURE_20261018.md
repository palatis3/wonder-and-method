# October 18 audit follow-through

The original double audit has five implementation defects, eight evidence gaps
and two optional improvements. Code fixes and templates do not close gaps that
require account access, elapsed operating time or actual customers. The current
release evidence and per-finding status live in the private audit-fix report.

## Before the next booking

- **Research (G05).** The owner chose to use their Semrush account manually when
  a job comes in. No connector or new subscription is required by this workflow.
  Before accepting research scope, check the needed reports, market coverage,
  allowance and incremental cost in that account. Copy
  `templates/research-brief.json` into the existing private job directory and
  complete it from actual observations. For Improve, follow its focused scope;
  for Grow, keep the existing two-topic/three-competitor/six-candidate limit.
  Record real sources and dates, intent, overlap, rejected alternatives and the
  selected output. Leave unavailable metrics null and explain why. The first
  completed brief, not this template, closes the workflow evidence gap.
- **Capacity (G04).** Confirm real calendar slots in `capacity-worksheet.json`
  and run `npm run capacity:check -- operations/capacity-worksheet.json`.
  Keep the existing one-build-start limit until observed stage times support
  more. Record research, writing/design, implementation, coordination, review,
  publication, handoff, corrections and unexpected work in the job's existing
  cumulative receipt. Use its `time_by_stage` array; do not start a second ledger.
  Count actual founder time separately from unattended processing. Complete a
  representative cycle for each materially different service before claiming
  measured capacity or margins. Preserve accepted dates and all owed work.
- **Billing (G08).** Preserve `OWNER_READINESS.md` and the billing tool's existing
  gates. The October 18 audit-fix attempt to read the Stripe connector returned
  `UNAUTHORIZED` and required reauthentication; no fresh provider state or refund
  was verified. The previously recorded tax-ID task remains unresolved in our
  evidence until the owner records closure. Do not infer current provider status
  from that older observation. Complete actual verification, funded reserve and
  fee-buffer evidence, a sandbox refund exercise and the recorded commercial
  questions through the existing owner/provider process. No live charge or
  refund is part of routine website QA.

## Operate and rehearse

Use one private copy of `templates/owner-audit-evidence.json` under
`.runtime/operations/`. Store only dates, observations and references. The
aggregate log remains `.runtime/operations/inquiry-checks.jsonl`.

- **Alerts (G01).** An external receiver has not been selected or verified in
  this task. Prepare it with the existing `INQUIRY_HEALTH.md` settings: one-hour
  expected pings and at least fifteen minutes of grace, reaching the owner
  independently of the site and its notification sender. Save the secret using
  the normal private Wrangler procedure. First use a dedicated test check to
  exercise a missing signal and recovery without disrupting production pings.
  Record the independently received failure and recovery alerts and owner
  acknowledgement. Keep manual checks until actual delivery is demonstrated.
- **Recovery (G02).** The owner rehearses access from a separate device or clean
  profile using existing recovery methods. Check source, Cloudflare, domain/DNS,
  mailboxes, payment access and second factors. Record elapsed recovery time and
  the supported data-loss bound. An isolated database restore is separate from
  account recovery; never overwrite production during this drill. See the
  existing procedure in `deployment/PRODUCTION.md`.
- **Routine (G03).** At each business-day opening and closing, run
  `node scripts/record-inquiry-check.mjs`, then actually review Gmail, support
  mail, chat and outstanding replies. Add each completion timestamp and any
  incident reference to `daily_reviews`. Record two weekly retention reviews
  using `INQUIRY_RETENTION.md`. Two normal business weeks of complete records
  provide the requested observation period; a single healthy check does not.

## Earn the remaining buyer evidence

- **Client proof (G06).** After a real delivery, use the existing job receipt to
  record the accepted problem and scope, dated outputs, acceptance, handoff and
  actual feedback. Obtain explicit publication permission for every client
  name, quote and screenshot. Separate delivered work from measured outcomes,
  with the outcome's observation window and attribution limits. Keep all current
  owned-work and fictional-concept labels until that evidence exists.
- **Prospect and accessibility sessions (G07).** Follow `PROSPECT_USABILITY.md`
  with three to five actual relevant owners. Add a focused screen-reader review
  of the menu, new pricing comparison, monthly choices, required fields and
  error feedback using a real assistive tool. Record device, browser, tool,
  assistance and observed barriers in the existing buyer-session record.
  Automated accessibility and keyboard checks remain separate evidence.
- **Pricing experiment (I01).** The compact price comparison and shorter service
  introductions preserve the detailed scopes below. Browser checks can verify
  visibility, links and keyboard access; buyer sessions must still establish
  whether the revised presentation is understood. Re-score that part only after
  observing actual tasks.

The live site may be technically publishable while these business evidence items
remain open. No instruction here authorizes customer messages, account creation,
new charges, a change in retention policy or a production database restore.
