import crypto from "crypto";

const BASE_URL = "https://api.bybit.com";
const RECV_WINDOW = "5000";

function bybitSign(
  apiKey: string,
  apiSecret: string,
  timestamp: string,
  payload: string // queryString (GET) or body (POST)
) {
  const msg = timestamp + apiKey + RECV_WINDOW + payload;
  const sig = crypto.createHmac("sha256", apiSecret).update(msg).digest("hex");
  return {
    "X-BAPI-API-KEY": apiKey,
    "X-BAPI-TIMESTAMP": timestamp,
    "X-BAPI-SIGN": sig,
    "X-BAPI-RECV-WINDOW": RECV_WINDOW,
  };
}

export async function bybitRequest(
  apiKey: string,
  apiSecret: string,
  method: "GET" | "POST",
  path: string,
  params?: Record<string, string>,
  body?: object
) {
  const timestamp = Date.now().toString();

  let url = `${BASE_URL}${path}`;
  let payload = "";

  if (method === "GET" && params) {
    const qs = new URLSearchParams(params).toString();
    payload = qs;
    url = `${url}?${qs}`;
  }

  if (method === "POST" && body) {
    payload = JSON.stringify(body);
  }

  const headers: Record<string, string> = {
    ...bybitSign(apiKey, apiSecret, timestamp, payload),
    "Content-Type": "application/json",
  };

  const res = await fetch(url, {
    method,
    headers,
    body: method === "POST" ? payload : undefined,
  });

  return res.json() as Promise<{ retCode: number; retMsg: string; result: unknown }>;
}

// Spot marktorder plaatsen op Bybit
export async function bybitPlaceOrder(
  apiKey: string,
  apiSecret: string,
  symbol: string,
  side: "Buy" | "Sell",
  quoteQty: number // USDT bedrag
): Promise<{ orderId?: string; error?: string }> {
  const pair = symbol.includes("USDT") ? symbol : `${symbol}USDT`;
  const result = await bybitRequest(apiKey, apiSecret, "POST", "/v5/order/create", undefined, {
    category: "spot",
    symbol: pair,
    side,
    orderType: "Market",
    quoteQty: quoteQty.toString(),
  }) as { retCode: number; retMsg: string; result: { orderId?: string } };

  if (result.retCode !== 0) return { error: result.retMsg };
  return { orderId: result.result?.orderId };
}

// Spot prijs ophalen via Bybit (publiek)
export async function bybitGetPrice(symbol: string): Promise<number> {
  const pair = symbol.includes("USDT") ? symbol : `${symbol}USDT`;
  const res = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${pair}`);
  const data = await res.json() as { result?: { list?: { lastPrice: string }[] } };
  return parseFloat(data.result?.list?.[0]?.lastPrice ?? "0");
}

// Spot candles ophalen via Bybit (publiek)
export async function bybitGetCandles(symbol: string, interval: string, limit: number): Promise<number[]> {
  const pair = symbol.includes("USDT") ? symbol : `${symbol}USDT`;
  const intervalMap: Record<string, string> = {
    "1m": "1", "5m": "5", "15m": "15", "1h": "60", "4h": "240", "1d": "D", "1W": "W",
  };
  const bybitInterval = intervalMap[interval] ?? "60";
  const res = await fetch(
    `https://api.bybit.com/v5/market/kline?category=spot&symbol=${pair}&interval=${bybitInterval}&limit=${limit}`
  );
  const data = await res.json() as { result?: { list?: string[][] } };
  const candles = data.result?.list ?? [];
  // Bybit geeft nieuwste eerst — omdraaien, close staat op index 4
  return candles.map(c => parseFloat(c[4])).reverse();
}
