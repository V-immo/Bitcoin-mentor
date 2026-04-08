import { SCAN_ASSETS } from "@/lib/assets";
import { getCandles } from "@/lib/market";
import { getFinnhubCandles, getFinnhubBatchQuotes } from "@/lib/finnhub";
import { calculateRsi, analyzeTimeframe, detectStructure } from "@/lib/market";
import type { Candle } from "@/lib/types";
import { sharedScanCache } from "@/lib/scan-cache";

// Server-side cache: 10 seconden — zo live mogelijk zonder WebSocket
let scanCache: { data: unknown; ts: number } | null = null;
const SCAN_TTL = 10_000;

export type ScanResult = {
  symbol: string;
  name: string;
  ticker: string;
  type: string;
  emoji: string;
  price: number;
  change24h: number;
  score: number;
  color: "green" | "yellow" | "red";
  signal: string;
  trend: string;
  rsi: number;
  candles: Candle[];   // laatste 30 voor sparkline
};

function quickScore(candles: Candle[], price: number): { score: number; rsi: number; trend: string } {
  if (candles.length < 20) return { score: 50, rsi: 50, trend: "zijwaarts" };

  let score = 50;

  // RSI
  let rsi = 50;
  try { rsi = calculateRsi(candles, 14); } catch { /* ignore */ }
  if (rsi < 35) score += 15;          // oververkocht = kans
  else if (rsi < 50) score += 8;
  else if (rsi > 70) score -= 15;     // overkocht = gevaar
  else if (rsi > 60) score -= 5;

  // Trend (MA20 vs MA50 op dagbasis)
  const closes = candles.map((c) => c.close);
  let trend = "zijwaarts";
  if (closes.length >= 50) {
    const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const ma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
    if (ma20 > ma50 * 1.01) { score += 12; trend = "omhoog"; }
    else if (ma20 < ma50 * 0.99) { score -= 12; trend = "omlaag"; }
  }

  // Recente momentum (laatste 5 vs vorige 5 candles)
  const recent5 = closes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const prev5   = closes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
  if (recent5 > prev5 * 1.02) score += 8;
  else if (recent5 < prev5 * 0.98) score -= 8;

  // Structuur
  try {
    const str = detectStructure(candles, 30);
    if (str === "bullish") score += 10;
    else if (str === "bearish") score -= 10;
  } catch { /* ignore */ }

  // Prijs vs 52-week high (voor stocks: dichtbij high = voorzichtig, ver eronder = kans)
  const high52 = Math.max(...candles.map((c) => c.high));
  const distFromHigh = ((high52 - price) / high52) * 100;
  if (distFromHigh > 30) score += 5;   // forse dip
  else if (distFromHigh < 5) score -= 5; // dichtbij top

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    rsi: Math.round(rsi),
    trend,
  };
}

function scoreToColor(score: number): "green" | "yellow" | "red" {
  if (score >= 62) return "green";
  if (score >= 42) return "yellow";
  return "red";
}

function scoreToSignal(score: number, color: string): string {
  if (color === "green") return "Goed moment";
  if (color === "yellow") return "Wachten";
  return "Vermijden";
}

export async function GET() {
  // Serveer uit cache als vers genoeg
  if (scanCache && Date.now() - scanCache.ts < SCAN_TTL) {
    return Response.json(scanCache.data);
  }

  // Haal Finnhub quotes op
  const finnhubAssets = SCAN_ASSETS.filter((a) => a.source === "finnhub")
    .map((a) => ({ symbol: a.symbol, finnhubSymbol: a.finnhubSymbol ?? a.symbol }));
  const binanceSymbols = SCAN_ASSETS.filter((a) => a.source === "binance").map((a) => a.symbol);

  // Binance 24h tickers
  const binanceTickers = new Map<string, { price: number; change24h: number }>();
  try {
    const symbolList = JSON.stringify(binanceSymbols.map((s) => `"${s}"`).join(",")).replace(/"/g, "").replace(/,/g, '","');
    const binRes = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=["${binanceSymbols.join('","')}"]`,
      { cache: "no-store" }
    );
    if (binRes.ok) {
      const data = await binRes.json();
      for (const t of data) {
        binanceTickers.set(t.symbol, {
          price: parseFloat(t.lastPrice),
          change24h: parseFloat(t.priceChangePercent),
        });
      }
    }
  } catch { /* ignore */ }

  // Finnhub batch quotes
  const finnhubQuotes = await getFinnhubBatchQuotes(finnhubAssets);

  // Haal candles op voor alle assets parallel
  const results = await Promise.allSettled(
    SCAN_ASSETS.map(async (asset): Promise<ScanResult> => {
      let price = 0;
      let change24h = 0;
      let candles: Candle[] = [];

      if (asset.source === "binance") {
        const ticker = binanceTickers.get(asset.symbol);
        price = ticker?.price ?? 0;
        change24h = ticker?.change24h ?? 0;
        // Dagelijks voor scoring (MA20/MA50/RSI), uurlijks voor live sparkline
        // Promise.allSettled zodat als één fetch faalt de andere nog werkt
        const [dailyRes, hourlyRes] = await Promise.allSettled([
          getCandles("1d", 60, asset.symbol),
          getCandles("1h", 48, asset.symbol),
        ]);
        const dailyCandles = dailyRes.status === "fulfilled" ? dailyRes.value : [];
        const hourlyCandles = hourlyRes.status === "fulfilled" ? hourlyRes.value : [];

        const { score: s, rsi: r, trend: tr } = quickScore(dailyCandles, price);
        const color = scoreToColor(s);
        // Fallback: als hourly mislukt, gebruik dagelijkse candles voor sparkline
        const sparkline = hourlyCandles.length > 0 ? hourlyCandles : dailyCandles.slice(-30);
        return {
          symbol: asset.symbol,
          name: asset.name,
          ticker: asset.ticker,
          type: asset.type,
          emoji: asset.emoji,
          price,
          change24h,
          score: s,
          color,
          signal: scoreToSignal(s, color),
          trend: tr,
          rsi: r,
          candles: sparkline,
        };
      } else {
        const quote = finnhubQuotes.get(asset.symbol);
        price = quote?.price ?? 0;
        change24h = quote?.change24h ?? 0;
        try {
          candles = await getFinnhubCandles(asset.finnhubSymbol ?? asset.symbol, "1d");
        } catch { /* ignore */ }
      }

      const { score, rsi, trend } = quickScore(candles, price);
      const color = scoreToColor(score);

      return {
        symbol: asset.symbol,
        name: asset.name,
        ticker: asset.ticker,
        type: asset.type,
        emoji: asset.emoji,
        price,
        change24h,
        score,
        color,
        signal: scoreToSignal(score, color),
        trend,
        rsi,
        candles: candles.slice(-30),
      };
    })
  );

  const scan: ScanResult[] = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          symbol: SCAN_ASSETS[i].symbol,
          name: SCAN_ASSETS[i].name,
          ticker: SCAN_ASSETS[i].ticker,
          type: SCAN_ASSETS[i].type,
          emoji: SCAN_ASSETS[i].emoji,
          price: 0,
          change24h: 0,
          score: 50,
          color: "yellow" as const,
          signal: "Onbekend",
          trend: "zijwaarts",
          rsi: 50,
          candles: [],
        }
  );

  scanCache = { data: scan, ts: Date.now() };
  // Deel ook met chat route (geen HTTP-call nodig)
  sharedScanCache.data = scan.map(({ candles: _c, ...rest }) => rest);
  sharedScanCache.ts = scanCache.ts;
  return Response.json(scan);
}
