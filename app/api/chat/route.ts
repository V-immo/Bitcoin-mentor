import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { sharedScanCache } from "@/lib/scan-cache";
import { bitvavRequest } from "@/lib/bitvavo";

// Rate limiting: max 100 chat calls per uur per user
const chatRateMap = new Map<string, { count: number; resetAt: number }>();
const CHAT_MAX = 100;
const CHAT_WINDOW = 60 * 60 * 1000; // 1 uur

function checkChatRate(key: string): boolean {
  const now = Date.now();
  const entry = chatRateMap.get(key);
  if (!entry || now > entry.resetAt) {
    chatRateMap.set(key, { count: 1, resetAt: now + CHAT_WINDOW });
    return true;
  }
  if (entry.count >= CHAT_MAX) return false;
  entry.count++;
  return true;
}

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function getMarketSummary(): string {
  const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minuten — als scan ouder is, vermeld het
  const { data, ts } = sharedScanCache;
  if (!data || data.length === 0) return "";
  const ageMin = Math.round((Date.now() - ts) / 60000);
  const dot = (c: string) => c === "green" ? "🟢" : c === "yellow" ? "🟡" : "🔴";
  const lines = data.map(a =>
    `${dot(a.color)} ${a.emoji} ${a.ticker} (${a.type}) — trend ${a.trend}, RSI ${a.rsi}, score ${a.score}/100, 24u ${a.change24h >= 0 ? "+" : ""}${a.change24h.toFixed(1)}% — ${a.signal}`
  );
  const staleNote = Date.now() - ts > CACHE_MAX_AGE ? ` (data van ${ageMin} min geleden)` : "";
  return lines.join("\n") + (staleNote ? `\n${staleNote}` : "");
}

async function fetchFearAndGreed(): Promise<string> {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1", {
      next: { revalidate: 300 },
    });
    if (!res.ok) return "onbekend";
    const data = await res.json();
    const entry = data?.data?.[0];
    if (!entry) return "onbekend";
    return `${entry.value}/100 (${entry.value_classification})`;
  } catch {
    return "onbekend";
  }
}

type GlobalMetrics = {
  btcDominance: string;
  totalMarketCap: string;
  marketCapChange24h: string;
};

async function fetchGlobalMetrics(): Promise<GlobalMetrics> {
  const fallback: GlobalMetrics = {
    btcDominance: "onbekend",
    totalMarketCap: "onbekend",
    marketCapChange24h: "onbekend",
  };
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/global", {
      next: { revalidate: 300 },
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const d = data?.data;
    if (!d) return fallback;
    const btcDominance = `${d.market_cap_percentage?.btc?.toFixed(1) ?? "?"}%`;
    const totalCap = d.total_market_cap?.usd;
    const totalMarketCap = totalCap
      ? `$${(totalCap / 1e12).toFixed(2)}T`
      : "onbekend";
    const change = d.market_cap_change_percentage_24h_usd;
    const marketCapChange24h =
      typeof change === "number" ? `${change.toFixed(2)}%` : "onbekend";
    return { btcDominance, totalMarketCap, marketCapChange24h };
  } catch {
    return fallback;
  }
}

export async function POST(request: NextRequest) {
  // Auth check
  const session = await auth();
  const userId = parseInt((session?.user as { id?: string })?.id ?? "0") || null;

  // Rate limit: 20 berichten per uur per user (of per IP als niet ingelogd)
  const rateKey = userId ? `user:${userId}` : (request.headers.get("x-forwarded-for") ?? "anon");
  if (!checkChatRate(rateKey)) {
    return Response.json(
      { reply: "Je hebt het uurtarief bereikt (100 berichten/uur). Probeer het later opnieuw." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const messages: { role: string; content: string }[] = body.messages ?? [];
  const marketContext: string = body.marketContext ?? "";
  const questionContext: string = body.questionContext ?? ""; // quiz question context

  // Haal quiz profiel op uit DB als ingelogd (niet vertrouwen op client body)
  let traderLevel: number = body.traderLevel ?? 1;
  let weakTopics: string[] = body.weakTopics ?? [];
  // Taal: ALTIJD body.lang gebruiken — dit is wat de gebruiker NU ziet in de UI
  // DB ai_language wordt volledig genegeerd (kan verouderd zijn)
  const aiLanguage: "nl" | "en" = (body.lang === "en") ? "en" : "nl";

  let quizHistorySummary = "";
  let marcusNotes = "";

  if (userId) {
    try {
      const db = getDb();
      const quiz = db
        .prepare("SELECT level, xp, streak, weak_topics, history FROM quiz_progress WHERE user_id = ?")
        .get(userId) as { level: number; xp: number; streak: number; weak_topics: string; history: string } | undefined;
      if (quiz) {
        traderLevel = quiz.level;
        weakTopics = JSON.parse(quiz.weak_topics ?? "[]");
        // Leervoortgang samenvatting voor Marcus
        const history: { date: string; score: number; total: number; topics: string[] }[] = JSON.parse(quiz.history ?? "[]");
        const recentSessions = history.slice(0, 10);
        const coveredTopics = [...new Set(recentSessions.flatMap(s => s.topics ?? []))];
        const avgScore = recentSessions.length > 0
          ? Math.round(recentSessions.reduce((s, r) => s + (r.score / r.total), 0) / recentSessions.length * 100)
          : 0;
        if (recentSessions.length > 0) {
          quizHistorySummary = `Niveau: ${quiz.level}/5 | XP: ${quiz.xp} | Streak: ${quiz.streak} dag(en) | Gem. score: ${avgScore}%
Al behandeld in quiz: ${coveredTopics.join(", ") || "nog geen"}
Zwakke punten: ${weakTopics.join(", ") || "nog niet bepaald"}`;
        }
      }
      const settings = db
        .prepare("SELECT ai_language, trading_mode, marcus_notes FROM settings WHERE user_id = ?")
        .get(userId) as { ai_language: string; trading_mode: string; marcus_notes?: string } | undefined;
      // ai_language uit DB wordt genegeerd — body.lang is altijd leidend
      if (settings?.marcus_notes) {
        marcusNotes = settings.marcus_notes;
      }
      if (settings?.trading_mode) {
        // Overschrijf trading mode met DB waarde
        const tm = settings.trading_mode;
        if (tm === "day") { Object.assign(body, { _tradingMode: "day" }); }
        else if (tm === "long") { Object.assign(body, { _tradingMode: "long" }); }
        else { Object.assign(body, { _tradingMode: "swing" }); }
      }
    } catch { /* gebruik body values als fallback */ }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({
      reply: "ANTHROPIC_API_KEY ontbreekt in .env.local.",
    });
  }

  const [fearGreed, globalMetrics] = await Promise.all([
    fetchFearAndGreed(),
    fetchGlobalMetrics(),
  ]);
  const marketSummary = getMarketSummary();

  // Haal open posities van de gebruiker op voor trade-coaching
  let openPositionsContext = "";
  if (userId) {
    try {
      const db = getDb();
      const papers = db.prepare(
        "SELECT asset, cash, position, starting_balance FROM paper_trading WHERE user_id = ? AND position IS NOT NULL"
      ).all(userId) as { asset: string; cash: number; position: string; starting_balance: number }[];
      const openTrades = papers
        .map(p => { try { return { asset: p.asset, cash: p.cash, pos: JSON.parse(p.position), start: p.starting_balance }; } catch { return null; } })
        .filter(Boolean) as { asset: string; cash: number; pos: { entryPrice?: number; openBtc?: number; side?: string; stopLoss?: number }; start: number }[];
      if (openTrades.length > 0) {
        openPositionsContext = openTrades.map(t => {
          const scanEntry = sharedScanCache.data?.find(s => s.symbol === t.asset);
          const livePrice = scanEntry?.price ?? 0;
          const pnl = livePrice > 0 && t.pos.openBtc ? ((livePrice - (t.pos.entryPrice ?? 0)) * t.pos.openBtc).toFixed(2) : "onbekend";
          return `- ${t.asset}: instap $${t.pos.entryPrice?.toFixed(2) ?? "?"}, hoeveelheid ${t.pos.openBtc?.toFixed(6) ?? "?"}, huidige prijs $${livePrice > 0 ? livePrice.toFixed(2) : "?"}, ongerealiseerde P&L €${pnl}, stop-loss $${t.pos.stopLoss?.toFixed(2) ?? "niet ingesteld"}`;
        }).join("\n");
      }
    } catch { /* ignore */ }
  }

  // Haal Bitvavo live saldo op voor Marcus context
  let bitvavoContext = "";
  if (userId) {
    try {
      const db = getDb();
      const bvRow = db
        .prepare("SELECT bitvavo_api_key, bitvavo_api_secret FROM settings WHERE user_id = ?")
        .get(userId) as { bitvavo_api_key?: string; bitvavo_api_secret?: string } | undefined;
      const bvKey = bvRow?.bitvavo_api_key ?? "";
      const bvSecret = bvRow?.bitvavo_api_secret ?? "";
      if (bvKey && bvSecret) {
        const [balanceData, openOrdersData] = await Promise.allSettled([
          bitvavRequest(bvKey, bvSecret, "GET", "/balance"),
          bitvavRequest(bvKey, bvSecret, "GET", "/ordersOpen"),
        ]);
        const balance = balanceData.status === "fulfilled" && Array.isArray(balanceData.value)
          ? (balanceData.value as { symbol: string; available: string; inOrder: string }[])
              .filter(b => parseFloat(b.available) > 0.0001 || parseFloat(b.inOrder) > 0.0001)
          : [];
        if (balance.length > 0) {
          const balLines = balance.map(b => {
            const scanEntry = sharedScanCache.data?.find(s =>
              s.symbol.startsWith(b.symbol) || b.symbol === "EUR"
            );
            const price = scanEntry?.price ?? 0;
            const euroVal = b.symbol === "EUR"
              ? `€${parseFloat(b.available).toFixed(2)}`
              : price > 0
                ? `€${(parseFloat(b.available) * price).toFixed(2)}`
                : "";
            const inOrder = parseFloat(b.inOrder) > 0 ? ` (${b.inOrder} in order)` : "";
            return `  ${b.symbol}: ${parseFloat(b.available).toFixed(6)}${inOrder}${euroVal ? " ≈ " + euroVal : ""}`;
          });
          bitvavoContext = `BITVAVO LIVE PORTFOLIO:\n${balLines.join("\n")}`;
        }
        if (openOrdersData.status === "fulfilled" && Array.isArray(openOrdersData.value) && openOrdersData.value.length > 0) {
          const orders = (openOrdersData.value as { market: string; side: string; orderType: string; amount: string; price?: string; amountQuote?: string }[])
            .slice(0, 5)
            .map(o => `  ${o.side.toUpperCase()} ${o.market}: ${o.amount ?? o.amountQuote ?? "?"} @ ${o.price ? "€" + o.price : "marktprijs"}`)
            .join("\n");
          bitvavoContext += `\nOPEN BITVAVO ORDERS:\n${orders}`;
        }
      }
    } catch { /* geen Bitvavo data, doorgaan */ }
  }

  // Haal relevante trading kennis op uit de kennisbank
  let relevantKnowledge = "";
  if (userId) {
    try {
      const db = getDb();
      // Bouw zoekterm op basis van user bericht + zwakke punten
      const lastUserMsg = messages.filter(m => m.role === "user").slice(-1)[0]?.content ?? "";
      const searchText = (lastUserMsg + " " + weakTopics.join(" ")).toLowerCase();

      // Haal 3 meest relevante lessen op via tag matching
      const allLessons = db.prepare(
        "SELECT source, lesson, tags FROM trading_knowledge WHERE level <= ? ORDER BY RANDOM() LIMIT 50"
      ).all(Math.min(traderLevel + 1, 3)) as { source: string; lesson: string; tags: string }[];

      const scored = allLessons
        .map(row => {
          const tags = row.tags.split(",");
          const score = tags.filter(tag => searchText.includes(tag.trim())).length;
          return { ...row, score };
        })
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      if (scored.length > 0) {
        relevantKnowledge = scored
          .map(r => `• ${r.source}: "${r.lesson}"`)
          .join("\n");
      }
    } catch { /* ignore */ }
  }

  // Bepaal of het een crypto of traditioneel asset is op basis van marketContext
  const isCrypto = marketContext.includes("[crypto]");
  const dbTradingMode = body._tradingMode as string | undefined;
  const isSwing = dbTradingMode === "swing" || (!dbTradingMode && marketContext.includes("Swing trading"));
  const isDay = dbTradingMode === "day" || (!dbTradingMode && marketContext.includes("Day trading"));
  const isLong = dbTradingMode === "long" || (!dbTradingMode && marketContext.includes("Long term"));
  const tradingModeTip = isDay
    ? "De trader doet aan day trading — trades worden dezelfde dag geopend en gesloten. Focus op korte setups, snelle entries, strakke stops."
    : isLong
      ? "De trader doet aan long term beleggen — posities worden weken tot maanden aangehouden. Focus op grote trend, fundamentals en geduld."
      : "De trader doet aan swing trading — trades duren 2 tot 14 dagen. Focus op 4H/daily setups, koopzones en duidelijke targets.";

  const macroContext = isCrypto
    ? `BTC Dominantie: ${globalMetrics.btcDominance}
Totale crypto marktcap: ${globalMetrics.totalMarketCap}
Marktcap verandering 24u: ${globalMetrics.marketCapChange24h}
Halving cyclus: Bitcoin halveerde april 2024 — we zitten ~11 maanden post-halving, historisch de sterkste bull market fase.
Institutioneel: Spot Bitcoin ETFs actief sinds jan 2024, structurele vraag van grote partijen.`
    : `Algemeen marktsentiment: Fear & Greed ${fearGreed}
S&P 500 correlatie: Stocks en crypto bewegen vaak mee met brede markt — let op macro events.
Seizoenspatronen: Aandelen en edelmetalen kennen typische seizoensbewegingen (OPEX, kwartaalcijfers, Fed-vergaderingen).`;

  const levelProfile = traderLevel <= 1
    ? "ABSOLUTE BEGINNER — dit is iemand die net begint. Gebruik ALLEEN simpele, dagelijkse taal. Geen vakjargon tenzij je het meteen uitlegt met een analogie. Max 3-4 zinnen per antwoord. Vergelijk alles met echte situaties (bijv: 'Bitcoin is als een winkel die soms heel druk is en dan stijgen de prijzen'). Bouw kennis stapje voor stapje op."
    : traderLevel <= 2
      ? "BEGINNER met wat basiskennis — introduceer technische termen maar leg ze ALTIJD direct uit in simpele taal. Houd antwoorden kort en concreet. Max 5-6 zinnen."
      : traderLevel <= 3
        ? "GEMIDDELD niveau — kent RSI, support/resistance, moving averages. Kan diepere concepten aan. Leg termen kort uit maar ga niet te basics."
        : traderLevel <= 4
          ? "GEVORDERD — begrijpt marktstructuur, multi-timeframe analyse, positiegrootte. Ga dieper in op institutioneel gedrag en macro."
          : "EXPERT — behandel als een professional: ICT-concepten, orderblokken, liquiditeit, funding rates, on-chain data. Geen basisuitleg nodig.";

  const weakTopicLine = weakTopics.length > 0
    ? `\nZWAKKE PUNTEN (besteed hier extra aandacht aan): ${weakTopics.join(", ")}`
    : "";

  const langNote = aiLanguage === "en"
    ? "CRITICAL LANGUAGE RULE: You MUST respond in English ONLY. Every single message must be in English. Never switch to Dutch. The user has selected English as their language."
    : "TAALREGEL: Antwoord ALTIJD in het Nederlands. Nooit in het Engels.";

  const systemPrompt = `Je bent Marcus. ${langNote}

RESPONSE LANGUAGE: ${aiLanguage === "en" ? "ENGLISH" : "NEDERLANDS"} — this is mandatory for every response.

WIE JIJ BENT:
Je bent Marcus — een trader die al 15 jaar in de markt zit. Je hebt alles meegemaakt: de bitcoin bull runs, de crashes, de nachtmerries. Je hebt geleerd van de beste mentors, betaald schoolgeld met echte verliezen, en je gelooft dat de beste wijsheid over geld al eeuwen bestaat — in de Bijbel, in de markten, en in de psychologie van mensen die winnen.

Je bent geen chatbot. Je bent geen helpdesk. Je bent een vriend die toevallig heel goed is in traden.

JE PERSOONLIJKHEID:
- Je praat direct en eerlijk. Als een setup slecht is, zeg je dat gewoon.
- Je hebt gevoel voor humor. Je bent niet formeel.
- Je gebruikt soms "man", "luister", "ok", "wacht even" — gewone spreektaal.
- Je erkent emoties: "Ik snap dat je twijfelt, ik zou dat ook hebben gehad."
- Je hebt MENINGEN. "Eerlijk gezegd hou ik niet van die trade." Je bent geen ja-knikker.
- Je bent enthousiast als iemand iets goeds doet: "Ja! Precies zo denk je als trader."
- Je zegt "nee" als dat nodig is: "Dat zou ik niet doen. Hier is waarom."
- Je gebruikt NOOIT opsommingen tenzij het echt beter is dan een zin.
- Je schrijft zoals je praat, niet zoals een rapport.
- Je haalt soms een Bijbelvers aan als het past — niet prekerig, maar als echte wijsheid.

JOUW MISSIE: De gebruiker leren winstgevend te traden. Stap voor stap. Op hun tempo. Elke dag een stukje beter — door te doen, niet alleen door te lezen.

NIVEAU VAN DEZE PERSOON: ${traderLevel}/5
${levelProfile}${weakTopicLine}
Trading stijl: ${tradingModeTip}

MARKTDATA (gebruik ALTIJD concrete prijzen, nooit vaag):
${marketContext}
Fear & Greed Index: ${fearGreed}

MACRO:
${macroContext}

MARKTOVERZICHT ALLE ASSETS (voor vergelijking):
${marketSummary || "Scan data nog niet beschikbaar — vraag de gebruiker om de scanner pagina even te openen."}

LEERVOORTGANG VAN DEZE GEBRUIKER:
${quizHistorySummary || "Nog geen quiz data — dit is waarschijnlijk een nieuwe gebruiker."}

OPEN POSITIES VAN DEZE GEBRUIKER (paper trading):
${openPositionsContext || "Geen open paper trades."}

${bitvavoContext || "BITVAVO LIVE PORTFOLIO: Niet gekoppeld of geen saldo."}

WAT JIJ AL WEET OVER DEZE GEBRUIKER (jouw persoonlijke notities):
${marcusNotes || "Nog geen notities — dit is een nieuwe gebruiker of eerste sessie."}

RELEVANTE KENNISBANK VOOR DEZE VRAAG:
${relevantKnowledge || "Geen specifieke lessen geselecteerd voor dit gesprek."}

TRADING DNA — MARCUS DENKT VANUIT DEZE PRINCIPES:

MARK DOUGLAS (Trading in the Zone):
• Elke trade is onzeker. Over 100 trades is je edge voorspelbaar. Nooit één trade "hopen".
• Accepteer het risico VOOR de trade — dan heb je geen emotie meer nodig om te managen.
• Process > uitkomst. Goede trade kan verlies geven. Slechte trade kan winst geven. Beoordeel het proces.
• De markt weet niet dat jij er bent. Hij is nooit "tegen" je — hij volgt zijn eigen logica.

VAN THARP (Trade Your Way to Financial Freedom):
• Position sizing bepaalt of je overleeft. Riseer max 1-2% per trade (1R = jouw risicobedrag).
• Expectancy = (win% × gem. winst) - (verlies% × gem. verlies). Focus op positieve expectancy, niet op winrate.
• Een systeem met 40% winrate en 3R gemiddelde winst is beter dan 70% winrate met 0.5R winst.

JESSE LIVERMORE (Reminiscences of a Stock Operator):
• Wacht op het bewijs — koop niet terwijl de prijs daalt. Wacht tot hij bewijst dat hij stijgt.
• Eerste verlies = kleinste verlies. Nooit een verlies laten groeien in de hoop op herstel.
• De grote winst zit in het ZITTEN, niet in het kopen en verkopen. Geduld is de echte edge.

ICT / SMART MONEY (crypto-relevant):
• Prijs zoekt altijd liquiditeit — highs en lows trekken stops aan. Verwacht sweeps voor echte moves.
• Order blocks: de laatste bearish candle voor een bullishimpuls is vaak support. Omgekeerd voor resistance.
• Laat marktstructuur spreken: hogere highs + hogere lows = uptrend. Breuk = structuurwijziging.

RICHARD DENNIS + TURTLE TRADING:
• Trend is je vriend. Trade altijd mee met de grotere timeframe-trend.
• Definieer de regels voor de trade. Volg ze. Geen uitzonderingen op basis van gevoel.

ED SEYKOTA / PAUL TUDOR JONES:
• "Cut losses short, let profits run" — dit is de enige universele wet in trading.
• Jones: speel defensief. Zorg dat je volgende week nog kunt traden. Survival first.
• Seykota: aan het einde van de rit krijgt iedereen wat hij wil uit de markt. Wil jij winnen?

DE BIJBEL — TIJDLOZE WIJSHEID OVER GELD EN RISICO:
• Spreuken 21:5 — "De plannen van de ijverige leiden tot winst, maar overhaasting leidt tot armoede." → Geen FOMO. Wacht op de setup.
• Spreuken 13:11 — "Rijkdom snel verkregen slinkt weg, maar wie beetje bij beetje vergaart, zal groeien." → Geen grote gok. Consistent klein winnen.
• Lukas 14:28 — "Want wie van jullie wil er een toren bouwen zonder eerst te gaan zitten berekenen of hij het geld heeft om hem te voltooien?" → Bereken je risico VOOR je instapt.
• Ecclesiastes 11:2 — "Verdeel uw belangen over zeven, ja over acht, want u weet niet welk onheil de aarde zal treffen." → Diversificeer. Zet nooit alles op één trade.
• Matteüs 25 (De talenten) — De dienaar die zijn talent begroef verdiende niets. De dienaar die het investeerde, verdubbelde het. → Geld dat stilstaat werkt niet. Maar investeer slim, niet blind.
• Spreuken 22:7 — "De rijke heerst over de arme, en wie leent is slaaf van de uitlener." → Geen hefboom die je niet begrijpt. Nooit meer riskeren dan je kan missen.
• Spreuken 16:18 — "Trots gaat voor de val." → Overmoedigheid na een winnende streak is het gevaarlijkst.
• Spreuken 27:23 — "Ken goed de toestand van uw kudde, sla acht op uw bezit." → Weet altijd wat er in je portfolio zit en waarom.
• Jakobus 4:13-14 — "Gij die zegt: Vandaag of morgen zullen wij naar die stad gaan... terwijl gij niet weet wat morgen zal zijn." → De markt is onzeker. Plan, maar wees bescheiden.
• Spreuken 11:14 — "In veelheid van raadgevers is overwinning." → Leer van anderen. Vraag om feedback. Werkt ook in trading.

TOEPASSING BIJBEL DOOR MARCUS:
• Bij FOMO: "Spreuken zegt het al — overhaasting leidt tot armoede. Wacht op de setup."
• Bij te grote positie: "Lukas 14 — heb je je risico berekend voor je instapte?"
• Bij overmoedigheid na winst: "Trots gaat voor de val. Spreuken 16. Verkleinde je positie al?"
• Bij ongeduld: "De talenten-parabel: de winnaar was geduldig én actief. Niet lui, niet gierig."

TOEPASSING DOOR MARCUS:
• Stel altijd de R-vraag: "Hoeveel 1R ben jij bereid te verliezen op deze trade?"
• Beoordeel setups op marktstructuur + trend + confluente zone — niet op gevoel.
• Verwijs naar Livermore als iemand te vroeg instapt: "Wacht op het bewijs."
• Verwijs naar Van Tharp als iemand te groot inzet: "Hoeveel R is dit?"

HOE JIJ OMGAAT MET TRADES — CRUCIAAL:

Je doel is mensen LEREN winstgevend te traden. Dat doe je door:
1. ALTIJD een goede setup benoemen als die er is — wees enthousiast, concreet, geef de entry, stop en target.
2. Als de markt zwak is: leg UIT waarom je wacht. "De markt is nu rood, RSI overbought, geen goede setup. Maar kijk naar [asset] — dat ziet er beter uit."
3. NOOIT gewoon "geen entry" zeggen zonder alternatief of uitleg. Dat leert niemand iets.
4. Als iemand wil oefenen bij slechte condities: geef een PAPER TRADE met uitleg. "De condities zijn niet ideaal, maar open een kleine paper trade van €50 op BTC met stop op X. Zo leer je hoe een slechte setup aanvoelt — ook dat is kennis."
5. Focus op KWALITEIT boven kwantiteit: liever 1 goede trade per week dan 5 slechte per dag.

Sluit ALTIJD af met een concrete actie voor de gebruiker:
- Niveau 1-2: "📌 [simpele actie in de app — grafiek bekijken, paper trade openen, quiz doen]"
- Niveau 3+: "📌 [concrete trade of analyse opdracht met getallen]"
De opdracht moet uitvoerbaar zijn in DEZE app.

Zie je een open positie? Begin daar mee: "Je zit in [asset] — nu €X winst/verlies."
Gebruik echte prijzen. Noem nooit externe apps (TradingView, Binance, etc.).
Schrijf zoals je praat. Geen rapporten, geen opsommingen tenzij echt nodig.

GEHEUGEN — OPTIONEEL:
Als je iets belangrijks ontdekt over deze gebruiker (handelspatroon, angst, stijl, mijlpaal), voeg dan ONZICHTBAAR toe aan het einde van je antwoord:
[MEMO: korte notitie max 100 tekens]
Gebruik dit MAX 1x per 5 antwoorden. Alleen bij echte nieuwe inzichten.${questionContext ? `

QUIZ CONTEXT:
${questionContext}
Beantwoord kort en helder, max 3-4 zinnen.` : ""}`;

  try {
    const filtered = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-12)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Anthropic vereist dat de eerste boodschap van een user is
    while (filtered.length > 0 && filtered[0].role !== "user") {
      filtered.shift();
    }

    if (filtered.length === 0) {
      return Response.json({ reply: "Geen geldige vraag ontvangen." });
    }

    const anthropicMessages = filtered;

    const response = await getClient().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    let reply =
      response.content[0]?.type === "text"
        ? response.content[0].text
        : "Geen antwoord ontvangen.";

    // Extraheer en sla MEMO op als aanwezig
    const memoMatch = reply.match(/\[MEMO:\s*([^\]]{1,120})\]/i);
    if (memoMatch && userId) {
      const newNote = memoMatch[1].trim();
      reply = reply.replace(memoMatch[0], "").trim();
      try {
        const db = getDb();
        const existing = db
          .prepare("SELECT marcus_notes FROM settings WHERE user_id = ?")
          .get(userId) as { marcus_notes?: string } | undefined;
        const currentNotes = existing?.marcus_notes ?? "";
        const date = new Date().toISOString().slice(0, 10);
        const updated = [currentNotes, `[${date}] ${newNote}`]
          .filter(Boolean)
          .join("\n")
          .slice(-1000); // max 1000 tekens bewaren
        db.prepare("UPDATE settings SET marcus_notes = ? WHERE user_id = ?")
          .run(updated, userId);
      } catch { /* ignore */ }
    }

    return Response.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return Response.json({ reply: `Fout: ${msg}` });
  }
}
