/**
 * market-poller.ts
 * Gedeelde module-level cache voor externe marktdata.
 * Wordt actief bijgewerkt via startPoller() (aangeroepen vanuit instrumentation.ts).
 * Alle sessies wereldwijd (Aziatisch, Europees, VS) krijgen altijd verse data.
 */

import { sharedScanCache } from "./scan-cache";
import { calculateRsi } from "./market";

const POLL_INTERVAL = 30 * 60 * 1000; // 30 minuten
const EXT_TTL       = 35 * 60 * 1000; // 35 min — iets ruimer dan poll interval

type Cached<T> = { data: T; ts: number } | null;

// Gedeelde cache — geïmporteerd door chat route en andere modules
export let cachedFearGreed:    Cached<string>        = null;
export let cachedGlobalMetrics: Cached<GlobalMetrics> = null;
export let cachedFunding:      Cached<FundingData[]> = null;

export type GlobalMetrics = {
  btcDominance: string;
  totalMarketCap: string;
  marketCapChange24h: string;
};

export type FundingData = {
  symbol: string;
  fundingRate: string;
  openInterest: string;
};

// --- Fetch functies ---

export async function fetchFearAndGreed(): Promise<string> {
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

export async function fetchGlobalMetrics(): Promise<GlobalMetrics> {
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
    return {
      btcDominance: `${d.market_cap_percentage?.btc?.toFixed(1) ?? "?"}%`,
      totalMarketCap: d.total_market_cap?.usd
        ? `$${(d.total_market_cap.usd / 1e12).toFixed(2)}T`
        : "onbekend",
      marketCapChange24h: typeof d.market_cap_change_percentage_24h_usd === "number"
        ? `${d.market_cap_change_percentage_24h_usd.toFixed(2)}%`
        : "onbekend",
    };
  } catch {
    return fallback;
  }
}

export async function fetchFundingRates(): Promise<FundingData[]> {
  const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"];
  const results: FundingData[] = [];
  try {
    const [premiumRes, ...oiCalls] = await Promise.allSettled([
      fetch("https://fapi.binance.com/fapi/v1/premiumIndex", { next: { revalidate: 300 } }),
      ...symbols.map(s =>
        fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${s}`, { next: { revalidate: 300 } })
          .then(r => r.ok ? r.json() : null)
      ),
    ]);

    const premiumData: { symbol: string; lastFundingRate: string; markPrice?: string }[] =
      premiumRes.status === "fulfilled" && premiumRes.value.ok
        ? await premiumRes.value.json()
        : [];

    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i];
      const pm = premiumData.find(p => p.symbol === sym);
      if (!pm) continue;
      const rate = parseFloat(pm.lastFundingRate) * 100;
      const rateStr = `${rate >= 0 ? "+" : ""}${rate.toFixed(4)}%`;

      let oiStr = "onbekend";
      const oiResult = oiCalls[i];
      if (oiResult.status === "fulfilled" && oiResult.value) {
        const oiVal = parseFloat(oiResult.value.openInterest ?? "0");
        const markPrice = parseFloat(pm.markPrice ?? "0");
        const oiUsd = oiVal * markPrice;
        oiStr = oiUsd > 1e9 ? `$${(oiUsd / 1e9).toFixed(1)}B`
              : oiUsd > 1e6 ? `$${(oiUsd / 1e6).toFixed(0)}M`
              : "onbekend";
      }
      results.push({ symbol: sym.replace("USDT", ""), fundingRate: rateStr, openInterest: oiStr });
    }
  } catch { /* geen data */ }
  return results;
}

// --- Gecachede wrappers (voor on-demand gebruik in chat route) ---

export async function getCachedFearGreed(): Promise<string> {
  if (cachedFearGreed && Date.now() - cachedFearGreed.ts < EXT_TTL) return cachedFearGreed.data;
  const data = await fetchFearAndGreed();
  cachedFearGreed = { data, ts: Date.now() };
  return data;
}

export async function getCachedGlobalMetrics(): Promise<GlobalMetrics> {
  if (cachedGlobalMetrics && Date.now() - cachedGlobalMetrics.ts < EXT_TTL) return cachedGlobalMetrics.data;
  const data = await fetchGlobalMetrics();
  cachedGlobalMetrics = { data, ts: Date.now() };
  return data;
}

export async function getCachedFundingRates(): Promise<FundingData[]> {
  if (cachedFunding && Date.now() - cachedFunding.ts < EXT_TTL) return cachedFunding.data;
  const data = await fetchFundingRates();
  cachedFunding = { data, ts: Date.now() };
  return data;
}

// --- BTC snapshot poller (vult sharedScanCache voor nudge/chat/market-stats) ---

type BinanceTicker24h = {
  lastPrice: string;
  priceChangePercent: string;
};

type BinanceKlineRow = [number, string, string, string, string, string, number, ...unknown[]];

async function fetchBtcSnapshot(): Promise<void> {
  try {
    const [tickerRes, klineRes] = await Promise.all([
      fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT", { cache: "no-store" }),
      fetch("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=100", { cache: "no-store" }),
    ]);
    if (!tickerRes.ok || !klineRes.ok) return;

    const ticker = await tickerRes.json() as BinanceTicker24h;
    const klines = await klineRes.json() as BinanceKlineRow[];

    const price = parseFloat(ticker.lastPrice);
    const change24h = parseFloat(ticker.priceChangePercent);
    if (!isFinite(price) || price <= 0) return;

    const candles = klines.map(row => ({
      openTime: Number(row[0]),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
      closeTime: Number(row[6]),
    }));

    const closes = candles.map(c => c.close);
    const rsi = calculateRsi(candles, 14);
    const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, closes.length);
    const ma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, closes.length);
    const trend = ma20 > ma50 * 1.01 ? "omhoog" : ma20 < ma50 * 0.99 ? "omlaag" : "zijwaarts";

    let score = 50;
    if (rsi < 35) score += 15; else if (rsi < 50) score += 8;
    else if (rsi > 70) score -= 15; else if (rsi > 60) score -= 5;
    if (trend === "omhoog") score += 12; else if (trend === "omlaag") score -= 12;
    score = Math.max(0, Math.min(100, Math.round(score)));

    const color: "green" | "yellow" | "red" = score >= 60 ? "green" : score >= 40 ? "yellow" : "red";
    const signal = rsi > 70 ? "Overkocht" : rsi < 30 ? "Oververkocht" : trend === "omhoog" ? "Bullish" : trend === "omlaag" ? "Bearish" : "Neutraal";

    const btcEntry = {
      symbol: "BTCUSDT", name: "Bitcoin", ticker: "BTC", type: "crypto", emoji: "₿",
      price, change24h, score, color, signal, trend, rsi,
    };

    // Behoud bestaande scan data — update of voeg BTC toe
    const existing = sharedScanCache.data ?? [];
    const idx = existing.findIndex(e => e.ticker === "BTC" || e.symbol === "BTCUSDT");
    if (idx >= 0) {
      existing[idx] = btcEntry;
      sharedScanCache.ts = Date.now();
    } else {
      sharedScanCache.data = [btcEntry, ...existing];
      sharedScanCache.ts = Date.now();
    }
  } catch {
    // stilletjes falen — stale cache blijft bruikbaar
  }
}

// --- Actieve background poller ---

let pollerStarted = false;

async function pollAll(): Promise<void> {
  try {
    const [fg, gm, fr] = await Promise.allSettled([
      fetchFearAndGreed(),
      fetchGlobalMetrics(),
      fetchFundingRates(),
      fetchBtcSnapshot(),
    ]);
    if (fg.status === "fulfilled") cachedFearGreed    = { data: fg.value, ts: Date.now() };
    if (gm.status === "fulfilled") cachedGlobalMetrics = { data: gm.value, ts: Date.now() };
    if (fr.status === "fulfilled") cachedFunding      = { data: fr.value, ts: Date.now() };
    // btcSnapshot werkt direct op sharedScanCache, geen return value nodig
  } catch {
    // stilletjes falen — stale cache blijft geldig
  }
}

/**
 * Start de background poller. Veilig om meerdere keren aan te roepen — start maar 1x.
 * Wordt aangeroepen vanuit instrumentation.ts bij server-opstart.
 */
export function startPoller(): void {
  if (pollerStarted) return;
  pollerStarted = true;

  // Direct eerste run zodat cache gevuld is bij opstart
  pollAll();

  // Daarna elke 30 minuten — ongeacht of er gebruikers actief zijn
  setInterval(pollAll, POLL_INTERVAL);
}
