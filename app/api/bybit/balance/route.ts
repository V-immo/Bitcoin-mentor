import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { bybitRequest } from "@/lib/bybit";
import type { Session } from "next-auth";

function getUserId(session: Session | null): number | null {
  const id = (session?.user as { id?: string })?.id;
  return id ? parseInt(id) : null;
}

export async function GET() {
  const session = await auth();
  const userId = getUserId(session);
  if (!userId) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const db = getDb();
  const row = db
    .prepare("SELECT bybit_api_key, bybit_api_secret FROM settings WHERE user_id = ?")
    .get(userId) as { bybit_api_key?: string; bybit_api_secret?: string } | undefined;

  const apiKey = row?.bybit_api_key ?? "";
  const apiSecret = row?.bybit_api_secret ?? "";

  if (!apiKey || !apiSecret) {
    return Response.json({ connected: false });
  }

  try {
    const data = await bybitRequest(apiKey, apiSecret, "GET", "/v5/account/wallet-balance", {
      accountType: "UNIFIED",
    });

    if (data.retCode !== 0) {
      return Response.json({ connected: false, error: data.retMsg ?? "API fout" });
    }

    // Haal coins op uit UNIFIED account
    const coins = (data.result as { list?: { coin?: { coin: string; availableToWithdraw: string; walletBalance: string }[] }[] })
      ?.list?.[0]?.coin ?? [];

    const balance = coins
      .filter(c => parseFloat(c.walletBalance) > 0.000001)
      .map(c => ({ symbol: c.coin, available: c.availableToWithdraw, walletBalance: c.walletBalance }));

    return Response.json({ connected: true, balance });
  } catch (err) {
    console.error("Bybit balance fout:", err);
    return Response.json({ connected: false, error: "Verbindingsfout" }, { status: 502 });
  }
}
