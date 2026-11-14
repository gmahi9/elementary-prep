CREATE TABLE IF NOT EXISTS users (
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS progress (
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);
