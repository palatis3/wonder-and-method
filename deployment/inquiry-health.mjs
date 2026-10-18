import {hasInquiryFollowup,RETENTION_DAYS} from './inquiry-maintenance.mjs';
const TEN_MINUTES = 600_000;

async function hasHealthTable(db) {
  return Boolean(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='operation_health'").first());
}

export async function recordRecoverySuccess(db, now = Date.now()) {
  if (!await hasHealthTable(db)) return;
  await db.prepare("INSERT INTO operation_health (name,last_success_at) VALUES ('inquiry-recovery',?) ON CONFLICT(name) DO UPDATE SET last_success_at=excluded.last_success_at").bind(now).run();
}

// Aggregate-only operational signal. A provider acceptance is not inbox delivery.
export async function inquiryStatus(env, now = Date.now()) {
  const {results} = await env.DB.prepare('SELECT delivery_status, COUNT(*) AS total FROM inquiries GROUP BY delivery_status').all();
  const attention = await env.DB.prepare(`SELECT
    SUM(CASE WHEN delivery_status='manual_review' THEN 1 ELSE 0 END) AS manual_review,
    SUM(CASE WHEN delivery_status IN ('pending','failed','uncertain','sending') AND created_at<=? THEN 1 ELSE 0 END) AS pending_over_ten_minutes,
    MIN(CASE WHEN delivery_status IN ('pending','failed','uncertain','sending') THEN created_at END) AS oldest_pending_at
    FROM inquiries WHERE synthetic=0`).bind(now-TEN_MINUTES).first();
  const migrationReady = await hasHealthTable(env.DB);
  const heartbeat = migrationReady ? await env.DB.prepare("SELECT last_success_at FROM operation_health WHERE name='inquiry-recovery'").first() : null;
  const live = env.INQUIRY_MODE==='live' && env.RELEASE_APPROVED==='true';
  const configured = Boolean(env.RESEND_API_KEY && env.NOTIFICATION_FROM && env.NOTIFICATION_TO);
  // Production recovery runs hourly; allow fifteen minutes of scheduling margin.
  const stale = !heartbeat || now-heartbeat.last_success_at>75*60_000;
  const reasons = [];
  const retention=await hasInquiryFollowup(env.DB)?await env.DB.prepare(`SELECT
    SUM(CASE WHEN last_substantive_contact_at IS NOT NULL AND last_substantive_contact_at<=? THEN 1 ELSE 0 END) AS due,
    SUM(CASE WHEN last_substantive_contact_at IS NULL AND created_at<=? THEN 1 ELSE 0 END) AS unconfirmed_old
    FROM inquiries WHERE synthetic=0 AND is_client=0 AND retention_hold=0 AND delivery_status!='sending'`).bind(now-RETENTION_DAYS*86400_000,now-RETENTION_DAYS*86400_000).first():null;
  if (live && !configured) reasons.push('notification_configuration_missing');
  if (live && stale) reasons.push('recovery_heartbeat_missing_or_stale');
  if (attention.manual_review) reasons.push('manual_review_required');
  if (attention.pending_over_ten_minutes) reasons.push('notification_backlog');
  if(retention?.due||retention?.unconfirmed_old)reasons.push('retention_review_due');
  return {total:results.reduce((sum,row)=>sum+row.total,0),delivery:Object.fromEntries(results.map(row=>[row.delivery_status,row.total])),
    containsInquiryText:false, checked_at:now, attention:{manual_review:attention.manual_review||0,pending_over_ten_minutes:attention.pending_over_ten_minutes||0,oldest_pending_at:attention.oldest_pending_at,retention:{due:retention?.due||0,unconfirmed_old:retention?.unconfirmed_old||0}},
    health:{ok:reasons.length===0,reasons,live,notification_configured:configured,recovery:{migration_ready:migrationReady,last_success_at:heartbeat?.last_success_at??null,stale}},
    note:'Counts cover saved inquiries; provider acceptance does not prove inbox delivery. Check the owner mailbox and response obligations separately.'};
}
