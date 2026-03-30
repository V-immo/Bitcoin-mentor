// Migration: voeg marcus_notes toe aan settings tabel
const Database = require("better-sqlite3");
const path = require("path");

const dbPath = process.env.DB_PATH || path.join(process.cwd(), "data", "bitcoin-mentor.db");
const db = new Database(dbPath);

try {
  db.exec(`ALTER TABLE settings ADD COLUMN marcus_notes TEXT NOT NULL DEFAULT ''`);
  console.log("✅ marcus_notes kolom toegevoegd aan settings");
} catch (e) {
  if (e.message.includes("duplicate column")) {
    console.log("ℹ️  marcus_notes bestaat al — geen actie nodig");
  } else {
    console.error("❌ Migratie mislukt:", e.message);
  }
}

db.close();
