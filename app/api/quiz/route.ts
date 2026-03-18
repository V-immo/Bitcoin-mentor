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
  1: [
    "RSI basics", "wat is een stop-loss", "wat is een koopzone", "bull vs bear markt", "waarom risk management",
    "wat zijn candlesticks", "wat is een trend", "verschil kopen en verkopen", "wat is een exchange",
    "wat is marktkapitalisatie", "waarom beweegt de prijs", "wat is liquiditeit", "hoe werkt paper trading",
    "wat is een portfolio", "wat is diversificatie",
  ],
  2: [
    "trend herkennen", "support en resistance", "positiegrootte berekenen", "R/R verhouding", "timeframes",
    "hogere highs en hogere lows", "breakout herkennen", "fake breakout", "wat is een pullback",
    "moving averages uitleg", "RSI divergentie", "wanneer wachten vs kopen", "hoe stel je stop-loss in",
    "wat is een swing trade", "hoe bereken je winst percentage",
  ],
  3: [
    "MA crossovers", "marktstructuur", "volume analyse", "swing vs day trading", "FOMO herkennen",
    "multi-timeframe bevestiging", "wat is een orderblok", "bearish vs bullish divergentie",
    "hoe werkt Fibonacci retracement", "correctie vs trend ommekeer", "consolidatie herkennen",
    "trailing stop-loss", "wat is een risk/reward van 1:3", "psychologie van verliesnemers",
    "hoe lees je de orderbook",
  ],
  4: [
    "multi-timeframe analyse", "koopzone vs marktprijs", "macro invloed op crypto", "halving cyclus", "institutioneel gedrag",
    "hoe werken funding rates", "open interest interpretatie", "BTC dominantie als indicator",
    "on-chain data basics", "het belang van marktcyclussen", "narratief gedreven markten",
    "liquiditeit sweeps", "hoe handel je rond macro events", "correlatie BTC en S&P 500",
    "DCA strategie voor gevorderden",
  ],
  5: [
    "geavanceerde entry timing", "correlaties tussen assets", "funding rates", "news trading", "psychologie bij verlies",
    "smart money concepten", "supply and demand zones", "hoe lees je grote spelers af",
    "orderflow analyse", "hoe werk je met een trading journal", "hoe evalueer je je trades",
    "consistentie vs winratio", "positiebeheer tijdens een trade", "hoe schaal je in en uit",
    "het bouwen van een persoonlijk trading systeem",
  ],
};

function pickRandomTopics(topics: string[], count: number): string[] {
  const shuffled = [...topics].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

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
  const allTopics = LEVEL_TOPICS[level] ?? LEVEL_TOPICS[1];
  const questionCount = level <= 2 ? 5 : level <= 3 ? 6 : 7;

  // Kies willekeurige topics — mix zwakke punten met willekeurige nieuwe
  const randomTopics = pickRandomTopics(allTopics, Math.min(questionCount, allTopics.length));
  const focusTopics = weakTopics.length > 0
    ? [...new Set([...weakTopics.slice(0, 2), ...randomTopics])].slice(0, questionCount)
    : randomTopics;

  const dateStr = new Date().toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long" });

  const prompt = `Je bent een trading-quiz generator voor een lerende trader op niveau ${level}/5.
Datum van vandaag: ${dateStr}

ACTUELE MARKTDATA (gebruik dit in je vragen!):
${marketSnapshot}

ONDERWERPEN voor deze sessie (${level}/5) — kies hieruit, varieer elke keer anders:
${focusTopics.join(", ")}
${weakTopics.length > 0 ? `\nFOCUS OP ZWAKKE PUNTEN VAN DEZE TRADER: ${weakTopics.join(", ")}` : ""}
${todayTopic ? `\nHUIDIGE MARKTGEBEURTENIS: ${todayTopic}` : ""}

Genereer precies ${questionCount} UNIEKE quizvragen. De vragen moeten:
1. NOOIT dezelfde vragen zijn als een vorige sessie — gebruik de datum als seed voor variatie
2. Realistisch zijn — gebruik de actuele marktdata hierboven in minstens 2 vragen
3. Aansluiten bij niveau ${level} (${level <= 2 ? "eenvoudig en fundamenteel" : level <= 3 ? "gemiddeld en praktisch" : "geavanceerd en analytisch"})
4. Educatief zijn — de uitleg leert de trader iets echts
5. Gevarieerd zijn — mix van concepten, berekeningen en echte scenario's

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
