# Workspace implementation

The approved Business Plan V2 and technical contract are archived in `blueprint/`.
The implementation branch is `feature/business-workspace-v2`, based on the
published V4 revision `bb562cf`. `origin/main` is an ancestor, not the current
published release. Preserve the existing public release checks.

The public Worker and its inquiry database remain independent. Private work runs
on `app.wonderandmethod.com` in a separate Worker, Supabase project and session
boundary. The canonical price source remains `config/offers.json`; accepted
agreements retain their own immutable snapshots.

## Release evidence

Implementation status and executed evidence are distinct. The blueprint's
`not_run` acceptance cases are historical requirements, not passing tests.
Provider configuration, actual delivery, production access and recovery drills
must be recorded separately from local or simulated tests. No production
publication is permitted before the updated GitHub CI checks and the three
requested independent final reviews pass.

## Provider setup in progress

- GitHub: authenticated repository access verified.
- Cloudflare: existing public infrastructure and protected credential storage.
- Resend and Stripe: existing protected credential storage; workspace-specific
  permissions, inbound domain, webhooks and test/live modes need verification.
- Supabase: the user requested a new production project named **Wonder and
  Method**. Production `qbjfabidetdyjavljnsd` and separate staging
  `lobowejsstuoicjxoqmy` are provisioned. Only staging has workspace migrations.
- Google Cloud: project-based Ads API access, OAuth, GA4 and Search Console
  configuration required. Do not use the retired developer-token onboarding.
- OpenAI API: key saved in ignored local configuration and live Astra smoke
  evaluation passed for all seven helpers. Deployment secrets and final data
  qualification remain pending. Cloudmersive account/20 MB entitlement pending.
- R2: private encrypted backup/receipt destination, independently held recovery
  key, retention administration and offline recovery copy need qualification.

Secrets belong in Worker secrets or protected local storage, never this file,
the Git repository, frontend assets, test evidence or chat output.
