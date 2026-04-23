import crypto from "crypto";

const BASE = "https://api.binance.com";

function sign(secret: string, params: string): string {
  return crypto.createHmac("sha256", secret).update(params).digest("hex");
}

function toQueryString(obj: Record<string, string | number>): string {
  return Object.entries(obj).map(([k, v]) => `${k}=${v}`).join("&");
}

export async function binanceRequest(
  apiKey: string,
  apiSecret: string,
  method: "GET" | "POST" | "DELETE",
  path: string,
  params: Record<string, string | number> = {}
) {
  const timestamp = Date.now();
  const allParams = { ...params, timestamp };
  const qs = toQueryString(allParams);
  const signature = sign(apiSecret, qs);
  const fullQs = `${qs}&signature=${signature}`;

  const url = method === "GET" || method === "DELETE"
    ? `${BASE}${path}?${fullQs}`
    : `${BASE}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      "X-MBX-APIKEY": apiKey,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" ? fullQs : undefined,
  });

  return res.json();
}

// Publieke prijs opvragen (geen auth nodig)
export async function binanceGetPrice(symbol: string): Promise<number> {
  // Binance gebruikt USDT pairs: BTC → BTCUSDT
  const pair = symbol.includes("USDT") || symbol.includes("BTC") && symbol.length > 3
    ? symbol
    : `${symbol}USDT`;
  const res = await fetch(`${BASE}/api/v3/ticker/price?symbol=${pair}`);
  const data = await res.json() as { price?: string };
  return parseFloat(data.price ?? "0");
}

// Publieke candles opvragen (geen auth nodig)
export async function binanceGetCandles(symbol: string, interval: string, limit: number): Promise<number[]> {
  const pair = symbol.includes("USDT") ? symbol : `${symbol}USDT`;
  // Vertaal Bitvavo-interval naar Binance-interval
  const intervalMap: Record<string, string> = {
    "1m": "1m", "5m": "5m", "15m": "15m",
    "1h": "1h", "4h": "4h", "1d": "1d", "1W": "1w",
  };
  const binanceInterval = intervalMap[interval] ?? interval;
  const res = await fetch(
    `${BASE}/api/v3/klines?symbol=${pair}&interval=${binanceInterval}&limit=${limit}`
  );
  const candles = await res.json() as [number, string, string, string, string][];
  if (!Array.isArray(candles)) return [];
  // Binance geeft oudste eerst — closes zijn index 4
  return candles.map(c => parseFloat(c[4]));
}

// Market order plaatsen
export async function binancePlaceOrder(
  apiKey: string,
  apiSecret: string,
  symbol: string,
  side: "BUY" | "SELL",
  quoteOrderQty: number // bedrag in USDT
): Promise<{ orderId?: number; error?: string }> {
  const pair = symbol.includes("USDT") ? symbol : `${symbol}USDT`;
  const result = await binanceRequest(apiKey, apiSecret, "POST", "/api/v3/order", {
    symbol: pair,
    side,
    type: "MARKET",
    quoteOrderQty: quoteOrderQty.toString(),
  }) as { orderId?: number; msg?: string };

  if (result.msg) return { error: result.msg };
  return { orderId: result.orderId };
}
