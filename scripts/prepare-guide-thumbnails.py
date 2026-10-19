"""Resize the existing guide artwork into card-only WebP derivatives.
Run from the repository root. Full article and archival assets are untouched.
"""
from pathlib import Path
import json
import subprocess
from PIL import Image

root = Path(__file__).resolve().parents[1]
module = "import {journal} from './src/journal.mjs'; console.log(JSON.stringify(journal.map(x=>({slug:x.path.split('/').filter(Boolean).at(-1),image:x.image,diagram:!!x.diagram}))));"
guides = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', module], cwd=root, text=True))
folder = root / 'src/assets/guides'
records = []
for guide in guides:
    source = folder / (guide['image']+'-thumb.png' if guide['diagram'] else guide['slug']+'-illustration-640.webp')
    with Image.open(source) as image:
        original_size = image.size
        for width in (240, 480):
            height = round(image.height * width / image.width)
            output = folder / f"{guide['slug']}-card-{width}.webp"
            resized = image.convert('RGBA').resize((width, height), Image.Resampling.LANCZOS)
            resized.save(output, 'WEBP', quality=82, method=6)
            with Image.open(output) as check:
                assert check.size == (width, height)
                assert check.format == 'WEBP'
            records.append({'source':source.name,'sourceDimensions':original_size,'sourceBytes':source.stat().st_size,'output':output.name,'width':width,'height':height,'bytes':output.stat().st_size})
print(json.dumps(records, indent=2))
