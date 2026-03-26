CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'user',
  start_capital REAL    NOT NULL DEFAULT 10000,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS paper_trading (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset            TEXT    NOT NULL DEFAULT 'BTCUSDT',
  cash             REAL    NOT NULL DEFAULT 10000,
  position         TEXT,
  history          TEXT    NOT NULL DEFAULT '[]',
  starting_balance REAL    NOT NULL DEFAULT 10000,
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, asset)
);

CREATE TABLE IF NOT EXISTS quiz_progress (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  level          INTEGER NOT NULL DEFAULT 1,
  xp             INTEGER NOT NULL DEFAULT 0,
  streak         INTEGER NOT NULL DEFAULT 0,
  last_quiz_date TEXT    NOT NULL DEFAULT '',
  weak_topics    TEXT    NOT NULL DEFAULT '[]',
  history        TEXT    NOT NULL DEFAULT '[]',
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  trading_mode     TEXT    NOT NULL DEFAULT 'swing',
  risk_level       TEXT    NOT NULL DEFAULT 'medium',
  start_capital    REAL    NOT NULL DEFAULT 10000,
  preferred_assets TEXT    NOT NULL DEFAULT '["BTCUSDT","ETHUSDT"]',
  ai_language      TEXT    NOT NULL DEFAULT 'nl',
  marcus_notes     TEXT    NOT NULL DEFAULT '',
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset      TEXT    NOT NULL,
  messages   TEXT    NOT NULL DEFAULT '[]',
  updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, asset)
);

CREATE TABLE IF NOT EXISTS admin_notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_id   INTEGER NOT NULL REFERENCES users(id),
  note       TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trading_knowledge (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  topic   TEXT    NOT NULL,
  tags    TEXT    NOT NULL,
  source  TEXT    NOT NULL,
  lesson  TEXT    NOT NULL,
  level   INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_paper_user      ON paper_trading(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_user_asset ON chat_history(user_id, asset);
