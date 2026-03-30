import crypto from "crypto";

const BASE_URL = "https://testnet.binance.vision";

function sign(secret: string, queryString: string): string {
  return crypto.createHmac("sha256", secret).update(queryString).digest("hex");
}

export async function testnetRequest(
  apiKey: string,
  apiSecret: string,
  method: "GET" | "POST" | "DELETE",
  path: string,
  params: Record<string, string | number> = {}
) {
  const timestamp = Date.now();
  const allParams = { ...params, timestamp };
  const queryString = Object.entries(allParams)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  const signature = sign(apiSecret, queryString);
  const fullQuery = `${queryString}&signature=${signature}`;

  const url = method === "GET" || method === "DELETE"
    ? `${BASE_URL}${path}?${fullQuery}`
    : `${BASE_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      "X-MBX-APIKEY": apiKey,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" ? fullQuery : undefined,
  });

  return res.json();
}

export async function getTestnetBalance(apiKey: string, apiSecret: string) {
  const data = await testnetRequest(apiKey, apiSecret, "GET", "/api/v3/account");
  if (data.code) throw new Error(data.msg ?? "Testnet API fout");
  const balances: { asset: string; free: string; locked: string }[] = data.balances ?? [];
  return balances.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
}

export async function placeTestnetOrder(
  apiKey: string,
  apiSecret: string,
  symbol: string,
  side: "BUY" | "SELL",
  quoteQty?: number,  // voor BUY: USDT bedrag
  qty?: number        // voor SELL: coin hoeveelheid
) {
  const params: Record<string, string | number> = {
    symbol,
    side,
    type: "MARKET",
  };

  if (side === "BUY" && quoteQty) {
    params.quoteOrderQty = quoteQty.toFixed(2);
  } else if (side === "SELL" && qty) {
    params.quantity = qty.toFixed(8);
  } else {
    throw new Error("quoteQty (BUY) of qty (SELL) vereist");
  }

  const data = await testnetRequest(apiKey, apiSecret, "POST", "/api/v3/order", params);
  if (data.code) throw new Error(data.msg ?? "Order mislukt");
  return data;
}
