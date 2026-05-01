import crypto from "crypto";

const BASE_URL = "https://api.mexc.com";

function mexcSign(apiSecret: string, queryString: string): string {
  return crypto.createHmac("sha256", apiSecret).update(queryString).digest("hex");
}

export async function mexcRequest(
  apiKey: string,
  apiSecret: string,
  method: "GET" | "POST",
  path: string,
  params?: Record<string, string>,
  body?: Record<string, string>
) {
  const timestamp = Date.now().toString();

  // Bouw params op (altijd timestamp meesturen)
  const allParams: Record<string, string> = { ...(params ?? {}), timestamp };
  const queryString = new URLSearchParams(allParams).toString();
  const signature = mexcSign(apiSecret, queryString);

  const headers: Record<string, string> = {
    "X-MEXC-APIKEY": apiKey,
    "Content-Type": "application/json",
  };

  let url = `${BASE_URL}${path}`;
  let fetchBody: string | undefined;

  if (method === "GET") {
    url = `${url}?${queryString}&signature=${signature}`;
  } else {
    // POST: params in URL, body als form-encoded
    url = `${url}?${queryString}&signature=${signature}`;
    if (body) {
      fetchBody = new URLSearchParams(body).toString();
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }
  }

  const res = await fetch(url, { method, headers, body: fetchBody });
  return res.json() as Promise<unknown>;
}

// Spot saldo ophalen
export async function mexcGetBalance(
  apiKey: string,
  apiSecret: string
): Promise<{ symbol: string; available: string; locked: string }[]> {
  const data = await mexcRequest(apiKey, apiSecret, "GET", "/api/v3/account") as {
    balances?: { asset: string; free: string; locked: string }[];
  };
  return (data.balances ?? [])
    .filter(b => parseFloat(b.free) > 0.000001 || parseFloat(b.locked) > 0.000001)
    .map(b => ({ symbol: b.asset, available: b.free, locked: b.locked }));
}

// Spot marktorder plaatsen
export async function mexcPlaceOrder(
  apiKey: string,
  apiSecret: string,
  symbol: string,  // bijv. "BTCUSDT"
  side: "BUY" | "SELL",
  quantity: string,
  quoteOrderQty?: string  // USDT bedrag bij BUY (MEXC gebruikt quoteOrderQty)
): Promise<{ orderId?: string; error?: string }> {
  const params: Record<string, string> = {
    symbol,
    side,
    type: "MARKET",
  };

  if (side === "BUY" && quoteOrderQty) {
    params.quoteOrderQty = quoteOrderQty;
  } else {
    params.quantity = quantity;
  }

  const data = await mexcRequest(apiKey, apiSecret, "POST", "/api/v3/order", params) as {
    orderId?: string;
    code?: number;
    msg?: string;
  };

  if (data.code && data.code !== 0) return { error: data.msg ?? "MEXC order fout" };
  return { orderId: data.orderId };
}

// Spot prijs ophalen via MEXC (publiek)
export async function mexcGetPrice(symbol: string): Promise<number> {
  const pair = symbol.includes("USDT") ? symbol : `${symbol}USDT`;
  const res = await fetch(`https://api.mexc.com/api/v3/ticker/price?symbol=${pair}`);
  const data = await res.json() as { price?: string };
  return parseFloat(data.price ?? "0");
}
