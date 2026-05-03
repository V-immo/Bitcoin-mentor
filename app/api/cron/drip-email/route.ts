/**
 * GET /api/cron/drip-email
 * Stuurt re-engagement mails naar inactieve gebruikers:
 *   - Stap 1 (dag 3): gebruiker is 3-4 dagen inactief na registratie
 *   - Stap 2 (dag 7): gebruiker is 7-8 dagen inactief
 *
 * Server cron: 0 10 * * * curl -s "https://bitcoinmentor.be/api/cron/drip-email?secret=$CRON_SECRET"
 */

import { NextRequest } from "next/server";
import { getDb } from "@/db/db";
import { sendDripEmail } from "@/lib/mailer";
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

  // Voeg kolom toe als die nog niet bestaat
  try {
    const cols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
    if (!cols.find(c => c.name === "drip_step")) {
      db.prepare("ALTER TABLE users ADD COLUMN drip_step INTEGER DEFAULT 0").run();
    }
  } catch { /* kolom bestaat al */ }

  // Stap 1: geregistreerd 3-4 dagen geleden, nog geen stap 1 verstuurd, login_streak < 3
  const step1 = db.prepare(`
    SELECT id, email, username, created_at
    FROM users
    WHERE email != ''
      AND (reminder_opt_out IS NULL OR reminder_opt_out = 0)
      AND (drip_step IS NULL OR drip_step < 1)
      AND created_at <= datetime('now', '-3 days')
      AND created_at >  datetime('now', '-5 days')
      AND login_streak < 3
  `).all() as { id: number; email: string; username: string; created_at: string }[];

  // Stap 2: geregistreerd 7-8 dagen geleden, stap 1 al verstuurd (of >= 1), nog geen stap 2
  const step2 = db.prepare(`
    SELECT id, email, username, created_at
    FROM users
    WHERE email != ''
      AND (reminder_opt_out IS NULL OR reminder_opt_out = 0)
      AND (drip_step IS NULL OR drip_step < 2)
      AND created_at <= datetime('now', '-7 days')
      AND created_at >  datetime('now', '-9 days')
      AND login_streak < 5
  `).all() as { id: number; email: string; username: string; created_at: string }[];

  let sent = 0;
  const results: { userId: number; step: number; ok: boolean }[] = [];

  for (const user of step1) {
    try {
      await sendDripEmail({
        to: user.email,
        name: user.username || "Trader",
        step: 1,
        token: reminderToken(user.id),
      });
      db.prepare("UPDATE users SET drip_step = 1 WHERE id = ?").run(user.id);
      sent++;
      results.push({ userId: user.id, step: 1, ok: true });
    } catch {
      results.push({ userId: user.id, step: 1, ok: false });
    }
  }

  for (const user of step2) {
    try {
      await sendDripEmail({
        to: user.email,
        name: user.username || "Trader",
        step: 2,
        token: reminderToken(user.id),
      });
      db.prepare("UPDATE users SET drip_step = 2 WHERE id = ?").run(user.id);
      sent++;
      results.push({ userId: user.id, step: 2, ok: true });
    } catch {
      results.push({ userId: user.id, step: 2, ok: false });
    }
  }

  return Response.json({
    ok: true,
    step1_candidates: step1.length,
    step2_candidates: step2.length,
    sent,
    results,
  });
}
