import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import worker,{notifyInquiry,retryPendingInquiries,runScheduledMaintenance} from '../deployment/worker.mjs';
import {inquiryStatus,recordRecoverySuccess} from '../deployment/inquiry-health.mjs';
import {inquiryRetentionPreview} from '../deployment/inquiry-maintenance.mjs';
import {productionOperator} from '../deployment/production-operator.mjs';
import {publicRouteRedirect} from '../deployment/public-route-canonical.mjs';

const migrationDirectory=new URL('../deployment/migrations/',import.meta.url);
const migrationNames=(await readdir(migrationDirectory)).filter(name=>name.endsWith('.sql')).sort();
const migrations=await Promise.all(migrationNames.map(name=>readFile(new URL(name,migrationDirectory),'utf8')));
const day=86400_000,origin='https://example.test',token='synthetic-operator-token';
const payload={name:'Synthetic Person',email:'synthetic@example.test',website:'https://example.test',service:'unsure',request_kind:'question',message:'A synthetic request for local validation only.'};
const noBackground={waitUntil(){throw Error('Unexpected queued send');}};

function fixture({resolution=true,before}={}){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec('PRAGMA foreign_keys=ON');
 migrations.forEach((sql,index)=>{if(resolution||!migrationNames[index].startsWith('0009_'))sqlite.exec(sql);});
 const db={sqlite,prepare(sql){
  const build=values=>({
   bind:(...next)=>build(next),
   async first(){await before?.(sql,values,sqlite);return sqlite.prepare(sql).get(...values)??null;},
   async all(){await before?.(sql,values,sqlite);return {results:sqlite.prepare(sql).all(...values)};},
   async run(){await before?.(sql,values,sqlite);return {meta:sqlite.prepare(sql).run(...values)};}
  });
  return build([]);
 }};
 return {DB:db,ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',SEARCH_INDEXING:'true',
  OPERATOR_TOKEN:token,FINGERPRINT_SECRET:'synthetic-fingerprint-secret-over-32-characters',
  RESEND_API_KEY:'synthetic-key',NOTIFICATION_FROM:'from@example.test',NOTIFICATION_TO:'owner@example.test',
  NOTIFICATION_DAILY_LIMIT:'50',NOTIFICATION_RESERVED_LIMIT:'10',
  ASSETS:{fetch:async()=>new Response('<h1>Page not found</h1>',{headers:{'Content-Type':'text/html'}})}};
}
function insert(env,values={}){
 const now=Date.now();
 const row={id:crypto.randomUUID(),created_at:now-3*day,payload:JSON.stringify(payload),dedupe_key:crypto.randomUUID(),
  synthetic:0,delivery_status:'manual_review',attempts:5,first_attempt_at:now-day,lease_until:null,
  provider_id:null,notification_payload:'frozen synthetic request',last_substantive_contact_at:null,
  is_client:0,retention_hold:0,retention_hold_reason:null,retention_hold_review_at:null,...values};
 const fields=Object.keys(row);
 env.DB.sqlite.prepare(`INSERT INTO inquiries (${fields.join(',')}) VALUES (${fields.map(()=>'?').join(',')})`).run(...Object.values(row));
 return row.id;
}
const row=(env,id)=>({...env.DB.sqlite.prepare('SELECT * FROM inquiries WHERE id=?').get(id)});
const auth={Accept:'application/json',Authorization:'Bearer '+token};
function resolveRequest(id,value={outcome:'handled_manually',evidence_reference:'incident-20261020-01'},options={}){
 return new Request(origin+'/api/operator/inquiries/'+id+'/resolve',{
  method:'POST',...options,headers:{...auth,'Content-Type':'application/json','X-Confirm-Resolve':id,...options.headers},
  body:options.body??JSON.stringify(value)
 });
}
async function resolveRecord(env,id,value){
 const response=await worker.fetch(resolveRequest(id,value),env,noBackground);
 return {status:response.status,body:await response.json()};
}

test('retention starts review at day 80 without changing day-90 deadlines or protected records',async()=>{
 const env=fixture(),now=Date.UTC(2026,9,20,12);
 try{
  const known=age=>insert(env,{created_at:now-120*day,delivery_status:'accepted',last_substantive_contact_at:now-age*day});
  const unknown=age=>insert(env,{created_at:now-age*day,delivery_status:'accepted'});
  const recent=known(79.999),at80=known(80),at89=known(89.999),at90=known(90);
  const unknownRecent=unknown(79.999),unknown80=unknown(80),unknown90=unknown(90);
  const protectedIds=[
   insert(env,{created_at:now-120*day,delivery_status:'accepted',last_substantive_contact_at:now-100*day,is_client:1}),
   insert(env,{created_at:now-120*day,delivery_status:'accepted',last_substantive_contact_at:now-100*day,retention_hold:1,retention_hold_reason:'Synthetic hold',retention_hold_review_at:now+day}),
   insert(env,{created_at:now-120*day,delivery_status:'sending',last_substantive_contact_at:now-100*day,lease_until:now+60_000}),
   insert(env,{created_at:now-120*day,delivery_status:'synthetic',last_substantive_contact_at:now-100*day,synthetic:1})
  ];
  const before=env.DB.sqlite.prepare('SELECT * FROM inquiries ORDER BY id').all();
  const preview=await inquiryRetentionPreview(env.DB,now),status=await inquiryStatus(env,now);
  assert.equal(preview.dry_run,true);assert.equal(preview.retention_days,90);assert.equal(preview.review_starts_after_days,80);
  assert.deepEqual(preview.due.map(x=>x.id),[at90]);
  assert.deepEqual(new Set(preview.upcoming.map(x=>x.id)),new Set([at80,at89]));
  assert.equal(preview.upcoming.find(x=>x.id===at80).retention_due_at,now+10*day);
  assert.deepEqual(preview.unconfirmed_old_needing_review.map(x=>x.id),[unknown90]);
  assert.deepEqual(preview.unconfirmed_upcoming_needing_review.map(x=>x.id),[unknown80]);
  const listed=[...preview.due,...preview.upcoming,...preview.unconfirmed_old_needing_review,...preview.unconfirmed_upcoming_needing_review].map(x=>x.id);
  for(const id of [recent,unknownRecent,...protectedIds])assert.ok(!listed.includes(id));
  assert.equal(status.attention.retention.due,1);assert.equal(status.attention.retention.upcoming,2);
  assert.equal(status.attention.retention.unconfirmed_old,1);assert.equal(status.attention.retention.unconfirmed_upcoming,1);
  assert.equal(status.attention.retention.review_required,true);
  assert.deepEqual(env.DB.sqlite.prepare('SELECT * FROM inquiries ORDER BY id').all(),before);
 }finally{env.DB.sqlite.close();}
});

test('advance and overdue retention work never suppresses the delivery heartbeat',async()=>{
 const env=fixture(),now=Date.now();env.HEALTHCHECK_URL='https://monitor.example.test/synthetic-only';
 try{
  insert(env,{created_at:now-100*day,delivery_status:'accepted',last_substantive_contact_at:now-85*day});
  insert(env,{created_at:now-100*day,delivery_status:'accepted'});
  const calls=[];
  const result=await runScheduledMaintenance(env,{now,clock:()=>now,logger:()=>{},send:async(url,options)=>{calls.push({url,options});return new Response('');}});
  assert.equal(result.ok,true);assert.equal(calls.length,1);assert.equal(calls[0].url,env.HEALTHCHECK_URL);
  assert.equal(calls[0].options.body,undefined);assert.equal(calls[0].options.redirect,'manual');
  const status=await inquiryStatus(env,now);assert.equal(status.health.ok,true);assert.equal(status.attention.retention.review_required,true);
 }finally{env.DB.sqlite.close();}
});

test('additive resolution migration preserves all inquiry fields and old-schema behavior fails safely',async()=>{
 const env=fixture({resolution:false});
 try{
  const id=insert(env),before=row(env,id);
  let health=await inquiryStatus(env);assert.equal(health.resolution.migration_ready,false);assert.equal(health.attention.manual_review,1);
  const denied=await resolveRecord(env,id);assert.equal(denied.status,503);assert.deepEqual(row(env,id),before);
  let sends=0;assert.equal((await notifyInquiry(env,id,async()=>{sends++;throw Error('No send');})).sent,false);assert.equal(sends,0);
  env.DB.sqlite.exec(migrations[migrationNames.indexOf('0009_inquiry_delivery_resolutions.sql')]);
  assert.deepEqual(row(env,id),before);
  health=await inquiryStatus(env);assert.equal(health.resolution.migration_ready,true);assert.equal(health.attention.manual_review,1);
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) n FROM inquiry_delivery_resolutions').get().n,0);
 }finally{env.DB.sqlite.close();}
});

test('resolution is no-send, preserves provider/retention truth and remains safe under retry and maintenance',async t=>{
 const env=fixture(),now=Date.now();env.HEALTHCHECK_URL='https://monitor.example.test/synthetic-only';
 t.mock.method(globalThis,'fetch',async()=>{throw Error('Unexpected external send');});
 try{
  const id=insert(env,{last_substantive_contact_at:now-2*day,is_client:1,retention_hold:1,retention_hold_reason:'Synthetic preservation',retention_hold_review_at:now+day});
  const before=row(env,id),result=await resolveRecord(env,id);
  assert.equal(result.status,200);assert.equal(result.body.status,'manual_review_resolved');assert.equal(result.body.already_resolved,false);
  assert.equal(result.body.resolution.outcome,'handled_manually');assert.deepEqual(row(env,id),before);
  let sends=0;const send=async()=>{sends++;throw Error('Resolved record sent');};
  assert.deepEqual(await notifyInquiry(env,id,send,now+day,{ownerReviewed:true}),{status:'manual_review_resolved',sent:false});
  const retry=await worker.fetch(new Request(origin+'/api/operator/inquiries/'+id+'/retry',{method:'POST',headers:{...auth,'X-Confirm-Retry':id}}),env,noBackground);
  assert.equal(retry.status,200);assert.equal((await retry.json()).status,'manual_review_resolved');assert.equal(sends,0);
  assert.equal((await retryPendingInquiries(env,send,now,()=>now)).attempted,0);
  const monitored=[];
  assert.equal((await runScheduledMaintenance(env,{now,clock:()=>now,logger:()=>{},send:async url=>{monitored.push(url);return new Response('');}})).ok,true);
  assert.deepEqual(monitored,[env.HEALTHCHECK_URL]);assert.deepEqual(row(env,id),before);
  const status=await inquiryStatus(env,now);
  assert.equal(status.delivery.manual_review,1);assert.equal(status.attention.manual_review,0);
  assert.equal(status.resolution.manual_review_resolved,1);assert.equal(status.health.ok,true);
  const exported=await worker.fetch(new Request(origin+'/api/operator/inquiries',{headers:auth}),env,noBackground);
  const exportedRow=(await exported.json()).records[0];
  assert.equal(exportedRow.delivery_status,'manual_review');assert.equal(exportedRow.resolution_outcome,'handled_manually');
  assert.equal(exportedRow.resolution_evidence_reference,'incident-20261020-01');
 }finally{env.DB.sqlite.close();}
});

test('resolving one incident cannot hide another manual review, backlog or exhausted budget',async()=>{
 const env=fixture(),now=Date.now();
 try{
  const id=insert(env);assert.equal((await resolveRecord(env,id)).status,200);await recordRecoverySuccess(env.DB,now);
  insert(env);
  insert(env,{delivery_status:'pending',attempts:0,first_attempt_at:null,created_at:now-11*60_000});
  env.DB.sqlite.prepare('INSERT INTO rate_limits(key,hits,expires_at) VALUES(?,?,?)').run('notification-quota:'+Math.floor(now/day),40,now+day);
  const status=await inquiryStatus(env,now);
  assert.equal(status.attention.manual_review,1);assert.equal(status.resolution.manual_review_resolved,1);
  assert.ok(status.health.reasons.includes('manual_review_required'));
  assert.ok(status.health.reasons.includes('notification_backlog'));
  assert.ok(status.health.reasons.includes('automatic_notification_budget_exhausted'));
  assert.equal(status.health.ok,false);
 }finally{env.DB.sqlite.close();}
});

test('resolution requires authentication, exact confirmation, constrained evidence and inactive manual state',async t=>{
 const env=fixture();t.mock.method(globalThis,'fetch',async()=>{throw Error('Unexpected send');});
 try{
  const id=insert(env),before=row(env,id);
  let response=await worker.fetch(resolveRequest(id,undefined,{headers:{Authorization:''}}),env,noBackground);
  assert.equal(response.status,401);
  response=await worker.fetch(resolveRequest(id,undefined,{headers:{'X-Confirm-Resolve':crypto.randomUUID()}}),env,noBackground);
  assert.equal(response.status,405);
  for(const value of [
   {},{outcome:'accepted',evidence_reference:'incident-01'},
   {outcome:'handled_manually',evidence_reference:'person@example.test'},
   {outcome:'handled_manually',evidence_reference:'https://example.test/evidence'},
   {outcome:'handled_manually',evidence_reference:'incident-01',attempts:0},
   {outcome:'handled_manually',evidence_reference:'A'.repeat(81)}
  ])assert.equal((await resolveRecord(env,id,value)).status,422);
  assert.equal((await worker.fetch(resolveRequest(id,undefined,{body:'{' }),env,noBackground)).status,400);
  assert.equal((await resolveRecord(env,crypto.randomUUID())).status,404);
  for(const delivery_status of ['accepted','pending','failed','uncertain','sending']){
   const other=insert(env,{delivery_status});assert.equal((await resolveRecord(env,other)).status,409);
  }
  const synthetic=insert(env,{synthetic:1}),leased=insert(env,{lease_until:Date.now()+day});
  assert.equal((await resolveRecord(env,synthetic)).status,409);assert.equal((await resolveRecord(env,leased)).status,409);
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) n FROM inquiry_delivery_resolutions').get().n,0);
  assert.deepEqual(row(env,id),before);
 }finally{env.DB.sqlite.close();}
});

test('resolution eligibility is checked atomically at the write, not from an earlier read',async()=>{
 let raced=false;
 const env=fixture({before(sql,values,sqlite){
  if(!raced&&sql.startsWith('INSERT INTO inquiry_delivery_resolutions')){
   raced=true;sqlite.prepare("UPDATE inquiries SET delivery_status='sending',lease_until=? WHERE id=?").run(Date.now()+day,values[3]);
  }
 }});
 try{
  const id=insert(env);assert.equal((await resolveRecord(env,id)).status,409);assert.equal(raced,true);
  assert.equal(row(env,id).delivery_status,'sending');
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) n FROM inquiry_delivery_resolutions').get().n,0);
 }finally{env.DB.sqlite.close();}
});

test('concurrent repeated resolutions are idempotent and conflicting evidence cannot overwrite the first',async()=>{
 const env=fixture();
 try{
  const id=insert(env),before=row(env,id);
  const repeated=await Promise.all([resolveRecord(env,id),resolveRecord(env,id)]);
  assert.deepEqual(repeated.map(x=>x.status),[200,200]);
  assert.deepEqual(repeated.map(x=>x.body.already_resolved).sort(),[false,true]);
  const saved={...env.DB.sqlite.prepare('SELECT * FROM inquiry_delivery_resolutions WHERE inquiry_id=?').get(id)};
  assert.equal((await resolveRecord(env,id,{outcome:'spam_confirmed',evidence_reference:'different-incident'})).status,409);
  assert.deepEqual({...env.DB.sqlite.prepare('SELECT * FROM inquiry_delivery_resolutions WHERE inquiry_id=?').get(id)},saved);
  assert.deepEqual(row(env,id),before);
 }finally{env.DB.sqlite.close();}
});

test('a late provider completion cannot overwrite an investigated resolution or restart sending',async()=>{
 const env=fixture(),now=Date.now();
 let release,entered;
 const started=new Promise(resolve=>entered=resolve),waiting=new Promise(resolve=>release=resolve);
 try{
  const id=insert(env,{created_at:now-25*60*60_000,delivery_status:'pending',attempts:0,first_attempt_at:null,notification_payload:null});
  let sends=0;
  const pending=notifyInquiry(env,id,async()=>{sends++;entered();await waiting;return Response.json({id:'synthetic-late-provider'});},now-23*60*60_000);
  await started;
  assert.equal((await retryPendingInquiries(env,async()=>{throw Error('Unexpected second send');},now,()=>now)).attempted,0);
  assert.equal(row(env,id).delivery_status,'manual_review');
  const result=await resolveRecord(env,id);assert.equal(result.status,200);
  const resolvedRow=row(env,id);release();
  const completed=await pending;
  assert.equal(completed.staleAttempt,true);assert.equal(completed.sent,false);assert.equal(sends,1);
  assert.deepEqual(row(env,id),resolvedRow);assert.equal(row(env,id).provider_id,null);
  assert.equal((await notifyInquiry(env,id,async()=>{throw Error('Resolved retry sent');},now)).status,'manual_review_resolved');
 }finally{release?.();env.DB.sqlite.close();}
});

test('exact confirmed inquiry deletion removes resolution metadata, while a hold still blocks deletion',async()=>{
 const env=fixture();
 try{
  const id=insert(env,{retention_hold:1,retention_hold_reason:'Synthetic hold',retention_hold_review_at:Date.now()+day});
  assert.equal((await resolveRecord(env,id)).status,200);
  const remove=()=>worker.fetch(new Request(origin+'/api/operator/inquiries/'+id,{method:'DELETE',headers:{...auth,'X-Confirm-Delete':id}}),env,noBackground);
  assert.equal((await remove()).status,409);
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) n FROM inquiry_delivery_resolutions').get().n,1);
  env.DB.sqlite.prepare('UPDATE inquiries SET retention_hold=0 WHERE id=?').run(id);
  assert.equal((await remove()).status,200);
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) n FROM inquiry_delivery_resolutions').get().n,0);
 }finally{env.DB.sqlite.close();}
});

test('operator resolve validates arguments before credentials and sends only the exact confirmed JSON action',async()=>{
 const id=crypto.randomUUID();
 for(const args of [
  ['resolve',id,id],
  ['resolve',id,'wrong','handled_manually','incident-01'],
  ['resolve',id,id,'accepted','incident-01'],
  ['resolve',id,id,'handled_manually','person@example.test']
 ])await assert.rejects(()=>productionOperator(args,{credentials:()=>{throw Error('Credentials must not be read');}}),/Use status|exact inquiry reference|Resolution needs/);
 let captured;
 const result=await productionOperator(['resolve',id,id,'duplicate_confirmed','incident-01'],{
  credentials:()=>({OPERATOR_TOKEN:'synthetic-only'}),fetchImpl:async(url,options)=>{
   captured={url,options};return Response.json({status:'manual_review_resolved',resolution:{outcome:'duplicate_confirmed'},already_resolved:false,message:'No mail sent.'});
  }
 });
 assert.equal(result.action,'resolve');assert.equal(captured.options.method,'POST');
 assert.equal(captured.url,'https://wonderandmethod.com/api/operator/inquiries/'+id+'/resolve');
 assert.equal(captured.options.headers['X-Confirm-Resolve'],id);assert.equal(captured.options.redirect,'error');
 assert.deepEqual(JSON.parse(captured.options.body),{outcome:'duplicate_confirmed',evidence_reference:'incident-01'});
});

test('known buyer-pack aliases combine origin and document normalization in a single permanent hop',async()=>{
 const canonical='https://wonderandmethod.com',env=fixture();env.PUBLIC_ORIGIN=canonical;
 env.ASSETS.fetch=async()=>{throw Error('Alias should not reach assets');};
 try{
  for(const id of ['launch_site','focused_site','signature_site','website_baseline','audit_fix_sprint','keep_running','improve','grow']){
   for(const method of ['GET','HEAD']){
    const query='?v=abc&x=%2f&x=two+words';
    const response=await worker.fetch(new Request('http://www.wonderandmethod.com/assets/buyer-packs/'+id+'/'+query,{method}),env,noBackground);
    assert.equal(response.status,308);
    assert.equal(response.headers.get('Location'),canonical+'/assets/buyer-packs/'+id+query);
    assert.equal(publicRouteRedirect(new URL(response.headers.get('Location')),method,canonical),null);
   }
  }
  for(const path of ['/assets/buyer-packs/unknown/','/assets/buyer-packs/Launch_site/','/assets/buyer-packs/index.json/']){
   assert.equal(publicRouteRedirect(new URL(canonical+path),'GET',canonical),null);
  }
  for(const method of ['POST','PUT','DELETE','OPTIONS'])assert.equal(publicRouteRedirect(new URL('http://www.wonderandmethod.com/assets/buyer-packs/launch_site/'),method,canonical),null);
  assert.equal(publicRouteRedirect(new URL('http://www.wonderandmethod.com/api/inquiries'),'GET',canonical),null);
 }finally{env.DB.sqlite.close();}
});

test('buyer-pack content remains revalidated after canonicalization, including 304 responses',async()=>{
 const env=fixture();
 try{
  for(const status of [200,304]){
   env.ASSETS.fetch=async()=>new Response(status===304?null:'<h1>Buyer pack</h1>',{status,headers:{'Content-Type':'text/html','Cache-Control':'public, max-age=999999'}});
   for(const ending of ['', '.html']){
    const response=await worker.fetch(new Request(origin+'/assets/buyer-packs/launch_site'+ending+'?v=abcdef123456'),env,noBackground);
    assert.equal(response.status,status);assert.equal(response.headers.get('Cache-Control'),'no-cache');
   }
  }
  env.ASSETS.fetch=async()=>Response.redirect(origin+'/assets/buyer-packs/launch_site?v=keep',307);
  const alias=await worker.fetch(new Request(origin+'/assets/buyer-packs/launch_site.html?v=keep'),env,noBackground);
  assert.equal(alias.status,308);assert.equal(alias.headers.get('Location'),origin+'/assets/buyer-packs/launch_site?v=keep');
 }finally{env.DB.sqlite.close();}
});

test('unknown API browser pages use branded no-store 404 while known and machine routes retain their contract',async()=>{
 const env=fixture(),assetRequests=[];
 env.ASSETS.fetch=async request=>{assetRequests.push(request);return new Response('<h1>Page not found</h1>',{status:404,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=999'}});};
 try{
  for(const method of ['GET','HEAD']){
   const response=await worker.fetch(new Request(origin+'/api/unrecognized',{method,headers:{Accept:'text/html,application/xhtml+xml'}}),env,noBackground);
   assert.equal(response.status,404);assert.equal(response.headers.get('Cache-Control'),'no-store');
   assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
   const text=await response.text();assert.equal(method==='HEAD'?text:'', '');
   if(method==='GET'){assert.match(text,/Page not found/);assert.doesNotMatch(text,/Inquiry status/);}
  }
  assert.equal(assetRequests.length,2);assert.ok(assetRequests.every(x=>new URL(x.url).pathname==='/404/'));
  const json=await worker.fetch(new Request(origin+'/api/unrecognized',{headers:{Accept:'application/json'}}),env,noBackground);
  assert.deepEqual(await json.json(),{message:'Not found.'});assert.equal(json.status,404);
  const refusedHtml=await worker.fetch(new Request(origin+'/api/unrecognized',{headers:{Accept:'text/html;q=0,application/json'}}),env,noBackground);
  assert.deepEqual(await refusedHtml.json(),{message:'Not found.'});assert.equal(assetRequests.length,2);
  const mutation=await worker.fetch(new Request(origin+'/api/unrecognized',{method:'POST',headers:{Accept:'text/html'}}),env,noBackground);
  assert.equal(await mutation.text(),'Not found.');assert.equal(assetRequests.length,2);
  const inquiry=await worker.fetch(new Request(origin+'/api/inquiries',{headers:{Accept:'text/html'}}),env,noBackground);
  assert.equal(inquiry.status,405);assert.equal(inquiry.headers.get('Allow'),'POST');
  const operator=await worker.fetch(new Request(origin+'/api/operator/unknown',{headers:{Accept:'text/html'}}),env,noBackground);
  assert.equal(operator.status,401);assert.equal(assetRequests.length,2);
  env.ASSETS.fetch=async()=>{throw Error('Missing asset');};
  const missing=await worker.fetch(new Request(origin+'/api/unrecognized',{headers:{Accept:'text/html'}}),env,noBackground);
  assert.equal(missing.status,404);assert.equal(await missing.text(),'Not found.');
 }finally{env.DB.sqlite.close();}
});

test('rate-limited correction pages use actual minutes or hours while preserving entries and Retry-After',async t=>{
 const env=fixture(),now=Date.UTC(2026,9,20,12,23,10);t.mock.method(Date,'now',()=>now);
 try{
  const cases=[{ip:'192.0.2.20',period:day,limit:10,expected:'12 hours'},{ip:'192.0.2.21',period:3600_000,limit:3,expected:'37 minutes'}];
  for(const item of cases){
   const bucket=Math.floor(now/item.period),key=createHmac('sha256',env.FINGERPRINT_SECRET).update(`inquiry:${item.ip}:${item.period}:${bucket}`).digest('hex');
   env.DB.sqlite.prepare('INSERT INTO rate_limits(key,hits,expires_at) VALUES(?,?,?)').run(key,item.limit,(bucket+2)*item.period);
   const response=await worker.fetch(new Request(origin+'/api/inquiries',{method:'POST',headers:{Origin:origin,Accept:'text/html','Content-Type':'application/x-www-form-urlencoded','CF-Connecting-IP':item.ip},body:new URLSearchParams(payload)}),env,noBackground);
   assert.equal(response.status,429);
   const text=await response.text();assert.ok(text.includes(item.expected));assert.doesNotMatch(text,/tomorrow|1440 minutes/);
   assert.match(text,/Your entries are kept here/);assert.ok(text.includes(payload.message));
   assert.equal(Number(response.headers.get('Retry-After')),Math.ceil(((bucket+1)*item.period-now)/1000));
  }
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) n FROM inquiries').get().n,0);
 }finally{env.DB.sqlite.close();}
});

test('new and historical filled honeypots fail before persistence or queued notification',async()=>{
 const env=fixture();
 try{
  for(const name of ['_wm_note','_faxcheck','company_url']){
   const response=await worker.fetch(new Request(origin+'/api/inquiries',{method:'POST',headers:{Origin:origin,Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({...payload,[name]:'synthetic filled trap'})}),env,noBackground);
   assert.equal(response.status,422);assert.match((await response.json()).message,/Unable to accept/);
  }
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) n FROM inquiries').get().n,0);
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) n FROM rate_limits').get().n,0);
 }finally{env.DB.sqlite.close();}
});
