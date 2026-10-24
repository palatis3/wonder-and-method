# Wisconsin and Illinois independent geography review

Completed 2026-10-24T06:49:23.753341+00:00. **PASS. No required corrections or unresolved data concerns at the recorded hashes.** Primary candidate files were compared only after independently parsing the raw sources and streaming both complete GRFC files. No producer code was run.

| Verified current geography | Wisconsin | Illinois |
|---|---:|---:|
| Counties | 72 | 102 |
| Incorporated places | 608: 190 cities, 418 villages | 1,294: 300 cities, 980 villages, 14 towns |
| CDPs | 199 | 167 |
| Active town/township MCDs | 1,242 Towns, all A | 1,426 Townships: 1,411 A, 14 B, 1 C |
| Nonfunctioning precincts | 0 | 261: 224 Precincts, 37 Election precincts |
| Public entities | 2,049 | 3,148 |
| Public county memberships | 2,116 | 3,286 |
| Incorporated county memberships | 671 | 1,427 |
| CDP county memberships | 203 | 172 |
| Excluded fictitious COUSUB records | 683 | 8 |
| GRFC rows fully read | 206,161 | 375,454 |

All 581,615 GRFC rows reconcile to the January 1, 2026 tables: no missing/unknown county, Place or COUSUB identities and no functional-status mismatches. All 17 geography/source-definition manifest files match their recorded bytes and SHA-256. Current TIGER table titles confirm their stated date. The corrected census-geography-definitions.html source and Wisconsin cartographer reference are captured and cited correctly in the candidate.

The independent comparison verifies all 174 counties, 5,197 distinct public entities, 5,402 county memberships, 691 excluded fictitious records and 510 representative selections. The candidate module’s two exported JSON values exactly equal public-geography.json and public-area-inventory.json. Per-county full expected identities, typed membership records, populations and representative candidates are in independent-geography-reconstruction.json.

## Classification and representative safeguards

Wisconsin Town MCDs are not incorporated cities/villages. Illinois has 14 incorporated Towns as well as 1,426 Township MCDs. Preserve full 10-digit MCD GEOIDs and separate 7-digit Place GEOIDs even when names match. The 14 partially consolidated B townships and Cicero’s consolidated C township remain active; their candidate notes accurately reflect the functional-status definitions.

Keep Illinois’s 261 status-N precincts in the separate administrative subdivision collection. They are nonfunctioning legal entities, not municipal governments and not status-S statistical CDPs. Exclude all 691 status-F COUSUB records: Wisconsin has 671 city/village equivalents plus 12 undefined records; Illinois has six city/village equivalents plus two undefined records. Every excluded city/village equivalent still has its genuine incorporated Place represented. Illinois’s equivalents cover Chicago in Cook/DuPage, Evanston, Godfrey, West Peoria and Belleville.

All 2,098 incorporated county memberships have exact SUMLEV 157 population joins, and all 2,668 active MCDs have exact SUMLEV 061 joins. CDP and nonfunctioning-precinct estimates remain null. The 17 Wisconsin and 30 Illinois zero-population county parts retain their geography. Missing future estimates must remain unavailable; never substitute whole-place SUMLEV 162 population, drop a membership or infer absent demand. Illinois PRIMGEO_FLAG 0 does not mean an inactive township.

**Both Florence and Menominee need active-Town fallbacks.** Florence County has no incorporated places, eight active Towns and two CDPs; the candidate correctly selects Florence Town (2,193), Aurora Town (1,020) and Commonwealth Town (407), using SUMLEV 061. Menominee County has no incorporated places, one active Town and five CDPs; Menominee Town, GEOID 5507850975, population 4,199, is the valid typed fallback. Middle Village CDP remains in both Menominee and Shawano counties. Keshena remains a CDP, not an invented municipality.

Wisconsin Dells retains four county memberships. Illinois Aurora, Barrington Hills and Centralia each retain four. The candidate’s representative rankings use county-part populations, not their larger whole-place estimates. Available population values are not added across overlapping Town/Place geography.

## Source interpretation and limitations

The Illinois Census geography guide is a 2010-era document: its historical totals must not replace the 2026 tables. The Census functional-status table distinguishes active A/B/C governments, fictitious F hierarchy records, nonfunctioning N legal entities and statistical S entities. The state cartographer source clarifies Wisconsin Town/MCD terminology. This is offline geography and candidate-data review, not rendered integration, source freshness beyond the recorded retrievals, local-government legal advice or commercial-page approval.

## Exact candidate hashes

| File | SHA-256 |
|---|---|
| candidate-wi-il-geography.mjs | f08a61f526cf1c4daf7c6041f7087d1eccdb3b24b1eef82e2c0c872c5a45786b |
| public-geography.json | 60b4852288571eafa23006737d492aac6dc322022c64fa7e66f3ec2fc65432c9 |
| public-area-inventory.json | 0577b182b9c5939aad713f6e710a6d916d462e7fc7c1b29fa4cf5d96027f81a8 |
| place-inventory.json | a3a26309a91b3ccfae0eae9aa94ec3f916da04777bb1f70999d87da039df51e6 |
| excluded-subdivisions.json | 9fff67921dd061f9edf9bc0c4f86c0b5e544b487dcaa8ef7a32b95e4d3ad7e1a |
| public-representative-places.json | 99f6ab856606d8770b99b8edb8522b0ebb5ff0ff68e57530520233aef763bfe6 |
| source-manifest.json | de3848c3ce1820e9d6f51423490224683d4ea1280a491cf65b287adb20696e1b |
