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
