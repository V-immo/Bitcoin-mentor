import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCandles, calculateRsi } from "@/lib/market";
import { getYahooPrice } from "@/lib/yahoo";
import { auth } from "@/auth";
import { getDb } from "@/db/db";

// Rate limiting: max 3 quiz generaties per dag per user
const quizRateMap = new Map<string, { count: number; resetAt: number }>();
const QUIZ_MAX = 3;

function checkQuizRate(key: string): boolean {
  const now = Date.now();
  // Reset om middernacht (begin van de dag)
  const tomorrow = new Date();
  tomorrow.setHours(24, 0, 0, 0);
  const resetAt = tomorrow.getTime();

  const entry = quizRateMap.get(key);
  if (!entry || now > entry.resetAt) {
    quizRateMap.set(key, { count: 1, resetAt });
    return true;
  }
  if (entry.count >= QUIZ_MAX) return false;
  entry.count++;
  return true;
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LEVEL_TOPICS: Record<number, string[]> = {
  1: ["RSI basics", "wat is een stop-loss", "wat is een koopzone", "bull vs bear markt", "waarom risk management"],
  2: ["trend herkennen", "support en resistance", "positiegrootte berekenen", "R/R verhouding", "timeframes"],
  3: ["MA crossovers", "marktstructuur", "volume analyse", "swing vs day trading", "FOMO herkennen"],
  4: ["multi-timeframe analyse", "koopzone vs marktprijs", "macro invloed op crypto", "halving cyclus", "institutioneel gedrag"],
  5: ["geavanceerde entry timing", "correlaties tussen assets", "funding rates", "news trading", "psychologie bij verlies"],
};

async function getMarketSnapshot(): Promise<string> {
  const timeout = (ms: number) => new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), ms)
  );

  try {
    const [btcCandles, ethCandles] = await Promise.race([
      Promise.all([getCandles("4h", 14, "BTCUSDT"), getCandles("4h", 14, "ETHUSDT")]),
      timeout(6000).then(() => { throw new Error("timeout"); }),
    ]);

    const btcPrice = btcCandles[btcCandles.length - 1]?.close ?? 0;
    const ethPrice = ethCandles[ethCandles.length - 1]?.close ?? 0;
    const btcRsi = calculateRsi(btcCandles, 14);
    const ethRsi = calculateRsi(ethCandles, 14);

    const btcChange = btcCandles.length >= 2
      ? (((btcPrice - btcCandles[0].close) / btcCandles[0].close) * 100).toFixed(1)
      : "0";

    return [
      `BTC: $${Math.round(btcPrice).toLocaleString("en-US")} (RSI 4H: ${btcRsi.toFixed(0)}, verandering ${btcChange}%)`,
      `ETH: $${ethPrice.toFixed(0)} (RSI 4H: ${ethRsi.toFixed(0)})`,
    ].join("\n");
  } catch {
    return `BTC en ETH data tijdelijk niet beschikbaar — gebruik actuele prijzen uit je geheugen.`;
  }
}

export type QuizQuestion = {
  id: string;
  topic: string;
  question: string;
  context?: string;
  options: string[];
  correct: string; // "A", "B", "C" or "D"
  explanation: string;
  difficulty: number; // 1-5
};

export type QuizResponse = {
  questions: QuizQuestion[];
  marketSnapshot: string;
  generatedAt: string;
};

export async function POST(request: NextRequest) {
  // Auth: haal quiz profiel uit DB als ingelogd
  const session = await auth();
  const userId = parseInt((session?.user as { id?: string })?.id ?? "0") || null;

  // Rate limit: 3 quiz generaties per dag per user
  const rateKey = userId ? `user:${userId}` : (request.headers.get("x-forwarded-for") ?? "anon");
  if (!checkQuizRate(rateKey)) {
    return Response.json(
      { error: "Je hebt het dagelijkse quotum bereikt (3 quizzen/dag). Kom morgen terug!" },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  let level: number = body.level ?? 1;
  let weakTopics: string[] = body.weakTopics ?? [];
  const todayTopic: string = body.todayTopic ?? "";

  if (userId) {
    try {
      const db = getDb();
      const quiz = db
        .prepare("SELECT level, weak_topics FROM quiz_progress WHERE user_id = ?")
        .get(userId) as { level: number; weak_topics: string } | undefined;
      if (quiz) {
        level = quiz.level;
        weakTopics = JSON.parse(quiz.weak_topics ?? "[]");
      }
    } catch { /* gebruik body values als fallback */ }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "API key ontbreekt" }, { status: 500 });
  }

  const marketSnapshot = await getMarketSnapshot();
  const topics = LEVEL_TOPICS[level] ?? LEVEL_TOPICS[1];
  const focusTopics = weakTopics.length > 0
    ? [...weakTopics.slice(0, 2), ...topics.slice(0, 3)]
    : topics;

  const questionCount = level <= 2 ? 5 : level <= 3 ? 6 : 7;

  const prompt = `Je bent een trading-quiz generator voor een lerende trader op niveau ${level}/5.

ACTUELE MARKTDATA (gebruik dit in je vragen!):
${marketSnapshot}

ONDERWERPEN voor dit level (${level}/5):
${focusTopics.join(", ")}
${weakTopics.length > 0 ? `\nFOCUS OP ZWAKKE PUNTEN: ${weakTopics.join(", ")}` : ""}
${todayTopic ? `\nHUIDIGE MARKTGEBEURTENIS: ${todayTopic}` : ""}

Genereer precies ${questionCount} quizvragen. De vragen moeten:
1. Realistisch zijn — gebruik de actuele marktdata hierboven in minstens 2 vragen
2. Aansluiten bij niveau ${level} (${level <= 2 ? "eenvoudig en fundamenteel" : level <= 3 ? "gemiddeld en praktisch" : "geavanceerd en analytisch"})
3. Educatief zijn — de uitleg leert de trader iets echts
4. Gevarieerd zijn — mix van concepten, berekeningen en echte scenario's

Geef terug als JSON array (alleen de array, geen extra tekst):
[
  {
    "id": "1",
    "topic": "onderwerp",
    "question": "De vraag (mag context van actuele markt bevatten)",
    "context": "optionele extra context of scenario (1 zin)",
    "options": ["A. optie1", "B. optie2", "C. optie3", "D. optie4"],
    "correct": "A",
    "explanation": "Uitleg van 2-3 zinnen waarom dit correct is en wat je hiervan leert.",
    "difficulty": ${level}
  }
]

Zorg dat exact één antwoord correct is en de andere 3 plausibel maar fout zijn.`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "[]";

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Geen JSON gevonden in response");

    const questions: QuizQuestion[] = JSON.parse(jsonMatch[0]);

    return Response.json({
      questions,
      marketSnapshot,
      generatedAt: new Date().toISOString(),
    } satisfies QuizResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return Response.json({ error: `Quiz genereren mislukt: ${msg}` }, { status: 500 });
  }
}
