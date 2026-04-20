import { auth } from "@/auth";
import { getDb } from "@/db/db";
import Anthropic from "@anthropic-ai/sdk";
import { sharedScanCache } from "@/lib/scan-cache";

// Rate limit: max 10x per uur
const rateMap = new Map<string, { count: number; resetAt: number }>();
function checkRate(key: string): boolean {
  const now = Date.now();
  const e = rateMap.get(key);
  if (!e || now > e.resetAt) { rateMap.set(key, { count: 1, resetAt: now + 3_600_000 }); return true; }
  if (e.count >= 10) return false;
  e.count++;
  return true;
}

// Module-level caches zodat AI niet elke request opnieuw draait
const eveningCache = new Map<string, string>(); // key: `${userId}-${date}`
const weeklyCache  = new Map<string, string>(); // key: `${userId}-${weekKey}`

function calendarDaysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const date = dateStr.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const today = new Date().toISOString().slice(0, 10);
  const diffMs = new Date(today).getTime() - new Date(date).getTime();
  if (isNaN(diffMs)) return null;
  return Math.round(diffMs / 86_400_000);
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function getBtcSummary(): string {
  const { data } = sharedScanCache;
  if (!data || data.length === 0) return "";
  const btc = data.find(a => a.ticker === "BTC" || a.symbol === "BTCUSDT");
  if (!btc) return "";
  return `Bitcoin ${btc.change24h >= 0 ? "+" : ""}${btc.change24h.toFixed(1)}% vandaag, trend: ${btc.trend}, score: ${btc.score}/100.`;
}

type TradeEntry = {
  side?: string;
  timestamp?: number | string;
  pnl?: number;
  date?: string;
};

// Detecteer distress: 3+ trades in 30 min na een verlies
function detectDistress(userId: number): boolean {
  try {
    const db = getDb();
    const rows = db.prepare(
      "SELECT history FROM paper_trading WHERE user_id = ? AND updated_at >= datetime('now', '-1 hour')"
    ).all(userId) as { history: string }[];

    const cutoff = Date.now() - 30 * 60 * 1000;
    const recentTrades: TradeEntry[] = [];

    for (const row of rows) {
      try {
        const hist = JSON.parse(row.history ?? "[]") as TradeEntry[];
        for (const t of hist) {
          const ts = typeof t.timestamp === "number"
            ? t.timestamp
            : t.timestamp ? new Date(t.timestamp).getTime() : 0;
          if (ts > cutoff) recentTrades.push(t);
        }
      } catch { /* ignore */ }
    }

    if (recentTrades.length < 3) return false;

    // Sorteer op tijd, kijk of er een verlies gevolgd wordt door 2+ trades snel daarna
    recentTrades.sort((a, b) => {
      const ta = typeof a.timestamp === "number" ? a.timestamp : new Date(a.timestamp ?? 0).getTime();
      const tb = typeof b.timestamp === "number" ? b.timestamp : new Date(b.timestamp ?? 0).getTime();
      return ta - tb;
    });

    for (let i = 0; i < recentTrades.length - 2; i++) {
      if ((recentTrades[i].pnl ?? 0) < 0) {
        // Verlies gevolgd door 2+ trades binnen 20 min
        const lossTime = typeof recentTrades[i].timestamp === "number"
          ? recentTrades[i].timestamp as number
          : new Date(recentTrades[i].timestamp ?? 0).getTime();
        let fastFollowCount = 0;
        for (let j = i + 1; j < recentTrades.length; j++) {
          const t2 = typeof recentTrades[j].timestamp === "number"
            ? recentTrades[j].timestamp as number
            : new Date(recentTrades[j].timestamp ?? 0).getTime();
          if (t2 - lossTime < 20 * 60 * 1000) fastFollowCount++;
        }
        if (fastFollowCount >= 2) return true;
      }
    }
    return false;
  } catch { return false; }
}

// Haal open posities op voor context
function getOpenPositionsContext(userId: number): string {
  try {
    const db = getDb();
    const rows = db.prepare(
      "SELECT asset, position FROM paper_trading WHERE user_id = ? AND position IS NOT NULL AND position != 'null'"
    ).all(userId) as { asset: string; position: string }[];
    if (rows.length === 0) return "Geen open posities.";
    const assets = rows.map(r => r.asset.replace("USDT", "")).join(", ");
    return `${rows.length} open positie(s): ${assets}.`;
  } catch { return ""; }
}

// Haal trades van vandaag op voor evening review
function getTodayTradesSummary(userId: number): { count: number; wins: number; losses: number; pnl: number } {
  const today = new Date().toISOString().slice(0, 10);
  const db = getDb();
  const rows = db.prepare(
    "SELECT history FROM paper_trading WHERE user_id = ? AND updated_at >= ?"
  ).all(userId, today) as { history: string }[];

  let count = 0, wins = 0, losses = 0, pnl = 0;
  const startOfDay = new Date(today).getTime();

  for (const row of rows) {
    try {
      const hist = JSON.parse(row.history ?? "[]") as TradeEntry[];
      for (const t of hist) {
        const ts = typeof t.timestamp === "number" ? t.timestamp
          : t.timestamp ? new Date(t.timestamp).getTime() : 0;
        if (ts >= startOfDay && t.pnl != null) {
          count++;
          pnl += t.pnl;
          if (t.pnl > 0) wins++; else losses++;
        }
      }
    } catch { /* ignore */ }
  }
  return { count, wins, losses, pnl };
}

// Haal trades van afgelopen week op voor Sunday rapport
function getWeekTradesSummary(userId: number): { count: number; wins: number; losses: number; pnl: number; bestDay: string; worstDay: string } {
  const db = getDb();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const rows = db.prepare(
    "SELECT asset, history FROM paper_trading WHERE user_id = ? AND updated_at >= ?"
  ).all(userId, weekAgo) as { asset: string; history: string }[];

  let count = 0, wins = 0, losses = 0, pnl = 0;
  const dayPnl: Record<string, number> = {};
  const startOfWeek = new Date(weekAgo).getTime();
  const DAYS = ["zo", "ma", "di", "wo", "do", "vr", "za"];

  for (const row of rows) {
    try {
      const hist = JSON.parse(row.history ?? "[]") as TradeEntry[];
      for (const t of hist) {
        const ts = typeof t.timestamp === "number" ? t.timestamp
          : t.timestamp ? new Date(t.timestamp).getTime() : 0;
        if (ts >= startOfWeek && t.pnl != null) {
          count++;
          pnl += t.pnl;
          if (t.pnl > 0) wins++; else losses++;
          const day = DAYS[new Date(ts).getDay()];
          dayPnl[day] = (dayPnl[day] ?? 0) + t.pnl;
        }
      }
    } catch { /* ignore */ }
  }

  const entries = Object.entries(dayPnl);
  const bestDay = entries.length > 0 ? entries.reduce((a, b) => b[1] > a[1] ? b : a)[0] : "—";
  const worstDay = entries.length > 0 ? entries.reduce((a, b) => b[1] < a[1] ? b : a)[0] : "—";

  return { count, wins, losses, pnl, bestDay, worstDay };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ nudge: null });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");
  const db = getDb();
  const user = db.prepare(
    "SELECT last_login_at, username, login_streak, last_streak_date, last_greeting_date, streak_freeze FROM users WHERE id = ?"
  ).get(userId) as {
    last_login_at: string | null; username: string;
    login_streak: number; last_streak_date: string | null;
    last_greeting_date: string | null; streak_freeze: number;
  } | undefined;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0 = zondag

  // Streak berekening — freeze beschermt bij gemiste dag
  let newStreak = 1;
  let usedFreeze = false;
  if (user?.last_streak_date === today) {
    newStreak = user.login_streak || 1;
  } else if (user?.last_streak_date === yesterday) {
    newStreak = (user.login_streak || 0) + 1;
  } else if ((user?.streak_freeze ?? 0) > 0 && (user?.login_streak ?? 0) > 1) {
    // Streak zou breken maar freeze beschikbaar — consumeer freeze, behoud streak
    newStreak = user!.login_streak;
    usedFreeze = true;
    db.prepare("UPDATE users SET streak_freeze = streak_freeze - 1 WHERE id = ?").run(userId);
  }

  db.prepare("UPDATE users SET last_login_at = datetime('now'), login_streak = ?, last_streak_date = ? WHERE id = ?")
    .run(newStreak, today, userId);

  // Week score bijwerken (eenmalig per dag)
  const weekNum = String(Math.floor(Date.now() / (7 * 86_400_000)));
  const isFirstCallToday = user?.last_streak_date !== today;
  const isNewWeek = (db.prepare("SELECT week_key FROM users WHERE id = ?").get(userId) as { week_key: string } | undefined)?.week_key !== weekNum;
  if (isNewWeek) {
    db.prepare("UPDATE users SET week_score = 0, week_key = ? WHERE id = ?").run(weekNum, userId);
  }
  if (isFirstCallToday) {
    let dailyScore = 10;
    const quizDoneToday = db.prepare("SELECT 1 FROM quiz_progress WHERE user_id = ? AND last_quiz_date = ?").get(userId, today);
    if (quizDoneToday) dailyScore += 40;
    db.prepare("UPDATE users SET week_score = week_score + ? WHERE id = ?").run(dailyScore, userId);
  }

  // Laatste trade datum
  const paperRow = db.prepare(
    "SELECT history FROM paper_trading WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1"
  ).get(userId) as { history: string } | undefined;

  let lastTradeDate: string | null = null;
  if (paperRow?.history) {
    try {
      const hist = JSON.parse(paperRow.history) as TradeEntry[];
      const sorted = hist.filter(t => t.timestamp != null).sort((a, b) => {
        const ta = typeof a.timestamp === "number" ? a.timestamp : new Date(a.timestamp ?? 0).getTime();
        const tb = typeof b.timestamp === "number" ? b.timestamp : new Date(b.timestamp ?? 0).getTime();
        return tb - ta;
      });
      const last = sorted[0] ?? hist[hist.length - 1];
      if (last) {
        lastTradeDate = typeof last.timestamp === "number"
          ? new Date(last.timestamp).toISOString().slice(0, 10)
          : last.date ?? (last.timestamp as string | null) ?? null;
      }
    } catch { /* ignore */ }
  }

  const lastJournal = db.prepare("SELECT MAX(updated_at) as last FROM trade_journal WHERE user_id = ?")
    .get(userId) as { last: string | null } | undefined;

  const daysSinceTrade   = daysSince(lastTradeDate);
  const daysSinceJournal = daysSince(lastJournal?.last ?? null);
  const daysSinceLogin   = calendarDaysSince(user?.last_login_at ?? null) ?? 0;
  const btcSummary       = getBtcSummary();

  // Slump detectie — quiz prestaties + login streak
  const quizRow = db.prepare(
    "SELECT level, streak as quiz_streak, history FROM quiz_progress WHERE user_id = ?"
  ).get(userId) as { level: number; quiz_streak: number; history: string } | undefined;

  let recentQuizAvg = 100;
  let recentQuizCount = 0;
  try {
    const hist = JSON.parse(quizRow?.history ?? "[]") as { score: number; total: number }[];
    const recent = hist.slice(0, 5);
    recentQuizCount = recent.length;
    if (recentQuizCount > 0) {
      recentQuizAvg = Math.round(
        recent.reduce((sum, h) => sum + (h.total > 0 ? h.score / h.total : 0), 0) / recentQuizCount * 100
      );
    }
  } catch { /* ignore */ }

  const isSlump = newStreak < 3 && recentQuizAvg < 50 && recentQuizCount >= 2;

  const client = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null;

  // ── 1. MORNING GREETING (eenmalig per dag, ochtend) ──────────────────────
  let morningGreeting: string | null = null;
  const needsMorningGreeting = user?.last_greeting_date !== today && hour < 16;

  if (needsMorningGreeting && client && checkRate(`morning-${userId}`)) {
    const tradingPlan = db.prepare(
      "SELECT risk_per_trade, max_trades_per_day, max_daily_loss FROM trading_plan WHERE user_id = ?"
    ).get(userId) as { risk_per_trade?: number; max_trades_per_day?: number; max_daily_loss?: number } | undefined;

    const openPos = getOpenPositionsContext(userId);
    const planHint = tradingPlan
      ? `Max ${tradingPlan.risk_per_trade ?? 1}% risico/trade, max ${tradingPlan.max_trades_per_day ?? 3} trades/dag.`
      : "";
    const streakHint = newStreak >= 2 ? `Streak: ${newStreak} dagen.` : "";

    // Vriend-streak context — wie ligt voor?
    let friendHint = "";
    try {
      const friendRows = db.prepare(`
        SELECT u.login_streak, u.username
        FROM friendships f
        JOIN users u ON (CASE WHEN f.user_a = ? THEN f.user_b ELSE f.user_a END = u.id)
        WHERE (f.user_a = ? OR f.user_b = ?) AND u.login_streak > ?
        ORDER BY u.login_streak DESC LIMIT 1
      `).all(userId, userId, userId, newStreak) as { login_streak: number; username: string }[];
      if (friendRows.length > 0) {
        const ahead = friendRows[0];
        friendHint = `${ahead.username} heeft een streak van ${ahead.login_streak} dagen — ${ahead.login_streak - newStreak} meer dan jij.`;
      }
    } catch { /* geen vriendendata */ }

    try {
      const systemPrompt = isSlump
        ? `Je bent Marcus, directe tradingcoach. De trader scoort gemiddeld ${recentQuizAvg}% op de quizzen en heeft een streak van ${newStreak} dagen — ze zitten in een dip. Schrijf een eerlijke ochtendgroet in MAX 2 zinnen: erken dat het moeilijk gaat, geef één concrete actie voor vandaag. Geen valse hoop, geen aanmoedigingen — gewoon direct. Geen markdown, geen asterisken, geen bullets.`
        : `Je bent Marcus, directe tradingcoach. Ochtendgroet in MAX 2 zinnen. Direct, persoonlijk, geen aanhef. Gebruik "je/jij". Geen markdown, geen asterisken, geen bullets.
Context: ${btcSummary} ${openPos} ${planHint} ${streakHint}${friendHint ? ` Vrienden: ${friendHint}` : ""}`;

      const msg = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 100,
        system: systemPrompt,
        messages: [{ role: "user", content: "Goedemorgen." }],
      });
      morningGreeting = (msg.content[0] as { text: string }).text.trim();
      db.prepare("UPDATE users SET last_greeting_date = ? WHERE id = ?").run(today, userId);
    } catch { /* geen greeting als API faalt */ }
  }

  // ── 2. DISTRESS DETECTIE (altijd checken) ────────────────────────────────
  let distressAlert: string | null = null;
  const isDistressed = detectDistress(userId);

  if (isDistressed && client && checkRate(`distress-${userId}`)) {
    try {
      const msg = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 80,
        system: `Je bent Marcus. De trader heeft net snel achter elkaar getraded na een verlies — klassiek revenge trading patroon. Schrijf een DIRECTE interventie in 1-2 zinnen. Geen oordeel, wel duidelijk. Stop ze.`,
        messages: [{ role: "user", content: "Ik wil nog een trade doen." }],
      });
      distressAlert = (msg.content[0] as { text: string }).text.trim();
    } catch {
      distressAlert = "Wacht even. Je hebt net snel achter elkaar getraded na een verlies — dat is het patroon van revenge trading. Neem 10 minuten pauze.";
    }
  }

  // ── 3. EVENING REVIEW (18:00-23:00, eenmalig per dag) ───────────────────
  let eveningReview: string | null = null;
  const eveningKey = `${userId}-${today}`;
  const isEvening = hour >= 18 && hour < 24;

  if (isEvening) {
    if (eveningCache.has(eveningKey)) {
      eveningReview = eveningCache.get(eveningKey)!;
    } else if (client && checkRate(`evening-${userId}`)) {
      const trades = getTodayTradesSummary(userId);
      const hasActivity = trades.count > 0;

      try {
        const context = hasActivity
          ? `Vandaag: ${trades.count} trade(s), ${trades.wins} win / ${trades.losses} verlies, P&L: ${trades.pnl >= 0 ? "+" : ""}€${trades.pnl.toFixed(0)}.`
          : "De trader heeft vandaag geen trades gedaan.";

        const msg = await client.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 120,
          system: `Je bent Marcus. Schrijf een KORTE avondreview (max 3 zinnen). Reflecteer op vandaag. Wees eerlijk. Sluit af met één ding voor morgen. Geen markdown, geen asterisken, geen bullets. ${btcSummary}`,
          messages: [{ role: "user", content: context }],
        });
        eveningReview = (msg.content[0] as { text: string }).text.trim();
        eveningCache.set(eveningKey, eveningReview);
      } catch {
        eveningReview = hasActivity
          ? `${trades.count} trades vandaag. ${trades.wins > trades.losses ? "Goede dag — houd die discipline vast." : "Niet je beste dag, maar elke dag is een les."} Rust uit en kom morgen scherp.`
          : "Je hebt vandaag niet getraded. Dat kan ook de juiste keuze zijn. Morgen nieuwe kansen.";
        eveningCache.set(eveningKey, eveningReview);
      }
    }
  }

  // ── 4. SUNDAY WEEKLY RAPPORT (zondag, eenmalig per week) ─────────────────
  let weeklyReport: string | null = null;
  const weekKey = `${userId}-week${Math.floor(Date.now() / (7 * 86400000))}`;
  const isSundayMorning = dayOfWeek === 0 && hour >= 8;

  if (isSundayMorning) {
    if (weeklyCache.has(weekKey)) {
      weeklyReport = weeklyCache.get(weekKey)!;
    } else if (client && checkRate(`weekly-${userId}`)) {
      const week = getWeekTradesSummary(userId);

      try {
        const context = week.count > 0
          ? `Deze week: ${week.count} trades, winrate ${week.count > 0 ? Math.round((week.wins / week.count) * 100) : 0}%, P&L ${week.pnl >= 0 ? "+" : ""}€${week.pnl.toFixed(0)}. Beste dag: ${week.bestDay}, slechtste dag: ${week.worstDay}.`
          : "De trader heeft deze week geen trades gedaan.";

        const msg = await client.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 150,
          system: `Je bent Marcus. Schrijf een KORT wekelijks rapport (max 4 zinnen). Wat ging goed, wat kan beter, één doel voor volgende week. Geen markdown, geen asterisken, geen bullets, geen titels. ${btcSummary}`,
          messages: [{ role: "user", content: context }],
        });
        weeklyReport = (msg.content[0] as { text: string }).text.trim();
        weeklyCache.set(weekKey, weeklyReport);
      } catch {
        weeklyReport = week.count > 0
          ? `Week afgesloten: ${week.count} trades, ${Math.round((week.wins / week.count) * 100)}% winrate. ${week.pnl >= 0 ? "Positief resultaat" : "Negatieve week"} — analyseer wat je kan verbeteren. Volgende week scherper.`
          : "Stille week. Soms is niet traden de beste beslissing. Bereid je voor op de kansen die komen.";
        weeklyCache.set(weekKey, weeklyReport);
      }
    }
  }

  // ── NUDGE voor inactieve gebruikers ──────────────────────────────────────
  const recentlyActive =
    daysSinceLogin <= 1 ||
    (daysSinceTrade !== null && daysSinceTrade <= 1) ||
    (daysSinceJournal !== null && daysSinceJournal <= 1);

  if (recentlyActive) {
    return Response.json({
      nudge: null, active: true, streak: newStreak,
      morningGreeting, eveningReview, weeklyReport,
      distressAlert, isDistressed, isSlump,
    });
  }

  if (daysSinceLogin < 2) {
    return Response.json({
      nudge: null, streak: newStreak,
      morningGreeting, eveningReview, weeklyReport,
      distressAlert, isDistressed, isSlump,
    });
  }

  if (!checkRate(String(userId))) {
    return Response.json({
      nudge: null, streak: newStreak,
      morningGreeting, eveningReview, weeklyReport,
      distressAlert, isDistressed, isSlump,
    });
  }

  const inactiveDays = Math.min(14, daysSinceLogin);
  const neverTraded = !lastTradeDate;

  if (!client) {
    const fallbacks = [
      "De markt beweegt terwijl je weg bent — even een blik werpen?",
      "Kom terug en check wat er speelt. 5 minuten is genoeg.",
    ];
    return Response.json({
      nudge: fallbacks[Math.floor(Math.random() * fallbacks.length)],
      inactiveDays, streak: newStreak,
      morningGreeting, eveningReview, weeklyReport,
      distressAlert, isDistressed, isSlump,
    });
  }

  const context = neverTraded
    ? "een nieuwe trader die terugkomt en nog geen paper trade heeft gedaan"
    : `een trader die terugkomt na ${inactiveDays} ${inactiveDays === 1 ? "dag" : "dagen"} afwezigheid`;

  const msg2 = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 120,
    system: `Je bent Marcus. Korte welkomstboodschap (max 2 zinnen) voor ${context}. Direct, positief, concreet. Geen aanhef.${btcSummary ? ` ${btcSummary}` : ""}`,
    messages: [{ role: "user", content: "Geef me een nudge." }],
  });

  const nudge = (msg2.content[0] as { text: string }).text.trim();
  return Response.json({
    nudge, inactiveDays, streak: newStreak,
    morningGreeting, eveningReview, weeklyReport,
    distressAlert, isDistressed, isSlump, usedFreeze,
  });
}
