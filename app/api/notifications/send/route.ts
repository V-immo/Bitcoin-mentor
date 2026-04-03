import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { sendPushToUser, sendPushToAll } from "@/lib/push";

export async function POST(request: NextRequest) {
  if (!process.env.VAPID_EMAIL || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return Response.json({ error: "Push notificaties niet geconfigureerd" }, { status: 503 });
  }

  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin") {
    return Response.json({ error: "Geen toegang" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { title = "Bitcoin Mentor", message, userId, url = "/" } = body;

  if (!message) return Response.json({ error: "message verplicht" }, { status: 400 });

  const payload = { title, body: message, url };

  if (userId) {
    const sent = await sendPushToUser(parseInt(userId), payload);
    return Response.json({ ok: true, sent });
  }

  const result = await sendPushToAll(payload);
  return Response.json({ ok: true, ...result });
}
