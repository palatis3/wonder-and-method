# Website journey counts

Actual buyer progress is recorded separately in the [private lead pipeline](LEAD_PIPELINE.md): received, qualified, proposal, won or lost. Use `npm run leads -- report` for current-stage counts by service and stated source. This is a separate view from anonymous website activity; it does not join people to page events or create a visitor conversion rate.

Updated October 18, 2026. These are aggregate event counts, not unique people, linked funnels, conversion rates, leads or proof of demand. Reloads/bots can add events; privacy preferences, blocked JavaScript and failed requests can remove them. Compare like date ranges and fixed categories.

## Read privately

The deployed summary endpoint supports:

```powershell
npm run inquiries:production -- measurement
npm run inquiries:production -- measurement 30
```

The default is seven UTC dates including today; accepted values are integers 1–90. The local operator reads DPAPI credentials and calls the authenticated `/api/operator/journey-summary?days=N` endpoint. Do not paste tokens into browser URLs, screenshots or reports. The older authenticated `/api/operator/journey-counts` endpoint returns at most 5,000 raw aggregate rows; reaching that limit can mean truncation. Use aggregate reporting, not an inquiry export, to measure site activity.

The October 17 release and verified migration `0004_journey_categories.sql` extend fixed page categories while preserving existing count rows. New categories distinguish guide/index, individual service types, areas and the work demo. Migration count preservation and read-only operator access are recorded in the audit evidence. Earlier broad-category history cannot be retroactively split into the new categories.

## Events and privacy

Allowed events are `page_view`, `offer_select`, `question_select`, `contact_select`, `request_start`, `question_start`, `inquiry_saved` `question_saved`, `email_click` and `chat_open`. Email clicks and chat-open requests are contact intent only, not delivered messages or conversations. Their counts contain no address, message or chat content. Migration `0006_journey_contact_events.sql` preserves earlier rows and adds these two fixed events. Selections are link actions; starts are form interactions; saved events require a real saved confirmation. Repeated service events are deduplicated only within the current page instance, not across people or sessions.

The browser sends an allowed event, listed service choice and fixed page key and coarse source category to the same-origin Worker. D1 stores UTC day and total with those categories. Count rows contain no name, email, message, full URL, query, referrer, raw IP, visitor ID or session ID. No analytics cookies, visitor identifiers or external analytics library are used. The explicit owner opt-out stores only wm.measurement-disabled=1 in localStorage. The network still processes connection information; separate keyed rate-limit records expire after 20 minutes and hourly cleanup removes them. They are not joined to count rows.

Global Privacy Control and Do Not Track suppress collection. `?qa=1` suppresses review traffic and follows same-site links. `?qa=persist` also saves an owner opt-out on this browser; `?qa=resume` removes it, with counting resuming on the next page. Obvious crawler, headless-browser and audit User-Agents are ignored; this is not complete bot detection. It does not make the live inquiry form a sandbox. Local previews and synthetic confirmations do not count; use invented details locally and stop before live submissions during QA.

Hourly cleanup retains the latest 90 UTC calendar dates including today, even when new collection is disabled. Provider infrastructure/recovery copies have separate lifetimes. For the public description see `config/site.json` privacy analytics; implementation tests are not a legal certification.

## Disable or restore

To pause collection through the normal authorized release workflow, set site analytics to null and Worker `JOURNEY_COUNTS` to `off`, then build, verify and deploy. Keep the table and scheduled expiry. Re-enable only with the reviewed configuration and accurate notice. This analytics setting is separate from search indexing, which stays enabled.

The private five-person usability kit under `evidence/preindex-improvements-20261016/` remains a research aid. Do not claim human sessions, recruitment or statistical validation without actual observations and permission.

## Page and source reporting

Migration `0007_journey_sources.sql` preserves every historical row with source `not_recorded`. New events use a fixed key for each published route; old broad keys remain valid for cached pages. Checkout page views include the selected package. Adding a route requires updating the migration CHECK allowlist as well as the generated route inventory.

The browser maps a campaign source or referrer host locally to direct, google, bing, ai_assistant, social, referral, campaign or internal. Only that category is sent, only on page views. Other events use not_recorded. This describes each page arrival, not the first visit or a person's original acquisition source. Raw referrers, campaign values and query strings never enter counts. Google country domains may be reported as referral. The CLI compares the requested current period with the preceding period and prints page totals; the API also returns daily totals and coarse source totals. History lasts 90 UTC dates, so previous-period comparisons become incomplete for windows over 45 days. No long-term Search Console history or lead conversion rate is inferred.

## Comparison coverage (October 18 correction)

The API still accepts 1–90 days for current totals. It returns UTC retained-start, through-date, prior-period boundaries and `previousAvailable` coverage metadata. For requests longer than 45 days, an equal previous period does not fit the 90-day retention window: the CLI shows `N/A` for Previous and Change and a warning. It never counts expired history as zero. A response without coverage metadata is also non-comparable. Coverage only describes the retention window; it does not prove uninterrupted collection, dates before collection began or complete activity for the current UTC day. No retention policy or production event data changed.


## October 19 clarity release

Migration `0008_journey_resource_intent.sql` preserves earlier aggregate rows and adds the Services overview, `resource_select`, five fixed goal events, and `search` for other search engines. Resource selection records a link click, not a completed download. Goal clicks are aggregate intent only and are not joined to identified inquiries. ChatGPT campaign variants and Google-app arrivals map to the reviewed coarse categories; no raw source values are stored. The operator report now includes source and offer-interest tables alongside page arrivals. The all-page regression checks every emitted page key against the migrated database constraints.

The retired `/siteaudit-NTlhNWVhZD.txt` verification file is no longer copied into published output; its owning external account could not be established. Its source history remains recoverable. `/version.json` remains intentionally public: its commit/source fingerprints bind production to the tested artifact and contain no credentials or inquiry data. `routes` counts generated HTML page routes, not every asset or indexed URL.

Independent heartbeat alert delivery, Bing account verification, mail-policy enforcement and optional external CSP reporting require their own account evidence. Local code checks do not establish those integrations.
