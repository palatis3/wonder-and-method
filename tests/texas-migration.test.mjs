import idMtPaths from './fixtures/id-mt-approved-paths.json' with {type:'json'};
import coUtPrPaths from './fixtures/co-ut-pr-approved-paths.json' with {type:'json'};
import nvWaPaths from './fixtures/nv-wa-approved-paths.json' with {type:'json'};
import azOrPaths from './fixtures/az-or-approved-paths.json' with {type:'json'};
import caNmPaths from './fixtures/ca-nm-approved-paths.json' with {type:'json'};
import ksNePaths from './fixtures/ks-ne-approved-paths.json' with {type:'json'};
import ndSdPaths from './fixtures/nd-sd-approved-paths.json' with {type:'json'};
import mnOkPaths from './fixtures/mn-ok-approved-paths.json' with {type:'json'};
import moIaPaths from './fixtures/mo-ia-approved-paths.json' with {type:'json'};
import paths from './fixtures/texas-approved-paths.json' with {type:'json'};
import {journeyPageKey} from '../src/journey-page-key.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {journeyPages} from '../deployment/journey-dimensions.mjs';
import {saveJourneyCount,cleanJourneyCounts} from '../deployment/journey-counts.mjs';
import {saveJourneyTotals} from '../deployment/journey-months.mjs';

const directory=new URL('../deployment/migrations/',import.meta.url);
const names=(await readdir(directory)).filter(name=>/^\d{4}.*\.sql$/.test(name)&&Number(name.slice(0,4))<=37).sort();
const prior=(await Promise.all(names.map(name=>readFile(new URL(name,directory),'utf8')))).join('\n');
const migration=await readFile(new URL('0038_texas_journey_pages.sql',directory),'utf8');
const keys=paths.map(journeyPageKey).sort();
const now=Date.UTC(2026,9,24),day='2026-10-24';
const data={event:'page_view',service:'unsure',page:'home',source:'direct'};
const allowed=sql=>[...sql.match(/page TEXT NOT NULL CHECK\(page IN \(([^)]+)\)\)/)[1].matchAll(/'([^']+)'/g)].map(match=>match[1]);
const rows=(db,table)=>db.sqlite.prepare(`SELECT * FROM ${table} ORDER BY ${db.sqlite.prepare(`PRAGMA table_info(${table})`).all().map((_,index)=>index+1).join(',')}`).all();
const total=(db,table)=>db.sqlite.prepare(`SELECT coalesce(sum(total),0) AS n FROM ${table}`).get().n;
function fixture(t,{migrate=true}={}){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');sqlite.exec(prior);t.after(()=>sqlite.close());
 const db={sqlite,prepare(sql){const bind=values=>({bind:(...next)=>bind(next),async first(){return sqlite.prepare(sql).get(...values)??null;},async all(){return {results:sqlite.prepare(sql).all(...values)};},async run(){return {meta:sqlite.prepare(sql).run(...values)};}});return bind([]);},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 if(migrate)applyMigration(db);
 return db;
}
function applyMigration(db){db.sqlite.exec('BEGIN');try{db.sqlite.exec(migration);db.sqlite.exec('COMMIT');}catch(error){db.sqlite.exec('ROLLBACK');throw error;}}
function insert(db,row={}){return db.sqlite.prepare('INSERT INTO journey_counts(day,event,service,page,source,total) VALUES(?,?,?,?,?,?)').run(...Object.values({day,...data,total:1,...row}));}

test('0038 adds exactly the Texas directory and 216 reviewed county keys and preserves populated rows, schema constraints and indexes',t=>{
 const db=fixture(t,{migrate:false});
 const schema=()=>db.sqlite.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='journey_counts'").get().sql;
 const oldSchema=schema(),oldKeys=allowed(oldSchema);
 assert.equal(oldKeys.length,1231);
 for(const [index,page] of oldKeys.entries())insert(db,{page,total:index%2?1000000:0});
 for(const page of keys)assert.throws(()=>insert(db,{page}),/CHECK constraint failed/);
 db.sqlite.prepare("INSERT INTO inquiries(id,created_at,payload,dedupe_key,synthetic,delivery_status,attempts,first_attempt_at,notification_payload) VALUES(?,?,?,?,0,'manual_review',4,?,?)").run('daily-area-fixture',1234,'{"preserve":"é & < >"}','daily-area-fixture',1235,'{"frozen":"request"}');
 db.sqlite.prepare("INSERT INTO inquiry_delivery_resolutions VALUES(?,?,'handled_manually',?)").run('daily-area-fixture',1236,'synthetic-review');
 db.sqlite.exec("INSERT INTO rate_limits VALUES('synthetic-key',3,1237); INSERT INTO operation_attention(code,occurrences,first_at,last_at) VALUES('inquiry_receipt_failed',2,1234,1236)");
 db.sqlite.prepare('INSERT INTO journey_monthly_counts VALUES(?,?,?,?,?,?)').run('2026-09',data.event,data.service,data.page,data.source,17);
 db.sqlite.prepare('INSERT INTO journey_monthly_state VALUES(1,?)').run(now-86400000);
 const tables=db.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(row=>row.name);
 const before=tables.map(table=>rows(db,table));
 const indexes=()=>db.sqlite.prepare("SELECT name,tbl_name,sql FROM sqlite_master WHERE type='index' ORDER BY name").all();
 const indexesBefore=indexes(),primaryBefore=db.sqlite.prepare('PRAGMA index_list(journey_counts)').all();
 const columnsBefore=db.sqlite.prepare('PRAGMA table_info(journey_counts)').all();
 const otherSchema=()=>db.sqlite.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE tbl_name<>'journey_counts' ORDER BY type,name").all();
 const otherBefore=otherSchema();
 applyMigration(db);
 assert.deepEqual(tables.map(table=>rows(db,table)),before);
 assert.deepEqual(indexes(),indexesBefore);
 assert.deepEqual(db.sqlite.prepare('PRAGMA index_list(journey_counts)').all(),primaryBefore);
 assert.deepEqual(db.sqlite.prepare('PRAGMA table_info(journey_counts)').all(),columnsBefore);
 assert.deepEqual(otherSchema(),otherBefore);
 const nextKeys=allowed(schema());
 assert.equal(nextKeys.length,1448);
 assert.deepEqual(nextKeys.filter(key=>!oldKeys.includes(key)).sort(),keys);
 assert.ok(oldKeys.every(key=>nextKeys.includes(key)));
 assert.deepEqual([...journeyPages].sort(),[...nextKeys,...moIaPaths.map(journeyPageKey),...ksNePaths.map(journeyPageKey),...caNmPaths.map(journeyPageKey),...azOrPaths.map(journeyPageKey),...nvWaPaths.map(journeyPageKey),...coUtPrPaths.map(journeyPageKey),...idMtPaths.map(journeyPageKey),...ndSdPaths.map(journeyPageKey),...mnOkPaths.map(journeyPageKey)].sort());
 // SQLite quotes the renamed table. Only the 217 approved page literals may differ.
 assert.equal(keys.reduce((text,key)=>text.replace(",'"+key+"'",''),schema()).replaceAll('\r\n','\n'),oldSchema.replaceAll('\r\n','\n'));
 assert.equal(db.sqlite.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
 assert.deepEqual(db.sqlite.prepare('PRAGMA foreign_key_check').all(),[]);
 for(const page of keys)insert(db,{page});
 for(const [column,value] of [['page','areas_louisiana_invented_parish'],['page','areas_arkansas_invented_county'],['page','not_allowlisted'],['event','typed_value'],['service','arbitrary'],['source','full_referrer'],['total',-1],['total',1000001]])assert.throws(()=>insert(db,{day:'2026-10-25',[column]:value}),/CHECK constraint failed/,column);
 for(const column of ['day','event','service','page','source','total'])assert.throws(()=>insert(db,{[column]:null}),/NOT NULL constraint failed/,column);
 assert.throws(()=>insert(db,{page:keys[0]}),/UNIQUE constraint failed/);
 db.sqlite.prepare('INSERT INTO journey_counts(day,event,service,page,total) VALUES(?,?,?,?,?)').run(day,data.event,data.service,keys[0],1);
 assert.equal(db.sqlite.prepare("SELECT source FROM journey_counts WHERE page=? AND source='not_recorded'").get(keys[0]).source,'not_recorded');
});

test('all 217 new Texas keys pass the request handler and increment daily/monthly totals together',async t=>{
 const db=fixture(t),env={DB:db,ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',JOURNEY_COUNTS:'aggregate',FINGERPRINT_SECRET:'x'.repeat(32)};
 for(const page of keys){
  const dependencies={now,readLimited:async stream=>new Response(stream).text(),fingerprint:async()=> 'synthetic-rate-key-'+page};
  const request=()=>new Request('https://example.test/api/journey-counts',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json','User-Agent':'Synthetic browser fixture'},body:JSON.stringify({...data,page})});
  for(let n=0;n<2;n++)assert.equal((await saveJourneyCount(request(),env,dependencies)).status,204);
  for(const table of ['journey_counts','journey_monthly_counts'])assert.equal(db.sqlite.prepare(`SELECT total FROM ${table} WHERE page=?`).get(page).total,2);
 }
 assert.equal(rows(db,'journey_monthly_state')[0].first_recorded_at,now);
 const before=['journey_counts','journey_monthly_counts','journey_monthly_state'].map(table=>rows(db,table));
 await assert.rejects(saveJourneyTotals(db,day,{...data,page:'not_allowlisted'},now),/CHECK constraint failed/);
 assert.deepEqual(['journey_counts','journey_monthly_counts','journey_monthly_state'].map(table=>rows(db,table)),before);
});

test('failed daily or state writes leave no partial monthly increments or start marker',async t=>{
 const db=fixture(t);
 for(const [page,at] of [['not_allowlisted',now],[keys[0],0]]){
  await assert.rejects(saveJourneyTotals(db,day,{...data,page},at),/CHECK constraint failed/);
  assert.equal(total(db,'journey_counts'),0);assert.equal(total(db,'journey_monthly_counts'),0);assert.deepEqual(rows(db,'journey_monthly_state'),[]);
 }
});

test('new area keys retain daily saturation and exact daily/monthly retention boundaries',async t=>{
 const db=fixture(t);
 for(const page of keys){
  insert(db,{page,total:999999});
  await saveJourneyTotals(db,day,{...data,page},now);
  await saveJourneyTotals(db,day,{...data,page},now+1);
  assert.equal(db.sqlite.prepare('SELECT total FROM journey_counts WHERE page=?').get(page).total,1000000);
  assert.equal(db.sqlite.prepare('SELECT total FROM journey_monthly_counts WHERE page=?').get(page).total,1);
  for(const age of [89,90])insert(db,{day:new Date(now-age*86400000).toISOString().slice(0,10),page});
  for(const month of ['2024-10','2024-11'])db.sqlite.prepare('INSERT INTO journey_monthly_counts VALUES(?,?,?,?,?,1)').run(month,data.event,data.service,page,data.source);
 }
 await cleanJourneyCounts(db,now);
 assert.deepEqual([...new Set(rows(db,'journey_counts').map(row=>row.day))],['2026-07-27',day]);
 assert.deepEqual([...new Set(rows(db,'journey_monthly_counts').map(row=>row.month))],['2024-11','2026-10']);
 assert.equal(rows(db,'journey_monthly_state')[0].first_recorded_at,now);
});
