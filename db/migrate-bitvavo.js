const path = require("path");
const Database = require("better-sqlite3");

const dbPath =
  process.env.DB_PATH ?? path.join(process.cwd(), "data", "bitcoin-mentor.db");
const db = new Database(dbPath);

try {
  db.exec(
    "ALTER TABLE settings ADD COLUMN bitvavo_api_key TEXT NOT NULL DEFAULT ''"
  );
  console.log("✅ Kolom bitvavo_api_key toegevoegd");
} catch (e) {
  console.log("ℹ️  bitvavo_api_key bestaat al (of fout):", e.message);
}

try {
  db.exec(
    "ALTER TABLE settings ADD COLUMN bitvavo_api_secret TEXT NOT NULL DEFAULT ''"
  );
  console.log("✅ Kolom bitvavo_api_secret toegevoegd");
} catch (e) {
  console.log("ℹ️  bitvavo_api_secret bestaat al (of fout):", e.message);
}

console.log("✅ Bitvavo migratie klaar");
