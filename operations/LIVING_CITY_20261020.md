# Living City homepage and Buffalo Work archive

The Living City edition pairs a rendered waterfront neighborhood with a native portfolio selector. Fieldwork, Northline and Hearthside remain clearly identified as fictional businesses, and each preview links to its existing working concept. The business offers, prices, contact flow and regional service content remain available.

## Visitor experience

- The homepage opens with a still, then starts a twelve-second introduction automatically when motion is allowed. One four-second seamless city film is chosen for the screen width. Native website previews appear in sequence: Fieldwork at 1.5 seconds, Northline at 4.5, Hearthside at 7.5, then an unobstructed city from 10.5 seconds. At twelve seconds the introduction ends and the subtle city ambience continues.
- Pause and replay control both the previews and the city. Leaving the scene or backgrounding the tab suspends playback. A visitor's explicit play or pause choice is remembered for the current browser tab. Reduced-motion and data-saving settings retain the still without requesting the film automatically. A blocked autoplay exposes a play action; a loading or playback failure restores the still and offers retry.
- Staggered stars brighten on repeating 3.6–5.5-second cycles, continuing through the ambient ending. Each website card turns into view, receives a soft light sweep and reveals its branded caption in sequence, then rests without a transform for crisp text. Pause also holds the stars and caption animations. Keyboard focus settles the current card immediately and keeps it readable after focus leaves; replay restores the entrance. Reduced motion leaves the stars still and disables the tour.
- The clear sky contains an original pair of decorative star maps and a textured crescent moon. After the introduction, constellation lines trace and fade on an eighteen-second loop, the moon halo gently brightens, and two shooting stars cross at staggered seventeen- and twenty-three-second intervals. Pause, offscreen suspension and page backgrounding hold these effects; replay resets them. Reduced motion keeps the moon and star maps static and hides the shooting stars. The transparent moon source and exact built-in image-generation prompt are preserved in `motion/art/living-city-night/`; the compact web image is under `src/assets/living-city-night/`.
- The header blends with the opening scene and stays fixed while scrolling, switching to a readable paper background. Scene links reveal the matching project below the header, including when revisiting a fragment through browser history.
- The portfolio sits below the scene and is available immediately. Keyboard arrows, Home and End select the matching business, screenshot and named destination together. Without JavaScript, all three concepts remain visible. Motion never forces a scroll or substitutes for a link.
- Screenshots come from the actual concept pages. `scripts/capture-city-previews.mjs` records their capture dimensions and source fingerprints in `src/city-preview-captures.json`.

## Preservation and source

The previous Buffalo introduction and ambient film are preserved at `/work/buffalo-civic/`, reached through Work. Both use native playback controls. The original Buffalo media and editable sources remain in the repository or their original local preservation directories; the new edition does not overwrite them.

The original Living City source is under `motion/blender/living-city/`. The refinement source and reproducible render scripts are under `motion/blender/living-city-refinement/`. Generated frame sequences and working render assets stay under ignored `output/`. Publication consumes only the checked poster, film and end-frame exports from `public/living-city/manifest.json`; the builder verifies every file's byte count and SHA-256 hash as well as camera dimensions and film duration. The twelve-second native introduction and four-second rendered loop are recorded separately.

## Release requirements

The first Living City release added the Buffalo Work route, taking the site to 286 HTML routes and 285 sitemap URLs. Migration `0016_journey_buffalo_work.sql` was applied for that release. This visual refinement keeps the same routes and schema and requires no new migration.

Use the clean, pushed commit, exact technical-check manifest and production predeploy procedure in [PRODUCTION.md](../deployment/PRODUCTION.md). Final local visual comparisons, Buffalo preservation inventory, browser results, database backup verification and published runtime identity are private release evidence. Source implementation alone is not a claim of publication or a passed visual review.
