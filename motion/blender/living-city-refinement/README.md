# Living City clean-city refinement

This isolated refinement was authored from the packed `output/living-city/living-city.blend`, whose approved SHA-256 is `64e1c1489458c22af03d28621050b9d49991873df4ec4978a1195d373fe8c27f`. The generator prefers the tracked `motion/blender/living-city/living-city.blend` only if its byte identity matches that approved baseline. The current tracked file is a different source (`26fc9bff9c454460e0d1fbc3d3b1aba798532fc721d5c476ee97879319b69e47`), so the recorded historical generator uses the approved output baseline and rejects accidental substitution. It preserves both originals. Review renders and delivery evidence stay in `output/living-city-refinement/`. Following the primary's static and temporal approval, the final encoder installs the existing eight media filenames and manifest in `public/living-city/`.

The selected direction is one locked-camera, four-second true-3D ambient loop beneath a twelve-second native website story. Fieldwork, Northline, and Hearthside screenshots, labels, links, progress, and controls are owned by the native page. Both baked screenshot-panel collections are hidden in the refined scene.

## Scene changes

- Selective cool fill and architectural rim; softer localized warm entrance pools.
- One restrained physical cool reflection in glazing, with original photographed matte brick and timber retained.
- Two traveling water waves and a periodic micro-normal drift, preserving the baseline wave amplitudes.
- Up to roughly one centimeter of local tip motion in the three doorway leaf meshes. Pots, stems, buildings, rear trees, and cameras remain fixed.
- Oven light and emissive flame variation bounded at four percent.

The source uses simple deterministic sine/cosine drivers and no external handlers. Frame 1 and frame 97 match phase and velocity for a four-second loop at 24 fps. A final sequence must encode frames 1–96; frame 97 is the duplicated mathematical endpoint used only for verification.

## Current gate

`output/living-city-refinement/gate-manifest.json` contains measured settings, source hashes, comparisons, crop-integrity checks, and review media paths. The primary approved both cameras' Cycles static composition, crop integrity and compressed temporal seam samples. `delivery-approval.json` records the approved full-delivery contract.

Cycles static gate: 64 samples, HIP, adaptive threshold 0.025, fixed seed 19, denoising enabled, 9 total / 3 diffuse / 4 glossy / 8 transmission bounces. Desktop 1440×960; phone 828×1216. Framing remains the baseline arrival composition.

EEVEE was benchmarked at 128 samples with screen tracing and improved shadow/GI settings. The desktop result took 294.459 seconds, exhausted its shadow buffer, blurred interiors, and weakened water reflections; it was rejected before a phone test.

## Reproduction

Use the existing Blender 5.2 executable with `--background --disable-autoexec --python-exit-code 1 --python` and the script path below; script arguments follow `--`.

- `refine_scene.py --engine cycles --view desktop --samples 64 --loop-seconds 4 --save-blend` prepares the isolated editable source.
- `refine_scene.py --engine cycles --view desktop --samples 64 --loop-seconds 4 --render` produces one full-size gate image.
- `render_crop_sample.py --view desktop --frames 1,25 --scale 100 --samples 64 --prefix crop-benchmark` measures the padded lower-city region.
- `compose_crop_sample.py --prefix crop-benchmark --view desktop` restores that region over the static clean-city beauty offline.
- `verify_crops.py` compares a quarter-cycle full render against the offline composite in both viewports.
- `make_gate_report.py` assembles the exact image comparisons and measured costs.

The bounded sample renderer accepts at most 48 distinct frames and does not implement a full-delivery batch. The temporal sample uses 24 consecutive full-size frames crossing 96→1. Approved sample frames can be reused in final delivery because the source hash, framing, settings, and dimensions are recorded.

## Crop strategy

Desktop renders the bottom 45 percent (1440×432); phone renders the bottom 30 percent (828×364). The entire scene remains present for reflection, transmission, and shadow rays. Animated leaf bounding boxes are checked against the padded crop. A 16-pixel smooth feather at the static upper edge addresses border-denoising differences. This is an offline preparation step; the browser receives ordinary full-frame media.

The independent quarter-cycle reference check uses the phase of maximum negative oven-light variation. It measures both the rendered region and the static area outside it; rendered seam and visual motion quality are separately gated.

## Approved delivery

`render_delivery.py --view desktop` and then `--view portrait` render the four-second loop. Run them serially with the same Blender executable; at most one GPU job may run. The renderer validates source identity and packed dependencies, reuses only source-identical approved frames, and records every frame hash. It can resume a matching incomplete delivery.

The optimized delivery scripts consume generated files under `output/living-city-refinement/`: the approved refined source, full-frame gate beauties, approval record, and matching sample/frame caches. They are the recorded delivery pipeline, not a standalone prerequisite for opening or rendering the portable scene. A fresh checkout can open and render the portable refined scene directly. Repeating the historical look-development generator requires its source-identical approved baseline, and repeating the optimized delivery workflow requires new gate/approval/cache records.

`encode_delivery.py --publish` composites frames 1–96, encodes ordinary H.264 MP4s, decodes all 192 delivered frames, compares them with the source composites, measures the compressed loop seams, and generates posters directly from decoded video frames. It checks the eight original public keys/paths, both original dimensions, 24 fps, four-second duration, absence of audio, each film below 5 MB, and the four opening posters at or below 365,000 combined bytes before copying the final assets. The previous public package is preserved under `output/living-city-refinement/delivery/previous-public/`.

The portable editable source bundle is `living-city-refined-loop4.blend` plus the adjacent `textures/` directory and `source-bundle.json`. Keep those together when copying the source. The scene is 44,820,484 bytes, with SHA-256 `64925834722e8af2b2b6aefbd62534b9729cc99dcb0abf67987a89a71eaf8e7b`. All 35 image dependencies preserve their original bytes and use relative paths; fonts remain packed and no libraries are linked. Each individual file is below 100 MB. The full packed render master remains unchanged in ignored output, with SHA-256 `7963732b4c6adcdd8788e5b9a6852213f3a66bd35fb03d27b11481a72084a945`.

`compact_source.py` produces the bundle without resampling textures, recompressing images, deleting visible data, or changing render settings. It verifies a structural snapshot before saving and after reopening: geometry, UVs, shape keys, modifiers, drivers, materials, lights, cameras, world, render settings and original image identities. `source-bundle.json` records the exact dependency hashes and comparison result. `verify_portable_source.py` performs one quarter-cycle crop check against the approved packed master after full rendering has ended.

Open that scene directly in Blender to edit geometry, materials, lighting and periodic drivers. Cameras are named `CAMERA • desktop hero` and `CAMERA • portrait hero`. To render the full frame directly, keep render borders off and select 1440×960 or 828×1216 respectively. Frames 1–96 are the unique loop; frame 97 is mathematically equivalent to frame 1 and must not be encoded as a duplicate endpoint.

Direct rendering of the portable `.blend` with its adjacent `textures/` directory does not require any gate, approval, sample, or output-cache files. To make a single packed copy for local use, open the bundle, use Blender's Pack Resources command, then save to an ignored output directory; that packed copy is larger than GitHub's individual-file limit. Historical gate reports retain the script hashes used when they were created; later source-path guards and documentation cleanup do not alter the approved scene or its render settings.

Final evidence lives in `output/living-city-refinement/delivery/verification.json`, with per-camera all-frame records, decoded contact sheets and poster comparisons in the corresponding camera directories. The native website owns the twelve-second introduction, captions, project links, progress, pause and replay behavior; the film itself is a continuous four-second ambient loop.

The portable-source quarter-cycle crop matches the packed-master reference to a mean channel difference of 0.00858 on a 0–255 scale; it is not claimed pixel-identical. The compressed loop boundaries were also inspected at full resolution. Their static upper regions differ by only 0.025 desktop / 0.031 phone channel levels on average, while those source regions are exactly static. The larger seam-to-adjacent ratios reflect small I-frame quantization differences, with no camera/crop displacement or broad brightness pulse indicated. `audit_final_delivery.py` records the raw-versus-decoded diagnosis and source spot-check evidence.
