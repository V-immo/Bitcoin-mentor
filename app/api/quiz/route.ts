import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCandles, calculateRsi } from "@/lib/market";
import { auth } from "@/auth";
import { getDb } from "@/db/db";

// Rate limiting: max 10 dagelijkse quiz sessies per dag per user
const quizRateMap = new Map<string, { count: number; resetAt: number }>();
const QUIZ_MAX = 10;

// Rate limiting: max 30 quick quizzes per dag per user (aparte teller)
const quickQuizRateMap = new Map<string, { count: number; resetAt: number }>();
const QUICK_QUIZ_MAX = 30;

function checkRateLimit(map: Map<string, { count: number; resetAt: number }>, key: string, max: number): boolean {
  const now = Date.now();
  const tomorrow = new Date();
  tomorrow.setHours(24, 0, 0, 0);
  const resetAt = tomorrow.getTime();
  const entry = map.get(key);
  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

function checkQuizRate(key: string): boolean {
  return checkRateLimit(quizRateMap, key, QUIZ_MAX);
}

function checkQuickQuizRate(key: string): boolean {
  return checkRateLimit(quickQuizRateMap, key, QUICK_QUIZ_MAX);
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const LEVEL_TOPICS: Record<number, string[]> = {
  1: [
    // Absolute beginner — geen jargon, echte basisvragen
    "wat is Bitcoin eigenlijk", "hoe werkt een cryptocurrency", "wat is een wallet",
    "hoe koop je voor het eerst Bitcoin", "wat is een exchange zoals Bitvavo of Coinbase",
    "wat betekent de prijs van Bitcoin", "wat is een percentage — als iets 10% stijgt",
    "verschil tussen winst en verlies bij kopen en verkopen", "wat is een marktwaarde (market cap)",
    "waarom stijgt en daalt de prijs van crypto", "wat is het verschil tussen Bitcoin en altcoins",
    "wat is een portfolio — meerdere munten bezitten", "wat betekent 'de markt is groen of rood'",
    "wat is een handelsplatform", "wat is een transactie op de blockchain",
    "wat is het verschil tussen opslaan op exchange vs eigen wallet",
    "wat is de blockchain in simpele woorden", "wat is een bull markt (prijzen stijgen)",
    "wat is een bear markt (prijzen dalen)", "wat betekent diversificatie voor een beginner",
  ],
  2: [
    // Basis trading begrippen — eerste stappen
    "wat is een candlestick grafiek en hoe lees je die", "wat betekent groen en rood in een grafiek",
    "wat is een stop-loss en waarom heb je die nodig", "wat is een take profit",
    "wat is een trend — stijgend, dalend of zijwaarts", "wat is een bull vs bear markt aan de hand van grafiek",
    "wat is volume in trading", "wat is een order — koop of verkooporder plaatsen",
    "wat is het verschil tussen marktprijs en limitorder", "hoe bereken je winst of verlies in procenten",
    "wat is een timeframe — verschil 1 minuut vs dagelijks", "wat is FOMO bij trading",
    "hoe werkt paper trading als oefening", "wat is het risico van alles inzetten op één munt",
    "waarom is risicobeheer belangrijker dan winnen",
  ],
  3: [
    // Technische analyse basis
    "support en resistance herkennen op een grafiek", "hogere highs en hogere lows — wat betekent dat",
    "wat is een breakout", "wat is een pullback na een stijging",
    "RSI uitgelegd in eenvoudige woorden — oversold en overbought",
    "moving average uitleg — wat is een gemiddelde lijn op de grafiek",
    "positiegrootte berekenen — hoeveel risico per trade", "R/R verhouding — wat is een goede risk/reward",
    "wanneer wacht je en wanneer koop je", "hoe stel je een stop-loss slim in",
    "wat is een swing trade vs een daghandel", "hoe bereken je je winst percentage nauwkeurig",
    "fake breakout herkennen", "wat is consolidatie op een grafiek", "hoe werkt DCA (periodiek bijkopen)",
  ],
  4: [
    "MA crossovers — golden cross en death cross", "multi-timeframe analyse",
    "marktstructuur lezen", "volume analyse — bevestiging van bewegingen",
    "bearish vs bullish RSI divergentie", "hoe werkt Fibonacci retracement",
    "correctie vs echte trend ommekeer", "trailing stop-loss instellen",
    "macro invloed op crypto — rente, inflatie", "halving cyclus van Bitcoin",
    "BTC dominantie als marktindicator", "on-chain data basics",
    "hoe handel je rond grote nieuws events", "correlatie BTC en S&P 500",
    "liquiditeit sweeps herkennen",
  ],
  5: [
    "smart money concepten en orderblokken", "supply and demand zones",
    "funding rates en open interest", "institutioneel gedrag lezen",
    "orderflow analyse", "geavanceerde entry timing",
    "positiebeheer tijdens een lopende trade", "schalen in en uit een positie",
    "hoe bouw je een persoonlijk trading systeem", "trading journal bijhouden en evalueren",
    "consistentie vs winratio — wat telt meer", "psychologie bij een verliesreeks",
    "narratief gedreven markten herkennen", "news trading strategie",
    "correlaties tussen assets uitlezen",
  ],
};

export const LEVEL_TOPICS_EN: Record<number, string[]> = {
  1: [
    // Absolute beginner — no jargon, real basics
    "what is Bitcoin in simple words", "how does a cryptocurrency work",
    "what is a crypto wallet", "how to buy Bitcoin for the first time",
    "what is a crypto exchange like Coinbase or Binance",
    "what does the price of Bitcoin mean", "what is a percentage — if something goes up 10%",
    "difference between profit and loss when buying and selling",
    "what is market capitalization", "why does the crypto price go up and down",
    "difference between Bitcoin and altcoins", "what is a portfolio",
    "what does green and red mean in the market", "what is a trading platform",
    "what is a blockchain transaction in simple words",
    "difference between keeping crypto on exchange vs own wallet",
    "what is the blockchain explained simply", "what is a bull market",
    "what is a bear market", "what is diversification for a beginner",
  ],
  2: [
    // Basic trading concepts — first steps
    "what is a candlestick chart and how do you read it", "what do green and red candles mean",
    "what is a stop-loss and why do you need one", "what is a take profit",
    "what is a trend — uptrend, downtrend or sideways", "what is a bull vs bear market on a chart",
    "what is volume in trading", "what is an order — placing a buy or sell order",
    "difference between market order and limit order", "how to calculate profit or loss in percentage",
    "what is a timeframe — difference 1 minute vs daily", "what is FOMO in trading",
    "how does paper trading work as practice", "why is it risky to put everything in one coin",
    "why risk management matters more than winning",
  ],
  3: [
    // Technical analysis basics
    "recognizing support and resistance on a chart", "higher highs and higher lows — what does that mean",
    "what is a breakout", "what is a pullback after a rise",
    "RSI explained simply — oversold and overbought",
    "moving average explained — what is the average line on a chart",
    "calculating position size — how much risk per trade", "R/R ratio — what is a good risk/reward",
    "when to wait and when to buy", "how to set a smart stop-loss",
    "what is a swing trade vs day trade", "how to accurately calculate your profit percentage",
    "recognizing a fake breakout", "what is consolidation on a chart", "how DCA works",
  ],
  4: [
    "MA crossovers — golden cross and death cross", "multi-timeframe analysis",
    "reading market structure", "volume analysis — confirming price moves",
    "bearish vs bullish RSI divergence", "how Fibonacci retracement works",
    "correction vs real trend reversal", "trailing stop-loss setup",
    "macro influence on crypto — interest rates, inflation", "Bitcoin halving cycle",
    "BTC dominance as market indicator", "on-chain data basics",
    "trading around major news events", "BTC and S&P 500 correlation",
    "recognizing liquidity sweeps",
  ],
  5: [
    "smart money concepts and order blocks", "supply and demand zones",
    "funding rates and open interest", "reading institutional behavior",
    "order flow analysis", "advanced entry timing",
    "position management during an open trade", "scaling in and out of a position",
    "building a personal trading system", "keeping and evaluating a trading journal",
    "consistency vs win rate — what matters more", "psychology during a losing streak",
    "recognizing narrative-driven markets", "news trading strategy",
    "reading correlations between assets",
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

  const levelDesc = {
    en: ["", "absolute beginner (no trading knowledge at all)", "beginner (knows the basics)", "intermediate", "advanced", "expert"],
    nl: ["", "absolute beginner (geen enkele tradingkennis)", "beginner (kent de basis)", "gemiddeld", "gevorderd", "expert"],
  };

  const prompt = lang === "en"
    ? `You are a trading quiz generator for a beginner trader at level ${level}/5 (${levelDesc.en[level]}).
Today's date: ${dateStr}

${level <= 2 ? `IMPORTANT: This is level ${level} — absolute beginner questions only.
- No jargon like RSI, MACD, 4H, Fibonacci, funding rates, etc.
- Use everyday language a 15-year-old could understand
- Focus on concepts: what is Bitcoin, how does price work, what is buying/selling, what is a wallet
- ${level === 1 ? "Do NOT use current market data in questions — keep it conceptual and simple" : "Only use market data for very simple percentage examples"}
` : `CURRENT MARKET DATA (use this in your questions):
${marketSnapshot}
`}
TOPICS for this session (level ${level}/5) — choose from these:
${topics.join(", ")}

Generate exactly ${count} UNIQUE quiz questions. Rules:
1. Match the difficulty exactly — level ${level} = ${levelDesc.en[level]}
2. NEVER repeat questions from previous sessions — use date ${dateStr} as variation seed
3. Educational — the explanation genuinely teaches something useful
4. Varied — mix of concepts, simple examples and real scenarios
${level <= 2 ? "5. NO technical indicators, NO chart patterns, NO jargon in level 1-2 questions" : "5. Include market data context in at least 2 questions"}

Return ONLY a JSON array (no extra text):
[
  {
    "id": "1",
    "topic": "topic",
    "question": "The question",
    "context": "optional: 1 sentence of extra context or scenario",
    "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
    "correct": "A",
    "explanation": "2-3 sentences explaining why this is correct and what the learner takes away.",
    "difficulty": ${level}
  }
]

Exactly one answer must be correct. The other 3 must be plausible but wrong.`
    : `Je bent een trading-quiz generator voor een lerende trader op niveau ${level}/5 (${levelDesc.nl[level]}).
Datum van vandaag: ${dateStr}

${level <= 2 ? `BELANGRIJK: Dit is niveau ${level} — alleen echte beginnersvragen.
- Geen jargon zoals RSI, MACD, 4H, Fibonacci, funding rates, etc.
- Gebruik gewone taal die iemand zonder enige kennis begrijpt
- Focus op: wat is Bitcoin, hoe werkt de prijs, wat is kopen/verkopen, wat is een wallet
- ${level === 1 ? "Gebruik de marktdata NIET in vragen — houd het conceptueel en simpel" : "Gebruik marktdata alleen voor heel simpele percentage voorbeelden"}
` : `ACTUELE MARKTDATA (gebruik dit in je vragen):
${marketSnapshot}
`}
ONDERWERPEN voor deze sessie (niveau ${level}/5) — kies hieruit:
${topics.join(", ")}

Genereer precies ${count} UNIEKE quizvragen. Regels:
1. Pas de moeilijkheid exact aan — niveau ${level} = ${levelDesc.nl[level]}
2. NOOIT dezelfde vragen herhalen — gebruik datum ${dateStr} als variatie-seed
3. Educatief — de uitleg leert iets echts en nuttigs
4. Gevarieerd — mix van concepten, eenvoudige voorbeelden en echte scenario's
${level <= 2 ? "5. GEEN technische indicatoren, GEEN grafiekpatronen, GEEN jargon in niveau 1-2 vragen" : "5. Verwerk marktdata context in minstens 2 vragen"}

Geef ALLEEN een JSON array terug (geen extra tekst):
[
  {
    "id": "1",
    "topic": "onderwerp",
    "question": "De vraag",
    "context": "optioneel: 1 zin extra context of scenario",
    "options": ["A. optie1", "B. optie2", "C. optie3", "D. optie4"],
    "correct": "A",
    "explanation": "2-3 zinnen waarom dit correct is en wat de leerder meeneemt.",
    "difficulty": ${level}
  }
]

Zorg dat exact één antwoord correct is en de andere 3 plausibel maar fout zijn.`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
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

  // Body eerst lezen zodat we quick-mode kunnen detecteren vóór rate limit check
  const body = await request.json().catch(() => ({}));
  const quick: boolean = body.quick === true;

  // Rate limit: quick quizzes hebben eigen teller (30/dag), los van dagelijkse quiz (10/dag)
  if (quick) {
    if (!checkQuickQuizRate(rateKey)) {
      return Response.json({ error: "RATE_LIMIT" }, { status: 429 });
    }
  } else {
    if (!checkQuizRate(rateKey)) {
      return Response.json({ error: "RATE_LIMIT" }, { status: 429 });
    }
  }

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

  // Quick mode: kleine quiz over één specifiek topic (voor LearningResources)
  if (quick) {
    const quickCount: number = Math.min(Math.max(1, body.count ?? 3), 10);
    const quickTopic: string = body.todayTopic ?? "";
    if (!quickTopic) {
      return Response.json({ error: "Geen topic opgegeven" }, { status: 400 });
    }
    ensureQuizTables();
    const marketSnapshot = level <= 2 ? "" : await getMarketSnapshot();
    try {
      const questions = await generateAndSaveQuestions(level, [quickTopic], marketSnapshot, quickCount, lang);
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

  const questionCount = 20;

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
