import crypto from "crypto";

export function bitvavSign(
  apiKey: string,
  apiSecret: string,
  timestamp: number,
  method: string,
  path: string,
  body = ""
) {
  const msg = timestamp + method + "/v2" + path + body;
  const sig = crypto.createHmac("sha256", apiSecret).update(msg).digest("hex");
  return {
    "Bitvavo-Access-Key": apiKey,
    "Bitvavo-Access-Timestamp": String(timestamp),
    "Bitvavo-Access-Signature": sig,
    "Bitvavo-Access-Window": "10000",
  };
}

export async function bitvavRequest(
  apiKey: string,
  apiSecret: string,
  method: string,
  path: string,
  body?: object
) {
  const ts = Date.now();
  const bodyStr = body ? JSON.stringify(body) : "";
  const headers = {
    ...bitvavSign(apiKey, apiSecret, ts, method, path, bodyStr),
    "Content-Type": "application/json",
  };
  const res = await fetch(`https://api.bitvavo.com/v2${path}`, {
    method,
    headers,
    body: bodyStr || undefined,
  });
  return res.json();
}
