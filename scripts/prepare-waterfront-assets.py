"""Encode the approved original raster assets for the website. No creative edits."""
from pathlib import Path
from PIL import Image
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
source = root / 'output' / 'waterfront-assets'
target = root / 'src' / 'assets' / 'waterfront'
target.mkdir(parents=True, exist_ok=True)
for name, width in [('hero-desktop', 1600), ('hero-mobile', 780), ('supporting/concrete-detail', 720), ('supporting/water-detail', 720)]:
    image = Image.open(source / f'{name}.png').convert('RGB')
    if image.width > width:
        image = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
    path = target / f'{Path(name).name}.webp'
    image.save(path, 'WEBP', quality=84, method=6)
    print(path.name, image.size, path.stat().st_size)
poster = Image.open(root / 'output' / 'waterfront-3d' / 'water-and-grain-poster.png')
poster.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
poster.save(target / 'grain-model.webp', 'WEBP', quality=88, method=6)
for weight in ['regular', 'medium']:
    font = TTFont(source / f'cormorant-{weight}.ttf')
    font.flavor = 'woff2'
    path = target / f'cormorant-{weight}.woff2'
    font.save(path)
    print(path.name, path.stat().st_size)
