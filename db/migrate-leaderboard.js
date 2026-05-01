const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH =
  process.env.DB_PATH ||
  path.join(process.cwd(), "data", "bitcoin-mentor.db");

try {
  const db = new Database(DB_PATH);

  const userCols = db.pragma("table_info(users)").map((c) => c.name);

  if (!userCols.includes("leaderboard_opt_in")) {
    db.exec("ALTER TABLE users ADD COLUMN leaderboard_opt_in INTEGER NOT NULL DEFAULT 0");
    console.log("leaderboard_opt_in kolom toegevoegd");
  }
  if (!userCols.includes("leaderboard_display_name")) {
    db.exec("ALTER TABLE users ADD COLUMN leaderboard_display_name TEXT NOT NULL DEFAULT ''");
    console.log("leaderboard_display_name kolom toegevoegd");
  }

  db.close();
} catch (e) {
  console.error("Migratie mislukt:", e.message);
  process.exit(1);
}
