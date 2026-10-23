# Content B independent review — 23 October 2026

**PASS: Anderson, Aiken, Dorchester and Berkeley. No required draft corrections or confirmed wider-copy defects.**

Reviewed the complete private drafts and both author reviews against eight same-day primary snapshots, relevant research/geocoding evidence, thirteen complete existing comparator records and the shared renderer. The production corpus remains 1,068 records at `b711713f376d3f180d7d330fbbe20f5c27309d2b`. This worker wrote only this report and `findings.json`; no build, production edit, Semrush call or real form/message was performed.

## Decisions

| Draft | Decision | Exact minimal correction | Description characters |
|---|---|---|---:|
| Anderson | PASS | None | 141 |
| Aiken | PASS | None | 145 |
| Dorchester | PASS | None | 160 |
| Berkeley | PASS | None | 139 |

## Anderson

Portrait timing, fitting shoes/undergarments, physical pinning before the personalized quotation, Anderson-only steaming and the two street addresses match preserved primary content. The bridal page was also retrieved live.

Oakland already explains an earlier collection deadline separately from a wedding/event date, so the two-date idea is not counted as new. Anderson adds a concrete service/location dependency (steaming at Anderson only) and physical fitting preparation, checked together with the date handoff. Belmont concerns alteration captions, Cumberland buying routes and Montour wear-versus-preserve goals. This is enough practical additional help for PASS without requiring a unique industry.

May 2/May 30, retention of both dates and service-aware location guidance are explicitly proposed. The tailor assesses, pins, quotes and confirms readiness. Live calendars and automated quotations remain separate scope.

Full comparators: `michigan/oakland`, `ohio/belmont`, `north-carolina/cumberland`, `pennsylvania/montour`.

Sources: [Staar Tailors: bridal alteration and fitting guidance](https://staartailors.com/pages/bridal-alterations), [Staar Tailors: Anderson and Spartanburg locations](https://staartailors.com/pages/contact-us).

## Aiken

The current appointment/preapproval notice, a contract per saddle, miscellaneous paperwork for offered accessories, two delivery routes and the Hedge Road address match the preserved source and live page.

Moore already separates consignment review from acceptance and maintains item references. Aiken additionally explains item-type-specific paperwork before arrival, with a testable partial-approval example across two saddles and irons. Hopkins separates shared and item-specific instructions but does not cover acceptance/paperwork before intake; Tippecanoe keeps personalized awards attached to destinations rather than approving incoming items.

Preapproval before shipping is proposed preparation, not a claim that the source enforces an electronic shipping gate. The prominent appointment notice is retained despite older walk-in-style wording lower on the source. The store retains eligibility, valuation, contract and acceptance decisions; signing/inventory/accounts/accounting are separate scope.

Full comparators: `north-carolina/moore`, `kentucky/hopkins`, `indiana/tippecanoe`.

Sources: [Aiken Tack Exchange: saddle consignment intake](https://www.aikentackexchange.com/pages/saddle-consignment).

## Dorchester

Fixed celebration designs, individualized custom pricing, different notice periods, taller custom cakes/different portions, no capacity guarantee and the South Cedar address match preserved home/FAQ content. The FAQ was also retrieved live.

Bronx already covers a gallery-based customization conversation, Barry separates display cake and extra guest servings, and Harrison separates listed flavors from novel requests. Dorchester adds the consequence of switching product category: prior portion guidance and notice must be reconsidered together, with capacity still unconfirmed.

The product-switch prompts and acknowledgement are proposed behavior, not an allegation about Swank checkout. Baker-approved portions, ingredients, allergy communication, feasibility and production commitments stay with the baker. Configurators, automated timing/capacity and payments require separate assessment.

Full comparators: `new-york/bronx`, `michigan/barry`, `west-virginia/harrison`.

Sources: [Swank Desserts: celebration orders and custom inquiries](https://www.swankdesserts.com/), [Swank Desserts: cake formats, servings and notice](https://www.swankdesserts.com/charleston-bakery-faq).

## Berkeley

Named pack-to-class coverage, existing sibling enrollment conditions, schedule-dependent age guidance and the College Park address match all three preserved primary snapshots. The live pack URL was inaccessible through the browser retrieval tool; no contradictory content was returned.

Morgan explains a learner prerequisite, Clay separates student/companion stay needs, and Posey separates registration from pottery finishing. Berkeley connects a class-specific paid pack to another participant's already-established enrollment, and checks what purchase confirms before describing sessions. Those are useful dependencies beyond generic registration-versus-confirmation language.

Purchase-to-session behavior is expressly unverified and reserved for checking with the real provider; neither a seat guarantee nor a current checkout defect is asserted. Enrollment verification, balances, expiry, accounts and seats are separate scope. Participation and supervision rules remain with the studio.

Full comparators: `indiana/morgan`, `north-carolina/clay`, `indiana/posey`.

Sources: [Abstract Adventures: class types and participation guidance](https://www.abstractadventuresllc.com/), [Abstract Adventures: class packs and sibling conditions](https://www.abstractadventuresllc.com/pricing-plans/plans-pricing), [Abstract Adventures: studio contact address](https://www.abstractadventuresllc.com/Contact).

## Schema and location evidence

All four records match the initial-four 20-key schema, with two five-field scopes, four-column/four-row planning tables, correctly shaped source objects, empty guide arrays, no legacy worksheet and unique candidate IDs/paths. Descriptions are 141, 145, 160 and 139 characters. The broad service introduction and non-client notice are supplied before named examples by `src/location-service-pages.mjs`; record-level omission would not establish an attribution defect.

Census address results place Staar at county FIPS 45007, Aiken Tack at 45003, Swank at 45035 and Abstract Adventures at 45015. The two Summerville mailing addresses are therefore correctly separated. The Anderson geocoder normalizes the ZIP differently from the business website; the draft does not publish either ZIP, and the street/county match is intact. All eight primary text snapshot hashes match the selected-source manifest.

## Bounded wider review and retained audit

Reviewed pricing/promise excerpts and internal link targets across Pricing, Services, Web Design, Website Audit, Website Care, SEO, Payments, Process and Contact in the frozen `dist`. Their prices, conditional review charges, approval/payment stages, review windows, care exclusions and file handoff terms agree with the current offer catalog and shared location renderer. No confirmed contradiction was found.

The static check resolved 805 internal link instances directly and found no missing fragment. Eighteen initially unresolved extensionless buyer-pack links have their expected `.html` files and established asset routing; these are not broken-link findings. This was not a fresh deployed HTTP sweep.

The current 1,068 records were compared to the earlier audit manifest using its canonical sorted-JSON SHA-256 method: 0 mismatches across 1068 records. The verified `operations/google-quality-audit-20261023` findings and closures remain in force. This bounded review does not repeat or supersede that full audit.

## Hashes and integration boundary

`findings.json` contains raw-byte SHA-256 hashes for every cited draft, author review, snapshot, research/geography input, shared source, sampled built page and earlier audit record. It also pins each complete draft and comparator record with canonical SHA-256.

| Input | SHA-256 |
|---|---|
| `evidence/south-carolina-expansion-20261023/drafts/anderson-aiken.json` | `76b43cff5b865b83bac83531c5194fee5a04f56fe77a97d7bbf92d7d9eb01307` |
| `evidence/south-carolina-expansion-20261023/drafts/dorchester-berkeley.json` | `c7ca3e224341b6c06880798196d4ec490c10643f962224b56fe6717eb4942b8e` |
| `src/location-service-data.json` | `39fb7aa50d73d9971dc57919c478baeaa8d6253a5ed71c12172955f97f010bde` |
| `src/location-service-pages.mjs` | `e01bf5c4b565bd1df4ab431402dfae6cf462c9e4d1004af88d8a562b0f878cac` |

No correction is required to the reviewed draft bytes. Integration, rendered South Carolina routes and final release checks remain with root. The live Berkeley pack URL was inaccessible through the retrieval tool; its same-day preserved source was read and verified, so that retrieval limitation is not treated as proof of a dead or unsupported source.
