const Database = require("better-sqlite3");
const path = require("path");

const dbPath = process.env.DB_PATH || "./data/bitcoin-mentor.db";
const db = new Database(path.resolve(dbPath));

db.exec(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled INTEGER NOT NULL DEFAULT 0;
`);

// SQLite ondersteunt geen IF NOT EXISTS in ALTER TABLE — gebruik try/catch via exec
// Alternatief: pragma table_info checken
const cols = db.pragma("table_info(users)").map(c => c.name);

if (!cols.includes("totp_secret")) {
  db.exec("ALTER TABLE users ADD COLUMN totp_secret TEXT");
  console.log("✓ totp_secret kolom toegevoegd");
} else {
  console.log("✓ totp_secret kolom bestaat al");
}

if (!cols.includes("totp_enabled")) {
  db.exec("ALTER TABLE users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0");
  console.log("✓ totp_enabled kolom toegevoegd");
} else {
  console.log("✓ totp_enabled kolom bestaat al");
}

db.close();
