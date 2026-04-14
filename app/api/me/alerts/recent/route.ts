import { auth } from "@/auth";
import { getDb } from "@/db/db";

// Geeft alerts terug die in de laatste 5 minuten zijn getriggerd — voor Marcus polling
export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const db = getDb();
  const recent = db.prepare(
    `SELECT id, asset, condition, target_price, last_triggered_at
     FROM price_alerts
     WHERE user_id = ?
       AND last_triggered_at IS NOT NULL
       AND datetime(last_triggered_at) >= datetime('now', '-5 minutes')
     ORDER BY last_triggered_at DESC
     LIMIT 5`
  ).all(userId) as {
    id: number;
    asset: string;
    condition: "above" | "below";
    target_price: number;
    last_triggered_at: string;
  }[];

  return Response.json({ recent });
}
