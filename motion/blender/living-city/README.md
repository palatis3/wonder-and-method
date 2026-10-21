# Living City editable scene

This is an original, editable Blender scene for Wonder & Method. The architecture,
shoreline, furniture, greenhouse, original plant meshes, presentation surfaces and
animation are real scene geometry. Approved concept images informed composition;
their pixels are not included in the scene. The presentation surfaces use the
repository's original website screenshots.

`living-city.blend` is the compact editable master. It contains two perspective
cameras, the actual materials and geometry, packed lettering fonts, and relative
texture references. A fully packed working copy is retained locally at
`output/living-city/living-city.blend`.

## Restore external assets

Run these from the repository root before opening the compact master on another
computer. The scripts fetch only the exact recorded CC0 files and verify SHA-256.

```powershell
python motion/blender/living-city/prepare_materials.py
python motion/blender/living-city/prepare_models.py
```

Materials, two photographed sky environments, and the two textured botanical
specimens are from Poly Haven under CC0. Their exact URLs, licenses, authors and
checksums are recorded in `material-sources.json` and `model-sources.json`. The
tree uses LOD1; overlapping specimens and potted plants share their mesh data.
External Blender libraries are appended as data only, with automatic script
execution disabled. The website makes no runtime requests to Poly Haven.

## Rebuild and inspect

The checked environment is Blender 5.2.2 LTS on Windows. Set `blender` to the local
Blender executable, then run from the repository root:

```powershell
$blender = 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe'
& $blender --background --disable-autoexec --python motion/blender/living-city/build_scene.py -- --mode build --samples 64
& $blender --background --disable-autoexec output/living-city/living-city.blend --python motion/blender/living-city/render_scene.py -- --view desktop --samples 64 --frames 1,77 --prefix review
& $blender --background --disable-autoexec output/living-city/living-city.blend --python motion/blender/living-city/render_scene.py -- --view portrait --samples 64 --frames 1,59 --prefix review
```

Python helpers use Pillow; the optional temporal-quality report also uses NumPy.
Cycles uses HIP when available and falls back to CPU. `render_scene.py --cpu`
explicitly selects CPU. The renderer accepts `--width`, `--height`, comma-separated
frames, or inclusive `start:end:step` ranges. Camera-specific presentation surfaces
are separated into `PANELS DESKTOP` and `PANELS PORTRAIT` collections.

## Motion and delivery

Desktop is 101 frames at 24 fps (4.2083 seconds); portrait is 72 frames (3 seconds).
The subtle camera arrival stops at frame 25. The three desktop surfaces settle
at frame 77; the single landscape phone surface settles at frame 59. Nothing
continues drifting during the closing hold. The frontend's native portfolio
remains separate from the scene and controls which website the visitor explores.

`verify_scene.py` compares every evaluated camera, presentation transform,
visibility flag and material alpha across every delivery frame. Identical holds
are encoded by repeating the final rendered frame: 77 desktop and 59 portrait
unique renders preserve the full 24 fps delivery.

After the visual checkpoint has passed, render those unique frames into
`output/living-city/final-frames`, run `verify_scene.py` against the final master,
and run `encode_delivery.py`. It writes H.264 videos, WebP stills derived from the
exact first/last decoded frames, small responsive posters, checksums and the public
manifest. Public opening stills use quality 90, ending stills quality 92, and small
posters quality 85 to preserve the original initial-page payload budget; the four
opening files together must stay at or below 365,000 bytes. Decoded PNG references
remain private. The manifest reports their source-frame hashes and measured PSNR,
and correctly declares that lossy public stills are not pixel-identical.
`preserve_source.py` refreshes the compact editable master without
changing the packed working copy.

After encoding, `python motion/blender/living-city/audit_delivery.py` verifies
every public checksum and every decoded frame against its corresponding render,
confirms opening/end source-frame identity and public still compression metrics,
and writes decoded contact sheets plus amplified poster-difference comparisons
to `output/living-city/final-review`. Inspect the films as
well: numerical frame differences include intentional motion and do not alone
prove perceptual stability.

For an early inspection of a completed camera sequence, use
`python motion/blender/living-city/encode_delivery.py --view desktop --partial`
(or `--view portrait`). This writes only that camera's validated media and a
private report; it never publishes or updates the public manifest. The normal
two-camera encode publishes the ready manifest after both films pass.

For the approved V5 scene, `python motion/blender/living-city/render_delivery.py`
performs the final sequence automatically. It verifies the master hash, reuses
same-settings final-resolution review frames, renders each remaining unique frame
once, and then encodes. `render_scene.py --skip-existing` supports exact-settings
resumption. Creating `output/living-city/pause-render` requests a graceful stop
after the current frame; remove that file before resuming. Render directories
record the master hash, sample count and dimensions to prevent stale-frame mixing.

```powershell
& $blender --background --disable-autoexec output/living-city/living-city.blend --python motion/blender/living-city/render_scene.py -- --view desktop --samples 64 --frames 1:77 --prefix final-frames
& $blender --background --disable-autoexec output/living-city/living-city.blend --python motion/blender/living-city/render_scene.py -- --view portrait --samples 64 --frames 1:59 --prefix final-frames
& $blender --background --disable-autoexec output/living-city/living-city.blend --python motion/blender/living-city/verify_scene.py
python motion/blender/living-city/encode_delivery.py
& $blender --background --disable-autoexec output/living-city/living-city.blend --python motion/blender/living-city/preserve_source.py
```

Review frames, compressed stability clips and verification reports stay under
`output/living-city`; only final delivery files belong in `public/living-city`.
