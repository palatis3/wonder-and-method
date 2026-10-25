import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import worker,{notifyInquiry} from '../deployment/worker.mjs';
import {formatMeasurement,productionOperator} from '../deployment/production-operator.mjs';

const migration=await readFile(new URL('../deployment/migrations/0001_inquiries.sql',import.meta.url),'utf8');
const followupMigration=await readFile(new URL('../deployment/migrations/0003_inquiry_followup.sql',import.meta.url),'utf8');
const payload={name:'Synthetic Owner',email:'owner@example.test',business:'Synthetic business',website:'',service:'launch_site',message:'A synthetic inquiry for the reliability checks.'};
function fixture(afterRead=async()=>{}){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(migration);
 return {sqlite,prepare(sql){const statement=values=>({
  bind:(...next)=>statement(next),
  async first(){const result=sqlite.prepare(sql).get(...values)??null;await afterRead(sql,result);return result;},
  async all(){return {results:sqlite.prepare(sql).all(...values)};},
  async run(){return {meta:sqlite.prepare(sql).run(...values)};}
 });return statement([]);}};
}
function environment(db=fixture()){
 return {DB:db,ENVIRONMENT:'production',INQUIRY_MODE:'synthetic',RELEASE_APPROVED:'true',SEARCH_INDEXING:'true',FINGERPRINT_SECRET:'synthetic-only-secret-longer-than-thirty-two-characters'};
}
const context=()=>({promises:[],waitUntil(value){this.promises.push(value);}});
function inquiry(value=payload,ip='192.0.2.1'){
 return new Request('https://example.test/api/inquiries',{method:'POST',headers:{Origin:'https://example.test',Accept:'application/json','Content-Type':'application/json','CF-Connecting-IP':ip},body:JSON.stringify(value)});
}
const different=index=>({...payload,message:payload.message+' Follow-up '+index+'.'});
const count=env=>env.DB.sqlite.prepare('SELECT COUNT(*) AS total FROM inquiries').get().total;

test('lost confirmation and three identical retries preserve the distinct-inquiry allowance',async()=>{
 const env=environment();
 try{
  const lost=await worker.fetch(inquiry(),env,context());assert.equal(lost.status,202);
  const reference=env.DB.sqlite.prepare('SELECT id FROM inquiries').get().id;
  await lost.body.cancel(); // The browser never receives this confirmation.
  for(let i=0;i<3;i++){
   const response=await worker.fetch(inquiry(),env,context());
   assert.equal(response.status,202);assert.equal((await response.json()).reference,reference);
  }
  assert.equal(count(env),1);
  for(let i=1;i<=2;i++)assert.equal((await worker.fetch(inquiry(different(i)),env,context())).status,202);
  const blocked=await worker.fetch(inquiry(different(3)),env,context());
  assert.equal(blocked.status,429);assert.equal((await blocked.json()).reference,null);assert.equal(count(env),3);
  const rates=env.DB.sqlite.prepare('SELECT * FROM rate_limits').all();
  assert.ok(rates.every(row=>/^[a-f0-9]{64}$/.test(row.key)));
  assert.doesNotMatch(JSON.stringify(rates),/192\.0\.2\.1|owner@example|Synthetic/);
 }finally{env.DB.sqlite.close();}
});

test('concurrent first submissions save and notify once, with one net allowance charge',async()=>{
 let reads=0,release;
 const gate=new Promise(resolve=>{release=resolve;});
 const db=fixture(async(sql,result)=>{
  if(/^SELECT .* FROM inquiries WHERE created_at > /.test(sql)&&!result&&reads<3){
   if(++reads===3)release();
   await gate;
  }
 });
 const env={...environment(db),INQUIRY_MODE:'live'},contexts=[context(),context(),context()];
 try{
  const responses=await Promise.all(contexts.map(ctx=>worker.fetch(inquiry(),env,ctx)));
  assert.deepEqual(responses.map(response=>response.status),[202,202,202]);
  const references=await Promise.all(responses.map(async response=>(await response.json()).reference));
  assert.equal(new Set(references).size,1);assert.equal(count(env),1);
  assert.equal(contexts.reduce((sum,ctx)=>sum+ctx.promises.length,0),1);
  await Promise.all(contexts.flatMap(ctx=>ctx.promises)); // No sender config: no external request.
  for(let i=1;i<=2;i++){const ctx=context();assert.equal((await worker.fetch(inquiry(different(i)),env,ctx)).status,202);await Promise.all(ctx.promises);}
  assert.equal((await worker.fetch(inquiry(different(3)),env,context())).status,429);
 }finally{release();db.sqlite.close();}
});

test('a matching payload from another network cannot bypass its exhausted allowance',async()=>{
 const env=environment();
 try{
  const first=await worker.fetch(inquiry(),env,context()),reference=(await first.json()).reference;
  for(let i=1;i<=3;i++)assert.equal((await worker.fetch(inquiry(different(i),'198.51.100.2'),env,context())).status,202);
  const blocked=await worker.fetch(inquiry(payload,'198.51.100.2'),env,context());
  assert.equal(blocked.status,429);assert.equal((await blocked.json()).reference,null);
  const retry=await worker.fetch(inquiry(),env,context());
  assert.equal(retry.status,202);assert.equal((await retry.json()).reference,reference);
  // The pre-existing cross-network deduplication still costs the first allowance.
  const other=await worker.fetch(inquiry(payload,'203.0.113.3'),env,context());
  assert.equal(other.status,202);assert.equal((await other.json()).reference,reference);
  for(let i=1;i<=2;i++)assert.equal((await worker.fetch(inquiry(different(10+i),'203.0.113.3'),env,context())).status,202);
  assert.equal((await worker.fetch(inquiry(different(13),'203.0.113.3'),env,context())).status,429);
 }finally{env.DB.sqlite.close();}
});

test('unknown networks and legacy saved rows receive no uncharged duplicate shortcut',async()=>{
 const unknown=environment(),legacy=environment();
 try{
  for(let i=0;i<3;i++)assert.equal((await worker.fetch(inquiry(payload,'not-an-ip'),unknown,context())).status,202);
  assert.equal((await worker.fetch(inquiry(payload,'not-an-ip'),unknown,context())).status,429);
  for(let i=0;i<3;i++)assert.equal((await worker.fetch(inquiry(different(i)),legacy,context())).status,202);
  legacy.DB.sqlite.prepare('DELETE FROM rate_limits WHERE expires_at <= ?').run(Date.now()+600000);
  const response=await worker.fetch(inquiry(different(0)),legacy,context());
  assert.equal(response.status,429);assert.equal((await response.json()).reference,null);
 }finally{unknown.DB.sqlite.close();legacy.DB.sqlite.close();}
});

test('receipts expire with the saved record window, remain mode-isolated, and cap repeated confirmations',async t=>{
 let now=Date.UTC(2026,9,21,10,10);
 t.mock.method(Date,'now',()=>now);
 const env=environment();
 try{
  const first=(await (await worker.fetch(inquiry(),env,context())).json()).reference;
  const live={...env,INQUIRY_MODE:'live'},ctx=context();
  const liveReference=(await (await worker.fetch(inquiry(),live,ctx)).json()).reference;
  await Promise.all(ctx.promises);assert.notEqual(first,liveReference);assert.equal(count(env),2);
  for(let i=0;i<9;i++){
   const response=await worker.fetch(inquiry(),env,context());
   assert.equal(response.status,202);assert.equal((await response.json()).reference,first);
  }
  const capped=await worker.fetch(inquiry(),env,context());assert.equal(capped.status,429);
  assert.ok(Number(capped.headers.get('Retry-After'))<=600);
  now+=600000;
  const fresh=await worker.fetch(inquiry(),env,context());assert.equal(fresh.status,202);
  assert.notEqual((await fresh.json()).reference,first);assert.equal(count(env),3);
  assert.equal((await worker.fetch(inquiry(different(9)),env,context())).status,429);
 }finally{env.DB.sqlite.close();}
});

test('validation and honeypot checks precede duplicate confirmation',async()=>{
 const env=environment();
 try{
  assert.equal((await worker.fetch(inquiry(),env,context())).status,202);
  for(const value of [{...payload,_wm_note:'bot'},{...payload,message:'short'}]){
   const response=await worker.fetch(inquiry(value),env,context());
   assert.equal(response.status,422);assert.equal((await response.json()).reference,null);
  }
  assert.equal(count(env),1);
 }finally{env.DB.sqlite.close();}
});

test('neutral, question and checkout confirmations match new notification subjects without rewriting snapshots',async()=>{
 for(const [kind,label,confirmation] of [[undefined,'Message','message'],['question','Question','question'],['checkout','Proposal request','project details']]){
  const env={...environment(),INQUIRY_MODE:'live'},ctx=context();
  env.DB.sqlite.exec(followupMigration);
  try{
   const response=await worker.fetch(inquiry({...payload,...(kind?{request_kind:kind}:{})}),env,ctx);
   assert.equal(response.status,202);const saved=await response.json();assert.match(saved.message,new RegExp('Your '+confirmation+' is saved|Your '+confirmation+' are saved'));
   await Promise.all(ctx.promises);
   Object.assign(env,{RESEND_API_KEY:'synthetic-key',NOTIFICATION_FROM:'sender@example.test',NOTIFICATION_TO:'owner@example.test'});
   let firstBody;
   await notifyInquiry(env,saved.reference,async(_url,options)=>{firstBody=options.body;return new Response(null,{status:503});});
   assert.equal(JSON.parse(firstBody).subject.split(']')[0], '['+label);
   env.DB.sqlite.prepare('UPDATE inquiries SET payload=? WHERE id=?').run(JSON.stringify({...payload,request_kind:kind==='question'?'checkout':'question'}),saved.reference);
   let retryBody;
   await notifyInquiry(env,saved.reference,async(_url,options)=>{retryBody=options.body;return Response.json({id:'synthetic-provider-id'});});
   assert.equal(retryBody,firstBody);assert.equal(env.DB.sqlite.prepare('SELECT notification_payload FROM inquiries WHERE id=?').get(saved.reference).notification_payload,firstBody);
  }finally{env.DB.sqlite.close();}
 }
});

function measurement(){
 return {days:7,since:'2026-10-15',daily:[],counts:[],arrivals:[],bySource:[],note:'Aggregate events only.'};
}
test('measurement ranks aggregated pages, retains a full view, and reports catalog county zeros',()=>{
 const report=measurement();
 report.counts=Array.from({length:20},(_,i)=>({event:'page_view',service:'unsure',page:'guides_example_'+i,total:i+1}));
 report.counts.push(
  {event:'page_view',service:'unsure',page:'areas_erie_county',total:2},
  {event:'page_view',service:'grow',page:'areas_erie_county',total:5},
  {event:'page_view',service:'unsure',page:'areas_pennsylvania_erie_county',total:4},
  {event:'page_view',service:'unsure',page:'areas_ohio_cuyahoga_county',total:3},
  {event:'page_view',service:'unsure',page:'areas_ohio',total:99},
  {event:'contact_select',service:'grow',page:'areas_erie_county',total:100}
 );
 report.arrivals=Array.from({length:20},(_,i)=>({page:'guides_example_'+i,source:'search',service:'unsure',total:i+1}));
 report.arrivals.push({page:'guides_example_0',source:'direct',service:'grow',total:100});
 const before=JSON.stringify(report),output=formatMeasurement(report);
 const views=output.split('Page views by page')[1].split('County and equivalent-area pages')[0];
 const arrivals=output.split('Landing pages')[1].split('Page views by page')[0];
 assert.ok(views.indexOf('Area — Ohio: 99')<views.indexOf('Guide — Example 19: 20'));
 assert.equal((views.match(/: \d+/g)||[]).length,15);assert.doesNotMatch(views,/Guide — Example 0:/);
 assert.match(arrivals,/Guide — Example 0: 101/);
 assert.ok(arrivals.indexOf('Guide — Example 0: 101')<arrivals.indexOf('Guide — Example 19: 20'));
 assert.equal((arrivals.match(/: \d+/g)||[]).length,15);
 assert.match(output,/NY: 62 pages \/ 7 views \/ 61 pages with no recorded views/);
 assert.match(output,/PA: 67 pages \/ 4 views \/ 66 pages with no recorded views/);
 assert.match(output,/OH: 88 pages \/ 3 views \/ 87 pages with no recorded views/);
 assert.match(output,/does not establish zero visitors/);
 assert.match(formatMeasurement(report,{all:true}),/Area — Erie County: 7/);
 assert.equal(JSON.stringify(report),before);
});

test('measurement all flag preserves the same aggregate request and rejects ambiguous arguments',async()=>{
 for(const args of [['measurement','7','--all'],['measurement','--all']]){
  let called;
  const result=await productionOperator(args,{credentials:()=>({OPERATOR_TOKEN:'synthetic'}),fetchImpl:async url=>{called=url;return Response.json(measurement());}});
  assert.equal(called,'https://wonderandmethod.com/api/operator/journey-summary?days=7');assert.deepEqual(result,measurement());
 }
 for(const args of [['measurement','7','private'],['measurement','--all','--all'],['measurement','91','--all']]){
  await assert.rejects(()=>productionOperator(args,{credentials:()=>{throw Error('Must validate before credentials');}}),/Measurement/);
 }
});

const shortHash=body=>createHash('sha256').update(body).digest('hex').slice(0,12);
function assetEnvironment(path,body,type,extra={}){
 const hash=shortHash(body),calls=[];
 const env={ENVIRONMENT:'production',RELEASE_APPROVED:'true',SEARCH_INDEXING:'true',ASSETS:{fetch:async request=>{
  const requested=new URL(request.url).pathname;calls.push(requested);
  if(requested==='/assets/asset-hashes.json')return Response.json({[path]:hash});
  return new Response(request.method==='HEAD'?null:body,{headers:{'Content-Type':type,'Content-Length':String(Buffer.byteLength(body))},...extra});
 }}};
 return {env,hash,calls};
}
test('manifest versions cover fonts, images, modules and media without changing ordinary caching',async()=>{
 const types={mjs:'text/javascript',woff2:'font/woff2',gif:'image/gif',png:'image/png',jpg:'image/jpeg',svg:'image/svg+xml',webp:'image/webp',avif:'image/avif',mp4:'video/mp4'};
 for(const [extension,type] of Object.entries(types)){
  const path='/assets/fixture.'+extension,body='synthetic asset '+extension,{env,hash}=assetEnvironment(path,body,type);
  for(const [query,expected] of [['?v='+hash,'public, max-age=31536000, immutable'],['?v=000000000000','no-cache'],['','public, max-age=3600, must-revalidate']]){
   const response=await worker.fetch(new Request('https://example.test'+path+query),env,context());
   assert.equal(response.headers.get('Cache-Control'),expected,path+query);assert.equal(await response.text(),body);
  }
  const ambiguous=await worker.fetch(new Request('https://example.test'+path+'?v='+hash+'&v=000000000000'),env,context());
  assert.doesNotMatch(ambiguous.headers.get('Cache-Control'),/immutable/);
 }
});

test('manifest verification handles HEAD, conditional and range responses',async()=>{
 const path='/assets/movie.mp4',body='0123456789',{env,hash}=assetEnvironment(path,body,'video/mp4');
 const head=await worker.fetch(new Request('https://example.test'+path+'?v='+hash,{method:'HEAD'}),env,context());
 assert.match(head.headers.get('Cache-Control'),/immutable/);assert.equal(await head.text(),'');
 const range=await worker.fetch(new Request('https://example.test'+path+'?v='+hash,{headers:{Range:'bytes=2-5'}}),env,context());
 assert.equal(range.status,206);assert.equal(await range.text(),'2345');assert.match(range.headers.get('Cache-Control'),/immutable/);
 const conditional=assetEnvironment(path,body,'video/mp4',{status:304});
 conditional.env.ASSETS.fetch=async request=>new URL(request.url).pathname==='/assets/asset-hashes.json'?Response.json({[path]:hash}):new Response(null,{status:304});
 const unchanged=await worker.fetch(new Request('https://example.test'+path+'?v='+hash,{headers:{'If-None-Match':'"synthetic"'}}),conditional.env,context());
 assert.equal(unchanged.status,304);assert.match(unchanged.headers.get('Cache-Control'),/immutable/);
});

test('a versioned full film remains streamed rather than read to compute its hash',async()=>{
 let controller;
 const path='/assets/stream.mp4',hash='123456abcdef';
 const env={ENVIRONMENT:'production',RELEASE_APPROVED:'true',SEARCH_INDEXING:'true',ASSETS:{fetch:async request=>{
  if(new URL(request.url).pathname==='/assets/asset-hashes.json')return Response.json({[path]:hash});
  return new Response(new ReadableStream({start(value){controller=value;}}),{headers:{'Content-Type':'video/mp4'}});
 }}};
 let timeout;
 try{
  const response=await Promise.race([worker.fetch(new Request('https://example.test'+path+'?v='+hash),env,context()),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Worker buffered the film before returning headers')),500);})]);
  assert.match(response.headers.get('Cache-Control'),/immutable/);controller.close();controller=null;await response.body.cancel();
 }finally{clearTimeout(timeout);controller?.close();}
});

test('documents, missing assets and protected staging never gain immutable caching',async()=>{
 for(const path of ['/assets/guides/checklist.txt','/assets/data.csv','/assets/buyer-packs/example.js']){
  const {env,hash}=assetEnvironment(path,'fixture','text/plain');
  const response=await worker.fetch(new Request('https://example.test'+path+'?v='+hash),env,context());
  assert.equal(response.headers.get('Cache-Control'),'no-cache');
 }
 const {env,hash,calls}=assetEnvironment('/assets/image.webp','fixture','image/webp');
 Object.assign(env,{ENVIRONMENT:'staging',STAGING_AUTH:'synthetic:password'});
 const denied=await worker.fetch(new Request('https://example.test/assets/image.webp?v='+hash),env,context());
 assert.equal(denied.status,401);assert.deepEqual(calls,[]);
 const allowed=await worker.fetch(new Request('https://example.test/assets/image.webp?v='+hash,{headers:{Authorization:'Basic '+btoa(env.STAGING_AUTH)}}),env,context());
 assert.equal(allowed.headers.get('Cache-Control'),'private, no-store');assert.match(allowed.headers.get('X-Robots-Tag'),/noindex/);
 const missing=assetEnvironment('/assets/missing.webp','missing','image/webp',{status:404});
 const response=await worker.fetch(new Request('https://example.test/assets/missing.webp?v='+missing.hash),missing.env,context());
 assert.doesNotMatch(response.headers.get('Cache-Control')||'',/immutable/);
});


test('public asset hash index requests are blocked while internal image verification still works',async()=>{
 const path='/assets/image.webp',body='fixture',{env,hash,calls}=assetEnvironment(path,body,'image/webp');
 for(const pathname of ['/assets/asset-hashes.json','/assets/asset-hashes.json?v='+hash,'/assets/asset-hashes.json/','/assets/%61sset-hashes.json','/assets%2Fasset-hashes.json','//assets//asset-hashes.json','/ASSETS/ASSET-HASHES.JSON']){
  for(const method of ['GET','HEAD','POST']){
   const response=await worker.fetch(new Request('https://example.test'+pathname,{method}),env,context());
   assert.equal(response.status,404,method+' '+pathname);
   assert.equal(response.headers.get('Cache-Control'),'no-store');
   assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
   assert.equal(await response.text(),method==='HEAD'?'':'Not found.');
  }
 }
 assert.deepEqual(calls,[],'Direct requests do not enter the ASSETS binding');
 const image=await worker.fetch(new Request('https://example.test'+path+'?v='+hash),env,context());
 assert.equal(image.status,200);assert.equal(await image.text(),body);
 assert.match(image.headers.get('Cache-Control'),/immutable/);
 assert.deepEqual(calls,[path,'/assets/asset-hashes.json']);
});
