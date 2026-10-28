"""Maintenance export: python scripts/prepare-performance-images.py (Pillow).

Keep reviewed source captures, posters and artwork; ordinary builds use these
checked-in derivatives and verify their manifests. No network access is needed.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent


def read_json(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def write_json(path, value):
    (ROOT / path).write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8", newline="\n")


def export(source, destination, width, quality=84):
    image = Image.open(ROOT / source)
    assert width <= image.width, "Do not enlarge sources"
    if width != image.width:
        image = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
    image.save(ROOT / destination, format="WEBP", quality=quality, method=6)
    data = (ROOT / destination).read_bytes()
    return {"width": image.width, "height": image.height, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


captures = read_json("src/city-preview-captures.json")
for capture in captures["records"]:
    if capture["camera"] != "phone":
        continue
    for width in [525, 700]:
        path = capture["path"].replace(".webp", f"-{width}.webp")
        item = {"path": path, **export("src" + capture["path"], "src" + path, width)}
        capture["variants"] = [v for v in capture["variants"] if v["width"] != width] + [item]
    capture["variants"].sort(key=lambda v: v["width"])
write_json("src/city-preview-captures.json", captures)

responsive = read_json("src/assets/responsive-images.json")
source = "/assets/work/assetrounds/desktop.webp"
for width in [640, 768]:
    path = source.replace(".webp", f"-{width}.webp")
    export("src" + source, "src" + path, width)
    responsive[source]["variants"] = [v for v in responsive[source]["variants"] if v["width"] != width] + [{"path": path, "width": width}]
responsive[source]["variants"].sort(key=lambda v: v["width"])
write_json("src/assets/responsive-images.json", responsive)

export("src/assets/living-city-night/crescent-moon.webp", "src/assets/living-city-night/crescent-moon-192.webp", 192)

manifest = read_json("public/living-city/manifest.json")
source = manifest["files"]["mobilePoster"]
path = "/living-city/mobile-medium-poster.webp"
manifest["files"]["mobileMediumPoster"] = {
    "path": path, **export("public" + source["path"], "public" + path, 724, 82),
    "encoding": "webp-lossy", "quality": 82,
    "derivedFrom": {"path": source["path"], "sha256": source["sha256"]},
    "purpose": "Intermediate responsive opening image; video poster and film remain unchanged."
}
write_json("public/living-city/manifest.json", manifest)
print("Prepared phone captures, AssetRounds widths, moon and mobile poster derivatives.")
