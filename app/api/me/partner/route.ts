import { auth } from "@/auth";
import { getDb } from "@/db/db";

// Anonieme codenamen op basis van user_id (deterministisch)
const ANIMALS = ["Vos", "Wolf", "Leeuw", "Tijger", "Adelaar", "Haai", "Panter", "Stier", "Beer", "Lynx", "Jaguar", "Cobra", "Arend", "Buffel", "Condor"];
const COLORS  = ["Groen", "Blauw", "Rood", "Goud", "Zilver", "Zwart", "Wit", "Staal", "Amber", "Bruin"];

function getCodename(userId: number): string {
  const animal = ANIMALS[userId % ANIMALS.length];
  const color  = COLORS[Math.floor(userId / ANIMALS.length) % COLORS.length];
  return `${color}e ${animal}`;
}

type UserRow = { id: number; login_streak: number; last_streak_date: string | null };
type QuizRow = { level: number };
type TradeRow = { pnl: number | null };
type PartnerRow = { id: number; user_a: number; user_b: number; matched_at: string };
type OptInRow = { opted_in: number };

function getUserStats(db: ReturnType<typeof getDb>, userId: number) {
  const user = db.prepare("SELECT id, login_streak, last_streak_date FROM users WHERE id = ?")
    .get(userId) as UserRow | undefined;

  const quizRow = db.prepare(`
    SELECT COALESCE(MAX(level), 1) as level FROM (
      SELECT CASE
        WHEN COUNT(*) >= 200 THEN 5
        WHEN COUNT(*) >= 100 THEN 4
        WHEN COUNT(*) >= 40  THEN 3
        WHEN COUNT(*) >= 15  THEN 2
        ELSE 1 END as level
      FROM quiz_shown WHERE user_id = ? AND correct = 1
    )
  `).get(userId) as QuizRow | undefined;

  // Win rate laatste 30 trades
  const trades = db.prepare(`
    SELECT history FROM paper_trading WHERE user_id = ? ORDER BY updated_at DESC LIMIT 10
  `).all(userId) as { history: string }[];

  let closedTrades: TradeRow[] = [];
  for (const row of trades) {
    try {
      const hist = JSON.parse(row.history ?? "[]") as TradeRow[];
      closedTrades = closedTrades.concat(hist.filter(t => t.pnl != null));
    } catch { /* ignore */ }
  }
  const last30 = closedTrades.slice(-30);
  const wins = last30.filter(t => (t.pnl ?? 0) > 0).length;
  const winRate = last30.length > 0 ? Math.round((wins / last30.length) * 100) : null;

  // Actief de afgelopen 7 dagen?
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const active7d = (user?.last_streak_date ?? "") >= weekAgo && (user?.last_streak_date ?? "") <= today;

  return {
    level: quizRow?.level ?? 1,
    streak: user?.login_streak ?? 0,
    winRate,
    tradeCount: last30.length,
    active7d,
  };
}

// GET — haal huidige partner + stats op
export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");
  const db = getDb();

  // Opt-in status
  const optIn = db.prepare("SELECT opted_in FROM partner_opt_in WHERE user_id = ?")
    .get(userId) as OptInRow | undefined;
  const isOptedIn = optIn?.opted_in === 1;

  // Actieve partnership
  const partnership = db.prepare(`
    SELECT id, user_a, user_b, matched_at FROM partnerships
    WHERE (user_a = ? OR user_b = ?) AND status = 'active'
    LIMIT 1
  `).get(userId, userId) as PartnerRow | undefined;

  if (!partnership) {
    return Response.json({ optedIn: isOptedIn, partner: null });
  }

  const partnerId = partnership.user_a === userId ? partnership.user_b : partnership.user_a;
  const stats = getUserStats(db, partnerId);

  return Response.json({
    optedIn: isOptedIn,
    partner: {
      partnershipId: partnership.id,
      codename: getCodename(partnerId),
      matchedAt: partnership.matched_at,
      level: stats.level,
      streak: stats.streak,
      winRate: stats.winRate,
      tradeCount: stats.tradeCount,
      active7d: stats.active7d,
    },
  });
}

// POST — opt in / opt uit
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const { optIn } = await req.json().catch(() => ({ optIn: true }));
  const db = getDb();

  db.prepare(`
    INSERT INTO partner_opt_in (user_id, opted_in, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET opted_in = excluded.opted_in, updated_at = excluded.updated_at
  `).run(userId, optIn ? 1 : 0);

  // Als opt-out: beëindig actieve partnership
  if (!optIn) {
    db.prepare(`
      UPDATE partnerships SET status = 'ended'
      WHERE (user_a = ? OR user_b = ?) AND status = 'active'
    `).run(userId, userId);
  }

  return Response.json({ optedIn: !!optIn });
}

// DELETE — beëindig actieve partnership (maar blijf opt-in)
export async function DELETE() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");
  const db = getDb();

  db.prepare(`
    UPDATE partnerships SET status = 'ended'
    WHERE (user_a = ? OR user_b = ?) AND status = 'active'
  `).run(userId, userId);

  return Response.json({ ok: true });
}
