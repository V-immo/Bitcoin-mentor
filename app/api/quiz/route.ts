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
    // Absolute beginner — geen jargon, echte basisvragen — zo groot mogelijk om herhaling te vermijden
    "wat is Bitcoin eigenlijk en hoe ontstond het",
    "hoe werkt een cryptocurrency en wat maakt het anders dan gewoon geld",
    "wat is een crypto wallet en hoe bewaar je je munten veilig",
    "hoe koop je voor het eerst Bitcoin via een exchange",
    "wat is een exchange zoals Bitvavo of Coinbase",
    "wat bepaalt de prijs van Bitcoin elke dag",
    "wat is een percentage — als iets 10% stijgt wat betekent dat dan in euro's",
    "verschil tussen winst en verlies bij kopen en verkopen van crypto",
    "wat is een marktwaarde (market cap) en waarom telt die mee",
    "waarom stijgt en daalt de prijs van crypto zo snel",
    "wat is het verschil tussen Bitcoin en altcoins zoals ETH, SOL, XRP",
    "wat is een portfolio en hoe spreidt een beginner slim",
    "wat betekent 'de markt is groen of rood' vandaag",
    "wat is een handelsplatform en hoe kies je er een",
    "wat is een transactie op de blockchain en waarom duurt die soms lang",
    "verschil tussen opslaan op exchange versus een eigen hardware wallet",
    "wat is de blockchain in simpele woorden zonder technisch jargon",
    "wat is een bull markt — wanneer stijgen prijzen langdurig",
    "wat is een bear markt — wanneer dalen prijzen langdurig",
    "wat betekent diversificatie voor een beginner met weinig geld",
    "wat is de Bitcoin halving en waarom is het belangrijk voor de prijs",
    "wat is een seed phrase en waarom is die zo gevaarlijk om te delen",
    "wat is het verschil tussen hot wallet en cold wallet",
    "wat is FOMO en hoe herken je het bij jezelf",
    "waarom is het riskant om alles in één crypto te zetten",
    "wat is een stablecoin zoals USDT en waarvoor gebruik je die",
    "wat is het verschil tussen opslaan en traden",
    "hoe werkt de blockchain als er geen centrale bank is",
    "wat is crypto mining in simpele woorden",
    "waarom zijn er maar 21 miljoen Bitcoins",
  ],
  2: [
    // Basis trading begrippen — eerste stappen — uitgebreide pool
    "wat is een candlestick grafiek en hoe lees je die",
    "wat betekent de kleur van een kaars — groen vs rood",
    "wat zijn de 4 onderdelen van een kaars: open, close, high, low",
    "wat is een wick/schaduw op een kaars en wat zegt die",
    "wat is een stop-loss en waarom is die verplicht bij elke trade",
    "wat is een take profit en hoe stel je hem slim in",
    "wat is een trend — stijgend, dalend of zijwaarts",
    "wat is hogere high en hogere low in een uptrend",
    "wat is volume in trading en waarom bevestigt het bewegingen",
    "wat is een marktorder en wanneer gebruik je die",
    "wat is een limitorder en wanneer gebruik je die in plaats van marktorder",
    "hoe bereken je winst of verlies in procenten",
    "wat is een timeframe — verschil 1 minuut vs dagelijks",
    "welke timeframe gebruik je voor swing trading vs day trading",
    "wat is FOMO bij trading en hoe bescherm je jezelf ertegen",
    "hoe werkt paper trading als oefening zonder echt geld",
    "wat is het risico van alles inzetten op één trade",
    "waarom is risicobeheer belangrijker dan de perfecte entry kiezen",
    "wat is de 1-2% regel bij risicobeheer",
    "wat is een risk/reward verhouding en waarom wil je minimaal 1:2",
    "wat is een pullback en hoe gebruik je die voor een betere entry",
    "wat is consolidatie op een grafiek en wat verwacht je daarna",
    "wat is een breakout en hoe bevestig je die",
    "wat is DCA (dollar cost averaging) en wanneer past het voor een beginner",
    "wat is de spread op een exchange en hoe kost het je geld",
    "hoe werkt het kopen en verkopen op een exchange stap voor stap",
    "wat is leverage en waarom is het gevaarlijk voor beginners",
    "wat is short gaan en hoe werkt dat bij crypto",
    "hoe lees je de orderbook op een exchange",
    "wat is een liquidatie bij futures trading",
  ],
  3: [
    // Technische analyse basis
    "support en resistance zones herkennen op een grafiek",
    "hogere highs en hogere lows — hoe herken je een uptrend structuur",
    "lagere highs en lagere lows — signalen van een downtrend",
    "wat is een breakout en hoe bevestig je die met volume",
    "wat is een fake breakout en hoe vermijd je erop te reageren",
    "RSI uitgelegd — hoe interpreteer je overbought en oversold",
    "RSI bullish divergentie — wat betekent het en hoe herken je het",
    "RSI bearish divergentie — waarschuwingssignaal herkennen",
    "moving average uitleg — MA20 vs MA50 vs MA200",
    "hoe gebruik je de MA als dynamische support en resistance",
    "positiegrootte berekenen op basis van stop-loss en kapitaal",
    "risk/reward berekening — concrete voorbeelden met getallen",
    "wanneer wacht je op bevestiging voordat je instapt",
    "hoe stel je een stop-loss slim in gebaseerd op marktstructuur",
    "wat is een swing trade en hoe verschilt het van day trading",
    "wat is consolidatie en hoe trade je de uitbraak",
    "hoe werkt DCA als strategie bij een dalende markt",
    "wat is een role reversal bij support en resistance",
    "wat is een bullish engulfing candle patroon",
    "wat is een bearish engulfing candle patroon",
    "hoe herken je een pin bar en wat betekent die",
    "hoe bereken je je winst percentage nauwkeurig",
    "wat is een correctie vs een trend ommekeer",
    "hoe werkt Bollinger Bands als indicator",
    "wat is MACD en hoe gebruik je het als bevestiging",
    "hoe gebruik je volume om een move te bevestigen of weerleggen",
    "wat is de beste timeframe voor koopzones zoeken",
    "hoe teken je support en resistance correct op de grafiek",
    "wat is een inside bar en wat voorspelt die",
    "hoe gebruik je meerdere indicatoren samen zonder tegenstrijdig te zijn",
  ],
  4: [
    "MA crossovers — golden cross en death cross uitgelegd",
    "multi-timeframe analyse — hoe combineer je 1D, 4H en 1H",
    "marktstructuur lezen — swing highs en lows identificeren",
    "volume analyse — bevestiging van bewegingen en fakeouts herkennen",
    "bearish vs bullish RSI divergentie op de 4H grafiek",
    "hoe werkt Fibonacci retracement voor koopzones",
    "correctie vs echte trend ommekeer — hoe onderscheid je ze",
    "trailing stop-loss instellen bij een lopende winstgevende trade",
    "macro invloed op crypto — rente, inflatie, Fed beslissingen",
    "Bitcoin halving cyclus — historische patronen en verwachtingen",
    "BTC dominantie als marktindicator voor altcoins",
    "on-chain data basics — active addresses, exchange flows",
    "hoe handel je slim rond grote nieuws events (CPI, FOMC)",
    "correlatie BTC en S&P 500 — wanneer loopt crypto mee met stocks",
    "liquiditeit sweeps herkennen — stop hunts van smart money",
    "funding rates lezen op Binance — wat zeggen ze over sentiment",
    "open interest analyse — hoe gebruik je OI bij trend-beoordeling",
    "hoe gebruik je de Fear & Greed index als contraire indicator",
    "wat is een market structure break en hoe trade je het",
    "hoe identificeer je een order block op de 4H grafiek",
    "positiebeheer — wanneer neem je gedeeltelijk winst",
    "scaling in — geleidelijk een positie opbouwen",
    "scaling out — geleidelijk winst nemen terwijl trade loopt",
    "how werkt de Wyckoff methodiek voor accumulatie en distributie",
    "wat zijn liquiditeitsniveaus en hoe herken je ze",
    "waarom zijn ronde getallen (80K, 90K) psychologisch belangrijk",
    "hoe werkt een orderbook en wat zegt depth of market",
    "hoe herken je institutioneel gedrag via candle-patronen",
    "wat is een supply zone en demand zone in detail",
    "hoe gebruik je BTC als benchmark voor altcoin trades",
  ],
  5: [
    "smart money concepten en orderblokken — diepgaande uitleg",
    "supply and demand zones op institutioneel niveau",
    "funding rates en open interest als contraire indicatoren",
    "institutioneel gedrag lezen via volume en price action",
    "orderflow analyse — tape reading en delta volume",
    "geavanceerde entry timing met multi-timeframe bevestiging",
    "positiebeheer tijdens een lopende trade bij volatiliteit",
    "schalen in en uit een positie voor optimale gemiddelde prijs",
    "hoe bouw je een persoonlijk trading systeem met vaste regels",
    "trading journal bijhouden en evalueren voor continue verbetering",
    "consistentie vs winratio — wat telt écht op lange termijn",
    "psychologie bij een verliesreeks — hoe herstel je mentaal",
    "narratief gedreven markten herkennen — hype vs realiteit",
    "news trading strategie — hoe trade je rond macro events",
    "correlaties tussen assets uitlezen voor portfolio-allocatie",
    "liquiditeitspool analyse — waar staan de stop-losses van retailers",
    "ICT killzones — de beste handelsuren voor crypto en forex",
    "hoe werkt market manipulation door grote spelers",
    "breaker blocks — gevorderde orderblock variatie",
    "fair value gaps (FVG) — hoe handelen instellingen deze zones",
    "implied volatility en opties als leading indicator",
    "hoe beoordeel je je eigen edge over 50+ trades statisch",
    "psychologie van FOMO en hoe bouw je discipline op",
    "backtesten van een strategie op historische data",
    "positie sizing bij een verliesreeks aanpassen",
    "hoe handel je met een klein account zonder te veel risico",
    "expectancy berekenen en verbeteren over tijd",
    "gedragseconomie — welke cognitieve biases ruïneren traders",
    "hoe onderscheid je noise van echte setup-kansen",
    "het opbouwen van mentale routines voor consistente prestaties",
  ],
};

export const LEVEL_TOPICS_EN: Record<number, string[]> = {
  1: [
    "what is Bitcoin in simple words and how was it created",
    "how does a cryptocurrency work differently from regular money",
    "what is a crypto wallet and how do you keep it safe",
    "how to buy Bitcoin for the first time step by step",
    "what is a crypto exchange like Coinbase or Bitvavo",
    "what determines the price of Bitcoin every day",
    "what is a percentage — if something goes up 10% what does that mean in dollars",
    "difference between profit and loss when buying and selling crypto",
    "what is market capitalization and why does it matter",
    "why does the crypto price go up and down so fast",
    "difference between Bitcoin and altcoins like ETH, SOL, XRP",
    "what is a portfolio and how does a beginner diversify",
    "what does green and red mean in the market today",
    "what is a trading platform and how do you choose one",
    "what is a blockchain transaction and why does it sometimes take long",
    "difference between keeping crypto on exchange versus your own wallet",
    "what is the blockchain explained simply without technical jargon",
    "what is a bull market — when do prices rise for a long time",
    "what is a bear market — when do prices fall for a long time",
    "what is diversification for a beginner with limited money",
    "what is the Bitcoin halving and why is it important for the price",
    "what is a seed phrase and why is it dangerous to share",
    "difference between hot wallet and cold wallet",
    "what is FOMO and how do you recognize it in yourself",
    "why is it risky to put all your money in one crypto",
    "what is a stablecoin like USDT and when do you use it",
    "what is crypto mining in simple words",
    "why are there only 21 million Bitcoins",
    "what is blockchain decentralization and why does it matter",
    "how do you read a crypto price chart for the first time",
  ],
  2: [
    "what is a candlestick chart and how do you read it",
    "what do the colors of a candle mean — green vs red",
    "what are the 4 parts of a candle: open, close, high, low",
    "what is a wick on a candle and what does it tell you",
    "what is a stop-loss and why is it mandatory for every trade",
    "what is a take profit and how do you set it correctly",
    "what is a trend — uptrend, downtrend or sideways",
    "what is a higher high and higher low in an uptrend",
    "what is volume in trading and why does it confirm movements",
    "what is a market order and when do you use it",
    "what is a limit order and when do you use it instead of a market order",
    "how to calculate profit or loss in percentage",
    "what is a timeframe — difference 1 minute vs daily",
    "which timeframe do you use for swing trading vs day trading",
    "what is FOMO in trading and how do you protect yourself from it",
    "how does paper trading work as practice without real money",
    "why is it risky to put everything in one trade",
    "why is risk management more important than picking the perfect entry",
    "what is the 1-2% rule in risk management",
    "what is a risk/reward ratio and why do you want at least 1:2",
    "what is a pullback and how do you use it for a better entry",
    "what is consolidation on a chart and what do you expect after",
    "what is a breakout and how do you confirm it",
    "what is DCA (dollar cost averaging) for a beginner",
    "what is the spread on an exchange and how does it cost you money",
    "how does buying and selling on an exchange work step by step",
    "what is leverage and why is it dangerous for beginners",
    "what is going short and how does it work in crypto",
    "what is a liquidation in futures trading",
    "how do you read the order book on an exchange",
  ],
  3: [
    "recognizing support and resistance zones on a chart",
    "higher highs and higher lows — recognizing uptrend structure",
    "lower highs and lower lows — signals of a downtrend",
    "what is a breakout and how do you confirm it with volume",
    "what is a fake breakout and how do you avoid reacting to it",
    "RSI explained — how to interpret overbought and oversold",
    "RSI bullish divergence — what it means and how to recognize it",
    "RSI bearish divergence — warning signal recognition",
    "moving averages explained — MA20 vs MA50 vs MA200",
    "how to use the MA as dynamic support and resistance",
    "calculating position size based on stop-loss and capital",
    "risk/reward calculation — concrete examples with numbers",
    "when to wait for confirmation before entering",
    "how to set a smart stop-loss based on market structure",
    "what is a swing trade and how does it differ from day trading",
    "what is consolidation and how do you trade the breakout",
    "how DCA works as a strategy in a falling market",
    "what is a role reversal in support and resistance",
    "what is a bullish engulfing candle pattern",
    "what is a bearish engulfing candle pattern",
    "how to recognize a pin bar and what it means",
    "how to accurately calculate your profit percentage",
    "what is a correction vs a trend reversal",
    "how do Bollinger Bands work as an indicator",
    "what is MACD and how do you use it as confirmation",
    "how to use volume to confirm or disprove a move",
    "what is the best timeframe for finding buy zones",
    "how to draw support and resistance correctly on the chart",
    "what is an inside bar and what does it predict",
    "how to use multiple indicators together without conflicting",
  ],
  4: [
    "MA crossovers — golden cross and death cross explained",
    "multi-timeframe analysis — combining 1D, 4H and 1H",
    "reading market structure — identifying swing highs and lows",
    "volume analysis — confirming moves and recognizing fakeouts",
    "bearish vs bullish RSI divergence on the 4H chart",
    "how Fibonacci retracement works for buy zones",
    "correction vs real trend reversal — how to distinguish them",
    "trailing stop-loss during a running profitable trade",
    "macro influence on crypto — interest rates, inflation, Fed decisions",
    "Bitcoin halving cycle — historical patterns and expectations",
    "BTC dominance as a market indicator for altcoins",
    "on-chain data basics — active addresses, exchange flows",
    "how to trade smartly around major news events (CPI, FOMC)",
    "BTC and S&P 500 correlation — when does crypto follow stocks",
    "recognizing liquidity sweeps — stop hunts by smart money",
    "reading funding rates on Binance — what they say about sentiment",
    "open interest analysis — how to use OI for trend assessment",
    "how to use the Fear & Greed index as a contrarian indicator",
    "what is a market structure break and how do you trade it",
    "how to identify an order block on the 4H chart",
    "position management — when to take partial profits",
    "scaling in — gradually building a position",
    "scaling out — gradually taking profit while trade runs",
    "how the Wyckoff method works for accumulation and distribution",
    "what are liquidity levels and how do you recognize them",
    "why round numbers (80K, 90K) are psychologically important",
    "how an order book works and what depth of market tells you",
    "how to recognize institutional behavior via candle patterns",
    "what is a supply zone and demand zone in detail",
    "how to use BTC as a benchmark for altcoin trades",
  ],
  5: [
    "smart money concepts and order blocks — in-depth explanation",
    "supply and demand zones at institutional level",
    "funding rates and open interest as contrarian indicators",
    "reading institutional behavior via volume and price action",
    "order flow analysis — tape reading and delta volume",
    "advanced entry timing with multi-timeframe confirmation",
    "position management during an open trade in volatility",
    "scaling in and out of a position for optimal average price",
    "building a personal trading system with fixed rules",
    "keeping and evaluating a trading journal for continuous improvement",
    "consistency vs win rate — what really matters long-term",
    "psychology during a losing streak — how to recover mentally",
    "recognizing narrative-driven markets — hype vs reality",
    "news trading strategy — trading around macro events",
    "reading correlations between assets for portfolio allocation",
    "liquidity pool analysis — where are retailer stop-losses",
    "ICT kill zones — best trading hours for crypto and forex",
    "how market manipulation by large players works",
    "breaker blocks — advanced order block variation",
    "fair value gaps (FVG) — how institutions trade these zones",
    "implied volatility and options as a leading indicator",
    "how to evaluate your own edge over 50+ trades statistically",
    "psychology of FOMO and building discipline over time",
    "backtesting a strategy on historical data",
    "adjusting position sizing during a losing streak",
    "how to trade with a small account without excessive risk",
    "calculating and improving expectancy over time",
    "behavioral economics — which cognitive biases ruin traders",
    "how to distinguish noise from real setup opportunities",
    "building mental routines for consistent performance",
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
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  }, { timeout: 30000 });

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

  const questionCount = 5;

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

    // === BACKGROUND PRE-FILL ===
    // Genereer direct 20 nieuwe vragen op de achtergrond voor de volgende sessie.
    // Deze worden NIET als gezien gemarkeerd → volgende keer cache-hit (instant).
    const bgTopics = pickRandomTopics(allTopics, Math.min(questionCount, allTopics.length));
    getMarketSnapshot()
      .then(snap => generateAndSaveQuestions(level, bgTopics, snap, questionCount, lang))
      .catch(() => {});

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
