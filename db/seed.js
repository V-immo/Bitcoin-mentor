// Eenmalig uitvoeren: node db/seed.js
// Maakt het eerste admin account aan

const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");
const readline = require("readline");

const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "data", "bitcoin-mentor.db");
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log("\n🔐 Bitcoin Mentor — Admin account aanmaken\n");

  const existing = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get();
  if (existing.c > 0) {
    console.log("⚠️  Er is al een admin account. Wil je nog een admin aanmaken?");
    const confirm = await ask("   Doorgaan? (j/n): ");
    if (confirm.toLowerCase() !== "j") {
      console.log("Gestopt.");
      rl.close();
      db.close();
      return;
    }
  }

  const username = await ask("Gebruikersnaam: ");
  const email = await ask("E-mail: ");
  const password = await ask("Wachtwoord: ");

  if (!username || !email || !password) {
    console.error("❌ Alle velden zijn verplicht.");
    rl.close();
    db.close();
    return;
  }

  const hash = bcrypt.hashSync(password, 12);

  try {
    db.prepare(`
      INSERT INTO users (username, email, password_hash, role, start_capital)
      VALUES (?, ?, ?, 'admin', 10000)
    `).run(username, email, hash);

    console.log(`\n✅ Admin account aangemaakt voor: ${username}`);
    console.log("   Je kunt nu inloggen op /auth/login\n");
  } catch (err) {
    console.error("❌ Fout:", err.message);
  }

  rl.close();
  db.close();
}

main();
