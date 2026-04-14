import { auth } from "@/auth";
import { getDb } from "@/db/db";

type Message = { role: "user" | "assistant"; content: string };

// POST — archiveer huidige chat en start nieuw gesprek
export async function POST() {
  const session = await auth();
  const userId = parseInt((session?.user as { id?: string })?.id ?? "0") || null;
  if (!userId) return Response.json({ ok: false }, { status: 401 });

  try {
    const db = getDb();

    // Haal huidige actieve chat op
    const row = db
      .prepare("SELECT messages FROM marcus_chat_history WHERE user_id = ?")
      .get(userId) as { messages: string } | undefined;

    const messages: Message[] = row ? JSON.parse(row.messages ?? "[]") : [];
    if (messages.length === 0) return Response.json({ ok: true, archived: false });

    // Maak een korte samenvatting (eerste user-bericht + datum)
    const firstUserMsg = messages.find(m => m.role === "user")?.content ?? "";
    const summary = firstUserMsg.slice(0, 80) + (firstUserMsg.length > 80 ? "…" : "");

    // Sla op als sessie
    db.prepare(
      "INSERT INTO marcus_chat_sessions (user_id, messages, summary) VALUES (?, ?, ?)"
    ).run(userId, JSON.stringify(messages), summary);

    // Wis actieve chat
    db.prepare(
      "UPDATE marcus_chat_history SET messages = '[]', updated_at = datetime('now') WHERE user_id = ?"
    ).run(userId);

    // Max 20 sessies bewaren per user — oudste weggooien
    db.prepare(`
      DELETE FROM marcus_chat_sessions
      WHERE user_id = ?
        AND id NOT IN (
          SELECT id FROM marcus_chat_sessions
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT 20
        )
    `).run(userId, userId);

    return Response.json({ ok: true, archived: true });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
