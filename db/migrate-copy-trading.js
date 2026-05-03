const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH =
  process.env.DB_PATH ||
  path.join(process.cwd(), "data", "bitcoin-mentor.db");

try {
  const db = new Database(DB_PATH);

  // Settings: extra kolommen voor copy trading configuratie
  const settingsCols = db.pragma("table_info(settings)").map((c) => c.name);
  if (!settingsCols.includes("copy_exchange")) {
    db.exec("ALTER TABLE settings ADD COLUMN copy_exchange TEXT NOT NULL DEFAULT 'none'");
    console.log("copy_exchange kolom toegevoegd");
  }
  if (!settingsCols.includes("copy_size_usdt")) {
    db.exec("ALTER TABLE settings ADD COLUMN copy_size_usdt REAL NOT NULL DEFAULT 100");
    console.log("copy_size_usdt kolom toegevoegd");
  }
  if (!settingsCols.includes("copy_max_open")) {
    db.exec("ALTER TABLE settings ADD COLUMN copy_max_open INTEGER NOT NULL DEFAULT 3");
    console.log("copy_max_open kolom toegevoegd");
  }

  // copy_trades log tabel
  const tblInfo = db.pragma("table_info(copy_trades)");
  if (tblInfo.length === 0) {
    db.exec(`
      CREATE TABLE copy_trades (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id        INTEGER NOT NULL,
        signal_id      INTEGER NOT NULL,
        exchange       TEXT    NOT NULL,
        symbol         TEXT    NOT NULL,
        asset          TEXT    NOT NULL,
        size_usdt      REAL    NOT NULL,
        entry_price    REAL,
        close_price    REAL,
        est_qty        REAL,
        open_order_id  TEXT,
        close_order_id TEXT,
        status         TEXT    NOT NULL DEFAULT 'open',
        error_msg      TEXT,
        opened_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at      DATETIME
      )
    `);
    db.exec(`CREATE INDEX idx_copy_trades_user ON copy_trades(user_id)`);
    db.exec(`CREATE INDEX idx_copy_trades_signal ON copy_trades(signal_id)`);
    console.log("copy_trades tabel aangemaakt");
  } else {
    console.log("copy_trades tabel bestaat al");
  }

  db.close();
} catch (e) {
  console.error("Migratie mislukt:", e.message);
  process.exit(1);
}
