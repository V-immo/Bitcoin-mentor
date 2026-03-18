import { auth } from "@/auth";
import { getDb } from "@/db/db";

type TradeHistoryItem = {
  type: "buy" | "sell";
  pnl?: number;
};

type PaperRow = {
  user_id: number;
  history: string;
};

type UserRow = {
  id: number;
  username: string;
};

type QuizRow = {
  user_id: number;
  level: number;
  xp: number;
};

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const db = getDb();

  // Fetch all paper trading rows
  const paperRows = db
    .prepare("SELECT user_id, history FROM paper_trading")
    .all() as PaperRow[];

  // Aggregate per user_id from JS-parsed history JSON
  const statsMap = new Map<
    number,
    { totalPnl: number; totalTrades: number; wins: number }
  >();

  for (const row of paperRows) {
    let history: TradeHistoryItem[] = [];
    try {
      history = JSON.parse(row.history ?? "[]");
    } catch {
      history = [];
    }

    let totalPnl = 0;
    let totalTrades = 0;
    let wins = 0;

    for (const item of history) {
      if (item.type === "sell" && typeof item.pnl === "number") {
        totalPnl += item.pnl;
        totalTrades += 1;
        if (item.pnl > 0) wins += 1;
      }
    }

    const existing = statsMap.get(row.user_id);
    if (existing) {
      existing.totalPnl += totalPnl;
      existing.totalTrades += totalTrades;
      existing.wins += wins;
    } else {
      statsMap.set(row.user_id, { totalPnl, totalTrades, wins });
    }
  }

  if (statsMap.size === 0) {
    return Response.json([]);
  }

  const userIds = Array.from(statsMap.keys());

  // Fetch usernames for those user IDs
  const placeholders = userIds.map(() => "?").join(",");
  const users = db
    .prepare(`SELECT id, username FROM users WHERE id IN (${placeholders})`)
    .all(...userIds) as UserRow[];

  const usernameMap = new Map<number, string>();
  for (const u of users) {
    usernameMap.set(u.id, u.username);
  }

  // Fetch quiz progress for those users
  const quizRows = db
    .prepare(`SELECT user_id, level, xp FROM quiz_progress WHERE user_id IN (${placeholders})`)
    .all(...userIds) as QuizRow[];

  const quizMap = new Map<number, { level: number; xp: number }>();
  for (const q of quizRows) {
    quizMap.set(q.user_id, { level: q.level, xp: q.xp });
  }

  // Build result array, sorted by totalPnl descending, top 20
  const result = userIds
    .map((userId) => {
      const stats = statsMap.get(userId)!;
      const quiz = quizMap.get(userId) ?? { level: 1, xp: 0 };
      const winRate =
        stats.totalTrades > 0 ? (stats.wins / stats.totalTrades) * 100 : 0;
      return {
        userId,
        username: usernameMap.get(userId) ?? `User ${userId}`,
        totalPnl: Math.round(stats.totalPnl * 100) / 100,
        totalTrades: stats.totalTrades,
        winRate: Math.round(winRate * 10) / 10,
        level: quiz.level,
        xp: quiz.xp,
      };
    })
    .sort((a, b) => b.totalPnl - a.totalPnl)
    .slice(0, 20)
    .map((entry, index) => ({
      rank: index + 1,
      username: entry.username,
      totalPnl: entry.totalPnl,
      totalTrades: entry.totalTrades,
      winRate: entry.winRate,
      level: entry.level,
      xp: entry.xp,
    }));

  return Response.json(result);
}
