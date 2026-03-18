// Wis last_login_at voor alle gebruikers zodat testers schoon starten
// Gebruik: node db/clear-login-dates.js

const path = require("path");
const dbPath = process.env.DB_PATH || path.join(__dirname, "../bitcoin-mentor.db");

let Database;
try {
  Database = require("better-sqlite3");
} catch {
  console.error("better-sqlite3 niet gevonden. Draai dit script in de app map.");
  process.exit(1);
}

const db = new Database(dbPath);

const result = db.prepare("UPDATE users SET last_login_at = NULL").run();
console.log(`✅ last_login_at gewist voor ${result.changes} gebruiker(s).`);
db.close();
