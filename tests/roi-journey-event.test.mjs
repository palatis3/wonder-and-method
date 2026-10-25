import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {saveJourneyCount} from '../deployment/journey-counts.mjs';
import {saveJourneyTotals} from '../deployment/journey-months.mjs';
import {formatMeasurement} from '../deployment/production-operator.mjs';

const dir=new URL('../deployment/migrations/',import.meta.url);
const prior=(await Promise.all((await readdir(dir)).filter(n=>/^\d{4}.*\.sql$/.test(n)&&Number(n.slice(0,4))<=35).sort().map(n=>readFile(new URL(n,dir),'utf8')))).join('\n');
const migration=await readFile(new URL('0036_journey_roi_calculate.sql',dir),'utf8');
const data={event:'roi_calculate',service:'unsure',page:'tools_website_roi_calculator',source:'not_recorded'};
const now=Date.UTC(2026,9,24);
function fixture(t,migrate=true){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(prior);t.after(()=>sqlite.close());
 const db={sqlite,prepare(sql){const bind=values=>({bind:(...next)=>bind(next),async first(){return sqlite.prepare(sql).get(...values)??null;},async run(){return sqlite.prepare(sql).run(...values);}});return bind([]);},async batch(statements){sqlite.exec('BEGIN');try{const r=[];for(const s of statements)r.push(await s.run());sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 if(migrate)sqlite.exec(migration);return db;
}
const snapshot=db=>db.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>({name,rows:db.sqlite.prepare(`SELECT * FROM ${name}`).all()}));
test('0036 adds just the ROI event to both schemas and retains populated state',t=>{
 const db=fixture(t,false);
 db.sqlite.exec("INSERT INTO journey_counts VALUES('2026-10-23','page_view','unsure','home','direct',1000000); INSERT INTO journey_monthly_counts VALUES('2026-10','page_view','unsure','home','direct',31000000); INSERT INTO journey_monthly_state VALUES(1,12345); INSERT INTO rate_limits VALUES('fixture',3,12345)");
 const before=snapshot(db),schema=()=>db.sqlite.prepare("SELECT name,sql FROM sqlite_master WHERE type='table' AND name IN ('journey_counts','journey_monthly_counts') ORDER BY name").all();
 const old=schema();db.sqlite.exec('BEGIN');db.sqlite.exec(migration);db.sqlite.exec('COMMIT');assert.deepEqual(snapshot(db),before);
 const normalize=s=>s.replaceAll('\r\n','\n').replaceAll('"','').replace(",'roi_calculate'",'');
 assert.deepEqual(schema().map(x=>normalize(x.sql)),old.map(x=>normalize(x.sql)));
 for(const [table,period] of [['journey_counts','2026-10-24'],['journey_monthly_counts','2026-11']]){
  const insert=(event,total=1)=>db.sqlite.prepare(`INSERT INTO ${table} VALUES(?,?,?,?,?,?)`).run(period,event,'unsure',data.page,'not_recorded',total);
  insert('roi_calculate');assert.throws(()=>insert('roi_value'),/CHECK/);assert.throws(()=>insert('page_view',-1),/CHECK/);
 }
});
test('0036 rolls back both tables if monthly replacement fails',t=>{
 const db=fixture(t,false),before=snapshot(db);db.sqlite.exec('CREATE TABLE journey_monthly_counts_roi_event (blocked INTEGER)');db.sqlite.exec('BEGIN');
 assert.throws(()=>db.sqlite.exec(migration),/already exists/);db.sqlite.exec('ROLLBACK');db.sqlite.exec('DROP TABLE journey_monthly_counts_roi_event');assert.deepEqual(snapshot(db),before);
});
test('ROI endpoint accepts fixed dimensions, rejects inputs and retains atomic saturation',async t=>{
 const db=fixture(t),env={DB:db,ENVIRONMENT:'production',INQUIRY_MODE:'live',RELEASE_APPROVED:'true',JOURNEY_COUNTS:'aggregate',FINGERPRINT_SECRET:'synthetic-32-character-fingerprint-secret'};
 const deps={now,readLimited:async stream=>new Response(stream).text(),fingerprint:async()=> 'synthetic-roi-rate'};
 const request=body=>new Request('https://example.test/api/journey-counts',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await saveJourneyCount(request(data),env,deps)).status,204);
 for(const patch of [{inputs:{cost:1234}},{result:1234},{page:'home'},{service:'grow'},{source:'google'}])assert.equal((await saveJourneyCount(request({...data,...patch}),env,deps)).status,400);
 for(const table of ['journey_counts','journey_monthly_counts'])assert.equal(db.sqlite.prepare(`SELECT total FROM ${table}`).get().total,1);
 db.sqlite.exec('UPDATE journey_counts SET total=999999');await saveJourneyTotals(db,'2026-10-24',data,now);await saveJourneyTotals(db,'2026-10-24',data,now);
 assert.equal(db.sqlite.prepare('SELECT total FROM journey_counts').get().total,1000000);assert.equal(db.sqlite.prepare('SELECT total FROM journey_monthly_counts').get().total,2);
 const before=snapshot(db);await assert.rejects(saveJourneyTotals(db,'2026-10-24',{...data,page:'unlisted'},now),/CHECK/);assert.deepEqual(snapshot(db),before);
});
test('shared browser count deduplicates ROI and honors all existing privacy opt-outs',async()=>{
 const source=(await readFile(new URL('../src/assets/journey-counts.js',import.meta.url),'utf8')).replace('export function','function');
 function execute({host='wonderandmethod.com',search='',gpc=false,dnt='',mode='aggregate',optOut=false}={}){
  const sent=[],scope={URL,URLSearchParams,location:new URL(`https://${host}/tools/website-roi-calculator/${search}`),navigator:{globalPrivacyControl:gpc,doNotTrack:dnt},localStorage:{getItem(){return optOut?'1':null;}},document:{referrer:'',documentElement:{dataset:{measurement:mode,journeyPage:data.page}},addEventListener(){}},fetch:async(url,options)=>sent.push({url,...options})};
  runInNewContext(source,scope);scope.countJourney('roi_calculate');scope.countJourney('roi_calculate');return sent;
 }
 for(const setting of [{host:'localhost'},{search:'?qa=1'},{gpc:true},{dnt:'1'},{mode:''},{optOut:true}])assert.equal(execute(setting).length,0);
 const sent=execute();assert.equal(sent.length,2);assert.deepEqual(JSON.parse(sent[1].body),data);assert.equal(sent[1].referrerPolicy,'no-referrer');assert.equal(sent[1].credentials,'omit');
});
test('operator summary includes tool-use totals as events',()=>{
 const report={days:7,since:'2026-10-18',daily:[{day:'2026-10-24',...data,total:3}],counts:[],bySource:[]};
 assert.match(formatMeasurement(report),/ROI calculations\s+3\s+N\/A/);
});
