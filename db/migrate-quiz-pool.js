// Gebruik: node db/migrate-quiz-pool.js
// Maakt quiz_pool en quiz_shown tabellen aan voor quiz caching

const Database = require("better-sqlite3");
const path = require("path");

const dbPath = process.env.DB_PATH || "./data/bitcoin-mentor.db";
const db = new Database(path.resolve(dbPath));

db.exec(`
  CREATE TABLE IF NOT EXISTS quiz_pool (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    level         INTEGER NOT NULL,
    topic         TEXT    NOT NULL,
    question_json TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    times_shown   INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS quiz_shown (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES quiz_pool(id) ON DELETE CASCADE,
    shown_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    correct     INTEGER,
    UNIQUE(user_id, question_id)
  );

  CREATE INDEX IF NOT EXISTS idx_quiz_pool_level ON quiz_pool(level);
  CREATE INDEX IF NOT EXISTS idx_quiz_shown_user ON quiz_shown(user_id, question_id);
`);

const counts = db.prepare("SELECT level, COUNT(*) as n FROM quiz_pool GROUP BY level").all();
if (counts.length === 0) {
  console.log("✓ quiz_pool en quiz_shown tabellen aangemaakt (pool is leeg — run /api/quiz/generate om te vullen)");
} else {
  console.log("✓ tabellen bestaan al. Pool bevat:");
  for (const row of counts) {
    console.log(`   Level ${row.level}: ${row.n} vragen`);
  }
}

db.close();
