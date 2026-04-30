import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { okxRequest } from "@/lib/okx";
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
    .prepare("SELECT okx_api_key, okx_api_secret, okx_passphrase FROM settings WHERE user_id = ?")
    .get(userId) as { okx_api_key?: string; okx_api_secret?: string; okx_passphrase?: string } | undefined;

  const apiKey    = row?.okx_api_key    ?? "";
  const apiSecret = row?.okx_api_secret ?? "";
  const passphrase = row?.okx_passphrase ?? "";

  if (!apiKey || !apiSecret || !passphrase) {
    return Response.json({ connected: false });
  }

  try {
    const data = await okxRequest(apiKey, apiSecret, passphrase, "GET", "/api/v5/account/balance");

    if (data.code !== "0") {
      return Response.json({ connected: false, error: data.msg ?? "API fout" });
    }

    type OkxDetail = { ccy: string; availBal: string; bal: string };
    type OkxData = { details?: OkxDetail[] };
    const details = (data.data as OkxData[] | undefined)?.[0]?.details ?? [];

    const balance = details
      .filter(d => parseFloat(d.bal) > 0.000001)
      .map(d => ({ symbol: d.ccy, available: d.availBal, walletBalance: d.bal }));

    return Response.json({ connected: true, balance });
  } catch (err) {
    console.error("OKX balance fout:", err);
    return Response.json({ connected: false, error: "Verbindingsfout" }, { status: 502 });
  }
}
