// Voegt premarket_count toe aan users tabel
const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "mentor.db");
const db = new Database(DB_PATH);

function hasColumn(table, col) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some(c => c.name === col);
}

if (!hasColumn("users", "premarket_count")) {
  db.prepare("ALTER TABLE users ADD COLUMN premarket_count INTEGER NOT NULL DEFAULT 0").run();
  console.log("✓ premarket_count toegevoegd aan users");
} else {
  console.log("· premarket_count bestaat al");
}

db.close();
