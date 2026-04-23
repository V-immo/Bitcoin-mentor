const path = require("path");
const Database = require("better-sqlite3");

const dbPath =
  process.env.DB_PATH ?? path.join(process.cwd(), "data", "bitcoin-mentor.db");
const db = new Database(dbPath);

// Tabel: bots — één bot per strategie per gebruiker
const cols = db.pragma("table_info(bots)").map(c => c.name);

if (!cols.length) {
  db.exec(`
    CREATE TABLE bots (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      name       TEXT    NOT NULL DEFAULT '',
      strategy   TEXT    NOT NULL DEFAULT 'dca',
      config     TEXT    NOT NULL DEFAULT '{}',
      exchange   TEXT    NOT NULL DEFAULT 'bitvavo',
      symbol     TEXT    NOT NULL DEFAULT 'BTC',
      active     INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  console.log("✅ Tabel bots aangemaakt");
} else {
  console.log("ℹ️  Tabel bots bestaat al");
}

// Tabel: bot_runs — log van elke run
const runCols = db.pragma("table_info(bot_runs)").map(c => c.name);

if (!runCols.length) {
  db.exec(`
    CREATE TABLE bot_runs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id     INTEGER NOT NULL,
      user_id    INTEGER NOT NULL,
      action     TEXT    NOT NULL DEFAULT '',
      symbol     TEXT    NOT NULL DEFAULT '',
      side       TEXT    NOT NULL DEFAULT '',
      amount     REAL    NOT NULL DEFAULT 0,
      price      REAL    NOT NULL DEFAULT 0,
      status     TEXT    NOT NULL DEFAULT 'ok',
      note       TEXT    NOT NULL DEFAULT '',
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  console.log("✅ Tabel bot_runs aangemaakt");
} else {
  console.log("ℹ️  Tabel bot_runs bestaat al");
}

// Binance API key opslaan in settings (naast bitvavo)
const settingsCols = db.pragma("table_info(settings)").map(c => c.name);

if (!settingsCols.includes("binance_api_key")) {
  db.exec("ALTER TABLE settings ADD COLUMN binance_api_key TEXT NOT NULL DEFAULT ''");
  console.log("✅ Kolom binance_api_key toegevoegd");
}
if (!settingsCols.includes("binance_api_secret")) {
  db.exec("ALTER TABLE settings ADD COLUMN binance_api_secret TEXT NOT NULL DEFAULT ''");
  console.log("✅ Kolom binance_api_secret toegevoegd");
}

console.log("✅ Bots migratie klaar");
