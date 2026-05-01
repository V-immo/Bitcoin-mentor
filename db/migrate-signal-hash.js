const Database = require("better-sqlite3");
const path = require("path");
const crypto = require("crypto");

const DB_PATH =
  process.env.DB_PATH ||
  path.join(process.cwd(), "data", "bitcoin-mentor.db");

function computeHash(sig) {
  const payload = [
    sig.id,
    sig.asset,
    sig.symbol,
    sig.direction,
    sig.entry_price,
    sig.stop_loss,
    sig.target,
    sig.rsi,
    sig.score,
    sig.trend,
    sig.created_at,
  ].join("|");
  return crypto.createHash("sha256").update(payload).digest("hex");
}

try {
  const db = new Database(DB_PATH);

  // Voeg signal_hash kolom toe indien nog niet aanwezig
  const cols = db.pragma("table_info(marcus_signals)").map((c) => c.name);
  if (!cols.includes("signal_hash")) {
    db.exec("ALTER TABLE marcus_signals ADD COLUMN signal_hash TEXT");
    console.log("signal_hash kolom toegevoegd");
  }

  // Voeg anchor_log tabel toe voor Merkle-root chain
  const tblInfo = db.pragma("table_info(signal_anchor_log)");
  if (tblInfo.length === 0) {
    db.exec(`
      CREATE TABLE signal_anchor_log (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        merkle_root TEXT    NOT NULL,
        signal_ids  TEXT    NOT NULL,
        tx_hash     TEXT,
        chain       TEXT,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("signal_anchor_log tabel aangemaakt");
  }

  // Backfill bestaande signalen zonder hash
  const rows = db
    .prepare("SELECT * FROM marcus_signals WHERE signal_hash IS NULL")
    .all();
  if (rows.length > 0) {
    const upd = db.prepare(
      "UPDATE marcus_signals SET signal_hash = ? WHERE id = ?"
    );
    for (const sig of rows) {
      upd.run(computeHash(sig), sig.id);
    }
    console.log(`${rows.length} signalen gehasht`);
  } else {
    console.log("Alle signalen hebben al een hash");
  }

  db.close();
} catch (e) {
  console.error("Migratie mislukt:", e.message);
  process.exit(1);
}
