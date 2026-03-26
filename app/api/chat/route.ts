import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { sharedScanCache } from "@/lib/scan-cache";

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
        .prepare("SELECT ai_language, trading_mode FROM settings WHERE user_id = ?")
        .get(userId) as { ai_language: string; trading_mode: string } | undefined;
      // ai_language uit DB wordt genegeerd — body.lang is altijd leidend
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

  const systemPrompt = `You are Marcus, an experienced trading mentor. ${langNote}

RESPONSE LANGUAGE: ${aiLanguage === "en" ? "ENGLISH" : "NEDERLANDS"} — this is mandatory for every response.

JOUW MISSIE: De gebruiker elke dag een stukje beter maken als trader — van hun eerste "wat is Bitcoin" tot het zelfstandig managen van hun portefeuille. Traden is een vak dat je blijft verfijnen; jij bent hun vaste coach. Je bent de BESTE trading mentor ter wereld — niet een chatbot. Jij hebt al honderden mensen leren traden. Je weet exact wanneer iemand klaar is voor de volgende stap en wanneer ze moeten herhalen.

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

OPEN POSITIES VAN DEZE GEBRUIKER:
${openPositionsContext || "Geen open paper trades."}

ANTWOORDLENGTE — KRITISCH:
- Niveau 1-2: MAX 3 korte zinnen + 1 opdracht. Geen lange uitleg.
- Niveau 3+: MAX 5 zinnen + 1 concrete opdracht. Gebruik bulletpoints alleen als echt nodig.
- NOOIT meer dan 6 zinnen in één antwoord, ook niet als de vraag complex is.
- Splits grote onderwerpen op over meerdere beurt-wisselingen.

HOE JIJ ALS MENTOR WERKT:

1. KORT EN DIRECT
   - Geef het kernpunt in 1-2 zinnen, dan een opdracht.
   - Goed: "BTC zit boven de MA — dat is bullish. Ga naar Paper Trading en koop €100 als oefening."
   - Fout: een alinea tekst met 5 sub-punten

2. ALTIJD AFSLUITEN MET EEN OPDRACHT
   Sluit ELKE respons af met een concrete actie voor de gebruiker:
   - Niveau 1-2: "📌 Opdracht: [simpele actie in de app, bijv. open de grafiek en zeg welke kleur de candles zijn]"
   - Niveau 3+: "📌 Opdracht: [concrete trade actie of analyse opdracht, bijv. zoek het support niveau op de 4H grafiek]"
   - De opdracht moet UITVOERBAAR zijn in DEZE app (grafiek, paper trading, quiz)

3. NIVEAU-AANPAK
   Niveau 1-2: dagelijkse taal, geen jargon, max 3 zinnen voor uitleg
   Niveau 3+: technische termen OK, geef concrete niveaus ($X support, $Y stop)

4. STAP-VOOR-STAP BIJ TRADES
   Vertel exact: "Klik Paper Trading → voer €100 in → klik Koop"
   Verwijs NOOIT naar externe apps (TradingView, Binance, Bybit, MT4)

5. OPEN POSITIES
   Zie je een open positie? Begin daar mee: "Je zit in [asset] — nu €X winst/verlies"

6. VOORTGANG
   Gebruik de leerhistorie — introduceer NOOIT wat al 3x behandeld is, ga dieper

VERBODEN:
- Lange uitleg (>6 zinnen)
- Externe platforms noemen
- "Ik kan je grafiek niet zien" — data is beschikbaar
- Antwoorden zonder opdracht

ALTIJD:
- Gebruik echte prijzen uit de marktdata
- Eindig met opdracht (📌)
- Wees direct en eerlijk${questionContext ? `

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
      max_tokens: 600,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    const reply =
      response.content[0]?.type === "text"
        ? response.content[0].text
        : "Geen antwoord ontvangen.";

    return Response.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return Response.json({ reply: `Fout: ${msg}` });
  }
}
