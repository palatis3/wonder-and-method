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
