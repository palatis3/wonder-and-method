import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {journeyPageKey} from '../src/journey-page-key.mjs';
import {saveJourneyCount} from '../deployment/journey-counts.mjs';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const expected=["/areas/virginia/","/areas/west-virginia/","/areas/michigan/","/areas/district-of-columbia/","/areas/indiana/","/areas/kentucky/","/areas/tennessee/","/areas/north-carolina/"];
const allowed=(sql,field)=>[...sql.match(new RegExp(field+" TEXT NOT NULL(?: DEFAULT '[^']+')? CHECK\\("+field+" IN \\(([^)]+)\\)\\)"))[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
test('migration 0020 adds only eight state and district hub keys, preserves data and accepts those keys through the worker validator',async t=>{
 const names=(await readdir(new URL('../deployment/migrations/',import.meta.url))).filter(x=>/^\d{4}.*\.sql$/.test(x)&&Number(x.slice(0,4))<=20).sort();
 const sql=await Promise.all(names.map(n=>read('deployment/migrations/'+n))),migration=sql.at(-1),previousSql=sql.at(-2);
 assert.match(names.at(-1),/^0020_/);
 for(const field of ['event','service','source'])assert.deepEqual(allowed(migration,field),allowed(previousSql,field));
 const old=allowed(previousSql,'page'),next=allowed(migration,'page');assert.equal(old.length,420);assert.equal(next.length,428);assert.ok(old.every(k=>next.includes(k)));
 assert.deepEqual(next.filter(k=>!old.includes(k)).sort(),expected.map(journeyPageKey).sort());
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());db.exec(sql.slice(0,-1).join('\n'));
 const insert=db.prepare('INSERT INTO journey_counts VALUES(?,?,?,?,?,?)');
 for(const [i,key]of old.entries())insert.run('2026-10-22','page_view','unsure',key,'direct',i%2?1000000:0);
 db.prepare("INSERT INTO inquiries(id,created_at,payload,dedupe_key,synthetic,delivery_status) VALUES(?,?,?,?,0,'accepted')").run('regional-fixture',1234,'{"preserve":"é & < >"}','regional-fixture');
 const before=db.prepare('SELECT * FROM journey_counts ORDER BY page').all(),inquiries=db.prepare('SELECT * FROM inquiries').all();db.exec(migration);
 assert.deepEqual(db.prepare('SELECT * FROM journey_counts ORDER BY page').all(),before);assert.deepEqual(db.prepare('SELECT * FROM inquiries').all(),inquiries);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
 for(const [column,value]of [['page','unapproved'],['event','typed_value'],['source','full_referrer'],['service','arbitrary'],['total',-1],['total',1000001]]){const row={day:'2026-10-23',event:'page_view',service:'unsure',page:'home',source:'direct',total:1,[column]:value};assert.throws(()=>insert.run(...Object.values(row)));}
 const DB={prepare(sql){const build=values=>({bind:(...v)=>build(v),async first(){return db.prepare(sql).get(...values)||null;},async run(){return {meta:db.prepare(sql).run(...values)};}});return build([]);}};
 const env={DB,ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',JOURNEY_COUNTS:'aggregate',FINGERPRINT_SECRET:'x'.repeat(32)};
 for(const path of expected){const page=journeyPageKey(path);const response=await saveJourneyCount(new Request('https://example.test/api/journey',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json','User-Agent':'Synthetic browser fixture'},body:JSON.stringify({event:'page_view',page,service:'unsure',source:'direct'})}),env,{readLimited:async stream=>new Response(stream).text(),fingerprint:async()=>page,now:Date.parse('2026-10-22T12:00:00Z')});assert.equal(response.status,204);assert.equal(db.prepare('SELECT total FROM journey_counts WHERE page=?').get(page).total,1);}
});
