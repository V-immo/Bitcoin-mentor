// Migration: trade_journal uitbreiden met structurele reflectievelden + tags
const Database = require("better-sqlite3");
const path = require("path");

const dbPath = process.env.DB_PATH || path.join(process.cwd(), "data", "bitcoin-mentor.db");
const db = new Database(dbPath);

try {
  const cols = db.prepare("PRAGMA table_info(trade_journal)").all().map(c => c.name);

  if (!cols.includes("what_went_well")) {
    db.exec("ALTER TABLE trade_journal ADD COLUMN what_went_well TEXT");
    console.log("✅ Kolom what_went_well toegevoegd");
  }
  if (!cols.includes("what_went_wrong")) {
    db.exec("ALTER TABLE trade_journal ADD COLUMN what_went_wrong TEXT");
    console.log("✅ Kolom what_went_wrong toegevoegd");
  }
  if (!cols.includes("lessons")) {
    db.exec("ALTER TABLE trade_journal ADD COLUMN lessons TEXT");
    console.log("✅ Kolom lessons toegevoegd");
  }
  if (!cols.includes("tags")) {
    db.exec("ALTER TABLE trade_journal ADD COLUMN tags TEXT DEFAULT '[]'");
    console.log("✅ Kolom tags toegevoegd (JSON array)");
  }
  if (!cols.includes("marcus_reflection")) {
    db.exec("ALTER TABLE trade_journal ADD COLUMN marcus_reflection TEXT");
    console.log("✅ Kolom marcus_reflection toegevoegd");
  }

  console.log("✅ Journal v2 migratie klaar");
} catch (e) {
  console.error("❌ Migratie mislukt:", e.message);
}

db.close();
