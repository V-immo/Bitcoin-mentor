const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH =
  process.env.DB_PATH ||
  path.join(process.cwd(), "data", "bitcoin-mentor.db");

try {
  const db = new Database(DB_PATH);

  const tableInfo = db.pragma("table_info(learn_to_earn)");
  if (tableInfo.length === 0) {
    db.exec(`
      CREATE TABLE learn_to_earn (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL,
        amount_sats INTEGER NOT NULL,
        reason     TEXT NOT NULL,
        metadata   TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.exec(`CREATE INDEX idx_lte_user ON learn_to_earn(user_id)`);
    console.log("learn_to_earn tabel aangemaakt");
  } else {
    console.log("learn_to_earn tabel bestaat al");
  }

  db.close();
} catch (e) {
  console.error("Migratie mislukt:", e.message);
  process.exit(1);
}
