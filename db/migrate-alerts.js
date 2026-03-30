// Migration: maak price_alerts tabel aan
const Database = require("better-sqlite3");
const path = require("path");

const dbPath = process.env.DB_PATH || path.join(process.cwd(), "db", "mentor.db");
const db = new Database(dbPath);

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS price_alerts (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      asset            TEXT    NOT NULL,
      condition        TEXT    NOT NULL CHECK(condition IN ('above','below')),
      target_price     REAL    NOT NULL,
      email            TEXT    NOT NULL,
      active           INTEGER NOT NULL DEFAULT 1,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      last_triggered_at TEXT
    )
  `);
  console.log("✅ price_alerts tabel aangemaakt (of bestond al)");

  // Index voor snelle queries op actieve alerts
  db.exec(`CREATE INDEX IF NOT EXISTS idx_alerts_active ON price_alerts(active, asset)`);
  console.log("✅ Index idx_alerts_active aangemaakt");
} catch (e) {
  console.error("❌ Migratie mislukt:", e.message);
}

db.close();
