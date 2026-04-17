import { auth } from "@/auth";
import { getDb } from "@/db/db";
import Anthropic from "@anthropic-ai/sdk";
import { sharedScanCache } from "@/lib/scan-cache";

const MAX_PER_DAY = 3;

// key: `${userId}-${date}` → { scripts: string[], count: number }
const scriptCache = new Map<string, { scripts: string[]; count: number }>();

function getBtcData() {
  const { data } = sharedScanCache;
  if (!data) return null;
  const btc = data.find(a => a.ticker === "BTC" || a.symbol === "BTCUSDT");
  return btc ?? null;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const { searchParams } = new URL(request.url);
  const lang = searchParams.get("lang") ?? "nl";
  const isNL = lang !== "en";

  const today = new Date().toISOString().slice(0, 10);
  const cacheKey = `${userId}-${today}`;
  const cached = scriptCache.get(cacheKey);

  const count = cached?.count ?? 0;
  if (count >= MAX_PER_DAY) {
    return Response.json({ error: "Limiet bereikt — max 3 scripts per dag", count, maxCount: MAX_PER_DAY }, { status: 429 });
  }

  const btc = getBtcData();
  const price = btc ? Math.round(btc.price).toLocaleString("nl-NL") : "—";
  const change = btc ? `${btc.change24h >= 0 ? "+" : ""}${btc.change24h.toFixed(1)}%` : "—";
  const rsi = btc ? Math.round(btc.rsi) : 50;
  const trend = btc?.trend ?? "zijwaarts";
  const signal = btc?.signal ?? "Neutraal";

  const db = getDb();
  const quizRow = db.prepare("SELECT level FROM quiz_progress WHERE user_id = ?").get(userId) as { level: number } | undefined;
  const level = quizRow?.level ?? 1;

  const client = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null;

  if (!client) {
    return Response.json({ error: "API niet geconfigureerd" }, { status: 500 });
  }

  const systemPrompt = isNL
    ? `Je bent Marcus, directe Bitcoin-tradingcoach. Schrijf een 30-seconden TikTok/Reels/Shorts script in het Nederlands.
Formaat — schrijf EXACT in dit formaat met deze labels:
HOOK: [5 sec — pakkende openingszin met BTC prijs of percentage]
ANALYSE: [20 sec — 3-4 korte zinnen: trend, RSI, key level, wat Marcus verwacht]
CTA: [5 sec — "Leer dit zelf analyseren → link in bio. bitcoinmentor.be"]
HASHTAGS: [6-8 relevante hashtags, inclusief #bitcoinmentor]

Regels: spreektaal, geen jargon, directe toon. Eindig elke sectie met een witregel. Noem bitcoinmentor.be in de CTA.`
    : `You are Marcus, direct Bitcoin trading coach. Write a 30-second TikTok/Reels/Shorts script in English.
Format — write EXACTLY in this format:
HOOK: [5 sec — catchy opening with BTC price or percentage]
ANALYSE: [20 sec — 3-4 short sentences: trend, RSI, key level, what Marcus expects]
CTA: [5 sec — "Learn to analyze this yourself → link in bio. bitcoinmentor.be"]
HASHTAGS: [6-8 relevant hashtags, including #bitcoinmentor]

Rules: conversational, no jargon, direct tone. End each section with a blank line. Mention bitcoinmentor.be in the CTA.`;

  const context = isNL
    ? `BTC staat nu op €${price} (${change} vandaag). Trend: ${trend}. RSI: ${rsi}. Signaal: ${signal}. Gebruikersniveau: ${level}/5.`
    : `BTC is at €${price} (${change} today). Trend: ${trend}. RSI: ${rsi}. Signal: ${signal}. User level: ${level}/5.`;

  const msg = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 300,
    system: systemPrompt,
    messages: [{ role: "user", content: context }],
  });

  const raw = (msg.content[0] as { text: string }).text.trim();

  // Parse sections
  const hookMatch    = raw.match(/HOOK:\s*(.+?)(?=ANALYSE:|$)/s);
  const analyseMatch = raw.match(/ANALYSE:\s*(.+?)(?=CTA:|$)/s);
  const ctaMatch     = raw.match(/CTA:\s*(.+?)(?=HASHTAGS:|$)/s);
  const hashMatch    = raw.match(/HASHTAGS:\s*(.+?)$/s);

  const hook    = hookMatch?.[1]?.trim()    ?? "";
  const analyse = analyseMatch?.[1]?.trim() ?? "";
  const cta     = ctaMatch?.[1]?.trim()     ?? "";
  const hashtags = hashMatch?.[1]?.trim()   ?? "#bitcoin #crypto #bitcoinmentor";

  const fullScript = `${hook}\n\n${analyse}\n\n${cta}\n\n${hashtags}`;

  // Update cache
  const newCount = count + 1;
  const scripts = cached?.scripts ?? [];
  scripts.push(fullScript);
  scriptCache.set(cacheKey, { scripts, count: newCount });

  return Response.json({
    hook,
    analyse,
    cta,
    hashtags,
    script: fullScript,
    btcData: btc ? { price: btc.price, change24h: btc.change24h, trend: btc.trend, rsi, signal } : null,
    count: newCount,
    maxCount: MAX_PER_DAY,
  });
}
