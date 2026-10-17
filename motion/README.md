# Motion sources and studies

The live premium site currently uses the six-second Buffalo dusk asset. The latest BUFFALO baseline is the floating letter assembly with refined blue paper artwork, a clearer A, and a plain Sage backdrop, available locally at `http://localhost:4221/` while the preview server is running. The earlier paper-fold study and combined page audit remain at `http://localhost:4220/review.html`.

## Floating Buffalo assembly

`buffalo-assembly-data.js` defines 43 illustrated paper fragments across the seven letters. Each letter assembles before the next starts. Pieces follow curved approaches with fade, tilt and soft shadows, then crossfade to the complete glyph over 0.18 seconds. Complete glyphs gently drift before a final still hold. Shared-boundary masks in `buffalo-letter-silhouettes.js` preserve the full source canvas, including the B's two bowls. `scripts/trace-buffalo-letter-masks.py` derives those boundaries from transparent corridors in the final source artwork and rejects opaque crossings. The 15-second sequence (1.15� the original assembly speed) is shared by `buffalo-assembly.js` and `remotion/BuffaloAssembly.jsx`. These are illustrated fragments with depth transforms, not individually modeled buildings.

`public/buffalo-sage/word.webp` supplies the foreground with the clearer A; the background is plain CSS Sage (`#bec7b7`). The runtime image is 384,458 bytes. The browser animates these images directly; it does not load the exported MP4. Desktop playback runs once when visible; phones, reduced-motion and data-saving preferences begin with a still and explicit Play. Pause, Resume and Replay remain available. Playback pauses when scrolled out of view or the document is hidden.

```powershell
node scripts/build-buffalo-motion-review.mjs
node scripts/buffalo-motion-review-server.mjs
node node_modules/@remotion/cli/remotion-cli.js render motion/remotion/index.jsx BuffaloAssembly evidence/buffalo-refinement-20261015/buffalo-assembly.mp4 --codec=h264 --crf=20 --pixel-format=yuv420p --color-space=bt709 --image-format=jpeg --jpeg-quality=90 --concurrency=2 --log=error
```

The exported study is 1600×1000 at 30 fps, 510 frames. Current prompt provenance, encoding metadata, sequence stills, before/after captures and independent review are under `evidence/buffalo-refinement-20261015/`. The preceding blue-background version remains under `evidence/buffalo-atmosphere-20261015/`. Current baseline timing, mask evidence and asset sizes are recorded under `evidence/premium-audit-20261015/animation-*`. The user is choosing among new word styles before further choreography work. This remains a local review revision; the new hero is not deployed.

## Earlier Buffalo paper-fold study

`blender/buffalo_paper_word.py` creates seven illustrated paper meshes, a pronounced staggered fold, a second curl and moving warm light. It saves the packed editable source to `output/buffalo-paper/buffalo-paper-word.blend`. Landmarks remain image textures on paper geometry; they are not individually modeled architecture. The selected original image and transparent cutout are preserved under `public/buffalo-paper/`.

The encoded study is 1600×800 at 24 fps for eight seconds. Frames 1–132 are rendered; frames 133–192 hold the settled frame. `remotion/BuffaloPaperWord.jsx` exposes the clip in the Remotion timeline. Its homepage experiment has since been replaced by the floating assembly above; the clip remains in the combined audit for comparison.

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python motion/blender/buffalo_paper_word.py -- --render --quick
node scripts/encode-buffalo-paper.mjs
node scripts/build-buffalo-motion-review.mjs
node scripts/buffalo-motion-review-server.mjs
```

Use `--quick` for the delivered four-sample denoised study; omit it for eight samples. Run without `--render` to regenerate the six diagnostic stills. The existing `public/buffalo-paper/poster.webp` is the settled-frame poster. Final site adoption still needs the chosen artwork's local-reference refinement and production release checks; this workflow does not deploy the new hero.

## Earlier Water & Grain study

The earlier Water & Grain site used three complementary layers: Motion for restrained text entrances, a small WebGL shader for the hero water, and the original Blender maquette presented through Spline. Its homepage, Work page and web-design service page included a four-second Blender/Remotion film in landscape and portrait formats. Those assets remain here as source history.

`blender/waterfront.py` creates the editable model, GLB and poster under `output/waterfront-3d/`. `blender/waterfront-film.py` opens that scene and renders 96 RGBA frames at 24fps under `public/waterfront-frames/`. The model is a Buffalo-inspired studio study, not a surveyed landmark. `remotion/WaterfrontFilm.jsx` composes those frames with self-hosted typography; `remotion/Root.jsx` registers both current compositions.

Run from the project root after installing the pinned development dependencies:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python motion/blender/waterfront.py
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python motion/blender/waterfront-film.py
npm run motion:studio
npx remotion render motion/remotion/index.jsx WaterfrontFilm src/assets/waterfront/film-landscape.mp4 --codec=h264 --crf=23 --pixel-format=yuv420p --color-space=bt709 --image-format=png --concurrency=2 --log=error
npx remotion render motion/remotion/index.jsx WaterfrontFilmPortrait src/assets/waterfront/film-portrait.mp4 --codec=h264 --crf=23 --pixel-format=yuv420p --color-space=bt709 --image-format=png --concurrency=2 --log=error
```

The composition loads `public/waterfront-fonts/cormorant-regular.woff2` and `plex.woff2`; these are local copies of the licensed fonts in `src/assets/`. Intermediate frames and preview PNGs are not deployed. Only encoded MP4/WebP assets ship. Retain explicit BT.709 encoding: the earlier default export shifted the cream background in Chromium.

The owner approved the model-only Spline public preview and seamless loading near its homepage section. Its editable scene remains invite-only. URL: https://my.spline.design/wonderampmethodwaterampgrain-cLY8VFqLzhnMnS6ECvQsRl16/ . WebGL 2 renderer, two-finger mobile orbit, page scrolling enabled; logo retained. This external runtime has a separate network/rendering cost from local assets. No paid upgrade was purchased.

Older ribbon experiments remain as source history and are not the registered Remotion compositions or delivered visual direction.
