import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";

// GET — lijst van eigen alerts
export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const db = getDb();
  const alerts = db.prepare(
    "SELECT id, asset, condition, target_price, email, active, created_at, last_triggered_at FROM price_alerts WHERE user_id = ? ORDER BY created_at DESC"
  ).all(userId);

  return Response.json({ alerts });
}

// POST — nieuwe alert aanmaken
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const body = await request.json().catch(() => null);
  if (!body?.asset || !body?.condition || !body?.targetPrice || !body?.email) {
    return Response.json({ error: "asset, condition, targetPrice en email zijn verplicht" }, { status: 400 });
  }
  if (!["above", "below"].includes(body.condition)) {
    return Response.json({ error: "condition moet 'above' of 'below' zijn" }, { status: 400 });
  }
  if (typeof body.targetPrice !== "number" || body.targetPrice <= 0) {
    return Response.json({ error: "targetPrice moet een positief getal zijn" }, { status: 400 });
  }

  // Max 10 alerts per gebruiker
  const db = getDb();
  const count = (db.prepare("SELECT COUNT(*) as c FROM price_alerts WHERE user_id = ? AND active = 1").get(userId) as { c: number }).c;
  if (count >= 10) {
    return Response.json({ error: "Maximum 10 actieve alerts toegestaan" }, { status: 400 });
  }

  const result = db.prepare(
    "INSERT INTO price_alerts (user_id, asset, condition, target_price, email) VALUES (?, ?, ?, ?, ?)"
  ).run(userId, body.asset, body.condition, body.targetPrice, body.email);

  return Response.json({ ok: true, id: result.lastInsertRowid });
}

// DELETE — alert verwijderen
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  const userId = parseInt((session.user as { id?: string }).id ?? "0");

  const { id } = await request.json().catch(() => ({}));
  if (!id) return Response.json({ error: "id verplicht" }, { status: 400 });

  const db = getDb();
  db.prepare("DELETE FROM price_alerts WHERE id = ? AND user_id = ?").run(id, userId);

  return Response.json({ ok: true });
}
