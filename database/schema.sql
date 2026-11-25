CREATE TABLE IF NOT EXISTS records (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('case', 'intel', 'ticket', 'report')),
  title TEXT NOT NULL,
  author_id TEXT NOT NULL,
  closed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS record_entries (
  id BIGSERIAL PRIMARY KEY,
  record_id BIGINT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  entry_kind TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS panel_messages (
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  PRIMARY KEY (guild_id, channel_id)
);

CREATE INDEX IF NOT EXISTS records_guild_kind ON records(guild_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS record_entries_record ON record_entries(record_id, created_at DESC);
