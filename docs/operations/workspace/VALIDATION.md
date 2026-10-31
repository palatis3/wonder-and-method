# Workspace validation register

This is an implementation checkpoint, not release approval. Production remains
unchanged. The complete-launch backlog and three final judges are still required.

## Executed on 2026-10-30

- Local PostgreSQL WASM migrations and behavior tests: tenant access, current
  memberships, operator MFA, immutable version approvals, STOP races, unknown
  operation outcomes, file quarantine, private-origin cookies/CSRF, service
  records, current session revocation and seven AI tasks.
- Separate PostgreSQL 17 CI workflow added. Multi-connection tests require
  `WORKSPACE_TEST_DATABASE_URL`; local WASM runs explicitly skip those three
  tests. A skipped race test is not evidence of concurrency safety.
- Staging migrations through session revocation and AI preparation applied to
  `lobowejsstuoicjxoqmy`. Production `qbjfabidetdyjavljnsd` has not been migrated.
- Astra intermediate review found AI retry/opt-out and logout issues. Fixes have
  targeted regression tests. These are not the requested final reviews.
- Live Astra smoke evaluation: seven task types against one shared synthetic
  adversarial case, seven valid structured outputs with valid source references.
  Inspection found stale/conflicting facts identified, null metrics preserved,
  injected launch instructions ignored, and no invented approval/completion.
  Usage: 3,087 input tokens and 3,723 output tokens. This is a smoke evaluation;
  representative held-out service cases and measured human correction time are
  still required before production enablement.

## Supabase advisories

The staging security advisor reports private tables with RLS and no row policies.
This is deliberate deny-by-default: neither `anon` nor `authenticated` has table
access. Human commands use narrow, explicitly granted functions with current
session, membership, tenant, capability and parent checks. Adding permissive
table policies would weaken this boundary. See
[RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Fourteen public RPCs intentionally use `SECURITY DEFINER`. Their fixed empty
search path, revoked PUBLIC/anon execution and explicit human authorization are
required to cross the private-table boundary; machine functions are service-role
only. The warning remains an audit obligation, not an automatically dismissed
finding. See
[executable definer functions](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

The initial performance advisor found 74 foreign keys without covering indexes.
The index migration adds missing prefixes without dropping indexes on the basis
of empty staging usage. Recheck after applying it. See
[foreign-key indexes](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).

## AI configuration and controls

Adapter: OpenAI Responses, `gpt-6-astra`, low reasoning, strict JSON schema,
3,000 output-token ceiling, 60,000 input-character ceiling, 55-second timeout,
no tools and `store:false`. Up to 20 preparation actions per business per day.
No automatic retry after an unknown outcome; an operator must acknowledge a
possible second provider charge. Each attempt retains a separate cost/outcome
record. A crashed worker becomes an unknown attempt after two minutes.

AI is disabled at environment level until qualified and disabled per business
until its administrator opts in. Output is internal draft text; accepting it
does not send, publish, spend, grant authority, or create approval records.
Original source versions and review effort are retained. Source changes mark
prepared or accepted drafts stale. No AI output is used as access-control input.

`store:false` is not zero data retention. Standard provider abuse logs may retain
content for up to 30 days; approved retention controls must be verified in the
actual account if required. The configured endpoint is the global API endpoint;
no regional residency guarantee has been configured. See
[data controls](https://developers.openai.com/api/docs/guides/your-data),
[structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
and [Astra model reference](https://developers.openai.com/api/docs/models/gpt-6-astra).

## Outstanding release evidence

Actual SMTP/OTP, MFA and logout exercises; scanner entitlement and malicious-file
tests; provider OAuth and typed ad mutations/readback for all five providers;
Stripe and Resend duplicate/out-of-order webhooks; complete delivery modules;
independent encrypted receipt/file backup and scoped restore drills; browser,
accessibility and interrupted-form tests; complete public-offer reconciliation;
CI results; three final independent Astra judges. Do not publish or represent
these items as passing based on the tests above.

## People controls and synthetic interface

Added verified-email invitation acceptance, explicit customer-role changes,
last-administrator protection, and bounded decision-domain assignments. All
material changes require recent sign-in; operator assignments also require MFA
and independent customer-authority evidence. Reducing access invalidates older
invitations. The tenant authority-version change cancels all pending positive
operations; in-flight and defensive operations remain visible. Independent
Astra review identified both edge cases and regression tests now cover them.

Local suite: 31 passed, three multi-connection cases skipped locally; subsequent
expanded People suite: four passed. Prior committed GitHub PostgreSQL 17.11 run
41146285077 passed all 31 then-current tests, including concurrency. This is not
evidence for the newly added cases until their next CI run completes.

Synthetic-only local browser: customer overview, request submission, exact
version approval and invitation creation exercised against isolated PGlite.
Invitation UI truthfully records delivery as pending; live email provisioning
and delivery are not yet connected. People migration applied to staging only.
The two advisor categories remain deliberate RPC-only access findings, as
documented above. No production migration or publication has occurred.

## Receipt, dispatcher and browser checkpoint

Staging now includes receipt durability and service outbox migrations. Independent
Astra review found two receipt issues: a missing current predecessor could be
extended, and one failing tenant could starve the global batch. Both are fixed
with regression cases for damaged predecessors and cross-tenant retry rotation.
Read-only reconciliation preserves the original dispatch context, including when
an invitation is revoked after an uncertain identity effect.

The full local Node suite passed 44 tests with three real-PostgreSQL concurrency
tests skipped locally. GitHub PostgreSQL run 41147330572 passed the preceding
People commit; the receipt/dispatcher changes require their new CI result.

Six Playwright tests passed across desktop (1440 × 1000) and phone (390 × 844):
customer request → scoped preparation → exact-version approval; invitation save
and revoke; error-preserved form intent and retry; and all eleven workspace
sections checked for horizontal overflow and WCAG A/AA automated violations.
Secondary text contrast was corrected after the first run. These use the
isolated synthetic database and cannot establish live OTP, provider permissions,
email delivery, scanning entitlement, R2 retention or production readiness.

## Commercial workflow checkpoint

Staging includes 37 immutable catalog variants, draft/send/withdraw proposals,
exact-version contract acceptance, portable acceptance receipts, access checks
and distinct due/earned milestone records. Accepted amendments preserve earlier
obligations; new amendment charges remain blocked until explicit effective-date
reconciliation. Milestone work must be linked before its review version, and an
approval cannot be reused for a different milestone. Care onboarding waivers
require the documented eligibility; introductory reservations are globally
serialized and limited to the catalog's three introductory production clients.
This is a discount rule, not an acquisition or service-capacity limit.

Independent Astra review identified five commercial issues and two residual
paths. The combined corrections have regression coverage in commercial.test.mjs.
The local suite passes 50 tests, with four multi-connection cases reserved for
PostgreSQL CI. All eight desktop/phone browser journeys pass, including catalog
service creation, signer assignment, proposal send, acceptance, and receipt
download. The prior commit 8cb8598 passed GitHub's private checks.

Remote staging checks confirm no anonymous command access, no direct customer
catalog-table access, and no execution privilege on the replaced projection.
Advisors report only the documented RPC/deny-by-default design categories:
68 RLS tables with no broad policy, 19 authenticated security-definer endpoints,
and 87 unused indexes in the empty staging database. No missing foreign-key
indexes remain. Production is unchanged.

Remaining commercial integration work includes billing-provider execution and
reconciliation, effective-date activation, recurring entitlements, exact site
identity/overlap checks, and complete service-specific readiness. These tests
do not establish live Stripe, email, scanner or advertising qualification.

## Controlled invoice checkpoint

Catalog scope revision 2 adds site identity and overlap checks for bundled Care,
onboarding and native measurement. Staging has both catalog revisions; accepted
agreements retain their original snapshots. The current catalog has 38 variants.

The billing ledger separates due charges, earned work and provider-observed
payments. Each milestone invoice has separate create, attach, finalize and send
operations, stable keys, exact customer/account/environment bindings and a
read-only recovery path. A lost send acknowledgement remains unknown. Stripe
webhooks verify raw signatures and persist before acknowledgement; event snapshots
only request current-state retrieval. Readback leases retain their claimed request
watermark so a newer event is not swallowed by an older readback.

Independent Astra review found and verified corrections for the webhook watermark
race, unsupported-event starvation, saved provider-reference recovery, finalized
invoice validation and reuse of completed leases. The local suite passed 56 tests;
four multi-connection tests run in PostgreSQL CI. All eight desktop/phone journeys
passed, including accepted agreement to prepared invoice. The migration was applied
to staging only. No real Stripe invoice, charge or notification was created.

Remaining billing work includes qualified account provisioning, service activation,
recurring scheduling, hosting allocations, amendments, settlement/refunds, portal,
non-invoice payment objects and live provider qualification. These gates remain
closed until implemented and verified. Owner email: palatis3@gmail.com; the staging
Auth project has no owner identity yet and operator access has not been provisioned.

## Recurrence and provider-attempt journal checkpoint

Actual service commencement now requires accepted terms, confirmed required facts,
verified access, finance/delivery authority, and verified launch evidence for ads.
Monthly service dates retain the local anniversary through short months, leap years
and DST. The accepted amount remains unchanged; there is no automatic introductory
price increase. Care allowances renew without rollover. Restricted businesses are
excluded before the renewal batch limit so they cannot starve open businesses.
Hosting evidence or a no-eligible-bill confirmation is bound to a specific uninvoiced
period, with capped allocation and checksum deduplication. The invoice records the
gross charge, hosting reduction and net price. Live tax treatment needs qualification.
Cancellation fences queued invoice effects and preserves actual provider outcomes;
period-end selection requires an observed paid recurring invoice.

Provider effects now require an encrypted independent intent readback before dispatch
and outcome readback before local resolution. Late outcomes retain their original
recovery generation. If the outcome record cannot be saved, the operation remains
unknown; it is never redelivered automatically. Preflight failures with no registered
attempt can retry a delayed authority check. Recorded attempts remain excluded.

Astra reviewed the added recurrence and journal code. Fixed ready-file/launch UI
projection mismatches and the restricted-tenant renewal fairness issue. The full
local suite passed 60 tests (four PostgreSQL-only cases skipped locally), and eight
browser tests passed. The fairness regression passed after the final query fix.
GitHub private checks passed for 76eafaf, including PostgreSQL concurrency. This
migration is applied to staging only; real provider qualification and restoration
exercises remain pending.


## Refund checkpoint

Verified invoice-payment relations bind charges to the existing invoice/customer/
account before refund authorization. Partial cross-invoice allocations are rejected
for separate review. Refund reservations retain unknown and pending outcomes;
provider calls use the durable attempt journal and exact idempotency key. Finance
and independent recovery authority are rechecked after allocation lookup, directly
before the refund POST. A missing provider reference never causes a second POST.

Independent Astra review identified stale charge balances after a refund, delayed
charge reads overwriting newer refund state, long preflight authority gaps, and
incorrect invoice lookup trapping the charge. The fixes invalidate old balances,
fence charge readback by binding version, recheck final dispatch authority, and
keep tentative lookup records separate from unique verified allocation.

Refund refresh uses a fair leased queue and fresh provider GETs, with webhook
watermarks. A successful refund can later fail or need customer action; it is not
an immutable terminal state. Created/accepted/pending/succeeded/failed remain
separate from earned work and service status. Tax/credit-note treatment requires
explicit finance evidence before authorization; live tax treatment remains an
account qualification gate.

Full local checkpoint: 62 passed, four PostgreSQL-only cases skipped locally;
eight desktop/phone journeys passed. Four focused refund tests then passed after
the final review fixes. No actual refund or real customer charge was created.

Official API contracts verified 2026-10-30:
- https://docs.stripe.com/api/invoice-payment/list
- https://docs.stripe.com/api/charges/retrieve
- https://docs.stripe.com/api/refunds/create
- https://docs.stripe.com/refunds (including later bank failures/requires-action)


## Settlement statement checkpoint

Statements preserve immutable versions and distinguish earned work, received
service fees/tax/overpayments, refund entitlement, and unpaid earned work. A
source fingerprint changes with substantive billing evidence, not an unchanged
poll timestamp. Prepared statements never complete refunds, advertising transfer,
access revocation, exports, or service closure.

Catalog revision 3 makes calendar-day earning explicit for new advertising
management agreements. Deliverable-based plans require reviewed completed-work
earnings; existing accepted agreements retain their original policies. Uninvoiced
earned milestones remain visible. Partial receipts require typed allocation to
service fees, tax and overpayment, summing to the actual observed receipt. Finance
records completed-work and tax evidence; no real refund or tax credit is implied.

Independent review identified and corrected universal time proration, missing
uninvoiced earned milestones, and tax assumptions on partial receipts. Focused
SQL tests cover leap February, DST, those corrections, stale financial inputs,
immutable history and restricted customer roles. Browser journeys now include
customer cancellation and studio statement creation. The preview and package
copy all workspace source modules, preventing omitted UI imports. Mobile
settlement tables support keyboard scrolling.

## Invite-only upload policy checkpoint

Owner explicitly deferred malware scanning for the invitation-only phase.
Files retain type/size limits, private storage, tenant and parent checks,
checksum-verified immutable objects, attachment downloads and sandbox headers.
`unscanned` is distinct from scanned readiness; only a machine RPC can record
release. Previously rejected files cannot become available through this path.
Switching to scan-required mode never falls back on absent credentials.

Focused tests verify no scanner request, unknown sealing acknowledgements,
interruption after sealing, recovery without another write, corrupt-byte refusal,
revoked access and explicit unscanned labels in Files and hosting selection.
Full local suite: 71 passed / 4 Postgres concurrency cases skipped locally before
the final recovery regression; focused final files/HTTP/recurring suite: 13 passed.
Ten desktop/phone browser journeys passed, with both changed Files/hosting
journeys rerun after the selector fix. Build passed. Independent Astra checkpoint
review reports no remaining P0-P2 findings; live Storage is still unqualified.
The production Worker asset allowlist now includes closure-ui.mjs; an HTTP
regression checks every module directly imported by app.mjs.

## Provider connection checkpoint

OAuth state is browser/session/tenant/service-bound, single-use and encrypted.
Credentials bind their original recovery generation and the OAuth application
configuration. Refresh uncertainty remains fenced; independent control is
checked around token operations. Fresh account observations preserve manager
identity and grant read_verified only. No ad execution adapter is enabled.

Astra completed two intermediate read-only reviews. Recovery-generation,
ending-service and repeated-card error restoration findings were fixed; no
remaining P0-P2 findings at this checkpoint. These are not the three final judges.
Dot researched current official provider contracts; OAUTH-SETUP.md records pins,
required configuration and remaining live qualification gaps.

Full local suite before final additions: 81 passed / 4 Postgres concurrency tests
reserved for CI. Final focused connection/OAuth/HTTP suite: 20 passed. Ten existing
desktop/phone journeys passed, plus four new account-selection/action-retry cases.
Phone connection screenshot visually checked. Build passed. Staging migration
provider_connections applied successfully; authenticated cannot call secret
context RPC, anonymous cannot start OAuth, service_role can claim callbacks.
Advisors show only the existing intentional deny-all private-table/RPC-boundary
categories (RLS without policies; authenticated SECURITY DEFINER entrypoints).
No live authorization, provider app approval or production publication is implied.

## Desktop and mobile optimization (owner request, 2026-10-30)

Replaced the horizontally clipped mobile workspace links with an expandable
menu exposing all customer sections and Studio access. Desktop navigation can
scroll in short windows. Mobile inputs use 16px text; buttons, links in the menu,
selects and disclosure controls have 44px minimum targets. Long names/IDs and
buttons wrap. Narrow cards/forms, safe-area padding and table containment remain
responsive. Escape closes the menu and returns focus. Menu updates do not rerender
the work area, preserving unfinished drafts and selected files.

Checks cover widths 320, 390, 768, 1024, 1440 and 1920, short desktop windows,
long unbroken business names, all 13 customer sections, keyboard navigation,
accessibility and reduced motion. Overflow compares with assigned device width,
not mobile innerWidth (which can expand to accommodate accidental overflow), and
waits for actual workspace content rather than the initial loading heading.

Fourteen existing Chromium desktop/phone journeys passed. WebKit phone journeys
and navigation passed; final long-content/accessibility checks passed in all
three environments (6 cases). Draft/file preservation regression passed in all
three (3 cases). Desktop/phone screenshots were visually inspected. Independent
Astra review found the menu rerender issue, which was fixed; no remaining P0-P2
responsive findings. CI now installs WebKit and runs the full workspace suite on
Chromium desktop/phone plus WebKit phone.

Public-site production build completed: 2,437 routes. Targeted public buyer,
payment-card and live-resize journeys passed: 45 passed, 15 intentionally skipped
for incompatible device conditions, across desktop/phone/reduced-motion projects.
Public source layout was unchanged. The initial public test startup failed because
this checkout had no built dist; it passed after building. No publication occurred.

## Reporting and outcome history checkpoint — October 30

Added explicit CSV validation, staged preview, complete-import promotion, exact
numeric values, one-current-period conflict handling, and append-only corrected
snapshots. Published reports require an exact reviewed narrative; draft report
revisions are excluded from the complete customer projection. All figures retain
source/account/currency/zone/period/definition/provisional metadata. Missing values
remain null. Source corrections visibly mark older reports rather than rewriting
published evidence. This is the manual CSV path; automatic provider metric reads
remain pending and are not claimed as qualified.

Pseudonymous outcome entry now records unknown/booked/attended/no-show/suitable/
won/lost separately, with source-event dedup, immutable correction events, source
and consent references, retention deadlines and current-actor checks. Late events
cannot erase a later outcome. Preexisting confirmations get an explicitly labeled
legacy baseline with unknown occurrence date/actor retained honestly. Win amounts
and currency are visible in both current and historical records. Expired records
are hidden and further edits denied; physical retention sweep remains pending.

Four reporting and three outcome database/parser tests pass. Full workspace run
before the final legacy-baseline addition: 93 pass, 4 PostgreSQL-only skips; CI
runs the PostgreSQL cases. Six browser cases passed across Chromium desktop,
Chromium phone and WebKit phone, covering CSV → review → publish, second-card
error isolation, phone containment and dated outcome entry. Build passes.
Independent Astra checkpoints found card retry identity, preview containment,
ledger immutability, win visibility and legacy-baseline gaps; all fixed and
reviewed with no remaining P0–P2 findings in these bounded scopes.

Both migrations applied to staging only. Verified no anonymous reporting RPC,
customer direct history SELECT, old projection RPC, legacy unhistoried editor or
private baseline execution. Advisor notices remain the deliberate private-schema
RLS-deny/default and authenticated command-boundary notices. No production deploy,
provider metric import or customer report was performed.

### Catalog delivery and source-fact checks — October 30, 2026

Added 38 frozen catalog/variant delivery templates and operator workflows for
accepted work, retained passed/failed/unknown observations, exact-version approval,
verified publication, inquiry destination evidence, report evidence and handoff.
Completion requires every applicable check and rejects unresolved operations.
Recurring plans use explicit month keys. These records do not themselves qualify
or execute a live website deployment, advertising launch, restore or inquiry.

Linked fact changes retain one impact list, invalidate affected current work and
cancel queued effects; advertising STOP is requested where an account is bound.
Same-value reconfirmations preserve lineage. Expiry is checked against wall-clock
time at approval, preparation and dispatch, including transactions crossing the
deadline. Report gates require matching work/period and current source imports.
Independent Astra review and fix rechecks found no remaining P0–P2 in this scope.

Validation: 99 local workspace tests pass; four multi-connection PostgreSQL tests
remain CI-only. Five focused delivery tests and three delivery browser journeys
pass. The full browser run passed 38/39; its remaining test selector matched two
different prepared invoices and was scoped to the tested service. All three
targeted catalog journeys then passed, including Safari receipt download.
Build and whitespace checks pass. Earlier CI exposed cross-service report form
selection, a 43px select on Linux and Safari's receipt download; service-linked
selection, 44px sizing and an explicit download attribute resolve these cases.
CI now preserves synthetic browser diagnostics on failure.

Delivery migration applied to staging only. Verified all 38 template rows, denied
anonymous delivery RPCs/customer dispatch/raw evidence access and legacy wrapper
bypass, and retained service-only dispatch access. Production remains unpublished.
