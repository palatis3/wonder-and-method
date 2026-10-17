"""Encode responsive delivery copies without changing the approved artwork."""
from pathlib import Path
from PIL import Image

assets = Path(__file__).resolve().parents[1] / 'experience/assets'
for name in ['buffalo-hero', 'garden']:
    with Image.open(assets / f'{name}.webp') as original:
        for width in [640, 960]:
            resized = original.resize((width, round(original.height * width / original.width)), Image.Resampling.LANCZOS)
            destination = assets / f'{name}-{width}.webp'
            resized.save(destination, 'WEBP', quality=80, method=6)
            print(destination.name, destination.stat().st_size)
