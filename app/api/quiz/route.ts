import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCandles, calculateRsi } from "@/lib/market";
import { auth } from "@/auth";
import { getDb } from "@/db/db";

// Rate limiting: max 10 quiz sessies per dag per user
const quizRateMap = new Map<string, { count: number; resetAt: number }>();
const QUIZ_MAX = 10;

function checkQuizRate(key: string): boolean {
  const now = Date.now();
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

export const LEVEL_TOPICS: Record<number, string[]> = {
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

export const LEVEL_TOPICS_EN: Record<number, string[]> = {
  1: [
    "RSI basics", "what is a stop-loss", "what is a buy zone", "bull vs bear market", "why risk management matters",
    "what are candlesticks", "what is a trend", "difference between buying and selling", "what is an exchange",
    "what is market capitalization", "why does price move", "what is liquidity", "how does paper trading work",
    "what is a portfolio", "what is diversification",
  ],
  2: [
    "identifying trends", "support and resistance", "calculating position size", "R/R ratio", "timeframes",
    "higher highs and higher lows", "recognizing breakouts", "fake breakout", "what is a pullback",
    "moving averages explained", "RSI divergence", "when to wait vs buy", "how to set a stop-loss",
    "what is a swing trade", "how to calculate profit percentage",
  ],
  3: [
    "MA crossovers", "market structure", "volume analysis", "swing vs day trading", "recognizing FOMO",
    "multi-timeframe confirmation", "what is an order block", "bearish vs bullish divergence",
    "how Fibonacci retracement works", "correction vs trend reversal", "recognizing consolidation",
    "trailing stop-loss", "what is a 1:3 risk/reward", "psychology of loss takers",
    "how to read the order book",
  ],
  4: [
    "multi-timeframe analysis", "buy zone vs market price", "macro influence on crypto", "halving cycle", "institutional behavior",
    "how funding rates work", "open interest interpretation", "BTC dominance as indicator",
    "on-chain data basics", "the importance of market cycles", "narrative-driven markets",
    "liquidity sweeps", "trading around macro events", "BTC and S&P 500 correlation",
    "DCA strategy for advanced traders",
  ],
  5: [
    "advanced entry timing", "correlations between assets", "funding rates", "news trading", "psychology of loss",
    "smart money concepts", "supply and demand zones", "reading large players",
    "order flow analysis", "working with a trading journal", "evaluating your trades",
    "consistency vs win rate", "position management during a trade", "scaling in and out",
    "building a personal trading system",
  ],
};

// Zorg dat quiz_pool en quiz_shown bestaan (auto-migrate)
function ensureQuizTables() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_pool (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      level         INTEGER NOT NULL,
      lang          TEXT    NOT NULL DEFAULT 'nl',
      topic         TEXT    NOT NULL,
      question_json TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      times_shown   INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS quiz_shown (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES quiz_pool(id) ON DELETE CASCADE,
      shown_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      correct     INTEGER,
      UNIQUE(user_id, question_id)
    );
    CREATE INDEX IF NOT EXISTS idx_quiz_pool_level ON quiz_pool(level);
    CREATE INDEX IF NOT EXISTS idx_quiz_pool_lang ON quiz_pool(level, lang);
    CREATE INDEX IF NOT EXISTS idx_quiz_shown_user ON quiz_shown(user_id, question_id);
  `);
  // Add lang column to existing table if missing (migration)
  try { db.exec(`ALTER TABLE quiz_pool ADD COLUMN lang TEXT NOT NULL DEFAULT 'nl'`); } catch { /* already exists */ }
}

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
      timeout(3000).then(() => { throw new Error("timeout"); }),
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
  correct: string;
  explanation: string;
  difficulty: number;
};

export type QuizResponse = {
  questions: QuizQuestion[];
  marketSnapshot: string;
  generatedAt: string;
  fromCache?: boolean;
};

// Genereer vragen via AI en sla op in pool
export async function generateAndSaveQuestions(
  level: number,
  topics: string[],
  marketSnapshot: string,
  count: number,
  lang: "nl" | "en" = "nl"
): Promise<QuizQuestion[]> {
  const locale = lang === "en" ? "en-US" : "nl-BE";
  const dateStr = new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });

  const prompt = lang === "en"
    ? `You are a trading quiz generator for a learning trader at level ${level}/5.
Today's date: ${dateStr}

CURRENT MARKET DATA (use this in your questions!):
${marketSnapshot}

TOPICS for this session (${level}/5) — choose from these, vary each time:
${topics.join(", ")}

Generate exactly ${count} UNIQUE quiz questions. The questions must:
1. NEVER be the same as a previous session — use the date as a seed for variation
2. Be realistic — use the current market data above in at least 2 questions
3. Match level ${level} (${level <= 2 ? "simple and fundamental" : level <= 3 ? "intermediate and practical" : "advanced and analytical"})
4. Be educational — the explanation teaches the trader something real
5. Be varied — mix of concepts, calculations and real scenarios

Return as JSON array (only the array, no extra text):
[
  {
    "id": "1",
    "topic": "topic",
    "question": "The question (may include current market context)",
    "context": "optional extra context or scenario (1 sentence)",
    "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
    "correct": "A",
    "explanation": "Explanation of 2-3 sentences why this is correct and what you learn from it.",
    "difficulty": ${level}
  }
]

Make sure exactly one answer is correct and the other 3 are plausible but wrong.`
    : `Je bent een trading-quiz generator voor een lerende trader op niveau ${level}/5.
Datum van vandaag: ${dateStr}

ACTUELE MARKTDATA (gebruik dit in je vragen!):
${marketSnapshot}

ONDERWERPEN voor deze sessie (${level}/5) — kies hieruit, varieer elke keer anders:
${topics.join(", ")}

Genereer precies ${count} UNIEKE quizvragen. De vragen moeten:
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

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1200,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "[]";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Geen JSON gevonden in AI response");
  const questions: QuizQuestion[] = JSON.parse(jsonMatch[0]);

  // Sla op in pool
  const db = getDb();
  const insert = db.prepare(
    "INSERT INTO quiz_pool (level, lang, topic, question_json) VALUES (?, ?, ?, ?)"
  );
  const insertMany = db.transaction((qs: QuizQuestion[]) => {
    for (const q of qs) {
      insert.run(level, lang, q.topic, JSON.stringify(q));
    }
  });
  insertMany(questions);

  return questions;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = parseInt((session?.user as { id?: string })?.id ?? "0") || null;

  const rateKey = userId ? `user:${userId}` : (request.headers.get("x-forwarded-for") ?? "anon");
  if (!checkQuizRate(rateKey)) {
    return Response.json({ error: "RATE_LIMIT" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  let level: number = body.level ?? 1;
  let weakTopics: string[] = body.weakTopics ?? [];
  const todayTopic: string = body.todayTopic ?? "";
  const lang: "nl" | "en" = body.lang === "en" ? "en" : "nl";
  const topics = lang === "en" ? LEVEL_TOPICS_EN : LEVEL_TOPICS;

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

  const questionCount = level <= 2 ? 5 : level <= 3 ? 6 : 7;

  // Zorg dat tabellen bestaan
  ensureQuizTables();

  // === CACHE-FIRST: probeer ongeziene vragen uit de pool ===
  if (userId) {
    try {
      const db = getDb();
      // Haal ongeziene vragen op (niet getoond in de laatste 30 dagen)
      const unseenRows = db.prepare(`
        SELECT id, topic, question_json FROM quiz_pool
        WHERE level = ? AND lang = ?
          AND id NOT IN (
            SELECT question_id FROM quiz_shown
            WHERE user_id = ? AND shown_at > datetime('now', '-30 days')
          )
        ORDER BY RANDOM()
        LIMIT ?
      `).all(level, lang, userId, questionCount) as { id: number; topic: string; question_json: string }[];

      if (unseenRows.length >= questionCount) {
        // Markeer als getoond
        const markShown = db.prepare(
          "INSERT OR REPLACE INTO quiz_shown (user_id, question_id) VALUES (?, ?)"
        );
        const updateShown = db.prepare(
          "UPDATE quiz_pool SET times_shown = times_shown + 1 WHERE id = ?"
        );
        db.transaction(() => {
          for (const row of unseenRows) {
            markShown.run(userId, row.id);
            updateShown.run(row.id);
          }
        })();

        const questions: QuizQuestion[] = unseenRows.map(row => JSON.parse(row.question_json));
        const marketSnapshot = await getMarketSnapshot();

        // Trigger async background refill als pool bijna leeg raakt (<20 ongezien)
        const remaining = db.prepare(`
          SELECT COUNT(*) as n FROM quiz_pool
          WHERE level = ? AND lang = ?
            AND id NOT IN (
              SELECT question_id FROM quiz_shown
              WHERE user_id = ? AND shown_at > datetime('now', '-30 days')
            )
        `).get(level, lang, userId) as { n: number };

        if (remaining.n < 20) {
          const allTopics = topics[level] ?? topics[1];
          const refillTopics = pickRandomTopics(allTopics, questionCount);
          // Async refill — wacht niet op resultaat
          getMarketSnapshot().then(snap =>
            generateAndSaveQuestions(level, refillTopics, snap, questionCount, lang)
          ).catch(() => {});
        }

        return Response.json({
          questions,
          marketSnapshot,
          generatedAt: new Date().toISOString(),
          fromCache: true,
        } satisfies QuizResponse);
      }
    } catch {
      // Val terug op AI-generatie als pool lookup mislukt
    }
  }

  // === LIVE GENERATIE (pool leeg of niet ingelogd) ===
  const marketSnapshot = await getMarketSnapshot();
  const allTopics = topics[level] ?? topics[1];
  const randomTopics = pickRandomTopics(allTopics, Math.min(questionCount, allTopics.length));
  const focusTopics = weakTopics.length > 0
    ? [...new Set([...weakTopics.slice(0, 2), ...randomTopics])].slice(0, questionCount)
    : randomTopics;

  if (todayTopic) focusTopics.unshift(todayTopic);

  try {
    const questions = await generateAndSaveQuestions(level, focusTopics, marketSnapshot, questionCount, lang);

    // Markeer als getoond voor ingelogde gebruiker
    if (userId) {
      try {
        const db = getDb();
        // Haal de IDs op van net gegenereerde vragen (laatste questionCount rijen voor dit level)
        const newRows = db.prepare(
          "SELECT id FROM quiz_pool WHERE level = ? ORDER BY id DESC LIMIT ?"
        ).all(level, questionCount) as { id: number }[];
        const markShown = db.prepare(
          "INSERT OR IGNORE INTO quiz_shown (user_id, question_id) VALUES (?, ?)"
        );
        db.transaction(() => {
          for (const row of newRows) markShown.run(userId, row.id);
        })();
      } catch { /* ignore */ }
    }

    return Response.json({
      questions,
      marketSnapshot,
      generatedAt: new Date().toISOString(),
      fromCache: false,
    } satisfies QuizResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return Response.json({ error: `Quiz genereren mislukt: ${msg}` }, { status: 500 });
  }
}
