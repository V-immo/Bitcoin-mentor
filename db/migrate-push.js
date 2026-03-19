const Database = require("better-sqlite3");
const path = require("path");

const dbPath = process.env.DB_PATH || "./data/bitcoin-mentor.db";
const db = new Database(path.resolve(dbPath));

db.exec(`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint    TEXT NOT NULL UNIQUE,
    p256dh      TEXT NOT NULL,
    auth        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
`);

console.log("✓ push_subscriptions tabel aangemaakt");
db.close();
