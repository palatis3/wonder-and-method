# Website journey counts

Updated October 17, 2026. These are aggregate event counts, not unique people, linked funnels, conversion rates, leads or proof of demand. Reloads/bots can add events; privacy preferences, blocked JavaScript and failed requests can remove them. Compare like date ranges and fixed categories.

## Read privately

The deployed summary endpoint supports:

```powershell
npm run inquiries:production -- measurement
npm run inquiries:production -- measurement 30
```

The default is seven UTC dates including today; accepted values are integers 1–90. The local operator reads DPAPI credentials and calls the authenticated `/api/operator/journey-summary?days=N` endpoint. Do not paste tokens into browser URLs, screenshots or reports. The older authenticated `/api/operator/journey-counts` endpoint returns at most 5,000 raw aggregate rows; reaching that limit can mean truncation. Use aggregate reporting, not an inquiry export, to measure site activity.

The October 17 release and verified migration `0004_journey_categories.sql` extend fixed page categories while preserving existing count rows. New categories distinguish guide/index, individual service types, areas and the work demo. Migration count preservation and read-only operator access are recorded in the audit evidence. Earlier broad-category history cannot be retroactively split into the new categories.

## Events and privacy

Allowed events are `page_view`, `offer_select`, `question_select`, `contact_select`, `request_start`, `question_start`, `inquiry_saved` and `question_saved`. Selections are link actions; starts are form interactions; saved events require a real saved confirmation. Repeated service events are deduplicated only within the current page instance, not across people or sessions.

The browser sends an allowed event, listed service choice and fixed broad page category to the same-origin Worker. D1 stores UTC day and total with those categories. Count rows contain no name, email, message, full URL, query, referrer, raw IP, visitor ID or session ID. No analytics cookies, browser storage or external analytics library are used. The network still processes connection information; separate keyed rate-limit records expire after 20 minutes and hourly cleanup removes them. They are not joined to count rows.

Global Privacy Control and Do Not Track suppress collection. `?qa=1` suppresses review traffic and follows same-site links. It does not make the live inquiry form a sandbox. Local previews and synthetic confirmations do not count; use invented details locally and stop before live submissions during QA.

Hourly cleanup retains the latest 90 UTC calendar dates including today, even when new collection is disabled. Provider infrastructure/recovery copies have separate lifetimes. For the public description see `config/site.json` privacy analytics; implementation tests are not a legal certification.

## Disable or restore

To pause collection through the normal authorized release workflow, set site analytics to null and Worker `JOURNEY_COUNTS` to `off`, then build, verify and deploy. Keep the table and scheduled expiry. Re-enable only with the reviewed configuration and accurate notice. This analytics setting is separate from search indexing, which stays enabled.

The private five-person usability kit under `evidence/preindex-improvements-20261016/` remains a research aid. Do not claim human sessions, recruitment or statistical validation without actual observations and permission.
