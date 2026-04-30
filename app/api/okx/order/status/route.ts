import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { okxRequest } from "@/lib/okx";
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
  const ordId   = searchParams.get("ordId");
  const instId  = searchParams.get("instId");

  if (!ordId || !instId) {
    return Response.json({ error: "ordId en instId zijn verplicht" }, { status: 400 });
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
    const result = await okxRequest(apiKey, apiSecret, passphrase, "GET", "/api/v5/trade/order", {
      instId,
      ordId,
    });

    if (result.code !== "0") {
      return Response.json({ error: result.msg ?? "Status fout" }, { status: 400 });
    }

    type OkxOrder = {
      ordId?: string;
      instId?: string;
      side?: string;
      ordType?: string;
      sz?: string;
      fillSz?: string;
      fillPx?: string;
      avgPx?: string;
      state?: string;
    };

    const data = result.data as OkxOrder[] | undefined;
    const order = data?.[0];

    if (!order) {
      return Response.json({ error: "Order niet gevonden" }, { status: 404 });
    }

    return Response.json(order);
  } catch (err) {
    console.error("OKX order status fout:", err);
    return Response.json({ error: "Verbindingsfout" }, { status: 502 });
  }
}
