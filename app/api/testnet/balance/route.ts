import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { getTestnetBalance } from "@/lib/binance-testnet";
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
    .prepare("SELECT binance_testnet_key, binance_testnet_secret FROM settings WHERE user_id = ?")
    .get(userId) as { binance_testnet_key?: string; binance_testnet_secret?: string } | undefined;

  const apiKey    = row?.binance_testnet_key ?? "";
  const apiSecret = row?.binance_testnet_secret ?? "";

  if (!apiKey || !apiSecret) return Response.json({ connected: false });

  try {
    const balances = await getTestnetBalance(apiKey, apiSecret);
    return Response.json({ connected: true, balances });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fout";
    return Response.json({ connected: false, error: msg });
  }
}
