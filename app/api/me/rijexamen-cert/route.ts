import { auth } from "@/auth";
import { getDb } from "@/db/db";
import Anthropic from "@anthropic-ai/sdk";

// Cache certificate per user — avoid regenerating on every page load
const certCache = new Map<number, string>();

const QUIZ_LEVEL_MIN = 5;
const TRADE_COUNT_MIN = 20;
const RR_MIN = 1.5;
const STREAK_MIN = 14;

type TradeEntry = {
  pnl?: number;
  side?: string;
  entryPrice?: number;
  exitPrice?: number;
  stopLoss?: number;
};

function calcQualifiedTrades(userId: number): { qualified: number; avgRR: number } {
  const db = getDb();
  const rows = db
    .prepare("SELECT history FROM paper_trading WHERE user_id = ?")
    .all(userId) as { history: string }[];

  const rrValues: number[] = [];

  for (const row of rows) {
    try {
      const hist = JSON.parse(row.history ?? "[]") as TradeEntry[];
      for (const t of hist) {
        if (t.side !== "sell" && t.side !== "SELL") continue;
        if (typeof t.pnl !== "number" || t.pnl <= 0) continue;
        // Prefer precise R/R from stored prices
        if (
          typeof t.entryPrice === "number" &&
          typeof t.exitPrice === "number" &&
          typeof t.stopLoss === "number" &&
          t.stopLoss < t.entryPrice &&
          t.exitPrice > t.entryPrice
        ) {
          const reward = t.exitPrice - t.entryPrice;
          const risk = t.entryPrice - t.stopLoss;
          if (risk > 0) {
            rrValues.push(reward / risk);
          }
        } else {
          // Fallback: positive pnl counts as R/R = 1 (minimum)
          rrValues.push(1);
        }
      }
    } catch {
      /* ignore */
    }
  }

  const qualified = rrValues.length;
  const avgRR =
    qualified > 0
      ? rrValues.reduce((a, b) => a + b, 0) / qualified
      : 0;

  return { qualified, avgRR };
}

export async function POST() {
  const session = await auth();
  if (!session?.user)
    return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const userId = parseInt((session.user as { id?: string }).id ?? "0");
  if (!userId)
    return Response.json({ error: "Ongeldig account" }, { status: 401 });

  const db = getDb();

  // --- Check requirement 1: quiz level ≥ 5 ---
  const quizRow = db
    .prepare("SELECT level FROM quiz_progress WHERE user_id = ?")
    .get(userId) as { level: number } | undefined;
  const quizLevel = quizRow?.level ?? 1;

  // --- Check requirement 2: 20 qualified trades with avg R/R ≥ 1.5 ---
  const { qualified, avgRR } = calcQualifiedTrades(userId);

  // --- Check requirement 3: login_streak ≥ 14 ---
  const userRow = db
    .prepare("SELECT login_streak, username FROM users WHERE id = ?")
    .get(userId) as { login_streak: number; username: string } | undefined;
  const loginStreak = userRow?.login_streak ?? 0;
  const username = userRow?.username ?? "Trader";

  const req1 = quizLevel >= QUIZ_LEVEL_MIN;
  const req2 = qualified >= TRADE_COUNT_MIN && avgRR >= RR_MIN;
  const req3 = loginStreak >= STREAK_MIN;

  if (!req1 || !req2 || !req3) {
    return Response.json({ error: "Requirements not met" }, { status: 403 });
  }

  // --- Serve from cache if available ---
  const cached = certCache.get(userId);
  if (cached) {
    return Response.json({ certificate: cached });
  }

  // --- Generate with Claude Haiku ---
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const fallback = `${username}, you've done the work. The curriculum, the trades, the consistency — all three boxes checked, no shortcuts. Real trading starts now: risk no more than 1% per trade, and treat your first 20 live trades like paper trades with real consequences.`;
    certCache.set(userId, fallback);
    return Response.json({ certificate: fallback });
  }

  const client = new Anthropic({ apiKey });

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: `You are Marcus. Write a short, personal, direct congratulations (2-3 sentences max) for a trader who just completed the Road to Live Trading. Use their name: ${username}. Tell them what they proved. End with one concrete reminder about real trading. No bullet points. Write like a person, not a report.`,
        },
      ],
    });

    const text = (msg.content[0] as { text: string }).text.trim();
    certCache.set(userId, text);
    return Response.json({ certificate: text });
  } catch {
    const fallback = `${username}, you've done the work. The curriculum, the trades, the consistency — all three boxes checked, no shortcuts. Real trading starts now: risk no more than 1% per trade, and treat your first 20 live trades like paper trades with real consequences.`;
    certCache.set(userId, fallback);
    return Response.json({ certificate: fallback });
  }
}
