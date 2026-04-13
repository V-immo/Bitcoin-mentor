import { auth } from "@/auth";
import { getDb } from "@/db/db";

const DAYS = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");
  const db = getDb();

  const papers = db.prepare(
    "SELECT history FROM paper_trading WHERE user_id = ?"
  ).all(userId) as { history: string }[];

  type Trade = { createdAt?: string; closedAt?: string; pnl?: number; timestamp?: number };

  // Flatten alle gesloten trades met datum
  const allTrades: { date: string; dayOfWeek: number; pnl: number; timestamp: number }[] = [];

  for (const paper of papers) {
    try {
      const hist = JSON.parse(paper.history ?? "[]") as Trade[];
      for (const t of hist) {
        if (t.pnl == null) continue; // alleen gesloten trades
        const dateStr = t.closedAt ?? t.createdAt;
        if (!dateStr) continue;
        const d = new Date(dateStr);
        allTrades.push({
          date: dateStr.slice(0, 10),
          dayOfWeek: d.getDay(), // 0=Zo, 1=Ma, ...
          pnl: t.pnl,
          timestamp: d.getTime(),
        });
      }
    } catch { /* ignore */ }
  }

  // 1. Winrate per dag van de week
  const byDay: Record<number, { wins: number; total: number }> = {};
  for (let i = 0; i < 7; i++) byDay[i] = { wins: 0, total: 0 };
  for (const t of allTrades) {
    byDay[t.dayOfWeek].total++;
    if (t.pnl > 0) byDay[t.dayOfWeek].wins++;
  }
  const winrateByDay = DAYS.map((label, i) => ({
    label,
    wins: byDay[i].wins,
    total: byDay[i].total,
    winrate: byDay[i].total > 0 ? Math.round((byDay[i].wins / byDay[i].total) * 100) : null,
  }));

  // 2. Revenge trading detectie
  // Definitie: op 1 dag, 3+ trades DIRECT na een verlies binnen 30 min
  const tradesByDate: Record<string, { pnl: number; timestamp: number }[]> = {};
  for (const t of allTrades) {
    if (!tradesByDate[t.date]) tradesByDate[t.date] = [];
    tradesByDate[t.date].push({ pnl: t.pnl, timestamp: t.timestamp });
  }

  let revengeDays = 0;
  let revengeExamples: string[] = [];
  for (const [date, trades] of Object.entries(tradesByDate)) {
    const sorted = trades.sort((a, b) => a.timestamp - b.timestamp);
    let revengeCount = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].pnl < 0) {
        // Check hoeveel trades binnen 30 min erna
        const window = sorted[i].timestamp + 30 * 60 * 1000;
        let fastFollowUp = 0;
        for (let j = i + 1; j < sorted.length; j++) {
          if (sorted[j].timestamp <= window) fastFollowUp++;
          else break;
        }
        if (fastFollowUp >= 2) revengeCount++;
      }
    }
    if (revengeCount > 0) {
      revengeDays++;
      if (revengeExamples.length < 3) revengeExamples.push(date);
    }
  }

  const totalDaysTraded = Object.keys(tradesByDate).length;
  const revengeRatio = totalDaysTraded > 0 ? Math.round((revengeDays / totalDaysTraded) * 100) : 0;

  // 3. Best/worst dag van de week
  const activeDays = winrateByDay.filter(d => d.total >= 2);
  const bestDay = activeDays.length > 0 ? activeDays.reduce((a, b) => (a.winrate ?? 0) > (b.winrate ?? 0) ? a : b) : null;
  const worstDay = activeDays.length > 0 ? activeDays.reduce((a, b) => (a.winrate ?? 100) < (b.winrate ?? 100) ? a : b) : null;

  return Response.json({
    winrateByDay,
    revenge: {
      revengeDays,
      totalDaysTraded,
      revengeRatio,
      recentExamples: revengeExamples,
    },
    bestDay,
    worstDay,
    totalTrades: allTrades.length,
  });
}
