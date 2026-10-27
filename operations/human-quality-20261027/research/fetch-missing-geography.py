"""Fetch public Census address matches for previously asserted county checks.
No editorial scoring or website changes. Inspect the captured matches before use.
"""
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen
from concurrent.futures import ThreadPoolExecutor
import json,hashlib,datetime
root=Path(__file__).resolve().parents[3]
out=root/'evidence/human-quality-20261027/geography-rechecks'
out.mkdir(parents=True,exist_ok=True)
queries=[
 ('texas/llano','604 West Young Street, Llano TX'),
 ('texas/lynn','374 FM 1317, Tahoka TX'),
 ('texas/martin','2187 County Road B3651, Stanton TX'),
 ('texas/maverick','3295 Bob Rogers Drive, Eagle Pass TX'),
 ('texas/milam-event','9112 North FM 908, Rockdale TX'),
 ('texas/milam-rv','9119 North FM 908, Rockdale TX'),
 ('texas/palo-pinto','2375 Indian Creek Road, Mineral Wells TX'),
 ('texas/real','144 Ranch Road 337 East, Leakey TX'),
 ('texas/reeves','9207 TX-17, Toyahvale TX'),
 ('texas/sabine','375 Sabine Street, Hemphill TX'),
 ('texas/san-augustine','701 South Broadway Street, San Augustine TX'),
 ('texas/san-jacinto','301 FM 2025, Coldspring TX'),
 ('texas/san-saba','723 County Road 102, San Saba TX'),
 ('colorado/gunnison','19 Emmons Road, Mount Crested Butte CO'),
 ('colorado/kiowa-clinic','1211 Luther Street, Eads CO'),
 ('colorado/kiowa-hospital','1208 Luther Street, Eads CO'),
]
def fetch(item):
 key,address=item
 url='https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?'+urlencode(dict(address=address,benchmark='Public_AR_Current',vintage='Current_Current',format='json'))
 record=dict(key=key,address=address,url=url,retrievedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
 try:
  with urlopen(url,timeout=25) as response:raw=response.read();record['status']=response.status
  filename=key.replace('/','-')+'.json';(out/filename).write_bytes(raw)
  record.update(rawPath=filename,sha256=hashlib.sha256(raw).hexdigest(),matches=[dict(address=m['matchedAddress'],counties=[dict(name=c['NAME'],geoid=c['GEOID']) for c in m.get('geographies',{}).get('Counties',[])]) for m in json.loads(raw)['result']['addressMatches']])
 except Exception as e:record['error']=str(e)
 return record
with ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(fetch,queries))
(out/'manifest.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8')
for r in results:print(json.dumps({k:r[k] for k in ['key','matches','error'] if k in r}))
