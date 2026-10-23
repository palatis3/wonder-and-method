# Performance, media and motion audit

Baseline: b711713f376d3f180d7d330fbbe20f5c27309d2b. Frozen public corpus: 1192 pages; scan: 1204 emitted HTML files including utility documents. No source, build, test, baseline or artwork changes were made.

Three bounded findings: an unnecessary offscreen film request (P2), a poster layout shift (P3), and stale responsive image metadata (P3). Input and corroborating evidence SHA-256 values are recorded in findings.json. The accessibility auditor provided both browser checks using its existing server/session.

## PERF-003 — Offscreen home navigation requests the city film (P2)

In a fresh desktop context at 1440×1000, opening /?qa=1#site-help requested /assets/living-city/desktop-film.mp4 even though scrollY was 4073 and the city scene ended at −3253 CSS px. Reduced motion and Save-Data were false; no remembered motion choice existed. The controller was ready, with state paused and the film source still retained. Evidence: ../accessibility/performance-checks.log.

motion/living-city.js:24 initializes inView=true; lines 201–203 set preload=auto, assign src and load; line 407 starts automatic playback before the observer at line 384 delivers its first result. An independent offline harness using the actual existing fixture confirms one load/play before any observer callback. The later offscreen result pauses without releasing the source. The file is 696070 bytes; actual transferred bytes were not measured.

Narrow fix: initialize visibility as unknown/offscreen when an observer exists and retain playback intent until the first positive intersection. Keep the no-observer fallback and normal desktop autoplay once visible. Add a focused initial-offscreen regression, then preserve all existing pause, motion preference and lifecycle behavior.

## PERF-001 — Waterfront poster reserves the wrong aspect ratio (P3)

src/work-gallery.mjs:30 emits the lazy Waterfront poster as 1536×1024, repeating the incorrect item dimensions from line 22. The actual WebP is 1200×750. src/assets/site-refresh.css:697 uses width:100% and height:auto, so the reserved 3:2 ratio changes to the decoded 8:5 ratio.

The browser check held then fulfilled the versioned image response at 390×844. With scrollY unchanged at 8454, the 350px-wide image shrank from 233.328125px to 218.75px, and the following caption moved upward by 14.578125px. Evidence: ../accessibility/image-geometry.log and waterfront-image-phone-before.png / waterfront-image-phone-after.png. This measures element geometry, not a CLS metric or field score. A large-screen card capped at 240px masks this change.

Narrow fix: render the existing poster's actual 1200×750 dimensions, preferably using its item data rather than duplicate constants. Preserve the artwork and film. Verify unchanged geometry before and after a delayed image response.

## PERF-002 — Tracker responsive manifest is stale (P3)

src/assets/responsive-images.json:115–137 describes the tracker screenshot as 1440×1000 with a final 1440w candidate. Its actual file is 1200×900, confirmed by the WebP header and src/portfolio-captures.json. The 240/480/640/960 derivatives are correct current copies. src/responsive-images.mjs:6 emits the stale record, overriding the correct dimensions already present in work-gallery.mjs:19.

Narrow fix: change this one manifest record to 1200×900 and its final width descriptor to 1200w. This is a concrete 20% descriptor mismatch; fixed card geometry masks layout movement here. No visible blur or CLS was claimed. Validate each emitted descriptor against its asset width.

## Checks and preservation

- Focused controller suite: node --test tests/living-city-controller.test.mjs — 28 passed, 0 failed. Covers explicit pause, pending playback races, hidden/offscreen/pagehide suspension, reduced-motion changes, retry and buffering, tabs, camera selection and destruction cleanup.
- Current films are at most 696070 bytes. All eight shipped MP4s place movie metadata before media data. Archival players use native controls and preload=none. Original films and animation remain intact.
- The city hero has a high-priority responsive picture. First phone visits, remembered pause, Save-Data and reduced motion avoid automatic source assignment. CSS motion is gated on the playing state and reduced motion disables animations.
- Raster scan inspected 16 unique dimension declarations and 57 responsive width descriptors. The square 480px/1080px source-versus-declared dimensions preserve aspect ratio and were not reported as a defect.
- Local Newsreader/Manrope fonts use font-display:swap and matching versioned preload/font-face URLs. Home family CSS is 100799 bytes raw and 16526 bytes under local Brotli compression; this is not an HTTP transfer measurement.
- Static home artwork/project links, native archival video sources, the ROI worked example, disabled concept form fallback and tracker JavaScript explanation remain available in markup. Inquiry POST behavior belongs to the forms auditor.

No Core Web Vitals, field performance, Lighthouse score, actual network byte total, offline-cache guarantee or CLS metric was measured. No browser/server was launched by this auditor. Existing broad audit conclusions were retained without rerunning unchanged full checks.
