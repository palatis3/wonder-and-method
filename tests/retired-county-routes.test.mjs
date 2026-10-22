import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {retiredCountyRoutes} from '../deployment/retired-county-routes.mjs';
import {journeyPages} from '../deployment/journey-dimensions.mjs';
import {journeyPageKey} from '../src/journey-page-key.mjs';
import pageDates from '../config/page-dates.json' with {type:'json'};
import worker from '../deployment/worker.mjs';

const historicStates={'new-york':61,pennsylvania:67,ohio:88,'new-jersey':21,connecticut:9,massachusetts:14,delaware:3,'rhode-island':5,vermont:14,maine:16,maryland:24,'new-hampshire':10};

test('the explicit retirement map covers all 332 former pages with a real state and county anchor',async()=>{
 const {serviceStates}=await import('../src/service-area-directory.mjs');
 assert.equal(Object.keys(retiredCountyRoutes).length,332);
 assert.ok(Object.isFrozen(retiredCountyRoutes));
 const expected={};
 for(const [id,total] of Object.entries(historicStates)){
  const state=serviceStates.find(item=>item.id===id);assert.ok(state,id);
  const counties=state.counties.filter(county=>id!=='new-york'||county.slug!=='erie');assert.equal(counties.length,total,id);
  for(const county of counties){
   const oldPath=county.path||`/areas/${id==='new-york'?'':id+'/'}${county.slug}${county.areaType==='Independent City'?'':county.areaType==='Planning Region'?'-planning-region':'-county'}/`;
   expected[oldPath]=state.path+'#'+county.slug;
   assert.ok(Object.hasOwn(pageDates,state.path),state.path);
   assert.ok(!Object.hasOwn(pageDates,oldPath),oldPath+' must not remain an active page date');
  }
 }
 assert.deepEqual(retiredCountyRoutes,expected);
 assert.ok(Object.hasOwn(pageDates,'/areas/erie-county/'));
 assert.ok(!Object.hasOwn(retiredCountyRoutes,'/areas/erie-county/'));
 for(const state of serviceStates.filter(state=>!Object.hasOwn(historicStates,state.id)))assert.ok(!Object.values(retiredCountyRoutes).some(target=>target.startsWith(state.path+'#')),state.id);
});

test('retiring public pages preserves all 428 fixed analytics dimensions and accepts historical events',async t=>{
 const directory=new URL('../deployment/migrations/',import.meta.url);
 const names=(await readdir(directory)).filter(name=>/^\d{4}.*\.sql$/.test(name)&&Number(name.slice(0,4))<=20).sort();
 const migrations=await Promise.all(names.map(name=>readFile(new URL(name,directory),'utf8')));
 assert.match(names.at(-1),/^0020_/);
 const match=migrations.at(-1).match(/page TEXT NOT NULL CHECK\(page IN \(([^)]+)\)\)/);
 const fixed=[...match[1].matchAll(/'([^']+)'/g)].map(item=>item[1]);
 assert.equal(fixed.length,428);assert.deepEqual([...journeyPages].sort(),fixed.sort());
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());db.exec(migrations.join('\n'));
 const DB={prepare(sql){const build=values=>({bind:(...next)=>build(next),async first(){return db.prepare(sql).get(...values)||null;},async run(){return {meta:db.prepare(sql).run(...values)};}});return build([]);}};
 const env={DB,ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',JOURNEY_COUNTS:'aggregate',PUBLIC_ORIGIN:'https://wonderandmethod.com',FINGERPRINT_SECRET:'synthetic-historical-analytics-secret'};
 for(const [index,path] of Object.keys(retiredCountyRoutes).entries()){
  const page=journeyPageKey(path);
  assert.ok(journeyPages.has(page),page);
  const request=new Request('https://wonderandmethod.com/api/journey-counts',{method:'POST',headers:{Origin:'https://wonderandmethod.com','Content-Type':'application/json','User-Agent':'Synthetic browser fixture','CF-Connecting-IP':`198.51.${Math.floor(index/256)}.${index%256}`},body:JSON.stringify({event:'page_view',page,service:'unsure',source:'direct'})});
  const response=await worker.fetch(request,env,{});
  assert.equal(response.status,204,path);assert.equal(response.headers.get('Location'),null,path);
  assert.equal(db.prepare('SELECT total FROM journey_counts WHERE page=?').get(page).total,1,page);
 }
 assert.equal(db.prepare('SELECT count(*) AS count FROM journey_counts').get().count,332);
 const rejected=await worker.fetch(new Request('https://wonderandmethod.com/api/journey-counts',{method:'POST',headers:{Origin:'https://wonderandmethod.com','Content-Type':'application/json'},body:JSON.stringify({event:'page_view',page:'areas_invented_county',service:'unsure',source:'direct'})}),env,{});
 assert.equal(rejected.status,400);assert.equal(db.prepare('SELECT count(*) AS count FROM journey_counts').get().count,332);
});
