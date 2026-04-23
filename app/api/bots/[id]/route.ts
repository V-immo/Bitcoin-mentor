import { auth } from "@/auth";
import { getDb } from "@/db/db";

type Bot = {
  id: number;
  user_id: number;
  name: string;
  strategy: string;
  config: string;
  exchange: string;
  symbol: string;
  active: number;
};

// PATCH /api/bots/[id] — bot updaten (naam, config, active toggle)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return Response.json({ error: "Geen userId" }, { status: 400 });

  const { id } = await params;
  const db = getDb();
  const bot = db.prepare("SELECT * FROM bots WHERE id = ? AND user_id = ?").get(parseInt(id), parseInt(userId)) as Bot | undefined;
  if (!bot) return Response.json({ error: "Bot niet gevonden" }, { status: 404 });

  const body = await request.json() as { name?: string; config?: Record<string, unknown>; active?: boolean; symbol?: string };

  const name    = body.name    ?? bot.name;
  const config  = body.config  !== undefined ? JSON.stringify(body.config) : bot.config;
  const active  = body.active  !== undefined ? (body.active ? 1 : 0) : bot.active;
  const symbol  = body.symbol  ?? bot.symbol;

  db.prepare(
    "UPDATE bots SET name = ?, config = ?, active = ?, symbol = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(name, config, active, symbol, parseInt(id));

  return Response.json({ ok: true });
}

// DELETE /api/bots/[id] — bot verwijderen
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return Response.json({ error: "Geen userId" }, { status: 400 });

  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM bots WHERE id = ? AND user_id = ?").run(parseInt(id), parseInt(userId));
  return Response.json({ ok: true });
}
