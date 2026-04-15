import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let db: Database.Database | null = null;

function ensureSchema(database: Database.Database) {
  // Maak alle ontbrekende tabellen aan (idempotent)
  database.exec(`
    CREATE TABLE IF NOT EXISTS price_alerts (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      asset             TEXT    NOT NULL,
      condition         TEXT    NOT NULL CHECK(condition IN ('above','below')),
      target_price      REAL    NOT NULL,
      email             TEXT    NOT NULL,
      active            INTEGER NOT NULL DEFAULT 1,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      last_triggered_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_alerts_active ON price_alerts(active, asset);

    CREATE TABLE IF NOT EXISTS marcus_briefings (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT    NOT NULL UNIQUE,
      content    TEXT    NOT NULL,
      assets     TEXT,
      created_at TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trade_journal (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      date       TEXT    NOT NULL,
      note       TEXT,
      emotion    INTEGER DEFAULT 3,
      created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, date)
    );
    CREATE INDEX IF NOT EXISTS idx_journal_user_date ON trade_journal(user_id, date);

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint   TEXT    NOT NULL UNIQUE,
      p256dh     TEXT    NOT NULL,
      auth       TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

    CREATE TABLE IF NOT EXISTS quiz_pool (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      level         INTEGER NOT NULL,
      topic         TEXT    NOT NULL,
      question_json TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      times_shown   INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_quiz_pool_level ON quiz_pool(level);

    CREATE TABLE IF NOT EXISTS quiz_shown (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES quiz_pool(id) ON DELETE CASCADE,
      shown_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      correct     INTEGER,
      UNIQUE(user_id, question_id)
    );
    CREATE INDEX IF NOT EXISTS idx_quiz_shown_user ON quiz_shown(user_id, question_id);

    CREATE TABLE IF NOT EXISTS marcus_weekly_reviews (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      week_start TEXT    NOT NULL,
      review     TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, week_start)
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token      TEXT    NOT NULL UNIQUE,
      expires_at TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id             INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      trading_style       TEXT    DEFAULT '',
      risk_profile        TEXT    DEFAULT '',
      goals               TEXT    DEFAULT '',
      fears               TEXT    DEFAULT '',
      strengths           TEXT    DEFAULT '',
      weaknesses          TEXT    DEFAULT '',
      best_time_of_day    TEXT    DEFAULT '',
      worst_emotions      TEXT    DEFAULT '',
      best_emotions       TEXT    DEFAULT '',
      impulse_patterns    TEXT    DEFAULT '',
      notes               TEXT    DEFAULT '',
      updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_user_profile_user ON user_profile(user_id);

    CREATE TABLE IF NOT EXISTS trading_plan (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id             INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      rules               TEXT    DEFAULT '',
      risk_per_trade      REAL    DEFAULT 1,
      max_daily_loss      REAL    DEFAULT 3,
      max_trades_per_day  INTEGER DEFAULT 3,
      preferred_assets    TEXT    DEFAULT '',
      entry_rules         TEXT    DEFAULT '',
      exit_rules          TEXT    DEFAULT '',
      commitments         TEXT    DEFAULT '',
      created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_trading_plan_user ON trading_plan(user_id);

    CREATE TABLE IF NOT EXISTS marcus_signals (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      asset       TEXT    NOT NULL,
      symbol      TEXT    NOT NULL,
      direction   TEXT    NOT NULL DEFAULT 'long',
      entry_price REAL    NOT NULL,
      stop_loss   REAL    NOT NULL,
      target      REAL    NOT NULL,
      rsi         REAL    NOT NULL DEFAULT 50,
      score       INTEGER NOT NULL DEFAULT 0,
      trend       TEXT    DEFAULT '',
      status      TEXT    NOT NULL DEFAULT 'open',
      close_price REAL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      closed_at   TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_signals_status ON marcus_signals(status, created_at);

    CREATE TABLE IF NOT EXISTS marcus_chat_history (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      messages   TEXT    NOT NULL DEFAULT '[]',
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_chat_history_user ON marcus_chat_history(user_id);

    CREATE TABLE IF NOT EXISTS marcus_chat_sessions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      messages   TEXT    NOT NULL DEFAULT '[]',
      summary    TEXT    NOT NULL DEFAULT '',
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON marcus_chat_sessions(user_id, created_at);

    CREATE TABLE IF NOT EXISTS partner_opt_in (
      user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      opted_in   INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS partnerships (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_a     INTEGER NOT NULL,
      user_b     INTEGER NOT NULL,
      matched_at TEXT    NOT NULL DEFAULT (datetime('now')),
      status     TEXT    NOT NULL DEFAULT 'active',
      UNIQUE(user_a, user_b)
    );
    CREATE INDEX IF NOT EXISTS idx_partnerships_users ON partnerships(user_a, user_b, status);
  `);

  // Voeg ontbrekende kolommen toe aan bestaande tabellen
  type ColInfo = { name: string };
  const settingsCols = (database.pragma("table_info(settings)") as ColInfo[]).map(c => c.name);
  const usersCols = (database.pragma("table_info(users)") as ColInfo[]).map(c => c.name);

  const addCol = (table: string, col: string, def: string) => {
    const cols = table === "settings" ? settingsCols : usersCols;
    if (!cols.includes(col)) {
      database.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`).run();
    }
  };

  // settings
  addCol("settings", "preferred_currency", "TEXT NOT NULL DEFAULT 'EUR'");
  addCol("settings", "goal", "REAL DEFAULT 0");
  addCol("settings", "bitvavo_api_key", "TEXT DEFAULT ''");
  addCol("settings", "bitvavo_api_secret", "TEXT DEFAULT ''");
  addCol("settings", "binance_testnet_key", "TEXT DEFAULT ''");
  addCol("settings", "binance_testnet_secret", "TEXT DEFAULT ''");
  addCol("settings", "marcus_notes", "TEXT DEFAULT ''");
  addCol("settings", "push_subscription", "TEXT");
  addCol("settings", "alert_config", "TEXT");
  addCol("settings", "bybit_api_key", "TEXT DEFAULT ''");
  addCol("settings", "bybit_api_secret", "TEXT DEFAULT ''");
  addCol("settings", "country_code", "TEXT DEFAULT ''");
  addCol("settings", "copy_trading", "INTEGER NOT NULL DEFAULT 0");

  // users
  addCol("users", "start_capital", "REAL NOT NULL DEFAULT 10000");
  addCol("users", "totp_secret", "TEXT");
  addCol("users", "totp_enabled", "INTEGER NOT NULL DEFAULT 0");
  addCol("users", "login_streak", "INTEGER NOT NULL DEFAULT 0");
  addCol("users", "last_streak_date", "TEXT DEFAULT ''");
  addCol("users", "last_greeting_date", "TEXT DEFAULT ''");
  addCol("users", "last_evening_date", "TEXT DEFAULT ''");
  addCol("users", "premarket_count", "INTEGER NOT NULL DEFAULT 0");
}

export function getDb(): Database.Database {
  if (db) return db;
  const dbPath =
    process.env.DB_PATH ??
    path.join(process.cwd(), "data", "bitcoin-mentor.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  ensureSchema(db);
  return db;
}
