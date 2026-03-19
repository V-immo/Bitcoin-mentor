import { NextRequest } from "next/server";
import { getCandles } from "@/lib/market";
import { getFinnhubCandles } from "@/lib/finnhub";
import { isFinnhubAsset, getFinnhubSymbol } from "@/lib/assets";

// Cache-TTL per interval (seconden)
const CACHE_TTL: Record<string, number> = {
  "1m": 15, "5m": 30, "15m": 60, "1h": 120, "4h": 300, "1d": 600, "1W": 1800,
};

// HTTP Cache-Control per interval
const BROWSER_CACHE: Record<string, number> = {
  "1m": 10, "5m": 20, "15m": 45, "1h": 90, "4h": 240, "1d": 540, "1W": 1700,
};

// Binance limit per interval
const BINANCE_LIMIT: Record<string, number> = {
  "1m": 500, "5m": 500, "15m": 500, "1h": 500, "4h": 500, "1d": 500,
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
  const ttl = CACHE_TTL[interval] ?? 120;
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
      const finnhubSymbol = getFinnhubSymbol(symbol);
      candles = await getFinnhubCandles(finnhubSymbol, interval);
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
