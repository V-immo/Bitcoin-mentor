import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const userId = parseInt((session.user as { id?: string }).id ?? "0");
  const body = await request.json().catch(() => null);

  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return Response.json({ error: "Ongeldige subscription" }, { status: 400 });
  }

  const db = getDb();
  db.prepare(`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id
  `).run(userId, body.endpoint, body.keys.p256dh, body.keys.auth);

  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const userId = parseInt((session.user as { id?: string }).id ?? "0");
  const body = await request.json().catch(() => ({}));

  const db = getDb();
  if (body?.endpoint) {
    db.prepare("DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?").run(userId, body.endpoint);
  } else {
    db.prepare("DELETE FROM push_subscriptions WHERE user_id = ?").run(userId);
  }

  return Response.json({ ok: true });
}
