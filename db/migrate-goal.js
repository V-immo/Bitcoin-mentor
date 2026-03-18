// Voegt goal kolom toe aan settings tabel
// Gebruik: node db/migrate-goal.js

const path = require("path");
const dbPath = process.env.DB_PATH || path.join(__dirname, "../bitcoin-mentor.db");

let Database;
try {
  Database = require("better-sqlite3");
} catch {
  console.error("better-sqlite3 niet gevonden.");
  process.exit(1);
}

const db = new Database(dbPath);

try {
  db.prepare("ALTER TABLE settings ADD COLUMN goal REAL NOT NULL DEFAULT 0").run();
  console.log("✅ Kolom 'goal' toegevoegd aan settings tabel.");
} catch (e) {
  if (e.message.includes("duplicate column")) {
    console.log("ℹ️  Kolom 'goal' bestaat al — niets gedaan.");
  } else {
    throw e;
  }
}

db.close();
