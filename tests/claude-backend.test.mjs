import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import worker, { notifyInquiry, retryPendingInquiries, runScheduledMaintenance } from '../deployment/worker.mjs';
import { inquiryRetentionPreview, NOTIFICATION_WINDOW_MS, UNSENT_NOTIFICATION_WINDOW_MS } from '../deployment/inquiry-maintenance.mjs';

const migrations = await Promise.all(['0001_inquiries.sql', '0003_inquiry_followup.sql', '0005_inquiry_operations.sql'].map(name =>
  readFile(new URL(`../deployment/migrations/${name}`, import.meta.url), 'utf8')));
const origin = 'https://example.test';
const payload = {
  name: 'Synthetic Owner', email: 'synthetic@example.test', business: 'Synthetic Business',
  website: 'https://example.test', service: 'focused_site', message: 'A synthetic inquiry with no real recipient.',
  request_kind: 'question'
};

test('site-wide notification budget bounds distributed sends without losing saved inquiries', async () => {
  const env=liveNotificationEnvironment();env.NOTIFICATION_DAILY_LIMIT='2';
  let calls=0;const send=async()=>{calls++;return Response.json({id:'synthetic-'+calls});};
  const ids=[insert(env),insert(env),insert(env)];
  const results=await Promise.all(ids.map(id=>notifyInquiry(env,id,send)));
  assert.equal(calls,2);
  assert.equal(results.filter(result=>result.status==='daily-budget-held').length,1);
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM inquiries').get().n,3);
  assert.equal(env.DB.sqlite.prepare("SELECT count(*) AS n FROM inquiries WHERE delivery_status='pending' AND attempts=0 AND first_attempt_at IS NULL AND notification_payload IS NULL AND lease_until IS NULL").get().n,1);
  env.DB.sqlite.close();
});
function database(followup = true) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(migrations[0]);
  if (followup) sqlite.exec(migrations.slice(1).join("\n"));
  return { sqlite, prepare(sql) {
    const query = values => ({
      bind: (...next) => query(next),
      async first() { return sqlite.prepare(sql).get(...values) ?? null; },
      async all() { return { results: sqlite.prepare(sql).all(...values) }; },
      async run() { return { success: true, meta: sqlite.prepare(sql).run(...values) }; }
    });
    return query([]);
  } };
}
function environment() {
  return {
    ENVIRONMENT: 'production', RELEASE_APPROVED: 'true', INQUIRY_MODE: 'synthetic', SEARCH_INDEXING: 'true',
    DB: database(), OPERATOR_TOKEN: 'synthetic-token', FINGERPRINT_SECRET: 'synthetic-test-secret-with-over-32-characters',
    ASSETS: { async fetch() { return new Response('synthetic asset', { headers: { 'Content-Type': 'text/plain' } }); } }
  };
}
function liveNotificationEnvironment() {
  return { ...environment(), INQUIRY_MODE: 'live', RESEND_API_KEY: 'synthetic-key',
    NOTIFICATION_FROM: 'from@example.test', NOTIFICATION_TO: 'to@example.test' };
}
function insert(env, values = {}) {
  const row = { id: crypto.randomUUID(), created_at: Date.now() - 180_000, synthetic: 0,
    delivery_status: 'pending', attempts: 0, first_attempt_at: null, lease_until: null, ...values };
  env.DB.sqlite.prepare(`INSERT INTO inquiries
    (id,created_at,payload,dedupe_key,synthetic,delivery_status,attempts,first_attempt_at,lease_until)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(row.id, row.created_at, JSON.stringify(payload), row.id,
      row.synthetic, row.delivery_status, row.attempts, row.first_attempt_at, row.lease_until);
  return row.id;
}
const context = () => ({ waitUntil() { throw Error('Unexpected provider work queued by test'); } });
const request = (path, options = {}) => new Request(origin + path, options);

test('video single ranges return exact bytes; malformed/multipart ranges fall back to full response', async () => {
  const env = environment();
  const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  env.ASSETS.fetch = async req => {
    assert.equal(req.headers.get('Range'), null);
    assert.equal(req.headers.get('Accept-Encoding'), 'identity');
    return new Response(bytes, { headers: { 'Content-Type': 'video/mp4', 'Content-Length': '10', ETag: '"v1"' } });
  };
  for (const [range, expected, contentRange] of [
    ['bytes=0-1', [0, 1], 'bytes 0-1/10'],
    ['bytes=7-', [7, 8, 9], 'bytes 7-9/10'],
    ['bytes=-3', [7, 8, 9], 'bytes 7-9/10'],
    ['bytes=-30', [...bytes], 'bytes 0-9/10'],
    ['bytes=8-100', [8, 9], 'bytes 8-9/10']
  ]) {
    const response = await worker.fetch(request('/assets/hero.mp4', { headers: { Range: range } }), env, context());
    assert.equal(response.status, 206, range);
    assert.equal(response.headers.get('Content-Range'), contentRange);
    assert.equal(response.headers.get('Content-Length'), String(expected.length));
    assert.equal(response.headers.get('Accept-Ranges'), 'bytes');
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], expected);
  }
  for (const range of ['bytes=10-', 'bytes=-0']) {
    const response = await worker.fetch(request('/assets/hero.mp4', { headers: { Range: range } }), env, context());
    assert.equal(response.status, 416);
    assert.equal(response.headers.get('Content-Range'), 'bytes */10');
    assert.equal(await response.text(), '');
  }
  for (const range of ['items=0-1', 'bytes=1-2,4-5', 'bytes=-', 'bytes=4-2', 'bytes=999999999999999999999-']) {
    const response = await worker.fetch(request('/assets/hero.mp4', { headers: { Range: range } }), env, context());
    assert.equal(response.status, 200, range);
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [...bytes]);
  }
  env.DB.sqlite.close();
});

test('video If-Range validators, HEAD, empty files and conditional 304 remain correct', async () => {
  const env = environment();
  env.ASSETS.fetch = async req => new Response(req.method === 'HEAD' ? null : '0123456789', {
    headers: { 'Content-Type': 'video/mp4', 'Content-Length': '10', ETag: '"v1"', 'Last-Modified': 'Thu, 15 Oct 2026 12:00:00 GMT' }
  });
  for (const [ifRange, status] of [['"v1"', 206], ['"v0"', 200], ['W/"v1"', 200],
    ['Thu, 15 Oct 2026 12:00:00 GMT', 206], ['Wed, 14 Oct 2026 12:00:00 GMT', 200], ['Fri, 16 Oct 2026 12:00:00 GMT', 200], ['invalid', 200]]) {
    const response = await worker.fetch(request('/assets/hero.mp4', { headers: { Range: 'bytes=0-1', 'If-Range': ifRange } }), env, context());
    assert.equal(response.status, status, ifRange);
  }
  const head = await worker.fetch(request('/assets/hero.mp4', { method: 'HEAD', headers: { Range: 'bytes=0-1' } }), env, context());
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('Content-Length'), '10');
  assert.equal(await head.text(), '');
  env.ASSETS.fetch = async () => new Response('', { headers: { 'Content-Type': 'video/mp4' } });
  const empty = await worker.fetch(request('/assets/hero.mp4', { headers: { Range: 'bytes=0-1' } }), env, context());
  assert.equal(empty.status, 416);
  assert.equal(empty.headers.get('Content-Range'), 'bytes */0');
  env.ASSETS.fetch = async () => new Response(null, { status: 304, headers: { ETag: '"v1"' } });
  assert.equal((await worker.fetch(request('/assets/hero.mp4', { headers: { Range: 'bytes=0-1', 'If-None-Match': '"v1"' } }), env, context())).status, 304);
  env.DB.sqlite.close();
});

test('cache/charset policies are coherent while staging, API and private routes stay protected', async () => {
  const env = environment();
  env.ASSETS.fetch = async () => new Response('Price — details', { headers: {
    'Content-Type': 'text/plain', 'Cache-Control': 'no-cache, public, max-age=3600, must-revalidate'
  } });
  const asset = await worker.fetch(request('/assets/buyer-packs/launch.txt'), env, context());
  assert.equal(asset.headers.get('Cache-Control'), 'no-cache');
  assert.equal(asset.headers.get('Content-Type'), 'text/plain; charset=utf-8');
  assert.match(asset.headers.get('X-Robots-Tag'), /noindex/);
  assert.equal(asset.headers.get('Permissions-Policy'), 'camera=(), microphone=(), geolocation=(), payment=()');
  assert.equal(asset.headers.get('Cross-Origin-Resource-Policy'), 'same-origin');
  env.ASSETS.fetch = async () => new Response(null,{status:304});
  const document304 = await worker.fetch(request('/assets/buyer-packs/improve'),env,context());
  assert.equal(document304.headers.get('Cache-Control'),'no-cache');
  env.ASSETS.fetch = async () => new Response('body{}',{headers:{'Content-Type':'text/css'}});
  const css = await worker.fetch(request('/assets/site.css?v=abc123'),env,context());
  assert.equal(css.headers.get('Cache-Control'),'public, max-age=3600, must-revalidate');
  const api = await worker.fetch(request('/api/unknown', { headers: { Accept: 'application/json' } }), env, context());
  assert.equal(api.headers.get('Referrer-Policy'), 'no-referrer');
  assert.equal(api.headers.get('Cache-Control'), 'no-store');
  env.ENVIRONMENT = 'staging'; env.STAGING_AUTH = 'test:synthetic';
  const staging = await worker.fetch(request('/assets/site.css', { headers: { Authorization: 'Basic ' + btoa(env.STAGING_AUTH) } }), env, context());
  assert.equal(staging.headers.get('Cache-Control'), 'private, no-store');
  assert.match(staging.headers.get('X-Robots-Tag'), /noindex/);
  env.DB.sqlite.close();
});

test('services goes to canonical web-design hub and every explicit error alias returns 404', async () => {
  const env = environment();
  env.ASSETS.fetch = async req => new Response(req.method === 'HEAD' ? null : '<h1>Page not found</h1>', { headers: { 'Content-Type': 'text/html' } });
  for (const path of ['/404', '/404/', '/404.html']) {
    const response = await worker.fetch(request(path), env, context());
    assert.equal(response.status, 404, path);
    assert.match(response.headers.get('X-Robots-Tag'), /noindex/);
    assert.match(await response.text(), /Page not found/);
  }
  const response = await worker.fetch(request('/services/?source=test'), env, context());
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('Location'), origin + '/services/web-design/?source=test');
  env.DB.sqlite.close();
});

test('honeypot gives a generic fallback without field disclosure, false saved claim or database insert', async () => {
  const env = environment();
  const response = await worker.fetch(request('/api/inquiries', { method: 'POST', headers: {
    Origin: origin, Accept: 'application/json', 'Content-Type': 'application/json'
  }, body: JSON.stringify({ ...payload, company_url: 'autofilled-or-bot' }) }), env, context());
  assert.equal(response.status, 422);
  const data = await response.json();
  assert.match(data.message, /support@wonderandmethod.com/);
  assert.equal(data.errors, undefined);
  assert.doesNotMatch(JSON.stringify(data), /company_url|saved|autofilled/);
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM inquiries').get().n, 0);
  const invalid = await worker.fetch(request('/api/inquiries', { method: 'POST', headers: {
    Origin: origin, Accept: 'text/html', 'Content-Type': 'application/json'
  }, body: JSON.stringify({ ...payload, message: '' }) }), env, context());
  assert.equal(invalid.status, 422);
  assert.equal(invalid.headers.get('Referrer-Policy'), 'same-origin');
  env.DB.sqlite.close();
});

test('scheduled recovery selects only safe expired leases, respects age and excludes accepted/synthetic records', async () => {
  const env = liveNotificationEnvironment(), now = Date.now();
  const retry = insert(env, { created_at: now - 180_000, delivery_status: 'uncertain', attempts: 1, first_attempt_at: now - 180_000 });
  const exhausted = insert(env, { created_at: now - 180_000, delivery_status: 'failed', attempts: 5, first_attempt_at: now - 180_000 });
  const old = insert(env, { created_at: now - UNSENT_NOTIFICATION_WINDOW_MS });
  const leased = insert(env, { created_at: now - 180_000, delivery_status: 'sending', lease_until: now + 30_000 });
  const recent = insert(env, { created_at: now - 119_999 });
  insert(env, { delivery_status: 'accepted', created_at: now - 180_000 });
  insert(env, { synthetic: 1, delivery_status: 'synthetic', created_at: now - 180_000 });
  let sends = 0;
  const result = await retryPendingInquiries(env, async () => { sends++; return Response.json({ id: 'synthetic-provider' }); }, now);
  assert.equal(result.attempted, 1); assert.equal(sends, 1);
  const status = id => env.DB.sqlite.prepare('SELECT delivery_status FROM inquiries WHERE id=?').get(id).delivery_status;
  assert.equal(status(retry), 'accepted');
  assert.equal(status(exhausted), 'manual_review'); assert.equal(status(old), 'manual_review');
  assert.equal(status(leased), 'sending'); assert.equal(status(recent), 'pending');
  env.DB.sqlite.close();
});

test('five-attempt cap and 22-hour boundary are enforced by sender and atomic lease', async () => {
  const env = liveNotificationEnvironment(), now = Date.now();
  const id = insert(env, { created_at: now - 180_000 });
  let sends = 0;
  const fail = async () => { sends++; return new Response('synthetic failure', { status: 503 }); };
  for (let i = 0; i < 5; i++) await notifyInquiry(env, id, fail, now + i * 1000);
  assert.equal((await notifyInquiry(env, id, fail, now + 6000)).status, 'manual_review');
  assert.equal(sends, 5);
  const boundary = insert(env, { first_attempt_at: now - NOTIFICATION_WINDOW_MS, attempts: 1, delivery_status: 'uncertain' });
  assert.equal((await notifyInquiry(env, boundary, fail, now)).status, 'manual_review');
  assert.equal(sends, 5);
  const concurrent = insert(env, { attempts: 4, first_attempt_at: now - 1000, delivery_status: 'failed' });
  await Promise.all([notifyInquiry(env, concurrent, fail, now), notifyInquiry(env, concurrent, fail, now)]);
  assert.equal(sends, 6);
  assert.equal(env.DB.sqlite.prepare('SELECT attempts FROM inquiries WHERE id=?').get(concurrent).attempts, 5);
  env.DB.sqlite.close();
});

test('recovery batches are bounded and synthetic scheduler never sends or deletes inquiries', async () => {
  const env = liveNotificationEnvironment(), now = Date.now();
  for (let i = 0; i < 25; i++) insert(env, { created_at: now - 180_000 });
  let sends = 0;
  await retryPendingInquiries(env, async () => { sends++; return Response.json({ id: 'synthetic-provider' }); }, now);
  assert.equal(sends, 20);
  env.INQUIRY_MODE = 'synthetic';
  await worker.scheduled({}, env);
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM inquiries').get().n, 25);
  assert.equal(env.DB.sqlite.prepare("SELECT count(*) AS n FROM inquiries WHERE delivery_status='pending'").get().n, 5);
  env.DB.sqlite.close();
});

test('new notification text is readable and frozen byte-for-byte across retry and config/payload changes', async () => {
  const env = liveNotificationEnvironment(), now = Date.now(), id = insert(env);
  const bodies = [];
  const sender = async (_url, options) => { bodies.push(options.body); return new Response('', { status: 503 }); };
  await notifyInquiry(env, id, sender, now);
  const first = JSON.parse(bodies[0]);
  assert.match(first.subject, /Focused Website/);
  assert.match(first.text, /Name: Synthetic Owner/);
  assert.match(first.text, /Request type: Ask a question/);
  env.NOTIFICATION_TO = 'different@example.test';
  env.DB.sqlite.prepare('UPDATE inquiries SET payload=? WHERE id=?').run(JSON.stringify({ ...payload, name: 'Changed' }), id);
  await notifyInquiry(env, id, sender, now + 1000);
  assert.equal(bodies[1], bodies[0]);
  const old = insert(env, { attempts: 1, first_attempt_at: now - 1000, delivery_status: 'uncertain' });
  await notifyInquiry(env, old, sender, now);
  assert.equal(JSON.parse(bodies[2]).subject, 'Website inquiry ' + old);
  assert.equal(env.DB.sqlite.prepare('SELECT notification_payload FROM inquiries WHERE id=?').get(old).notification_payload, null);
  env.DB.sqlite.close();
});

test('operator failures use bounded hashed counters without exposing or storing source IP', async () => {
  const env = environment();
  for (let i = 0; i < 30; i++) {
    assert.equal((await worker.fetch(request('/api/operator/inquiries', { headers: { 'CF-Connecting-IP': '192.0.2.55' } }), env, context())).status, 401);
  }
  assert.equal((await worker.fetch(request('/api/operator/inquiries', { headers: { 'CF-Connecting-IP': '192.0.2.55' } }), env, context())).status, 429);
  const headers = { Authorization: 'Bearer synthetic-token', 'CF-Connecting-IP': '192.0.2.56' };
  assert.equal((await worker.fetch(request('/api/operator/inquiries', { headers }), env, context())).status, 200);
  const keys = env.DB.sqlite.prepare('SELECT * FROM rate_limits').all();
  assert.equal(keys.length, 2);
  assert.ok(keys.every(row => /^[a-f0-9]{64}$/.test(row.key)));
  assert.doesNotMatch(JSON.stringify(keys), /192\.0\.2/);
  env.DB.sqlite.close();
});

test('retention preview uses recorded last contact only and excludes held/client/sending/synthetic records', async () => {
  const env = environment(), now = Date.now(), day = 86400_000;
  const oldCreation = now - 200 * day;
  const due = insert(env, { created_at: oldCreation });
  const current = insert(env, { created_at: oldCreation });
  const unknown = insert(env, { created_at: oldCreation });
  const held = insert(env, { created_at: oldCreation });
  const client = insert(env, { created_at: oldCreation });
  const sending = insert(env, { created_at: oldCreation, delivery_status: 'sending' });
  const synthetic = insert(env, { created_at: oldCreation, synthetic: 1, delivery_status: 'synthetic' });
  for (const id of [due, held, client, sending, synthetic]) env.DB.sqlite.prepare('UPDATE inquiries SET last_substantive_contact_at=? WHERE id=?').run(now - 90 * day, id);
  env.DB.sqlite.prepare('UPDATE inquiries SET last_substantive_contact_at=? WHERE id=?').run(now - day, current);
  env.DB.sqlite.prepare('UPDATE inquiries SET retention_hold=1 WHERE id=?').run(held);
  env.DB.sqlite.prepare('UPDATE inquiries SET is_client=1 WHERE id=?').run(client);
  const preview = await inquiryRetentionPreview(env.DB, now);
  assert.equal(preview.dry_run, true);
  assert.deepEqual(preview.due.map(row => row.id), [due]);
  assert.equal(preview.unknown_last_contact, 1);
  assert.deepEqual(preview.unconfirmed_old_needing_review.map(row=>row.id),[unknown]);
  assert.equal(env.DB.sqlite.prepare('SELECT last_substantive_contact_at FROM inquiries WHERE id=?').get(unknown).last_substantive_contact_at, null);
  await worker.scheduled({}, env);
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM inquiries').get().n, 7);
  env.DB.sqlite.close();
});

test('follow-up tracking requires authentication, confirmation and explicit valid recorded fields', async () => {
  const env = environment(), now = Date.now();
  const id = insert(env, { created_at: now - 10_000 });
  const path = `/api/operator/inquiries/${id}/followup`;
  const headers = { Authorization: 'Bearer synthetic-token', 'Content-Type': 'application/json', Accept: 'application/json' };
  const data = { last_substantive_contact_at: now - 1000, is_client: false, retention_hold: true, retention_hold_reason:'Synthetic documented dispute',retention_hold_review_at:now+86400_000 };
  assert.equal((await worker.fetch(request(path, { method: 'POST', headers, body: JSON.stringify(data) }), env, context())).status, 405);
  headers['X-Confirm-Followup'] = id;
  for (const invalid of [{ ...data, last_substantive_contact_at: now + 86400_000 }, { ...data, is_client: 'false' }, { ...data, arbitrary: 'injected' }]) {
    assert.equal((await worker.fetch(request(path, { method: 'POST', headers, body: JSON.stringify(invalid) }), env, context())).status, 422);
  }
  assert.equal((await worker.fetch(request(path, { method: 'POST', headers, body: JSON.stringify(data) }), env, context())).status, 200);
  const row = env.DB.sqlite.prepare('SELECT last_substantive_contact_at, is_client, retention_hold FROM inquiries WHERE id=?').get(id);
  assert.equal(row.last_substantive_contact_at, data.last_substantive_contact_at);
  assert.equal(row.retention_hold, 1);
  const preview = await worker.fetch(request('/api/operator/inquiries/retention-preview', { headers }), env, context());
  assert.equal(preview.status, 200);
  assert.equal((await preview.json()).dry_run, true);
  env.DB.sqlite.close();
  const legacy = environment(); legacy.DB.sqlite.close(); legacy.DB = database(false);
  assert.equal((await worker.fetch(request('/api/operator/inquiries/retention-preview', { headers }), legacy, context())).status, 503);
  legacy.DB.sqlite.close();
});

test('slow retry batches give every send a fresh lease and current first-attempt time', async () => {
 const env=liveNotificationEnvironment();const start=Date.now();let current=start,sends=0;
 for(let n=0;n<10;n++)insert(env,{created_at:start-180000+n});
 await retryPendingInquiries(env,async(_url,options)=>{
  const id=options.headers['Idempotency-Key'].slice('inquiry/'.length);
  const row=env.DB.sqlite.prepare('SELECT lease_until,first_attempt_at FROM inquiries WHERE id=?').get(id);
  assert.equal(row.first_attempt_at,current);
  assert.equal(row.lease_until-current,60000);
  current+=8000;sends++;
  return Response.json({id:'synthetic-'+sends});
 },start,()=>current);
 assert.equal(sends,10);env.DB.sqlite.close();
});

test('daily quota hold preserves the unused attempt and recovers after UTC rollover',async()=>{
  const env=liveNotificationEnvironment();env.NOTIFICATION_DAILY_LIMIT='1';
  const now=Date.UTC(2026,9,18,23,0),ids=[insert(env,{created_at:now-180000}),insert(env,{created_at:now-180000})];
  let calls=0;const send=async()=>{calls++;return Response.json({id:'synthetic-'+calls});};
  await notifyInquiry(env,ids[0],send,now);
  assert.equal((await notifyInquiry(env,ids[1],send,now)).status,'daily-budget-held');
  const before=env.DB.sqlite.prepare('SELECT * FROM inquiries WHERE id=?').get(ids[1]);
  assert.equal(before.attempts,0);assert.equal(before.first_attempt_at,null);assert.equal(before.notification_payload,null);
  const next=now+2*3600_000;
  const result=await retryPendingInquiries(env,send,next,()=>next);
  assert.equal(result.attempted,1);assert.equal(calls,2);
  assert.equal(env.DB.sqlite.prepare('SELECT delivery_status FROM inquiries WHERE id=?').get(ids[1]).delivery_status,'accepted');
  env.DB.sqlite.close();
});

test('scheduler retries before cleanup, isolates cleanup failure and withholds healthy ping',async()=>{
  const env=liveNotificationEnvironment(),now=Date.now(),id=insert(env);env.HEALTHCHECK_URL='https://monitor.example.test/private-token';
  const realPrepare=env.DB.prepare,seen=[],logs=[];
  env.DB.prepare=sql=>{
    if(sql.startsWith('DELETE FROM rate_limits')){seen.push('cleanup');throw Error('secret details must not be logged');}
    return realPrepare(sql);
  };
  const result=await runScheduledMaintenance(env,{now,clock:()=>now,logger:code=>logs.push(code),send:async url=>{seen.push(url);return Response.json({id:'synthetic'});}});
  assert.equal(env.DB.sqlite.prepare('SELECT delivery_status FROM inquiries WHERE id=?').get(id).delivery_status,'accepted');
  assert.deepEqual(seen,['https://api.resend.com/emails','cleanup']);
  assert.deepEqual(logs,['scheduled_rate_cleanup_failed']);assert.equal(result.ok,false);
  assert.equal(env.DB.sqlite.prepare("SELECT last_success_at FROM operation_health WHERE name='inquiry-recovery'").get().last_success_at,now);
  env.DB.sqlite.close();
});

test('scheduler continues after one recovery row fails and does not mark recovery successful',async()=>{
  const env=liveNotificationEnvironment(),now=Date.now(),first=insert(env),second=insert(env);
  env.DB.sqlite.prepare('UPDATE inquiries SET created_at=? WHERE id=?').run(now-240000,first);
  const realPrepare=env.DB.prepare;
  env.DB.prepare=sql=>{
    if(sql==='SELECT * FROM inquiries WHERE id = ?')return {bind(id){if(id===first)throw Error('synthetic row read failure');return realPrepare(sql).bind(id);}};
    return realPrepare(sql);
  };
  const logs=[];const result=await runScheduledMaintenance(env,{now,clock:()=>now,logger:code=>logs.push(code),send:async()=>Response.json({id:'synthetic'})});
  assert.equal(result.ok,false);assert.deepEqual(logs,['scheduled_recovery_row_failed']);
  assert.equal(env.DB.sqlite.prepare('SELECT delivery_status FROM inquiries WHERE id=?').get(second).delivery_status,'accepted');
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM operation_health').get().n,0);
  env.DB.sqlite.close();
});

test('external monitor receives no inquiry data and pings only while aggregate health is good',async()=>{
  const env=liveNotificationEnvironment(),now=Date.now();env.HEALTHCHECK_URL='https://monitor.example.test/private-token';
  const calls=[];const send=async(url,options)=>{calls.push({url,options});return new Response('',{status:200});};
  assert.equal((await runScheduledMaintenance(env,{now,clock:()=>now,logger:()=>{},send})).ok,true);
  assert.equal(calls.length,1);assert.equal(calls[0].url,env.HEALTHCHECK_URL);assert.equal(calls[0].options.body,undefined);assert.equal(calls[0].options.redirect,'error');
  insert(env,{delivery_status:'manual_review'});
  await runScheduledMaintenance(env,{now,clock:()=>now,logger:()=>{},send});assert.equal(calls.length,1);
  env.INQUIRY_MODE='synthetic';await runScheduledMaintenance(env,{now,logger:()=>{},send});assert.equal(calls.length,1);
  env.DB.sqlite.close();
});

test('a stale pre-lease read cannot roll back a newer actual provider attempt after quota exhaustion',async()=>{
  const env=liveNotificationEnvironment(),now=Date.now(),id=insert(env);env.NOTIFICATION_DAILY_LIMIT='1';
  const realPrepare=env.DB.prepare;let reads=0,resume,readComplete;
  const paused=new Promise(resolve=>readComplete=resolve),release=new Promise(resolve=>resume=resolve);
  env.DB.prepare=sql=>{
    if(sql==='SELECT * FROM inquiries WHERE id = ?')return {bind(...values){return {async first(){const row=await realPrepare(sql).bind(...values).first();if(++reads===1){readComplete();await release;}return row;}};}};
    return realPrepare(sql);
  };
  const stale=notifyInquiry(env,id,async()=>{throw Error('stale sender must not run');},now);
  await paused;
  await notifyInquiry(env,id,async()=>new Response('',{status:503}),now+1);
  const attempted=env.DB.sqlite.prepare('SELECT delivery_status,attempts,first_attempt_at,notification_payload FROM inquiries WHERE id=?').get(id);
  assert.equal(attempted.attempts,1);assert.equal(attempted.first_attempt_at,now+1);assert.ok(attempted.notification_payload);
  resume();assert.equal((await stale).status,'busy-or-ineligible');
  assert.deepEqual(env.DB.sqlite.prepare('SELECT delivery_status,attempts,first_attempt_at,notification_payload FROM inquiries WHERE id=?').get(id),attempted);
  env.DB.sqlite.close();
});


test('HEAD video uses the generated size index without fetching media bytes',async()=>{
 const env=environment(),calls=[];
 env.ASSETS.fetch=async req=>{const path=new URL(req.url).pathname;calls.push([req.method,path]);if(path==='/assets/media-sizes.json')return Response.json({'/assets/hero.mp4':10});assert.equal(req.method,'HEAD');return new Response(null,{headers:{'Content-Type':'video/mp4'}});};
 const response=await worker.fetch(request('/assets/hero.mp4',{method:'HEAD'}),env,context());
 assert.equal(response.status,200);assert.equal(response.headers.get('Content-Length'),'10');assert.equal(await response.text(),'');assert.deepEqual(calls,[['HEAD','/assets/hero.mp4'],['GET','/assets/media-sizes.json']]);
});
