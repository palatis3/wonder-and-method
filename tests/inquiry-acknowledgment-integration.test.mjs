import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import worker,{notifyInquiryAndAcknowledge,runScheduledMaintenance} from '../deployment/worker.mjs';
import {queueInquiryAcknowledgment,sendInquiryAcknowledgment} from '../deployment/inquiry-acknowledgment.mjs';
import {inquiryStatus,recordRecoverySuccess} from '../deployment/inquiry-health.mjs';
import {createDeletionPlan,executeDeletionPlan} from '../deployment/inquiry-deletion-batch.mjs';
import {productionOperator} from '../deployment/production-operator.mjs';

const migrationRoot=new URL('../deployment/migrations/',import.meta.url);
const migrations=await Promise.all((await readdir(migrationRoot)).filter(name=>/^00(?:0[1-9]|[12]\d|3[0-5])_.*\.sql$/.test(name)).sort().map(async name=>[name,await readFile(new URL(name,migrationRoot),'utf8')]));
const day=86400_000;
const idFor=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const input={name:'Synthetic private person',email:'visitor@example.test',business:'Synthetic business',service:'unsure',message:'Synthetic private message only.',email_receipt:'requested'};
function fixture(t,{ackMigration=true}={}) {
  const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
  for(const [name,sql] of migrations)if(ackMigration||!name.startsWith('0035_'))sqlite.exec(sql);
  t.after(()=>sqlite.close());
  const DB={sqlite,prepare(sql){const statement=values=>({bind:(...next)=>statement(next),
    async first(){return sqlite.prepare(sql).get(...values)??null;},
    async all(){return {results:sqlite.prepare(sql).all(...values)};},
    async run(){return {success:true,meta:sqlite.prepare(sql).run(...values)};}});return statement([]);}};
  return {DB,ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',INQUIRY_ACKNOWLEDGMENT:'enabled',
    RESEND_API_KEY:'synthetic-not-a-live-key',NOTIFICATION_FROM:'Wonder and Method <studio@example.test>',NOTIFICATION_TO:'owner@example.test',
    FINGERPRINT_SECRET:'synthetic-fingerprint-secret-over-thirty-two-characters',OPERATOR_TOKEN:'synthetic-operator-token',
    NOTIFICATION_DAILY_LIMIT:'50',NOTIFICATION_RESERVED_LIMIT:'10',
    ASSETS:{fetch:async()=>Response.json({fixture:'synthetic-release'})}};
}
function seed(env,n=1,{created=Date.now(),delivery='pending',synthetic=0,payload={},contact=null}={}) {
  const id=idFor(n);
  env.DB.sqlite.prepare(`INSERT INTO inquiries(id,created_at,payload,dedupe_key,synthetic,delivery_status,last_substantive_contact_at)
    VALUES(?,?,?,?,?,?,?)`).run(id,created,JSON.stringify({...input,email:`visitor${n}@example.test`,...payload}),id,synthetic,delivery,contact);
  return id;
}
const inquiry=(env,id)=>env.DB.sqlite.prepare('SELECT * FROM inquiries WHERE id=?').get(id);
const acknowledgment=(env,id)=>env.DB.sqlite.prepare('SELECT * FROM inquiry_acknowledgments WHERE inquiry_id=?').get(id);
const accepted=async()=>Response.json({id:'synthetic-provider-id'});
const never=async()=>assert.fail('No provider call permitted');
const rowCount=env=>env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n;
const operatorHeaders={Authorization:'Bearer synthetic-operator-token',Accept:'application/json'};
function operatorRequest(id,{method='DELETE',suffix='',body,extra={}}={}) {
  return new Request(`https://example.test/api/operator/inquiries/${id}${suffix}`,{method,
    headers:{...operatorHeaders,'Content-Type':'application/json',...(method==='DELETE'?{'X-Confirm-Delete':id}:{}),...extra},
    ...(body?{body:JSON.stringify(body)}:{})});
}
function markSending(env,id,at) {
  env.DB.sqlite.prepare(`UPDATE inquiry_acknowledgments SET status='sending',attempts=attempts+1,
    first_attempt_at=?,last_attempt_at=?,lease_until=? WHERE inquiry_id=?`).run(at,at,at+60_000,id);
}

test('owner-first wrapper preserves owner result and only then sends the minimal visitor reference',async t=>{
  const env=fixture(t),now=Date.now(),id=seed(env,1,{created:now}),keys=[];
  const sender=async(_url,options)=>{
    const key=options.headers['Idempotency-Key'];keys.push(key);
    if(key.startsWith('inquiry/'))assert.equal(acknowledgment(env,id),undefined);
    else {assert.equal(inquiry(env,id).delivery_status,'accepted');assert.equal(acknowledgment(env,id).status,'sending');assert.doesNotMatch(JSON.parse(options.body).text,/Synthetic private|business|https:/);}
    return accepted();
  };
  assert.deepEqual(await notifyInquiryAndAcknowledge(env,id,sender,now),{status:'accepted',sent:true});
  assert.deepEqual(keys,[`inquiry/${id}`,`inquiry-acknowledgment/v1/${id}`]);
  const owner=inquiry(env,id);assert.equal(owner.attempts,1);assert.equal(acknowledgment(env,id).status,'accepted');
  assert.deepEqual(await notifyInquiryAndAcknowledge(env,id,never,now+1),{status:'accepted',sent:false});
  assert.deepEqual(inquiry(env,id),owner);
});

test('owner failure never queues a visitor email; legacy and synthetic payloads retain their old behavior',async t=>{
  const env=fixture(t),now=Date.now(),id=seed(env,1,{created:now});let calls=0;
  assert.deepEqual(await notifyInquiryAndAcknowledge(env,id,async()=>{calls++;return new Response(null,{status:503});},now),{status:'failed',sent:false});
  assert.equal(calls,1);assert.equal(acknowledgment(env,id),undefined);
  const legacy=seed(env,2,{created:now,payload:{email_receipt:undefined}});
  await notifyInquiryAndAcknowledge(env,legacy,async()=>{calls++;return accepted();},now);
  assert.equal(calls,2);assert.equal(acknowledgment(env,legacy),undefined);
  const synthetic=seed(env,3,{created:now,synthetic:1,delivery:'synthetic'});
  assert.equal((await notifyInquiryAndAcknowledge(env,synthetic,never,now)).sent,false);
  assert.equal(acknowledgment(env,synthetic),undefined);
});

test('optional storage failure exposes only a fixed code and preserves accepted owner delivery',async t=>{
  const env=fixture(t),now=Date.now(),id=seed(env,1,{created:now}),logs=[],prepare=env.DB.prepare;
  env.DB.prepare=sql=>{if(sql.startsWith('INSERT INTO inquiry_acknowledgments'))throw Error('Private visitor@example.test key must not leak');return prepare(sql);};
  assert.deepEqual(await notifyInquiryAndAcknowledge(env,id,accepted,now,{logger:code=>logs.push(code)}),{status:'accepted',sent:true});
  assert.deepEqual(logs,['inquiry_acknowledgment_failed']);assert.equal(inquiry(env,id).delivery_status,'accepted');assert.equal(acknowledgment(env,id),undefined);
  assert.doesNotMatch(JSON.stringify(logs),/@|Private|key/);
});

test('HTTP saved receipt returns while owner/visitor email remain asynchronous; optional provider failure cannot undo it',async t=>{
  const env=fixture(t),promises=[],calls=[];let ownerStarted,releaseOwner,ackStarted,releaseAck;
  const ownerReady=new Promise(resolve=>{ownerStarted=resolve;}),ownerResponse=new Promise(resolve=>{releaseOwner=resolve;});
  const ackReady=new Promise(resolve=>{ackStarted=resolve;}),ackResponse=new Promise(resolve=>{releaseAck=resolve;});
  t.mock.method(globalThis,'fetch',async(_url,options)=>{
    const key=options.headers['Idempotency-Key'];calls.push(key);
    if(key.startsWith('inquiry/')){ownerStarted();return ownerResponse;}
    ackStarted();return ackResponse;
  });
  const request=new Request('https://example.test/api/inquiries',{method:'POST',headers:{Origin:'https://example.test',Accept:'application/json','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.40'},body:JSON.stringify(input)});
  const response=await worker.fetch(request,env,{waitUntil:promise=>promises.push(promise)});
  assert.equal(response.status,202);const receipt=await response.json();assert.match(receipt.message,/saved/);assert.ok(receipt.reference);assert.equal(receipt.synthetic,false);
  await ownerReady;assert.equal(inquiry(env,receipt.reference).delivery_status,'sending');assert.equal(acknowledgment(env,receipt.reference),undefined);
  releaseOwner(await accepted());await ackReady;
  assert.equal(inquiry(env,receipt.reference).delivery_status,'accepted');assert.equal(acknowledgment(env,receipt.reference).status,'sending');
  releaseAck(new Response(null,{status:503}));await Promise.all(promises);
  assert.equal(acknowledgment(env,receipt.reference).status,'failed');assert.equal(response.status,202);assert.equal(calls.length,2);
});

test('scheduled owner recovery and health heartbeat precede optional acknowledgment failures',async t=>{
  const env=fixture(t),now=Date.now(),one=seed(env,1,{created:now-120_001}),two=seed(env,2,{created:now-120_001});
  env.HEALTHCHECK_URL='https://monitor.example.test/synthetic';const sequence=[],logs=[];
  const result=await runScheduledMaintenance(env,{now,clock:()=>now,logger:code=>logs.push(code),send:async(url,options)=>{
    if(url===env.HEALTHCHECK_URL){sequence.push('heartbeat');return new Response('OK');}
    const owner=options.headers['Idempotency-Key'].startsWith('inquiry/');sequence.push(owner?'owner':'ack');
    return owner?accepted():new Response(null,{status:503});
  }});
  assert.deepEqual(sequence,['owner','owner','heartbeat','ack','ack']);
  assert.deepEqual(result,{ok:false,codes:['scheduled_acknowledgment_row_failed']});assert.deepEqual(logs,result.codes);
  for(const id of [one,two]){assert.equal(inquiry(env,id).delivery_status,'accepted');assert.equal(acknowledgment(env,id).status,'failed');}
  assert.equal(env.DB.sqlite.prepare("SELECT last_success_at FROM operation_health WHERE name='inquiry-recovery'").get().last_success_at,now);
});

test('scheduled acknowledgment recovery runs independently after owner recovery throws',async t=>{
  const env=fixture(t),now=Date.now(),id=seed(env,1,{created:now-120_001,delivery:'accepted'}),prepare=env.DB.prepare,logs=[];
  env.DB.prepare=sql=>{if(sql.startsWith("UPDATE inquiries SET delivery_status = 'manual_review'"))throw Error('Private owner recovery error');return prepare(sql);};
  const result=await runScheduledMaintenance(env,{now,clock:()=>now,send:accepted,logger:code=>{logs.push(code);throw Error('Synthetic logger failure');}});
  assert.deepEqual(result,{ok:false,codes:['scheduled_recovery_failed']});assert.deepEqual(logs,result.codes);
  assert.equal(acknowledgment(env,id).status,'accepted');assert.equal(inquiry(env,id).attempts,0);
});

test('disabled scheduled recovery clears stale sending leases for ineligible parents without mail',async t=>{
  const env=fixture(t),now=Date.now(),id=seed(env,1,{created:now-120_001,delivery:'accepted'});
  await queueInquiryAcknowledgment(env,id,now-120_000);markSending(env,id,now-120_000);
  env.DB.sqlite.prepare('UPDATE inquiries SET retention_hold=1 WHERE id=?').run(id);
  const before=inquiry(env,id);env.INQUIRY_ACKNOWLEDGMENT='disabled';delete env.RESEND_API_KEY;
  assert.deepEqual(await runScheduledMaintenance(env,{now,clock:()=>now,send:never,logger:()=>{}}),{ok:true,codes:[]});
  assert.equal(acknowledgment(env,id).status,'suppressed');assert.equal(acknowledgment(env,id).lease_until,null);
  assert.deepEqual(inquiry(env,id),before);
});

test('optional recovery query failure remains generic and cannot skip existing owner monitor',async t=>{
  const env=fixture(t),now=Date.now(),prepare=env.DB.prepare,seen=[],logs=[];env.HEALTHCHECK_URL='https://monitor.example.test/synthetic';
  env.DB.prepare=sql=>{if(sql.includes("SET status=CASE")&&sql.includes('inquiry_acknowledgments'))throw Error('Private visitor@example.test');return prepare(sql);};
  const result=await runScheduledMaintenance(env,{now,clock:()=>now,logger:code=>logs.push(code),send:async url=>{seen.push(url);return new Response('OK');}});
  assert.deepEqual(seen,[env.HEALTHCHECK_URL]);assert.deepEqual(result,{ok:false,codes:['scheduled_acknowledgment_recovery_failed']});assert.deepEqual(logs,result.codes);
});

test('aggregate operator/CLI status includes optional failures without inquiry text or owner-health changes',async t=>{
  const env=fixture(t),now=Date.now(),id=seed(env,1,{created:now,delivery:'accepted'});
  await recordRecoverySuccess(env.DB,now);await queueInquiryAcknowledgment(env,id,now);
  await sendInquiryAcknowledgment(env,id,async()=>new Response(null,{status:503}),now);
  const report=await inquiryStatus(env,now);assert.equal(report.health.ok,true);assert.equal(report.acknowledgment.counts.failed,1);assert.equal(report.acknowledgment.attention,1);
  assert.doesNotMatch(JSON.stringify(report),/@|Synthetic private|00000000-|synthetic-not-a-live-key/);
  const cli=await productionOperator(['status'],{credentials:()=>({OPERATOR_TOKEN:env.OPERATOR_TOKEN}),fetchImpl:async(url,options)=>worker.fetch(new Request(url,options),env,{})});
  assert.equal(cli.acknowledgment.counts.failed,1);assert.equal(cli.containsInquiryText,false);
});

test('acknowledgment status failure cannot hide owner status or leak database error text',async t=>{
  const env=fixture(t),now=Date.now(),prepare=env.DB.prepare;seed(env,1,{created:now,delivery:'accepted'});await recordRecoverySuccess(env.DB,now);
  env.DB.prepare=sql=>{if(sql==='SELECT status,COUNT(*) AS count FROM inquiry_acknowledgments GROUP BY status')throw Error('Private visitor@example.test');return prepare(sql);};
  const report=await inquiryStatus(env,now);assert.equal(report.total,1);assert.equal(report.health.ok,true);
  assert.deepEqual(report.acknowledgment,{available:false,reason:'acknowledgment_status_unavailable',containsInquiryText:false});assert.doesNotMatch(JSON.stringify(report),/Private|@/);
});

test('exact deletion preflight blocks active and expired sending ACK leases and cascades other states',async t=>{
  const env=fixture(t),now=Date.now();
  for(const [n,at] of [[1,now],[2,now-120_000]]){
    const id=seed(env,n,{created:now-180_000,delivery:'accepted'});await queueInquiryAcknowledgment(env,id,now-180_000);markSending(env,id,at);
    const response=await worker.fetch(operatorRequest(id),env,{});assert.equal(response.status,409);assert.match((await response.json()).message,/acknowledgment is sending/);assert.ok(inquiry(env,id));
  }
  const pending=seed(env,3,{created:now,delivery:'accepted'});await queueInquiryAcknowledgment(env,pending,now);
  assert.equal((await worker.fetch(operatorRequest(pending),env,{})).status,200);assert.equal(inquiry(env,pending),undefined);assert.equal(acknowledgment(env,pending),undefined);
});

test('exact deletion atomically rechecks a newly sending ACK and maps the guard error to a safe 409',async t=>{
  const env=fixture(t),now=Date.now(),id=seed(env,1,{created:now,delivery:'accepted'});await queueInquiryAcknowledgment(env,id,now);
  const prepare=env.DB.prepare;
  env.DB.prepare=sql=>{if(sql.startsWith('DELETE FROM inquiries'))markSending(env,id,now);return prepare(sql);};
  const raced=await worker.fetch(operatorRequest(id),env,{});assert.equal(raced.status,409);assert.ok(inquiry(env,id));
  env.DB.prepare=prepare;
  // Simulate the guard firing inside the write after its preflight. An abort
  // remains a conflict, not an opaque 503 or a partially deleted record.
  env.DB.sqlite.prepare("UPDATE inquiry_acknowledgments SET status='uncertain',lease_until=NULL WHERE inquiry_id=?").run(id);
  env.DB.sqlite.exec("CREATE TRIGGER synthetic_guard_race BEFORE DELETE ON inquiries BEGIN SELECT RAISE(ABORT,'ack-send-in-progress'); END;");
  const guarded=await worker.fetch(operatorRequest(id),env,{});assert.equal(guarded.status,409);assert.match((await guarded.json()).message,/acknowledgment is sending/);assert.ok(inquiry(env,id));
});

test('batch plans exclude sending ACK rows and existing reviewed plans reject a later ACK claim atomically',async t=>{
  const env=fixture(t),now=Date.now(),old=now-100*day;
  const ids=[1,2].map(n=>seed(env,n,{created:old,contact:now-91*day,delivery:'accepted'}));
  await queueInquiryAcknowledgment(env,ids[1],old+1);
  const plan=await createDeletionPlan(env.DB,{reason:'retention_due',references:ids},now);
  markSending(env,ids[1],old+2);
  await assert.rejects(()=>createDeletionPlan(env.DB,{reason:'retention_due',references:ids},now),error=>error.status===409);
  await assert.rejects(()=>executeDeletionPlan(env.DB,plan,plan.digest,now),error=>error.status===409);
  assert.equal(rowCount(env),2);assert.equal(acknowledgment(env,ids[1]).status,'sending');
});

test('batch guard abort rolls back the entire SQLite delete and returns a reviewable conflict',async t=>{
  const env=fixture(t),now=Date.now(),old=now-100*day;
  const ids=[1,2].map(n=>seed(env,n,{created:old,contact:now-91*day,delivery:'accepted'}));
  await queueInquiryAcknowledgment(env,ids[1],old+1);
  const plan=await createDeletionPlan(env.DB,{reason:'retention_due',references:ids},now);
  env.DB.sqlite.exec(`CREATE TRIGGER synthetic_late_guard BEFORE DELETE ON inquiries WHEN OLD.id='${ids[1]}'
    BEGIN SELECT RAISE(ABORT,'ack-send-in-progress'); END;`);
  await assert.rejects(()=>executeDeletionPlan(env.DB,plan,plan.digest,now),error=>error.status===409&&/acknowledgment is sending/.test(error.message));
  assert.equal(rowCount(env),2);assert.equal(acknowledgment(env,ids[1]).status,'pending');
  const response=await worker.fetch(new Request('https://example.test/api/operator/inquiries/delete-batch',{
    method:'POST',headers:{...operatorHeaders,'Content-Type':'application/json','X-Confirm-Delete-Batch':plan.digest},body:JSON.stringify(plan)}),env,{});
  assert.equal(response.status,409);assert.equal(rowCount(env),2);
});

test('before migration 0035, exact/batch deletion and owner mail remain backward compatible',async t=>{
  const env=fixture(t,{ackMigration:false}),now=Date.now();
  const fresh=seed(env,1,{created:now});let calls=0;
  assert.deepEqual(await notifyInquiryAndAcknowledge(env,fresh,async()=>{calls++;return accepted();},now),{status:'accepted',sent:true});assert.equal(calls,1);
  assert.equal((await worker.fetch(operatorRequest(fresh),env,{})).status,200);
  const old=seed(env,2,{created:now-100*day,contact:now-91*day,delivery:'accepted'});
  const plan=await createDeletionPlan(env.DB,{reason:'retention_due',references:[old]},now);
  assert.equal((await executeDeletionPlan(env.DB,plan,plan.digest,now)).deleted,1);assert.equal(rowCount(env),0);
  assert.equal((await inquiryStatus(env,now)).acknowledgment.migrationReady,false);
  const logs=[];const result=await runScheduledMaintenance(env,{now,clock:()=>now,send:never,logger:code=>logs.push(code)});
  assert.deepEqual(result,{ok:false,codes:['scheduled_acknowledgment_unavailable']});assert.deepEqual(logs,result.codes);
});

test('authenticated retry uses the owner-first wrapper and retains the owner response when ACK fails',async t=>{
  const env=fixture(t),now=Date.now(),id=seed(env,1,{created:now}),calls=[];
  t.mock.method(globalThis,'fetch',async(_url,options)=>{const key=options.headers['Idempotency-Key'];calls.push(key);return key.startsWith('inquiry/')?accepted():new Response(null,{status:503});});
  const response=await worker.fetch(operatorRequest(id,{method:'POST',suffix:'/retry',extra:{'X-Confirm-Retry':id}}),env,{});
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{status:'accepted',sent:true});assert.equal(calls.length,2);
  assert.equal(inquiry(env,id).delivery_status,'accepted');assert.equal(acknowledgment(env,id).status,'failed');
});
