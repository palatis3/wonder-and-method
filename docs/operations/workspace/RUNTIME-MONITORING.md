# Independent scheduled monitoring

The scheduler runs every configured stage even when another stage fails. Its
completion monitor runs last and reports three independently configured checks:
workspace completion, dispatch/receipt health, and tenant backup health. A missed
cron invocation cannot send a success ping; the external monitoring service must
alert on that missing signal. `/health` only establishes HTTP availability.

`MONITORING_ENABLED=true` requires the secret `WORKSPACE_MONITORS` JSON object:
`workspace`, `dispatch` and `backups`, each with an existing distinct
`https://hc-ping.com/<check UUID>` URL, `owner_reference` and `cover_reference`.
These are references to real configured responders, not invented assignments.
Configure each check's one-minute period, appropriate grace window and actual
notification destinations in the independent account. Test missing-cron,
database-unavailable, notification failure and overdue-backup alerts, including
acknowledgment and cover takeover, before release. Do not reuse the public site's
existing check URL for these three independently meaningful signals.

Only fixed class/category codes leave the Worker. No tenant IDs, names, provider
accounts, addresses, SQL errors or secret ping URLs are copied into ping bodies
or returned status. The monitor validates exact HTTPS UUID endpoints, refuses
redirects and bounds response bodies. HTTP 200 alone is insufficient: the body
must be `OK`; unknown/rate-limited check responses cannot establish acknowledgment.
One failed ping does not suppress the other two. Configuration/acknowledgment
failure fails the scheduled invocation.

The service-role-only `wm_runtime_health` RPC returns nine integer aggregates.
It flags queued effects older than 15 minutes, unresolved attempts older than ten
minutes, unresolved stops older than one minute, receipt conflicts/pending
durability older than 15 minutes, failed standing backup authority, failed latest
scheduled backup and completed backup age over 24 hours. These are alert thresholds,
not claims of instantaneous provider STOP or a demonstrated recovery objective.
Missing/disabled dispatch stages or no enabled backup schedule prevent a healthy
overall signal. Individual customer record detail stays in the authenticated studio.

The retained key/custody checks and actual restore drills remain separate from
successful backup pings. An external monitoring account, delivered alerts and
account-loss reachability are still unqualified. No live ping or notification was
sent while implementing this module. Five focused local tests cover actual SQL
grants/aggregates, error isolation, private ping content and acknowledgment handling.

Provider contract checked 2026-10-31: [Healthchecks Pinging API](https://healthchecks.io/docs/http_api/).

Immediate processing failures are actionable before age thresholds elapse:
failed receipt counts, nested attention/unknown states and failed secondary status
recording cannot produce healthy signals. Required backup-stage presence is
checked explicitly. Configure external notifications for meaningful state changes
and required responder action, rather than per-minute unchanged-status messages.
The reviewed migration is applied to empty staging; real endpoints/delivered alerts
and independent account-loss reachability remain unqualified.
