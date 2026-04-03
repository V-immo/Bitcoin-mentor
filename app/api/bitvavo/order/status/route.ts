import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { bitvavRequest } from "@/lib/bitvavo";
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
  const market  = searchParams.get("market");

  if (!orderId || !market) {
    return Response.json({ error: "orderId en market zijn verplicht" }, { status: 400 });
  }

  const db = getDb();
  const row = db
    .prepare("SELECT bitvavo_api_key, bitvavo_api_secret FROM settings WHERE user_id = ?")
    .get(userId) as { bitvavo_api_key?: string; bitvavo_api_secret?: string } | undefined;

  const apiKey    = row?.bitvavo_api_key ?? "";
  const apiSecret = row?.bitvavo_api_secret ?? "";

  if (!apiKey || !apiSecret) {
    return Response.json({ error: "Bitvavo niet gekoppeld" }, { status: 400 });
  }

  try {
    const result = await bitvavRequest(
      apiKey, apiSecret,
      "GET", `/order?orderId=${orderId}&market=${encodeURIComponent(market)}`
    );

    if (result?.errorCode) {
      return Response.json({ error: result.error ?? "Order niet gevonden" }, { status: 400 });
    }

    return Response.json(result);
  } catch (err) {
    console.error("Bitvavo order status fout:", err);
    return Response.json({ error: "Verbindingsfout" }, { status: 502 });
  }
}
