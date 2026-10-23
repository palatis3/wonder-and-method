# First48 integration review

Reviewed October 23, 2026 against baseline `2af3623c94977fddf2e7c2b966180587c0125118` in `C:/Wonder and Method/nys-distinct-20261022/site`.

**No actionable technical findings in the inspected staged changes.** The integration is ready for the primary agent's final copy/hash certification and browser-result review. This review did not launch tests or browsers, modify site files, commit or deploy. Existing content findings were not researched again.

## Integration and preservation

- Independently compared the baseline JSON with the current location data: all 73 prior records are exactly preserved; the 48 additions give 121 distinct paths and 131 distinct served identities. The preservation script compares baseline records plus pre-expansion rendered-body hashes; its retained result reports all 73 records and all 73 bodies preserved.
- The fixed 48-path fixture exactly matches the additions. Every addition has two scopes, a four-column/four-row planning tool and an October 23 source-review date. Rendering still uses the unchanged shared offer catalog, Buffalo provider identity, public-example disclosure, ordinary inquiry route and explicit additional-scope boundaries. No production offer, enrollment/recovery, directory authority or guide source was changed.
- The inspected artifact contains 245 public HTML routes, 244 sitemap entries, 59 guides and 333 county worksheets. Download sources were not removed or edited; the retained contract inventory reports 430 downloads. The 1,079 directory-entry preservation assertions remain intact in the passing suite.

## Routes, metadata and analytics

- The redirect diff removes exactly the intended 18 NY/OH/CT historical routes, leaving 265 redirects. The unchanged canonicalizer builds active routes from page dates and keeps New York prefixed aliases pointing directly to restored canonical pages. The updated independent fixture tests retain all 332 historical paths, all 62 New York aliases, raw-query preservation, GET/HEAD behavior and mutation/API boundaries.
- Page-date changes comprise the 48 additions and eight affected state hubs; prior location dates are unchanged. Final content hashes remain the primary agent's responsibility after the small copy replacements. All 48 referenced social PNGs exist at 1200×630. Inspected built pages have the expected canonical/index directives, OG/Twitter image URLs, one Service with the Buffalo studio provider, and no invented LocalBusiness schema.
- Migration `0025_journey_location_wave_one.sql` expands the allowlist from 453 to 483 unique keys: 30 new keys, with the other 18 page identities already historical. All prior keys survive. An independent normalized comparison of the complete CREATE TABLE definitions found no change beyond the temporary table name and page enum. Defaults, allowed event/service/source values, aggregate bounds, composite primary key and WITHOUT ROWID remain identical. The migration copies all aggregates before replacing the table and does not touch inquiry/delivery tables.
- The migration regression test seeds all 453 historical keys at the boundary totals, checks exact row preservation and integrity, rejects invalid dimensions/totals, verifies the source default and duplicate conflict key, and exercises the Worker with all 483 keys while preserving inquiry and resolution records.

## Test changes and evidence

- `current-location-paths.mjs` composes the fixed 59/6/8/48 fixtures; it does not derive expectations from production data. The prior three path fixtures and historical-route fixture are byte-for-byte identical to the baseline. Existing test edits update count/retirement assumptions without removing directory, guide, schema, offer or recovery checks. Migration 0024 now appropriately asserts inclusion in the later runtime set; 0025 asserts exact current equality.
- The new browser spec covers all 48 fixture paths in eight groups of six on desktop and phone, with an explicit reduced-motion skip for these static tables. It checks 200 responses, heading/cell semantics, phone labels, overflow including 320px, expanded source notes, axe results and the exact ordinary inquiry handoff. Static artifact inspection also found all 48 tables have four column headings, four row headings and twelve labeled data cells. Browser execution/results remain with the primary agent.
- Read the primary's `unit-final.log`: **691 passed, 0 failed, 0 skipped**. Read `build-final.log`: **245 production HTML routes built successfully**. Its existing portfolio-screenshot freshness warning concerns unchanged stylesheet evidence, not a defect introduced by this diff. These logs do not replace the final release fingerprint/content-hash check after copy corrections.

No additional implementation changes or broad repeat research are requested by this review.
