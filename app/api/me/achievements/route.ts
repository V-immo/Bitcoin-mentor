import { auth } from "@/auth";
import { getDb } from "@/db/db";

type TradeEntry = { side?: string; pnl?: number; timestamp?: number; activeSL?: number };

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const db = getDb();

  // Gebruikersdata
  const user = db.prepare(
    "SELECT login_streak, last_streak_date, premarket_count FROM users WHERE id = ?"
  ).get(userId) as { login_streak: number; last_streak_date: string | null; premarket_count?: number } | undefined;

  // Quiz voortgang
  const quiz = db.prepare("SELECT level, xp FROM quiz_progress WHERE user_id = ?")
    .get(userId) as { level: number; xp: number } | undefined;

  // Paper trading trades
  const papers = db.prepare("SELECT history FROM paper_trading WHERE user_id = ?")
    .all(userId) as { history: string }[];

  // Journal
  const journalRows = db.prepare(
    "SELECT date, note, what_went_well, emotion FROM trade_journal WHERE user_id = ? ORDER BY date DESC"
  ).all(userId) as { date: string; note?: string; what_went_well?: string; emotion?: number }[];
  const journalCount = journalRows.length;
  const journalStructuredCount = journalRows.filter(j => j.what_went_well && j.what_went_well.length > 5).length;

  // Trading plan + profiel
  const planExists = !!db.prepare("SELECT id FROM trading_plan WHERE user_id = ?").get(userId);
  const profileExists = !!db.prepare("SELECT id FROM user_profile WHERE user_id = ?").get(userId);

  // Alerts
  const alertCount = (db.prepare("SELECT COUNT(*) as c FROM price_alerts WHERE user_id = ?")
    .get(userId) as { c: number }).c;

  // Trades verwerken
  const allTrades: TradeEntry[] = [];
  for (const p of papers) {
    try { allTrades.push(...(JSON.parse(p.history ?? "[]") as TradeEntry[])); } catch { /* ignore */ }
  }
  const closedTrades = allTrades.filter(t => (t.side === "sell" || t.side === "SELL") && typeof t.pnl === "number");
  const wins = closedTrades.filter(t => (t.pnl ?? 0) > 0);
  const totalPnl = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;

  // Unieke handelsdagen
  const sortedByDate = [...allTrades]
    .filter(t => t.timestamp)
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  const uniqueDays = new Set(sortedByDate.map(t => new Date(t.timestamp!).toISOString().slice(0, 10)));

  // Consecutive winstgevende trades
  let currentWinStreak = 0;
  let maxWinStreak = 0;
  for (const t of [...closedTrades].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))) {
    if ((t.pnl ?? 0) > 0) {
      currentWinStreak++;
      maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
    } else {
      currentWinStreak = 0;
    }
  }

  // Trades met SL ingesteld (van de laatste 5)
  const last5 = closedTrades.slice(-5);
  const allHaveSL = last5.length >= 5 && last5.every(t => t.activeSL && t.activeSL > 0);

  // Wekelijkse data
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // maandag
  weekStart.setHours(0, 0, 0, 0);
  const weekStartMs = weekStart.getTime();

  const weekTrades = closedTrades.filter(t => (t.timestamp ?? 0) >= weekStartMs).length;
  const weekJournal = journalRows.filter(j => new Date(j.date).getTime() >= weekStartMs).length;
  const loginStreak = user?.login_streak ?? 0;
  const premCount = user?.premarket_count ?? 0;

  // ─── Badge definities ───────────────────────────────────────────────────────
  const achievements = [
    // Trading
    { id: "first_trade",   icon: "🎯", name: "Eerste Trade",    desc: "Je eerste paper trade gesloten",               earned: closedTrades.length >= 1,                            category: "trading" },
    { id: "trades_10",     icon: "📈", name: "10 Trades",       desc: "10 trades gesloten",                            earned: closedTrades.length >= 10,                           category: "trading" },
    { id: "trades_25",     icon: "⚡", name: "25 Trades",       desc: "25 trades gesloten",                            earned: closedTrades.length >= 25,                           category: "trading" },
    { id: "trades_50",     icon: "🔥", name: "Trader 50",       desc: "50 trades gesloten",                            earned: closedTrades.length >= 50,                           category: "trading" },
    { id: "trades_100",    icon: "💯", name: "100 Trades",      desc: "100 trades gesloten — professioneel niveau",     earned: closedTrades.length >= 100,                          category: "trading" },
    { id: "first_win",     icon: "💰", name: "Eerste Winst",    desc: "Je eerste winstgevende trade",                  earned: wins.length >= 1,                                    category: "trading" },
    { id: "winrate_60",    icon: "🏆", name: "60% Winrate",     desc: "Winrate boven 60% (min. 5 trades)",             earned: closedTrades.length >= 5 && winRate >= 60,           category: "trading" },
    { id: "winrate_70",    icon: "👑", name: "70% Winrate",     desc: "Winrate boven 70% (min. 10 trades)",            earned: closedTrades.length >= 10 && winRate >= 70,          category: "trading" },
    { id: "win_streak_3",  icon: "🎯", name: "3 op rij",        desc: "3 winstgevende trades achter elkaar",           earned: maxWinStreak >= 3,                                   category: "trading" },
    { id: "win_streak_5",  icon: "🔮", name: "5 op rij",        desc: "5 winstgevende trades achter elkaar",           earned: maxWinStreak >= 5,                                   category: "trading" },
    { id: "pnl_100",       icon: "💵", name: "+$100 P&L",       desc: "Cumulatief $100 winst",                         earned: totalPnl >= 100,                                     category: "trading" },
    { id: "pnl_500",       icon: "💎", name: "+$500 P&L",       desc: "Cumulatief $500 winst",                         earned: totalPnl >= 500,                                     category: "trading" },
    { id: "pnl_1000",      icon: "🚀", name: "+$1000 P&L",      desc: "Cumulatief $1000 winst",                        earned: totalPnl >= 1000,                                    category: "trading" },
    { id: "sl_discipline", icon: "🛡️", name: "SL Discipline",   desc: "5 trades op rij met stop-loss ingesteld",       earned: allHaveSL,                                           category: "trading" },

    // Leren
    { id: "level_2",       icon: "🧠", name: "Level 2",         desc: "Quiz level 2 bereikt",                          earned: (quiz?.level ?? 1) >= 2,                             category: "leren" },
    { id: "level_3",       icon: "🎓", name: "Level 3",         desc: "Quiz level 3 bereikt",                          earned: (quiz?.level ?? 1) >= 3,                             category: "leren" },
    { id: "level_5",       icon: "🌟", name: "Expert",          desc: "Maximaal level 5 bereikt",                      earned: (quiz?.level ?? 1) >= 5,                             category: "leren" },
    { id: "xp_500",        icon: "⭐", name: "500 XP",          desc: "500 XP verzameld",                              earned: (quiz?.xp ?? 0) >= 500,                              category: "leren" },
    { id: "xp_2000",       icon: "🌠", name: "2000 XP",         desc: "2000 XP — echte kenner",                        earned: (quiz?.xp ?? 0) >= 2000,                             category: "leren" },

    // Consistentie
    { id: "streak_3",      icon: "🔥",   name: "3 Dagen",       desc: "3 dagen op rij ingelogd",                       earned: loginStreak >= 3,                                    category: "consistentie" },
    { id: "streak_7",      icon: "🔥🔥", name: "Week Streak",   desc: "7 dagen op rij ingelogd",                       earned: loginStreak >= 7,                                    category: "consistentie" },
    { id: "streak_30",     icon: "🏅",   name: "Maand Streak",  desc: "30 dagen op rij ingelogd",                      earned: loginStreak >= 30,                                   category: "consistentie" },
    { id: "journal_5",     icon: "📓", name: "Dagboek",         desc: "5 journal entries geschreven",                  earned: journalCount >= 5,                                   category: "consistentie" },
    { id: "journal_30",    icon: "📚", name: "Vaste Schrijver", desc: "30 journal entries",                            earned: journalCount >= 30,                                  category: "consistentie" },
    { id: "journal_deep",  icon: "🧘", name: "Diep Reflecteren",desc: "10x journalen met structuurvelden",              earned: journalStructuredCount >= 10,                        category: "consistentie" },
    { id: "trade_days_5",  icon: "📅", name: "5 Handelsdagen", desc: "Op 5 verschillende dagen gehandeld",              earned: uniqueDays.size >= 5,                                category: "consistentie" },
    { id: "trade_days_20", icon: "📆", name: "20 Handelsdagen",desc: "Op 20 verschillende dagen gehandeld",             earned: uniqueDays.size >= 20,                               category: "consistentie" },

    // Voorbereiding & setup
    { id: "trading_plan",  icon: "📋", name: "Trading Plan",    desc: "Persoonlijk tradingplan ingevuld",               earned: planExists,                                          category: "setup" },
    { id: "profile",       icon: "👤", name: "Profiel",         desc: "Psychologisch profiel ingevuld",                 earned: profileExists,                                       category: "setup" },
    { id: "premarket_1",   icon: "🌅", name: "Eerste Ritueel",  desc: "Pre-market ritueel voor het eerst voltooid",     earned: premCount >= 1,                                      category: "setup" },
    { id: "premarket_7",   icon: "🌄", name: "7x Ritueel",      desc: "Pre-market ritueel 7 keer voltooid",             earned: premCount >= 7,                                      category: "setup" },
    { id: "premarket_30",  icon: "☀️", name: "Vaste Routine",   desc: "Pre-market ritueel 30 keer voltooid",            earned: premCount >= 30,                                     category: "setup" },
    { id: "first_alert",   icon: "🔔", name: "Eerste Alert",    desc: "Je eerste prijsalert ingesteld",                 earned: alertCount >= 1,                                     category: "setup" },
  ];

  const earnedList = achievements.filter(a => a.earned);
  const total = achievements.length;
  const completedPct = Math.round((earnedList.length / total) * 100);

  // Wekelijkse challenge voortgang (terugsturen als server-data)
  const weeklyProgress = {
    weekly_trades_3:  Math.min(3, weekTrades),
    weekly_journal_3: Math.min(3, weekJournal),
    weekly_login_5:   Math.min(5, loginStreak),
  };

  return Response.json({
    achievements,
    earned: earnedList.length,
    total,
    completedPct,
    loginStreak,
    xp: quiz?.xp ?? 0,
    level: quiz?.level ?? 1,
    weeklyProgress,
    premCount,
  });
}
