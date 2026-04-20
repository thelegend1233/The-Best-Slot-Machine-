-- Append-only spin log. Never UPDATE or DELETE rows — immutability is
-- what makes the audit trail useful for real-money dispute resolution.
--
-- Apply to remote:  wrangler d1 execute norminton-casino-db --file=migrations/0001_spin_log.sql
-- Apply to local:   wrangler d1 execute norminton-casino-db --local --file=migrations/0001_spin_log.sql

CREATE TABLE IF NOT EXISTS spin (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  table_id        TEXT    NOT NULL,           -- DO name ("default" in step 1d, table code later)
  ts              INTEGER NOT NULL,           -- Unix milliseconds (server time)
  bet             REAL    NOT NULL,
  grid_json       TEXT    NOT NULL,           -- JSON: [[r0c0,r0c1,r0c2], ..., [r4c0,r4c1,r4c2]]
  total_win       REAL    NOT NULL,
  scatter_count   INTEGER NOT NULL,
  bonus_triggered INTEGER NOT NULL,           -- 0 or 1
  rng_commit      TEXT    NOT NULL,           -- SHA-256 of preimage (sent before spin)
  rng_reveal      TEXT    NOT NULL,           -- preimage hex (revealed after spin)
  prev_spin_hash  TEXT,                       -- NULL for the first spin in a table
  this_spin_hash  TEXT    NOT NULL            -- SHA-256(reveal | grid_json | prev_spin_hash)
);

-- Index for pulling a player's session history quickly once player_id is added (step 2).
CREATE INDEX IF NOT EXISTS spin_table_ts ON spin (table_id, ts);
