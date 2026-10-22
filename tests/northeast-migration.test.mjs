import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {journeyPageKey} from '../src/journey-page-key.mjs';
import worker from '../deployment/worker.mjs';

const fixture=JSON.parse(await readFile(new URL('fixtures/northeast-expected-areas.json',import.meta.url),'utf8'));
const routes=fixture.states.flatMap(s=>[`/areas/${s.id}/`,...s.areas.map(a=>`/areas/${s.id}/${a.slug}-${s.id==='connecticut'?'planning-region':'county'}/`)]);
const northern=JSON.parse(await readFile(new URL('fixtures/northern-expected-areas.json',import.meta.url),'utf8'));
const allAddedRoutes=[...routes,...northern.states.flatMap(s=>[`/areas/${s.id}/`,...s.areas.map(a=>`/areas/${s.id}/${a.slug}${a.areaType==='Independent City'?'':'-county'}/`)])];
const directory=new URL('../deployment/migrations/',import.meta.url);
const names=(await readdir(directory)).filter(n=>n.endsWith('.sql')&&n<'0018').sort();
const previous=await Promise.all(names.map(n=>readFile(new URL(n,directory),'utf8')));
const migration=await readFile(new URL('0018_journey_northeast.sql',directory),'utf8');
const allowed=(sql,field)=>[...sql.match(new RegExp(`CHECK\\(${field} IN \\(([^)]+)\\)\\)`))[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
const priorJourney=previous.findLast(sql=>sql.includes('CREATE TABLE journey_counts'));
function database(t){const db=new DatabaseSync(':memory:');db.exec(previous.join('\n'));t.after(()=>db.close());return db;}

test('0018 adds exactly 125 route keys without widening any other journey dimension',()=>{
 assert.equal(routes.length,72);
 for(const field of ['event','service','source'])assert.deepEqual(allowed(migration,field),allowed(priorJourney,field),field);
 const before=allowed(priorJourney,'page'),after=allowed(migration,'page');
 assert.equal(before.length,291);assert.equal(after.length,416);assert.equal(new Set(after).size,416);
 assert.equal(allAddedRoutes.length,125);
 assert.deepEqual(after.filter(p=>!before.includes(p)).sort(),allAddedRoutes.map(journeyPageKey).sort());
 assert.deepEqual(after.filter(p=>before.includes(p)),before);
});

test('0018 preserves every old page/source row, counts, inquiry delivery records and operational attention',t=>{
 const db=database(t),pages=allowed(priorJourney,'page'),sources=allowed(priorJourney,'source');
 const events=allowed(priorJourney,'event'),services=allowed(priorJourney,'service');
 const insert=db.prepare('INSERT INTO journey_counts VALUES(?,?,?,?,?,?)');let i=0;
 for(const page of pages)for(const source of sources){insert.run('2026-10-21',events[i%events.length],services[i%services.length],page,source,[0,1000000,37][i%3]);i++;}
 db.prepare("INSERT INTO inquiries(id,created_at,payload,dedupe_key,synthetic,delivery_status,attempts,first_attempt_at,notification_payload) VALUES(?,?,?,?,0,'manual_review',4,?,?)").run('northeast-synthetic',1234,'{"unchanged":"é & < >"}','northeast-synthetic',1235,'{"request":"frozen"}');
 db.prepare("INSERT INTO inquiry_delivery_resolutions VALUES(?,?,'handled_manually',?)").run('northeast-synthetic',1236,'synthetic-review');
 db.prepare('INSERT INTO operation_attention VALUES(?,?,?,?,?,?,?)').run('inquiry_receipt_failed',9,100,200,4,150,190);
 const tables=['journey_counts','inquiries','inquiry_delivery_resolutions','operation_attention'];
 const snapshots=tables.map(table=>db.prepare(`SELECT * FROM ${table}`).all());
 const columns=db.prepare('PRAGMA table_info(journey_counts)').all();
 db.exec(migration);
 tables.forEach((table,index)=>assert.deepEqual(db.prepare(`SELECT * FROM ${table}`).all(),snapshots[index],table));
 assert.deepEqual(db.prepare('PRAGMA table_info(journey_counts)').all(),columns);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM journey_counts').get().n,pages.length*sources.length);
 assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 assert.match(db.prepare("SELECT sql FROM sqlite_master WHERE name='journey_counts'").get().sql,/WITHOUT ROWID/);
});

test('0018 retains defaults, capped legacy upserts and rejection of invalid dimensions or totals',t=>{
 const db=database(t);db.exec(migration);
 const legacy=db.prepare('INSERT INTO journey_counts(day,event,service,page,source,total) VALUES(?,?,?,?,?,1) ON CONFLICT(day,event,service,page,source) DO UPDATE SET total=MIN(total+1,1000000)');
 const args=['2026-10-21','page_view','unsure','home','direct'];legacy.run(...args);legacy.run(...args);
 assert.equal(db.prepare("SELECT total FROM journey_counts WHERE page='home'").get().total,2);
 db.exec("UPDATE journey_counts SET total=1000000 WHERE page='home'");legacy.run(...args);
 assert.equal(db.prepare("SELECT total FROM journey_counts WHERE page='home'").get().total,1000000);
 db.prepare('INSERT INTO journey_counts(day,event,service,page,total) VALUES(?,?,?,?,?)').run('2026-10-21','page_view','unsure','pricing',7);
 assert.equal(db.prepare("SELECT source FROM journey_counts WHERE page='pricing'").get().source,'not_recorded');
 const key=journeyPageKey(routes[0]);
 for(const invalid of [['unknown_event','unsure',key,'direct',1],['page_view','unknown_service',key,'direct',1],['page_view','unsure','areas_connecticut_hartford_county','direct',1],['page_view','unsure',key,'unknown_source',1],['page_view','unsure',key,'direct',-1],['page_view','unsure',key,'direct',1000001]]){
  assert.throws(()=>db.prepare('INSERT INTO journey_counts VALUES(?,?,?,?,?,?)').run('2026-10-22',...invalid));
 }
});

test('all 72 new pages record anonymous Worker aggregates against 0018 without creating inquiries',async t=>{
 const sqlite=database(t);sqlite.exec(migration);
 const DB={prepare(sql){const build=values=>({bind:(...next)=>build(next),async first(){return sqlite.prepare(sql).get(...values)||null;},async all(){return{results:sqlite.prepare(sql).all(...values)};},async run(){return{meta:sqlite.prepare(sql).run(...values)};}});return build([]);}};
 const env={DB,ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',JOURNEY_COUNTS:'aggregate',FINGERPRINT_SECRET:'synthetic-northeast-secret-over-32-characters'};
 // Use independent synthetic visitors so the route inventory does not hit the per-visitor rate limit.
 for(const [index,route] of routes.entries()){
  const page=journeyPageKey(route),request=new Request('https://example.test/api/journey-counts',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.'+(index+1)},body:JSON.stringify({event:'page_view',service:'unsure',page,source:'direct'})});
  assert.equal((await worker.fetch(request,env,{})).status,204,route);
  assert.equal(sqlite.prepare('SELECT total FROM journey_counts WHERE page=?').get(page).total,1,route);
 }
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM journey_counts').get().n,72);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n,0);
});
