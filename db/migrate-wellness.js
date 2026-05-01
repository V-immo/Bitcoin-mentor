const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH =
  process.env.DB_PATH ||
  path.join(process.cwd(), "data", "bitcoin-mentor.db");

try {
  const db = new Database(DB_PATH);

  const tblInfo = db.pragma("table_info(daily_wellness)");
  if (tblInfo.length === 0) {
    db.exec(`
      CREATE TABLE daily_wellness (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER NOT NULL,
        date         TEXT    NOT NULL,
        sleep_hours  REAL,
        stress_level INTEGER,
        energy_level INTEGER,
        mood         TEXT,
        notes        TEXT,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      )
    `);
    db.exec(`CREATE INDEX idx_wellness_user ON daily_wellness(user_id, date)`);
    console.log("daily_wellness tabel aangemaakt");
  } else {
    console.log("daily_wellness tabel bestaat al");
  }

  db.close();
} catch (e) {
  console.error("Migratie mislukt:", e.message);
  process.exit(1);
}
