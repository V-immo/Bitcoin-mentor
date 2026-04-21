/**
 * GET /api/me/unsubscribe-reminders?token=<hmac>
 * Zet reminder_opt_out = 1 voor de gebruiker die via de e-maillink uitschrijft.
 */

import { NextRequest } from "next/server";
import { getDb } from "@/db/db";
import { createHmac } from "crypto";

function reminderToken(userId: number): string {
  const secret = process.env.CRON_SECRET ?? "bitcoin-mentor-reminder";
  return createHmac("sha256", secret).update(String(userId)).digest("hex").slice(0, 32);
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!token) {
    return new Response("Ongeldige link.", { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const db = getDb();
  const users = db.prepare("SELECT id FROM users").all() as { id: number }[];
  const match = users.find(u => reminderToken(u.id) === token);

  if (!match) {
    return new Response("Link ongeldig of verlopen.", { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  db.prepare("UPDATE users SET reminder_opt_out = 1 WHERE id = ?").run(match.id);

  const html = `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><title>Uitgeschreven</title>
<style>body{font-family:system-ui,sans-serif;background:#0e0810;color:#e5d4e7;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#1a0f18;border:1px solid #3d2a3b;border-radius:12px;padding:32px;max-width:420px;text-align:center}
h1{color:#e91e63;margin:0 0 12px}p{color:#bf7a99;margin:0 0 20px}
a{color:#e91e63;text-decoration:none;font-weight:600}</style>
</head>
<body>
<div class="card">
  <h1>Uitgeschreven</h1>
  <p>Je ontvangt geen dagelijkse herinneringen meer van Bitcoin Mentor.</p>
  <a href="https://bitcoinmentor.be">Terug naar Bitcoin Mentor</a>
</div>
</body>
</html>`;

  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
