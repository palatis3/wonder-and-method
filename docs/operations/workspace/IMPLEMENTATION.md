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
  qualification remain pending. Malware scanning is deferred by the owner for the invitation-only phase; no scanner subscription is required for this phase.
- R2: private encrypted backup/receipt destination, independently held recovery
  key, retention administration and offline recovery copy need qualification.

Secrets belong in Worker secrets or protected local storage, never this file,
the Git repository, frontend assets, test evidence or chat output.

## Approved upload policy change (2026-10-30)

The owner explicitly chose private uploads without malware scanning while the
workspace is invitation-only. This supersedes the scanner launch prerequisite in
the archived blueprint. `FILE_POLICY=invite_only_unscanned` saves validated bytes
privately and records the distinct `unscanned` state. The interface labels it,
downloads force attachment disposition, and no file content is fed automatically
into AI, document conversion, or inline previews. Type/size/archive limits,
checksums and current tenant/parent authorization remain enforced. These checks
are not malware detection. No Cloudmersive purchase was authorized or made.

For later scanning, set `FILE_POLICY=scan_required`, configure a qualified scanner
key and enable `SCANNING_ENABLED`. Missing/unknown policy defaults to requiring a
scanner. Existing unscanned files retain their honest status; enabling the switch
does not claim they were retroactively scanned. Re-upload them for scanning if
needed. Both modes retain the independent control and job receipts.
