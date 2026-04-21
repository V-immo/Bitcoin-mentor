/**
 * GET /api/cron/comeback
 * Stuur een come-back push naar gebruikers die 3+ dagen inactief zijn.
 * Bedoeld om elke ochtend door een server-side cronjob aan te roepen.
 *
 * Beveiliging: CRON_SECRET header vereist (zet in .env als CRON_SECRET=...)
 */

import { NextRequest } from "next/server";
import { getDb } from "@/db/db";
import { sendPushToUser } from "@/lib/push";
import Anthropic from "@anthropic-ai/sdk";

const COMEBACK_MESSAGES = [
  "De markt beweegt — jij ook? Even inchecken kan genoeg zijn.",
  "Je streak wacht op je. Kom terug en noteer één ding.",
  "Marcus mist je. 5 minuten is genoeg voor een goed begin.",
  "Even kijken hoe Bitcoin staat? Je bent al een paar dagen weg.",
  "Trading is een gewoonte. Kom terug en houd hem levend.",
];

async function generateComebackMessage(username: string, days: number): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return COMEBACK_MESSAGES[Math.floor(Math.random() * COMEBACK_MESSAGES.length)];
  }
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 80,
      system: `Je bent Marcus, een directe maar warme tradingcoach. Schrijf een HEEL KORTE push-notificatietekst (max 1 zin, max 100 tekens) voor ${username} die ${days} dagen niet meer ingelogd is. Geen aanhef. Direct de boodschap. Prikkelend maar niet veroordelend.`,
      messages: [{ role: "user", content: "Schrijf de notificatie." }],
    });
    return (msg.content[0] as { text: string }).text.trim().slice(0, 120);
  } catch {
    return COMEBACK_MESSAGES[Math.floor(Math.random() * COMEBACK_MESSAGES.length)];
  }
}

export async function GET(req: NextRequest) {
  // Beveilig de route met een secret header
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Haal gebruikers op die 3-14 dagen inactief zijn EN een push subscription hebben
  const inactiveUsers = db.prepare(`
    SELECT u.id, u.username, u.last_login_at
    FROM users u
    INNER JOIN push_subscriptions ps ON ps.user_id = u.id
    WHERE u.last_login_at IS NOT NULL
      AND u.last_login_at < datetime('now', '-3 days')
      AND u.last_login_at > datetime('now', '-14 days')
    GROUP BY u.id
  `).all() as { id: number; username: string; last_login_at: string }[];

  let sent = 0;
  const results: { userId: number; username: string; days: number; pushed: number }[] = [];

  for (const user of inactiveUsers) {
    const days = Math.floor(
      (Date.now() - new Date(user.last_login_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    const body = await generateComebackMessage(user.username, days);

    const pushed = await sendPushToUser(user.id, {
      title: "Marcus roept je terug",
      body,
      icon: "/icon-192.png",
      url: "/dashboard",
    });

    sent += pushed;
    results.push({ userId: user.id, username: user.username, days, pushed });
  }

  return Response.json({
    ok: true,
    usersTargeted: inactiveUsers.length,
    notificationsSent: sent,
    results,
  });
}
