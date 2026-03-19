// Draait automatisch bij elke deploy via GitHub Actions
// Maakt een admin aan als er nog geen bestaat (bijv. na verse database)
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "data", "bitcoin-mentor.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

try {
  const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (!adminExists) {
    const hash = bcrypt.hashSync("Admin123!", 12);
    db.prepare(`
      INSERT OR IGNORE INTO users (username, email, password_hash, role, start_capital)
      VALUES (?, ?, ?, 'admin', 10000)
    `).run("admin", "admin@bitcoinmentor.be", hash);
    console.log("✅ Admin aangemaakt: admin / Admin123!");
    console.log("⚠️  Verander het wachtwoord direct via het admin panel!");
  } else {
    console.log("ℹ️  Admin account bestaat al, overgeslagen.");
  }
} catch (e) {
  console.error("❌ Fout bij ensure-admin:", e.message);
}
db.close();
