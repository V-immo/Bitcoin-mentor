import { auth } from "@/auth";
import { getDb } from "@/db/db";

type Announcement = {
  id: number;
  title: string;
  message: string;
  target: string;
  created_at: string;
};

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const userId = parseInt((session.user as { id?: string }).id ?? "0");
  const db = getDb();

  // Ensure table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL,
      message    TEXT    NOT NULL,
      target     TEXT    NOT NULL DEFAULT 'all',
      created_by INTEGER,
      created_at TEXT    DEFAULT (datetime('now'))
    )
  `);

  // Check if user is PRO
  const user = db
    .prepare("SELECT is_pro, pro_until FROM users WHERE id = ?")
    .get(userId) as { is_pro: number; pro_until: string } | undefined;

  const today = new Date().toISOString().slice(0, 10);
  const isPro =
    user?.is_pro === 1 &&
    (user?.pro_until == null ||
      user?.pro_until === "" ||
      user?.pro_until >= today);

  const rows = isPro
    ? (db
        .prepare(
          "SELECT id, title, message, target, created_at FROM announcements ORDER BY created_at DESC LIMIT 5"
        )
        .all() as Announcement[])
    : (db
        .prepare(
          "SELECT id, title, message, target, created_at FROM announcements WHERE target = 'all' ORDER BY created_at DESC LIMIT 5"
        )
        .all() as Announcement[]);

  return Response.json(rows);
}
