export const MAX_NOTIFICATION_ATTEMPTS = 5;
export const NOTIFICATION_WINDOW_MS = 22 * 60 * 60 * 1000;
// A quota hold is not a provider attempt. Allow a bounded next-day recovery.
export const UNSENT_NOTIFICATION_WINDOW_MS = 48 * 60 * 60 * 1000;
export const RETENTION_DAYS = 90;
// Weekly owner review needs a margin before the actual deletion deadline.
export const RETENTION_REVIEW_DAYS = 80;

export async function hasInquiryResolutions(db) {
  return Boolean(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='inquiry_delivery_resolutions'").first());
}

export function inquiryResolutionInput(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      Object.keys(data).length !== 2 || !Object.hasOwn(data, 'outcome') || !Object.hasOwn(data, 'evidence_reference')) return null;
  if (!['handled_manually', 'duplicate_confirmed', 'spam_confirmed'].includes(data.outcome) ||
      typeof data.evidence_reference !== 'string' || !/^[a-z0-9][a-z0-9._-]{2,79}$/.test(data.evidence_reference)) return null;
  return { outcome: data.outcome, evidence_reference: data.evidence_reference };
}

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
  const reviewCutoff = now - RETENTION_REVIEW_DAYS * 86400_000;
  const { results } = await db.prepare(`
    SELECT id, last_substantive_contact_at,
      last_substantive_contact_at + ? AS retention_due_at, delivery_status
    FROM inquiries
    WHERE synthetic = 0 AND is_client = 0 AND retention_hold = 0
      AND last_substantive_contact_at IS NOT NULL AND last_substantive_contact_at <= ?
      AND delivery_status != 'sending'
    ORDER BY last_substantive_contact_at, id LIMIT 100
  `).bind(RETENTION_DAYS * 86400_000, cutoff).all();
  const upcoming = await db.prepare(`
    SELECT id, last_substantive_contact_at,
      last_substantive_contact_at + ? AS retention_due_at, delivery_status
    FROM inquiries
    WHERE synthetic = 0 AND is_client = 0 AND retention_hold = 0
      AND last_substantive_contact_at > ? AND last_substantive_contact_at <= ?
      AND delivery_status != 'sending'
    ORDER BY last_substantive_contact_at, id LIMIT 100
  `).bind(RETENTION_DAYS * 86400_000, cutoff, reviewCutoff).all();
  const unknown = await db.prepare(`
    SELECT count(*) AS total FROM inquiries
    WHERE synthetic = 0 AND last_substantive_contact_at IS NULL
  `).first();
  const holds=await db.prepare('SELECT id,retention_hold_review_at FROM inquiries WHERE synthetic=0 AND retention_hold=1 AND (retention_hold_review_at IS NULL OR retention_hold_review_at<=?) ORDER BY retention_hold_review_at,id LIMIT 100').bind(now).all();
  const unconfirmed=await db.prepare(`SELECT id,created_at,delivery_status FROM inquiries
    WHERE synthetic=0 AND is_client=0 AND retention_hold=0 AND delivery_status!='sending'
      AND last_substantive_contact_at IS NULL AND created_at<=?
    ORDER BY created_at,id LIMIT 100`).bind(cutoff).all();
  const unconfirmedUpcoming=await db.prepare(`SELECT id,created_at,delivery_status FROM inquiries
    WHERE synthetic=0 AND is_client=0 AND retention_hold=0 AND delivery_status!='sending'
      AND last_substantive_contact_at IS NULL AND created_at>? AND created_at<=?
    ORDER BY created_at,id LIMIT 100`).bind(cutoff,reviewCutoff).all();
  return {
    dry_run: true, retention_days: RETENTION_DAYS, review_starts_after_days: RETENTION_REVIEW_DAYS,
    due: results, upcoming: upcoming.results, limit: 100,
    unknown_last_contact: unknown.total,
    holds_needing_review: holds.results,
    unconfirmed_old_needing_review: unconfirmed.results,
    unconfirmed_upcoming_needing_review: unconfirmedUpcoming.results,
    note: 'No records deleted. Advance review starts at day 80; the working-copy deadline remains day 90 after actual last substantive contact. Unknown contact dates require reconciliation, not a creation-date fallback. Reconcile client/hold status and mailbox, exports and backups before any existing confirmed manual deletion action.'
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
