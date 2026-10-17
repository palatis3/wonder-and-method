"""Responsive derivatives and font subsets; no creative image changes."""
from pathlib import Path
from PIL import Image
from fontTools import subset
from fontTools.ttLib import TTFont
root = Path(__file__).resolve().parents[1]
target = root / 'src/assets/waterfront'
for name, widths in [('hero-mobile', [450]), ('concrete-detail', [180,360]), ('water-detail', [180,360])]:
    with Image.open(target / (name+'.webp')) as image:
        for width in widths:
            small = image.resize((width,round(image.height*width/image.width)),Image.Resampling.LANCZOS)
            file = target / f'{name}-{width}.webp'
            small.save(file,'WEBP',quality=82,method=6)
            print(file.name,file.stat().st_size)
archive = root / 'output/waterfront-assets/fonts-full'
archive.mkdir(parents=True,exist_ok=True)
for weight in ['regular','medium']:
    file = target / f'cormorant-{weight}.woff2'
    original = archive / file.name
    if not original.exists(): original.write_bytes(file.read_bytes())
    font = TTFont(original)
    options = subset.Options(); options.flavor='woff2'
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=list(range(0x100))+list(range(0x2000,0x2070))+[0x20ac,0x2191,0x2192,0x2193,0x2197,0x2212,0xfeff,0xfffd])
    subsetter.subset(font); font.flavor='woff2';font.save(file)
    print(file.name,file.stat().st_size)
