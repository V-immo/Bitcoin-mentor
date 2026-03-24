import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { generateAndSaveQuestions, LEVEL_TOPICS } from "@/app/api/quiz/route";
import { getCandles, calculateRsi } from "@/lib/market";

// Pre-genereer een batch vragen voor de pool (alleen admin)
// POST /api/quiz/generate  { level: 1-5, batchSize: 20 }
// GET  /api/quiz/generate  → pool statistieken

async function getMarketSnapshot(): Promise<string> {
  try {
    const [btcCandles] = await Promise.all([getCandles("4h", 14, "BTCUSDT")]);
    const btcPrice = btcCandles[btcCandles.length - 1]?.close ?? 0;
    const btcRsi = calculateRsi(btcCandles, 14);
    return `BTC: $${Math.round(btcPrice).toLocaleString("en-US")} (RSI 4H: ${btcRsi.toFixed(0)})`;
  } catch {
    return "BTC data tijdelijk niet beschikbaar";
  }
}

export async function GET() {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "admin") {
    return Response.json({ error: "Geen toegang" }, { status: 403 });
  }

  const db = getDb();
  const stats = db.prepare(
    "SELECT level, COUNT(*) as total, SUM(times_shown) as shown FROM quiz_pool GROUP BY level ORDER BY level"
  ).all() as { level: number; total: number; shown: number }[];

  const totalShown = db.prepare(
    "SELECT COUNT(DISTINCT user_id) as users, COUNT(*) as shown FROM quiz_shown"
  ).get() as { users: number; shown: number };

  return Response.json({ stats, totalShown });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "admin") {
    return Response.json({ error: "Geen toegang" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const targetLevel: number | null = body.level ? Number(body.level) : null;
  const batchSize: number = Math.min(Number(body.batchSize ?? 10), 20);
  const levels = targetLevel ? [targetLevel] : [1, 2, 3, 4, 5];

  const marketSnapshot = await getMarketSnapshot();
  const results: { level: number; added: number }[] = [];

  for (const level of levels) {
    const allTopics = LEVEL_TOPICS[level] ?? LEVEL_TOPICS[1];
    // Varieer topics per batch
    const shuffled = [...allTopics].sort(() => Math.random() - 0.5);
    const topics = shuffled.slice(0, Math.min(batchSize, shuffled.length));

    try {
      const questions = await generateAndSaveQuestions(level, topics, marketSnapshot, batchSize);
      results.push({ level, added: questions.length });
    } catch (err) {
      results.push({ level, added: 0 });
      console.error(`Quiz generate level ${level} mislukt:`, err);
    }
  }

  const total = results.reduce((s, r) => s + r.added, 0);
  return Response.json({ ok: true, added: total, results });
}
