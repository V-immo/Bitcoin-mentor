import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { mexcGetBalance } from "@/lib/mexc";
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
    .prepare("SELECT mexc_api_key, mexc_api_secret FROM settings WHERE user_id = ?")
    .get(userId) as { mexc_api_key?: string; mexc_api_secret?: string } | undefined;

  const apiKey    = row?.mexc_api_key    ?? "";
  const apiSecret = row?.mexc_api_secret ?? "";

  if (!apiKey || !apiSecret) {
    return Response.json({ connected: false });
  }

  try {
    const balance = await mexcGetBalance(apiKey, apiSecret);
    return Response.json({ connected: true, balance });
  } catch (err) {
    console.error("MEXC balance fout:", err);
    return Response.json({ connected: false, error: "Verbindingsfout" }, { status: 502 });
  }
}
