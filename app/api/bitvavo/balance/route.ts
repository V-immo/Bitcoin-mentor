import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { bitvavRequest } from "@/lib/bitvavo";
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

  // Haal Bitvavo API keys op uit settings
  const row = db
    .prepare("SELECT bitvavo_api_key, bitvavo_api_secret FROM settings WHERE user_id = ?")
    .get(userId) as { bitvavo_api_key?: string; bitvavo_api_secret?: string } | undefined;

  const apiKey = row?.bitvavo_api_key ?? "";
  const apiSecret = row?.bitvavo_api_secret ?? "";

  if (!apiKey || !apiSecret) {
    return Response.json({ connected: false });
  }

  try {
    const balance = await bitvavRequest(apiKey, apiSecret, "GET", "/balance");

    if (Array.isArray(balance)) {
      return Response.json({ connected: true, balance });
    }

    // Bitvavo geeft errorCode terug bij fout
    if (balance?.errorCode) {
      return Response.json({ connected: false, error: balance.error ?? "API fout" });
    }

    return Response.json({ connected: false, error: "Onbekende API respons" });
  } catch (err) {
    console.error("Bitvavo balance fout:", err);
    return Response.json({ connected: false, error: "Verbindingsfout" }, { status: 502 });
  }
}
