import { NextRequest } from "next/server";
import { getDb } from "@/db/db";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return new Response("Ongeldige link.", { status: 400, headers: { "Content-Type": "text/plain" } });
  }

  let userId: number;
  try {
    userId = parseInt(Buffer.from(token, "base64url").toString());
    if (!isFinite(userId) || userId <= 0) throw new Error("invalid");
  } catch {
    return new Response("Ongeldige token.", { status: 400, headers: { "Content-Type": "text/plain" } });
  }

  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!user) {
    return new Response("Gebruiker niet gevonden.", { status: 404, headers: { "Content-Type": "text/plain" } });
  }

  db.prepare("UPDATE users SET reminder_opt_out = 1 WHERE id = ?").run(userId);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Uitgeschreven</title></head>
<body style="font-family: -apple-system, sans-serif; background: #0e0810; color: #e5d4e7; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
  <div style="text-align: center; padding: 40px;">
    <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
    <h1 style="color: #e91e63; margin: 0 0 8px 0;">Uitgeschreven</h1>
    <p style="color: #bf7a99;">Je ontvangt geen dagelijkse reminders meer van Bitcoin Mentor.</p>
    <a href="https://bitcoinmentor.be" style="color: #e91e63;">← Terug naar Bitcoin Mentor</a>
  </div>
</body>
</html>`;

  return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
}
