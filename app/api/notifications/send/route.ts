import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import webpush from "web-push";

export async function POST(request: NextRequest) {
  const vapidEmail = process.env.VAPID_EMAIL;
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidEmail || !vapidPublic || !vapidPrivate) {
    return Response.json({ error: "Push notificaties niet geconfigureerd" }, { status: 503 });
  }
  webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);

  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin") {
    return Response.json({ error: "Geen toegang" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { title = "Bitcoin Mentor", message, userId } = body;

  if (!message) return Response.json({ error: "message verplicht" }, { status: 400 });

  const db = getDb();
  const subs = userId
    ? db.prepare("SELECT * FROM push_subscriptions WHERE user_id = ?").all(userId)
    : db.prepare("SELECT * FROM push_subscriptions").all();

  const payload = JSON.stringify({ title, body: message, icon: "/icon-192.png", badge: "/icon-192.png" });

  let sent = 0;
  let failed = 0;

  for (const sub of subs as { endpoint: string; p256dh: string; auth: string; id: number }[]) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      sent++;
    } catch {
      // Verouderde subscription verwijderen
      db.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(sub.id);
      failed++;
    }
  }

  return Response.json({ ok: true, sent, failed });
}
