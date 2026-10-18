import {saveJourneyCount,cleanJourneyCounts,journeyReportCoverage} from './journey-counts.mjs';
import {routeIndexEligible,privateRoute} from '../src/index-policy.mjs';
import { timingSafeEqual } from 'node:crypto';
import { validateInquiry } from '../src/inquiry.mjs';
import {selectedInquiryContext,inquiryChoices,inquiryContextSummary} from '../src/shared.mjs';
import { inquiryResponseHtml } from '../src/inquiry-response.mjs';
import { MAX_NOTIFICATION_ATTEMPTS, NOTIFICATION_WINDOW_MS, UNSENT_NOTIFICATION_WINDOW_MS, hasInquiryFollowup, inquiryRetentionPreview, followupInput } from './inquiry-maintenance.mjs';
import { inquiryStatus, recordRecoverySuccess } from './inquiry-health.mjs';
import { allowInquiryRate } from './inquiry-rate.mjs';
import { hasInquiryQuery, prefillInquiryHtml } from '../src/inquiry-prefill.mjs';

const encoder = new TextEncoder();
const MAX_BODY = 20_000;
const LIVE = env => env.INQUIRY_MODE === 'live' && env.RELEASE_APPROVED === 'true';
function withTransportPolicy(response,request,env){
  const url=new URL(request.url);
  if(env.ENVIRONMENT==='production'&&env.RELEASE_APPROVED==='true'&&url.protocol==='https:'&&['wonderandmethod.com','www.wonderandmethod.com'].includes(url.hostname))response.headers.set('Strict-Transport-Security','max-age=31536000');
  return response;
}
const hex = data => [...new Uint8Array(data)].map(x => x.toString(16).padStart(2, '0')).join('');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
async function secretEqual(a, b) {
  if (!a || !b) return false;
  const hashes = await Promise.all([a, b].map(x => crypto.subtle.digest('SHA-256', encoder.encode(x))));
  return timingSafeEqual(new Uint8Array(hashes[0]), new Uint8Array(hashes[1]));
}
async function fingerprint(secret, text) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(text)));
}
function respond(request, status, message, reference = null, errors, service, choices = {}, flags = {}) {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
  if(status===405&&new URL(request.url).pathname==='/api/inquiries')headers.Allow='POST';
  if(status===429)headers['Retry-After']=String(flags.retryAfter||600);
  const data = { message, reference, ...(reference&&typeof choices.email==='string'?{email:choices.email}:{}), ...(errors ? { errors } : {}), ...(service ? { service } : {}), ...selectedInquiryContext({...choices,service}), ...(typeof flags.synthetic === 'boolean' ? { synthetic: flags.synthetic } : {}) };
  if (request.headers.get('Accept')?.includes('application/json')) return Response.json(data, { status, headers });
  headers['Content-Type'] = 'text/html; charset=utf-8';
  // Native correction POSTs need a same-origin Origin; never send a cross-site referrer.
  if (errors) headers['Referrer-Policy'] = 'same-origin';
  headers['Content-Security-Policy'] = "default-src 'none'; style-src 'self'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";
  return new Response(inquiryResponseHtml({...data,retry:errors?choices:undefined}), { status, headers });
}
async function readLimited(stream, max = MAX_BODY) {
  if (!stream) return '';
  const reader = stream.getReader(); const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel(); throw new Error('body-limit'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
async function parseBody(request) {
  const type = request.headers.get('Content-Type')?.split(';')[0];
  if (!['application/json', 'application/x-www-form-urlencoded'].includes(type)) throw new Error('content-type');
  const text = await readLimited(request.body);
  if (type === 'application/json') return JSON.parse(text);
  const fields = new URLSearchParams(text);
  for (const key of fields.keys()) if (fields.getAll(key).length !== 1) throw new Error('duplicate-field');
  return Object.fromEntries(fields);
}

// Provider acceptance is not mailbox delivery. At most one leased send per durable row.
export async function notifyInquiry(env, id, send = fetch, now = Date.now()) {
  if (!LIVE(env)) return { status: 'synthetic', sent: false };
  if (!env.RESEND_API_KEY || !env.NOTIFICATION_FROM || !env.NOTIFICATION_TO) return { status: 'configuration-pending', sent: false };
  const db = env.DB;
  const record = await db.prepare('SELECT * FROM inquiries WHERE id = ?').bind(id).first();
  if (!record || record.synthetic) return { status: 'not-live-record', sent: false };
  if (record.delivery_status === 'accepted') return { status: 'accepted', sent: false };
  // Leave a margin inside the provider's 24-hour idempotency horizon.
  if (record.attempts >= MAX_NOTIFICATION_ATTEMPTS ||
      (record.first_attempt_at !== null && now - record.first_attempt_at >= NOTIFICATION_WINDOW_MS) ||
      (record.first_attempt_at === null && now - record.created_at >= UNSENT_NOTIFICATION_WINDOW_MS)) {
    const held=await db.prepare("UPDATE inquiries SET delivery_status = 'manual_review' WHERE id = ? AND delivery_status != 'accepted' AND (lease_until IS NULL OR lease_until < ?) RETURNING delivery_status").bind(id,now).first();
    return { status: held?'manual_review':'busy-or-ineligible', sent: false };
  }
  const snapshotEnabled = await hasInquiryFollowup(db);
  // Old attempted messages must retain their original format under the same key.
  const snapshot = snapshotEnabled && record.first_attempt_at === null
    ? JSON.stringify(notificationMessage(env, id, JSON.parse(record.payload))) : null;
  const snapshotSql = snapshotEnabled ? ', notification_payload = COALESCE(notification_payload, ?)' : '';
  const bindings = [now + 60_000, now, ...(snapshotEnabled ? [snapshot] : []), id, now, MAX_NOTIFICATION_ATTEMPTS, record.attempts, record.first_attempt_at, record.delivery_status, record.lease_until];
  const leased = await db.prepare(`UPDATE inquiries SET delivery_status = 'sending', lease_until = ?, first_attempt_at = COALESCE(first_attempt_at, ?), attempts = attempts + 1${snapshotSql} WHERE id = ? AND synthetic = 0 AND delivery_status IN ('pending','failed','uncertain','sending') AND (lease_until IS NULL OR lease_until < ?) AND attempts < ? AND attempts = ? AND first_attempt_at IS ? AND delivery_status = ? AND lease_until IS ? RETURNING *`).bind(...bindings).first();
  if (!leased) return { status: 'busy-or-ineligible', sent: false };
  // A distributed form attack must not turn into an unbounded email bill.
  // This is one atomic, site-wide UTC-day budget, including retries.
  const configuredLimit=Number(env.NOTIFICATION_DAILY_LIMIT??50);
  const dailyLimit=Number.isSafeInteger(configuredLimit)&&configuredLimit>=1&&configuredLimit<=2000?configuredLimit:50;
  const day=Math.floor(now/86400_000);
  const releaseUnsentLease=()=>db.prepare(`UPDATE inquiries SET delivery_status=?,lease_until=NULL,attempts=?,first_attempt_at=?${snapshotEnabled?',notification_payload=?':''} WHERE id=? AND attempts=? AND lease_until=? AND delivery_status='sending'`)
    .bind(record.delivery_status==='sending'?'uncertain':record.delivery_status,record.attempts,record.first_attempt_at,...(snapshotEnabled?[record.notification_payload??null]:[]),id,leased.attempts,leased.lease_until).run();
  let quota;
  try { quota=await db.prepare('INSERT INTO rate_limits (key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 WHERE hits<? RETURNING hits').bind('notification-quota:'+day,(day+2)*86400_000,dailyLimit).first(); }
  catch(error){await releaseUnsentLease();throw error;}
  if(!quota){
    await releaseUnsentLease();
    return {status:'daily-budget-held',sent:false};
  }
  const inquiry = JSON.parse(leased.payload);
  let status = 'uncertain', providerId = null;
  try {
    const response = await send('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `inquiry/${id}` },
      body: leased.notification_payload || JSON.stringify({ from: env.NOTIFICATION_FROM, to: [env.NOTIFICATION_TO], reply_to: inquiry.email, subject: `Website inquiry ${id}`, text: ['Website inquiry', `Reference: ${id}`, ...Object.entries(inquiry).map(([k, v]) => `${k}: ${v}`)].join('\n\n') })
    });
    if (response.ok) {
      const result = JSON.parse(await readLimited(response.body, 4096));
      if (typeof result.id === 'string' && result.id.length <= 200) { status = 'accepted'; providerId = result.id; }
    } else { status = 'failed'; await response.body?.cancel(); }
  } catch { /* Generic durable state only; never log provider responses, credentials or inquiry data. */ }
  // Fence completion to the attempt that owns this lease. A late invocation must
  // never overwrite the result of a newer recovery attempt.
  const completed=await db.prepare("UPDATE inquiries SET delivery_status = ?, provider_id = ?, lease_until = NULL WHERE id = ? AND attempts = ? AND lease_until = ? AND delivery_status = 'sending' RETURNING id").bind(status,providerId,id,leased.attempts,leased.lease_until).first();
  if(!completed){const current=await db.prepare('SELECT delivery_status FROM inquiries WHERE id = ?').bind(id).first();return {status:current?.delivery_status||'not-live-record',sent:false,staleAttempt:true};}
  return { status, sent: status === 'accepted' };
}

function notificationMessage(env, id, inquiry) {
  const service = inquiryChoices.find(([value]) => value === inquiry.service)?.[1] || 'Project inquiry';
  const subjectName = String(inquiry.business || inquiry.name || '').replace(/[\r\n\u0000-\u001f]/g, ' ').slice(0, 100);
  return {
    from: env.NOTIFICATION_FROM, to: [env.NOTIFICATION_TO], reply_to: inquiry.email,
    subject: `[Project inquiry] ${service} — ${subjectName}`,
    text: ['Website inquiry', `Reference: ${id}`, `Name: ${inquiry.name}`, `Email: ${inquiry.email}`,
      `Business: ${inquiry.business || 'Not supplied'}`, `Website: ${inquiry.website || 'Not supplied'}`,
      `Service: ${service}`, ...inquiryContextSummary(inquiry), `Message: ${inquiry.message}`].join('\n\n')
  };
}

export async function retryPendingInquiries(env, send = fetch, now = Date.now(), clock = Date.now) {
  if (!env.DB || !LIVE(env)) return { attempted: 0 };
  // Exhausted/old rows become visible for manual reconciliation; never revoke a live lease.
  await env.DB.prepare(`UPDATE inquiries SET delivery_status = 'manual_review'
    WHERE synthetic = 0 AND delivery_status IN ('pending','failed','uncertain','sending')
      AND (lease_until IS NULL OR lease_until < ?)
      AND (attempts >= ? OR (first_attempt_at IS NULL AND created_at <= ?) OR (first_attempt_at IS NOT NULL AND first_attempt_at <= ?))
  `).bind(now, MAX_NOTIFICATION_ATTEMPTS, now - UNSENT_NOTIFICATION_WINDOW_MS, now - NOTIFICATION_WINDOW_MS).run();
  const { results } = await env.DB.prepare(`SELECT id FROM inquiries
    WHERE synthetic = 0 AND delivery_status IN ('pending','failed','uncertain','sending')
      AND attempts < ? AND created_at <= ? AND (first_attempt_at IS NOT NULL OR created_at > ?)
      AND (first_attempt_at IS NULL OR first_attempt_at > ?)
      AND (lease_until IS NULL OR lease_until < ?)
    ORDER BY created_at, id LIMIT 20
  `).bind(MAX_NOTIFICATION_ATTEMPTS, now - 120_000, now - UNSENT_NOTIFICATION_WINDOW_MS, now - NOTIFICATION_WINDOW_MS, now).all();
  let attempted = 0, failed = 0;
  for (const { id } of results) {
    try { await notifyInquiry(env, id, send, clock()); } catch { failed++; }
    attempted++;
  }
  return { attempted, failed };
}

async function submit(request, env, ctx) {
  if (request.method !== 'POST') return respond(request, 405, 'Use the inquiry form.');
  const origin = new URL(request.url).origin;
  if (request.headers.get('Origin') !== origin) return respond(request, 403, 'Submit from this website.');
  if (!env.DB || !env.FINGERPRINT_SECRET || env.FINGERPRINT_SECRET.length < 32) return respond(request, 503, 'We could not save your inquiry. Please try again or email support@wonderandmethod.com.');
  let data;
  try { data = await parseBody(request); } catch { return respond(request, 400, 'Use the form fields within the stated limits.'); }
  // Do not identify the trap field or claim that an unstored message was saved.
  if (data && typeof data === 'object' && (data._faxcheck||data.company_url)) return respond(request, 422, 'Unable to accept this request. Please email support@wonderandmethod.com for help.');
  const { errors, value } = validateInquiry(data);
  if (Object.keys(errors).length) return respond(request, 422, 'Please review the indicated fields.', null, errors, value.service, value);
  const now = Date.now();
  const rate=await allowInquiryRate(env,request.headers.get('CF-Connecting-IP')||'local-unknown',now,fingerprint);
  if (!rate.allowed) return respond(request, 429, 'Too many attempts. Please try again later or email support@wonderandmethod.com.',null,undefined,undefined,{}, {retryAfter:rate.retryAfter});
  const synthetic = !LIVE(env);
  const id = crypto.randomUUID();
  const payload = JSON.stringify(value), syntheticFlag = synthetic ? 1 : 0;
  const dedupe = await fingerprint(env.FINGERPRINT_SECRET, `duplicate:${synthetic}:${id}`);
  // One SQLite write makes the rolling-window check and insert atomic. Comparing
  // normalized payloads also recognizes records saved by the previous release.
  await env.DB.prepare(`INSERT INTO inquiries (id, created_at, payload, dedupe_key, synthetic, delivery_status)
    SELECT ?, ?, ?, ?, ?, ? WHERE NOT EXISTS
      (SELECT 1 FROM inquiries WHERE created_at > ? AND payload = ? AND synthetic = ?)`)
    .bind(id, now, payload, dedupe, syntheticFlag, synthetic ? 'synthetic' : 'pending', now - 600_000, payload, syntheticFlag).run();
  const record = await env.DB.prepare('SELECT id, delivery_status FROM inquiries WHERE created_at > ? AND payload = ? AND synthetic = ? ORDER BY created_at, id LIMIT 1').bind(now - 600_000, payload, syntheticFlag).first();
  if (!record) throw new Error('storage-incomplete');
  if (!synthetic && record.id === id) ctx.waitUntil(notifyInquiry(env, id).catch(() => { /* A persisted pending/leased row remains recoverable. */ }));
  return respond(request, 202, synthetic ? 'Synthetic test recorded. No email was sent and no inbox receipt is claimed.' : (value.request_kind==='question'?'Thank you. Your question is saved for the studio to review. Keep this reference for your records.':'Thank you. Your project details are saved for the studio to review. Keep this reference for your records.'), record.id, undefined, value.service, value, { synthetic });
}

async function operator(request, env) {
  const authenticated = await secretEqual(request.headers.get('Authorization'), env.OPERATOR_TOKEN ? `Bearer ${env.OPERATOR_TOKEN}` : null);
  if (env.DB && env.FINGERPRINT_SECRET?.length >= 32) {
    const now = Date.now();
    const key = await fingerprint(env.FINGERPRINT_SECRET, `operator:${authenticated ? 'authenticated' : 'unauthenticated'}:${request.headers.get('CF-Connecting-IP') || 'unknown'}:${Math.floor(now / 600_000)}`);
    const allowed = await env.DB.prepare('INSERT INTO rate_limits (key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 WHERE hits<? RETURNING hits').bind(key, now + 1_200_000, authenticated ? 600 : 30).first();
    if (!allowed) { const limited = respond(request, 429, 'Too many operator attempts. Try again in ten minutes.'); limited.headers.set('Retry-After', '600'); return limited; }
  }
  if (!authenticated) return respond(request, 401, 'Operator authentication required.');
  if (!env.DB) return respond(request, 503, 'Storage unavailable.');
  const url = new URL(request.url);
  if(url.pathname==='/api/operator/journey-summary'&&request.method==='GET'){
    const days=Number(url.searchParams.get('days')||7);
    if(!Number.isInteger(days)||days<1||days>90)return respond(request,422,'Choose a reporting period from 1 to 90 days.');
    const {since,comparisonSince,coverage}=journeyReportCoverage(days);
    const {results}=await env.DB.prepare('SELECT event,service,page,SUM(total) AS total FROM journey_counts WHERE day>=? GROUP BY event,service,page ORDER BY event,service,page').bind(since).all();
    const availableSince=comparisonSince<coverage.retainedSince?coverage.retainedSince:comparisonSince;
    const {results:daily}=await env.DB.prepare('SELECT day,event,service,page,SUM(total) AS total FROM journey_counts WHERE day>=? GROUP BY day,event,service,page ORDER BY day,event,service,page').bind(availableSince).all();
    const {results:bySource}=await env.DB.prepare("SELECT source,SUM(total) AS total FROM journey_counts WHERE day>=? AND event='page_view' GROUP BY source ORDER BY source").bind(since).all();
    return Response.json({days,since,comparisonSince,coverage,counts:results,daily,bySource,note:'Aggregate event totals, not unique visitors, linked journeys or conversion rates. Source categories are approximate; earlier rows have no source recorded. Coverage describes retention eligibility, not uninterrupted collection; pre-collection dates and outages are not verified. The current UTC day may be incomplete.'},{headers:{'Cache-Control':'no-store'}});
  }
  if(url.pathname==='/api/operator/journey-counts'&&request.method==='GET'){const {results}=await env.DB.prepare("SELECT day,event,service,page,source,total FROM journey_counts WHERE day>=date('now','-89 days') ORDER BY day DESC,event,service,page,source LIMIT 5000").all();return Response.json({counts:results,limit:5000,note:'Aggregate event counts, not unique visitors or linked conversions. Client-reported; bots, blockers and privacy preferences affect totals.'},{headers:{'Cache-Control':'no-store'}});}
  const base = '/api/operator/inquiries';
  if (url.pathname === `${base}/status` && request.method === 'GET') {
    return Response.json({...await inquiryStatus(env),runtimeVersion:env.CF_VERSION_METADATA?.id||null}, {headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  }
  if (url.pathname === `${base}/retention-preview` && request.method === 'GET') {
    const preview = await inquiryRetentionPreview(env.DB);
    return preview ? Response.json(preview, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
      : respond(request, 503, 'Inquiry follow-up migration is required. No records were changed.');
  }
  if (url.pathname === base && request.method === 'GET') {
    const cursor = url.searchParams.get('after') || '';
    if (cursor && !/^[a-f0-9-]{36}$/.test(cursor)) return respond(request, 400, 'Invalid export cursor.');
    const { results } = await env.DB.prepare('SELECT * FROM inquiries WHERE id > ? ORDER BY id LIMIT 100').bind(cursor).all();
    return Response.json({ records: results, next_cursor: results.length === 100 ? results.at(-1).id : null }, { headers: { 'Cache-Control': 'no-store', 'Content-Disposition': 'attachment; filename="inquiries.json"', 'X-Content-Type-Options': 'nosniff' } });
  }
  const match = url.pathname.match(/^\/api\/operator\/inquiries\/([a-f0-9-]{36})(\/(?:retry|followup))?$/);
  if (!match) return respond(request, 404, 'Unknown operator action.');
  const id = match[1];
  if (request.method === 'POST' && match[2] === '/followup' && request.headers.get('X-Confirm-Followup') === id) {
    if (!await hasInquiryFollowup(env.DB)) return respond(request, 503, 'Inquiry follow-up migration is required. No records were changed.');
    const row = await env.DB.prepare('SELECT created_at FROM inquiries WHERE id = ?').bind(id).first();
    if (!row) return respond(request, 404, 'Unknown inquiry reference.');
    let data;
    try { data = await parseBody(request); } catch { return respond(request, 400, 'Use valid follow-up fields.'); }
    const value = followupInput(data, row.created_at);
    if (!value) return respond(request, 422, 'Supply a recorded last-contact timestamp or null, and explicit client and hold booleans. A hold also needs a reason and a future review date within one year.');
    await env.DB.prepare('UPDATE inquiries SET last_substantive_contact_at = ?, is_client = ?, retention_hold = ?, retention_hold_reason = ?, retention_hold_review_at = ? WHERE id = ?')
      .bind(value.contact, value.client, value.hold, value.reason, value.review, id).run();
    return respond(request, 200, 'Follow-up tracking updated. No records were deleted.', id);
  }
  if (request.method === 'POST' && match[2] === '/retry' && request.headers.get('X-Confirm-Retry') === id) {
    const result = await notifyInquiry(env, id);
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  }
  if (request.method === 'DELETE' && !match[2] && request.headers.get('X-Confirm-Delete') === id) {
    if (!await hasInquiryFollowup(env.DB)) return respond(request, 503, 'Inquiry follow-up migration is required. No records were changed.');
    const deleted = await env.DB.prepare("DELETE FROM inquiries WHERE id = ? AND delivery_status != 'sending' AND retention_hold = 0 RETURNING id").bind(id).first();
    return respond(request, deleted ? 200 : 409, deleted ? 'Record deleted from active D1. Apply the approved retention policy to mailbox, exports and backups separately.' : 'No eligible record deleted. Reconcile any sending attempt or preservation hold before deletion.', id);
  }
  return respond(request, 405, 'Use a supported operator action and exact reference confirmation.');
}

function byteRange(value, length) {
  // Ignore unsupported units/multipart and malformed syntax rather than serving a wrong slice.
  const match = /^bytes=(\d*)-(\d*)$/.exec(value?.trim() || '');
  if (!match || (!match[1] && !match[2])) return null;
  const startValue = match[1] ? Number(match[1]) : null;
  const endValue = match[2] ? Number(match[2]) : null;
  if ([startValue, endValue].some(number => number !== null && !Number.isSafeInteger(number))) return null;
  if (!length) return { unsatisfiable: true };
  if (startValue === null) {
    if (endValue === 0) return { unsatisfiable: true };
    return { start: Math.max(0, length - endValue), end: length - 1 };
  }
  if (endValue !== null && endValue < startValue) return null;
  if (startValue >= length) return { unsatisfiable: true };
  return { start: startValue, end: Math.min(endValue ?? length - 1, length - 1) };
}

function ifRangeMatches(request, response) {
  const value = request.headers.get('If-Range');
  if (!value) return true;
  if (value.startsWith('W/')) return false;
  if (value.startsWith('"')) return value === response.headers.get('ETag');
  const modified = Date.parse(response.headers.get('Last-Modified') || '');
  const expected = Date.parse(value);
  return Number.isFinite(modified) && Number.isFinite(expected) && modified === expected;
}

async function videoAsset(request, assets) {
  // Fetch the complete identity representation. This also preserves conditional 304 responses.
  const headers = new Headers(request.headers);
  headers.delete('Range');
  headers.delete('If-Range');
  headers.set('Accept-Encoding', 'identity');
  const response = await assets.fetch(new Request(request, { headers }));
  const resultHeaders = new Headers(response.headers);
  resultHeaders.set('Accept-Ranges', 'bytes');
  if(request.method==='HEAD'&&response.status===200&&!resultHeaders.has('Content-Length')){
    // Read the tiny build-generated index, never the video body for a HEAD request.
    try{
      const index=await assets.fetch(new Request(new URL('/assets/media-sizes.json',request.url),{headers:{'Accept-Encoding':'identity'}}));
      if(index.ok){const size=(await index.json())[new URL(request.url).pathname];if(Number.isSafeInteger(size)&&size>=0)resultHeaders.set('Content-Length',String(size));}
    }catch{} // Preserve the asset response if an older deployment has no index.
  }
  const rangeHeader = request.headers.get('Range');
  if (request.method !== 'GET' || response.status !== 200 || !rangeHeader || !ifRangeMatches(request, response) ||
      (response.headers.get('Content-Encoding') && response.headers.get('Content-Encoding') !== 'identity')) {
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: resultHeaders });
  }
  const bytes = await response.arrayBuffer();
  const range = byteRange(rangeHeader, bytes.byteLength);
  resultHeaders.delete('Content-Encoding');
  if (!range) {
    resultHeaders.set('Content-Length', String(bytes.byteLength));
    return new Response(bytes, { status: 200, headers: resultHeaders });
  }
  if (range.unsatisfiable) {
    resultHeaders.set('Content-Range', `bytes */${bytes.byteLength}`);
    resultHeaders.set('Content-Length', '0');
    return new Response(null, { status: 416, headers: resultHeaders });
  }
  const slice = bytes.slice(range.start, range.end + 1);
  resultHeaders.set('Content-Range', `bytes ${range.start}-${range.end}/${bytes.byteLength}`);
  resultHeaders.set('Content-Length', String(slice.byteLength));
  return new Response(slice, { status: 206, headers: resultHeaders });
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      // Every staging asset/API request passes here; config sets run_worker_first=true.
      if (env.ENVIRONMENT !== 'production' || env.RELEASE_APPROVED !== 'true') {
        const expected = env.STAGING_AUTH ? `Basic ${btoa(env.STAGING_AUTH)}` : null;
        // Operators use a distinct header while Basic auth protects the whole staging origin.
        const supplied = request.headers.get('X-Staging-Authorization') || request.headers.get('Authorization');
        if (!await secretEqual(supplied, expected)) return new Response('Private staging. Authentication required.', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Private staging", charset="UTF-8"', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive' } });
      }
      let response;
      if(env.PUBLIC_ORIGIN&&url.origin!==env.PUBLIC_ORIGIN&&['GET','HEAD'].includes(request.method))response=Response.redirect(env.PUBLIC_ORIGIN+url.pathname+url.search,308);
      else if (['/services', '/services/'].includes(url.pathname) && ['GET', 'HEAD'].includes(request.method)) response = Response.redirect(new URL('/services/web-design/' + url.search, url), 301);
      else if (['/work/content-editor', '/work/content-editor/'].includes(url.pathname) && ['GET', 'HEAD'].includes(request.method)) response = Response.redirect(new URL('/work/source-handoff/' + url.search, url), 301);
      else if (url.pathname.startsWith('/api/operator/')) response = await operator(request, env);
      else if (url.pathname === '/api/journey-counts') response = await saveJourneyCount(request,env,{readLimited,fingerprint});
      else if (url.pathname === '/api/inquiries') response = await submit(request, env, ctx);
      else if (url.pathname.startsWith('/api/')) response = respond(request, 404, 'Not found.');
      else {
        let assetRequest=request;
        if(hasInquiryQuery(url)){
          const headers=new Headers(request.headers);headers.delete('If-None-Match');headers.delete('If-Modified-Since');
          assetRequest=new Request(request,{headers});
        }
        const explicit404 = ['/404', '/404/', '/404.html'].includes(url.pathname) && ['GET', 'HEAD'].includes(request.method);
        if (explicit404) {
          const page = await env.ASSETS.fetch(new Request(new URL('/404/', url), { method: request.method }));
          // Explicit aliases are always errors, even if the asset platform canonicalizes them.
          if (page.ok || page.status === 404) response = new Response(page.body, { status: 404, headers: page.headers });
          else { await page.body?.cancel(); response = new Response(request.method === 'HEAD' ? null : 'Page not found.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }
        } else response = /\.(?:mp4|webm)$/i.test(url.pathname) && ['GET', 'HEAD'].includes(request.method)
          ? await videoAsset(request, env.ASSETS) : await env.ASSETS.fetch(assetRequest);
        // Our static generator writes /404/index.html; edge fallback expects /404.html.
        // Fetch the existing branded page internally while preserving a real 404 status.
        if (response.status === 404 && ['GET', 'HEAD'].includes(request.method) && !explicit404) {
          const fallback = new URL('/404/', url);
          const page = await env.ASSETS.fetch(new Request(fallback, { method: request.method }));
          if (page.ok) { await response.body?.cancel(); response = new Response(page.body, { status: 404, headers: page.headers }); }
          else await page.body?.cancel();
        }
        if(request.method==='GET'&&response.status===200&&hasInquiryQuery(url)&&response.headers.get('Content-Type')?.includes('text/html')){
          const headers=new Headers(response.headers);headers.delete('Content-Length');headers.delete('ETag');headers.delete('Last-Modified');headers.set('Cache-Control','private, no-store');
          response=new Response(prefillInquiryHtml(await response.text(),url),{status:200,headers});
        }
      }
      // Asset canonical redirects are permanent; preserve the provider target and query.
      let permanentAssetRedirect=false;
      if(response.status===307 && ['GET','HEAD'].includes(request.method) && !url.pathname.startsWith('/api/')){
        const location=response.headers.get('Location');
        if(location){const target=new URL(location,url);const cleanPath=url.pathname.endsWith('/index.html')?url.pathname.slice(0,-10):url.pathname.endsWith('.html')?url.pathname.slice(0,-5)+(url.pathname.startsWith('/assets/')?'':'/'):url.pathname+'/';permanentAssetRedirect=target.origin===url.origin && (target.pathname===cleanPath||target.pathname===cleanPath.slice(0,-1)) && target.search===url.search;if(permanentAssetRedirect){target.pathname=cleanPath;response=new Response(response.body,{status:response.status,headers:response.headers});response.headers.set('Location',target.href);}}
      }
      const result = new Response(response.body, {status:permanentAssetRedirect?308:response.status,statusText:permanentAssetRedirect?'Permanent Redirect':response.statusText,headers:response.headers});
      result.headers.set('X-Content-Type-Options', 'nosniff');
      if (!result.headers.has('Referrer-Policy')) result.headers.set('Referrer-Policy', url.pathname.startsWith('/api/') ? 'no-referrer' : 'strict-origin-when-cross-origin');
      result.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
      result.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
      const type = result.headers.get('Content-Type');
      if (/^(?:text\/(?:plain|csv|html))(?:;|$)/i.test(type || '') && !/charset=/i.test(type)) result.headers.set('Content-Type', `${type}; charset=utf-8`);
      if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/civic-sculpture/')) {
        result.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
        // Existing unversioned URLs must not receive immutable year-long caching.
        if ((result.status >= 200 && result.status < 300) || result.status === 304) result.headers.set('Cache-Control', 'public, max-age=3600, must-revalidate');
      }
      if(env.SEARCH_INDEXING !== 'true'||response.status>=400)result.headers.set('X-Robots-Tag','noindex, nofollow, noarchive, noimageindex');
       else if(!routeIndexEligible(url.pathname))result.headers.set('X-Robots-Tag',privateRoute(url.pathname)?'noindex, nofollow, noarchive, noimageindex':'noindex, follow');
      if (env.ENVIRONMENT !== 'production' || env.RELEASE_APPROVED !== 'true') { result.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive'); result.headers.set('Cache-Control', 'private, no-store'); }
      return withTransportPolicy(result,request,env);
    } catch {
      console.error('worker_request_failed');
      const response=respond(request, 503, 'This request could not be completed. Please try again or email support@wonderandmethod.com.');
      response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive, noimageindex');
      return withTransportPolicy(response,request,env);
    }
  },
  async scheduled(_event, env) {
    return runScheduledMaintenance(env);
  }
};

// Each job is independent. Logs contain only fixed codes, never inquiry data.
export async function runScheduledMaintenance(env,{send=fetch,now=Date.now(),clock=Date.now,logger=console.error}={}){
  if(!env.DB)return {ok:false,codes:['scheduled_database_missing']};
  const codes=[];
  const step=async(code,fn)=>{try{return await fn();}catch{codes.push(code);logger(code);return null;}};
  const recovery=await step('scheduled_recovery_failed',()=>retryPendingInquiries(env,send,now,clock));
  if(recovery?.failed){codes.push('scheduled_recovery_row_failed');logger('scheduled_recovery_row_failed');}
  if(recovery && !recovery.failed)await step('scheduled_heartbeat_failed',()=>recordRecoverySuccess(env.DB,now));
  await step('scheduled_rate_cleanup_failed',()=>env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(now).run());
  await step('scheduled_aggregate_cleanup_failed',()=>cleanJourneyCounts(env.DB));
  if(env.HEALTHCHECK_URL && LIVE(env) && codes.length===0){
    await step('scheduled_healthcheck_failed',async()=>{
      const health=await inquiryStatus(env,now);
      if(!health.health.ok)return;
      const url=new URL(env.HEALTHCHECK_URL);
      if(url.protocol!=='https:'||url.username||url.password)throw Error('invalid-healthcheck');
      const response=await send(url.href,{method:'GET',redirect:'error',signal:AbortSignal.timeout(5000)});
      await response.body?.cancel();
      if(!response.ok)throw Error('failed-healthcheck');
    });
  }
  return {ok:codes.length===0,codes};
}
