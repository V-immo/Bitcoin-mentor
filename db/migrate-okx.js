const path = require("path");
const Database = require("better-sqlite3");

const dbPath =
  process.env.DB_PATH ?? path.join(process.cwd(), "data", "bitcoin-mentor.db");
const db = new Database(dbPath);

const columns = [
  { name: "okx_api_key",    sql: "ALTER TABLE settings ADD COLUMN okx_api_key TEXT NOT NULL DEFAULT ''" },
  { name: "okx_api_secret", sql: "ALTER TABLE settings ADD COLUMN okx_api_secret TEXT NOT NULL DEFAULT ''" },
  { name: "okx_passphrase", sql: "ALTER TABLE settings ADD COLUMN okx_passphrase TEXT NOT NULL DEFAULT ''" },
];

for (const col of columns) {
  const info = db.prepare("PRAGMA table_info(settings)").all();
  const exists = info.some(c => c.name === col.name);
  if (!exists) {
    db.exec(col.sql);
    console.log(`Kolom ${col.name} toegevoegd`);
  } else {
    console.log(`Kolom ${col.name} bestaat al`);
  }
}

console.log("OKX migratie klaar");
