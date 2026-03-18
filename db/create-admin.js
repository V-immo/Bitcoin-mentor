// node db/create-admin.js -- maakt admin direct aan zonder interactie
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");

const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "data", "bitcoin-mentor.db");
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

const username = process.argv[2] ?? "admin";
const email    = process.argv[3] ?? "admin@btcmentor.nl";
const password = process.argv[4] ?? "Admin123!";

const hash = bcrypt.hashSync(password, 12);

try {
  db.prepare(`
    INSERT OR REPLACE INTO users (username, email, password_hash, role, start_capital)
    VALUES (?, ?, ?, 'admin', 10000)
  `).run(username, email, hash);
  console.log("✅ Admin aangemaakt:", username, "/", password);
} catch (e) {
  console.error("❌ Fout:", e.message);
}
db.close();
