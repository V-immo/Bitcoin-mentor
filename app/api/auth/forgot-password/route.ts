import { NextRequest } from "next/server";
import { getDb } from "@/db/db";
import * as crypto from "crypto";
import nodemailer from "nodemailer";

function ensureResetTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token      TEXT    NOT NULL UNIQUE,
      expires_at TEXT    NOT NULL,
      used       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_reset_token ON password_reset_tokens(token);
  `);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { email } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Ongeldig e-mailadres" }, { status: 400 });
  }

  ensureResetTable();
  const db = getDb();

  const user = db.prepare("SELECT id, username FROM users WHERE email = ? COLLATE NOCASE")
    .get(email.trim()) as { id: number; username: string } | undefined;

  // Altijd succes teruggeven — ook als e-mail niet gevonden (security best practice)
  if (!user) {
    return Response.json({ ok: true });
  }

  // Verwijder oude tokens voor deze gebruiker
  db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at < datetime('now')")
    .run(user.id);

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 3600_000).toISOString(); // 1 uur

  db.prepare("INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)")
    .run(user.id, token, expiresAt);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/auth/reset-password/${token}`;

  // E-mail versturen
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT ?? "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM ?? smtpUser ?? "noreply@bitcoinmentor.be";

  if (!smtpHost || !smtpUser || !smtpPass) {
    // Dev-modus: log de reset link (geen e-mail server geconfigureerd)
    console.log(`[PASSWORD RESET] Link voor ${email}: ${resetUrl}`);
    return Response.json({ ok: true, devResetUrl: process.env.NODE_ENV !== "production" ? resetUrl : undefined });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"Bitcoin Mentor" <${smtpFrom}>`,
      to: email,
      subject: "Wachtwoord opnieuw instellen — Bitcoin Mentor",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#e91e63">Bitcoin Mentor</h2>
          <p>Hallo <strong>${user.username}</strong>,</p>
          <p>Je hebt gevraagd om je wachtwoord opnieuw in te stellen. Klik op de knop hieronder:</p>
          <a href="${resetUrl}" style="display:inline-block;background:#e91e63;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
            Wachtwoord opnieuw instellen
          </a>
          <p style="color:#666;font-size:13px">Deze link is 1 uur geldig. Als jij dit niet aangevraagd hebt, kun je deze e-mail negeren.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="color:#999;font-size:12px">Bitcoin Mentor · bitcoinmentor.be</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[PASSWORD RESET] E-mail versturen mislukt:", err);
    return Response.json({ error: "E-mail versturen mislukt" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
