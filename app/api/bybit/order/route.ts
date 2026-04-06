import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { bybitRequest } from "@/lib/bybit";
import type { Session } from "next-auth";

function getUserId(session: Session | null): number | null {
  const id = (session?.user as { id?: string })?.id;
  return id ? parseInt(id) : null;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = getUserId(session);
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { symbol, side, qty } = body as {
    symbol?: string;  // bijv. "BTCUSDT"
    side?: "Buy" | "Sell";
    qty?: string;     // hoeveelheid — baseCoin voor Sell, quoteCoin voor Buy
  };

  if (!symbol || !side || !qty) {
    return Response.json({ error: "symbol, side en qty zijn verplicht" }, { status: 400 });
  }
  if (side !== "Buy" && side !== "Sell") {
    return Response.json({ error: "side moet 'Buy' of 'Sell' zijn" }, { status: 400 });
  }

  const db = getDb();
  const row = db
    .prepare("SELECT bybit_api_key, bybit_api_secret FROM settings WHERE user_id = ?")
    .get(userId) as { bybit_api_key?: string; bybit_api_secret?: string } | undefined;

  const apiKey = row?.bybit_api_key ?? "";
  const apiSecret = row?.bybit_api_secret ?? "";

  if (!apiKey || !apiSecret) {
    return Response.json({ error: "Bybit niet gekoppeld" }, { status: 400 });
  }

  try {
    const orderBody = {
      category: "spot",
      symbol,
      side,
      orderType: "Market",
      qty,
      // Bij Buy: qty is in quoteCoin (USDT), bij Sell: qty is in baseCoin (BTC)
      marketUnit: side === "Buy" ? "quoteCoin" : "baseCoin",
    };

    const result = await bybitRequest(apiKey, apiSecret, "POST", "/v5/order/create", undefined, orderBody);

    if (result.retCode !== 0) {
      return Response.json({ error: result.retMsg ?? "Order fout" }, { status: 400 });
    }

    return Response.json(result.result);
  } catch (err) {
    console.error("Bybit order fout:", err);
    return Response.json({ error: "Verbindingsfout" }, { status: 502 });
  }
}
