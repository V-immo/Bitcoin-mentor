// Migration: trade_journal tabel aanmaken
const Database = require("better-sqlite3");
const path = require("path");

const dbPath = process.env.DB_PATH || path.join(process.cwd(), "data", "bitcoin-mentor.db");
const db = new Database(dbPath);

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS trade_journal (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      date       TEXT NOT NULL,
      note       TEXT,
      emotion    INTEGER DEFAULT 3,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, date)
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_journal_user_date ON trade_journal(user_id, date)`);
  console.log("✅ trade_journal tabel aangemaakt");
} catch (e) {
  console.error("❌ Migratie mislukt:", e.message);
}

db.close();
