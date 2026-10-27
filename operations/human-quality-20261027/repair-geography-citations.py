"""Apply individually selected sources for 41 diagnosed citation omissions.
No source novelty, content-quality score or release acceptance is inferred.
"""
import json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[2]
path=root/'src/location-service-data.json'
entries=json.loads(path.read_text(encoding='utf-8'));byroute={x['path']:x for x in entries}
changes={};before={}
def touch(route):
 if route not in before:before[route]=json.loads(json.dumps(byroute[route]))
 changes.setdefault(route,[])
 return byroute[route]
def add(route,url,label,observation,evidence):
 e=touch(route)
 if any(x['url']==url for x in e['sources']):raise ValueError('Already linked '+route+' '+url)
 e['sources'].append(dict(url=url,label=label,observation=observation))
 changes[route].append(dict(url=url,evidence=evidence))
def replace(route,old,new):
 e=touch(route)
 if old not in e['coverageNote']:raise ValueError('Coverage changed '+route)
 e['coverageNote']=e['coverageNote'].replace(old,new)
ak=root/'evidence/wy-hi-ak-expansion-20261026/ak-002'
receipts={x['id']:x for x in json.loads((ak/'source-receipt-index.json').read_text(encoding='utf-8'))}
akmap=[('haines-borough','haines','Haines Borough'),('hoonah-angoon-census-area','hoonah','Hoonah-Angoon Census Area'),('juneau-city-and-borough','juneau','City and Borough of Juneau'),('kenai-peninsula-borough','seward','Kenai Peninsula Borough'),('ketchikan-gateway-borough','ketchikan','Ketchikan Gateway Borough'),('kodiak-island-borough','kodiak','Kodiak Island Borough'),('kusilvak-census-area','kusilvak','Kusilvak Census Area'),('lake-and-peninsula-borough','lake','Lake and Peninsula Borough'),('matanuska-susitna-borough','talkeetna','Matanuska-Susitna Borough')]
for slug,key,area in akmap:
 r=receipts[key+'-locality'];raw=(ak/r['textPath']).read_bytes()
 if hashlib.sha256(raw).hexdigest()!=r['textSha256']:raise ValueError('Receipt hash '+key)
 label=('City of Emmonak: census-area location' if key=='kusilvak' else 'Lake and Peninsula Borough: Port Alsworth' if key=='lake' else 'University of Alaska: '+key.title()+' community geography')
 add('/areas/alaska/'+slug+'/',r['url'],label,'Identifies the named community in '+area+'.',dict(receipt=str((ak/r['textPath']).relative_to(root)),sha256=r['textSha256'],readScope=r['readScope'],review='Root read the relevant geographic relationship; reuse unchanged dated receipt, not a new live check.'))
ca=root/'evidence/ca-nm-expansion-20261026/ca-002'
for county in ['lake','los-angeles','madera','marin','mendocino','merced','modoc','mono','monterey','napa','nevada']:
 meta=json.loads((ca/'receipts'/f'{county}-geocoder.json').read_text(encoding='utf-8'))
 raw=json.loads((ca/'receipts'/f'{county}-geocoder.txt').read_text(encoding='utf-8'))
 matches=raw['result']['addressMatches'];expected=county.replace('-',' ').title()+' County'
 if len(matches)!=1 or matches[0]['geographies']['Counties'][0]['NAME']!=expected:raise ValueError('County mismatch '+county)
 add('/areas/california/'+county+'-county/',meta['url'],'US Census: '+expected+' address match','Matches the published business address to '+expected+'.',dict(receipt=str((ca/'receipts'/f'{county}-geocoder.txt').relative_to(root)),matchedAddress=matches[0]['matchedAddress'],county=expected,review='Saved exact address result inspected; no new source fetch.'))
add('/areas/california/kern-county/','https://ceqanet.lci.ca.gov/2008121030','California CEQAnet: Meadows Field location','The airport project record identifies Bakersfield and Kern County.',dict(receipt='evidence/ca-nm-expansion-20261026/ca-002/receipts/kern-airport-local.txt',review='Root inspected Location: Cities Bakersfield; Counties Kern. Historical record used only for geography.'))
geo=root/'evidence/human-quality-20261027/geography-rechecks'
for r in json.loads((geo/'manifest.json').read_text(encoding='utf-8')):
 if not r.get('matches'):continue
 key=r['key'];key=key.replace('milam-event','milam').replace('milam-rv','milam').replace('kiowa-clinic','kiowa').replace('kiowa-hospital','kiowa')
 match=r['matches'];expected=key.split('/')[1].replace('-',' ').title()+' County'
 if len(match)!=1 or [x['name'] for x in match[0]['counties']]!=[expected]:raise ValueError('Unexpected geography '+key)
 add('/areas/'+key+'-county/',r['url'],'US Census: '+r['address'].split(',')[0]+' county match','Matches the published address to '+expected+'.',dict(receipt='evidence/human-quality-20261027/geography-rechecks/'+r['rawPath'],sha256=r['sha256'],matchedAddress=match[0]['address'],county=expected,review='Fresh public Census result, checked October 27, 2026.'))
r=next(x for x in json.loads((geo/'library-census-manifest.json').read_text(encoding='utf-8')) if x['key']=='refugio')
assert r['matches'][0]['counties']==['Refugio County']
add('/areas/texas/refugio-county/',r['url'],'US Census: Refugio library address','Matches 815 Commerce Street to Refugio County.',dict(receipt='evidence/human-quality-20261027/geography-rechecks/refugio-library.json',review='Fresh public Census result inspected. State directory query returned a server error; its old process assertion is replaced.'))
replace('/areas/texas/refugio-county/','The Texas State Library directory independently lists the matching library and telephone in Refugio County.','The US Census address match places 815 Commerce Street in Refugio County.')
selected=[
 ('/areas/arkansas/newton-county/','https://newtoncountychamber.com/directory/buffalo-outdoor-center/','Newton County Chamber: Buffalo Outdoor Center','Lists the business at 4699 AR 43 Highway in Ponca.','Direct page read; corroborates the named operator and address. County activity listing supplies the surrounding context.'),
 ('/areas/texas/marion-county/','https://www.loc.gov/pictures/item/tx0486/','Library of Congress: House of the Seasons location','Identifies 409 South Alley Street, Jefferson, Marion County.','Official indexed HABS item read; historical source used only for physical location.'),
 ('/areas/texas/mason-county/','https://atlas.thc.texas.gov/Details/5319011293','Texas Historical Commission: Seaquist Home','Identifies the landmark on Broad Street in Mason County.','Direct record and indexed table inspected. Historical marker address 400 differs from operator 405; only street and county used.'),
 ('/areas/texas/reeves-county/','https://tpwd.texas.gov/business/feedback/meetings/2025/0821/agenda/item.phtml?item=2','Texas Parks and Wildlife: park county list','Lists Balmorhea State Park in Reeves County.','Official indexed 2026–2027 park-list exhibit read. Used for county identity only, not present operating status. Census street query returned no match.'),
 ('/areas/texas/san-jacinto-county/','https://www.fs.usda.gov/sites/default/files/2022-06/GAOA-FY22-LRF-Projects.pdf','US Forest Service: Double Lake county location','The 2022 project list identifies Double Lake Recreation Area in San Jacinto County.','PDF page15 row inspected: NFS in Texas, Double Lake Recreation Area Rehabilitation, TX–San Jacinto. Historical location evidence only; no current construction or availability claim.'),
 ('/areas/texas/san-saba-county/','https://sansabatexas.com/come-golf-the-hill-country/','City of San Saba: golf course and adjacent RV park','Describes the golf course outside the city and the adjacent San Saba River RV Park.','Official city page read; establishes property relationship and outside-city location, not a Census street match.'),
 ('/areas/texas/san-saba-county/','https://www.hillcountryportal.com/hillcountry-swimming-holes.html','Hill Country Portal: San Saba County listing','Lists San Saba River RV Park in San Saba County and links the operator.','Independent regional directory location heading inspected and matched by park name, operator link and phone. Secondary corroboration only; other amenities, access claims and coordinates not adopted.')
]
for route,url,label,obs,evidence in selected:add(route,url,label,obs,dict(checkedAt='2026-10-27',review=evidence))
replace('/areas/texas/reeves-county/','independently verified in Reeves County','listed in Reeves County in the Texas Parks and Wildlife park inventory')
replace('/areas/texas/san-jacinto-county/','its location was independently checked in San Jacinto County','the US Forest Service’s project list identifies the recreation area in San Jacinto County')
replace('/areas/texas/san-saba-county/','the park location was independently checked in San Saba County','the city describes its location beside the golf course outside city limits, and Hill Country Portal lists the park in San Saba County')
replace('/areas/texas/red-river-county/','Lennox Woods Preserve is north of Clarksville in Red River County; the public trail location was independently checked.','The Nature Conservancy identifies Lennox Woods Preserve north of Clarksville in Red River County.')
e=touch('/areas/texas/red-river-county/');e['sources'][0]['observation']+=' Its location section expressly identifies Red River County.'
changes[e['path']].append(dict(url=e['sources'][0]['url'],evidence='Operator location and directions sections read directly; remove unnecessary independent-verification process claim.'))
replace('/areas/texas/rockwall-county/','Rockwall County Library lists 1215 East Yellowjacket Lane in Rockwall; the state library directory independently identifies Rockwall County.','Rockwall County’s own library page lists 1215 East Yellowjacket Lane in Rockwall.')
changes['/areas/texas/rockwall-county/'].append(dict(url=byroute['/areas/texas/rockwall-county/']['sources'][0]['url'],evidence='Retain county government’s own library identity and address, remove unsupported separate-directory process assertion. Census query returned no match; no match claimed.'))
assert len(changes)==41,len(changes)
out=root/'output/human-quality-20261027/geography-citation-repairs';out.mkdir(parents=True,exist_ok=True)
with (out/'before.json').open('x',encoding='utf-8') as f:json.dump(before,f,ensure_ascii=False,indent=2);f.write('\n')
path.write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(out/'review-routes.json').write_text(json.dumps(sorted(changes),indent=2)+'\n',encoding='utf-8')
record=dict(date='2026-10-27',status='Citation and coverage corrections staged for independent review; no content scores assigned.',changes=[dict(route=k,repairs=v) for k,v in sorted(changes.items())])
(root/'operations/human-quality-20261027/research/geography-citation-repairs.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(changedRoutes=len(changes),independentReviewPending=True)))
