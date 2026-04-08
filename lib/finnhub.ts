import type { Candle } from "./types";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

// Server-side cache
const cache = new Map<string, { data: unknown; ts: number }>();

function getCached<T>(key: string, ttl: number): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < ttl) return entry.data as T;
  return null;
}
function setCache(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() });
}

const RESOLUTION_MAP: Record<string, string> = {
  "1m": "1", "5m": "5", "15m": "15", "1h": "60", "4h": "60", "1d": "D",
};

const RANGE_SECONDS: Record<string, number> = {
  "1m":  2 * 24 * 3600,
  "5m":  7 * 24 * 3600,
  "15m": 30 * 24 * 3600,
  "1h":  90 * 24 * 3600,
  "4h":  365 * 24 * 3600,
  "1d":  5 * 365 * 24 * 3600,
};

// Cache TTL per interval
const CACHE_TTL: Record<string, number> = {
  "1m": 30_000, "5m": 60_000, "15m": 2 * 60_000,
  "1h": 5 * 60_000, "4h": 10 * 60_000, "1d": 30 * 60_000,
};

export function isFinnhubForex(finnhubSymbol: string): boolean {
  return finnhubSymbol.includes(":");
}

function aggregate4h(candles1h: Candle[]): Candle[] {
  const buckets = new Map<number, Candle[]>();
  const bucketMs = 4 * 3600 * 1000;
  for (const c of candles1h) {
    const bucket = Math.floor(c.openTime / bucketMs) * bucketMs;
    if (!buckets.has(bucket)) buckets.set(bucket, []);
    buckets.get(bucket)!.push(c);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([bucketTime, chunk]) => ({
      openTime: bucketTime,
      open: chunk[0].open,
      high: Math.max(...chunk.map(c => c.high)),
      low: Math.min(...chunk.map(c => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((s, c) => s + c.volume, 0),
      closeTime: bucketTime + bucketMs - 1,
    }));
}

export async function getFinnhubCandles(
  finnhubSymbol: string,
  interval: string
): Promise<Candle[]> {
  const cacheKey = `candles:${finnhubSymbol}:${interval}`;
  const ttl = CACHE_TTL[interval] ?? 5 * 60_000;
  const cached = getCached<Candle[]>(cacheKey, ttl);
  if (cached) return cached;

  const resolution = RESOLUTION_MAP[interval] ?? "D";
  const rangeSec = RANGE_SECONDS[interval] ?? RANGE_SECONDS["1d"];
  const to = Math.floor(Date.now() / 1000);
  const from = to - rangeSec;

  const apiKey = process.env.FINNHUB_API_KEY ?? "";
  const isForex = isFinnhubForex(finnhubSymbol);
  const base = isForex ? "forex/candle" : "stock/candle";
  const url = `${FINNHUB_BASE}/${base}?symbol=${encodeURIComponent(finnhubSymbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`;

  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Finnhub fout ${finnhubSymbol}: ${res.status}`);

  const data = await res.json();
  if (data.s !== "ok" || !data.t?.length) throw new Error(`Geen data voor ${finnhubSymbol}`);

  const candles: Candle[] = (data.t as number[]).map((t: number, i: number) => ({
    openTime: t * 1000,
    open: data.o[i],
    high: data.h[i],
    low: data.l[i],
    close: data.c[i],
    volume: data.v?.[i] ?? 0,
    closeTime: (t + (resolution === "D" ? 86400 : parseInt(resolution) * 60)) * 1000,
  }));

  const result = interval === "4h" ? aggregate4h(candles) : candles;
  setCache(cacheKey, result);
  return result;
}

export type FinnhubQuote = {
  symbol: string;
  price: number;
  change24h: number;
  previousClose: number;
};

export async function getFinnhubQuote(finnhubSymbol: string): Promise<FinnhubQuote> {
  const cacheKey = `quote:${finnhubSymbol}`;
  const cached = getCached<FinnhubQuote>(cacheKey, 15_000);
  if (cached) return cached;

  const apiKey = process.env.FINNHUB_API_KEY ?? "";
  const isForex = isFinnhubForex(finnhubSymbol);

  let price = 0;
  let change24h = 0;
  let previousClose = 0;

  if (isForex) {
    // Forex/commodity (goud, zilver, olie): gebruik Finnhub forex/rates voor huidige prijs
    // Dit werkt 24/5 (goud handelt 23u/dag) en geeft altijd de spot prijs
    const res = await fetch(
      `${FINNHUB_BASE}/forex/rates?base=USD&token=${apiKey}`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data = await res.json();
      // OANDA:XAU_USD → extract "XAU" uit het symbool
      const parts = finnhubSymbol.split(":");
      const pair = parts[1] ?? parts[0]; // bijv. "XAU_USD"
      const base = pair.split("_")[0];   // bijv. "XAU"
      const rate = data.quote?.[base];
      if (rate && rate > 0) {
        // forex/rates geeft hoeveel van `base` je krijgt per 1 USD
        // Voor XAU: 1 USD = 0.000xxx XAU → prijs = 1/rate
        price = 1 / rate;
      }
    }

    // Fallback: als forex/rates geen data heeft → recentste candle gebruiken
    if (price === 0) {
      const to = Math.floor(Date.now() / 1000);
      const from = to - 7200; // 2 uur terug
      const res2 = await fetch(
        `${FINNHUB_BASE}/forex/candle?symbol=${encodeURIComponent(finnhubSymbol)}&resolution=1&from=${from}&to=${to}&token=${apiKey}`,
        { cache: "no-store", signal: AbortSignal.timeout(5000) }
      );
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2.s === "ok" && data2.c?.length > 0) {
          price = data2.c[data2.c.length - 1];
          previousClose = data2.c[0];
        }
      }
    }

    change24h = previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0;
  } else {
    const res = await fetch(
      `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(finnhubSymbol)}&token=${apiKey}`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data = await res.json();
      price = data.c ?? 0;
      previousClose = data.pc ?? 0;
      change24h = previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : (data.dp ?? 0);
    }
  }

  const result: FinnhubQuote = { symbol: finnhubSymbol, price, change24h, previousClose };
  if (price > 0) setCache(cacheKey, result);
  return result;
}

export async function getFinnhubBatchQuotes(
  assets: { symbol: string; finnhubSymbol: string }[]
): Promise<Map<string, FinnhubQuote>> {
  const map = new Map<string, FinnhubQuote>();
  await Promise.allSettled(
    assets.map(async ({ symbol, finnhubSymbol }) => {
      try {
        const q = await getFinnhubQuote(finnhubSymbol);
        map.set(symbol, { ...q, symbol });
      } catch { /* ignore */ }
    })
  );
  return map;
}
