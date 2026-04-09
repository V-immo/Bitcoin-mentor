import { NextRequest } from "next/server";
import { getCandles } from "@/lib/market";
import { getYahooCandles } from "@/lib/yahoo";
import { isFinnhubAsset } from "@/lib/assets";

// Periodeduur per interval in milliseconden
const PERIOD_MS: Record<string, number> = {
  "1m": 60_000, "5m": 300_000, "15m": 900_000,
  "1h": 3_600_000, "4h": 14_400_000, "1d": 86_400_000, "1W": 604_800_000,
};

/**
 * Bereken TTL (seconden) tot het einde van de huidige candle-periode.
 * Zo vervalt de cache precies als de candle sluit — niet eerder, niet later.
 * Minimaal 5s buffer om race-conditions te vermijden.
 */
function ttlUntilNextClose(interval: string): number {
  const periodMs = PERIOD_MS[interval];
  if (!periodMs) return 120;
  const msUntilClose = periodMs - (Date.now() % periodMs);
  return Math.max(5, Math.floor(msUntilClose / 1000));
}

// HTTP Cache-Control per interval (iets korter dan server-TTL)
const BROWSER_CACHE: Record<string, number> = {
  "1m": 10, "5m": 20, "15m": 45, "1h": 90, "4h": 240, "1d": 540, "1W": 1700,
};

// Binance limit per interval (max 1000 per call)
// Chart toont standaard laatste 80, maar gebruiker kan uitzoomen voor meer context
const BINANCE_LIMIT: Record<string, number> = {
  "1m": 1000,  // ~16 uur
  "5m": 1000,  // ~3.5 dagen
  "15m": 1000, // ~10 dagen
  "1h": 1000,  // ~42 dagen
  "4h": 1000,  // ~166 dagen
  "1d": 1000,  // ~2.7 jaar
};

type CacheEntry = { data: unknown; ts: number };
const cache = new Map<string, CacheEntry>();

function getCached(key: string, ttl: number): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttl * 1000) { cache.delete(key); return null; }
  return entry.data;
}

function setCached(key: string, data: unknown) {
  // Gooi oude entries weg als cache te groot wordt
  if (cache.size > 200) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts).slice(0, 50);
    oldest.forEach(([k]) => cache.delete(k));
  }
  cache.set(key, { data, ts: Date.now() });
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") ?? "BTCUSDT";
  const interval = request.nextUrl.searchParams.get("interval") ?? "1d";
  const cacheKey = `${symbol}_${interval}`;
  const ttl = ttlUntilNextClose(interval);
  const browserTtl = BROWSER_CACHE[interval] ?? 90;

  // Servercache hit
  const cached = getCached(cacheKey, ttl);
  if (cached) {
    return Response.json(cached, {
      headers: { "Cache-Control": `public, s-maxage=${browserTtl}, stale-while-revalidate=60` },
    });
  }

  try {
    let candles: unknown;
    if (isFinnhubAsset(symbol)) {
      // Yahoo Finance: gratis, geen API key, werkt voor aandelen/ETFs/grondstoffen
      // symbol is al compatibel met Yahoo (NFLX, GC=F, SI=F, etc.)
      candles = await getYahooCandles(symbol, interval);
    } else {
      const limit = BINANCE_LIMIT[interval] ?? 500;
      candles = await getCandles(
        interval as "1m" | "5m" | "15m" | "1h" | "4h" | "1d",
        limit,
        symbol
      );
    }

    setCached(cacheKey, candles);
    return Response.json(candles, {
      headers: { "Cache-Control": `public, s-maxage=${browserTtl}, stale-while-revalidate=60` },
    });
  } catch {
    return Response.json([], {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
