import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let db: Database.Database | null = null;

function ensureColumns(database: Database.Database) {
  type ColInfo = { name: string };
  const settingsCols = (database.pragma("table_info(settings)") as ColInfo[]).map(c => c.name);
  const usersCols = (database.pragma("table_info(users)") as ColInfo[]).map(c => c.name);

  const addIfMissing = (table: string, col: string, def: string) => {
    const cols = table === "settings" ? settingsCols : usersCols;
    if (!cols.includes(col)) {
      database.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`).run();
    }
  };

  // settings kolommen
  addIfMissing("settings", "preferred_currency", "TEXT NOT NULL DEFAULT 'EUR'");
  addIfMissing("settings", "goal", "REAL DEFAULT 0");
  addIfMissing("settings", "bitvavo_api_key", "TEXT DEFAULT ''");
  addIfMissing("settings", "bitvavo_api_secret", "TEXT DEFAULT ''");
  addIfMissing("settings", "binance_testnet_key", "TEXT DEFAULT ''");
  addIfMissing("settings", "binance_testnet_secret", "TEXT DEFAULT ''");
  addIfMissing("settings", "marcus_notes", "TEXT DEFAULT ''");
  addIfMissing("settings", "push_subscription", "TEXT");
  addIfMissing("settings", "alert_config", "TEXT");

  // users kolommen
  addIfMissing("users", "start_capital", "REAL NOT NULL DEFAULT 10000");
  addIfMissing("users", "totp_secret", "TEXT");
  addIfMissing("users", "totp_enabled", "INTEGER NOT NULL DEFAULT 0");
}

export function getDb(): Database.Database {
  if (db) return db;
  const dbPath =
    process.env.DB_PATH ??
    path.join(process.cwd(), "data", "bitcoin-mentor.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  ensureColumns(db);
  return db;
}
