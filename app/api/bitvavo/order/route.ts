import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { bitvavRequest } from "@/lib/bitvavo";
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
  const { market, side, amountQuote } = body as {
    market?: string;
    side?: "buy" | "sell";
    amountQuote?: number;
  };

  if (!market || !side || amountQuote == null) {
    return Response.json({ error: "market, side en amountQuote zijn verplicht" }, { status: 400 });
  }
  if (side !== "buy" && side !== "sell") {
    return Response.json({ error: "side moet 'buy' of 'sell' zijn" }, { status: 400 });
  }
  if (amountQuote <= 0) {
    return Response.json({ error: "amountQuote moet positief zijn" }, { status: 400 });
  }

  const db = getDb();
  const row = db
    .prepare("SELECT bitvavo_api_key, bitvavo_api_secret FROM settings WHERE user_id = ?")
    .get(userId) as { bitvavo_api_key?: string; bitvavo_api_secret?: string } | undefined;

  const apiKey = row?.bitvavo_api_key ?? "";
  const apiSecret = row?.bitvavo_api_secret ?? "";

  if (!apiKey || !apiSecret) {
    return Response.json({ error: "Bitvavo niet gekoppeld" }, { status: 400 });
  }

  try {
    const orderBody = {
      market,
      side,
      orderType: "market",
      amountQuote: String(amountQuote),
    };

    const result = await bitvavRequest(apiKey, apiSecret, "POST", "/order", orderBody);

    if (result?.errorCode) {
      return Response.json({ error: result.error ?? "Order fout" }, { status: 400 });
    }

    return Response.json(result);
  } catch (err) {
    console.error("Bitvavo order fout:", err);
    return Response.json({ error: "Verbindingsfout" }, { status: 502 });
  }
}
