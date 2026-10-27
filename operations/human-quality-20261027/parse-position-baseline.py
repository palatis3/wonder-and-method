"""Parse saved user-visible Semrush rows, never reused checkbox names.
This is deterministic data extraction, not an SEO/editorial score.
"""
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from collections import Counter,defaultdict
import re,json,csv,hashlib
root=Path(__file__).resolve().parents[2]
private=root/'evidence/human-quality-20261027/semrush'
out=root/'output/human-quality-20261027/semrush';out.mkdir(parents=True,exist_ok=True)
rows=[];pages=[]
def number(v):
 if v in ['—','–','-','n/a','']:return None
 return float(v.replace(',','').replace('%',''))
for page in range(1,31):
 file=private/'ranking-pages'/f'page-{page:02d}.ax.txt';raw=file.read_bytes();s=raw.decode('utf-8')
 starts=list(re.finditer(r'^(\t*)\d+ row ID: .*?-\d+-toggle\s*$',s,re.M))
 expected=44 if page==30 else 50
 assert len(starts)==expected,(page,len(starts))
 assert f'{(page-1)*50+1}-{min(page*50,1494)} (1,494)' in s,page
 for i,m in enumerate(starts):
  block=s[m.end():starts[i+1].start() if i+1<len(starts) else s.index('navigation Pagination',m.end())]
  link=re.search(r'link Filter results by (.*?) Value: (https://[^\s]+)',block);assert link,(page,i)
  keyword=link[1];encoded=parse_qs(urlparse(link[2]).query)['filter'][0]
  assert encoded=='+|Ph|Eq|'+keyword,(keyword,encoded)
  cells=[]
  for line in block.splitlines():
   v=re.match(r'^(\t*)\d+ item(?: (.*))?$',line)
   if v and len(v[1])==len(m[1])+1:cells.append(v[2] or '')
  assert len(cells)==18,(page,i,len(cells))
  assert cells[1]=='Select '+keyword and cells[2]=='Filter results by '+keyword+' Add tag to '+keyword,(page,i,cells[:3])
  landing=re.search(r'link Go to URL (https://[^\s]+) Description: Open landing page Value: (https://[^\s]+)',block)
  if landing:assert landing[1]==landing[2]
  row=dict(keyword=keyword,page=page,row=i+1,intent=cells[3],serpFeatures=(0 if cells[4]=='Go to SERP for '+keyword+' 0' else int(re.search(r'SERP features on SERP: (\d+)',cells[4])[1])),keywordDifficulty=number(cells[5]),potentialTraffic=number(cells[6]),growthPotential=number(cells[7]),positionOct25=number(cells[8]),positionOct27=number(cells[9]),positionDifferenceRaw=cells[10],visibilityPercent=number(cells[11]),visibilityDifferenceRaw=cells[12],estimatedTraffic=number(cells[13]),trafficDifferenceRaw=cells[14],volume=number(cells[15]),cpcUsd=number(cells[16]),landingUrl=landing[1] if landing else None,sourceFile=str(file.relative_to(root)),rawCells=cells)
  if row['positionOct27'] is not None:assert 1<=row['positionOct27']<=100 and landing,row
  rows.append(row)
 pages.append(dict(page=page,rows=expected,sha256=hashlib.sha256(raw).hexdigest(),file=str(file.relative_to(root))))
assert len(rows)==1494 and len({r['keyword'] for r in rows})==1494
expected=set((private/'tracking-additions.txt').read_text(encoding='utf-8').splitlines())|{'wonderandmethod.com'}
assert {r['keyword'] for r in rows}==expected,dict(missing=list(expected-{r['keyword'] for r in rows}),extra=list({r['keyword'] for r in rows}-expected))
ranked=[r for r in rows if r['positionOct27'] is not None]
byurl=defaultdict(list)
for r in ranked:byurl[r['landingUrl']].append(dict(keyword=r['keyword'],position=r['positionOct27'],volume=r['volume']))
hist=Counter('1-3' if r['positionOct27']<=3 else '4-10' if r['positionOct27']<=10 else '11-20' if r['positionOct27']<=20 else '21-50' if r['positionOct27']<=50 else '51-100' for r in ranked)
summary=dict(capturedDate='2026-10-27',campaign='31733218_5694434',engine='Google',country='United States',device='Desktop',comparisonDates=['2026-10-25','2026-10-27'],method='Thirty authenticated browser accessibility snapshots, 50 rows per page and44 on final page. Current filter-link keyword, matching row item and decoded filter parameter verified. Recycled checkbox labels ignored.',keywords=len(rows),rankedTop100=len(ranked),notRankedTop100=len(rows)-len(ranked),rankBuckets=dict(hist),uniqueRankedLandingUrls=len(byurl),positiveVolumeKeywords=sum((r['volume'] or 0)>0 for r in rows),zeroVolumeKeywords=sum(r['volume']==0 for r in rows),unknownVolumeKeywords=sum(r['volume'] is None for r in rows),keywordImportReconciled=True,exportLimitation='UI export prompted for a subscription upgrade. No purchase or export was performed; accessible rows collected instead.',limits=['Semrush positions and volumes are estimates for this campaign, not Search Console traffic or verified business outcomes.','A dash is not rank zero. It is preserved as null and counted as no top100 position reported.','One reported URL per keyword does not establish the absence of cannibalization.','This is a baseline for the currently deployed site; uncommitted editorial revisions did not cause these rankings.'],pages=pages,landingPages=[dict(url=url,keywords=values) for url,values in sorted(byurl.items())])
(out/'position-baseline.json').write_text(json.dumps(dict(summary=summary,rows=rows),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with (out/'position-baseline.csv').open('w',encoding='utf-8-sig',newline='') as f:
 keys=[k for k in rows[0] if k!='rawCells'];w=csv.DictWriter(f,fieldnames=keys,extrasaction='ignore');w.writeheader();w.writerows(rows)
(root/'operations/human-quality-20261027/position-baseline-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:summary[k] for k in ['keywords','rankedTop100','notRankedTop100','rankBuckets','uniqueRankedLandingUrls','positiveVolumeKeywords','zeroVolumeKeywords','keywordImportReconciled']}))
