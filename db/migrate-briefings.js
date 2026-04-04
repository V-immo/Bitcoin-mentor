const path = require("path");
const Database = require("better-sqlite3");

const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "data", "bitcoin-mentor.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

const cols = db.prepare("PRAGMA table_info(marcus_briefings)").all().map(c => c.name);

if (!cols.includes("id")) {
  db.prepare(`
    CREATE TABLE marcus_briefings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      assets TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();
  console.log("✅ marcus_briefings tabel aangemaakt");
} else {
  console.log("ℹ️  marcus_briefings bestaat al");
}

db.close();
