from pathlib import Path
from PIL import Image
from fontTools import subset
import shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'evidence/brand-reset-20261014'
DEST = ROOT / 'src/assets/editions/buffalo-dusk'
FONTS = ROOT / 'src/assets/premium'
DEST.mkdir(parents=True, exist_ok=True)
FONTS.mkdir(parents=True, exist_ok=True)
image = Image.open(SOURCE / 'buffalo-dusk-still-v2.png').convert('RGB')
for width in (1536, 960, 640):
    height = round(image.height * width / image.width)
    image.resize((width, height), Image.Resampling.LANCZOS).save(DEST / f'still-{width}.webp', quality=88, method=6)
for family, filename in [('newsreader', 'Newsreader.ttf'), ('manrope', 'Manrope.ttf')]:
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    font = subset.load_font(str(SOURCE / 'type-study/fonts' / filename), options)
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=list(range(0x250)) + list(range(0x2000, 0x2070)) + [0x20ac])
    sub.subset(font)
    subset.save_font(font, str(FONTS / f'{family}.woff2'), options)
    shutil.copy2(SOURCE / 'type-study/fonts' / f'{family}-OFL.txt', FONTS / f'{family}-OFL.txt')
print('Prepared three responsive stills and two licensed WOFF2 fonts.')
