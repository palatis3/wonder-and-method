-- No creation-date backfill: a submission date is not the last substantive contact.
ALTER TABLE inquiries ADD COLUMN last_substantive_contact_at INTEGER
  CHECK (last_substantive_contact_at IS NULL OR last_substantive_contact_at > 0);
ALTER TABLE inquiries ADD COLUMN is_client INTEGER NOT NULL DEFAULT 0 CHECK (is_client IN (0, 1));
ALTER TABLE inquiries ADD COLUMN retention_hold INTEGER NOT NULL DEFAULT 0 CHECK (retention_hold IN (0, 1));
ALTER TABLE inquiries ADD COLUMN retention_hold_reason TEXT;
ALTER TABLE inquiries ADD COLUMN retention_hold_review_at INTEGER;
-- Freeze the exact provider request body for new attempts so retries remain idempotent.
-- Existing attempted rows retain the legacy notification format.
ALTER TABLE inquiries ADD COLUMN notification_payload TEXT;
CREATE INDEX IF NOT EXISTS inquiries_followup_due
  ON inquiries(is_client, retention_hold, last_substantive_contact_at);
