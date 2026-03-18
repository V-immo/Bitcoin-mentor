import type { Candle } from "./types";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
};

// Server-side cache: 5 minuten per symbol
const yahooCache = new Map<string, { data: unknown; ts: number }>();
const YAHOO_TTL = 5 * 60 * 1000; // 5 min

function getCached<T>(key: string): T | null {
  const entry = yahooCache.get(key);
  if (entry && Date.now() - entry.ts < YAHOO_TTL) return entry.data as T;
  return null;
}
function setCache(key: string, data: unknown) {
  yahooCache.set(key, { data, ts: Date.now() });
}

type YahooChartResult = {
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      open?: (number | null)[];
      high?: (number | null)[];
      low?: (number | null)[];
      close?: (number | null)[];
      volume?: (number | null)[];
    }>;
  };
  meta?: {
    regularMarketPrice?: number;
    previousClose?: number;
    currency?: string;
  };
};

export async function getYahooCandles(
  symbol: string,
  interval: "1d" | "1h" = "1d",
  range: string = "2y"
): Promise<Candle[]> {
  const cacheKey = `candles:${symbol}:${interval}:${range}`;
  const cached = getCached<Candle[]>(cacheKey);
  if (cached) return cached;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
  const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`Yahoo Finance fout voor ${symbol}: ${res.status}`);

  const json = await res.json();
  const result: YahooChartResult = json?.chart?.result?.[0];
  if (!result?.timestamp || !result.indicators?.quote?.[0]) {
    throw new Error(`Geen data voor ${symbol}`);
  }

  const { timestamp } = result;
  const q = result.indicators.quote[0];
  const candles: Candle[] = [];

  for (let i = 0; i < timestamp.length; i++) {
    const o = q.open?.[i];
    const h = q.high?.[i];
    const l = q.low?.[i];
    const c = q.close?.[i];
    const v = q.volume?.[i];
    if (o == null || h == null || l == null || c == null) continue;
    candles.push({
      openTime: timestamp[i] * 1000,
      open: o,
      high: h,
      low: l,
      close: c,
      volume: v ?? 0,
      closeTime: (timestamp[i] + (interval === "1d" ? 86400 : 3600)) * 1000,
    });
  }

  setCache(cacheKey, candles);
  return candles;
}

export async function getYahooPrice(symbol: string): Promise<number> {
  const cacheKey = `price:${symbol}`;
  const cached = getCached<number>(cacheKey);
  if (cached) return cached;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
  const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`Yahoo prijs fout voor ${symbol}: ${res.status}`);
  const json = await res.json();
  const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (!price) throw new Error(`Geen prijs voor ${symbol}`);
  setCache(cacheKey, price);
  return price;
}

export type YahooQuote = {
  symbol: string;
  price: number;
  change24h: number;      // percentage
  previousClose: number;
};

export async function getYahooBatchQuotes(symbols: string[]): Promise<Map<string, YahooQuote>> {
  const map = new Map<string, YahooQuote>();
  if (symbols.length === 0) return map;

  const cacheKey = `batch:${symbols.sort().join(",")}`;
  const cached = getCached<[string, YahooQuote][]>(cacheKey);
  if (cached) return new Map(cached);

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.map(encodeURIComponent).join(",")}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketPreviousClose`;
    const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
    if (!res.ok) throw new Error("Yahoo batch quote fout");
    const json = await res.json();
    const quotes = json?.quoteResponse?.result ?? [];
    for (const q of quotes) {
      map.set(q.symbol, {
        symbol: q.symbol,
        price: q.regularMarketPrice ?? 0,
        change24h: q.regularMarketChangePercent ?? 0,
        previousClose: q.regularMarketPreviousClose ?? 0,
      });
    }
    setCache(cacheKey, [...map.entries()]);
  } catch {
    // Fallback: fetch individually
    await Promise.allSettled(
      symbols.map(async (s) => {
        try {
          const price = await getYahooPrice(s);
          map.set(s, { symbol: s, price, change24h: 0, previousClose: price });
        } catch { /* ignore */ }
      })
    );
  }

  return map;
}

export async function getYahooNews(symbol: string, count = 5): Promise<{ title: string; link: string; publisher: string; published: number }[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=0&newsCount=${count}&enableFuzzyQuery=false`;
    const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.news ?? []).map((n: { title: string; link: string; publisher: string; providerPublishTime: number }) => ({
      title: n.title,
      link: n.link,
      publisher: n.publisher,
      published: n.providerPublishTime * 1000,
    }));
  } catch {
    return [];
  }
}
