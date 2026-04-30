import crypto from "crypto";

const BASE_URL = "https://www.okx.com";

function okxSign(
  apiSecret: string,
  timestamp: string,
  method: string,
  requestPath: string,
  body: string
) {
  const preHash = timestamp + method.toUpperCase() + requestPath + body;
  return crypto.createHmac("sha256", apiSecret).update(preHash).digest("base64");
}

export async function okxRequest(
  apiKey: string,
  apiSecret: string,
  passphrase: string,
  method: "GET" | "POST",
  path: string,
  params?: Record<string, string>,
  body?: object
) {
  const timestamp = new Date().toISOString();

  let requestPath = path;
  let bodyStr = "";

  if (method === "GET" && params && Object.keys(params).length > 0) {
    const qs = new URLSearchParams(params).toString();
    requestPath = `${path}?${qs}`;
  }

  if (method === "POST" && body) {
    bodyStr = JSON.stringify(body);
  }

  const sign = okxSign(apiSecret, timestamp, method, requestPath, bodyStr);

  const headers: Record<string, string> = {
    "OK-ACCESS-KEY": apiKey,
    "OK-ACCESS-SIGN": sign,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": passphrase,
    "Content-Type": "application/json",
  };

  const res = await fetch(`${BASE_URL}${requestPath}`, {
    method,
    headers,
    body: method === "POST" ? bodyStr : undefined,
  });

  return res.json() as Promise<{ code: string; msg: string; data: unknown }>;
}

// Spot marktorder plaatsen op OKX
export async function okxPlaceOrder(
  apiKey: string,
  apiSecret: string,
  passphrase: string,
  instId: string,   // bijv. "BTC-USDT"
  side: "buy" | "sell",
  sz: string        // bedrag — quote (USDT) bij buy, base bij sell
): Promise<{ ordId?: string; error?: string }> {
  const orderBody = {
    instId,
    tdMode: "cash",
    side,
    ordType: "market",
    sz,
    tgtCcy: side === "buy" ? "quote_ccy" : "base_ccy",
  };

  const result = await okxRequest(apiKey, apiSecret, passphrase, "POST", "/api/v5/trade/order", undefined, orderBody);

  if (result.code !== "0") return { error: result.msg ?? "OKX order fout" };
  const data = result.data as { ordId?: string }[] | undefined;
  return { ordId: data?.[0]?.ordId };
}

// Spot prijs ophalen via OKX (publiek)
export async function okxGetPrice(instId: string): Promise<number> {
  const res = await fetch(`https://www.okx.com/api/v5/market/ticker?instId=${instId}`);
  const data = await res.json() as { data?: { last: string }[] };
  return parseFloat(data.data?.[0]?.last ?? "0");
}
