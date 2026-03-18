import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import type { Session } from "next-auth";

function getUserId(session: Session | null): number | null {
  const id = (session?.user as { id?: string })?.id;
  return id ? parseInt(id) : null;
}

type Msg = { role: "user" | "assistant"; content: string };

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = getUserId(session);
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const asset = request.nextUrl.searchParams.get("asset") ?? "BTCUSDT";
  const db = getDb();

  const row = db
    .prepare("SELECT messages FROM chat_history WHERE user_id = ? AND asset = ?")
    .get(userId, asset) as { messages: string } | undefined;

  const messages: Msg[] = row ? JSON.parse(row.messages) : [];
  return Response.json({ messages });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  const userId = getUserId(session);
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const asset = request.nextUrl.searchParams.get("asset") ?? "BTCUSDT";
  const body = await request.json().catch(() => ({ messages: [] }));
  const messages: Msg[] = (body.messages ?? []).slice(-40); // max 40 berichten

  const db = getDb();
  db.prepare(`
    INSERT INTO chat_history (user_id, asset, messages, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, asset) DO UPDATE SET
      messages = excluded.messages,
      updated_at = excluded.updated_at
  `).run(userId, asset, JSON.stringify(messages));

  return Response.json({ ok: true });
}
