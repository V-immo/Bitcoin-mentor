import { auth } from "@/auth";
import { getDb } from "@/db/db";
import Anthropic from "@anthropic-ai/sdk";

// Cache: per partnership, max 24u
const summaryCache = new Map<number, { text: string; ts: number }>();

const ANIMALS = ["Vos","Wolf","Leeuw","Tijger","Adelaar","Haai","Panter","Stier","Beer","Lynx","Jaguar","Cobra","Arend","Buffel","Condor"];
const COLORS  = ["Groene","Blauwe","Rode","Gouden","Zilveren","Zwarte","Witte","Stalen","Amberen","Bruine"];

function getCodename(userId: number): string {
  const animal = ANIMALS[userId % ANIMALS.length];
  const color  = COLORS[Math.floor(userId / ANIMALS.length) % COLORS.length];
  return `${color} ${animal}`;
}

function getUserStats(db: ReturnType<typeof getDb>, userId: number) {
  const user = db.prepare("SELECT login_streak, last_streak_date FROM users WHERE id = ?")
    .get(userId) as { login_streak: number; last_streak_date: string | null } | undefined;

  const quizRow = db.prepare("SELECT level, xp FROM quiz_progress WHERE user_id = ?")
    .get(userId) as { level: number; xp: number } | undefined;

  const trades = db.prepare("SELECT history FROM paper_trading WHERE user_id = ? LIMIT 10")
    .all(userId) as { history: string }[];

  type TradeEntry = { pnl?: number; side?: string };
  let closed: TradeEntry[] = [];
  for (const row of trades) {
    try { closed = closed.concat((JSON.parse(row.history ?? "[]") as TradeEntry[]).filter(t => t.pnl != null)); }
    catch { /* ignore */ }
  }
  const last30 = closed.slice(-30);
  const wins = last30.filter(t => (t.pnl ?? 0) > 0).length;
  const winRate = last30.length > 0 ? Math.round((wins / last30.length) * 100) : null;
  const totalPnl = last30.reduce((s, t) => s + (t.pnl ?? 0), 0);

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const active7d = (user?.last_streak_date ?? "") >= weekAgo && (user?.last_streak_date ?? "") <= today;

  return {
    level: quizRow?.level ?? 1,
    xp: quizRow?.xp ?? 0,
    streak: user?.login_streak ?? 0,
    winRate,
    tradeCount: last30.length,
    totalPnl: Math.round(totalPnl * 100) / 100,
    active7d,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = parseInt((session.user as { id?: string }).id ?? "0");
  const db = getDb();

  // Zoek actieve partnership
  const partnership = db.prepare(`
    SELECT id, user_a, user_b, matched_at FROM partnerships
    WHERE (user_a = ? OR user_b = ?) AND status = 'active'
    LIMIT 1
  `).get(userId, userId) as { id: number; user_a: number; user_b: number; matched_at: string } | undefined;

  if (!partnership) {
    return Response.json({ available: false });
  }

  const partnerId = partnership.user_a === userId ? partnership.user_b : partnership.user_a;
  const myStats      = getUserStats(db, userId);
  const partnerStats = getUserStats(db, partnerId);
  const partnerCodename = getCodename(partnerId);

  // Check cache (per partnership, 24u)
  const cached = summaryCache.get(partnership.id);
  if (cached && Date.now() - cached.ts < 24 * 3600_000) {
    return Response.json({
      available: true,
      partnerCodename,
      myStats,
      partnerStats,
      summary: cached.text,
      matchedAt: partnership.matched_at,
    });
  }

  // Genereer Marcus-samenvatting
  let summary = "";
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    const client = new Anthropic({ apiKey });
    try {
      const msg = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 250,
        system: `You are Marcus, a direct trading coach. Compare two anonymous trading partners and give concrete, honest feedback in 3-4 sentences.
Be direct — no fluff. Point out who is ahead and why, what the lagging partner should focus on, and one specific action for both.
Respond in the same language as the data provided (Dutch or English based on context).`,
        messages: [{
          role: "user",
          content: `Partnership weekly comparison:

ME:
- Level: ${myStats.level} | XP: ${myStats.xp} | Streak: ${myStats.streak} days
- Win rate: ${myStats.winRate !== null ? myStats.winRate + "%" : "unknown"} | Trades (30): ${myStats.tradeCount} | P&L: €${myStats.totalPnl}
- Active last 7 days: ${myStats.active7d ? "yes" : "no"}

PARTNER (${partnerCodename}):
- Level: ${partnerStats.level} | XP: ${partnerStats.xp} | Streak: ${partnerStats.streak} days
- Win rate: ${partnerStats.winRate !== null ? partnerStats.winRate + "%" : "unknown"} | Trades (30): ${partnerStats.tradeCount} | P&L: €${partnerStats.totalPnl}
- Active last 7 days: ${partnerStats.active7d ? "yes" : "no"}

Give a direct Marcus-style comparison. Address me as "jij" (Dutch). Be honest about who is ahead and what each person should do this week.`,
        }],
      });
      summary = (msg.content[0] as { text: string }).text.trim();
      summaryCache.set(partnership.id, { text: summary, ts: Date.now() });
    } catch {
      summary = "";
    }
  }

  return Response.json({
    available: true,
    partnerCodename,
    myStats,
    partnerStats,
    summary,
    matchedAt: partnership.matched_at,
  });
}
