"""Fetch the recorded CC0 originals and verify their published SHA-256 hashes."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib,json,urllib.request

ROOT=Path(__file__).resolve().parents[3]
SOURCE=json.loads((Path(__file__).parent/'material-sources.json').read_text())
DEST=ROOT/'output/living-city/textures'
def fetch(record):
    path=DEST/record['relative_path'];path.parent.mkdir(parents=True,exist_ok=True)
    if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest()!=record['sha256']:
        request=urllib.request.Request(record['url'],headers={'User-Agent':'WonderAndMethod-LivingCity/1.0 (one-time CC0 scene preparation)'})
        with urllib.request.urlopen(request,timeout=90) as response:data=response.read()
        if hashlib.sha256(data).hexdigest()!=record['sha256']:raise RuntimeError('Hash mismatch: '+record['relative_path'])
        path.write_bytes(data)
    return record['relative_path']
if __name__=='__main__':
    records=[f for a in SOURCE['assets'] for f in a['files']]
    with ThreadPoolExecutor(max_workers=4) as pool:
        for name in pool.map(fetch,records):print('Verified',name)
    (DEST/'assets.json').write_text(json.dumps(SOURCE,indent=2))
