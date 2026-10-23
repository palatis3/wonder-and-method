# Whole-collection quality audit — October 23, 2026

**Recommendation: CORRECTION before releasing the final 611 pages.** Retain the present publication hold until the specific corrections below and the seven full-record reviews are reconciled. The sampled collection contains substantive, independently useful service content; this review does **not** establish a Google spam-policy violation or justify automatically consolidating every county page. It also does not establish that all 1,079 geographic identities need separate indexed pages. Geography is a navigation choice, not proof of editorial necessity.

## Scope and evidence

I read all public fields of **25 complete candidate records**, covering all **20 states plus Washington, DC**, the original service collection and waves one through four, and all three shared-market records. These represent 35 directory identities. This is a purposeful sample, with repeated pottery and cabinetry themes selected for conceptual comparison; it is not a statistical estimate or a substitute for the seven reviewers reading all 1,068 records. The exact sample, individual findings, peer comparisons, source checks, and hashes are in `evidence.json`.

I read the shared renderer and location index, relevant directory, index-policy, schema, page-generation and service-area-guide code; the complete built Buffalo/Erie service page; complete built Baker FL, Morris NJ, Hampton Roads VA, and Lincoln WV service pages; and complete built Services, Web Design, About, and Service-area Pages guide content. I inspected introductions, selected entries, links and endings of the main area hub and Florida, Maryland and Virginia hubs. I did not manually review every geographic directory item or render these pages in a visual browser.

An independent structural scan inspected all 1,068 built candidate pages. All have the expected self-canonical, `index,follow`, one Service node with the expected served areas and common studio provider, and Organization, Person and breadcrumb nodes. It found no LocalBusiness or review/rating nodes in that population. Those facts establish consistency, not content quality, factual completeness, rich-result eligibility, live publication, or Google indexing. The five manifest-pinned source files remained unchanged at the completion check.

## Policy judgment

The current [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies) make low-value, search-directed regional funnels and large-scale unoriginal content relevant concerns. Page count, repeated industries, shared prices, or the use of AI do not alone establish those conditions. A self-contained service page can legitimately end with the same contact route as other pages. The important question here is whether its main content helps a real buyer before that contact step.

[Helpful-content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) supports evaluating original analysis, completeness, demonstrated expertise, purpose and production transparency. The [AI-content guidance](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content) calls for factual and editorial care, including metadata; automation does not replace that care. These are standards for judgment, not a required uniqueness score or word count. [Search Essentials](https://developers.google.com/search/docs/essentials) also makes clear that satisfying requirements cannot promise crawling, indexing or ranking.

The strongest evidence **against a doorway finding** is practical: a visitor can compare a limited edit with a fuller build, prepare owner inputs, understand an acceptance example, see prices and package limits, learn about ownership and future editing, and choose an ordinary inquiry without leaving the page for the usable service explanation. The shared remote-Buffalo statement is prominent. Prices are real offers in the site rather than invented county-specific quotations. The examples are developed into recommendations, not merely copied observations.

The remaining **collection-level risk is moderate**: a complete geographic grid is being used to distribute many narrow sector examples under very broad web-design titles. Some visitors will find their own business; others will encounter several screens of cabinet or pottery advice before the general offer. Much of that advice is portable across counties. Portability is not a policy violation, but it means a citation and a county name cannot by themselves justify the page's purpose. Topic-based access and more honest upfront framing would make the collection more useful to direct visitors and reduce the appearance of geography being the main reason for publishing.

## Required corrections

### 1. P2: Separate website scope from the client's professional work

`src/location-service-pages.mjs:19` places every `scopeTrigger` immediately after the proposed website scopes under “What changes the scope.” Several sampled records then describe engineering, construction or production work as requiring separate scope. In this setting a buyer could read those services as separately purchasable studio work, despite nearby wording assigning technical decisions to the maker.

Use explicit responsibility wording, then name only website functions that may need a separate quote. Proposed replacements for independently read examples:

| Record / field | Suggested replacement |
|---|---|
| Merrimack NH / `scopeTrigger` | “The cabinetmaker and its qualified advisers remain responsible for drawing review, CAD design and production approval. A website project portal or integration with an existing project-management system requires a separate website assessment. The standard site explains how to begin the conversation.” |
| Franklin NC / `scopeTrigger` | “The cabinet business and its qualified specialists remain responsible for cabinet engineering, equipment compliance, CAD drawings and production decisions. Online configuration or production-system connections require a separate website assessment; a useful inquiry can begin with purpose and existing conditions.” |
| Adams OH / `scopeTrigger` | “The cabinetmaker remains responsible for design, measurements and manufacturing approval. Online cabinet configuration, automated estimates or an approval-workflow integration require a separate website assessment. Clear stage descriptions can support an ordinary project inquiry.” |
| Lincoln WV / `scopeTrigger` | “The maker and its qualified specialists remain responsible for furniture design, mechanisms and production drawings. An online configurator requires a separate website assessment. Website content can prepare the existing commission conversation.” |

The same distinction should be applied to the additional affected fields identified by the full-record reviewers. This is a substantive offer-clarity correction, not a new rule against mentioning specialist industries.

### 2. P2: Establish the broad service before the narrow example

`locationServicePages()` currently puts `entry.lead` before the common studio introduction. Many leads immediately discuss a particular trade, although the H1 promises web design for businesses across the area. Keep the truthful geographic H1 and the broad service purpose. Move the broad introduction ahead of the sector lead and visibly label the next block **“Example website brief”**. Before the first named-business discussion, explain that the examples are public observations, not studio projects or clients, and that the proposed website work is adapted to the buyer's actual business.

For Baker County, the intended first-screen sequence could be: broad web-design/repair offer and remote delivery; a prices/process jump; then “Cabinetry example: making a partial room update clear.” A salon or accountant should not have to infer that the studio works beyond cabinetry. The existing disclaimer at the bottom remains useful but arrives too late to do this introductory job.

Make `description` accurately preview the example where it dominates the page. Example: “Web design for Baker County businesses, with prices and a cabinetry website-planning example. Work online with Terry in Buffalo.” This is useful expectation-setting, not a demand to rewrite metadata just to make it lexically different. Keep the general offer visible; do not rename all pages as if the studio serves only the featured industry.

### 3. P2: Reconcile the site's service-area guide with its actual editorial approach

The built `/guides/service-area-pages/`, `src/guide-decisions.mjs:21`, and `src/guide-content.mjs:97` say to use an existing page when the same explanation applies regardless of where the customer lives, and require a distinct question plus local facts for each area page. That is a stricter editorial prescription than the current collection follows. The collection often uses sound but transferable local examples to explain a common remote service. Do not silently treat that prescription as a Google rule, or merely weaken it to excuse any county page.

Suggested short-answer replacement: “Start with a complete service explanation and honest coverage. A separate area page should add useful advice, evidence or service detail for its visitor; changing the place name or citing a local business is not enough.”

Suggested decision-section replacement: “Use an existing service or coverage page when it already answers the visitor's needs. A separate area page can be useful when it provides substantial additional planning help or maintained service information, even when the underlying service and prices are shared. A local example can support that explanation, but its presence alone does not justify another page. Compare the whole page with the existing alternatives, and combine pages that add no useful answer.”

Add a candid paragraph explaining the studio's own use of public local examples and shared remote terms. Preserve the compact-structure option and the warning against low-value duplication. The figure caption, alt text, worksheet and linked brief guidance should stay consistent with the revised decision rule; changing only the visible paragraph would leave contradictory instructions elsewhere.

### 4. P2: Replace the Florida hub's visible `undefined`

The Florida card in built `/areas/` displays the literal word `undefined`. `serviceStateCards()` in `src/service-area-directory.mjs:138` maps every other state to a description but has no Florida entry. Add truthful copy such as: “Browse 67 counties and their cities, towns and communities, including Miami, Tampa, Orlando and Jacksonville.” Verify the generated main hub. This is an ordinary template omission, not evidence of spam.

## Improvements to the collection's architecture and transparency

**P2 editorial recommendation:** supplement geographic browsing with a small task-oriented index of useful examples, using existing guides or a curated section on the area hub. Useful groups include class participation and booking, project quotes and product choices, repair and aftercare, and coverage and arrival. Link the strongest relevant examples by the question they answer, not only by county. Do not generate another large layer of near-duplicate topic pages. Existing guide links within many service pages already help; the missing piece is an obvious way to find this material by need from the broader collection. This recommendation improves direct-visitor value, but is not an independent finding that Google's browseable-hierarchy criterion is absent: the ordinary HTML state/county hierarchy already exists.

**P3 recommendation:** add a short, truthful explanation of how the examples were researched and reviewed, who is accountable for corrections, and how changing source material is maintained. The author identity is already reasonably clear: Terry, the studio, the About page, and the legal entity are visible and match the inspected structured data. Do not invent a human review or claim first-hand client experience. A reviewed date and a cited URL are useful, but do not tell the reader whether automation assisted this unusually large collection. Google does not require a special AI label on every ordinary service page; a sensible collection-level explanation would be enough.

## Conceptual comparisons and consolidation decision

The pottery group has overlapping principles but materially different proposed content. Brown IN concerns a second **making** visit before later shipment. Marshall IN compares instruction with studio membership/access. Hampshire MA prepares a private-group organizer for staff finishing and later collection. Monroe PA distinguishes a one-session experience from a course with later student glazing. A generic “explain what happens after class” paragraph would lose useful differences. These cases do not support a duplication veto.

The cabinetry group overlaps more closely. Baker FL and Cass MI both help a buyer distinguish retained cabinets, new surfaces and combined work; their end-user decisions are near peers. Baker adds different showroom/viewing arrangements and coordination, while Cass focuses on identifying the supplier's contribution in whole-room images. Merrimack NH explains nonstandard fit and matching, Franklin NC the use of the cabinet, Adams OH preliminary versus confirmed measurements, Bedford TN product specifications, and Goochland VA responsibilities among existing project participants. Those are concrete distinctions, although many could also be organized in a strong sector guide.

For **Baker/Cass**, I recommend repair in place now: retain the common broad service, explicitly label the local illustration, and emphasize the actual different deliverable (visit/coordination instructions versus role-specific photo captions). If later editorial review removes those distinctions and leaves the same complete buyer answer, consolidating the reusable lesson into one topic resource would be preferable to adding more paraphrase. I cannot conclude from these complete records that substantive repair is impossible or that either geographic route must be removed.

Baltimore, Fairfax and Hampton Roads already share destinations across multiple identities while preserving separate directory entries. Their content explains how a common service can work across administrative boundaries without inventing branches. This demonstrates that the architecture can consolidate where useful. The Buffalo/Erie page is also worthwhile: its Tonawanda example changes what a customer should provide, and its full service/pricing/process content is sufficient. It explicitly calls the scenario fictional and makes no local-search guarantee.

## Technical and source conclusions

The hubs are genuine, source-linked directories with type distinctions, native expandable sections and ordinary links; they are not merely hidden lists of target towns. The native source disclosures on service pages are accessible content, not evidence of hidden-text abuse. The inspected Service schema describes the studio's visible remote offer and area served; it does not mark cited operators as clients or create local offices. This agrees with the relevance principle in [Google's structured-data guidance](https://developers.google.com/search/docs/appearance/structured-data/sd-policies). No rich-result or ranking claim follows from that consistency.

Twelve business-source pages were independently checked, including the close pottery and cabinetry comparisons. Their checked observations were supported. Eddie Austin's game-table page was unavailable through the web retrieval tool; a direct public HTML request returned HTTP 200 and confirmed the specific material, moving center and side drawers. This was an access-method limitation, not a false or dead-source finding. No booking, form, email or payment was submitted. Other sample citations were not independently reopened by this reviewer and are identified as such in the evidence; their full source assurance belongs to the page reviewers.

The release should proceed only after the correction packet is implemented, affected pages are reread, and the complete audit's factual and redirect findings are resolved. A blanket noindex change, canonicalizing all counties to the main service page, or forcing a unique industry for every county is not supported by this review. Keep an editorial willingness to combine pages when their complete answer is redundant; do not treat full directory coverage as the evidence that every page is useful.
