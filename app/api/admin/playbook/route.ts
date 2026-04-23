import { auth } from "@/auth";
import { getDb } from "@/db/db";

type BotRun = {
  bot_id: number;
  bot_name: string;
  user_id: number;
  username: string;
  action: string;
  symbol: string;
  side: string;
  amount: number;
  price: number;
  status: string;
  note: string;
  created_at: string;
};

type StratCount = { strategy: string; count: number };
type ExchCount = { exchange: string; count: number };

export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin") {
    return Response.json({ error: "Geen toegang" }, { status: 403 });
  }

  const db = getDb();

  try {
    const n = (sql: string, ...params: unknown[]) =>
      ((db.prepare(sql).get(...params) as { c: number } | undefined)?.c ?? 0);

    const totalBots = n("SELECT COUNT(*) as c FROM bots");
    const activeBots = n("SELECT COUNT(*) as c FROM bots WHERE active = 1");
    const simulationBots = n("SELECT COUNT(*) as c FROM bots WHERE simulation = 1 AND active = 1");
    const liveBots = n("SELECT COUNT(*) as c FROM bots WHERE simulation = 0 AND active = 1");

    const recentRuns = db
      .prepare(
        `SELECT br.bot_id, b.name as bot_name, br.user_id, u.username,
                br.action, br.symbol, br.side, br.amount, br.price,
                br.status, br.note, br.created_at
         FROM bot_runs br
         LEFT JOIN bots b ON b.id = br.bot_id
         LEFT JOIN users u ON u.id = br.user_id
         ORDER BY br.created_at DESC
         LIMIT 30`
      )
      .all() as BotRun[];

    const botsPerStrategy = db
      .prepare("SELECT strategy, COUNT(*) as count FROM bots GROUP BY strategy ORDER BY count DESC")
      .all() as StratCount[];

    const botsPerExchange = db
      .prepare("SELECT exchange, COUNT(*) as count FROM bots GROUP BY exchange ORDER BY count DESC")
      .all() as ExchCount[];

    return Response.json({
      totalBots,
      activeBots,
      simulationBots,
      liveBots,
      recentRuns,
      botsPerStrategy,
      botsPerExchange,
    });
  } catch {
    // Tables may not exist yet
    return Response.json({
      totalBots: 0,
      activeBots: 0,
      simulationBots: 0,
      liveBots: 0,
      recentRuns: [],
      botsPerStrategy: [],
      botsPerExchange: [],
    });
  }
}
