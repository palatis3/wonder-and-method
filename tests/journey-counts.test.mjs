import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import worker from '../deployment/worker.mjs';
import {saveJourneyCount,cleanJourneyCounts} from '../deployment/journey-counts.mjs';
const migrations=await Promise.all(['0001_inquiries.sql','0002_journey_counts.sql','0004_journey_categories.sql','0006_journey_contact_events.sql'].map(n=>readFile(new URL('../deployment/migrations/'+n,import.meta.url),'utf8')));
function fixture(){const sqlite=new DatabaseSync(':memory:');sqlite.exec(migrations.join('\n'));return {sqlite,prepare(sql){const build=values=>({bind:(...next)=>build(next),async first(){return sqlite.prepare(sql).get(...values)??null;},async all(){return {results:sqlite.prepare(sql).all(...values)};},async run(){return {meta:sqlite.prepare(sql).run(...values)};}});return build([]);}};}
const environment=()=>({DB:fixture(),ENVIRONMENT:'production',INQUIRY_MODE:'live',RELEASE_APPROVED:'true',JOURNEY_COUNTS:'aggregate',FINGERPRINT_SECRET:'synthetic-32-character-fingerprint-secret',OPERATOR_TOKEN:'synthetic-token'});
const payload={event:'offer_select',service:'focused_site',page:'pricing'};
const request=(data=payload,headers={})=>new Request('https://example.test/api/journey-counts',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.123',...headers},body:JSON.stringify(data)});
const dependencies={now:Date.UTC(2026,9,16),readLimited:async (stream,max)=>{const bytes=await new Response(stream).arrayBuffer();if(bytes.byteLength>max)throw Error();return new TextDecoder().decode(bytes);},fingerprint:async (secret,value)=>createHmac('sha256',secret).update(value).digest('hex')};
test('aggregate storage merges counts without identifiers, request URLs or submitted fields',async()=>{
 const env=environment();for(let i=0;i<2;i++)assert.equal((await saveJourneyCount(request(),env,dependencies)).status,204);
 const row=env.DB.sqlite.prepare('SELECT * FROM journey_counts').get();assert.deepEqual({...row},{day:'2026-10-16',...payload,total:2});
 assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS total FROM inquiries').get().total,0);
 const rate=env.DB.sqlite.prepare('SELECT * FROM rate_limits').get();assert.match(rate.key,/^[a-f0-9]{64}$/);assert.equal(rate.expires_at,dependencies.now+1200000);
});
test('measurement rejects unknown dimensions and extra fields before writing any state',async()=>{
 const env=environment();for(const data of [null,[],{...payload,email:'private@example.test'},{...payload,event:'anything'},{...payload,service:'private-name'},{...payload,page:'/contact/?email=private'}, {event:'offer_select',service:'focused_site'}, {...payload,extra:'x'.repeat(600)}])assert.equal((await saveJourneyCount(request(data),env,dependencies)).status,400);
 assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM journey_counts').get().n,0);assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM rate_limits').get().n,0);
});
test('measurement honors privacy signals, origin checks and production enablement',async()=>{
 const env=environment();for(const headers of [{'DNT':'1'},{'Sec-GPC':'1'}])assert.equal((await saveJourneyCount(request(payload,headers),env,dependencies)).status,204);
 for(const headers of [{Origin:'https://foreign.test'},{'Sec-Fetch-Site':'cross-site'}])assert.equal((await saveJourneyCount(request(payload,headers),env,dependencies)).status,403);
 for(const patch of [{JOURNEY_COUNTS:'off'},{ENVIRONMENT:'staging'},{RELEASE_APPROVED:'false'},{INQUIRY_MODE:'synthetic'}])assert.equal((await saveJourneyCount(request(),{...env,...patch},dependencies)).status,404);
 assert.equal((await saveJourneyCount(request(payload,{'Content-Type':'text/plain'}),env,dependencies)).status,415);
 assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM journey_counts').get().n,0);
});
test('rate controls cap event writes and expire separately from aggregate retention',async()=>{
 const env=environment();for(let i=0;i<60;i++)assert.equal((await saveJourneyCount(request(),env,dependencies)).status,204);
 assert.equal((await saveJourneyCount(request(),env,dependencies)).status,429);
 assert.equal(env.DB.sqlite.prepare('SELECT total FROM journey_counts').get().total,60);
 const day=new Date(dependencies.now-91*86400000).toISOString().slice(0,10);env.DB.sqlite.prepare('INSERT INTO journey_counts VALUES (?,?,?,?,?)').run(day,'page_view','unsure','home',3);
 await cleanJourneyCounts(env.DB,dependencies.now);assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM journey_counts').get().n,1);
 assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM rate_limits').get().n,1);
});
test('aggregate export requires existing operator authentication and stays no-store/noindex',async()=>{
 const env=environment(),url='https://example.test/api/operator/journey-counts';
 assert.equal((await worker.fetch(new Request(url),env,{})).status,401);
 const response=await worker.fetch(new Request(url,{headers:{Authorization:'Bearer synthetic-token'}}),env,{});assert.equal(response.status,200);assert.match(response.headers.get('Cache-Control'),/no-store/);assert.match(response.headers.get('X-Robots-Tag'),/noindex/);assert.deepEqual((await response.json()).counts,[]);
});
test('category migration preserves existing counts and accepts new fixed categories',()=>{
 const db=new DatabaseSync(':memory:');db.exec(migrations.slice(0,2).join('\n'));
 db.prepare('INSERT INTO journey_counts VALUES (?,?,?,?,?)').run('2026-10-16','page_view','unsure','home',23);
 db.exec(migrations[2]);
 assert.equal(db.prepare('SELECT total FROM journey_counts WHERE page=?').get('home').total,23);
 db.prepare('INSERT INTO journey_counts VALUES (?,?,?,?,?)').run('2026-10-17','contact_select','unsure','service_contractors',2);
 assert.equal(db.prepare('SELECT SUM(total) AS n FROM journey_counts').get().n,25);db.close();
});
test('summary is authenticated, bounded and combines only the requested period',async()=>{
 const env=environment(),today=new Date().toISOString().slice(0,10),old=new Date(Date.now()-10*86400000).toISOString().slice(0,10);
 const put=env.DB.sqlite.prepare('INSERT INTO journey_counts VALUES (?,?,?,?,?)');put.run(today,'contact_select','unsure','guide',3);put.run(old,'contact_select','unsure','guide',9);
 const url='https://example.test/api/operator/journey-summary?days=7';
 assert.equal((await worker.fetch(new Request(url),env,{})).status,401);
 const headers={Authorization:'Bearer synthetic-token'};
 const response=await worker.fetch(new Request(url,{headers}),env,{});assert.equal(response.status,200);assert.match(response.headers.get('Cache-Control'),/no-store/);
 assert.deepEqual((await response.json()).counts,[{event:'contact_select',service:'unsure',page:'guide',total:3}]);
 for(const days of ['0','91','no','1.5'])assert.equal((await worker.fetch(new Request('https://example.test/api/operator/journey-summary?days='+days,{headers}),env,{})).status,422);
});
test('scheduled retention continues when collection is disabled and tolerates an older database',async()=>{
 const env=environment();env.JOURNEY_COUNTS='off';env.DB.sqlite.prepare('INSERT INTO journey_counts VALUES (?,?,?,?,?)').run('2000-01-01','page_view','unsure','home',1);
 await worker.scheduled({},env);assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM journey_counts').get().n,0);
 env.DB.sqlite.exec('DROP TABLE journey_counts');await worker.scheduled({},env);
});
test('client count module respects privacy, test and origin suppression and sends only fixed dimensions',async()=>{
 const source=(await readFile(new URL('../src/assets/journey-counts.js',import.meta.url),'utf8')).replace('export function','function');
 function execute({host='wonderandmethod.com',search='',gpc=false,dnt='',mode='aggregate'}={}){const calls=[],handlers={};const scope={location:{hostname:host,pathname:'/pricing/',origin:'https://'+host,href:'https://'+host+'/pricing/'+search,search},navigator:{globalPrivacyControl:gpc,doNotTrack:dnt},document:{documentElement:{dataset:{measurement:mode}},addEventListener:(name,fn)=>handlers[name]=fn},URL,URLSearchParams,fetch:(url,options)=>{calls.push({url,...options});return Promise.resolve({status:204});}};runInNewContext(source,scope);return {calls,scope,handlers};}
 for(const setting of [{host:'127.0.0.1'},{search:'?qa=1'},{gpc:true},{dnt:'1'},{mode:''}])assert.equal(execute(setting).calls.length,0);
 const {calls,scope}=execute();scope.countJourney('request_start','focused_site');scope.countJourney('request_start','focused_site');assert.equal(calls.length,2);for(const c of calls){assert.equal(c.credentials,'omit');assert.equal(c.referrerPolicy,'no-referrer');assert.deepEqual(Object.keys(JSON.parse(c.body)).sort(),['event','page','service']);}
 assert.deepEqual(JSON.parse(calls[1].body),{event:'request_start',service:'focused_site',page:'pricing'});
 const clicked=execute();
 clicked.handlers.click({target:{closest:selector=>selector==='a[href]'?{href:'mailto:support@example.test?body=private-content'}:null}});
 clicked.handlers.click({target:{closest:selector=>selector==='.support-chat-launch'?{}:null}});
 assert.deepEqual(clicked.calls.slice(1).map(c=>JSON.parse(c.body).event),['email_click','chat_open']);
 assert.ok(clicked.calls.every(c=>!c.body.includes('private-content')&&!c.body.includes('support@example.test')));
 for(const setting of [{search:'?qa=1'},{gpc:true},{dnt:'1'}]){const blocked=execute(setting);blocked.handlers.click({target:{closest:selector=>selector==='.support-chat-launch'?{}:null}});assert.equal(blocked.calls.length,0);}
});

test('contact-event migration preserves history and accepts only coarse allowed actions',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(migrations.slice(0,3).join('\n'));db.prepare('INSERT INTO journey_counts VALUES (?,?,?,?,?)').run('2026-10-17','page_view','unsure','home',23);db.exec(migrations[3]);assert.equal(db.prepare('SELECT SUM(total) AS n FROM journey_counts').get().n,23);db.close();
 const env=environment();for(const event of ['email_click','chat_open'])assert.equal((await saveJourneyCount(request({...payload,event,service:'unsure'}),env,dependencies)).status,204);
 assert.equal((await saveJourneyCount(request({...payload,event:'email_click',address:'private@example.test'}),env,dependencies)).status,400);
 assert.equal(env.DB.sqlite.prepare('SELECT SUM(total) AS n FROM journey_counts').get().n,2);env.DB.sqlite.close();
});
