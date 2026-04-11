import { auth } from "@/auth";
import { getDb } from "@/db/db";

type TradeEntry = { side?: string; pnl?: number; timestamp?: number };

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const db = getDb();

  // Haal alle benodigde data op
  const user = db.prepare("SELECT login_streak, last_streak_date FROM users WHERE id = ?")
    .get(userId) as { login_streak: number; last_streak_date: string } | undefined;

  const quiz = db.prepare("SELECT level, xp FROM quiz_progress WHERE user_id = ?")
    .get(userId) as { level: number; xp: number } | undefined;

  const papers = db.prepare("SELECT history FROM paper_trading WHERE user_id = ?")
    .all(userId) as { history: string }[];

  const journalCount = (db.prepare("SELECT COUNT(*) as cnt FROM trade_journal WHERE user_id = ?")
    .get(userId) as { cnt: number }).cnt;

  const planExists = !!db.prepare("SELECT id FROM trading_plan WHERE user_id = ?").get(userId);
  const profileExists = !!db.prepare("SELECT id FROM user_profile WHERE user_id = ?").get(userId);

  // Verwerk trades
  const allTrades: TradeEntry[] = [];
  for (const p of papers) {
    try { allTrades.push(...(JSON.parse(p.history ?? "[]") as TradeEntry[])); } catch { /* ignore */ }
  }
  const closedTrades = allTrades.filter(t => (t.side === "sell" || t.side === "SELL") && typeof t.pnl === "number");
  const wins = closedTrades.filter(t => (t.pnl ?? 0) > 0);
  const totalPnl = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;

  // Beste dag in een week (7 trades op rij)
  const sortedByDate = [...allTrades]
    .filter(t => t.timestamp)
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  const uniqueDays = new Set(sortedByDate.map(t => new Date(t.timestamp!).toISOString().slice(0, 10)));

  // Definieer achievements
  const achievements = [
    // Trading badges
    { id: "first_trade", icon: "🎯", name: "Eerste Trade", desc: "Je eerste paper trade geopend", earned: closedTrades.length >= 1, category: "trading" },
    { id: "trades_10", icon: "📈", name: "10 Trades", desc: "10 trades gesloten", earned: closedTrades.length >= 10, category: "trading" },
    { id: "trades_25", icon: "⚡", name: "25 Trades", desc: "25 trades gesloten", earned: closedTrades.length >= 25, category: "trading" },
    { id: "trades_50", icon: "🔥", name: "Trader 50", desc: "50 trades gesloten", earned: closedTrades.length >= 50, category: "trading" },
    { id: "first_win", icon: "💰", name: "Eerste Winst", desc: "Je eerste winstgevende trade", earned: wins.length >= 1, category: "trading" },
    { id: "winrate_60", icon: "🏆", name: "60% Winrate", desc: "Winrate boven 60% (min. 5 trades)", earned: closedTrades.length >= 5 && winRate >= 60, category: "trading" },
    { id: "pnl_100", icon: "💵", name: "+€100 P&L", desc: "Cumulatief €100 winst", earned: totalPnl >= 100, category: "trading" },
    { id: "pnl_500", icon: "💎", name: "+€500 P&L", desc: "Cumulatief €500 winst", earned: totalPnl >= 500, category: "trading" },

    // Leer badges
    { id: "level_2", icon: "🧠", name: "Level 2", desc: "Quiz level 2 bereikt", earned: (quiz?.level ?? 1) >= 2, category: "leren" },
    { id: "level_3", icon: "🎓", name: "Level 3", desc: "Quiz level 3 bereikt", earned: (quiz?.level ?? 1) >= 3, category: "leren" },
    { id: "level_5", icon: "🌟", name: "Expert", desc: "Maximaal level 5 bereikt", earned: (quiz?.level ?? 1) >= 5, category: "leren" },
    { id: "xp_500", icon: "⭐", name: "500 XP", desc: "500 XP verzameld", earned: (quiz?.xp ?? 0) >= 500, category: "leren" },

    // Consistentie badges
    { id: "streak_3", icon: "🔥", name: "3 Dagen", desc: "3 dagen op rij ingelogd", earned: (user?.login_streak ?? 0) >= 3, category: "consistentie" },
    { id: "streak_7", icon: "🔥🔥", name: "Week Streak", desc: "7 dagen op rij ingelogd", earned: (user?.login_streak ?? 0) >= 7, category: "consistentie" },
    { id: "streak_30", icon: "🏅", name: "Maand Streak", desc: "30 dagen op rij ingelogd", earned: (user?.login_streak ?? 0) >= 30, category: "consistentie" },
    { id: "journal_5", icon: "📓", name: "Dagboek", desc: "5 journal entries geschreven", earned: journalCount >= 5, category: "consistentie" },
    { id: "journal_30", icon: "📚", name: "Vaste Schrijver", desc: "30 journal entries", earned: journalCount >= 30, category: "consistentie" },

    // Setup badges
    { id: "trading_plan", icon: "📋", name: "Trading Plan", desc: "Persoonlijk tradingplan ingevuld", earned: planExists, category: "setup" },
    { id: "profile", icon: "👤", name: "Profiel", desc: "Psychologisch profiel ingevuld", earned: profileExists, category: "setup" },
    { id: "trade_days_5", icon: "📅", name: "5 Handelsdagen", desc: "Op 5 verschillende dagen gehandeld", earned: uniqueDays.size >= 5, category: "consistentie" },
  ];

  const earned = achievements.filter(a => a.earned);
  const total = achievements.length;
  const completedPct = Math.round((earned.length / total) * 100);

  return Response.json({ achievements, earned: earned.length, total, completedPct });
}
