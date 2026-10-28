# Homepage flow and stable page controls

## Brief

The owner reported that the floating chat and back-to-top buttons flicker during scrolling, asked to keep the personal introduction off the homepage, and requested research into a more natural homepage order. The target is the existing Wonder and Method site and its current visual identity.

## Research

- [Nielsen Norman Group: Homepage Design, 5 Fundamental Principles](https://www.nngroup.com/articles/homepage-design-principles/) recommends making the site's purpose clear, showing concrete examples, providing useful routes and actions, and keeping the homepage focused. Its examples span multiple industries; this is not an SEO-agency template.
- [Nielsen Norman Group: About Us Information on Websites](https://www.nngroup.com/articles/about-us-information-on-websites/) distinguishes a short homepage explanation from more detailed company and personal information on About pages. The existing About biography already gives visitors that detail.
- [Office for National Statistics: Designing content to meet user needs](https://service-manual.ons.gov.uk/content/writing-for-users/user-needs) recommends organizing content around what visitors need to do and why. This supports checking the purpose of each section rather than adding a standard list of marketing blocks.
- [Baymard Institute: Homepage and Category Navigation](https://baymard.com/research/homepage-and-category-usability) studies how visitors discover and select offerings. Its evidence comes from ecommerce: useful guidance for clear service paths, but not proof that any particular order will improve this studio's conversions.

These sources support the principles, not a universal section sequence. The order below is an application to this site's current content and the owner's preference; no conversion gain is claimed without visitor testing.

## Current-page findings and chosen order

1. **Introduction — retain.** The hero already says what the studio does, who it serves, a starting price and how to make contact. Preserve its image, animation, wording and curved transition.
2. **Choose a service — move earlier.** Put the existing service choices and starting prices directly after the hero, so visitors can identify their next step before reading individual project details.
3. **Real work — retain as the first proof example.** Keep AssetRounds clearly identified as a website built by the studio.
4. **Website concepts — group with the work.** The previous owner introduction and service section separated real work from fictional examples. Keep both kinds of work adjacent while retaining every fictional-example label and working tab/link.
5. **Process — retain after the work.** Explain the working relationship, approvals, payment milestones and ownership once visitors have seen the offer and examples.
6. **Questions — retain before contact.** Keep answers about editing, SEO, subscriptions and timing near the final decision.
7. **Contact — retain as the closing action.** Keep the short explanation of what to send and the existing contact route.

The homepage's personal introduction is removed. The existing `/about/#terry` biography retains Terry's experience and direct working relationship; no biography content needs to be duplicated or invented.

## Scrolling defect

The previous narrow-screen script measured text rectangles on every scroll, searched for blank vertical slots, moved each button into those gaps and hid it when none was available. Current live captures show repeated position changes, including a back-to-top button moving from its bottom corner to the middle of the page. A dense-text regression fails against the previous build because chat becomes hidden.

The repair keeps both independent 48-pixel circular controls at their established opposite bottom corners. Ordinary prose no longer changes their position or visibility. Existing back-to-top threshold hysteresis, overlapping keyboard-focus protection, form-field protection, menu suppression, chat handling, touch targets and footer clearance remain. A tentative broader form suppression was discarded after focused tests showed it unnecessarily delayed access to chat after leaving a field.

Fixed controls can briefly overlay passing content while scrolling. The repair avoids moving targets and repeated disappearance; focused links and form fields still receive the existing protection. Tests cover continuous scroll frames, dense enlarged text, viewport changes, keyboard focus, forms, menus and chat fallback. The site continues to use separate corner buttons without a shared bottom bar.

## Evidence and limits

Current-run screenshots, scroll samples, the failing old-build regression and independent code review are retained privately under `evidence/homepage-flow-20261028/`. The initial full-page capture failed and one screenshot was taken during viewport resizing; neither is accepted evidence. Accepted captures were saved and inspected.

The screenshot audit supports the section-order and moving-button findings. It does not establish accessibility certification, conversion performance, real chat delivery or a successful deployment. Fresh runtime tests, reviewed visual references and exact-source release gates remain required before publication. Final publication evidence belongs in the release record, not this research note.
