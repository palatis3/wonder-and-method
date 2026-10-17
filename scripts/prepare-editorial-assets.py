"""Encode original approved editorial artwork; only resizing and format compression."""
from pathlib import Path
from shutil import copyfile
from PIL import Image

root = Path(__file__).resolve().parents[1]
generated = Path('C:/Users/palat/.codex/generated_images/01a1372f-80d0-7bf0-b8dc-c159ebe59991')
sources = {
 'website-budget': 'exec-0c824a9f-6add-4795-b34b-7d9e406ff5b4.png',
 'redesign-brief': 'exec-452bf4b7-e6e3-4c3a-8548-fc082b3647d9.png',
 'local-search': 'exec-e4e4a11e-8f1b-484c-bf1b-e8186e1bcd4e.png',
 'seo-report': 'exec-9ec2ffce-4d53-4f93-b0f8-be4a8cab088c.png',
 'website-migration': 'exec-793fc18d-37ec-4447-be02-e704067d65be.png',
 'custom-or-template': 'exec-0328a29f-61a5-4e1e-83e2-2a774889000b.png'
}
target = root / 'src/assets/editorial'
originals = root / 'output/editorial-assets/clear-concepts'
target.mkdir(parents=True, exist_ok=True)
originals.mkdir(parents=True, exist_ok=True)
for name, source in sources.items():
    original = originals / (name + '.png')
    if not original.exists():
        copyfile(generated / source, original)
    with Image.open(original) as image:
        for width in [640, 1200]:
            resized = image.convert('RGB').resize((width, round(width * image.height / image.width)), Image.Resampling.LANCZOS)
            output = target / f'{name}-{width}.webp'
            resized.save(output, 'WEBP', quality=78, method=6)
            print(output.name, output.stat().st_size)
