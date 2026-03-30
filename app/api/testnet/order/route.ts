import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { placeTestnetOrder } from "@/lib/binance-testnet";
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
  const { symbol, side, quoteQty, qty } = body as {
    symbol?: string;
    side?: "BUY" | "SELL";
    quoteQty?: number;
    qty?: number;
  };

  if (!symbol || !side) {
    return Response.json({ error: "symbol en side zijn verplicht" }, { status: 400 });
  }

  const db = getDb();
  const row = db
    .prepare("SELECT binance_testnet_key, binance_testnet_secret FROM settings WHERE user_id = ?")
    .get(userId) as { binance_testnet_key?: string; binance_testnet_secret?: string } | undefined;

  const apiKey    = row?.binance_testnet_key ?? "";
  const apiSecret = row?.binance_testnet_secret ?? "";

  if (!apiKey || !apiSecret) {
    return Response.json({ error: "Binance Testnet niet gekoppeld" }, { status: 400 });
  }

  try {
    const result = await placeTestnetOrder(apiKey, apiSecret, symbol, side, quoteQty, qty);
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Order mislukt";
    return Response.json({ error: msg }, { status: 400 });
  }
}
