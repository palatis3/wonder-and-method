# Permanent SEO publishing checks

Run `npm run build` followed by `npm run check:seo` to inspect every application page in the build manifest. The same check runs inside `npm run verify` and the mandatory technical release check. CI retains `output/seo/report.json` and `output/seo/pages.csv` in the browser-journeys artifact, including on failures. The CSV has one row per page, with its title, measured length, description, canonical and findings. Auxiliary compatibility HTML, HTTP responses and assets remain covered by the existing static, HTML, browser and live release checks.

## Publishing blockers

- Search-eligible page titles must contain at most **70 decoded Unicode characters**, including spaces, punctuation and the brand. This studio standard also applies during a temporary indexing hold. It is not a Google character limit or a promise that Google will display the complete title.
- Every application page needs exactly one nonempty title, meta description and H1, plus main content present in the HTML. Search-eligible titles and descriptions must be unique after whitespace normalization and case folding. One H1 is a studio content convention, not a Google ranking requirement.
- Canonicals must match the absolute production page URL exactly. The 404 page has no canonical. Robots metadata must match the intentional indexing policy; public pages must not add conflicting Googlebot restrictions.
- The sitemap must contain every currently indexable application URL exactly once, with no excluded or unexpected URLs. Split it before exceeding 50,000 URLs or 50 MiB uncompressed. The existing static verification also compares robots.txt and sitemap output with the configured policy and reviewed modification dates.
- Every image must have an alt attribute; decorative images may use empty alt. Human review still determines whether informative alternative text is accurate.
- Any JSON-LD blocks must parse as objects or nonempty arrays. This checks syntax only; it does not fetch remote contexts or certify schema completeness, factual accuracy or rich-result eligibility.

## Editorial review notes

Descriptions outside 60–170 characters, paragraphs over 100 words, sentences over 35 words, links without a directly detectable label, and indexable pages with fewer than two incoming follow links receive review notes. These are studio heuristics, not Google thresholds. Useful detail, qualifications and clear lists must not be removed just to improve a score. The report counts crawlable anchor links and accepts descriptive image alt text as a link label; label quality and references using aria-labelledby still need judgment.

The October 25, 2026 candidate has 12 longer-sentence pages and three pages with a single incoming parent link. These were reviewed in the release's editorial evidence; they retain useful enumerations and appropriate parent links. Future review notes should be assessed in context rather than automatically suppressed or converted to filler links.

## Related release checks and limits

Internal links, local resources, canonical and robots declarations, JSON-LD parsing, content preservation, HTML validation, mobile and desktop browser behavior, accessibility checks, visual comparisons, external links, dependency scanning and Lighthouse measurements remain required. Built JavaScript and CSS are minified with module fingerprints based on emitted bytes. Live release verification checks public HTTP responses, headers, assets and sitemap coverage after deployment.

This gate cannot establish Google's selected canonical, indexing, rankings, field Core Web Vitals, displayed title/snippet, or Semrush scores. Search Console, live crawls and editorial review supply separate evidence. Do not stuff a target keyword or domain into copy merely to satisfy a tool. Sitemap lastmod dates must represent meaningful page changes, not routine builds.

## Google sources checked October 25, 2026

- [Title links](https://developers.google.com/search/docs/appearance/title-link): use descriptive, concise titles; display truncation depends on available width and Google can generate a different title.
- [Snippets and descriptions](https://developers.google.com/search/docs/appearance/snippet): summarize the specific page; descriptions have no fixed Google length limit and may not be used for a particular query.
- [Technical search requirements](https://developers.google.com/search/docs/essentials/technical): crawl access, successful HTTP responses and indexable content are necessary but do not guarantee inclusion.
- [Canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) and [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): keep URL signals consistent and modification dates accurate.
- [Crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) and [image guidance](https://developers.google.com/search/docs/appearance/google-images): use real anchor URLs, useful link text and descriptive image alternatives.
- [Structured data introduction](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) and [quality guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies): supported syntax alone does not establish feature eligibility; markup must accurately represent page content.
