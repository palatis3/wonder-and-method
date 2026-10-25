import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {
  queueInquiryAcknowledgment as queue,sendInquiryAcknowledgment as send,
  recoverInquiryAcknowledgments as recover,inquiryAcknowledgmentStatus as status,
  inquiryAcknowledgmentBudget as budget,ACKNOWLEDGMENT_WINDOW_MS as windowMs
} from '../deployment/inquiry-acknowledgment.mjs';

const now=Date.parse('2026-10-24T12:00:00Z');
const migrationRoot=new URL('../deployment/migrations/',import.meta.url);
const migrations=await Promise.all((await readdir(migrationRoot)).filter(x=>/^00(?:0[1-9]|[12]\d|3[0-5])_.*\.sql$/.test(x)).sort().map(async name=>[name,await readFile(new URL(name,migrationRoot),'utf8')]));
const newMigration=migrations.find(([name])=>name.startsWith('0035_'))[1];
function fixture(t,{migrate=true}={}) {
  const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
  for(const [name,sql] of migrations)if(!name.startsWith('0035_'))sqlite.exec(sql);
  if(migrate)sqlite.exec(newMigration);
  t.after(()=>sqlite.close());
  const DB={sqlite,prepare(sql){const build=values=>({bind:(...next)=>build(next),
    async first(){return sqlite.prepare(sql).get(...values)??null;},
    async all(){return {results:sqlite.prepare(sql).all(...values)};},
    async run(){return {success:true,meta:sqlite.prepare(sql).run(...values)};}});return build([]);}};
  return {DB,ENVIRONMENT:'production',RELEASE_APPROVED:'true',INQUIRY_MODE:'live',INQUIRY_ACKNOWLEDGMENT:'enabled',
    RESEND_API_KEY:'synthetic-key-never-live',NOTIFICATION_FROM:'studio@example.test',NOTIFICATION_TO:'owner@example.test',
    FINGERPRINT_SECRET:'synthetic-fixture-secret-over-thirty-two-characters',NOTIFICATION_DAILY_LIMIT:'50',NOTIFICATION_RESERVED_LIMIT:'10'};
}
const idFor=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function insert(env,n=1,{payload={},created=now,synthetic=0,delivery='accepted',client=0,hold=0}={}) {
  const id=idFor(n);
  env.DB.sqlite.prepare(`INSERT INTO inquiries(id,created_at,payload,dedupe_key,synthetic,delivery_status,is_client,retention_hold)
    VALUES(?,?,?,?,?,?,?,?)`).run(id,created,JSON.stringify({email:`recipient${n}@example.test`,email_receipt:'requested',name:'Never echo this name',message:'Never echo this message https://example.test/pay',...payload}),id,synthetic,delivery,client,hold);
  return id;
}
const row=(env,id)=>env.DB.sqlite.prepare('SELECT * FROM inquiry_acknowledgments WHERE inquiry_id=?').get(id);
const accepted=async()=>Response.json({id:'synthetic-provider-id'});
const never=async()=>assert.fail('No provider request permitted');
const sharedKey=`notification-quota:${Math.floor(now/86400_000)}`;
const count=(env,table)=>env.DB.sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get().n;

test('migration preserves populated historical rows and creates no acknowledgment backfill; FK deletion cascades',async t=>{
  const env=fixture(t,{migrate:false}),historicalId=insert(env);
  env.DB.sqlite.prepare("UPDATE inquiries SET notification_payload=?,attempts=3,first_attempt_at=?,retention_hold=1 WHERE id=?").run('{"frozen":"synthetic old payload"}',now-1000,historicalId);
  env.DB.sqlite.prepare('INSERT INTO inquiry_delivery_resolutions VALUES(?,?,?,?)').run(historicalId,now,'handled_manually','synthetic-resolution');
  env.DB.sqlite.prepare('INSERT INTO rate_limits VALUES(?,7,?)').run(sharedKey,now+86400_000);
  const before=env.DB.sqlite.prepare('SELECT * FROM inquiries').all();
  const resolutionBefore=env.DB.sqlite.prepare('SELECT * FROM inquiry_delivery_resolutions').all();
  env.DB.sqlite.exec(newMigration);
  assert.deepEqual(env.DB.sqlite.prepare('SELECT * FROM inquiries').all(),before);
  assert.deepEqual(env.DB.sqlite.prepare('SELECT * FROM inquiry_delivery_resolutions').all(),resolutionBefore);
  assert.equal(count(env,'inquiry_acknowledgments'),0);
  assert.equal(env.DB.sqlite.prepare('SELECT hits FROM rate_limits').get().hits,7);
  const id=insert(env,2);await queue(env,id,now);assert.equal(count(env,'inquiry_acknowledgments'),1);
  env.DB.sqlite.prepare('DELETE FROM inquiries WHERE id=?').run(id);
  assert.equal(count(env,'inquiry_acknowledgments'),0);
});

test('feature, production release, secrets and missing migrations fail closed',async t=>{
  const env=fixture(t),id=insert(env);
  for(const change of [{INQUIRY_ACKNOWLEDGMENT:undefined},{ENVIRONMENT:'staging'},{INQUIRY_MODE:'synthetic'},
    {RELEASE_APPROVED:'false'},{RESEND_API_KEY:''},{NOTIFICATION_FROM:'invalid\n@example.test'},{FINGERPRINT_SECRET:'short'}]) {
    const altered={...env,...change};assert.notEqual((await queue(altered,id,now)).status,'pending');
    assert.equal((await send(altered,id,never,now)).sent,false);
  }
  assert.equal(count(env,'inquiry_acknowledgments'),0);
  const absent=fixture(t,{migrate:false}),missingId=insert(absent);
  assert.equal((await queue(absent,missingId,now)).status,'migration-pending');
  assert.equal((await status(absent,now)).migrationReady,false);
  env.DB.sqlite.exec('DROP TRIGGER inquiry_acknowledgments_claim');
  assert.equal((await queue(env,id,now)).status,'migration-pending');
});

test('only explicit, recent, live, unprotected requests with accepted owner mail can queue',async t=>{
  const env=fixture(t);
  const cases=[{payload:{email_receipt:undefined}},{payload:{email_receipt:true}},{payload:{email_receipt:'yes'}},
    {synthetic:1},{delivery:'pending'},{delivery:'manual_review'},{client:1},{hold:1},
    {created:now-windowMs},{created:now+1},{payload:{email:'a@example.test\r\nBcc:bad@example.test'}}];
  for(let i=0;i<cases.length;i++)assert.equal((await queue(env,insert(env,i+1,cases[i]),now)).status,'ineligible');
  for(const [n,outcome] of [[101,'spam_confirmed'],[102,'duplicate_confirmed'],[103,'handled_manually']]) {
    const id=insert(env,n);env.DB.sqlite.prepare('INSERT INTO inquiry_delivery_resolutions VALUES(?,?,?,?)').run(id,now,outcome,'synthetic-resolution');
    assert.equal((await queue(env,id,now)).status,'ineligible');
  }
  assert.equal((await queue(env,'untrusted-reference\nhttps://example.test',now)).status,'ineligible');
  assert.equal(count(env,'inquiry_acknowledgments'),0);
});

test('durable minimal frozen message, stable key, no duplicate accepted send, no owner changes',async t=>{
  const env=fixture(t),id=insert(env),ownerBefore=env.DB.sqlite.prepare('SELECT * FROM inquiries').get();
  env.NOTIFICATION_FROM='Wonder and Method <studio@example.test>';
  assert.equal((await queue(env,id,now)).status,'pending');
  const before=row(env,id),keys=Object.keys(JSON.parse(before.message_payload));
  assert.deepEqual(keys,['from','to','subject','text']);
  assert.doesNotMatch(JSON.parse(before.message_payload).text,/Never echo|https:|inbox|delivered|payment|phone/i);
  assert.match(before.recipient_key,/^recipient:[a-f0-9]{64}$/);assert.doesNotMatch(before.recipient_key,/@/);
  assert.throws(()=>env.DB.sqlite.prepare('UPDATE inquiry_acknowledgments SET message_payload=? WHERE inquiry_id=?').run('{}',id),/ack-immutable/);
  let calls=0;
  const provider=async(url,options)=>{calls++;assert.equal(url,'https://api.resend.com/emails');assert.equal(row(env,id).status,'sending');assert.equal(options.body,before.message_payload);assert.equal(options.headers['Idempotency-Key'],`inquiry-acknowledgment/v1/${id}`);return accepted();};
  assert.equal((await send(env,id,provider,now)).status,'accepted');
  assert.equal((await send(env,id,never,now)).sent,false);
  assert.equal((await queue(env,id,now)).status,'accepted');assert.equal(calls,1);
  assert.deepEqual(env.DB.sqlite.prepare('SELECT * FROM inquiries').get(),ownerBefore);
  assert.throws(()=>env.DB.sqlite.prepare("UPDATE inquiry_acknowledgments SET status='pending' WHERE inquiry_id=?").run(id),/ack-terminal/);
});

test('concurrent same-record attempts acquire one lease; stale completion cannot overwrite a newer accepted attempt',async t=>{
  const env=fixture(t),id=insert(env);await queue(env,id,now);
  let calls=0,started,release;
  const ready=new Promise(resolve=>{started=resolve;});const response=new Promise(resolve=>{release=resolve;});
  const first=send(env,id,async()=>{calls++;started();return response;},now);
  await ready;
  assert.equal((await send(env,id,never,now)).status,'busy-or-ineligible');
  assert.equal((await send(env,id,accepted,now+60_001)).status,'accepted');
  release(new Response(null,{status:503}));
  const late=await first;assert.equal(late.status,'accepted');assert.equal(late.staleAttempt,true);
  assert.equal(row(env,id).attempts,2);assert.equal(calls,1);
});

test('retry bodies survive sender changes; backoff, four attempts and 23h expiry are bounded',async t=>{
  const env=fixture(t),id=insert(env);await queue(env,id,now);
  const bodies=[];const failed=async(_url,options)=>{bodies.push(options.body);throw Error('synthetic timeout');};
  assert.equal((await send(env,id,failed,now)).status,'uncertain');
  env.NOTIFICATION_FROM='changed@example.test';
  assert.equal((await send(env,id,never,now+119_999)).status,'busy-or-ineligible');
  for(const at of [now+120_000,now+360_000,now+840_000])await send(env,id,failed,at);
  assert.equal((await send(env,id,never,now+841_000)).status,'expired');
  assert.equal(bodies.length,4);assert.equal(new Set(bodies).size,1);
  const old=insert(env,2);await queue(env,old,now);
  assert.equal((await send(env,old,never,now+windowMs)).status,'expired');
  assert.equal(row(env,old).attempts,0);
});

test('active leases are preserved at expiry and at new resolution/hold; stale recovery suppresses safely',async t=>{
  const env=fixture(t),id=insert(env);await queue(env,id,now);
  let started,release;const ready=new Promise(r=>{started=r;});const response=new Promise(r=>{release=r;});
  const pending=send(env,id,async()=>{started();return response;},now+windowMs-10);
  await ready;env.DB.sqlite.prepare('UPDATE inquiries SET retention_hold=1 WHERE id=?').run(id);
  assert.equal((await send(env,id,never,now+windowMs)).status,'busy-or-ineligible');
  assert.equal(row(env,id).status,'sending');
  assert.equal((await send(env,id,never,now+windowMs+60_000)).status,'suppressed');
  release(await accepted());assert.equal((await pending).staleAttempt,true);
  assert.equal(row(env,id).status,'suppressed');
});

test('new spam resolution or protected status after queue suppresses before any send',async t=>{
  const env=fixture(t);
  for(const [n,change] of [[1,'resolution'],[2,'hold'],[3,'client'],[4,'delivery']]) {
    const id=insert(env,n);await queue(env,id,now);
    if(change==='resolution')env.DB.sqlite.prepare('INSERT INTO inquiry_delivery_resolutions VALUES(?,?,?,?)').run(id,now,'spam_confirmed','fixture');
    else env.DB.sqlite.prepare(`UPDATE inquiries SET ${change==='hold'?'retention_hold=1':change==='client'?'is_client=1':"delivery_status='failed'"} WHERE id=?`).run(id);
    assert.equal((await send(env,id,never,now)).status,'suppressed');assert.equal(row(env,id).attempts,0);
  }
  assert.equal(count(env,'inquiry_acknowledgment_limits'),0);
});

test('concurrent recipient cooldown admits one new email and retries are exempt from new-recipient charge',async t=>{
  const env=fixture(t),one=insert(env,1,{payload:{email:'same@example.test'}}),two=insert(env,2,{payload:{email:'SAME@example.test'}});
  await Promise.all([queue(env,one,now),queue(env,two,now)]);
  let calls=0;const provider=async()=>{calls++;return new Response(null,{status:503});};
  const outcomes=await Promise.all([send(env,one,provider,now),send(env,two,provider,now)]);
  assert.equal(calls,1);assert.ok(outcomes.some(x=>x.status==='recipient-cooldown'));
  const attempted=outcomes[0].status==='failed'?one:two;
  assert.equal((await send(env,attempted,accepted,now+120_000)).status,'accepted');
  assert.equal(env.DB.sqlite.prepare('SELECT hits FROM rate_limits WHERE key=?').get(sharedKey).hits,2);
  const later=insert(env,3,{created:now+86400_000,payload:{email:'same@example.test'}});
  await queue(env,later,now+86400_000);assert.equal((await send(env,later,accepted,now+86400_000)).status,'accepted');
});

test('own daily cap is atomic under concurrency and rejects invalid configured cap',async t=>{
  const env=fixture(t);env.ACKNOWLEDGMENT_DAILY_LIMIT='2';
  const ids=[1,2,3,4].map(n=>insert(env,n));await Promise.all(ids.map(id=>queue(env,id,now)));
  let calls=0;const outcomes=await Promise.all(ids.map(id=>send(env,id,async()=>{calls++;return accepted();},now)));
  assert.equal(calls,2);assert.equal(outcomes.filter(x=>x.status==='daily-budget-held').length,2);
  assert.equal(env.DB.sqlite.prepare('SELECT hits FROM rate_limits WHERE key=?').get(sharedKey).hits,2);
  for(const id of ids.filter(id=>row(env,id).status==='pending'))assert.equal(row(env,id).attempts,0);
  for(const value of ['0','21','-1','1.5','bad'])assert.equal(budget({...env,ACKNOWLEDGMENT_DAILY_LIMIT:value}).dailyLimit,10);
  assert.equal(budget({...env,ACKNOWLEDGMENT_DAILY_LIMIT:'20'}).dailyLimit,20);
});

test('shared ceiling preserves all reserved and automatic headroom, including concurrent claim boundary',async t=>{
  const env=fixture(t),b=budget(env);assert.deepEqual([b.limit,b.reserve,b.automaticLimit,b.ownerHeadroom,b.sharedCeiling],[50,10,40,8,32]);
  env.DB.sqlite.prepare('INSERT INTO rate_limits VALUES(?,?,?)').run(sharedKey,31,now+86400_000);
  const ids=[1,2].map(n=>insert(env,n));await Promise.all(ids.map(id=>queue(env,id,now)));
  let calls=0;const outcomes=await Promise.all(ids.map(id=>send(env,id,async()=>{calls++;return accepted();},now)));
  assert.equal(calls,1);assert.equal(outcomes.filter(x=>x.status==='shared-budget-held').length,1);
  assert.equal((await status(env,now)).budgetHeld,1);
  assert.equal(env.DB.sqlite.prepare('SELECT hits FROM rate_limits WHERE key=?').get(sharedKey).hits,32);
  // Existing owner CAS can still consume eight automatic and ten reserved slots.
  for(let limit of [40,50])while(env.DB.sqlite.prepare('UPDATE rate_limits SET hits=hits+1 WHERE key=? AND hits<? RETURNING hits').get(sharedKey,limit)){}
  assert.equal(env.DB.sqlite.prepare('SELECT hits FROM rate_limits WHERE key=?').get(sharedKey).hits,50);
  const small=fixture(t);small.NOTIFICATION_DAILY_LIMIT='1';small.NOTIFICATION_RESERVED_LIMIT='0';const id=insert(small);await queue(small,id,now);
  assert.equal((await send(small,id,never,now)).status,'shared-budget-held');assert.equal(count(small,'rate_limits'),0);
});

test('trigger failure after shared charge rolls back counters, lease and attempt together',async t=>{
  const env=fixture(t),id=insert(env);await queue(env,id,now);
  env.DB.sqlite.exec(`CREATE TRIGGER synthetic_ack_failure BEFORE INSERT ON inquiry_acknowledgment_limits
    WHEN NEW.key LIKE 'recipient:%' BEGIN SELECT RAISE(ABORT,'synthetic-storage-failure'); END;`);
  const before=row(env,id);await assert.rejects(()=>send(env,id,never,now),/synthetic-storage-failure/);
  assert.deepEqual(row(env,id),before);assert.equal(count(env,'rate_limits'),0);assert.equal(count(env,'inquiry_acknowledgment_limits'),0);
});

test('recovery queues recent opt-ins only, aggregates failure without PII, and reports budget usage',async t=>{
  const env=fixture(t),good=insert(env,1),legacy=insert(env,2,{payload:{email_receipt:undefined}});
  insert(env,3,{synthetic:1});insert(env,4,{created:now-windowMs});insert(env,5,{delivery:'pending'});
  let calls=0;const recovered=await recover(env,async()=>{calls++;return new Response(null,{status:503});},now);
  assert.deepEqual(recovered,{status:'complete',queued:1,attempted:1,failed:1});assert.equal(calls,1);
  assert.equal(row(env,legacy),undefined);assert.equal(row(env,good).status,'failed');
  const report=await status(env,now);assert.equal(report.counts.failed,1);assert.equal(report.attention,1);
  assert.equal(report.dailyAttempts,1);assert.equal(report.sharedAttempts,1);assert.equal(report.containsInquiryText,false);
  assert.doesNotMatch(JSON.stringify(report),/@|Never echo|recipient1|00000000-|synthetic-key/);
});

test('provider accepted without valid bounded ID remains uncertain and retries preserve same request',async t=>{
  const env=fixture(t),id=insert(env);await queue(env,id,now);
  assert.equal((await send(env,id,async()=>Response.json({id:''}),now)).status,'uncertain');
  assert.equal((await send(env,id,async()=>new Response('x'.repeat(5000)),now+120_000)).status,'uncertain');
  assert.equal((await send(env,id,accepted,now+360_000)).status,'accepted');
});

test('provider acceptance followed by storage failure recovers with identical key/body and one simulated accepted message',async t=>{
  const env=fixture(t),id=insert(env);await queue(env,id,now);
  env.DB.sqlite.exec(`CREATE TRIGGER synthetic_completion_failure BEFORE UPDATE ON inquiry_acknowledgments
    WHEN NEW.status='accepted' BEGIN SELECT RAISE(ABORT,'synthetic-completion-failure'); END;`);
  const processed=new Map();let calls=0;
  const provider=async(_url,options)=>{
    calls++;const key=options.headers['Idempotency-Key'];
    if(processed.has(key))assert.equal(options.body,processed.get(key));else processed.set(key,options.body);
    return accepted();
  };
  await assert.rejects(()=>send(env,id,provider,now),/synthetic-completion-failure/);
  assert.equal(row(env,id).status,'sending');
  env.DB.sqlite.exec('DROP TRIGGER synthetic_completion_failure');
  assert.equal((await send(env,id,provider,now+60_001)).status,'accepted');
  assert.equal(calls,2);assert.equal(processed.size,1);assert.equal(row(env,id).attempts,2);
});

test('queue insertion repeats eligibility after asynchronous HMAC and recovery avoids replaying held terminal rows',async t=>{
  const env=fixture(t),id=insert(env),prepare=env.DB.prepare.bind(env.DB);
  env.DB.prepare=sql=>{
    if(sql.startsWith('INSERT INTO inquiry_acknowledgments'))env.DB.sqlite.prepare('UPDATE inquiries SET retention_hold=1 WHERE id=?').run(id);
    return prepare(sql);
  };
  assert.equal((await queue(env,id,now)).status,'busy-or-ineligible');assert.equal(row(env,id),undefined);
  env.DB.prepare=prepare;
  env.DB.sqlite.prepare('UPDATE inquiries SET retention_hold=0 WHERE id=?').run(id);
  await queue(env,id,now);env.DB.sqlite.prepare('UPDATE inquiries SET retention_hold=1 WHERE id=?').run(id);
  assert.equal((await send(env,id,never,now)).status,'suppressed');
  assert.deepEqual(await recover(env,never,now),{status:'complete',queued:0,attempted:0,failed:0});
});

test('parent deletion is rejected atomically during sending and cascades after accepted completion',async t=>{
  const env=fixture(t),id=insert(env);await queue(env,id,now);
  let started,release;const ready=new Promise(r=>{started=r;});const response=new Promise(r=>{release=r;});
  const pending=send(env,id,async()=>{started();return response;},now);await ready;
  assert.throws(()=>env.DB.sqlite.prepare('DELETE FROM inquiries WHERE id=?').run(id),/ack-send-in-progress/);
  assert.equal(count(env,'inquiries'),1);assert.equal(row(env,id).status,'sending');
  release(await accepted());assert.equal((await pending).status,'accepted');
  env.DB.sqlite.prepare('DELETE FROM inquiries WHERE id=?').run(id);assert.equal(row(env,id),undefined);
});

test('disabled recovery clears stale sending leases for protected parents without network or owner changes',async t=>{
  const env=fixture(t),id=insert(env);await queue(env,id,now);
  let started,release;const ready=new Promise(r=>{started=r;});const response=new Promise(r=>{release=r;});
  const pending=send(env,id,async()=>{started();return response;},now);await ready;
  env.DB.sqlite.prepare('UPDATE inquiries SET retention_hold=1 WHERE id=?').run(id);
  const ownerBefore=env.DB.sqlite.prepare('SELECT * FROM inquiries WHERE id=?').get(id);
  env.INQUIRY_ACKNOWLEDGMENT='disabled';delete env.RESEND_API_KEY;
  assert.equal((await recover(env,never,now+60_000)).status,'disabled');assert.equal(row(env,id).status,'sending');
  await recover(env,never,now+60_001);assert.equal(row(env,id).status,'suppressed');
  assert.equal(row(env,id).lease_until,null);assert.deepEqual(env.DB.sqlite.prepare('SELECT * FROM inquiries WHERE id=?').get(id),ownerBefore);
  release(await accepted());assert.equal((await pending).staleAttempt,true);
  // The production deletion flow separately enforces retention hold; this checks
  // only the ACK guard and FK after the hold is intentionally cleared locally.
  env.DB.sqlite.prepare('UPDATE inquiries SET retention_hold=0 WHERE id=?').run(id);
  env.DB.sqlite.prepare('DELETE FROM inquiries WHERE id=?').run(id);assert.equal(row(env,id),undefined);
});
