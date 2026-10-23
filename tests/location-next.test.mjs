import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {journeyPages} from '../deployment/journey-dimensions.mjs';
import {journeyPageKey} from '../src/journey-page-key.mjs';
import worker from '../deployment/worker.mjs';
import paths from './fixtures/location-next-paths.json' with {type:'json'};

test('migration 0024 adds exactly eight page keys and preserves all 445 historical keys, records and constraints',async t=>{
 const directory=new URL('../deployment/migrations/',import.meta.url);
 const names=(await readdir(directory)).filter(name=>/^\d{4}.*\.sql$/.test(name)&&Number(name.slice(0,4))<=24).sort();
 const sql=await Promise.all(names.map(name=>readFile(new URL(name,directory),'utf8')));assert.match(names.at(-1),/^0024_/);
 const allowed=(text,field)=>[...text.match(new RegExp(field+" TEXT NOT NULL(?: DEFAULT '[^']+')? CHECK\\("+field+" IN \\(([^)]+)\\)\\)"))[1].matchAll(/'([^']+)'/g)].map(match=>match[1]);
 const old=allowed(sql.at(-2),'page'),next=allowed(sql.at(-1),'page'),added=paths.map(journeyPageKey).sort();
 assert.equal(old.length,445);assert.equal(next.length,453);assert.equal(added.length,8);
 assert.deepEqual(next.filter(key=>!old.includes(key)),added);assert.ok(old.every(key=>next.includes(key)));
 assert.deepEqual([...journeyPages].sort(),next.slice().sort());
 for(const field of ['event','service','source'])assert.deepEqual(allowed(sql.at(-1),field),allowed(sql.at(-2),field));
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());db.exec(sql.slice(0,-1).join('\n'));
 const insert=()=>db.prepare('INSERT INTO journey_counts(day,event,service,page,source,total) VALUES(?,?,?,?,?,?)');
 for(const [index,page] of old.entries())insert().run('2026-10-22','page_view','unsure',page,'direct',index%2?1000000:0);
 db.prepare("INSERT INTO inquiries(id,created_at,payload,dedupe_key,synthetic,delivery_status,attempts,first_attempt_at,notification_payload) VALUES(?,?,?,?,0,'manual_review',4,?,?)").run('next-fixture',1234,'{"preserve":"é & < >"}','next-fixture',1235,'{"frozen":"request"}');
 db.prepare("INSERT INTO inquiry_delivery_resolutions VALUES(?,?,'handled_manually',?)").run('next-fixture',1236,'review-fixture');
 const tables=['journey_counts','inquiries','inquiry_delivery_resolutions'];
 const rows=()=>tables.map(name=>db.prepare('SELECT * FROM '+name+' ORDER BY 1,2,3').all()),before=rows();
 db.exec(sql.at(-1));assert.deepEqual(rows(),before);assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 for(const [column,value] of [['page','areas_michigan_invented_county'],['event','typed_value'],['service','arbitrary'],['source','full_referrer'],['total',-1],['total',1000001]]){
  const row={day:'2026-10-23',event:'page_view',service:'unsure',page:'home',source:'direct',total:1,[column]:value};assert.throws(()=>insert().run(...Object.values(row)),column);
 }
 assert.throws(()=>insert().run('2026-10-22','page_view','unsure','home','direct',1));
 db.prepare("INSERT INTO journey_counts(day,event,service,page,total) VALUES('2026-10-24','page_view','unsure','home',1)").run();assert.equal(db.prepare("SELECT source FROM journey_counts WHERE day='2026-10-24'").get().source,'not_recorded');
 const DB={prepare(sql){const build=values=>({bind:(...next)=>build(next),async first(){return db.prepare(sql).get(...values)||null;},async run(){return {meta:db.prepare(sql).run(...values)};}});return build([]);}};
 const env={DB,ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',JOURNEY_COUNTS:'aggregate',PUBLIC_ORIGIN:'https://wonderandmethod.com',FINGERPRINT_SECRET:'synthetic-next-analytics-secret-fixture'};
 for(const [index,page] of [...old,...added].entries()){
  const request=new Request('https://wonderandmethod.com/api/journey-counts',{method:'POST',headers:{Origin:'https://wonderandmethod.com','Content-Type':'application/json','User-Agent':'Synthetic browser fixture','CF-Connecting-IP':`198.51.${Math.floor(index/256)}.${index%256}`},body:JSON.stringify({event:'page_view',page,service:'unsure',source:'direct'})});
  assert.equal((await worker.fetch(request,env,{})).status,204,page);
 }
 assert.deepEqual(db.prepare('SELECT * FROM inquiries').all(),before[1]);assert.deepEqual(db.prepare('SELECT * FROM inquiry_delivery_resolutions').all(),before[2]);
});
