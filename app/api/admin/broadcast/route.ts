import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";

type Announcement = {
  id: number;
  title: string;
  message: string;
  target: string;
  created_by: number | null;
  created_at: string;
};

function ensureTable() {
  const db = getDb();
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
  return db;
}

export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin") {
    return Response.json({ error: "Geen toegang" }, { status: 403 });
  }

  const db = ensureTable();
  const rows = db
    .prepare("SELECT * FROM announcements ORDER BY created_at DESC LIMIT 20")
    .all() as Announcement[];

  return Response.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin") {
    return Response.json({ error: "Geen toegang" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({})) as {
    title?: string;
    message?: string;
    target?: string;
  };

  if (!body.title || !body.message) {
    return Response.json({ error: "Title en message zijn verplicht" }, { status: 400 });
  }

  const target = body.target === "pro" ? "pro" : "all";
  const adminId = parseInt((session?.user as { id?: string })?.id ?? "0");

  const db = ensureTable();
  const result = db
    .prepare("INSERT INTO announcements (title, message, target, created_by) VALUES (?, ?, ?, ?)")
    .run(body.title, body.message, target, adminId);

  return Response.json({ ok: true, id: result.lastInsertRowid });
}
