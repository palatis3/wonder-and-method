# Reading surfaces

The owner requested clearer containers and subtle background differences on Work and other pages, with cohesive branding and readable contrast.

## Design

The existing paper background (`#f8f7f2`) remains the base. Sage (`#e3e9dd`) groups choices and examples; warm stone (`#eee5d8`) groups practical details. Cream cards (`#fdfcf8`) distinguish individual projects and offers inside those groups. Process panels use a related green neutral (`#e5ebe4`) instead of the previous blue-gray. Forest green remains the action color.

Work groups have visible boundaries, and each project image and description share a card. Services has three contained groups with lighter examples and option cards. The same treatment covers pricing groups, service details, process stages, About evidence, guide summaries and guide contents. Long article prose stays on the paper surface. Labels, headings, spacing and borders preserve grouping without relying on hue alone.

The palette calculations use the [WCAG contrast method](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Across the five light surfaces, the minimum ratios are 13.93:1 for primary text, 6.07:1 for secondary text, 8.01:1 for forest links and 4.53:1 for the existing clay accent. These are color-pair calculations, not a claim of complete accessibility or measured reading improvement.

## Verification scope

Review Work and the core page families on desktop and phone; check the 320px layout, enlarged text, keyboard controls, guide disclosures, service choices and the design desk. Existing automated accessibility, reading, browser, visual and release checks remain required. Forced-colors uses system surfaces and borders; print removes the surface tints.

One independent Astra reviewer passed the initial CSS and cascade review. Rendered review and final publication evidence will be recorded after the checks complete.

## Release corrections

The full release checks identified two assertions that still expected the previous surface colors. Their three palette constants now match the approved CSS; coverage, test identities and exclusions are unchanged. The link gate also found two retired Farmers Grain Company URLs on the Grant County, Oklahoma page. The corresponding public Bushel-hosted feed and Pond Creek pages return HTTP 200 and retain the cited information. Only those two source links and that page’s reviewed-content date changed; its prose is unchanged. The corrections received independent review.

The Work phone hero now loads a 390×410 crop of the original screenshot instead of the full 390×844 image. Its displayed framing is preserved, and the original remains available for the case study. The 22,366-byte crop replaces a 44,102-byte hero download. Three cold local mobile Lighthouse runs measured a median LCP of 2.341 seconds after the change versus 2.492 seconds before; these are lab observations, with the existing 2.5-second release budget unchanged.
