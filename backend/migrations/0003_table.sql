-- Step 3: table lifecycle.
-- Apply: npx wrangler d1 execute norminton-casino-db --remote --file=migrations/0003_table.sql

CREATE TABLE IF NOT EXISTS game_table (
  code       TEXT    PRIMARY KEY,
  host_token TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'open',   -- open / closed
  buy_in     REAL    NOT NULL,
  created_at INTEGER NOT NULL
);
