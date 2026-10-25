// Visitor reference email is optional and independent of durable intake/owner mail.
import {notificationBudget} from './notification-budget.mjs';
export const ACKNOWLEDGMENT_WINDOW_MS = 23 * 3600_000;
export const ACKNOWLEDGMENT_MAX_ATTEMPTS = 4;
export const ACKNOWLEDGMENT_DAILY_LIMIT = 10;
const LEASE_MS = 60_000;
const active = "('pending','sending','failed','uncertain')";
const referencePattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const emailPattern = /^[^\s<>(),;:\\"\[\]\x00-\x1f\x7f]+@[^\s<>(),;:\\"\[\]\x00-\x1f\x7f]+\.[^\s<>(),;:\\"\[\]\x00-\x1f\x7f]+$/;
const validEmail = value => typeof value === 'string' && value.length <= 254 && emailPattern.test(value);
const senderAddress = env => {
  const configured=env.NOTIFICATION_FROM;
  if(typeof configured!=='string')return null;
  const address=configured.match(/^[^<>\r\n]{0,100}<([^<>]+)>$/)?.[1]||configured;
  return validEmail(address)?address:null;
};
const result = (status, extra = {}) => ({status,sent:false,attempted:false,...extra});
const live = env => env.ENVIRONMENT === 'production' && env.RELEASE_APPROVED === 'true' && env.INQUIRY_MODE === 'live';

export function inquiryAcknowledgmentBudget(env) {
  const owner=notificationBudget(env),configured=Number(env.ACKNOWLEDGMENT_DAILY_LIMIT??ACKNOWLEDGMENT_DAILY_LIMIT);
  const dailyLimit=Number.isSafeInteger(configured)&&configured>=1&&configured<=20?configured:ACKNOWLEDGMENT_DAILY_LIMIT;
  const ownerHeadroom=Math.max(1,Math.ceil(owner.automaticLimit*0.2));
  return {...owner,dailyLimit,ownerHeadroom,sharedCeiling:Math.max(0,owner.automaticLimit-ownerHeadroom)};
}

export function inquiryAcknowledgmentConfiguration(env) {
  if (env.INQUIRY_ACKNOWLEDGMENT !== 'enabled') return 'disabled';
  if (!live(env)) return 'not-live';
  if (!env.DB || !env.RESEND_API_KEY ||
      !senderAddress(env) ||
      typeof env.FINGERPRINT_SECRET !== 'string' || env.FINGERPRINT_SECRET.length < 32) return 'configuration-pending';
  return 'ready';
}

async function schemaReady(db) {
  try {
    await db.prepare(`SELECT a.inquiry_id,a.message_payload,a.recipient_key,l.hits,i.is_client,i.retention_hold,r.outcome
      FROM inquiry_acknowledgments a LEFT JOIN inquiry_acknowledgment_limits l ON 0
      JOIN inquiries i ON i.id=a.inquiry_id LEFT JOIN inquiry_delivery_resolutions r ON r.inquiry_id=i.id LIMIT 0`).all();
    const row = await db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE type='trigger' AND name IN
      ('inquiry_acknowledgments_immutable','inquiry_acknowledgments_terminal','inquiry_acknowledgments_claim','inquiry_acknowledgments_delete_guard')`).first();
    return row?.n === 4;
  } catch { return false; }
}

async function readiness(env) {
  const config = inquiryAcknowledgmentConfiguration(env);
  if (config !== 'ready') return config;
  return await schemaReady(env.DB) ? 'ready' : 'migration-pending';
}

// SQL eligibility is repeated at insertion and lease acquisition so stale readers
// cannot bypass a newly recorded hold/resolution. No caller supplies a recipient.
const eligible = `i.synthetic=0 AND i.delivery_status='accepted' AND i.is_client=0 AND i.retention_hold=0
  AND NOT EXISTS (SELECT 1 FROM inquiry_delivery_resolutions r WHERE r.inquiry_id=i.id)
  AND json_valid(i.payload) AND json_extract(i.payload,'$.email_receipt')='requested'`;

async function recipientKey(secret, email) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const digest = await crypto.subtle.sign('HMAC',key,encoder.encode(`inquiry-acknowledgment:v1:${email.toLowerCase()}`));
  return 'recipient:' + [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}

export async function queueInquiryAcknowledgment(env,id,now=Date.now()) {
  const ready = await readiness(env);
  if (ready !== 'ready') return result(ready);
  if (!referencePattern.test(id)) return result('ineligible');
  const db = env.DB;
  const existing = await db.prepare('SELECT status FROM inquiry_acknowledgments WHERE inquiry_id=?').bind(id).first();
  if (existing) return result(existing.status);
  const record = await db.prepare(`SELECT i.payload,i.created_at FROM inquiries i WHERE i.id=? AND ${eligible}
    AND i.created_at<=? AND i.created_at>?`).bind(id,now,now-ACKNOWLEDGMENT_WINDOW_MS).first();
  if (!record) return result('ineligible');
  const payload = JSON.parse(record.payload);
  if (!validEmail(payload.email)) return result('ineligible');
  const snapshot = JSON.stringify({from:`Wonder and Method <${senderAddress(env)}>`,to:[payload.email],
    subject:'Your Wonder and Method reference',
    text:`Wonder and Method\n\nYour inquiry has been saved for the studio to review.\n\nReference: ${id}\n\nKeep this reference for your records.`});
  const key = await recipientKey(env.FINGERPRINT_SECRET,payload.email);
  const queued = await db.prepare(`INSERT INTO inquiry_acknowledgments
    (inquiry_id,queued_at,expires_at,recipient_key,message_payload,idempotency_key,next_attempt_at)
    SELECT i.id,?,?,?,?,?,? FROM inquiries i WHERE i.id=? AND ${eligible}
      AND i.payload=? AND i.created_at<=? AND i.created_at>?
    ON CONFLICT(inquiry_id) DO NOTHING RETURNING status`)
    .bind(now,record.created_at+ACKNOWLEDGMENT_WINDOW_MS,key,snapshot,`inquiry-acknowledgment/v1/${id}`,now,id,record.payload,now,now-ACKNOWLEDGMENT_WINDOW_MS).first();
  return result(queued ? 'pending' : 'busy-or-ineligible');
}

async function providerResult(response) {
  if (!response.ok) { await response.body?.cancel(); return {status:'failed',providerId:null}; }
  if (!response.body) return {status:'uncertain',providerId:null};
  const reader = response.body.getReader();
  let size=0; const chunks=[];
  try {
    while (true) {
      const {done,value}=await reader.read(); if(done)break;
      size+=value.byteLength;
      if(size>4096) { await reader.cancel(); return {status:'uncertain',providerId:null}; }
      chunks.push(value);
    }
    const bytes=new Uint8Array(size);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    const data=JSON.parse(new TextDecoder().decode(bytes));
    return typeof data.id==='string' && data.id.length>0 && data.id.length<=200
      ? {status:'accepted',providerId:data.id} : {status:'uncertain',providerId:null};
  } finally { reader.releaseLock(); }
}

export async function sendInquiryAcknowledgment(env,id,send=fetch,now=Date.now()) {
  const ready = await readiness(env);
  if (ready !== 'ready') return result(ready);
  const db=env.DB;
  // Never change terminal records or revoke an active lease.
  await db.prepare(`UPDATE inquiry_acknowledgments SET status='suppressed',reason='ineligible',lease_until=NULL
    WHERE inquiry_id=? AND status IN ${active} AND (lease_until IS NULL OR lease_until<?)
    AND NOT EXISTS (SELECT 1 FROM inquiries i WHERE i.id=inquiry_id AND ${eligible})`).bind(id,now).run();
  await db.prepare(`UPDATE inquiry_acknowledgments SET status='expired',reason='retry-bound',lease_until=NULL
    WHERE inquiry_id=? AND status IN ${active} AND (lease_until IS NULL OR lease_until<?)
      AND (expires_at<=? OR attempts>=?)`).bind(id,now,now,ACKNOWLEDGMENT_MAX_ATTEMPTS).run();
  const record=await db.prepare('SELECT * FROM inquiry_acknowledgments WHERE inquiry_id=?').bind(id).first();
  if(!record)return result('not-queued');
  if(['accepted','suppressed','expired'].includes(record.status))return result(record.status);
  let leased;
  const budget=inquiryAcknowledgmentBudget(env);
  try {
    leased=await db.prepare(`UPDATE inquiry_acknowledgments SET status='sending',attempts=attempts+1,
      first_attempt_at=COALESCE(first_attempt_at,?),last_attempt_at=?,lease_until=?,reason=NULL,
      budget_total=?,budget_reserve=?,budget_daily=?
      WHERE inquiry_id=? AND status IN ${active} AND attempts=? AND attempts<? AND expires_at>?
        AND next_attempt_at<=? AND (lease_until IS NULL OR lease_until<?)
        AND EXISTS (SELECT 1 FROM inquiries i WHERE i.id=inquiry_id AND ${eligible}) RETURNING *`)
      .bind(now,now,now+LEASE_MS,budget.limit,budget.reserve,budget.dailyLimit,id,record.attempts,ACKNOWLEDGMENT_MAX_ATTEMPTS,now,now,now).first();
  } catch(error) {
    // These fixed SQLite errors contain no provider or visitor text.
    const held=String(error.message).includes('ack-daily-held')?'daily-budget-held':
      String(error.message).includes('ack-shared-held')?'shared-budget-held':null;
    if(held) {
      await db.prepare(`UPDATE inquiry_acknowledgments SET reason=? WHERE inquiry_id=? AND status IN ${active}
        AND attempts=? AND (lease_until IS NULL OR lease_until<?)`).bind(held,id,record.attempts,now).run();
      return result(held);
    }
    if(String(error.message).includes('ack-recipient-held')) {
      await db.prepare(`UPDATE inquiry_acknowledgments SET status='suppressed',reason='recipient-cooldown'
        WHERE inquiry_id=? AND status IN ${active} AND attempts=0 AND lease_until IS NULL`).bind(id).run();
      return result('recipient-cooldown');
    }
    throw error;
  }
  if(!leased)return result('busy-or-ineligible');
  let outcome={status:'uncertain',providerId:null};
  try {
    outcome=await providerResult(await send('https://api.resend.com/emails',{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),
      headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':leased.idempotency_key},
      body:leased.message_payload
    }));
  } catch { /* Only aggregate durable state; never log email, response or errors. */ }
  const next=now+120_000*2**(leased.attempts-1);
  const completed=await db.prepare(`UPDATE inquiry_acknowledgments SET status=?,provider_id=?,lease_until=NULL,next_attempt_at=?
    WHERE inquiry_id=? AND status='sending' AND attempts=? AND lease_until=? RETURNING status`)
    .bind(outcome.status,outcome.providerId,next,id,leased.attempts,leased.lease_until).first();
  if(!completed) {
    const current=await db.prepare('SELECT status FROM inquiry_acknowledgments WHERE inquiry_id=?').bind(id).first();
    return result(current?.status||'not-queued',{staleAttempt:true,attempted:true});
  }
  return result(outcome.status,{sent:outcome.status==='accepted',attempted:true});
}

export async function recoverInquiryAcknowledgments(env,send=fetch,now=Date.now(),clock=()=>now) {
  // Disabling email must still permit stale leases to become deletable. This
  // maintenance never queues, sends, changes owner rows or revokes a live lease.
  if(env.DB && await schemaReady(env.DB)) {
    await env.DB.prepare(`UPDATE inquiry_acknowledgments SET status=CASE
        WHEN NOT EXISTS (SELECT 1 FROM inquiries i WHERE i.id=inquiry_id AND ${eligible}) THEN 'suppressed'
        WHEN expires_at<=? OR attempts>=? THEN 'expired' ELSE 'uncertain' END,
        reason='stale-lease-recovered',lease_until=NULL
      WHERE status='sending' AND lease_until<?`).bind(now,ACKNOWLEDGMENT_MAX_ATTEMPTS,now).run();
  }
  const ready=await readiness(env);
  if(ready!=='ready')return {status:ready,queued:0,attempted:0,failed:0};
  const db=env.DB;
  let queued=0,attempted=0,failed=0;
  // Recover only recent explicit requests; never enroll unmarked history.
  const candidates=await db.prepare(`SELECT i.id FROM inquiries i WHERE ${eligible} AND i.created_at<=? AND i.created_at>?
    AND NOT EXISTS (SELECT 1 FROM inquiry_acknowledgments a WHERE a.inquiry_id=i.id)
    ORDER BY i.created_at,i.id LIMIT 20`).bind(now,now-ACKNOWLEDGMENT_WINDOW_MS).all();
  for(const {id} of candidates.results) {
    try { if((await queueInquiryAcknowledgment(env,id,clock())).status==='pending')queued++; } catch {failed++;}
  }
  const pending=await db.prepare(`SELECT inquiry_id FROM inquiry_acknowledgments WHERE status IN ${active}
    AND (lease_until IS NULL OR lease_until<?) AND (next_attempt_at<=? OR expires_at<=? OR attempts>=?)
    ORDER BY next_attempt_at,inquiry_id LIMIT 20`).bind(now,now,now,ACKNOWLEDGMENT_MAX_ATTEMPTS).all();
  for(const {inquiry_id:id} of pending.results) {
    try {
      const outcome=await sendInquiryAcknowledgment(env,id,send,clock());
      if(outcome.attempted)attempted++;
      if(['failed','uncertain'].includes(outcome.status))failed++;
    } catch {failed++;}
  }
  await db.prepare('DELETE FROM inquiry_acknowledgment_limits WHERE expires_at<=?').bind(now).run();
  return {status:'complete',queued,attempted,failed};
}

export async function inquiryAcknowledgmentStatus(env,now=Date.now()) {
  const configuration=inquiryAcknowledgmentConfiguration(env);
  if(!env.DB||!await schemaReady(env.DB))return {configuration,migrationReady:false,containsInquiryText:false};
  const rows=await env.DB.prepare('SELECT status,COUNT(*) AS count FROM inquiry_acknowledgments GROUP BY status').all();
  const counts=Object.fromEntries(rows.results.map(row=>[row.status,row.count]));
  const attention=await env.DB.prepare(`SELECT COUNT(*) AS count FROM inquiry_acknowledgments
    WHERE status IN ('failed','uncertain','expired') OR (status IN ('pending','sending') AND queued_at<=?)`).bind(now-600_000).first();
  const quota=await env.DB.prepare('SELECT hits FROM inquiry_acknowledgment_limits WHERE key=?').bind(`day:${Math.floor(now/86400_000)}`).first();
  const cooldown=await env.DB.prepare("SELECT COUNT(*) AS count FROM inquiry_acknowledgments WHERE status='suppressed' AND reason='recipient-cooldown'").first();
  const held=await env.DB.prepare(`SELECT COUNT(*) AS count FROM inquiry_acknowledgments
    WHERE status IN ${active} AND reason IN ('daily-budget-held','shared-budget-held')`).first();
  const shared=await env.DB.prepare('SELECT hits FROM rate_limits WHERE key=?').bind(`notification-quota:${Math.floor(now/86400_000)}`).first();
  const budget=inquiryAcknowledgmentBudget(env);
  return {configuration,migrationReady:true,counts,attention:attention.count,budgetHeld:held.count,recipientCooldown:cooldown.count,
    dailyAttempts:quota?.hits||0,sharedAttempts:shared?.hits||0,budget,containsInquiryText:false};
}
