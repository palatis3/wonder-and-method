export const MAX_NOTIFICATION_ATTEMPTS = 5;
export const NOTIFICATION_WINDOW_MS = 22 * 60 * 60 * 1000;
export const RETENTION_DAYS = 90;

export async function hasInquiryFollowup(db) {
  const { results } = await db.prepare('PRAGMA table_info(inquiries)').all();
  const names = new Set(results.map(column => column.name));
  return ['last_substantive_contact_at', 'is_client', 'retention_hold', 'retention_hold_reason', 'retention_hold_review_at', 'notification_payload']
    .every(name => names.has(name));
}

// Dry run only. Unknown last-contact dates require operator reconciliation;
// they are never inferred from created_at, and no customer row is deleted here.
export async function inquiryRetentionPreview(db, now = Date.now()) {
  if (!await hasInquiryFollowup(db)) return null;
  const cutoff = now - RETENTION_DAYS * 86400_000;
  const { results } = await db.prepare(`
    SELECT id, last_substantive_contact_at,
      last_substantive_contact_at + ? AS retention_due_at, delivery_status
    FROM inquiries
    WHERE synthetic = 0 AND is_client = 0 AND retention_hold = 0
      AND last_substantive_contact_at IS NOT NULL AND last_substantive_contact_at <= ?
      AND delivery_status != 'sending'
    ORDER BY last_substantive_contact_at, id LIMIT 100
  `).bind(RETENTION_DAYS * 86400_000, cutoff).all();
  const unknown = await db.prepare(`
    SELECT count(*) AS total FROM inquiries
    WHERE synthetic = 0 AND last_substantive_contact_at IS NULL
  `).first();
  const holds=await db.prepare('SELECT id,retention_hold_review_at FROM inquiries WHERE synthetic=0 AND retention_hold=1 AND (retention_hold_review_at IS NULL OR retention_hold_review_at<=?) ORDER BY retention_hold_review_at,id LIMIT 100').bind(now).all();
  return {
    dry_run: true, retention_days: RETENTION_DAYS, due: results, limit: 100,
    unknown_last_contact: unknown.total,
    holds_needing_review: holds.results,
    note: 'No records deleted. Reconcile substantive contact, client/hold status and mailbox, exports and backups before any existing confirmed manual deletion action.'
  };
}

export function followupInput(data, createdAt, now = Date.now()) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const required = ['last_substantive_contact_at', 'is_client', 'retention_hold'];
  const allowed = [...required,'retention_hold_reason','retention_hold_review_at'];
  if (Object.keys(data).some(key => !allowed.includes(key)) || !required.every(key => Object.hasOwn(data, key))) return null;
  const contact = data.last_substantive_contact_at;
  if (contact !== null && (!Number.isSafeInteger(contact) || contact < createdAt || contact > now)) return null;
  if (typeof data.is_client !== 'boolean' || typeof data.retention_hold !== 'boolean') return null;
  const reason=typeof data.retention_hold_reason==='string'?data.retention_hold_reason.trim():null;
  const review=data.retention_hold_review_at;
  if(data.retention_hold&&(!reason||reason.length>500||/[\u0000-\u001f]/.test(reason)||!Number.isSafeInteger(review)||review<=now||review>now+366*86400_000))return null;
  return { contact, client: data.is_client ? 1 : 0, hold: data.retention_hold ? 1 : 0, reason:data.retention_hold?reason:null, review:data.retention_hold?review:null };
}
