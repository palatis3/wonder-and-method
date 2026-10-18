-- Bounds the rolling duplicate lookup without copying any inquiry content.
CREATE INDEX IF NOT EXISTS inquiries_created_at ON inquiries(created_at);
CREATE TABLE IF NOT EXISTS operation_health (
  name TEXT PRIMARY KEY,
  last_success_at INTEGER NOT NULL
);
