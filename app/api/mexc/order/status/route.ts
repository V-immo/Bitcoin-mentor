import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { mexcRequest } from "@/lib/mexc";
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
    .prepare("SELECT mexc_api_key, mexc_api_secret FROM settings WHERE user_id = ?")
    .get(userId) as { mexc_api_key?: string; mexc_api_secret?: string } | undefined;

  const apiKey    = row?.mexc_api_key    ?? "";
  const apiSecret = row?.mexc_api_secret ?? "";

  if (!apiKey || !apiSecret) {
    return Response.json({ error: "MEXC niet gekoppeld" }, { status: 400 });
  }

  try {
    const result = await mexcRequest(apiKey, apiSecret, "GET", "/api/v3/order", {
      symbol,
      orderId,
    }) as {
      orderId?: string;
      symbol?: string;
      side?: string;
      type?: string;
      origQty?: string;
      executedQty?: string;
      cummulativeQuoteQty?: string;
      price?: string;
      status?: string;
      code?: number;
      msg?: string;
    };

    if (result.code && result.code !== 0) {
      return Response.json({ error: result.msg ?? "Status fout" }, { status: 400 });
    }

    return Response.json(result);
  } catch (err) {
    console.error("MEXC order status fout:", err);
    return Response.json({ error: "Verbindingsfout" }, { status: 502 });
  }
}
