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

// Zorg dat het hoofd-admin account altijd correct is ingesteld
try {
  const OWNER_EMAIL = "amryandrea@gmail.com";
  const owner = db.prepare("SELECT id FROM users WHERE email = ?").get(OWNER_EMAIL);
  if (owner) {
    db.prepare(`
      UPDATE users SET role = 'admin', is_pro = 1, pro_until = '2099-12-31'
      WHERE email = ?
    `).run(OWNER_EMAIL);
    console.log("Admin account vastgezet: " + OWNER_EMAIL);
  }
} catch (e) {
  console.error("Fout bij owner-fix:", e.message);
}

// Maak een fallback admin aan als er helemaal geen admin bestaat
try {
  const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (!adminExists) {
    const hash = bcrypt.hashSync("Admin123!", 12);
    db.prepare(`
      INSERT OR IGNORE INTO users (username, email, password_hash, role, is_pro, pro_until, start_capital)
      VALUES (?, ?, ?, 'admin', 1, '2099-12-31', 10000)
    `).run("admin", "admin@bitcoinmentor.be", hash);
    console.log("Fallback admin aangemaakt: admin@bitcoinmentor.be / Admin123!");
  }
} catch (e) {
  console.error("Fout bij ensure-admin:", e.message);
}
db.close();
