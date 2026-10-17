# Production website

Updated October 17, 2026. Origin: https://wonderandmethod.com; `www` redirects to the apex. Worker: `wonder-method-production`. Configuration: `deployment/wrangler.production.jsonc`. Public assets: `dist/` only.

The current live release is the October 17 Gmail inquiry routing release `c4d0dcf2-8fa0-466d-b5e2-926b00a379e0`: 55 routes, 41 index-eligible routes and 17 guides. Current notification and route/asset evidence is under `evidence/gmail-routing-20261017/`; prior schema and provider evidence remains under `evidence/claude-audit-20261017/`.

Search indexing is enabled. Preserve `config/site.json` `searchIndexing: true` and Worker `SEARCH_INDEXING: "true"`. The sitemap is generated from `src/index-policy.mjs`; protected operator APIs and private/utility routes keep appropriate noindex/no-store behavior. Noindex is not access control.

## Release sequence

1. Check the exact candidate source, production bindings and build inputs. Keep credentials, account evidence, `evidence/`, `.runtime/` and private outputs outside Git and public assets. Review the sanitized staged inventory and secret-scan results before creating the private backup. Record recovery evidence separately. The audit release passed a clean staged-source checkout rebuild and private GitHub CI; independent lost-device credential recovery is still separate.
2. Run `npm ci`, `npm run build`, `npm test`, `npm run verify`, then `npm --prefix deployment ci` and `npm --prefix deployment run check`. `npm run technical:check` combines the build, tests, verifier and production dry run. Keep broader business release gates visible; do not remove them merely to make a deployment command pass.
3. Record a private database export and a compatible known-good Worker version. Inspect applied migrations before applying the candidate schema with the pinned CLI. Migration 0003 adds nullable contact/client/hold and frozen-payload fields; it intentionally does not backfill contact from creation dates. Migration 0004 copies existing aggregate rows into the extended fixed-category table. Verify row preservation and schema state before the candidate uses the new categories. Both migrations were applied October 17; count preservation is recorded in `migration-verification.json`.
4. With the authorized release gates satisfied, deploy only the production configuration using the pinned local CLI. From the repository root the commands are:

   ```powershell
   node deployment/node_modules/wrangler/bin/wrangler.js d1 migrations apply wonder-method-production --remote --config deployment/wrangler.production.jsonc
   node deployment/node_modules/wrangler/bin/wrangler.js deploy --config deployment/wrangler.production.jsonc
   ```

5. Record the returned version ID and verify live route/asset parity against that exact build, indexable canonical pages, robots and populated sitemap, private-path exclusions, unauthenticated operator rejection, navigation and responsive form behavior. Use `?qa=1` for browser review; it suppresses measurement but does not sandbox a live form. No real email, production inquiry or deletion is needed for routine QA. Run `node scripts/verify-finished-site.mjs VERSION_ID` for the current index-aware exact route/asset verification. Older `finished-site` evidence remains historical.
6. Perform the separately requested Google notification only against the verified current sitemap; record the actual provider result. Update the current release/version and pending-work statements in these runbooks from evidence. A sitemap notification is not proof of indexing, ranking or traffic.

## Inquiry safety and credentials

The Worker persists the inquiry before Resend notification to the owner's `palatis3@gmail.com` inbox, as requested October 17. Public contact remains `support@wonderandmethod.com`. This applies to new notifications; existing attempted sends retain their frozen recipient for retry consistency. The owner chose to leave Fastmail support mail and tawk.to notifications unchanged after Fastmail rejected forwarding on its trial plan. No forwarding rule was saved. Candidate retries are bounded to five attempts and a 22-hour window; hourly runs select at most 20 eligible rows. `NOTIFICATION_DAILY_LIMIT` defaults to 50 attempts per UTC day, including retries. Raising the cap requires checking actual provider limits and cost authority. The cap and leases do not prove delivery.

Migration 0003 enables an exact frozen notification request body for new first attempts. Existing attempted records retain their legacy format. Sending completion is fenced to the owning attempt/lease so an old request cannot overwrite a newer result. Records outside retry bounds or held by the daily budget require manual review. Do not reset attempts or change a frozen request to force another send. Reconcile the provider and inbox first.

Use the local `inquiries:production` operator described in [HANDOFF.md](../HANDOFF.md). Status/export are private operator reads. Retry can send real email; delete removes an exact active D1 record and protects active sending leases. Follow-up updates require the reference twice plus a private `.runtime/` JSON file. Retention preview is read-only. See [INQUIRY_RETENTION.md](../operations/INQUIRY_RETENTION.md).

Production `OPERATOR_TOKEN` and `FINGERPRINT_SECRET` are stored using Windows DPAPI CurrentUser in `.runtime/credentials/cloudflare-production.dpapi`, read by `deployment/production-credentials.mjs`. Restricted Resend credentials remain private and encrypted. Never print secrets, place them in a URL, or bundle them in `dist/`. These files depend on the Windows account; independent credential recovery remains a separate verification task.

## Recovery

A Worker rollback changes code/assets, not D1 contents or migrations. Check schema compatibility before choosing a version. Never restore an old database over newer inquiries without a deliberate reconciliation. Historical rollback and isolated restore evidence in `evidence/production-recovery.json` is dated and does not prove present-volume, mailbox or lost-device recovery. Protect exports and account for them during retention cleanup. Current source/schema/deployment state and independent backup must each be recorded explicitly.

Homepage SEO and menu update: `evidence/seo-positioning-20261017/` records the published headline, SEO emphasis, regional links and single mobile header CTA. The earlier Claude reassessment remains a dated audit snapshot.
