import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { bybitRequest } from "@/lib/bybit";
import type { Session } from "next-auth";

function getUserId(session: Session | null): number | null {
  const id = (session?.user as { id?: string })?.id;
  return id ? parseInt(id) : null;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = getUserId(session);
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  const symbol  = searchParams.get("symbol");

  if (!orderId || !symbol) {
    return Response.json({ error: "orderId en symbol zijn verplicht" }, { status: 400 });
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
    // Eerst open orders checken
    const realtime = await bybitRequest(apiKey, apiSecret, "GET", "/v5/order/realtime", {
      category: "spot",
      orderId,
      symbol,
    });

    if (realtime.retCode === 0) {
      const list = (realtime.result as { list?: unknown[] })?.list ?? [];
      if (list.length > 0) {
        return Response.json(list[0]);
      }
    }

    // Niet in open orders — zoek in history (marktorders zijn direct gevuld)
    const history = await bybitRequest(apiKey, apiSecret, "GET", "/v5/order/history", {
      category: "spot",
      orderId,
      symbol,
      limit: "1",
    });

    if (history.retCode === 0) {
      const list = (history.result as { list?: unknown[] })?.list ?? [];
      if (list.length > 0) {
        return Response.json(list[0]);
      }
    }

    return Response.json({ error: "Order niet gevonden" }, { status: 404 });
  } catch (err) {
    console.error("Bybit order status fout:", err);
    return Response.json({ error: "Verbindingsfout" }, { status: 502 });
  }
}
