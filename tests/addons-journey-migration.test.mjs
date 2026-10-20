import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {journeyPageKey} from '../src/journey-page-key.mjs';
import worker from '../deployment/worker.mjs';

const directory=new URL('../deployment/migrations/',import.meta.url);
const previousNames=(await readdir(directory)).filter(name=>/\.sql$/.test(name)&&name<'0010').sort();
const previous=await Promise.all(previousNames.map(name=>readFile(new URL(name,directory),'utf8')));
const source=await readFile(new URL('0008_journey_resource_intent.sql',directory),'utf8');
const migration=await readFile(new URL('0010_journey_website_addons.sql',directory),'utf8');
const allowed=(sql,field)=>[...sql.match(new RegExp(`CHECK\\(${field} IN \\(([^)]+)\\)\\)`))[1].matchAll(/'([^']+)'/g)].map(match=>match[1]);
const pageKey=journeyPageKey('/services/website-addons/');
function database(t){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(previous.join('\n'));t.after(()=>sqlite.close());return sqlite;
}

test('journey migration adds exactly the emitted additions key and no other dimension changes',()=>{
 assert.equal(pageKey,'services_website_addons');
 for(const field of ['event','service','source'])assert.deepEqual(allowed(migration,field),allowed(source,field));
 assert.deepEqual(allowed(migration,'page').filter(page=>page!==pageKey),allowed(source,'page'));
 assert.equal(allowed(migration,'page').filter(page=>page===pageKey).length,1);
 assert.doesNotMatch(migration,/(?:CREATE|ALTER|UPDATE|DROP|DELETE FROM|INSERT INTO)\s+(?:TABLE\s+)?inquiries\b/i);
});

test('migration preserves every historical page/source row, totals and inquiry delivery state',t=>{
 const sqlite=database(t),pages=allowed(source,'page'),sources=allowed(source,'source'),events=allowed(source,'event'),services=allowed(source,'service');
 const insert=sqlite.prepare('INSERT INTO journey_counts(day,event,service,page,source,total) VALUES(?,?,?,?,?,?)');
 let index=0;
 for(const page of pages)for(const acquisition of sources){
  insert.run('2026-10-19',events[index%events.length],services[index%services.length],page,acquisition,index%3===0?0:index%3===1?1000000:index);index++;
 }
 sqlite.prepare("INSERT INTO inquiries(id,created_at,payload,dedupe_key,synthetic,delivery_status,attempts,first_attempt_at,notification_payload) VALUES(?,?,?,?,0,'manual_review',4,?,?)").run('synthetic-existing',1234,'{"legacy":"unchanged"}','synthetic-existing',1235,'{"provider":"frozen byte-for-byte"}');
 sqlite.prepare("INSERT INTO inquiry_delivery_resolutions VALUES(?,?,'handled_manually',?)").run('synthetic-existing',1236,'synthetic-reviewed');
 const before=sqlite.prepare('SELECT * FROM journey_counts ORDER BY day,event,service,page,source').all();
 const inquiry=sqlite.prepare('SELECT * FROM inquiries').all(),resolution=sqlite.prepare('SELECT * FROM inquiry_delivery_resolutions').all();
 const columns=sqlite.prepare('PRAGMA table_info(journey_counts)').all();
 sqlite.exec(migration);
 assert.deepEqual(sqlite.prepare('SELECT * FROM journey_counts ORDER BY day,event,service,page,source').all(),before);
 assert.deepEqual(sqlite.prepare('SELECT * FROM inquiries').all(),inquiry);
 assert.deepEqual(sqlite.prepare('SELECT * FROM inquiry_delivery_resolutions').all(),resolution);
 assert.deepEqual(sqlite.prepare('PRAGMA table_info(journey_counts)').all(),columns);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM journey_counts').get().n,pages.length*sources.length);
 assert.match(sqlite.prepare("SELECT sql FROM sqlite_master WHERE name='journey_counts'").get().sql,/WITHOUT ROWID/);
});

test('prior Worker upserts and source-less legacy writes remain compatible after migration',t=>{
 const sqlite=database(t);sqlite.exec(migration);
 // The previous release used this exact named-column upsert and conflict key.
 const legacy=sqlite.prepare('INSERT INTO journey_counts (day,event,service,page,source,total) VALUES (?,?,?,?,?,1) ON CONFLICT(day,event,service,page,source) DO UPDATE SET total=MIN(total+1,1000000)');
 legacy.run('2026-10-19','resource_select','grow','pricing','search');
 legacy.run('2026-10-19','resource_select','grow','pricing','search');
 assert.equal(sqlite.prepare("SELECT total FROM journey_counts WHERE page='pricing'").get().total,2);
 sqlite.prepare('INSERT INTO journey_counts(day,event,service,page,total) VALUES(?,?,?,?,?)').run('2026-10-19','page_view','unsure','home',7);
 assert.equal(sqlite.prepare("SELECT source FROM journey_counts WHERE page='home'").get().source,'not_recorded');
 sqlite.prepare('UPDATE journey_counts SET total=1000000 WHERE page=?').run('pricing');
 legacy.run('2026-10-19','resource_select','grow','pricing','search');
 assert.equal(sqlite.prepare("SELECT total FROM journey_counts WHERE page='pricing'").get().total,1000000);
 for(const invalid of [
  ['page_view','website_additions',pageKey,'direct',1],
  ['unknown','unsure',pageKey,'direct',1],
  ['page_view','unsure','unknown_page','direct',1],
  ['page_view','unsure',pageKey,'unknown_source',1],
  ['page_view','unsure',pageKey,'direct',-1],
  ['page_view','unsure',pageKey,'direct',1000001]
 ])assert.throws(()=>sqlite.prepare('INSERT INTO journey_counts VALUES(?,?,?,?,?,?)').run('2026-10-20',...invalid));
});

test('current Worker records the additions page against the expanded schema',async t=>{
 const sqlite=database(t);sqlite.exec(migration);
 const DB={prepare(sql){const build=values=>({bind:(...next)=>build(next),async first(){return sqlite.prepare(sql).get(...values)||null;},async all(){return {results:sqlite.prepare(sql).all(...values)};},async run(){return {meta:sqlite.prepare(sql).run(...values)};}});return build([]);}};
 const env={DB,ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',JOURNEY_COUNTS:'aggregate',FINGERPRINT_SECRET:'synthetic-analytics-secret-over-32-characters'};
 const request=new Request('https://example.test/api/journey-counts',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.123'},body:JSON.stringify({event:'page_view',service:'unsure',page:pageKey,source:'direct'})});
 assert.equal((await worker.fetch(request,env,{})).status,204);
 assert.equal(sqlite.prepare('SELECT total FROM journey_counts WHERE page=?').get(pageKey).total,1);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n,0);
});
