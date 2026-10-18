import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import worker, { notifyInquiry } from '../deployment/worker.mjs';

test('edge missing pages use the branded static 404 and preserve status and staging protection', async () => {
  const env = { ENVIRONMENT:'staging', STAGING_AUTH:'test:synthetic-password-only', ASSETS:{} };
  const seen=[];
  env.ASSETS.fetch=async request=>{const path=new URL(request.url).pathname;seen.push(path);return path==='/404/'?new Response('<h1>Wonder and Method: page not found</h1>',{headers:{'Content-Type':'text/html'}}):new Response('',{status:404});};
  const denied=await worker.fetch(new Request('https://staging.example.test/missing'),env,context());
  assert.equal(denied.status,401);assert.equal(seen.length,0);
  const response=await worker.fetch(new Request('https://staging.example.test/missing',{headers:{Authorization:`Basic ${btoa(env.STAGING_AUTH)}`}}),env,context());
  assert.equal(response.status,404);assert.match(await response.text(),/Wonder and Method/);assert.match(response.headers.get('x-robots-tag'),/noindex/);assert.deepEqual(seen,['/missing','/404/']);
});

// Synthetic SQLite-backed fake D1. This verifies SQL and handler behavior, not Cloudflare or an inbox.
const migration = await readFile(new URL('../deployment/migrations/0001_inquiries.sql', import.meta.url), 'utf8');
function fakeD1() {
  const sqlite = new DatabaseSync(':memory:'); sqlite.exec(migration);
  return { sqlite, prepare(sql) {
    const build = values => ({ bind: (...next) => build(next), async first() { return sqlite.prepare(sql).get(...values) ?? null; }, async all() { return { results: sqlite.prepare(sql).all(...values) }; }, async run() { return { success: true, meta: sqlite.prepare(sql).run(...values) }; } });
    return build([]);
  } };
}
const valid = { name: 'Synthetic Person', email: 'synthetic@example.test', business: 'Synthetic Test Only', website: 'https://example.test', service: 'focused_site', message: 'This synthetic request tests the website inquiry flow.', company_url: '' };
function environment() { return { DB: fakeD1(), ASSETS: { fetch: async () => new Response('synthetic asset') }, ENVIRONMENT: 'staging', INQUIRY_MODE: 'synthetic', RELEASE_APPROVED: 'false', STAGING_AUTH: 'test:synthetic-password-only', OPERATOR_TOKEN: 'synthetic-operator-token', FINGERPRINT_SECRET: 'synthetic-only-32-character-secret-never-live' }; }
function request(body = valid, extra = {}) { return new Request('https://staging.example.test/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Origin: 'https://staging.example.test', Authorization: `Basic ${btoa('test:synthetic-password-only')}`, 'CF-Connecting-IP': '192.0.2.1', ...extra }, body: typeof body === 'string' ? body : JSON.stringify(body) }); }
function context() { const promises = []; return { promises, waitUntil(p) { promises.push(p); } }; }
async function record(env) { const response = await worker.fetch(request(), env, context()); return (await response.json()).reference; }

test('synthetic: staging denies assets and form when secret missing or wrong', async () => {
  const env = environment(); let assetCalls = 0; env.ASSETS.fetch = async () => { assetCalls++; return new Response('private'); };
  assert.equal((await worker.fetch(new Request('https://staging.example.test/'), env, context())).status, 401);
  env.STAGING_AUTH = '';
  assert.equal((await worker.fetch(request(), env, context())).status, 401);
  assert.equal(assetCalls, 0);
});
test('synthetic: authorized staging serves assets with private no-store and noindex', async () => {
  const res = await worker.fetch(new Request('https://staging.example.test/', { headers: { Authorization: `Basic ${btoa('test:synthetic-password-only')}` } }), environment(), context());
  assert.equal(res.status, 200); assert.equal(res.headers.get('Cache-Control'), 'private, no-store'); assert.match(res.headers.get('X-Robots-Tag'), /noindex/);
});
test('synthetic: six fields persisted and no notification queued by default', async () => {
  const env = environment(), ctx = context(), res = await worker.fetch(request(), env, ctx);
  assert.equal(res.status, 202); const result = await res.json(); assert.match(result.message, /No email was sent/);
  const row = env.DB.sqlite.prepare('SELECT * FROM inquiries').get();
  assert.equal(row.id, result.reference); assert.equal(row.synthetic, 1); assert.equal(row.delivery_status, 'synthetic'); assert.equal(ctx.promises.length, 0);
  assert.deepEqual(Object.keys(JSON.parse(row.payload)), ['name','email','business','website','service','message']);
});

test('synthetic: edge native correction retains escaped input and annual choices, then persists only allowlisted context', async () => {
  const env=environment(),ctx=context(),body={...valid,service:'grow',billing:'annual',priority:'graphic',priority_two:'email',baseline_status:'needed',name:'<b>Example</b>',message:'short'};
  const headers={'Content-Type':'application/x-www-form-urlencoded',Accept:'text/html'};
  const invalid=await worker.fetch(request(new URLSearchParams(body).toString(),headers),env,ctx);
  assert.equal(invalid.status,422);assert.match(invalid.headers.get('Content-Security-Policy'),/form-action 'self'/);
  const html=await invalid.text();assert.match(html,/value="&lt;b&gt;Example&lt;\/b&gt;"/);assert.match(html,/<option value="annual" selected>/);assert.match(html,/<option value="graphic" selected>/);assert.match(html,/<option value="email" selected>/);
  const retry=html.match(/href="([^\"]+)"[^>]*>Return to inquiry/)[1];assert.match(retry,/offer=grow/);assert.doesNotMatch(retry,/Example|synthetic@example|short/);
  const saved=await worker.fetch(request({...body,message:valid.message}),env,ctx);assert.equal(saved.status,202);
  const result=await saved.json();assert.equal(result.billing,'annual');assert.equal(result.priority_two,'email');assert.equal(result.name,undefined);
  const data=JSON.parse(env.DB.sqlite.prepare('SELECT payload FROM inquiries').get().payload);assert.equal(data.service,'grow');assert.equal(data.billing,'annual');assert.equal(data.priority,'graphic');assert.equal(data.priority_two,'email');assert.equal(data.baseline_status,'needed');assert.equal(ctx.promises.length,0);
});
test('synthetic: validation, honeypot, origin and payload constraints reject before record', async () => {
  const env = environment();
  for (const body of [{ ...valid, company_url: 'bot' }, { ...valid, message: 'short' }, { ...valid, service: 'injected' }, { ...valid, website: 'javascript:alert(1)' }, { ...valid, name: 'x'.repeat(101) }]) assert.equal((await worker.fetch(request(body), env, context())).status, 422);
  assert.equal((await worker.fetch(request(valid, { Origin: 'https://evil.example' }), env, context())).status, 403);
  assert.equal((await worker.fetch(request('x'.repeat(20001)), env, context())).status, 400);
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM inquiries').get().n, 0);
});
test('synthetic: HTML fallback escapes submitted content and URL-encoded form works', async () => {
  const env = environment();
  const res = await worker.fetch(request(new URLSearchParams(valid).toString(), { Accept: 'text/html', 'Content-Type': 'application/x-www-form-urlencoded' }), env, context());
  assert.equal(res.status, 202); assert.match(res.headers.get('Content-Type'), /text\/html/); assert.match(await res.text(), /No email was sent/);
  const duplicated = new URLSearchParams(valid); duplicated.append('name', 'second');
  assert.equal((await worker.fetch(request(duplicated.toString(), { 'Content-Type': 'application/x-www-form-urlencoded' }), env, context())).status, 400);
});
test('synthetic: duplicates reuse a reference; sixth valid attempt is rate limited', async () => {
  const env = environment(); const first = await record(env);
  for (let i = 0; i < 4; i++) assert.equal(await record(env), first);
  assert.equal((await worker.fetch(request(), env, context())).status, 429);
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM inquiries').get().n, 1);
  const row = env.DB.sqlite.prepare('SELECT * FROM rate_limits').get(); assert.equal(row.key.length, 64); assert.equal(JSON.stringify(row).includes('192.0.2.1'), false);
});
test('synthetic: storage failure never reports saved and never sends', async () => {
  const env = environment(); env.DB.prepare = () => { throw new Error('sensitive database detail'); };
  const ctx = context(); const res = await worker.fetch(request(), env, ctx);
  assert.equal(res.status, 503); assert.equal(ctx.promises.length, 0); assert.equal((await res.text()).includes('sensitive'), false);
});
test('synthetic live-mode rehearsal: durable row exists before notification and missing sender config leaves pending', async () => {
  const env = { ...environment(), INQUIRY_MODE: 'live', RELEASE_APPROVED: 'true' }; const ctx = context();
  const res = await worker.fetch(request(), env, ctx); assert.equal(res.status, 202);
  const row = env.DB.sqlite.prepare('SELECT * FROM inquiries').get(); assert.equal(row.delivery_status, 'pending'); assert.equal(row.synthetic, 0);
  await Promise.all(ctx.promises); assert.equal(row.delivery_status, 'pending');
});
test('synthetic provider: accepted once, stable idempotency key, no actual inbox claim', async () => {
  const env = { ...environment(), INQUIRY_MODE: 'live', RELEASE_APPROVED: 'true' }; const id = await record(env);
  Object.assign(env, { RESEND_API_KEY: 'synthetic-key', NOTIFICATION_FROM: 'synthetic@example.test', NOTIFICATION_TO: 'synthetic@example.test' });
  let calls = 0;
  const fakeSender = async (_url, options) => { calls++; assert.equal(options.headers['Idempotency-Key'], `inquiry/${id}`); assert.equal(env.DB.sqlite.prepare('SELECT delivery_status FROM inquiries WHERE id=?').get(id).delivery_status, 'sending'); return Response.json({ id: 'synthetic-provider-id' }); };
  assert.equal((await notifyInquiry(env, id, fakeSender)).status, 'accepted');
  assert.equal((await notifyInquiry(env, id, fakeSender)).sent, false); assert.equal(calls, 1);
});
test('synthetic provider: timeout stays recoverable; retry older than idempotency window is held', async () => {
  const env = { ...environment(), INQUIRY_MODE: 'live', RELEASE_APPROVED: 'true' }; const id = await record(env);
  Object.assign(env, { RESEND_API_KEY: 'synthetic-key', NOTIFICATION_FROM: 'synthetic@example.test', NOTIFICATION_TO: 'synthetic@example.test' });
  const now = Date.now(); const failed = await notifyInquiry(env, id, async () => { throw new Error('timeout'); }, now);
  assert.equal(failed.status, 'uncertain');
  const stale = await notifyInquiry(env, id, async () => { throw new Error('must not call'); }, now + 23 * 3600_000);
  assert.equal(stale.status, 'manual_review');
});
test('synthetic provider: concurrent lease prevents two notification sends', async () => {
  const env = { ...environment(), INQUIRY_MODE: 'live', RELEASE_APPROVED: 'true' }; const id = await record(env);
  Object.assign(env, { RESEND_API_KEY: 'synthetic-key', NOTIFICATION_FROM: 'synthetic@example.test', NOTIFICATION_TO: 'synthetic@example.test' });
  let calls = 0; const sender = async () => { calls++; return Response.json({ id: 'synthetic-id' }); };
  await Promise.all([notifyInquiry(env, id, sender), notifyInquiry(env, id, sender)]); assert.equal(calls, 1);
});

test('late expired attempt cannot overwrite a newer accepted delivery',async()=>{
  const env={...environment(),INQUIRY_MODE:'live',RELEASE_APPROVED:'true'};const id=await record(env);
  Object.assign(env,{RESEND_API_KEY:'synthetic-key',NOTIFICATION_FROM:'synthetic@example.test',NOTIFICATION_TO:'synthetic@example.test'});
  let releaseOld,signalStarted;const started=new Promise(resolve=>{signalStarted=resolve;});
  const oldResponse=new Promise(resolve=>{releaseOld=resolve;});const now=Date.now();
  const oldAttempt=notifyInquiry(env,id,async()=>{signalStarted();return oldResponse;},now);await started;
  const recovered=await notifyInquiry(env,id,async()=>Response.json({id:'newer-accepted-id'}),now+61_000);
  assert.equal(recovered.status,'accepted');releaseOld(new Response('simulated failure',{status:500}));
  const oldResult=await oldAttempt;assert.equal(oldResult.staleAttempt,true);
  const row=env.DB.sqlite.prepare('SELECT delivery_status,provider_id,attempts,lease_until FROM inquiries WHERE id=?').get(id);
  assert.equal(row.delivery_status,'accepted');assert.equal(row.provider_id,'newer-accepted-id');assert.equal(row.attempts,2);assert.equal(row.lease_until,null);
});

test('idempotency age boundary does not revoke an active delivery lease',async()=>{
  const env={...environment(),INQUIRY_MODE:'live',RELEASE_APPROVED:'true'};const id=await record(env);
  Object.assign(env,{RESEND_API_KEY:'synthetic-key',NOTIFICATION_FROM:'synthetic@example.test',NOTIFICATION_TO:'synthetic@example.test'});
  const now=Date.now();env.DB.sqlite.prepare("UPDATE inquiries SET delivery_status='sending',first_attempt_at=?,lease_until=?,attempts=1 WHERE id=?").run(now-23*3600_000,now+30_000,id);
  const result=await notifyInquiry(env,id,async()=>{throw Error('must not send');},now);
  assert.equal(result.status,'busy-or-ineligible');assert.equal(env.DB.sqlite.prepare('SELECT delivery_status FROM inquiries WHERE id=?').get(id).delivery_status,'sending');
});
test('synthetic: operator export requires distinct credentials; deletion needs exact confirmation', async () => {
  const env = environment(); const id = await record(env);
  env.DB.sqlite.exec(await readFile(new URL('../deployment/migrations/0003_inquiry_followup.sql', import.meta.url), 'utf8'));
  const headers = { Accept: 'application/json', Authorization: 'Bearer synthetic-operator-token', 'X-Staging-Authorization': `Basic ${btoa(env.STAGING_AUTH)}` };
  const url = 'https://staging.example.test/api/operator/inquiries';
  assert.equal((await worker.fetch(new Request(url, { headers: { Authorization: `Basic ${btoa(env.STAGING_AUTH)}` } }), env, context())).status, 401);
  const exported = await worker.fetch(new Request(url, { headers }), env, context()); assert.equal((await exported.json()).records.length, 1);
  assert.equal((await worker.fetch(new Request(`${url}/${id}`, { method: 'DELETE', headers }), env, context())).status, 405);
  assert.equal((await worker.fetch(new Request(`${url}/${id}`, { method: 'DELETE', headers: { ...headers, 'X-Confirm-Delete': id } }), env, context())).status, 200);
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM inquiries').get().n, 0);
});
test('synthetic: scheduled cleanup removes expired rate keys only', async () => {
  const env = environment(); await record(env); env.DB.sqlite.prepare('UPDATE rate_limits SET expires_at=0').run();
  await worker.scheduled({}, env); assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM rate_limits').get().n, 0); assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM inquiries').get().n, 1);
});

test('native edge validation retains allowlisted monthly and audit intent without personal data in retry URLs',async()=>{
 for(const service of ['keep_running','improve','grow','audit_fix_sprint','invented']){
  const env=environment();
  const res=await worker.fetch(request(new URLSearchParams({...valid,service,message:'short'}).toString(),{Accept:'text/html','Content-Type':'application/x-www-form-urlencoded'}),env,context());
  assert.equal(res.status,422);const html=await res.text();
  if(service!=='invented')assert.match(html,/Selected service:/);
  const retry=html.match(/href="([^\"]+)"[^>]*>Return to inquiry/)[1];
  assert.equal(retry,service==='invented'?'/contact/':'/contact/?offer='+service);
  assert.doesNotMatch(retry,/synthetic@example|Synthetic/);
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM inquiries').get().n,0);
  env.DB.sqlite.close();
 }
});
