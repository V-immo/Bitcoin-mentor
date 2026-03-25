import type {
  Candle,
  MarketZone,
  StructureTrend,
  TimeframeAnalysis,
  Trend,
  VolumeStrength,
} from "./types";

type BinanceKlineRow = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string
];

/** Verwijder de huidige (nog niet gesloten) candle — Binance stuurt die altijd als laatste. */
export function filterClosedCandles(candles: Candle[]): Candle[] {
  const now = Date.now();
  return candles.filter((c) => c.closeTime < now);
}

export async function getCandles(
  interval: "1m" | "1h" | "4h" | "1d" | "5m" | "15m",
  limit = 500,
  symbol = "BTCUSDT"
): Promise<Candle[]> {
  const response = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Klines fout voor ${interval}: ${response.status}`);
  }

  const json = (await response.json()) as BinanceKlineRow[];

  return json.map((row) => ({
    openTime: Number(row[0]),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
    closeTime: Number(row[6]),
  }));
}

export function simpleMovingAverage(values: number[], length: number): number {
  const actual = Math.min(length, values.length);
  if (actual < 1) return values[values.length - 1] ?? 0;
  const slice = values.slice(-actual);
  return slice.reduce((acc, v) => acc + v, 0) / actual;
}

export function detectTrend(candles: Candle[]): Trend {
  const closes = candles.map((c) => c.close);
  if (closes.length < 5) return "neutral";
  const shortLen = Math.min(50, Math.floor(closes.length * 0.25));
  const longLen = Math.min(200, closes.length);
  const ma50 = simpleMovingAverage(closes, shortLen);
  const ma200 = simpleMovingAverage(closes, longLen);
  if (ma50 > ma200 * 1.005) return "bullish";
  if (ma50 < ma200 * 0.995) return "bearish";
  return "neutral";
}

export function analyzeTimeframe(
  timeframe: "1h" | "4h" | "1d",
  candles: Candle[]
): TimeframeAnalysis {
  const closes = candles.map((c) => c.close);
  if (closes.length < 5) {
    const p = closes[closes.length - 1] ?? 0;
    return { timeframe, trend: "neutral", ma50: p, ma200: p };
  }
  const shortLen = Math.min(50, Math.floor(closes.length * 0.25));
  const longLen = Math.min(200, closes.length);
  const ma50 = simpleMovingAverage(closes, shortLen);
  const ma200 = simpleMovingAverage(closes, longLen);
  return {
    timeframe,
    trend: ma50 > ma200 * 1.005 ? "bullish" : ma50 < ma200 * 0.995 ? "bearish" : "neutral",
    ma50,
    ma200,
  };
}

export function detectSupport(candles: Candle[], lookback = 50): number {
  const slice = candles.slice(-lookback);
  return Math.min(...slice.map((c) => c.low));
}

export function detectResistance(candles: Candle[], lookback = 50): number {
  const slice = candles.slice(-lookback);
  return Math.max(...slice.map((c) => c.high));
}

export function buildSupportZone(candles: Candle[], lookback = 50): MarketZone {
  const slice = candles
    .slice(-lookback)
    .map((c) => c.low)
    .sort((a, b) => a - b)
    .slice(0, 5);

  return {
    low: Math.min(...slice),
    high: Math.max(...slice),
  };
}

export function buildResistanceZone(
  candles: Candle[],
  lookback = 50
): MarketZone {
  const slice = candles
    .slice(-lookback)
    .map((c) => c.high)
    .sort((a, b) => b - a)
    .slice(0, 5);

  return {
    low: Math.min(...slice),
    high: Math.max(...slice),
  };
}

export function volumeStrength(candles: Candle[]): VolumeStrength {
  const recent = candles.slice(-10);
  const previous = candles.slice(-30, -10);

  const recentVolume = recent.reduce((sum, c) => sum + c.volume, 0);
  const previousVolume = previous.reduce((sum, c) => sum + c.volume, 0);

  return recentVolume > previousVolume ? "strong" : "weak";
}

export function calculateRsi(candles: Candle[], length = 14): number {
  const closes = candles.map((c) => c.close);

  if (closes.length < length + 1) {
    return 50; // onvoldoende data — neutrale waarde teruggeven
  }

  let gains = 0;
  let losses = 0;

  for (let i = closes.length - length; i < closes.length; i += 1) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }

  if (losses === 0) return 100;

  const rs = gains / losses;
  const rsi = 100 - 100 / (1 + rs);

  return Number(rsi.toFixed(2));
}

export function detectStructure(
  candles: Candle[],
  lookback = 30
): StructureTrend {
  const slice = candles.slice(-lookback);

  if (slice.length < 10) return "neutral";

  const mid = Math.floor(slice.length / 2);
  const first = slice.slice(0, mid);
  const second = slice.slice(mid);

  const firstHighAvg =
    first.reduce((sum, c) => sum + c.high, 0) / first.length;
  const firstLowAvg = first.reduce((sum, c) => sum + c.low, 0) / first.length;

  const secondHighAvg =
    second.reduce((sum, c) => sum + c.high, 0) / second.length;
  const secondLowAvg =
    second.reduce((sum, c) => sum + c.low, 0) / second.length;

  if (secondHighAvg > firstHighAvg && secondLowAvg > firstLowAvg) {
    return "bullish";
  }

  if (secondHighAvg < firstHighAvg && secondLowAvg < firstLowAvg) {
    return "bearish";
  }

  return "neutral";
}
