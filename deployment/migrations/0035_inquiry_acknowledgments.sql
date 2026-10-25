-- Additive only: never backfill historical inquiries or alter owner notifications.
CREATE TABLE inquiry_acknowledgments (
  inquiry_id TEXT PRIMARY KEY REFERENCES inquiries(id) ON DELETE CASCADE,
  queued_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  recipient_key TEXT NOT NULL,
  message_payload TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','accepted','failed','uncertain','suppressed','expired')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 4),
  first_attempt_at INTEGER,
  last_attempt_at INTEGER,
  next_attempt_at INTEGER NOT NULL,
  lease_until INTEGER,
  provider_id TEXT,
  reason TEXT,
  budget_total INTEGER NOT NULL DEFAULT 50 CHECK (budget_total BETWEEN 1 AND 2000),
  budget_reserve INTEGER NOT NULL DEFAULT 0 CHECK (budget_reserve >= 0 AND budget_reserve < budget_total),
  budget_daily INTEGER NOT NULL DEFAULT 10 CHECK (budget_daily BETWEEN 1 AND 20),
  CHECK (expires_at > queued_at AND expires_at <= queued_at + 82800000)
);
CREATE INDEX inquiry_acknowledgments_recovery ON inquiry_acknowledgments(status,next_attempt_at);
-- Own abuse cap, in addition to an atomic charge of the shared provider counter.
CREATE TABLE inquiry_acknowledgment_limits (
  key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX inquiry_acknowledgment_limits_expiry ON inquiry_acknowledgment_limits(expires_at);
CREATE TRIGGER inquiry_acknowledgments_immutable
BEFORE UPDATE ON inquiry_acknowledgments
WHEN NEW.inquiry_id IS NOT OLD.inquiry_id OR NEW.queued_at IS NOT OLD.queued_at
  OR NEW.expires_at IS NOT OLD.expires_at OR NEW.recipient_key IS NOT OLD.recipient_key
  OR NEW.message_payload IS NOT OLD.message_payload OR NEW.idempotency_key IS NOT OLD.idempotency_key
BEGIN SELECT RAISE(ABORT,'ack-immutable'); END;
CREATE TRIGGER inquiry_acknowledgments_terminal
BEFORE UPDATE ON inquiry_acknowledgments
WHEN OLD.status IN ('accepted','suppressed','expired')
BEGIN SELECT RAISE(ABORT,'ack-terminal'); END;
-- A deletion must not remove the fencing state while an email is in flight.
-- Recovery, not wall-clock SQL, clears stale sending states before deletion.
CREATE TRIGGER inquiry_acknowledgments_delete_guard
BEFORE DELETE ON inquiries
WHEN EXISTS (SELECT 1 FROM inquiry_acknowledgments WHERE inquiry_id=OLD.id AND status='sending')
BEGIN SELECT RAISE(ABORT,'ack-send-in-progress'); END;
-- Claim, recipient cooldown and daily attempt charge are a single SQLite write.
-- RAISE(ABORT) rolls back every trigger write and the lease/attempt mutation.
CREATE TRIGGER inquiry_acknowledgments_claim
BEFORE UPDATE ON inquiry_acknowledgments
WHEN NEW.status='sending' AND NEW.attempts=OLD.attempts+1
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM inquiry_acknowledgment_limits
    WHERE key='day:' || CAST(NEW.last_attempt_at / 86400000 AS INTEGER) AND hits>=NEW.budget_daily
  ) THEN RAISE(ABORT,'ack-daily-held') END;
  -- Ceiling = automatic allowance - ceil(automatic allowance / 5).
  -- Preserve all reserved retries plus at least 20% of automatic owner slots.
  SELECT CASE WHEN NEW.budget_total-NEW.budget_reserve<=1 OR EXISTS (
    SELECT 1 FROM rate_limits
    WHERE key='notification-quota:' || CAST(NEW.last_attempt_at / 86400000 AS INTEGER)
      AND hits >= NEW.budget_total-NEW.budget_reserve-
        CAST((NEW.budget_total-NEW.budget_reserve+4)/5 AS INTEGER)
  ) THEN RAISE(ABORT,'ack-shared-held') END;
  SELECT CASE WHEN OLD.attempts=0 AND EXISTS (
    SELECT 1 FROM inquiry_acknowledgment_limits
    WHERE key=NEW.recipient_key AND expires_at>NEW.last_attempt_at
  ) THEN RAISE(ABORT,'ack-recipient-held') END;
  INSERT INTO rate_limits(key,hits,expires_at)
    VALUES('notification-quota:' || CAST(NEW.last_attempt_at / 86400000 AS INTEGER),1,
      (CAST(NEW.last_attempt_at / 86400000 AS INTEGER)+2)*86400000)
    ON CONFLICT(key) DO UPDATE SET hits=hits+1;
  INSERT INTO inquiry_acknowledgment_limits(key,hits,expires_at)
    VALUES('day:' || CAST(NEW.last_attempt_at / 86400000 AS INTEGER),1,
      (CAST(NEW.last_attempt_at / 86400000 AS INTEGER)+2)*86400000)
    ON CONFLICT(key) DO UPDATE SET hits=hits+1;
  INSERT INTO inquiry_acknowledgment_limits(key,hits,expires_at)
    SELECT NEW.recipient_key,1,NEW.last_attempt_at+86400000 WHERE OLD.attempts=0
    ON CONFLICT(key) DO UPDATE SET hits=1,expires_at=excluded.expires_at;
END;
