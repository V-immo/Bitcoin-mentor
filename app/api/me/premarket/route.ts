import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import Anthropic from "@anthropic-ai/sdk";
import { sharedScanCache } from "@/lib/scan-cache";
import {
  getCachedFearGreed,
  getCachedGlobalMetrics,
} from "@/lib/market-poller";

// Rate limit: max 5x per uur per user
const rateMap = new Map<string, { count: number; resetAt: number }>();
function checkRate(key: string): boolean {
  const now = Date.now();
  const e = rateMap.get(key);
  if (!e || now > e.resetAt) { rateMap.set(key, { count: 1, resetAt: now + 3_600_000 }); return true; }
  if (e.count >= 5) return false;
  e.count++;
  return true;
}

// Cache per user per dag
const dailyCache = new Map<string, { focus: string; ts: number }>();

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const today = new Date().toISOString().slice(0, 10);
  const cacheKey = `${userId}-${today}`;

  // Geef gecachede focus terug als die er al is
  const cached = dailyCache.get(cacheKey);
  if (cached) return Response.json({ focus: cached.focus, cached: true });

  // Increment premarket_count (eenmalig per dag — alleen bij eerste call)
  try {
    getDb().prepare("UPDATE users SET premarket_count = COALESCE(premarket_count, 0) + 1 WHERE id = ?").run(userId);
  } catch { /* kolom bestaat nog niet — migratie draait later */ }

  if (!checkRate(String(userId))) {
    return Response.json({ error: "Even wachten, probeer straks opnieuw." }, { status: 429 });
  }

  const { asset = "BTCUSDT" } = await request.json().catch(() => ({}));

  const db = getDb();

  // Gebruikersinstellingen
  const settings = db.prepare(
    "SELECT trading_mode, risk_per_trade FROM settings LEFT JOIN trading_plan ON settings.user_id = trading_plan.user_id WHERE settings.user_id = ?"
  ).get(userId) as { trading_mode?: string; risk_per_trade?: number } | undefined;
  const tradingMode = settings?.trading_mode ?? "swing";
  const riskPct = settings?.risk_per_trade ?? 1;

  // Open posities
  const papers = db.prepare(
    "SELECT asset, position FROM paper_trading WHERE user_id = ? AND position IS NOT NULL"
  ).all(userId) as { asset: string; position: string }[];
  const openPositions = papers
    .map(p => {
      try {
        const pos = JSON.parse(p.position) as { openBtc?: number; avgEntry?: number; activeSL?: number };
        if (!pos?.openBtc) return null;
        return `${p.asset.replace("USDT","")} — ${pos.openBtc.toFixed(4)} @ $${pos.avgEntry?.toFixed(0) ?? "?"} (SL: ${pos.activeSL ? "$" + pos.activeSL.toFixed(0) : "niet ingesteld"})`;
      } catch { return null; }
    })
    .filter(Boolean);

  // Gisteren's P&L
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const yJournal = db.prepare(
    "SELECT note, emotion FROM trade_journal WHERE user_id = ? AND date = ?"
  ).get(userId, yesterday) as { note?: string; emotion?: number } | undefined;

  // Live marktdata
  const [fearGreed, globalMetrics] = await Promise.all([
    getCachedFearGreed(),
    getCachedGlobalMetrics(),
  ]);

  const btc = sharedScanCache.data?.find(s => s.symbol === "BTCUSDT");
  const focusAsset = sharedScanCache.data?.find(s => s.symbol === asset);

  const marketContext = [
    btc ? `BTC: $${btc.price.toLocaleString("en-US")} (${btc.change24h >= 0 ? "+" : ""}${btc.change24h.toFixed(1)}% 24u) | trend: ${btc.trend} | RSI: ${btc.rsi.toFixed(0)} | score: ${btc.score}/100` : "",
    fearGreed ? `Fear & Greed: ${fearGreed}` : "",
    globalMetrics ? `Totale marktcap: $${(globalMetrics.totalMarketCapUsd / 1e12).toFixed(2)}T | BTC dominantie: ${globalMetrics.btcDominance.toFixed(1)}%` : "",
    focusAsset && focusAsset.symbol !== "BTCUSDT" ? `${focusAsset.symbol.replace("USDT","")}: $${focusAsset.price.toLocaleString("en-US")} | trend: ${focusAsset.trend} | score: ${focusAsset.score}/100` : "",
  ].filter(Boolean).join("\n");

  const contextStr = [
    `Trading mode: ${tradingMode === "day" ? "Day trading" : tradingMode === "long" ? "Long term" : "Swing trading"}`,
    `Max risico per trade: ${riskPct}%`,
    openPositions.length > 0 ? `Open posities:\n${openPositions.map(p => "  " + p).join("\n")}` : "Geen open posities",
    yJournal?.note ? `Gisteren notitie: "${yJournal.note}"` : "",
    `\nMARKT VANDAAG:\n${marketContext}`,
  ].filter(Boolean).join("\n");

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ focus: "Marcus is niet beschikbaar. Controleer je markt, zet je stop-loss en houd je plan vast." });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      system: `Je bent Marcus. Schrijf een KORTE pre-market focus (max 4 zinnen) voor deze trader.
Wees DIRECT en CONCREET. Geen pep talk. Geef:
1. Wat de markt vandaag doet (kort)
2. Één concreet aandachtspunt voor vandaag (level, setup, of risico)
3. Eventuele opmerking over open positie of gisteren
Eindig met één zin als mentale anchor voor de dag. Geen aanhef.`,
      messages: [{ role: "user", content: contextStr }],
    });

    const focus = (msg.content[0] as { text: string }).text.trim();
    dailyCache.set(cacheKey, { focus, ts: Date.now() });
    return Response.json({ focus, cached: false });
  } catch {
    return Response.json({ focus: "Marktdata geladen. Check je plan, zet je stops en wacht op een duidelijke setup." });
  }
}
