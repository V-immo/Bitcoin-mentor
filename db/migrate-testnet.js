const path = require("path");
const Database = require("better-sqlite3");

const dbPath =
  process.env.DB_PATH ?? path.join(process.cwd(), "data", "bitcoin-mentor.db");
const db = new Database(dbPath);

try {
  db.exec("ALTER TABLE settings ADD COLUMN binance_testnet_key TEXT NOT NULL DEFAULT ''");
  console.log("✅ Kolom binance_testnet_key toegevoegd");
} catch (e) {
  console.log("ℹ️  binance_testnet_key bestaat al:", e.message);
}

try {
  db.exec("ALTER TABLE settings ADD COLUMN binance_testnet_secret TEXT NOT NULL DEFAULT ''");
  console.log("✅ Kolom binance_testnet_secret toegevoegd");
} catch (e) {
  console.log("ℹ️  binance_testnet_secret bestaat al:", e.message);
}

console.log("✅ Testnet migratie klaar");
