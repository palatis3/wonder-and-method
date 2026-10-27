# Human quality rubric — October 27, 2026

Use [the machine-readable rubric](research-rubric.json) for every service, area and guide landing URL. Scores are **editorial judgments**, not Google metrics, ranking guarantees, conversion measurements or accessibility certification. The scoring weights, hard caps and acceptance threshold are project decisions. A polished template does not prove that every URL deserves to exist.

## Research basis

Sources accessed October 27, 2026:

- [Google: people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) supports evaluating useful original contribution, adequate answers, evidence and reader satisfaction.
- [Google: spam policies](https://developers.google.com/search/docs/essentials/spam-policies) identifies doorway and scaled-content abuse. Similar geographic pages that function chiefly as intermediaries require serious scrutiny. Neither AI use nor page count alone establishes abuse.
- [Google: AI features](https://developers.google.com/search/docs/appearance/ai-features) says existing SEO foundations apply. There is no special AI file or schema requirement. Eligibility does not guarantee inclusion.
- [W3C: WCAG 2.2](https://www.w3.org/TR/WCAG22/) supplies accessibility criteria, including semantics, alternatives, keyboard operation, focus, contrast, reflow and text spacing. Passing automated tests does not establish full conformance.
- [NN/g: How People Read Online](https://www.nngroup.com/articles/how-people-read-online/) reports its own eyetracking findings on persistent scanning behavior. It supports clear hierarchy and easy information retrieval, not a universal word limit or a promised conversion increase.

## Scoring each URL

Rate each dimension from 0 to 4: **0** missing/misleading/unusable; **1** major weakness; **2** usable with material friction; **3** strong with limited friction; **4** excellent and evidenced. Multiply by weight/4, add, apply the lowest applicable hard cap, then round the total. Retain component ratings and concrete evidence. Unknown evidence means a null rating and null overall score; a labeled content-only subtotal may be shown without normalization.

| Dimension | Weight | What earns a strong score |
| --- | ---: | --- |
| Intent and actionable answer | 15 | Opening explains audience, task and decision; body resolves the promise and material conditions. |
| Distinct usefulness and local relevance | 20 | A specific useful contribution beyond the nearest sibling; local facts actually change a website decision. |
| Evidence, accuracy and scope honesty | 15 | Traceable facts, explicit proposals, honest examples and consistent commercial boundaries. |
| Prose and heading coherence | 15 | Natural paragraphs, meaningful H2/H3 hierarchy, logical progression and little semantic repetition. |
| Glanceable hierarchy and reading burden | 10 | Early answer, useful grouping and visible essential conditions; optional depth remains coherent. |
| Visual explanation, spacing and color | 10 | Verified phone/desktop hierarchy, balanced spacing and purposeful visuals. Text-only can earn full credit. |
| Accessible comprehension and operation | 10 | Relevant automated and manual checks, with limitations recorded. |
| Useful next step and navigation | 5 | Clear working action, truthful expectations and selective relevant links. |

The JSON gives dimension-specific anchors, tests and required evidence fields. Do not award originality for a new place name, heading variation, decorative picture or unrelated local fact. Do not reward brevity that omits conditions. A brief recap is useful; repeating the same plan in a table, cards, FAQ and closing paragraphs is not.

## Hard caps and acceptance

Apply only from documented evidence, with the specific passage, selector or failed task recorded:

| Failure | Maximum score |
| --- | ---: |
| Verified material deception, invented client/result/office or deceptive functionality | 39 |
| Primary task blocked, including serious accessibility failure | 49 |
| No independent task value beyond sibling/hub; generic place-name funnel | 49 |
| Local trivia without a meaningful connection to the offered decision | 59 |
| Repeated malformed or contradictory prose obscures the answer | 59 |
| Same substantial recommendation repeats across three body sections without added decision value; or essential scope is concealed | 69 |
| Important factual/commercial claim lacks support or proposal boundaries | 69 |

90–100 is excellent; 80–89 strong; 70–79 useful with substantive changes; 60–69 weak; below 60 has serious failures. Acceptance targets **80 or more, every dimension at least 2, no cap and no unresolved material defect**. This does not replace release checks or authorize indexing changes.

## Evidence and coverage

Inventory the current build. Review each URL's complete main text, headings, links and expanded content. Compare its closest sibling and explain its independent value in one sentence. Store build/hash, task, component scores, findings, caps, sources, reviewer coverage and unresolved checks. Never describe template sampling as individual editorial review.

Shared layout evidence can carry forward only for unchanged components with explicit coverage. Page-specific text wrapping, length and disclosures still need checks. Include narrow/wide rendering, keyboard and disclosure operation, focus, meaningful alternatives and color/reflow checks. Distinguish inherited evidence from directly inspected evidence. Word count, similarity and reading formulas identify candidates; they cannot establish quality by themselves.

At family level, assess whether many local URLs repeat the same decision with different research decoration. Cosmetic variation cannot fix missing purpose. Flag candidates for consolidation or indexing review without silently changing public routes or indexing policy.

## Calibration and immediate risks

Inspected the current improvement README, bounded old report structure and built HTML main content for `/services/web-design/`, `/guides/ai-search-visibility/` and `/areas/iowa/monona-county/`. This was content calibration, not a new browser or accessibility audit.

The prior report has 15 page summaries and 2,436 ranking entries; inspected local rows have null numeric scores. Do not rescale those historical judgments into a claim of 2,436 individually scored pages.

The service page's notes-to-copy example and explicit editing model are useful strengths. The AI guide provides a practical record and separates fictional examples from results; its platform-specific claims still need current source validation. Monona County honestly labels public research and identifies a useful cabin decision, but repeats minimum-stay and packing guidance across summary, planning table, deliverable details and questions. A collapsed section reduces initial burden but does not resolve repetitive content.

The most important audit risks are generic geographic intent beneath distinctive-looking examples, semantic repetition hidden inside disclosures, overly generous inherited scores, and claiming accessibility or search-policy compliance beyond the evidence inspected.
