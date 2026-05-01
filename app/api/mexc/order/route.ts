import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { mexcRequest } from "@/lib/mexc";
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
    symbol?: string;   // bijv. "BTCUSDT"
    side?: "BUY" | "SELL";
    qty?: string;      // USDT bedrag bij BUY, coin hoeveelheid bij SELL
  };

  if (!symbol || !side || !qty) {
    return Response.json({ error: "symbol, side en qty zijn verplicht" }, { status: 400 });
  }
  if (side !== "BUY" && side !== "SELL") {
    return Response.json({ error: "side moet 'BUY' of 'SELL' zijn" }, { status: 400 });
  }

  const db = getDb();
  const row = db
    .prepare("SELECT mexc_api_key, mexc_api_secret FROM settings WHERE user_id = ?")
    .get(userId) as { mexc_api_key?: string; mexc_api_secret?: string } | undefined;

  const apiKey    = row?.mexc_api_key    ?? "";
  const apiSecret = row?.mexc_api_secret ?? "";

  if (!apiKey || !apiSecret) {
    return Response.json({ error: "MEXC niet gekoppeld" }, { status: 400 });
  }

  try {
    // BUY: quoteOrderQty (USDT bedrag) | SELL: quantity (coin hoeveelheid)
    const orderParams: Record<string, string> = {
      symbol,
      side,
      type: "MARKET",
    };

    if (side === "BUY") {
      orderParams.quoteOrderQty = qty;
    } else {
      orderParams.quantity = qty;
    }

    const result = await mexcRequest(apiKey, apiSecret, "POST", "/api/v3/order", orderParams) as {
      orderId?: string;
      symbol?: string;
      side?: string;
      type?: string;
      origQty?: string;
      executedQty?: string;
      cummulativeQuoteQty?: string;
      status?: string;
      code?: number;
      msg?: string;
    };

    if (result.code && result.code !== 0) {
      return Response.json({ error: result.msg ?? "Order fout" }, { status: 400 });
    }

    return Response.json(result);
  } catch (err) {
    console.error("MEXC order fout:", err);
    return Response.json({ error: "Verbindingsfout" }, { status: 502 });
  }
}
