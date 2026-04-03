import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db/db";
import { verify } from "otplib";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const userId = parseInt((session.user as { id?: string }).id ?? "0");
  const { token, password } = await request.json().catch(() => ({})) as { token?: string; password?: string };

  const db = getDb();
  const user = db
    .prepare("SELECT totp_secret, totp_enabled, password_hash FROM users WHERE id = ?")
    .get(userId) as { totp_secret?: string; totp_enabled: number; password_hash: string } | undefined;

  if (!user?.totp_enabled) {
    return Response.json({ error: "2FA is niet ingeschakeld" }, { status: 400 });
  }

  // Verifieer via TOTP token OF wachtwoord
  let ok = false;
  if (token && user.totp_secret) {
    ok = !!(await verify({ token, secret: user.totp_secret }).catch(() => false));
  }
  if (!ok && password) {
    ok = await bcrypt.compare(password, user.password_hash);
  }
  if (!ok) {
    return Response.json({ error: "Ongeldige code of wachtwoord" }, { status: 403 });
  }

  db.prepare("UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?").run(userId);
  return Response.json({ ok: true });
}
