import webpush from "web-push";
import { getDb } from "@/db/db";

export type PushPayload = {
  title: string;
  body: string;
  icon?: string;
  url?: string;
};

/**
 * Stuur een push notificatie naar één gebruiker of alle gebruikers.
 * Verwijdert automatisch verlopen subscriptions.
 */
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<number> {
  const vapidEmail   = process.env.VAPID_EMAIL;
  const vapidPublic  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidEmail || !vapidPublic || !vapidPrivate) return 0;

  webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);

  const db = getDb();
  const subs = db
    .prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?")
    .all(userId) as { id: number; endpoint: string; p256dh: string; auth: string }[];

  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? "/icon-192.png",
    badge: "/icon-192.png",
    url: payload.url ?? "/",
  });

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        data,
      );
      sent++;
    } catch {
      db.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(sub.id);
    }
  }
  return sent;
}

export async function sendPushToAll(payload: PushPayload): Promise<{ sent: number; failed: number }> {
  const vapidEmail   = process.env.VAPID_EMAIL;
  const vapidPublic  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidEmail || !vapidPublic || !vapidPrivate) return { sent: 0, failed: 0 };

  webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);

  const db = getDb();
  const subs = db
    .prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions")
    .all() as { id: number; endpoint: string; p256dh: string; auth: string }[];

  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? "/icon-192.png",
    badge: "/icon-192.png",
    url: payload.url ?? "/",
  });

  let sent = 0;
  let failed = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        data,
      );
      sent++;
    } catch {
      db.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(sub.id);
      failed++;
    }
  }
  return { sent, failed };
}
