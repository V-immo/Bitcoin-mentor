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
  created_at: string;
  updated_at: string;
};

// GET /api/bots — alle bots van ingelogde gebruiker
export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return Response.json({ error: "Geen userId" }, { status: 400 });

  const db = getDb();
  const bots = db.prepare("SELECT * FROM bots WHERE user_id = ? ORDER BY created_at DESC").all(parseInt(userId)) as Bot[];
  return Response.json(bots.map(b => ({ ...b, config: JSON.parse(b.config) })));
}

// POST /api/bots — nieuwe bot aanmaken
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return Response.json({ error: "Geen userId" }, { status: 400 });

  // PRO check
  const db = getDb();
  const user = db.prepare("SELECT is_pro, pro_until FROM users WHERE id = ?").get(parseInt(userId)) as { is_pro: number; pro_until: string } | undefined;
  const isPro = user?.is_pro === 1 && (!user.pro_until || user.pro_until >= new Date().toISOString().slice(0, 10));
  if (!isPro) return Response.json({ error: "PRO vereist" }, { status: 403 });

  const body = await request.json() as { name?: string; strategy?: string; config?: Record<string, unknown>; exchange?: string; symbol?: string };
  const { name = "", strategy = "dca", config = {}, exchange = "bitvavo", symbol = "BTC" } = body;

  if (!name) return Response.json({ error: "Naam vereist" }, { status: 400 });

  const VALID_STRATEGIES = ["dca", "rsi", "breakout"];
  if (!VALID_STRATEGIES.includes(strategy)) return Response.json({ error: "Onbekende strategie" }, { status: 400 });

  const result = db.prepare(
    "INSERT INTO bots (user_id, name, strategy, config, exchange, symbol) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(parseInt(userId), name, strategy, JSON.stringify(config), exchange, symbol);

  return Response.json({ id: result.lastInsertRowid });
}
