# Production website

Updated October 17, 2026. Origin: https://wonderandmethod.com; `www` redirects to the apex. Worker: `wonder-method-production`. Configuration: `deployment/wrangler.production.jsonc`. Public assets: `dist/` only.

The last recorded live release is the October 16 navigation release `2c4e0fb5-6eed-4677-b96b-8214cfdc48d9`: 49 routes, 37 index-eligible routes and 14 guides. The local audit candidate has 55 routes, 41 index-eligible routes and 17 guides; it still needs deployment and live verification. Consult the dated release evidence rather than an earlier `finished-site` report.

Search indexing is enabled. Preserve `config/site.json` `searchIndexing: true` and Worker `SEARCH_INDEXING: "true"`. The sitemap is generated from `src/index-policy.mjs`; protected operator APIs and private/utility routes keep appropriate noindex/no-store behavior. Noindex is not access control.

## Release sequence

1. Check the exact candidate source, production bindings and build inputs. Keep credentials, account evidence, `evidence/`, `.runtime/` and private outputs outside Git and public assets. Review the sanitized staged inventory and secret-scan results before creating the private backup. Record clean-clone recovery separately; this work is not yet verified complete.
2. Run `npm ci`, `npm run build`, `npm test`, `npm run verify`, then `npm --prefix deployment ci` and `npm --prefix deployment run check`. The upcoming `npm run technical:check` combines technical checks once registered in `package.json`. Keep broader business release gates visible; do not remove them merely to make a deployment command pass.
3. Record a private database export and a compatible known-good Worker version. Inspect applied migrations before applying the candidate schema with the pinned CLI. Migration 0003 adds nullable contact/client/hold and frozen-payload fields; it intentionally does not backfill contact from creation dates. Migration 0004 copies existing aggregate rows into the extended fixed-category table. Verify row preservation and schema state before the candidate uses the new categories. Migration deployment is not yet claimed here.
4. With the authorized release gates satisfied, deploy only the production configuration using the pinned local CLI. From the repository root the commands are:

   ```powershell
   node deployment/node_modules/wrangler/bin/wrangler.js d1 migrations apply wonder-method-production --remote --config deployment/wrangler.production.jsonc
   node deployment/node_modules/wrangler/bin/wrangler.js deploy --config deployment/wrangler.production.jsonc
   ```

5. Record the returned version ID and verify live route/asset parity against that exact build, indexable canonical pages, robots and populated sitemap, private-path exclusions, unauthenticated operator rejection, navigation and responsive form behavior. Use `?qa=1` for browser review; it suppresses measurement but does not sandbox a live form. No real email, production inquiry or deletion is needed for routine QA. The old `scripts/verify-finished-site.mjs` asserts the historical noindex baseline and must not be used as the current indexing-on release verifier.
6. Perform the separately requested Google notification only against the verified current sitemap; record the actual provider result. Update the current release/version and pending-work statements in these runbooks from evidence. A sitemap notification is not proof of indexing, ranking or traffic.

## Inquiry safety and credentials

The Worker persists the inquiry before Resend notification to `support@wonderandmethod.com` on Fastmail. Candidate retries are bounded to five attempts and a 22-hour window; hourly runs select at most 20 eligible rows. `NOTIFICATION_DAILY_LIMIT` defaults to 50 attempts per UTC day, including retries. Raising the cap requires checking actual provider limits and cost authority. The cap and leases do not prove delivery.

Migration 0003 enables an exact frozen notification request body for new first attempts. Existing attempted records retain their legacy format. Sending completion is fenced to the owning attempt/lease so an old request cannot overwrite a newer result. Records outside retry bounds or held by the daily budget require manual review. Do not reset attempts or change a frozen request to force another send. Reconcile the provider and inbox first.

Use the local `inquiries:production` operator described in [HANDOFF.md](../HANDOFF.md). Status/export are private operator reads. Retry can send real email; delete removes an exact active D1 record and protects active sending leases. Follow-up updates require the reference twice plus a private `.runtime/` JSON file. Retention preview is read-only. See [INQUIRY_RETENTION.md](../operations/INQUIRY_RETENTION.md).

Production `OPERATOR_TOKEN` and `FINGERPRINT_SECRET` are stored using Windows DPAPI CurrentUser in `.runtime/credentials/cloudflare-production.dpapi`, read by `deployment/production-credentials.mjs`. Restricted Resend credentials remain private and encrypted. Never print secrets, place them in a URL, or bundle them in `dist/`. These files depend on the Windows account; independent credential recovery remains a separate verification task.

## Recovery

A Worker rollback changes code/assets, not D1 contents or migrations. Check schema compatibility before choosing a version. Never restore an old database over newer inquiries without a deliberate reconciliation. Historical rollback and isolated restore evidence in `evidence/production-recovery.json` is dated and does not prove present-volume, mailbox or lost-device recovery. Protect exports and account for them during retention cleanup. Current source/schema/deployment state and independent backup must each be recorded explicitly.
