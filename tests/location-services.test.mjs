import wyHiAkPaths from './fixtures/wy-hi-ak-approved-paths.json' with {type:'json'};
import idMtPaths from './fixtures/id-mt-approved-paths.json' with {type:'json'};
import coUtPrPaths from './fixtures/co-ut-pr-approved-paths.json' with {type:'json'};
import nvWaPaths from './fixtures/nv-wa-approved-paths.json' with {type:'json'};
import azOrPaths from './fixtures/az-or-approved-paths.json' with {type:'json'};
import caNmPaths from './fixtures/ca-nm-approved-paths.json' with {type:'json'};
import ksNePaths from './fixtures/ks-ne-approved-paths.json' with {type:'json'};
import ndSdPaths from './fixtures/nd-sd-approved-paths.json' with {type:'json'};
import mnOkPaths from './fixtures/mn-ok-approved-paths.json' with {type:'json'};
import moIaPaths from './fixtures/mo-ia-approved-paths.json' with {type:'json'};
import texasPaths from './fixtures/texas-approved-paths.json' with {type:'json'};
import countyDepth from './fixtures/county-depth-approved-paths.json' with {type:'json'};
import wiIlPaths from './fixtures/wi-il-approved-paths.json' with {type:'json'};
import msAlPaths from './fixtures/ms-al-approved-paths.json' with {type:'json'};
import scPaths from './fixtures/south-carolina-approved-paths.json' with {type:'json'};
import gaPaths from './fixtures/georgia-approved-paths.json' with {type:'json'};
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {renderPages} from '../src/pages.mjs';
import {locationServicePages,locationServiceSections} from '../src/location-service-pages.mjs';
import reviewedWorksheets from '../src/location-worksheet-links.json' with {type:'json'};
import {locationServices} from '../src/location-service-index.mjs';
import {journeyPages} from '../deployment/journey-dimensions.mjs';
import {journeyPageKey} from '../src/journey-page-key.mjs';
import worker from '../deployment/worker.mjs';
import approvedPaths from './fixtures/location-release-paths.json' with {type:'json'};
import followupPaths from './fixtures/location-followup-paths.json' with {type:'json'};
import nextPaths from './fixtures/location-next-paths.json' with {type:'json'};
import waveOnePaths from './fixtures/location-wave-one-paths.json' with {type:'json'};
import waveTwoPaths from './fixtures/location-wave-two-paths.json' with {type:'json'};
import waveThreePaths from './fixtures/location-wave-three-paths.json' with {type:'json'};
import waveFourPaths from './fixtures/location-wave-four-paths.json' with {type:'json'};
import historicPaths from './fixtures/historic-county-routes.json' with {type:'json'};
import config from '../config/site.json' with {type:'json'};
import offers from '../config/offers.json' with {type:'json'};
import map from '../authority/v5/site-map.json' with {type:'json'};
import geography from '../authority/v5/geography.json' with {type:'json'};

test('2266 approved commercial pages preserve 2276 directory identities, truthful provider schema and legacy worksheets',async()=>{
 assert.equal(approvedPaths.length,59);assert.equal(followupPaths.length,6);assert.equal(nextPaths.length,8);assert.equal(waveOnePaths.length,48);assert.equal(waveTwoPaths.length,144);assert.equal(waveThreePaths.length,192);assert.equal(waveFourPaths.length,611);
 assert.deepEqual(locationServices.map(entry=>entry.path).sort(),[...wyHiAkPaths.slice(3),...idMtPaths.slice(2),...coUtPrPaths.slice(3),...nvWaPaths.slice(2),...azOrPaths.slice(2),...caNmPaths.slice(2),...ksNePaths.slice(2),...ndSdPaths.slice(2),...mnOkPaths.slice(2),...moIaPaths.slice(2),...texasPaths.slice(1),...countyDepth,...wiIlPaths.slice(2),...msAlPaths.filter(path=>path!=='/areas/mississippi/'&&path!=='/areas/alabama/'),...approvedPaths,...followupPaths,...nextPaths,...waveOnePaths,...waveTwoPaths,...waveThreePaths,...waveFourPaths,...scPaths.filter(p=>p!=='/areas/south-carolina/'),...gaPaths.filter(p=>p!=='/areas/georgia/')].sort());
 const areaIds=locationServices.flatMap(entry=>entry.areaIds);assert.equal(areaIds.length,2276);assert.equal(new Set(areaIds).size,2276);
 const pages=renderPages({config,offers,map,geography}),byPath=new Map(pages.map(page=>[page.path,page]));
 assert.equal(Object.keys(reviewedWorksheets).length,72);
 assert.equal(locationServices.filter(entry=>entry.legacyWorksheet&&reviewedWorksheets[entry.areaId]===entry.legacyWorksheet).length,71);
 for(const entry of locationServices){
  const page=byPath.get(entry.path);assert.ok(page,entry.path);
  const schema=JSON.parse(page.html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  const service=schema.filter(node=>node['@type']==='Service');assert.equal(service.length,1,entry.path);
  assert.deepEqual(service[0].areaServed.map(area=>area.name),entry.servedAreas.map(area=>area.type==='Federal District'?area.name:area.name+', '+area.state));
  assert.equal(service[0].provider['@id'],config.origin+'/#studio');
  assert.equal(schema.find(node=>node['@type']==='Organization').location.address.addressLocality,'Buffalo');
  assert.ok(!schema.some(node=>node['@type']==='LocalBusiness'),entry.path);
  assert.ok(entry.sources.length>=1,entry.path+' source evidence');
  for(const link of entry.directoryLinks){const [path,id]=link.path.split('#');assert.ok(byPath.get(path).html.includes(`id="${id}"`),link.path);assert.ok(byPath.get(path).html.includes(`href="${entry.path}"`),entry.path+' discoverability');}
  assert.match(page.html,/online from Buffalo/);assert.match(page.html,/not studio projects, clients or endorsements/);
  for(const id of ['buyer-task','approach','search'])assert.ok(page.html.includes(`id="${id}"`),entry.path+'#'+id);
  if(historicPaths[entry.path]){
   assert.ok(entry.legacyWorksheet,entry.path);
   assert.equal(page.html.includes(entry.legacyWorksheet),reviewedWorksheets[entry.areaId]===entry.legacyWorksheet,entry.path+' reviewed worksheet availability');
   assert.ok((await readFile(new URL('../src'+entry.legacyWorksheet,import.meta.url),'utf8')).includes('General website planning'));
  }
 }
 for(const areaId of ['massachusetts/barnstable','massachusetts/plymouth','new-york/onondaga','pennsylvania/columbia','ohio/greene','connecticut/lower-connecticut-river-valley'])assert.equal(reviewedWorksheets[areaId],undefined,areaId+' independently reviewed mismatch');
 assert.equal(reviewedWorksheets['new-york/erie'],'/assets/county-briefs/erie.txt');
 assert.equal(reviewedWorksheets['new-york/albany'],'/assets/county-briefs/albany.txt');
 const albany=locationServices.find(entry=>entry.areaId==='new-york/albany');
 assert.ok(!locationServiceSections({...albany,legacyWorksheet:'/assets/county-briefs/onondaga.txt'},offers).includes('General website-planning worksheet (TXT)'),'a different file cannot inherit an area approval');
 const baltimore=locationServices.find(entry=>entry.path==='/areas/maryland/baltimore-area/');assert.deepEqual(baltimore.areaIds.slice().sort(),['maryland/baltimore','maryland/baltimore-city']);
 const fairfax=locationServices.find(entry=>entry.path==='/areas/virginia/fairfax-area/');assert.deepEqual(fairfax.areaIds.slice().sort(),['virginia/fairfax','virginia/fairfax-city','virginia/falls-church-city']);
 const hampton=locationServices.find(entry=>entry.path==='/areas/virginia/hampton-roads/');assert.equal(hampton.areaIds.length,8);assert.ok(hampton.coverageNote.includes('selected'));
 const changed=structuredClone(offers);changed.launch_site.public_price=1777;changed.baseline.one_time_price=477;changed.plans.keep_running.monthly_price=177;
 for(const page of locationServicePages(changed)){
  for(const value of ['$1,777','$2,350','$3,700'])assert.ok(page.body.includes(value),page.path+' '+value);
  assert.match(page.body,/href="\/pricing\/"/);assert.match(page.body,/href="\/services\/website-audit\/"/);
  assert.doesNotMatch(page.body,/\$654/,'A local build brief does not imply mandatory monthly enrollment');
 }
});

test('migration 0022 adds ten fixed page keys while retaining every old key, record and constraint',async t=>{
 const directory=new URL('../deployment/migrations/',import.meta.url);
 const names=(await readdir(directory)).filter(name=>/^\d{4}.*\.sql$/.test(name)&&Number(name.slice(0,4))<=22).sort();
 const sql=await Promise.all(names.map(name=>readFile(new URL(name,directory),'utf8')));assert.match(names.at(-1),/^0022_/);
 const allowed=(text,field)=>[...text.match(new RegExp(field+" TEXT NOT NULL(?: DEFAULT '[^']+')? CHECK\\("+field+" IN \\(([^)]+)\\)\\)"))[1].matchAll(/'([^']+)'/g)].map(match=>match[1]);
 const old=allowed(sql.at(-2),'page'),next=allowed(sql.at(-1),'page');assert.equal(old.length,429);assert.equal(next.length,439);
 const added=['areas_maryland_baltimore_area','areas_virginia_alexandria_city','areas_virginia_arlington_county','areas_virginia_charlottesville_city','areas_virginia_danville_city','areas_virginia_fairfax_area','areas_virginia_fredericksburg_city','areas_virginia_hampton_roads','areas_virginia_manassas_city','areas_virginia_richmond_city'];
 assert.deepEqual(next.filter(key=>!old.includes(key)),added);assert.ok(old.every(key=>next.includes(key)));assert.ok(next.every(key=>journeyPages.has(key)));
 for(const field of ['event','service','source'])assert.deepEqual(allowed(sql.at(-1),field),allowed(sql.at(-2),field));
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());db.exec(sql.slice(0,-1).join('\n'));
 const insert=()=>db.prepare('INSERT INTO journey_counts(day,event,service,page,source,total) VALUES(?,?,?,?,?,?)');
 for(const [index,page] of old.entries())insert().run('2026-10-22','page_view','unsure',page,'direct',index%2?1000000:0);
 db.prepare("INSERT INTO inquiries(id,created_at,payload,dedupe_key,synthetic,delivery_status,attempts,first_attempt_at,notification_payload) VALUES(?,?,?,?,0,'manual_review',4,?,?)").run('location-fixture',1234,'{"preserve":"é & < >"}','location-fixture',1235,'{"frozen":"request"}');
 db.prepare("INSERT INTO inquiry_delivery_resolutions VALUES(?,?,'handled_manually',?)").run('location-fixture',1236,'review-fixture');
 const tables=['journey_counts','inquiries','inquiry_delivery_resolutions'];
 const rows=()=>tables.map(name=>db.prepare('SELECT * FROM '+name+' ORDER BY 1,2,3').all()),before=rows();
 db.exec(sql.at(-1));assert.deepEqual(rows(),before);assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 for(const [column,value] of [['page','areas_virginia_invented_city'],['event','typed_value'],['service','arbitrary'],['source','full_referrer'],['total',-1],['total',1000001]]){const row={day:'2026-10-23',event:'page_view',service:'unsure',page:'home',source:'direct',total:1,[column]:value};assert.throws(()=>insert().run(...Object.values(row)),column);}
 assert.throws(()=>insert().run('2026-10-22','page_view','unsure','home','direct',1));
 db.prepare("INSERT INTO journey_counts(day,event,service,page,total) VALUES('2026-10-24','page_view','unsure','home',1)").run();assert.equal(db.prepare("SELECT source FROM journey_counts WHERE day='2026-10-24'").get().source,'not_recorded');
 const DB={prepare(sql){const build=values=>({bind:(...next)=>build(next),async first(){return db.prepare(sql).get(...values)||null;},async run(){return {meta:db.prepare(sql).run(...values)};}});return build([]);}};
 const env={DB,ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',JOURNEY_COUNTS:'aggregate',PUBLIC_ORIGIN:'https://wonderandmethod.com',FINGERPRINT_SECRET:'synthetic-location-analytics-secret'};
 for(const [index,page] of [...old,...added].entries()){
  const request=new Request('https://wonderandmethod.com/api/journey-counts',{method:'POST',headers:{Origin:'https://wonderandmethod.com','Content-Type':'application/json','User-Agent':'Synthetic browser fixture','CF-Connecting-IP':`198.51.${Math.floor(index/256)}.${index%256}`},body:JSON.stringify({event:'page_view',page,service:'unsure',source:'direct'})});
  assert.equal((await worker.fetch(request,env,{})).status,204,page);
 }
 assert.ok(approvedPaths.every(path=>journeyPages.has(journeyPageKey(path))));
 assert.deepEqual(db.prepare('SELECT * FROM inquiries').all(),before[1]);assert.deepEqual(db.prepare('SELECT * FROM inquiry_delivery_resolutions').all(),before[2]);
});
