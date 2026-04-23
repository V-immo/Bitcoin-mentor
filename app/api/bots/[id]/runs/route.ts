import { auth } from "@/auth";
import { getDb } from "@/db/db";

type BotRun = {
  id: number;
  bot_id: number;
  user_id: number;
  action: string;
  symbol: string;
  side: string;
  amount: number;
  price: number;
  status: string;
  note: string;
  created_at: string;
};

// GET /api/bots/[id]/runs — laatste 50 runs van een bot
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return Response.json({ error: "Geen userId" }, { status: 400 });

  const { id } = await params;
  const db = getDb();

  // Controleer of bot van deze gebruiker is
  const bot = db.prepare("SELECT id FROM bots WHERE id = ? AND user_id = ?").get(parseInt(id), parseInt(userId));
  if (!bot) return Response.json({ error: "Bot niet gevonden" }, { status: 404 });

  const runs = db.prepare(
    "SELECT * FROM bot_runs WHERE bot_id = ? ORDER BY created_at DESC LIMIT 50"
  ).all(parseInt(id)) as BotRun[];

  return Response.json(runs);
}
