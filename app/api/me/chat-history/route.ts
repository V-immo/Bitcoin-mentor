import { auth } from "@/auth";
import { getDb } from "@/db/db";

type Message = { role: "user" | "assistant"; content: string };

// GET — haal chat history op voor ingelogde gebruiker
export async function GET() {
  const session = await auth();
  const userId = parseInt((session?.user as { id?: string })?.id ?? "0") || null;
  if (!userId) return Response.json({ messages: [] });

  try {
    const db = getDb();
    const row = db
      .prepare("SELECT messages FROM marcus_chat_history WHERE user_id = ?")
      .get(userId) as { messages: string } | undefined;

    const messages: Message[] = row ? JSON.parse(row.messages ?? "[]") : [];
    return Response.json({ messages });
  } catch {
    return Response.json({ messages: [] });
  }
}

// POST — sla chat history op voor ingelogde gebruiker (max 30 berichten)
export async function POST(request: Request) {
  const session = await auth();
  const userId = parseInt((session?.user as { id?: string })?.id ?? "0") || null;
  if (!userId) return Response.json({ ok: false }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const messages: Message[] = (body.messages ?? []).slice(-30);

    const db = getDb();
    db.prepare(`
      INSERT INTO marcus_chat_history (user_id, messages, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        messages = excluded.messages,
        updated_at = excluded.updated_at
    `).run(userId, JSON.stringify(messages));

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
