# Statewide New York coverage — October 20, 2026

This expansion adds the remaining 37 county guides to the previous 25, covering all 62 New York counties. The directory uses ten familiar regional groups, complete crawlable links and an optional local search by county, municipality, borough or region. Search text stays in the browser. All guides remain accessible without JavaScript.

Each new guide contains two original planning examples, a distinct buyer decision and downloadable worksheet, sourced geography, two local questions and three Semrush-informed FAQ adaptations, plus the shared explanation of online delivery. The scenarios are explicitly illustrative. They are not client results, local-demand studies or claims of additional offices. Work is delivered online from Buffalo.

## Research and editorial decisions

The connected Semrush US database checked 366 service and supporting phrases and returned 67 rows. Seven question reports returned 113 rows, including 61 rows retained from the earlier research on the same date. They cover web design, redesign, local SEO, maintenance, small-business website cost and provider selection. Missing rows remain unavailable; they are not converted to zero demand. Reported US search estimates are not assigned to county residents or to editorial adaptations of the original questions.

A deeper related-keyword pass returned 22 rows. Two service-relevant phrases were assigned to existing county guides: “local seo glens falls” to Warren and “search engine optimization horseheads ny” to Chemung. Unrelated webcam searches, competitor brands and broader marketing-agency claims were excluded. Semrush returned no related-keyword data for “Ithaca web design”; that gap remains explicit and was not filled with estimates from another source. Broader service topics such as redesign, care, migration, ownership and planning map to existing service/advice pages linked from the county content.

The content follows the principles in Google's [helpful content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) and [spam policies](https://developers.google.com/search/docs/essentials/spam-policies): original visitor value, clear sourcing, truthful delivery and useful internal navigation. Each guide addresses a different business decision. Keyword variants are consolidated into the relevant county guide, rather than generating repetitive pages for each city or phrase. This is an editorial assessment, not Google certification or a ranking guarantee.

The private `statewide-expansion-20261020` folder contains raw Semrush responses, the keyword-to-page map, source records and the content research. The HTML map explains the numbers and lists all 111 new researched FAQ answers. Prices in the answers come from the existing offer configuration, including the distinction between standalone care and care included in SEO plans.

## Geography and discovery

Municipality data for the new guides and the Erie search entry comes from New York's [March 2026 Civil Boundaries release](https://nysgeohub.ny.gov/arcgis/rest/services/Boundaries/NYS_Civil_Boundaries/FeatureServer). City, town and village types remain distinct. Shared villages are included in each applicable county; examples include Saranac Lake, Gowanda, Earlville, Attica and Rushville. Speculator is Hamilton County's village, the City of Oneida belongs to Madison County, and the Village of Dansville is distinguished from the Town of Dansville in Steuben.

Existing geography retains its individually reviewed sources. A comparison against the newer GIS data found only spelling conventions for DeWitt/LaGrange and the documented Tuxedo consolidation exception in the existing Orange guide. NYC guides retain selected neighborhoods, without inventing separate incorporated municipalities.

All service pages link to the complete regional directory. County pages link to related guides in their region. Shared place searches return every relevant county, and “Saint Lawrence” and “St. Lawrence” both work. This directory groups guides for browsing; the groups are not delivery boundaries.

## Verification and release

The build contains 120 HTML routes, of which 119 public routes are index-eligible and included in the sitemap. The error page, operational endpoints and private records retain their existing exclusions and access controls.

Identical county-page CSS hints share one `/areas/*` header rule, keeping the generated file within Cloudflare's 100-rule limit. The build checks both the rule count and the 2,000-character line limit. Every public page's preload hints are checked against its actual versioned stylesheets locally and after deployment; error, private and payment responses discard inherited hints.

Migration `0012_journey_statewide_counties.sql` adds only the 37 new aggregate page keys. It preserves all columns, other allowed dimensions, defaults, conflict keys and count bounds. Inquiry and delivery-resolution tables are unchanged. The previously deployed Worker is compatible with this expanded schema.

Before migration, export the database privately and record the authenticated Worker version. Apply the migration using the pinned production configuration, export again, then verify existing inquiry rows, aggregate dimensions and foreign keys. Normal traffic may increase counts between snapshots. Follow the existing production runbook: clean pushed source, exact-source technical checks, successful CI, predeploy, deployment, live route/asset verification and responsive browser checks.

The final private release record records actual results, the deployed version, independent Astra review, local and live checks, and the Google Search Console submission outcome. Sitemap submission is not confirmation that every page is indexed. Routine browser QA blocks production APIs and does not submit inquiries or send email.
