# Living City homepage and Buffalo Work archive

The Living City edition pairs a rendered waterfront neighborhood with a native portfolio selector. Fieldwork, Northline and Hearthside remain clearly identified as fictional businesses, and each preview links to its existing working concept. The business offers, prices, contact flow and regional service content remain available.

## Visitor experience

- The homepage opens with a still. An explicit Play scene action loads one film, chosen for the current screen width. Desktop and phone use separately staged cameras in the same three-dimensional scene.
- Pause, replay, offscreen and background-tab behavior preserve visitor intent. Reduced-motion settings keep the still and all navigation available. A loading or playback failure returns to the still with a retry action.
- The portfolio sits below the scene and is available immediately. Keyboard arrows, Home and End select the matching business, screenshot and named destination together. Without JavaScript, all three concepts remain visible. Motion never forces a scroll or substitutes for a link.
- Screenshots come from the actual concept pages. `scripts/capture-city-previews.mjs` records their capture dimensions and source fingerprints in `src/city-preview-captures.json`.

## Preservation and source

The previous Buffalo introduction and ambient film are preserved at `/work/buffalo-civic/`, reached through Work. Both use native playback controls. The original Buffalo media and editable sources remain in the repository or their original local preservation directories; the new edition does not overwrite them.

Living City source is under `motion/blender/living-city/`. Generated frame sequences and working render assets stay under ignored `output/living-city/`. Publication consumes only the checked poster, film and end-frame exports from `public/living-city/manifest.json`; the builder verifies every file's byte count and SHA-256 hash as well as camera dimensions and film duration.

## Release requirements

The candidate adds the Buffalo Work route, taking the site to 286 HTML routes and 285 sitemap URLs. Migration `0016_journey_buffalo_work.sql` adds its fixed aggregate measurement category while preserving the previous schema and rows. Export production D1 before applying it, verify preservation, then deploy the candidate Worker. The preceding Worker remains compatible with the expanded category constraint.

Use the clean, pushed commit, exact technical-check manifest and production predeploy procedure in [PRODUCTION.md](../deployment/PRODUCTION.md). Final local visual comparisons, Buffalo preservation inventory, browser results, database backup verification and published runtime identity are private release evidence. Source implementation alone is not a claim of publication or a passed visual review.
