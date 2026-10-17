# Brand and mobile quality standard

Wonder and Method should feel distinctive, clear and carefully made on a phone. The following system supports that intent; buyer response must be observed.

## Decision

Use the **Wonder / Method Ink** palette: a deep blue-black ink, warm paper, one clay accent, and two dark chromatic link accents. Pair **Fraunces** for occasional display emphasis with **IBM Plex Sans** for body, navigation, pricing, and UI. The combination gives the name room for a little surprise while keeping reading, hierarchy, scope, and proof exact. The visual system should feel edited rather than ornamental: one expressive move per section, generous space, crisp rules, and copy that names its limits.

Do not present blue as inherently trustworthy or any color as a guaranteed conversion device. Elliot and Maier’s review says color effects have boundary conditions and limited real-world generalizability ([Annual Review of Psychology, 2014](https://doi.org/10.1146/annurev-psych-010213-115035), checked 2026-10-13). Palmer and Schloss’ ecological-valence account links preference to responses to color-associated objects rather than a universal color dictionary ([PNAS, 2010](https://doi.org/10.1073/pnas.0906172107), checked 2026-10-13). Labrecque and Milne found hue, saturation, and value can map to brand-personality dimensions in their studies, but that is evidence for a testable direction, not a promise about this audience ([JAMS, 2012](https://doi.org/10.1007/s11747-010-0245-y), checked 2026-10-13).

## Evidence translated into design rules

Perceived quality is helped by a coherent, easy-to-parse composition. Reber, Schwarz, and Winkielman’s processing-fluency review connects ease of processing with aesthetic pleasure, while acknowledging that repetition, symmetry, figure-ground contrast, and prototypicality operate through a broader perceptual process ([PSPR, 2004](https://journals.sagepub.com/doi/abs/10.1207/s15327957pspr0804_3), checked 2026-10-13). In a website study, Tuch and colleagues found that visual complexity and prototypicality influenced first-impression ratings in exposures as short as 17–50 ms; lower complexity and higher prototypicality were rated more appealing in that study ([IJHCS, 2012](https://www.sciencedirect.com/science/article/pii/S1071581912001127), checked 2026-10-13). This supports a restrained shell around one memorable device; it does not establish that a particular layout will sell.

Hall and Hanna found that higher text/background contrast generally improved readability in their web-page experiment, while aesthetic ratings related to purchase intention in the tested pages ([Behaviour & Information Technology, 2004](https://doi.org/10.1080/01449290410001669932), checked 2026-10-13). Treat this as a reason to protect contrast and legibility, not as a conversion statistic. Ling and van Schaik found little task-performance effect from font choice in their experiments, while line length affected scanning and subjective outcomes ([IJHCS, 2006](https://doi.org/10.1016/j.ijhcs.2005.08.015), checked 2026-10-13). Therefore choose type by role, coverage, rendering, and licensing; constrain prose width rather than claiming that one typeface is universally best.

WCAG 2.2 sets a **4.5:1** minimum contrast ratio for normal text and **3:1** for large text at Level AA ([W3C 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), checked 2026-10-13). Meaningful controls, states, and graphics need **3:1** against adjacent colors ([W3C 1.4.11](https://www.w3.org/WAI/WCAG22/understanding/non-text-contrast.html), checked 2026-10-13). Color cannot be the only cue for meaning ([W3C 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), checked 2026-10-13). These are the acceptance thresholds for this system; the tokens file records actual pairs and calculated ratios.

WCAG 2.2’s mobile-relevant reflow criterion requires vertical content to work at the equivalent of 320 CSS px without losing information or functionality or requiring two-dimensional scrolling, with explicit exceptions for content whose meaning needs two dimensions ([W3C mobile guidance](https://www.w3.org/TR/wcag2mobile-22/), checked 2026-10-13). A 24 × 24 CSS px target is the AA minimum with spacing/equivalent exceptions ([W3C 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), checked 2026-10-13). This product should target **48 × 48 CSS px hit areas** for primary controls because web.dev and Material guidance recommend that size for touch usability ([web.dev form design](https://web.dev/learn/forms/design-basics?authuser=2&hl=en), [Material touch targets](https://m1.material.io/layout/metrics-keylines.html), checked 2026-10-13). The 48 px target is a product quality target, not a claim that WCAG requires 48 px.

## Palette and attention system

The recommended semantic roles are: `paper` for reading surfaces, `ink` for copy and primary actions, `clay` for a small expressive interruption, `ultramarine` for links and selected navigation, `orchid` for an occasional secondary link or editorial mark, and `moss` for positive/status support. Clay, orchid, and moss are not the only way to communicate status; labels, icons, shape, and text must carry meaning too.

Three restrained directions are retained for review:

| Direction | Core colors | Best reading | Risk and guardrail |
| --- | --- | --- | --- |
| **Wonder / Method Ink (recommended)** | Ink `#152432`, paper `#F8F3EA`, clay `#CB7752`, ultramarine `#3C5B98`, orchid `#6D4E74`, moss `#426A5A` | Expressive detail held inside a precise editorial frame | Clay is an accent/fill; do not use it as small text on paper. Keep primary text/actions ink on paper or paper on ink. |
| **Carbon / Field Note** | Carbon `#111820`, parchment `#F3EFE8`, burgundy `#7B2E3A`, field `#6E806C`, brass `#B08542` | More archival, grounded, and quietly tactile | Brass and field are supporting accents; validate their use against the exact surface and do not infer cultural meanings. |
| **Midnight / Signal** | Midnight `#0D1B2A`, cloud `#F2F5F7`, cobalt `#2C4A84`, amber `#B9793D`, rose `#8A4C68` | Sharper, more digital, and slightly more directional | Amber is decorative or large-label only unless contrast is recalculated for its exact pair. |

Attention order is stable across all three: (1) short eyebrow or service label, (2) one sentence that says who the work is for and what is included, (3) one primary action, (4) proof status and scope, then (5) supporting detail. Use spacing, weight, heading levels, and borders before using a new color. A link is visibly a link by text treatment and/or underline; an error is labeled “Error” and paired with an icon or message, not a red border alone.

## Typography and voice

The recommended open-source pairing is Fraunces for display moments and IBM Plex Sans for body/UI. Fraunces is a variable soft-serif display family released under OFL in the Google Fonts repository ([Fraunces project](https://github.com/googlefonts/fraunces), checked 2026-10-13). IBM documents Plex as open source under the SIL Open Font License and designed for UI environments ([IBM typeface](https://www.ibm.com/design/language/typography/typeface/), checked 2026-10-13). Keep the license files with any bundled webfont and subset to the characters actually needed. A lower-risk single-family fallback is IBM Plex Sans alone; a more editorial option is Source Serif 4 with IBM Plex Sans. A paid direction such as Canela may be considered only after a webfont/seat license is purchased and recorded; do not ship a foundry font from a mockup by assumption.

Use `clamp()` for display sizes, but allow user text scaling and never turn off browser zoom. Starting values: body 1rem/1.55, small metadata 0.875rem/1.4, display 2.75rem/0.98 on small screens, display 4.75rem/0.95 on wide screens, and a prose measure of roughly 60–70 characters. The exact font size is a test variable, not a universal rule. Preserve content and function when users apply the WCAG text-spacing override: line height 1.5×, paragraph spacing 2×, letter spacing 0.12×, word spacing 0.16× ([W3C 1.4.12](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html), checked 2026-10-13). Avoid thin weights for body copy, uppercase paragraphs, justified text, and decorative type inside form controls.

Voice should be warm, exact, and visibly bounded. Wonder supplies a concrete image or an unexpected verb; Method supplies the process, deliverable, or limit in the next clause. Examples for review:

| Context | Example copy | What it proves |
| --- | --- | --- |
| Hero | “Websites with a point of view—and a path to being found.” | Point of view is a brand position; “path” avoids a ranking promise. |
| Pricing CTA | “Request a scoped plan” | The next action is clear and invites fit, not a vague “Learn more.” |
| Website scope | “A custom marketing site with three agreed pages, one visual direction, launch QA, and a documented handoff.” | A buyer can see the unit of work. |
| Limit / fit | “Not included: ecommerce, copywriting beyond the agreed page set, or ongoing SEO. Add them as a separate scope.” | Limits are stated without apology or bait-and-switch. |
| Proof label | “Owned-site build” or “Concept demo — no client result claimed.” | Demonstrations are not presented as paid-client cases. |

## Mobile-first information architecture and interaction

Start at 320 CSS px and 360 px layouts, then scale fluidly. Use content-driven ranges rather than device names: `0–47.99rem` single column, `48–71.99rem` two-column where content earns it, and `72rem+` wide editorial layout with a capped reading column. Test at 200% text zoom and the 320 CSS px reflow condition; any pricing comparison that needs a wide table must become stacked cards or a one-axis scroller whose individual card fits the viewport. Do not require horizontal scrolling to read a card.

The mobile header is logo/wordmark, a labeled menu button with a 48 px hit area, and one primary “Request a scoped plan” action. The opened menu is a focus-managed sheet or full-width panel with close control, escape handling, visible focus, and links to Work, Services, Pricing, Method, and Contact. Home should reach a key service, pricing, work proof, and contact action in at most two intentional interactions. A sticky mobile CTA may appear after the hero, but it must not obscure focus or content; W3C’s Focus Not Obscured guidance calls out sticky headers, footers, and banners as risks ([W3C 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum), checked 2026-10-13).

Proof cards carry four fields: project/status label, buyer context, what was made, and evidence boundary. Show a concept/demo or owned-site build as such; never add a fabricated outcome number. On small screens use one card per row, visible title and one-sentence takeaway, then a “View method” or “View details” link. Let the card be a link only when the whole card has one destination; otherwise keep separate controls so screen-reader names and tap behavior are predictable.

Pricing uses stacked cards with the price, fit, included unit, response/hand-off expectation, exclusions, and one action in that order. A “compare” control can reveal a sequential details list. If a table is retained, it must fit at the reflow width or provide a semantic alternative. Do not hide material price or scope inside a hover state.

The contact form is one column. Every field has a visible `<label>` above it, a meaningful `autocomplete`, the right `type`/`inputmode`, and concise help or error text tied with `aria-describedby`. Use native form controls, preserve DOM and visual order, show errors beside the field and move focus to the first invalid field on submission. These are supported by web.dev’s accessible form guidance ([web.dev forms accessibility](https://web.dev/learn/forms/accessibility?hl=en), [web.dev form design basics](https://web.dev/learn/forms/design-basics?authuser=2&hl=en), checked 2026-10-13). A required field is labeled as required; placeholders are hints, never labels. Visible focus is a 2 px outline or stronger equivalent with a 3:1 state difference where applicable; do not remove it for polish.

## Photography, 3D, and motion

Photography should be documentary and close: hands, screens, paper, workspace, and the physical traces of making. Avoid generic “happy team” stock and avoid glossy renders that imply a client result. 3D work should show a system or decision: a grid locking into place, a type specimen responding to a constraint, or a page structure becoming legible. Keep surfaces matte, lighting directional, and camera moves slow; use the clay accent as a physical cue, not a neon wash.

These production ideas assume the founder’s existing Blender, Remotion, and AI-assisted workflow recorded in the brief. They are a focused use of that capability, not a retraining plan or a new runtime skill requirement.

Use two or three meaningful, pre-rendered showcases:

1. **Signal into system (Blender, 10–15 s):** a loose field of marks resolves into a responsive grid and a clear wordmark. The buyer learns that visual character is organized into a repeatable system. Deliver a poster plus WebM/MP4; no runtime WebGL.
2. **From friction to path (Remotion, 8–12 s):** a calm before/after sequence shows a page’s navigation, service scope, and CTA becoming easier to scan. The buyer learns the work is information design, not decoration. Use actual demo copy and label it as a concept.
3. **Searchable service map (Remotion, 10–15 s):** a page tree and canonical service relationships animate into a small, readable map. The buyer learns how foundational SEO and IA connect; it does not claim rankings or traffic.

Each animation has a poster/first-frame fallback with equivalent text, a play/pause control, captions or transcript when narration exists, and no autoplay audio. At `prefers-reduced-motion: reduce`, do not autoplay; use the poster or a short opacity fade. If `Save-Data`/data-saver signals are available, or the network is constrained, default to poster and let the user opt into video. `loading="lazy"` applies below-the-fold media; reserve eager/high priority for the actual LCP image. Include image dimensions/aspect ratios so media cannot shift layout, following web.dev’s responsive-image guidance ([web.dev responsive images](https://web.dev/learn/design/responsive-images?hl=en), checked 2026-10-13). Apple’s HIG similarly advises purposeful, optional motion and alternatives for people who reduce motion ([Apple Motion](https://developer.apple.com/design/human-interface-guidelines/motion), checked 2026-10-13).

Release budgets are targets to verify, not guarantees: p75 mobile **LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1** where field data exists; otherwise record throttled lab runs. Keep the initial route’s critical payload at or below **1,600 KiB** as a practical Lighthouse target ([Chrome Lighthouse network payload](https://developer.chrome.com/docs/lighthouse/performance/total-byte-weight/), checked 2026-10-13). For this studio’s stricter proposal, aim for ≤1,000 KiB critical HTML/CSS/JS/font/image bytes, a mobile hero image ≤250 KiB, a poster ≤100 KiB, and only one showcase video requested at a time. A showcase video is lazy and route-level; it must never block the first CTA. Run keyboard, 200% zoom, 320 px reflow, screen-reader labels, reduced-motion, and slow-network checks before release.

## Acceptance checklist

Ship the recommended palette only after contrast pairs in `design-tokens.json` pass the stated thresholds and the exact font files/licenses are recorded. Validate the menu and sticky CTA with keyboard focus, ensure every service/pricing/work/contact destination is at most two intentional interactions from home, and test truthful proof labels. Record p75 field data or a reproducible mobile lab run, plus a poster/reduced-motion route for every showcase. Treat audience response to palette, copy, and motion as an experiment to measure; no color or animation claim in this memo is a ranking or conversion promise.

## Source list

Primary and peer-reviewed sources are linked inline above. The most relevant standards and evidence are: [WCAG 2.2 Contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [WCAG 2.5.8 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [WCAG Mobile Reflow](https://www.w3.org/TR/wcag2mobile-22/), [WCAG Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html), [web.dev Core Web Vitals](https://web.dev/articles/vitals), [web.dev Responsive Images](https://web.dev/learn/design/responsive-images), [web.dev Forms Accessibility](https://web.dev/learn/forms/accessibility), [Apple Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [Material touch targets](https://m1.material.io/layout/metrics-keylines.html), [Google Fonts licensing notes](https://github.com/google/fonts/blob/main/README.md), and [IBM Plex typeface](https://www.ibm.com/design/language/typography/typeface/). All were checked 2026-10-13.


## What visitors should see and feel

Use an editorial hierarchy and purposeful detail: a confident opening, obvious service/pricing paths, readable proof, generous but useful spacing, precise forms, and responsive states that feel finished. A premium impression fails if a buyer cannot discover the price or use the menu. Use warmth in language and restraint in motion, with a visible hand behind the choices.

For the owned studio site, build one 8–12 second showcase first; the 10–15 second concepts above are optional later portfolio pieces. The customer Signature package still includes only its up-to-8-second bounded hero. A richer studio demonstration does not change a purchased client scope. Make the initial mobile poster excellent before rendering motion. Describe the actual production method and decisions beside the work rather than putting tool names in the main purchase flow.

Score the release against five visible tasks: identify the service in five seconds; find the relevant fixed price; explain what is included; inspect a work example on mobile; successfully submit an inquiry. Ask five representative buyers to attempt the tasks without coaching, then ask what felt polished, confusing, generic or trustworthy. Record actual comments and failures. This is qualitative usability work, not proof of conversion superiority.

Use these copy patterns consistently: “Custom websites and SEO, with a clear scope.” “Focused Website — $6,000.” “Includes three agreed pages, launch SEO, one inquiry form, and a documented handoff.” “Care and ongoing SEO are optional.” “Request a scoped plan.” Avoid “unlimited,” “dominate Google,” fake urgency, invented awards, vague all-inclusive claims, and assurances no person can verify.

The preferred palette uses ink and paper for most surfaces. Use clay sparingly for decorative emphasis or an approved fill/text pair; the contrast table forbids small clay text on paper. Ultramarine can carry links; orchid and moss are occasional supporting colors rather than mandatory accents in every section. The alternatives are real options for visual testing, not claims that one color psychology is universally correct.
