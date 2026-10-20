-- Operational resolution is separate from provider delivery truth.
-- Existing inquiry rows, attempts, frozen requests and retention fields are untouched.
CREATE TABLE IF NOT EXISTS inquiry_delivery_resolutions (
  inquiry_id TEXT PRIMARY KEY REFERENCES inquiries(id) ON DELETE CASCADE,
  resolved_at INTEGER NOT NULL CHECK (resolved_at > 0),
  outcome TEXT NOT NULL CHECK (outcome IN ('handled_manually','duplicate_confirmed','spam_confirmed')),
  evidence_reference TEXT NOT NULL CHECK (length(evidence_reference) BETWEEN 3 AND 80)
);
