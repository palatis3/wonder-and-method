-- Fixed operational codes and aggregate counts only. No inquiry references or content.
CREATE TABLE IF NOT EXISTS operation_attention (
  code TEXT PRIMARY KEY CHECK(code IN ('inquiry_configuration_unavailable','inquiry_pre_save_failed','inquiry_storage_outcome_unknown','inquiry_receipt_failed')),
  occurrences INTEGER NOT NULL DEFAULT 1 CHECK(occurrences>0),
  first_at INTEGER NOT NULL,
  last_at INTEGER NOT NULL,
  acknowledged_occurrences INTEGER NOT NULL DEFAULT 0,
  acknowledged_at INTEGER,
  last_signal_at INTEGER
);
