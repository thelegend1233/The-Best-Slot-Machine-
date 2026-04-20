-- Step 2: player identity.
-- Apply to remote: npx wrangler d1 execute norminton-casino-db --remote --file=migrations/0002_player.sql

-- Persistent player registry. Token is the reconnect credential.
CREATE TABLE IF NOT EXISTS player (
  token        TEXT    PRIMARY KEY,
  table_id     TEXT    NOT NULL,
  display_name TEXT    NOT NULL,
  joined_at    INTEGER NOT NULL   -- Unix ms
);

-- Track which player made each spin.
ALTER TABLE spin ADD COLUMN player_token TEXT;
