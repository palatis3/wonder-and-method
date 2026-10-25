import {saveJourneyCount,cleanJourneyCounts,journeyReportCoverage} from './journey-counts.mjs';
import {readJourneyMonths} from './journey-months.mjs';
import {createDeletionPlan,executeDeletionPlan,hasInquiryAcknowledgmentTable,acknowledgmentDeletionInProgress} from './inquiry-deletion-batch.mjs';
import {queueInquiryAcknowledgment,sendInquiryAcknowledgment,recoverInquiryAcknowledgments} from './inquiry-acknowledgment.mjs';
import {routeIndexEligible,privateRoute} from '../src/index-policy.mjs';
import { timingSafeEqual } from 'node:crypto';
import { validateInquiry,inquiryValidationMessage } from '../src/inquiry.mjs';
import {selectedInquiryContext,inquiryChoices,inquiryContextSummary} from '../src/shared.mjs';
import { inquiryResponseHtml } from '../src/inquiry-response.mjs';
import { MAX_NOTIFICATION_ATTEMPTS, NOTIFICATION_WINDOW_MS, UNSENT_NOTIFICATION_WINDOW_MS, hasInquiryFollowup, hasInquiryResolutions, inquiryRetentionPreview, followupInput, inquiryResolutionInput } from './inquiry-maintenance.mjs';
import { inquiryStatus, inquiryRetentionStatus, recordRecoverySuccess } from './inquiry-health.mjs';
import { allowInquiryRate, inquiryNetwork, refundInquiryRate } from './inquiry-rate.mjs';
import { hasInquiryQuery, prefillInquiryHtml } from '../src/inquiry-prefill.mjs';
import {publicRouteRedirect} from './public-route-canonical.mjs';
import {notificationBudget} from './notification-budget.mjs';
import {recordSubmissionFailure,acknowledgeSubmissionAttention,retentionAttentionPing,attentionResponse,submissionAttention,signalSubmissionAttention} from './approved-rerun-attention.mjs';

const encoder = new TextEncoder();
// URL-encoded Unicode needs up to nine bytes per UTF-16 code unit. The legal
// 3,000-character message plus all bounded fields fits below this hard limit.
const MAX_BODY = 40_000;
const INQUIRY_DUPLICATE_WINDOW_MS = 600_000;
const MAX_RECEIPT_CONFIRMATIONS = 10;
const LIVE = env => env.INQUIRY_MODE === 'live' && env.RELEASE_APPROVED === 'true';
function withTransportPolicy(response,request,env){
  const url=new URL(request.url);
  if(env.ENVIRONMENT==='production'&&env.RELEASE_APPROVED==='true'&&url.protocol==='https:'&&['wonderandmethod.com','www.wonderandmethod.com'].includes(url.hostname))response.headers.set('Strict-Transport-Security','max-age=31536000; includeSubDomains');
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
  const data = { message, reference, ...(reference&&typeof choices.email==='string'?{email:choices.email}:{}), ...(reference&&choices.reply_preference==='callback'?{reply_preference:'callback'}:{}), ...(reference&&choices.email_receipt==='requested'?{email_receipt:'requested'}:{}), ...(errors ? { errors } : {}), ...(service ? { service } : {}), ...selectedInquiryContext({...choices,service}), ...(typeof flags.synthetic === 'boolean' ? { synthetic: flags.synthetic } : {}) };
  if (request.headers.get('Accept')?.includes('application/json')) return Response.json(data, { status, headers });
  headers['Content-Type'] = 'text/html; charset=utf-8';
  // Native correction POSTs need a same-origin Origin; never send a cross-site referrer.
  const retry=errors?choices:flags.retry;
  if (retry) headers['Referrer-Policy'] = 'same-origin';
  headers['Content-Security-Policy'] = "default-src 'none'; style-src 'self'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";
  return new Response(inquiryResponseHtml({...data,status,retry,live:flags.live===true}), { status, headers });
}

async function unknownApiResponse(request, env) {
  const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'Content-Type': 'text/plain; charset=utf-8' };
  const html = (request.headers.get('Accept') || '').split(',').some(value =>
    /^text\/html(?:\s*;|$)/i.test(value.trim()) && !/;\s*q=0(?:\.0*)?(?:\s*;|\s*$)/i.test(value));
  if (['GET', 'HEAD'].includes(request.method) && html) {
    try {
      const page = await env.ASSETS.fetch(new Request(new URL('/404/', request.url), { method: request.method }));
      if ((page.ok || page.status === 404) && /^text\/html(?:;|$)/i.test(page.headers.get('Content-Type') || '')) {
        const resultHeaders = new Headers(page.headers);
        resultHeaders.set('Cache-Control', 'no-store');
        resultHeaders.set('Referrer-Policy', 'no-referrer');
        if (request.method === 'HEAD') await page.body?.cancel();
        return new Response(request.method === 'HEAD' ? null : page.body, { status: 404, headers: resultHeaders });
      }
      await page.body?.cancel();
    } catch { /* Missing branded assets must not turn an unknown API path into a 503. */ }
  }
  if (request.method !== 'HEAD' && request.headers.get('Accept')?.includes('application/json')) {
    return Response.json({ message: 'Not found.' }, { status: 404, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  }
  return new Response(request.method === 'HEAD' ? null : 'Not found.', { status: 404, headers });
}

function inquiryWait(retryAfter) {
  const minutes = Math.ceil(retryAfter / 60);
  if (minutes <= 90) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.ceil(retryAfter / 3600);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
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
  if (type === 'application/json') {
    const data=JSON.parse(text);
    if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('object-required');
    return data;
  }
  const fields = new URLSearchParams(text);
  for (const key of fields.keys()) if (fields.getAll(key).length !== 1) throw new Error('duplicate-field');
  return Object.fromEntries(fields);
}

// Provider acceptance is not mailbox delivery. At most one leased send per durable row.
export async function notifyInquiry(env, id, send = fetch, now = Date.now(), {ownerReviewed=false}={}) {
  if (!LIVE(env)) return { status: 'synthetic', sent: false };
  if (!env.RESEND_API_KEY || !env.NOTIFICATION_FROM || !env.NOTIFICATION_TO) return { status: 'configuration-pending', sent: false };
  const db = env.DB;
  const record = await db.prepare('SELECT * FROM inquiries WHERE id = ?').bind(id).first();
  if (!record || record.synthetic) return { status: 'not-live-record', sent: false };
  if (record.delivery_status === 'accepted') return { status: 'accepted', sent: false };
  // An owner resolution records handling outside this notification pipeline.
  // It never resets delivery history, and no later retry may send it again.
  if (await hasInquiryResolutions(db) &&
      await db.prepare('SELECT inquiry_id FROM inquiry_delivery_resolutions WHERE inquiry_id = ?').bind(id).first()) {
    return { status: 'manual_review_resolved', sent: false };
  }
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
  const budget=notificationBudget(env);
  const dailyLimit=ownerReviewed?budget.limit:budget.automaticLimit;
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

// Owner result/receipt semantics stay unchanged. An optional visitor email is
// considered only after persisted provider acceptance of the owner notification.
export async function notifyInquiryAndAcknowledge(env,id,send=fetch,now=Date.now(),{ownerReviewed=false,logger=console.error}={}){
  const owner=await notifyInquiry(env,id,send,now,{ownerReviewed});
  if(owner.status==='accepted')try{
    await queueInquiryAcknowledgment(env,id,now);
    await sendInquiryAcknowledgment(env,id,send,now);
  }catch{try{logger('inquiry_acknowledgment_failed');}catch{}}
  return owner;
}

function notificationMessage(env, id, inquiry) {
  const service = inquiryChoices.find(([value]) => value === inquiry.service)?.[1] || 'Project inquiry';
  const subjectName = String(inquiry.business || inquiry.name || '').replace(/[\r\n\u0000-\u001f]/g, ' ').slice(0, 100);
  return {
    from: env.NOTIFICATION_FROM, to: [env.NOTIFICATION_TO], reply_to: inquiry.email,
    subject: `[${inquiry.request_kind==='question'?'Question':inquiry.request_kind==='checkout'?'Proposal request':'Message'}] ${service} — ${subjectName}`,
    text: ['Website inquiry', `Reference: ${id}`, `Name: ${inquiry.name}`, `Email: ${inquiry.email}`,
      `Business: ${inquiry.business || 'Not supplied'}`, `Website: ${inquiry.website || 'Not supplied'}`,
      `Business location (visitor supplied): ${inquiry.business_location || 'Not supplied'}`,
      ...(inquiry.reply_preference==='callback'?[`Reply preference: Callback requested; email remains available.`,`Callback number (visitor supplied): ${inquiry.callback_phone}`]:[]),
      `Service: ${service}`, ...inquiryContextSummary(inquiry), `Message: ${inquiry.message}`, 'Owner: reply from the studio support mailbox. A provider acceptance is not proof of inbox delivery.'].join('\n\n')
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
  if (request.method !== 'POST') return respond(request, 405, 'Nothing was sent. Open the contact form to send your question or project details.');
  const origin = new URL(request.url).origin;
  if (request.headers.get('Origin') !== origin) return respond(request, 403, 'Please send this from the contact page on wonderandmethod.com.');
  let data;
  try { data = await parseBody(request); } catch { return respond(request, 400, 'Something in the form could not be read. Please return to the form, shorten a very long entry, or email support@wonderandmethod.com.'); }
  // Do not identify the trap field or claim that an unstored message was saved.
  if (data && typeof data === 'object' && (data._wm_note||data._faxcheck||data.company_url)) return respond(request, 422, 'Unable to accept this request. Please email support@wonderandmethod.com for help.');
  const { errors, value } = validateInquiry(data);
  if (Object.keys(errors).length) return respond(request, 422, inquiryValidationMessage(errors), null, errors, value.service, value,{live:LIVE(env)});
  const recover=(status,message,flags={})=>respond(request,status,message,null,undefined,value.service,value,{retry:value,live:LIVE(env),...flags});
  const reportFailure=code=>{if(LIVE(env))ctx.waitUntil(recordSubmissionFailure(env,code).catch(()=>{}));};
  if (!env.DB || !env.FINGERPRINT_SECRET || env.FINGERPRINT_SECRET.length < 32){reportFailure('inquiry_configuration_unavailable');return recover(503, 'Your inquiry could not be saved. Your entries are kept here. Please try again or email support@wonderandmethod.com.');}
  let failureCode='inquiry_pre_save_failed';
  try {
  const now = Date.now();
  const synthetic = !LIVE(env);
  const payload = JSON.stringify(value), syntheticFlag = synthetic ? 1 : 0;
  // Recent pre-update forms stored CRLF (and older text may use CR). Compare only
  // those message variants; never rewrite saved payloads or notification bodies.
  const duplicatePayloads=[payload,...['\r\n','\r'].map(newline=>JSON.stringify({...value,message:value.message.replaceAll('\n',newline)}))];
  const ip=request.headers.get('CF-Connecting-IP')||'local-unknown',network=inquiryNetwork(ip);
  const recent=()=>env.DB.prepare('SELECT id, created_at, delivery_status FROM inquiries WHERE created_at > ? AND payload IN (?,?,?) AND synthetic = ? ORDER BY created_at, id LIMIT 1').bind(now-INQUIRY_DUPLICATE_WINDOW_MS,...duplicatePayloads,syntheticFlag).first();
  const receiptKey=record=>fingerprint(env.FINGERPRINT_SECRET,`inquiry-receipt:${network}:${synthetic}:${record.id}`);
  const accepted=record=>respond(request,202,synthetic?'Synthetic test recorded. No email was sent and no inbox receipt is claimed.':(value.request_kind==='question'?'Thank you. Your question is saved for the studio to review. Keep this reference for your records.':value.request_kind==='checkout'?'Thank you. Your project details are saved for the studio to review. Keep this reference for your records.':'Thank you. Your message is saved for the studio to review. Keep this reference for your records.'),record.id,undefined,value.service,value,{synthetic});
  const limited=retryAfter=>recover(429,`Several requests have been sent from this connection. Please try again in about ${inquiryWait(retryAfter)}, or email support@wonderandmethod.com. Your entries are kept here.`,{retryAfter});
  const confirmedRetry=async()=>{
    if(network==='unknown')return null;
    const record=await recent();
    if(!record)return null;
    const key=await receiptKey(record);
    const receipt=await env.DB.prepare('SELECT expires_at FROM rate_limits WHERE key=? AND expires_at>?').bind(key,now).first();
    if(!receipt)return null;
    const claimed=await env.DB.prepare('UPDATE rate_limits SET hits=hits+1 WHERE key=? AND expires_at>? AND hits<? RETURNING hits').bind(key,now,MAX_RECEIPT_CONFIRMATIONS).first();
    return claimed?{record}:{retryAfter:Math.max(1,Math.ceil((receipt.expires_at-now)/1000))};
  };
  // A payload match alone is not proof of a previous send from this connection.
  // Legacy rows and another network's matches still pass the normal rate gate.
  const retry=await confirmedRetry();
  if(retry)return retry.record?accepted(retry.record):limited(retry.retryAfter);
  const rate=await allowInquiryRate(env,ip,now,fingerprint);
  if(!rate.allowed){
    // Another request may have finished while this one was checking its budget.
    const completed=await confirmedRetry();
    if(completed?.record){await refundInquiryRate(env,rate.chargedKeys);return accepted(completed.record);}
    return limited(rate.retryAfter);
  }
  const id = crypto.randomUUID();
  const dedupe = await fingerprint(env.FINGERPRINT_SECRET, `duplicate:${synthetic}:${id}`);
  // One SQLite write makes the rolling-window check and insert atomic. Comparing
  // normalized payloads also recognizes records saved by the previous release.
  failureCode='inquiry_storage_outcome_unknown';
  await env.DB.prepare(`INSERT INTO inquiries (id, created_at, payload, dedupe_key, synthetic, delivery_status)
    SELECT ?, ?, ?, ?, ?, ? WHERE NOT EXISTS
      (SELECT 1 FROM inquiries WHERE created_at > ? AND payload IN (?,?,?) AND synthetic = ?)`)
    .bind(id, now, payload, dedupe, syntheticFlag, synthetic ? 'synthetic' : 'pending', now-INQUIRY_DUPLICATE_WINDOW_MS, ...duplicatePayloads, syntheticFlag).run();
  const record=await recent();
  if (!record) throw new Error('storage-incomplete');
  failureCode='inquiry_receipt_failed';
  if (!synthetic && record.id === id) ctx.waitUntil(notifyInquiryAndAcknowledge(env, id).catch(() => { /* A persisted pending/leased row remains recoverable. */ }));
  if(network!=='unknown'){
    // Opaque, short-lived receipt; no IP or payload is stored in rate_limits.
    // Anchoring expiry to the original save prevents retries extending the window.
    const receipt=await env.DB.prepare('INSERT INTO rate_limits (key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 WHERE hits<? AND expires_at>? RETURNING hits')
      .bind(await receiptKey(record),record.created_at+INQUIRY_DUPLICATE_WINDOW_MS,MAX_RECEIPT_CONFIRMATIONS,now).first();
    if(!receipt||receipt.hits>1)await refundInquiryRate(env,rate.chargedKeys);
    if(!receipt)return limited(Math.max(1,Math.ceil((record.created_at+INQUIRY_DUPLICATE_WINDOW_MS-now)/1000)));
  }
  return accepted(record);
  } catch {
    reportFailure(failureCode);
    return recover(503,'Your request could not be confirmed as saved. Your entries are kept here; please try again or email support@wonderandmethod.com.');
  }
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
  if(url.pathname==='/api/operator/journey-months'&&request.method==='GET'){
    const months=Number(url.searchParams.get('months')||24);
    if(!Number.isInteger(months)||months<1||months>24)return respond(request,422,'Choose a reporting period from 1 to 24 calendar months.');
    const report=await readJourneyMonths(env.DB,months);
    return report?Response.json(report,{headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}}):respond(request,503,'Monthly aggregate storage is not enabled. No historical totals were inferred.');
  }
  if(url.pathname==='/api/operator/journey-summary'&&request.method==='GET'){
    const days=Number(url.searchParams.get('days')||7);
    if(!Number.isInteger(days)||days<1||days>90)return respond(request,422,'Choose a reporting period from 1 to 90 days.');
    const {since,comparisonSince,coverage}=journeyReportCoverage(days);
    const {results}=await env.DB.prepare('SELECT event,service,page,SUM(total) AS total FROM journey_counts WHERE day>=? GROUP BY event,service,page ORDER BY event,service,page').bind(since).all();
    const availableSince=comparisonSince<coverage.retainedSince?coverage.retainedSince:comparisonSince;
    const {results:daily}=await env.DB.prepare('SELECT day,event,service,page,SUM(total) AS total FROM journey_counts WHERE day>=? GROUP BY day,event,service,page ORDER BY day,event,service,page').bind(availableSince).all();
    const {results:bySource}=await env.DB.prepare("SELECT source,SUM(total) AS total FROM journey_counts WHERE day>=? AND event='page_view' GROUP BY source ORDER BY source").bind(since).all();
    const {results:arrivals}=await env.DB.prepare("SELECT page,service,source,SUM(total) AS total FROM journey_counts WHERE day>=? AND event='page_view' AND source NOT IN ('internal','not_recorded') GROUP BY page,service,source ORDER BY page,service,source").bind(since).all();
    return Response.json({days,since,comparisonSince,coverage,counts:results,daily,bySource,arrivals,note:'Aggregate event totals, not unique visitors, linked journeys or conversion rates. Arrivals exclude internal and unrecorded sources; direct includes absent referrers and can include reloads. Source categories are approximate; earlier rows have no source recorded. Coverage describes retention eligibility, not uninterrupted collection; pre-collection dates and outages are not verified. The current UTC day may be incomplete.'},{headers:{'Cache-Control':'no-store'}});
  }
  if(url.pathname==='/api/operator/journey-counts'&&request.method==='GET'){const {results}=await env.DB.prepare("SELECT day,event,service,page,source,total FROM journey_counts WHERE day>=date('now','-89 days') ORDER BY day DESC,event,service,page,source LIMIT 5000").all();return Response.json({counts:results,limit:5000,note:'Aggregate event counts, not unique visitors or linked conversions. Client-reported; bots, blockers and privacy preferences affect totals.'},{headers:{'Cache-Control':'no-store'}});}
  const base = '/api/operator/inquiries';
  if(url.pathname===`${base}/submission-failures/acknowledge`&&request.method==='POST'){
    let data;try{data=await parseBody(request);}catch{return respond(request,400,'Use a reviewed operational snapshot.');}
    return attentionResponse(await acknowledgeSubmissionAttention(env,data));
  }
  if(url.pathname===`${base}/retention/acknowledge`&&request.method==='POST'){
    let data;try{data=await parseBody(request);}catch{return respond(request,400,'Use a retention review acknowledgement.');}
    if(!data||Object.keys(data).length!==1||data.confirm!=='reviewed-retention-attention')return respond(request,422,'Confirm reviewed-retention-attention after reviewing all working copies.');
    if(!await hasInquiryFollowup(env.DB))return respond(request,503,'Inquiry follow-up migration is required.');
    await env.DB.prepare("INSERT INTO operation_health (name,last_success_at) VALUES ('inquiry-retention-reviewed',?) ON CONFLICT(name) DO UPDATE SET last_success_at=excluded.last_success_at").bind(Date.now()).run();
    return respond(request,200,'Review acknowledged. No inquiry, retention clock, hold or deletion status changed; attention remains active until the underlying records are reconciled.');
  }
  if (url.pathname === `${base}/status` && request.method === 'GET') {
    let release=null;
    try{const asset=await env.ASSETS.fetch(new Request(new URL('/version.json',url)));if(asset.ok)release=await asset.json();else await asset.body?.cancel();}catch{}
    return Response.json({...await inquiryStatus(env),runtimeVersion:env.CF_VERSION_METADATA?.id||null,release}, {headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  }
  if(url.pathname===`${base}/lookup`&&request.method==='GET'){
    const code=(url.searchParams.get('code')||'').toLowerCase().replace(/^wm-/,'').replaceAll('-','');
    if(!/^[a-f0-9]{12}$/.test(code))return respond(request,422,'Use the 12-character inquiry code.');
    const {results}=await env.DB.prepare("SELECT id FROM inquiries WHERE replace(id,'-','') LIKE ? ORDER BY id LIMIT 2").bind(code+'%').all();
    if(results.length!==1)return respond(request,results.length?409:404,results.length?'More than one record matches. Use the full reference.':'No inquiry matches that code.');
    return Response.json({reference:results[0].id},{headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  }
  if (url.pathname === `${base}/retention-preview` && request.method === 'GET') {
    const preview = await inquiryRetentionPreview(env.DB);
    return preview ? Response.json(preview, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
      : respond(request, 503, 'Inquiry follow-up migration is required. No records were changed.');
  }
  if ([`${base}/deletion-plan`,`${base}/delete-batch`].includes(url.pathname) && request.method==='POST') {
    let data;try{data=await parseBody(request);}catch{return respond(request,400,'Use a valid bounded deletion plan request.');}
    try{
      const result=url.pathname.endsWith('/deletion-plan')?await createDeletionPlan(env.DB,data):await executeDeletionPlan(env.DB,data,request.headers.get('X-Confirm-Delete-Batch'));
      return Response.json(result,{headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
    }catch(error){if([409,422,503].includes(error.status))return respond(request,error.status,error.message);throw error;}
  }
  if (url.pathname === base && request.method === 'GET') {
    const cursor = url.searchParams.get('after') || '';
    if (cursor && !/^[a-f0-9-]{36}$/.test(cursor)) return respond(request, 400, 'Invalid export cursor.');
    const query = await hasInquiryResolutions(env.DB)
      ? `SELECT i.*, r.resolved_at AS resolution_resolved_at, r.outcome AS resolution_outcome, r.evidence_reference AS resolution_evidence_reference
          FROM inquiries i LEFT JOIN inquiry_delivery_resolutions r ON r.inquiry_id=i.id WHERE i.id > ? ORDER BY i.id LIMIT 100`
      : 'SELECT * FROM inquiries WHERE id > ? ORDER BY id LIMIT 100';
    const { results } = await env.DB.prepare(query).bind(cursor).all();
    return Response.json({ records: results, next_cursor: results.length === 100 ? results.at(-1).id : null }, { headers: { 'Cache-Control': 'no-store', 'Content-Disposition': 'attachment; filename="inquiries.json"', 'X-Content-Type-Options': 'nosniff' } });
  }
  const match = url.pathname.match(/^\/api\/operator\/inquiries\/([a-f0-9-]{36})(\/(?:retry|followup|resolve))?$/);
  if (!match) return respond(request, 404, 'Unknown operator action.');
  const id = match[1];
  if (request.method === 'POST' && match[2] === '/resolve' && request.headers.get('X-Confirm-Resolve') === id) {
    if (!await hasInquiryResolutions(env.DB)) return respond(request, 503, 'Inquiry resolution migration is required. No records were changed.');
    let data;
    try { data = await parseBody(request); } catch { return respond(request, 400, 'Use valid resolution fields.'); }
    const value = inquiryResolutionInput(data);
    if (!value) return respond(request, 422, 'Supply a reviewed outcome (handled_manually, duplicate_confirmed or spam_confirmed) and a nonpersonal evidence reference of 3–80 lowercase letters, numbers, dots, hyphens or underscores.');
    const now = Date.now();
    // Eligibility and the immutable first resolution are one write. A stale
    // operator read cannot resolve a newly sending row or overwrite evidence.
    const created = await env.DB.prepare(`INSERT INTO inquiry_delivery_resolutions (inquiry_id,resolved_at,outcome,evidence_reference)
      SELECT id,?,?,? FROM inquiries
      WHERE id=? AND synthetic=0 AND delivery_status='manual_review' AND (lease_until IS NULL OR lease_until<?)
      ON CONFLICT(inquiry_id) DO NOTHING RETURNING *`).bind(now,value.outcome,value.evidence_reference,id,now).first();
    let resolution = created;
    if (!resolution) {
      const row = await env.DB.prepare('SELECT synthetic,delivery_status,lease_until FROM inquiries WHERE id=?').bind(id).first();
      if (!row) return respond(request, 404, 'Unknown inquiry reference.');
      if (row.synthetic || row.delivery_status !== 'manual_review' || (row.lease_until !== null && row.lease_until >= now)) {
        return respond(request, 409, 'Only a live manual-review record without an active delivery lease can be resolved. No inquiry was changed.');
      }
      resolution = await env.DB.prepare('SELECT * FROM inquiry_delivery_resolutions WHERE inquiry_id=?').bind(id).first();
      if (!resolution || resolution.outcome !== value.outcome || resolution.evidence_reference !== value.evidence_reference) {
        return respond(request, 409, 'No resolution recorded. Existing resolution evidence cannot be overwritten; reconcile the recorded outcome before any further action.');
      }
    }
    return Response.json({ status:'manual_review_resolved', reference:id, resolution, already_resolved:!created,
      message:'Owner resolution recorded. No notification sent; original delivery and retention records are unchanged.' },
      { headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'} });
  }
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
    const result = await notifyInquiryAndAcknowledge(env, id,fetch,Date.now(),{ownerReviewed:true});
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  }
  if (request.method === 'DELETE' && !match[2] && request.headers.get('X-Confirm-Delete') === id) {
    if (!await hasInquiryFollowup(env.DB)) return respond(request, 503, 'Inquiry follow-up migration is required. No records were changed.');
    const acknowledgmentReady=await hasInquiryAcknowledgmentTable(env.DB);
    const acknowledgmentBusy='An acknowledgment is sending. No record deleted; wait for recovery before retrying deletion.';
    if(acknowledgmentReady&&await env.DB.prepare("SELECT inquiry_id FROM inquiry_acknowledgments WHERE inquiry_id=? AND status='sending'").bind(id).first())return respond(request,409,acknowledgmentBusy,id);
    let deleted;
    try{deleted=await env.DB.prepare(`DELETE FROM inquiries WHERE id = ? AND delivery_status != 'sending' AND retention_hold = 0
      ${acknowledgmentReady?"AND NOT EXISTS (SELECT 1 FROM inquiry_acknowledgments a WHERE a.inquiry_id=inquiries.id AND a.status='sending')":''} RETURNING id`).bind(id).first();}
    catch(error){if(acknowledgmentDeletionInProgress(error))return respond(request,409,acknowledgmentBusy,id);throw error;}
    return respond(request, deleted ? 200 : 409, deleted ? 'Record deleted from active D1. Apply the approved retention policy to mailbox, exports and backups separately.' : 'No eligible record deleted. Reconcile any sending notification or acknowledgment, or preservation hold, before deletion.', id);
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
      const canonicalTarget=publicRouteRedirect(url,request.method,env.PUBLIC_ORIGIN);
      if(canonicalTarget)response=Response.redirect(canonicalTarget,308);
      else if (url.pathname.startsWith('/api/operator/')) response = await operator(request, env);
      else if (url.pathname === '/api/journey-counts') response = await saveJourneyCount(request,env,{readLimited,fingerprint});
      else if (url.pathname === '/api/inquiries') response = await submit(request, env, ctx);
      else if (url.pathname.startsWith('/api/')) response = await unknownApiResponse(request, env);
      // Internal ASSETS calls bypass this public route guard and retain the hash index.
      else if(/^(?:\/version\.json|\/assets\/asset-hashes\.json)\/?$/i.test(decodeURIComponent(url.pathname).replace(/\/{2,}/g,'/')))response=new Response(request.method==='HEAD'?null:'Not found.',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
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
      // A family wildcard can match a missing URL; errors never preload page CSS.
      if(result.status>=400||privateRoute(url.pathname)||url.pathname==='/payments/')result.headers.delete('Link');
      result.headers.set('X-Content-Type-Options', 'nosniff');
      if (!result.headers.has('Referrer-Policy')) result.headers.set('Referrer-Policy', url.pathname.startsWith('/api/') ? 'no-referrer' : 'strict-origin-when-cross-origin');
      result.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
      result.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
      const type = result.headers.get('Content-Type');
      if (/^(?:text\/(?:plain|csv|html))(?:;|$)/i.test(type || '') && !/charset=/i.test(type)) result.headers.set('Content-Type', `${type}; charset=utf-8`);
      if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/civic-sculpture/')) {
        const publicShareImage=/^\/assets\/(?:brand|social)\/[^/]+\.(?:png|jpe?g|webp|avif|svg)$/i.test(url.pathname)&&/^image\//i.test(type||'');
        result.headers.set('Cross-Origin-Resource-Policy', publicShareImage?'cross-origin':'same-origin');
        // Scope, price and worksheet documents must be revalidated even at an
        // unversioned address. Unversioned media and code retain their short cache.
        const publicDocument=/^(?:text\/(?:html|plain|csv)|application\/json)(?:;|$)/i.test(type||'')||/\.(?:html|txt|csv|json)$/i.test(url.pathname)||url.pathname.startsWith('/assets/buyer-packs/');
        if ((result.status >= 200 && result.status < 300) || result.status === 304) result.headers.set('Cache-Control',publicDocument?'no-cache':'public, max-age=3600, must-revalidate');
        // A query hash is immutable only when it names the bytes being served.
        // Old/unknown hashes on a mutable path must never pin different content.
        const version=url.searchParams.get('v');
        if(!publicDocument&&/\.(?:css|js|mjs|woff2|gif|png|jpe?g|svg|webp|avif|mp4)$/i.test(url.pathname)&&['GET','HEAD'].includes(request.method)&&[200,206,304].includes(result.status)&&/^[a-f0-9]{12}$/.test(version||'')){
          let actual=null;
          if(url.searchParams.getAll('v').length===1){
            if(/\.(?:css|js)$/i.test(url.pathname)&&request.method==='GET'&&result.status===200){
              // Preserve byte verification for the existing small code assets.
              const bytes=await result.clone().arrayBuffer();
              actual=hex(await crypto.subtle.digest('SHA-256',bytes)).slice(0,12);
            }else{
              // The manifest is generated from this deployment's final asset bytes.
              // Do not buffer films/fonts/images, or read a body for HEAD/304/ranges.
              try{
                const index=await env.ASSETS.fetch(new Request(new URL('/assets/asset-hashes.json',url),{headers:{'Accept-Encoding':'identity'}}));
                if(index.ok){
                  const hashes=await index.json();
                  if(hashes&&typeof hashes==='object'&&!Array.isArray(hashes)&&Object.hasOwn(hashes,url.pathname))actual=hashes[url.pathname];
                }else await index.body?.cancel();
              }catch{} // Older builds lack the manifest: require revalidation.
            }
          }
          result.headers.set('Cache-Control',actual===version?'public, max-age=31536000, immutable':'no-cache');
        }
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
  if(!env.DB){await signalSubmissionAttention(env,{send,logger});await retentionAttentionPing(env,null,{send});return {ok:false,codes:['scheduled_database_missing']};}
  const codes=[];
  const fail=code=>{codes.push(code);try{logger(code);}catch{}};
  const step=async(code,fn)=>{try{return await fn();}catch{fail(code);return null;}};
  const recovery=await step('scheduled_recovery_failed',()=>retryPendingInquiries(env,send,now,clock));
  if(recovery?.failed)fail('scheduled_recovery_row_failed');
  if(recovery && !recovery.failed)await step('scheduled_heartbeat_failed',()=>recordRecoverySuccess(env.DB,now));
  await step('scheduled_rate_cleanup_failed',()=>env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(now).run());
  await step('scheduled_aggregate_cleanup_failed',()=>cleanJourneyCounts(env.DB,now));
  if(env.HEALTHCHECK_URL && LIVE(env) && codes.length===0){
    const health=await step('scheduled_health_status_failed',()=>inquiryStatus(env,now,{includeAttention:false}));
    if(health && !health.health.ok)fail('scheduled_delivery_unhealthy');
    if(health?.health.ok){
      const url=await step('scheduled_healthcheck_config_invalid',async()=>{
        const value=new URL(env.HEALTHCHECK_URL);
        if(value.protocol!=='https:'||value.username||value.password)throw Error('invalid-healthcheck');
        return value;
      });
      if(url){
        let response;
        // Workers supports manual/follow; manual preserves our no-redirect rule.
        try{response=await send(url.href,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(5000)});}
        catch(error){fail(['TimeoutError','AbortError'].includes(error?.name)?'scheduled_healthcheck_timeout':'scheduled_healthcheck_transport_failed');}
        if(response){
          if(!response.ok)fail(response.status>=300&&response.status<400?'scheduled_healthcheck_redirect_rejected':({403:'scheduled_healthcheck_forbidden',404:'scheduled_healthcheck_not_found',429:'scheduled_healthcheck_rate_limited'})[response.status]||'scheduled_healthcheck_http_failed');
          // The response status is the receiver acknowledgement. Cancelling its
          // unused body frees the connection; a cleanup error cannot unsend it.
          try{await response.body?.cancel();}catch{}
        }
      }
    }
  }
  // Retention has its own check, after delivery's heartbeat decision. A due
  // review, unavailable migration or retention receiver cannot mask delivery.
  if(env.RETENTION_HEALTHCHECK_URL&&LIVE(env)){
    const status=await step('scheduled_retention_status_failed',()=>inquiryRetentionStatus(env,now));
    const attention=await retentionAttentionPing(env,status,{send});
    if(!attention.acknowledged)fail('scheduled_retention_signal_failed');
  }
  if(env.INQUIRY_SUBMISSION_HEALTHCHECK_URL&&LIVE(env)){
    const attention=await step('scheduled_submission_attention_failed',()=>submissionAttention(env.DB));
    if(!attention?.migration_ready||attention.review_required){
      const signal=await signalSubmissionAttention(env,{send,logger});
      if(!signal.acknowledged&&!signal.edge_limited)fail('scheduled_submission_signal_failed');
    }
  }
  // Run after the existing monitoring decisions: optional visitor email failures
  // cannot suppress the owner heartbeat or retention/submission attention jobs.
  // Call even when disabled so stale acknowledgment leases can be cleared.
  const acknowledgment=await step('scheduled_acknowledgment_recovery_failed',()=>recoverInquiryAcknowledgments(env,send,now,clock));
  if(acknowledgment?.failed)fail('scheduled_acknowledgment_row_failed');
  if(acknowledgment&&env.INQUIRY_ACKNOWLEDGMENT==='enabled'&&LIVE(env)&&acknowledgment.status!=='complete')fail('scheduled_acknowledgment_unavailable');
  return {ok:codes.length===0,codes};
}
