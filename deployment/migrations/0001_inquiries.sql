CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  payload TEXT NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  synthetic INTEGER NOT NULL CHECK (synthetic IN (0, 1)),
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('synthetic','pending','sending','accepted','failed','uncertain','manual_review')),
  provider_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  first_attempt_at INTEGER,
  lease_until INTEGER
);
CREATE INDEX IF NOT EXISTS inquiries_delivery ON inquiries(delivery_status, created_at);
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_expiry ON rate_limits(expires_at);
