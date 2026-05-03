import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";

type TradeItem = {
  side?: string;
  pnl?: number;
  price?: number;
  amount?: number;
};

type PaperRow = {
  user_id: number;
  history: string;
  starting_balance: number;
  cash: number;
};

type UserRow = {
  id: number;
  username: string;
  leaderboard_opt_in: number;
  leaderboard_display_name: string;
};

type QuizRow = {
  user_id: number;
  level: number;
  xp: number;
};

type UserStats = {
  totalPnl: number;
  totalTrades: number;
  wins: number;
  losses: number;
  startingBalance: number;
  maxDrawdown: number;      // absolute
  peakBalance: number;
  tradeResults: number[];   // pnl per trade voor consistentie
};

function computeStats(rows: PaperRow[]): Map<number, UserStats> {
  const map = new Map<number, UserStats>();

  for (const row of rows) {
    let history: TradeItem[] = [];
    try { history = JSON.parse(row.history ?? "[]"); } catch { continue; }

    const sells = history.filter(
      t => (t.side === "sell" || t.side === "SELL") && typeof t.pnl === "number"
    );
    if (sells.length === 0) continue;

    let totalPnl = 0;
    let wins = 0;
    let losses = 0;
    const tradeResults: number[] = [];

    // Max drawdown: simuleert balans cumulatief
    let balance = row.starting_balance ?? 10000;
    let peak = balance;
    let maxDD = 0;

    for (const trade of sells) {
      const pnl = trade.pnl ?? 0;
      totalPnl += pnl;
      tradeResults.push(pnl);
      if (pnl > 0) wins++; else losses++;

      balance += pnl;
      if (balance > peak) peak = balance;
      const dd = (peak - balance) / peak;
      if (dd > maxDD) maxDD = dd;
    }

    const existing = map.get(row.user_id);
    if (existing) {
      existing.totalPnl     += totalPnl;
      existing.totalTrades  += sells.length;
      existing.wins         += wins;
      existing.losses       += losses;
      existing.tradeResults.push(...tradeResults);
      if (maxDD > existing.maxDrawdown) existing.maxDrawdown = maxDD;
    } else {
      map.set(row.user_id, {
        totalPnl,
        totalTrades: sells.length,
        wins,
        losses,
        startingBalance: row.starting_balance ?? 10000,
        maxDrawdown: maxDD,
        peakBalance: peak,
        tradeResults,
      });
    }
  }
  return map;
}

/** Risicogecorrigeerde score (0-100):
 *  40% winrate + 40% PnL% (gecapped 50%) + 20% ervaring (capped op 20 trades)
 *  Straft grote drawdowns af via een multiplier.
 */
function riskScore(stats: UserStats): number {
  const winRate   = stats.totalTrades > 0 ? (stats.wins / stats.totalTrades) * 100 : 0;
  const pnlPct    = (stats.totalPnl / (stats.startingBalance || 10000)) * 100;
  const pnlCapped = Math.max(-50, Math.min(50, pnlPct));
  const expFactor = Math.min(stats.totalTrades / 20, 1) * 100; // 100% bij 20 trades
  const raw = winRate * 0.4 + (pnlCapped + 50) * 0.4 + expFactor * 0.2;
  const ddPenalty = 1 - stats.maxDrawdown * 0.5; // max 50% boete bij 100% drawdown
  return Math.max(0, Math.round(raw * ddPenalty));
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const currentUserId = session?.user
    ? parseInt((session.user as { id?: string }).id ?? "0")
    : null;

  const sort = (request.nextUrl.searchParams.get("sort") ?? "score") as
    "score" | "pnl" | "winrate";

  const db = getDb();

  // Alleen opt-in gebruikers tonen; current user altijd ophalen (voor "jouw positie")
  const paperRows = db
    .prepare("SELECT user_id, history, starting_balance, cash FROM paper_trading")
    .all() as PaperRow[];

  const statsMap = computeStats(paperRows);
  if (statsMap.size === 0) return Response.json({ entries: [], myPosition: null });

  const userIds = Array.from(statsMap.keys());
  const ph = userIds.map(() => "?").join(",");

  const users = db
    .prepare(`SELECT id, username, leaderboard_opt_in, leaderboard_display_name FROM users WHERE id IN (${ph})`)
    .all(...userIds) as UserRow[];

  const quizRows = db
    .prepare(`SELECT user_id, level, xp FROM quiz_progress WHERE user_id IN (${ph})`)
    .all(...userIds) as QuizRow[];

  const userMap = new Map(users.map(u => [u.id, u]));
  const quizMap = new Map(quizRows.map(q => [q.user_id, q]));

  const MIN_TRADES = 3;

  const allEntries = userIds
    .filter(uid => {
      const stats = statsMap.get(uid)!;
      return stats.totalTrades >= MIN_TRADES;
    })
    .map(uid => {
      const stats  = statsMap.get(uid)!;
      const user   = userMap.get(uid);
      const quiz   = quizMap.get(uid) ?? { level: 1, xp: 0 };
      const winRate = stats.totalTrades > 0 ? (stats.wins / stats.totalTrades) * 100 : 0;
      const pnlPct  = (stats.totalPnl / (stats.startingBalance || 10000)) * 100;
      const score   = riskScore(stats);
      const isOptIn = !!user?.leaderboard_opt_in;
      const displayName = user?.leaderboard_display_name?.trim() || user?.username || `Trader #${uid}`;

      return {
        userId: uid,
        displayName,
        isOptIn,
        totalPnl:    Math.round(stats.totalPnl * 100) / 100,
        pnlPct:      Math.round(pnlPct * 10) / 10,
        totalTrades: stats.totalTrades,
        winRate:     Math.round(winRate * 10) / 10,
        maxDrawdown: Math.round(stats.maxDrawdown * 1000) / 10, // als %
        level:       quiz.level,
        score,
      };
    });

  // Sorteer op geselecteerde mode
  const sorted = [...allEntries].sort((a, b) => {
    if (sort === "pnl")     return b.totalPnl - a.totalPnl;
    if (sort === "winrate") return b.winRate  - a.winRate;
    return b.score - a.score;
  });

  // Publiek leaderboard: alleen opt-in gebruikers, geanonimiseerd
  const publicEntries = sorted
    .filter(e => e.isOptIn)
    .slice(0, 25)
    .map((e, i) => ({
      rank:        i + 1,
      displayName: e.displayName,
      totalPnl:    e.totalPnl,
      pnlPct:      e.pnlPct,
      totalTrades: e.totalTrades,
      winRate:     e.winRate,
      maxDrawdown: e.maxDrawdown,
      level:       e.level,
      score:       e.score,
      isMe:        e.userId === currentUserId,
    }));

  // Positie van de huidige gebruiker (ook als niet opt-in)
  let myPosition: {
    rank: number; totalPnl: number; pnlPct: number; totalTrades: number;
    winRate: number; maxDrawdown: number; score: number; level: number;
    isOptIn: boolean; displayName: string;
  } | null = null;

  if (currentUserId) {
    const myIdx = sorted.findIndex(e => e.userId === currentUserId);
    if (myIdx >= 0) {
      const me = sorted[myIdx];
      myPosition = {
        rank:        myIdx + 1,
        totalPnl:    me.totalPnl,
        pnlPct:      me.pnlPct,
        totalTrades: me.totalTrades,
        winRate:     me.winRate,
        maxDrawdown: me.maxDrawdown,
        score:       me.score,
        level:       me.level,
        isOptIn:     me.isOptIn,
        displayName: me.displayName,
      };
    }
  }

  return Response.json({ entries: publicEntries, myPosition, sort });
}
