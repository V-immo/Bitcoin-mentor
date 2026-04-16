import { auth } from "@/auth";
import { getDb } from "@/db/db";
import Anthropic from "@anthropic-ai/sdk";

// Cache certificaat-berichten per user — niet nodig om elke call opnieuw te genereren
const certCache = new Map<number, { text: string; ts: number }>();

type TradeEntry = { pnl?: number; side?: string; timestamp?: number };

function calcPaperTradeStats(userId: number): {
  count: number;
  avgWin: number;
  avgLoss: number;
  rrRatio: number;
} {
  const db = getDb();
  const rows = db.prepare(
    "SELECT history FROM paper_trading WHERE user_id = ?"
  ).all(userId) as { history: string }[];

  const wins: number[] = [];
  const losses: number[] = [];

  for (const row of rows) {
    try {
      const hist = JSON.parse(row.history ?? "[]") as TradeEntry[];
      for (const t of hist) {
        if (t.pnl == null) continue;
        if (t.side === "sell" || t.side === "SELL") {
          if (t.pnl > 0) wins.push(t.pnl);
          else if (t.pnl < 0) losses.push(Math.abs(t.pnl));
        }
      }
    } catch { /* ignore */ }
  }

  const count = wins.length + losses.length;
  const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 1;
  const rrRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

  return { count, avgWin, avgLoss, rrRatio };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const userId = parseInt((session.user as { id?: string }).id ?? "0");
  const db = getDb();

  // 1. Quiz/curriculum voortgang
  const quizRow = db.prepare(
    "SELECT level, xp, streak, history FROM quiz_progress WHERE user_id = ?"
  ).get(userId) as { level: number; xp: number; streak: number; history: string } | undefined;

  const quizLevel = quizRow?.level ?? 1;
  let quizAvgScore = 0;
  try {
    const hist = JSON.parse(quizRow?.history ?? "[]") as { score: number; total: number }[];
    if (hist.length > 0) {
      quizAvgScore = hist.reduce((sum, h) => sum + (h.total > 0 ? h.score / h.total : 0), 0) / hist.length * 100;
    }
  } catch { /* ignore */ }

  // 2. Paper trades
  const { count: tradeCount, rrRatio } = calcPaperTradeStats(userId);

  // 3. Streak
  const userRow = db.prepare(
    "SELECT login_streak, username FROM users WHERE id = ?"
  ).get(userId) as { login_streak: number; username: string } | undefined;
  const loginStreak = userRow?.login_streak ?? 0;
  const username = userRow?.username ?? "Trader";

  // Vereisten (drempelwaarden)
  const QUIZ_LEVEL_MIN    = 5;
  const QUIZ_SCORE_MIN    = 70;     // gemiddeld %
  const TRADE_COUNT_MIN   = 20;
  const RR_MIN            = 1.5;    // gem. R/R ≥ 1:1.5
  const STREAK_MIN        = 14;

  const curriculumDone = quizLevel >= QUIZ_LEVEL_MIN && quizAvgScore >= QUIZ_SCORE_MIN;
  const tradesDone     = tradeCount >= TRADE_COUNT_MIN && rrRatio >= RR_MIN;
  const streakDone     = loginStreak >= STREAK_MIN;
  const allDone        = curriculumDone && tradesDone && streakDone;

  // Certificaat (alleen als alles klaar is)
  let certificate: string | null = null;
  if (allDone) {
    const cached = certCache.get(userId);
    if (cached && Date.now() - cached.ts < 24 * 3600_000) {
      certificate = cached.text;
    } else {
      const client = process.env.ANTHROPIC_API_KEY
        ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        : null;

      if (client) {
        try {
          const msg = await client.messages.create({
            model: "claude-haiku-4-5",
            max_tokens: 200,
            system: `Je bent Marcus, een directe en eerlijke trading coach. Schrijf een PERSOONLIJK certificaat-bericht voor een student die alle vereisten voor live trading heeft behaald.
Regels:
- Max 4 zinnen. Spreek de trader direct aan als "${username}".
- Eerlijk en direct — geen overdreven enthousiasme.
- Benoem dat dit een echte prestatie is, maar dat live trading een nieuwe fase is met nieuwe uitdagingen.
- Sluit af met één concreet stuk advies voor de eerste live trade.`,
            messages: [{ role: "user", content: "Genereer mijn certificaat." }],
          });
          certificate = (msg.content[0] as { text: string }).text.trim();
          certCache.set(userId, { text: certificate, ts: Date.now() });
        } catch {
          certificate = `${username}, je hebt bewezen dat je klaar bent. Niveau 1–6 voltooid, 20+ paper trades met positieve R/R, 14 dagen consistentie. Dat is geen geluk — dat is discipline. Ga nu live met maximaal 1% risico per trade, en behandel de eerste 20 live trades als paper trades: oefening met echte consequenties.`;
          certCache.set(userId, { text: certificate, ts: Date.now() });
        }
      }
    }
  }

  return Response.json({
    username,
    curriculum: {
      quizLevel,
      quizLevelMin: QUIZ_LEVEL_MIN,
      quizAvgScore: Math.round(quizAvgScore),
      quizScoreMin: QUIZ_SCORE_MIN,
      done: curriculumDone,
    },
    trades: {
      count: tradeCount,
      countMin: TRADE_COUNT_MIN,
      rrRatio: Math.round(rrRatio * 100) / 100,
      rrMin: RR_MIN,
      done: tradesDone,
    },
    streak: {
      days: loginStreak,
      daysMin: STREAK_MIN,
      done: streakDone,
    },
    allDone,
    certificate,
  });
}
