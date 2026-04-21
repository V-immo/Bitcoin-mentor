/**
 * GET /api/cron/daily-reminder
 * Stuur een e-mailherinnering naar gebruikers die vandaag hun quiz nog niet gedaan hebben
 * en een streak van ≥ 2 dagen hebben. Bedoeld om elke dag om 19:00 te draaien.
 *
 * Beveiliging: CRON_SECRET header of query param vereist.
 * Server cron: 0 19 * * * curl -s "https://bitcoinmentor.be/api/cron/daily-reminder?secret=$CRON_SECRET"
 */

import { NextRequest } from "next/server";
import { getDb } from "@/db/db";
import { sendReminderEmail } from "@/lib/mailer";
import { createHmac } from "crypto";

function reminderToken(userId: number): string {
  const secret = process.env.CRON_SECRET ?? "bitcoin-mentor-reminder";
  return createHmac("sha256", secret).update(String(userId)).digest("hex").slice(0, 32);
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  // Gebruikers die:
  // 1. Een e-mailadres hebben
  // 2. Niet opt-out hebben
  // 3. Een login streak van ≥ 2 hebben
  // 4. Vandaag nog niet ingelogd/quiz gedaan hebben (last_streak_date != today)
  const candidates = db.prepare(`
    SELECT u.id, u.email, u.username, u.login_streak
    FROM users u
    WHERE u.email != ''
      AND (u.reminder_opt_out IS NULL OR u.reminder_opt_out = 0)
      AND u.login_streak >= 2
      AND (u.last_streak_date IS NULL OR u.last_streak_date != ?)
  `).all(today) as { id: number; email: string; username: string; login_streak: number }[];

  let sent = 0;
  let failed = 0;
  const results: { userId: number; email: string; streak: number; ok: boolean }[] = [];

  for (const user of candidates) {
    try {
      const token = reminderToken(user.id);
      await sendReminderEmail({
        to: user.email,
        name: user.username || "Trader",
        token,
      });
      sent++;
      results.push({ userId: user.id, email: user.email, streak: user.login_streak, ok: true });
    } catch {
      failed++;
      results.push({ userId: user.id, email: user.email, streak: user.login_streak, ok: false });
    }
  }

  return Response.json({
    ok: true,
    date: today,
    candidates: candidates.length,
    sent,
    failed,
    results,
  });
}
