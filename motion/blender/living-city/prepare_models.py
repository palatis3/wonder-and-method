"""Fetch verified CC0 model libraries and textures without executing them."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib,json,urllib.request
ROOT=Path(__file__).resolve().parents[3]
SOURCE=json.loads((Path(__file__).parent/'model-sources.json').read_text())
DEST=ROOT/'output/living-city/models'
def fetch(record):
    path=DEST/record['relative_path'];path.parent.mkdir(parents=True,exist_ok=True)
    if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest()!=record['sha256']:
        request=urllib.request.Request(record['url'],headers={'User-Agent':'WonderAndMethod-LivingCity/1.0 (one-time CC0 scene preparation)'})
        with urllib.request.urlopen(request,timeout=120) as response:data=response.read()
        if hashlib.sha256(data).hexdigest()!=record['sha256']:raise RuntimeError('Hash mismatch: '+record['relative_path'])
        path.write_bytes(data)
    return record['relative_path']
if __name__=='__main__':
    with ThreadPoolExecutor(max_workers=4) as pool:
        for name in pool.map(fetch,[f for a in SOURCE['assets'] for f in a['files']]):print('Verified',name)
    (DEST/'assets.json').write_text(json.dumps(SOURCE,indent=2))
