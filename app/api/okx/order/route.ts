import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { okxRequest } from "@/lib/okx";
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
  const { instId, side, sz } = body as {
    instId?: string;  // bijv. "BTC-USDT"
    side?: "buy" | "sell";
    sz?: string;      // USDT bedrag bij buy, coin hoeveelheid bij sell
  };

  if (!instId || !side || !sz) {
    return Response.json({ error: "instId, side en sz zijn verplicht" }, { status: 400 });
  }
  if (side !== "buy" && side !== "sell") {
    return Response.json({ error: "side moet 'buy' of 'sell' zijn" }, { status: 400 });
  }

  const db = getDb();
  const row = db
    .prepare("SELECT okx_api_key, okx_api_secret, okx_passphrase FROM settings WHERE user_id = ?")
    .get(userId) as { okx_api_key?: string; okx_api_secret?: string; okx_passphrase?: string } | undefined;

  const apiKey     = row?.okx_api_key    ?? "";
  const apiSecret  = row?.okx_api_secret ?? "";
  const passphrase = row?.okx_passphrase ?? "";

  if (!apiKey || !apiSecret || !passphrase) {
    return Response.json({ error: "OKX niet gekoppeld" }, { status: 400 });
  }

  try {
    const orderBody = {
      instId,
      tdMode: "cash",
      side,
      ordType: "market",
      sz,
      tgtCcy: side === "buy" ? "quote_ccy" : "base_ccy",
    };

    const result = await okxRequest(apiKey, apiSecret, passphrase, "POST", "/api/v5/trade/order", undefined, orderBody);

    if (result.code !== "0") {
      return Response.json({ error: result.msg ?? "Order fout" }, { status: 400 });
    }

    const data = result.data as { ordId?: string; sCode?: string; sMsg?: string }[] | undefined;
    const orderData = data?.[0];

    if (orderData?.sCode && orderData.sCode !== "0") {
      return Response.json({ error: orderData.sMsg ?? "Order fout" }, { status: 400 });
    }

    return Response.json({ ordId: orderData?.ordId, instId, side, sz });
  } catch (err) {
    console.error("OKX order fout:", err);
    return Response.json({ error: "Verbindingsfout" }, { status: 502 });
  }
}
