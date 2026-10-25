import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import worker from '../deployment/worker.mjs';
import {saveJourneyCount,cleanJourneyCounts} from '../deployment/journey-counts.mjs';
import {saveJourneyTotals,readJourneyMonths,journeyMonthWindow} from '../deployment/journey-months.mjs';
import {productionOperator,formatMonthlyMeasurement} from '../deployment/production-operator.mjs';

const names=['0001_inquiries.sql','0002_journey_counts.sql','0004_journey_categories.sql','0006_journey_contact_events.sql','0007_journey_sources.sql','0008_journey_resource_intent.sql'];
const migration=async name=>readFile(new URL('../deployment/migrations/'+name,import.meta.url),'utf8');
const dailySchema=(await Promise.all(names.map(migration))).join('\n'),monthlySchema=await migration('0033_journey_monthly.sql');
function fixture(t,{monthly=true}={}){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(dailySchema);if(monthly)sqlite.exec(monthlySchema);t.after(()=>sqlite.close());
 return {sqlite,prepare(sql){const bind=values=>({bind:(...next)=>bind(next),async first(){return sqlite.prepare(sql).get(...values)??null;},async all(){return {results:sqlite.prepare(sql).all(...values)};},async run(){return {meta:sqlite.prepare(sql).run(...values)};}});return bind([]);},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
}
const data={event:'page_view',service:'unsure',page:'home',source:'direct'},now=Date.UTC(2026,9,24);
const total=(db,table)=>db.sqlite.prepare(`SELECT coalesce(sum(total),0) AS n FROM ${table}`).get().n;
const env=db=>({DB:db,ENVIRONMENT:'production',INQUIRY_MODE:'live',RELEASE_APPROVED:'true',JOURNEY_COUNTS:'aggregate',FINGERPRINT_SECRET:'synthetic-32-character-fingerprint-secret',OPERATOR_TOKEN:'synthetic-token'});
const auth={Authorization:'Bearer synthetic-token'};

test('monthly migration starts prospectively, preserves daily history and stores only coarse dimensions',async t=>{
 const db=fixture(t,{monthly:false});await saveJourneyTotals(db,'2026-10-23',data,now-86400000);db.sqlite.exec(monthlySchema);
 assert.equal(total(db,'journey_counts'),1);assert.equal(total(db,'journey_monthly_counts'),0);
 assert.equal((await readJourneyMonths(db,24,now)).firstRecordedAt,null);
 await saveJourneyTotals(db,'2026-10-24',data,now);await saveJourneyTotals(db,'2026-10-24',data,now+1);
 assert.equal(total(db,'journey_counts'),3);assert.equal(total(db,'journey_monthly_counts'),2);
 assert.deepEqual({...db.sqlite.prepare('SELECT * FROM journey_monthly_counts').get()},{month:'2026-10',...data,total:2});
 assert.equal((await readJourneyMonths(db,24,now)).firstRecordedAt,now);
});
test('daily saturation admits the same number of monthly increments',async t=>{
 const db=fixture(t);db.sqlite.prepare('INSERT INTO journey_counts VALUES (?,?,?,?,?,?)').run('2026-10-24',data.event,data.service,data.page,data.source,999999);
 await saveJourneyTotals(db,'2026-10-24',data,now);await saveJourneyTotals(db,'2026-10-24',data,now+1);
 assert.equal(total(db,'journey_counts'),1000000);assert.equal(total(db,'journey_monthly_counts'),1);
 await saveJourneyTotals(db,'2026-10-25',data,now+86400000);assert.equal(total(db,'journey_monthly_counts'),2);
});
test('a previously saturated daily bucket cannot invent the first monthly recording',async t=>{
 const db=fixture(t);db.sqlite.prepare('INSERT INTO journey_counts VALUES (?,?,?,?,?,?)').run('2026-10-24',data.event,data.service,data.page,data.source,1000000);
 await saveJourneyTotals(db,'2026-10-24',data,now);assert.equal(total(db,'journey_monthly_counts'),0);assert.equal((await readJourneyMonths(db,24,now)).firstRecordedAt,null);
 await saveJourneyTotals(db,'2026-10-25',data,now+86400000);assert.equal((await readJourneyMonths(db,24,now+86400000)).firstRecordedAt,now+86400000);
});
test('rejected daily and state writes roll back every aggregate in the transaction',async t=>{
 const db=fixture(t);
 // Monthly syntax allows this coarse key; the daily fixed allowlist rejects it.
 await assert.rejects(saveJourneyTotals(db,'2026-10-24',{...data,page:'not_allowlisted'},now));
 assert.equal(total(db,'journey_counts'),0);assert.equal(total(db,'journey_monthly_counts'),0);
 assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM journey_monthly_state').get().n,0);
 await assert.rejects(saveJourneyTotals(db,'2026-10-24',data,0));
 assert.equal(total(db,'journey_counts'),0);assert.equal(total(db,'journey_monthly_counts'),0);
});
test('missing monthly schema uses legacy daily writes; partial schema fails explicitly',async t=>{
 const db=fixture(t,{monthly:false});assert.equal(await readJourneyMonths(db,24,now),null);
 await saveJourneyTotals(db,'2026-10-24',data,now);assert.equal(total(db,'journey_counts'),1);
 db.sqlite.exec(monthlySchema);db.sqlite.exec('DROP TABLE journey_monthly_state');
 await assert.rejects(readJourneyMonths(db,24,now),/Incomplete monthly/);
 await assert.rejects(saveJourneyTotals(db,'2026-10-24',data,now),/Incomplete monthly/);
 assert.equal(total(db,'journey_counts'),1);
});
test('UTC calendar retention includes exactly current and preceding 23 months across leap years',async t=>{
 const db=fixture(t),at=Date.UTC(2026,1,28,23,59,59);
 for(const month of ['2024-02','2024-03','2026-02'])db.sqlite.prepare('INSERT INTO journey_monthly_counts VALUES (?,?,?,?,?,?)').run(month,data.event,data.service,data.page,data.source,1);
 await cleanJourneyCounts(db,at);assert.deepEqual(db.sqlite.prepare('SELECT month FROM journey_monthly_counts ORDER BY month').all().map(r=>r.month),['2024-03','2026-02']);
 assert.equal(journeyMonthWindow(24,Date.UTC(2024,1,29)).sinceMonth,'2022-03');
 await cleanJourneyCounts(db,Date.UTC(2026,2,1));assert.deepEqual(db.sqlite.prepare('SELECT month FROM journey_monthly_counts').all().map(r=>r.month),['2026-02']);
 for(const months of [0,25,1.5,NaN])assert.throws(()=>journeyMonthWindow(months,now));
});
test('monthly report is bounded, excludes future/old rows, groups sources and never fills false zeros',async t=>{
 const db=fixture(t);
 for(const [day,event,source] of [['2026-09-01','page_view','google'],['2026-10-24','page_view','direct'],['2026-10-24','page_view','google'],['2026-10-24','inquiry_saved','direct'],['2026-11-01','page_view','direct']])await saveJourneyTotals(db,day,{...data,event,source},now);
 const report=await readJourneyMonths(db,1,now);assert.equal(report.counts.length,2);assert.equal(report.counts.find(r=>r.event==='page_view').total,2);assert.equal(report.bySource.length,2);
 const output=formatMonthlyMeasurement(await readJourneyMonths(db,3,now));assert.match(output,/2026-08 \| no rows \| no rows \| no rows/);assert.match(output,/2026-10 \| 2 \| 1 \| 3/);assert.match(output,/continuity is unverified/);assert.match(output,/not unique inquiries/);
});
test('privacy and validation exclusions produce no monthly data or collection-start marker',async t=>{
 const db=fixture(t),environment=env(db),dependencies={now,readLimited:async stream=>new Response(stream).text(),fingerprint:async(secret,value)=>createHmac('sha256',secret).update(value).digest('hex')};
 const request=(body=data,headers={})=>new Request('https://example.test/api/journey-counts',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 for(const headers of [{'DNT':'1'},{'Sec-GPC':'1'},{'User-Agent':'Googlebot/1.0'}])assert.equal((await saveJourneyCount(request(data,headers),environment,dependencies)).status,204);
 assert.equal((await saveJourneyCount(request({...data,email:'private@example.test'}),environment,dependencies)).status,400);
 assert.equal(total(db,'journey_monthly_counts'),0);assert.equal((await readJourneyMonths(db,24,now)).firstRecordedAt,null);
});
test('monthly API requires authentication, bounds its window, and distinguishes disabled schema from empty data',async t=>{
 const environment=env(fixture(t)),url='https://example.test/api/operator/journey-months';
 assert.equal((await worker.fetch(new Request(url),environment,{})).status,401);
 for(const months of ['0','25','1.5','no'])assert.equal((await worker.fetch(new Request(url+'?months='+months,{headers:auth}),environment,{})).status,422);
 const response=await worker.fetch(new Request(url,{headers:auth}),environment,{});assert.equal(response.status,200);assert.match(response.headers.get('Cache-Control'),/no-store/);assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
 const report=await response.json();assert.deepEqual(report.counts,[]);assert.equal(report.firstRecordedAt,null);assert.match(report.note,/not verified zero/);
 assert.equal((await worker.fetch(new Request(url,{headers:auth}),env(fixture(t,{monthly:false})),{})).status,503);
});
test('monthly CLI validates before credentials and uses only the authenticated read endpoint',async()=>{
 const calls=[],options={credentials:()=>({OPERATOR_TOKEN:'synthetic-token'}),fetchImpl:async(url,init)=>{calls.push({url,init});return Response.json({counts:[]});}};
 await productionOperator(['measurement-months'],options);await productionOperator(['measurement-months','12'],options);
 assert.deepEqual(calls.map(c=>c.url),['https://wonderandmethod.com/api/operator/journey-months?months=24','https://wonderandmethod.com/api/operator/journey-months?months=12']);assert.equal(calls[0].init.headers.Authorization,'Bearer synthetic-token');
 for(const args of [['0'],['25'],['2.5'],['12','--all'],['12','x','y']])await assert.rejects(productionOperator(['measurement-months',...args],{credentials:()=>{assert.fail('Must reject before credentials');}}));
});
