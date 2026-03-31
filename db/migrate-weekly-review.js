const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(process.cwd(), "data", "bitcoin-mentor.db"));

db.prepare(`
  CREATE TABLE IF NOT EXISTS marcus_weekly_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    week_start TEXT NOT NULL,
    review TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, week_start)
  )
`).run();

console.log("✓ marcus_weekly_reviews tabel aangemaakt");
db.close();
