# Practical content and planning tools — October 20, 2026

The owner authorized implementing and publishing the completed content-gap research. This release adds six substantial guides, a working website ROI scenario calculator, nine practical downloads and original supporting diagrams. It expands the existing guides and SEO service page where a new article would duplicate the same decision. All 278 prior routes remain; the candidate contains 285 HTML routes, 284 index-eligible sitemap entries and 23 guides.

## Research-to-page implementation

| Research opportunity | Implementation |
| --- | --- |
| Website not generating leads; owner-led lead tracking | `/guides/website-not-generating-leads/`: diagnosis from relevant visits through fit, page, inquiry receipt and follow-up; privacy-conscious measurement worksheet |
| Choosing a web designer or agency | `/guides/how-to-choose-a-web-designer/`: shared brief, relevant evidence, scope, cost, ownership and acceptance; provider comparison CSV |
| Website content writing template | `/guides/website-content-template/`: Home, Service, About and Contact prompts, original worked example, approvals and reusable TXT template |
| Website rebuild/redesign timeline | `/guides/website-redesign-timeline/`: ready inputs, dependency owners, review windows, migration and handoff; scheduling CSV |
| One-page website SEO | `/guides/one-page-website-seo/`: customer decisions, one-page versus multi-page tradeoffs, two original page maps, crawlable links and page-plan CSV |
| Website handover/ownership transfer | `/guides/website-handover-checklist/`: technical control versus rights, account and source inventory, licences, recovery, renewals and verification CSV |
| Website redesign SEO checklist | Existing migration guide, `#redesign-seo-checklist`: owner/developer responsibilities, baseline, URL mapping, release and later review |
| Website RFP template | Existing redesign brief, `#rfp`, plus a downloadable RFP template and provider-comparison links |
| SEO provider questions, value and timing | Existing SEO reporting guide, `#provider-questions`, `#worthwhile`, `#timing-and-ai`, plus a provider-question template |
| Contractor local SEO and website examples | Existing contractor checklist, `#annotated-examples` and `#local-seo-workflow`: original clearly labeled examples, the fictional Northline concept and eligibility/coverage workflow |
| Monthly website care checklist | Existing maintenance checklist, `#monthly-record`, plus an editable monthly care log |
| Small-business website and redesign costs | Existing cost-guide URL retained, title broadened, `#redesign-budget` added, transition work and three-state delivery explained |
| Small-business SEO packages and services | Existing `/services/seo/#small-business-seo`: compare actual work, ready inputs, plan limits and useful next decisions |
| Website ROI calculator | `/tools/website-roi-calculator/`: browser-only model, worked example, sensitivity comparison, break-even and simple payback |

The broad high-difficulty terms remain supporting topics, not a reason to create overlapping pages. The original research remains private. No additional Semrush calls were needed for implementation. Public copy does not expose keyword metrics, imply rankings from tiny Search Console samples or promise leads, indexing or revenue.

## Editorial and functional boundaries

Each new guide has at least six substantive sections, about 900–1,100 words before template chrome, a distinct answer, contextual help and related resources. Examples are explicitly illustrative or linked to a labeled studio-owned concept. No invented client work, testimonial, qualification, demand or outcome is introduced. Current package prices, terms, inclusions and the Buffalo-based online service model remain unchanged.

The ROI tool uses additional contribution after direct job costs, not total sales. Its six inputs are one-time cost, extra monthly cost, months, additional qualified inquiries, close percentage and contribution per additional job. It distinguishes undefined zero-cost ROI, no positive monthly surplus, and an unreachable break-even scenario. Inputs accept ordinary decimal notation with at most two decimal places; months must be whole. Bounds prevent non-finite results, including overflow from tiny exponent inputs. The model does not establish causation or account for tax, financing, general overhead, capacity, seasonality or delayed results. It sends no input values and saves none in browser storage. Existing aggregate page-event measurement remains separate.

Without JavaScript, the page retains its worked example and formulas; the interactive form stays hidden. Results require an explicit calculation, stale results disappear after an edit, errors identify and focus the first invalid input, and reset restores the labeled fictional example. No production inquiry is needed to test the calculator.

## Integration and verification

The guide index groups the new pages with the relevant decisions and adds the planning tool. Web design, redesign, audit, care, contractor, process and pricing pages link to relevant resources. The SEO service page links directly to its expanded evaluation guidance. Existing guide bookmarks, downloads and publication gates remain enforced, including links containing fragments. Each new guide has unique metadata, Article dates, related-card assets, an accessible SVG diagram and a social card; the tool uses a WebPage and a Guides breadcrumb.

Independent Astra editorial review covers the complete six-guide copy, expansions and ROI explanation. A separate bounded Astra technical review covers the math, controller, integration, metadata and migration. The extreme-small-number issue found by technical review was corrected with explicit decimal validation and regression cases. Exact reviewed hashes and findings are in the private `content-implementation-20261020` evidence folder.

Tests cover the old route inventory, all six publication gates, downloads, calculator examples and edge cases, no-JavaScript fallback, phone/desktop layouts, accessible labels/focus, automated accessibility checks, absence of calculator network/storage writes and unchanged inquiry records. Automated accessibility results describe the tested rules, not certification of every accessibility need. The standard full-site verifier and production technical checks remain required.

## Release and data preservation

Migration `0015_journey_content_guides.sql` adds only seven aggregate page categories. Event, service and source dimensions, defaults, count bounds and primary key remain unchanged. It copies historical counts unchanged; inquiry and delivery tables are untouched. The immediately previous Ohio Worker remains compatible with the extended schema. Independent migration review checks 407,520 historical aggregate combinations plus inquiry, resolution, rate-control and health fixtures.

Follow the existing production runbook: clean pushed source, complete technical verification, exact-commit CI, fresh private D1 export and compatible prior Worker record, predeploy, migration, publication, live route/asset parity and browser checks. Preserve independent operational recovery and business enrollment gates. Submit the existing Google sitemap only after the public build is verified; record the actual response without claiming indexing or ranking. The private release record establishes the deployment version and completed checks; this source document describes the implementation and required procedure.
