// Eenmalig uitvoeren: node db/init.js
// Maakt de SQLite database aan met het volledige schema

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), "data", "bitcoin-mentor.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

console.log("✅ Database aangemaakt op:", dbPath);
console.log("   Voer nu node db/seed.js uit om het eerste admin account aan te maken.");
db.close();
