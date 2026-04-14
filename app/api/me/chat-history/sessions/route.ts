import { auth } from "@/auth";
import { getDb } from "@/db/db";

type Session = {
  id: number;
  summary: string;
  messageCount: number;
  createdAt: string;
};

// GET — lijst van gearchiveerde chat sessies
export async function GET() {
  const session = await auth();
  const userId = parseInt((session?.user as { id?: string })?.id ?? "0") || null;
  if (!userId) return Response.json({ sessions: [] });

  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT id, summary, messages, created_at
      FROM marcus_chat_sessions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(userId) as { id: number; summary: string; messages: string; created_at: string }[];

    const sessions: Session[] = rows.map(r => {
      let count = 0;
      try { count = JSON.parse(r.messages ?? "[]").length; } catch { /* */ }
      return { id: r.id, summary: r.summary, messageCount: count, createdAt: r.created_at };
    });

    return Response.json({ sessions });
  } catch {
    return Response.json({ sessions: [] });
  }
}

// GET met id param — haal volledige berichten van één sessie op
export async function POST(request: Request) {
  const session = await auth();
  const userId = parseInt((session?.user as { id?: string })?.id ?? "0") || null;
  if (!userId) return Response.json({ messages: [] }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const sessionId = body.id as number | undefined;
  if (!sessionId) return Response.json({ messages: [] }, { status: 400 });

  try {
    const db = getDb();
    const row = db.prepare(
      "SELECT messages FROM marcus_chat_sessions WHERE id = ? AND user_id = ?"
    ).get(sessionId, userId) as { messages: string } | undefined;

    if (!row) return Response.json({ messages: [] }, { status: 404 });
    return Response.json({ messages: JSON.parse(row.messages ?? "[]") });
  } catch {
    return Response.json({ messages: [] }, { status: 500 });
  }
}
