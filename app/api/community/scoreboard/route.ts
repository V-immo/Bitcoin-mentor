import { getDb } from "@/db/db";

let cache: { data: unknown; ts: number } | null = null;
const TTL = 15 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.ts < TTL) {
    return Response.json(cache.data);
  }
  try {
    const db = getDb();

    // Alle gesloten trades met PnL
    const allHistory = db.prepare(
      "SELECT user_id, asset, history FROM paper_trading"
    ).all() as { user_id: number; asset: string; history: string }[];

    type TradeEntry = { pnl?: number; side?: string; amountEur?: number; timestamp?: number };

    // Per user stats
    const userStats: Record<number, {
      wins: number; losses: number; totalPnl: number;
      streak: number; maxStreak: number; lastWin: boolean;
    }> = {};

    // Global stats
    let totalWins = 0;
    let totalLosses = 0;
    let totalPnl = 0;
    let totalTrades = 0;
    let sum24hPnl = 0;
    let count24h = 0;

    const cutoff24h = Date.now() - 86400000;

    for (const row of allHistory) {
      try {
        const hist = JSON.parse(row.history ?? "[]") as TradeEntry[];
        const closed = hist.filter(t => t.pnl != null);
        if (!userStats[row.user_id]) {
          userStats[row.user_id] = { wins: 0, losses: 0, totalPnl: 0, streak: 0, maxStreak: 0, lastWin: false };
        }
        const u = userStats[row.user_id];
        for (const t of closed) {
          const isWin = (t.pnl ?? 0) > 0;
          totalTrades++;
          totalPnl += t.pnl ?? 0;
          if (isWin) { totalWins++; u.wins++; u.totalPnl += t.pnl ?? 0; }
          else { totalLosses++; u.losses++; u.totalPnl += t.pnl ?? 0; }
          // Streak
          if (isWin) {
            u.streak = u.lastWin ? u.streak + 1 : 1;
          } else {
            u.streak = 0;
          }
          u.maxStreak = Math.max(u.maxStreak, u.streak);
          u.lastWin = isWin;
          // 24h
          if (t.timestamp && t.timestamp > cutoff24h) {
            sum24hPnl += t.pnl ?? 0;
            count24h++;
          }
        }
      } catch { /* ignore */ }
    }

    const globalWinRate = totalTrades > 0 ? Math.round((totalWins / totalTrades) * 100) : 0;

    // Top traders by winrate (min 5 trades)
    const topTraders = Object.entries(userStats)
      .filter(([, s]) => (s.wins + s.losses) >= 5)
      .map(([userId, s]) => {
        const total = s.wins + s.losses;
        return {
          userId: parseInt(userId),
          winRate: Math.round((s.wins / total) * 100),
          totalTrades: total,
          totalPnl: Math.round(s.totalPnl),
          maxStreak: s.maxStreak,
          currentStreak: s.streak,
        };
      })
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 10);

    // Add codenames (anonymous)
    const ANIMALS = ["Wolf","Haai","Adelaar","Slang","Leeuw","Panter","Lynx","Vos","Beer","Uil","Stier","Bison","Arend","Jaguar","Tijger"];
    const COLORS = ["Goud","Zilver","Staal","Koper","Platina","Carbon","Obsidiaan","Safier","Robijn","Titanium"];
    const topTradersNamed = topTraders.map(t => ({
      ...t,
      codename: `${ANIMALS[t.userId % 15]} ${COLORS[Math.floor(t.userId / 15) % 10]}`,
    }));

    // Best streak
    const bestStreak = Object.values(userStats).reduce((m, s) => Math.max(m, s.maxStreak), 0);

    const result = {
      globalWinRate,
      totalTrades,
      totalPnl: Math.round(totalPnl),
      pnl24h: Math.round(sum24hPnl),
      trades24h: count24h,
      bestStreak,
      activeTraders: Object.keys(userStats).length,
      topTraders: topTradersNamed,
    };

    cache = { data: result, ts: Date.now() };
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
